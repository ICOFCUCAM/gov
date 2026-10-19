import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { OfficerRow } from './substrate-officials';

// Officials who sign in through the substrate (review H-3) and ending a session on sign-out (review M-1).

process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }), headers: () => new Headers() }));

// A stand-in substrate: one auth user per access token, and the officer register.
const register = new Map<string, OfficerRow & { auth_user_id: string }>();
let registerDown = false;
const fakeSubstrate = {
  auth: { getUser: async (token: string) => { const user = /^user-([a-z0-9-]+)\./.exec(token)?.[1]; return user ? { data: { user: { id: user } }, error: null } : { data: { user: null }, error: { message: 'bad' } }; } },
  from: () => {
    const filters: Record<string, string> = {};
    const q = {
      select: () => q,
      eq: (k: string, v: string) => { filters[k] = v; return q; },
      limit: () => q,
      maybeSingle: async () => {
        if (registerDown) return { data: null, error: { message: 'down' } };
        const row = [...register.values()].find(r => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
        return { data: row ? { ...row } : null, error: null };
      },
    };
    return q;
  },
};
vi.mock('@/lib/db/client', () => ({ serverClient: () => fakeSubstrate, tokenScopedClient: () => null }));

const { POST, DELETE } = await import('@/app/api/auth/official/route');
const { currentOfficial } = await import('./official');
const { resetOfficials, setSubstrateAssignment, setTwoStepPolicy, sessionSecret, createAccount } = await import('./officials');
const { resetSubstrateOfficerCache } = await import('./substrate-officials');
const { listMinistries } = await import('@/lib/data/store');
const { apiPermission, secondStepMissing } = await import('./roles');

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** A substrate access token for one auth user (verified by the stand-in), with the assurance level its sign-in reached. */
const accessToken = (user: string, aal: 'aal1' | 'aal2' = 'aal1') => `user-${user}.${b64({ sub: user, aal })}.sig`;
function officer(id: string, role: string, charter: string | null, active = true) {
  register.set(id, { id, auth_user_id: id, name: `Officer ${id}`, title: role, role, active, charter_id: charter, institution_id: null });
}
async function signIn(user: string, aal: 'aal1' | 'aal2' = 'aal1') {
  const r = await POST(new NextRequest('http://localhost/api/auth/official', { method: 'POST', body: JSON.stringify({ method: 'substrate', accessToken: accessToken(user, aal) }) }));
  const set = r.headers.getSetCookie().find(c => c.startsWith('civicos_official='));
  cookie = set ? /civicos_official=([^;]+)/.exec(set)![1] : undefined;
  return { status: r.status, body: await r.json() };
}

describe('officials signing in through the substrate (review H-3)', () => {
  let a = '', b = '';
  beforeEach(() => {
    resetOfficials(); resetSubstrateOfficerCache(); register.clear(); registerDown = false; cookie = undefined;
    sessionSecret();
    const ms = listMinistries();
    a = ms[0]!.id; b = ms[1]!.id;
  });

  it('acts for the institution the register names, never for the whole government by default', async () => {
    officer('clerk', 'officer', a);
    expect((await signIn('clerk')).status).toBe(200);
    const o = (await currentOfficial())!;
    expect(o).toMatchObject({ method: 'substrate', role: 'officer', institution: a });
    expect(apiPermission(o, 'POST', `/api/org/ministries/${a}/queue/q1/act`)).toBeNull();
    expect(apiPermission(o, 'POST', `/api/org/ministries/${b}/queue/q1/act`)).not.toBeNull();
  });

  it('gives least privilege without the platform\'s assignment: no signing rights, auditor when the institution is unknown', async () => {
    officer('minister', 'minister', a);
    await signIn('minister');
    expect(await currentOfficial()).toMatchObject({ role: 'officer', institution: a });
    officer('nowhere', 'officer', 'no-such-charter');
    await signIn('nowhere');
    const o = (await currentOfficial())!;
    expect(o).toMatchObject({ role: 'auditor' });
    expect(o.institution).toBeUndefined();
    expect(apiPermission(o, 'POST', `/api/org/ministries/${a}/queue/q1/act`)).not.toBeNull();
  });

  it('takes role and institution from an administrator\'s assignment, at the next request', async () => {
    officer('ps', 'permanent-secretary', a);
    await signIn('ps');
    expect(await currentOfficial()).toMatchObject({ role: 'officer', institution: a });
    expect(setSubstrateAssignment('ps', { role: 'signatory', institution: b }, 'Admin')).toMatchObject({ role: 'signatory', institution: b });
    expect(await currentOfficial()).toMatchObject({ role: 'signatory', institution: b });
    expect(setSubstrateAssignment('ps', { role: 'signatory', institution: 'nope' }, 'Admin')).toEqual({ error: 'Unknown institution' });
    expect(setSubstrateAssignment('ps', { role: null }, 'Admin')).toEqual({ removed: 'ps' });
    expect(await currentOfficial()).toMatchObject({ role: 'officer', institution: a });
  });

  it('applies the installation\'s second-step policy: only a substrate sign-in that passed a second factor may change things', async () => {
    setTwoStepPolicy('signers', 'Admin');
    officer('root', 'platform-admin', null);
    await signIn('root');
    const once = (await currentOfficial())!;
    expect(once).toMatchObject({ role: 'administrator', twoStepRequired: true, twoStep: false });
    expect(secondStepMissing(once)).toMatch(/second sign-in step/);
    await signIn('root', 'aal2');
    expect(secondStepMissing((await currentOfficial())!)).toBeNull();
  });

  it('ends the session as soon as the register deactivates the officer, and when the register cannot be read', async () => {
    officer('clerk', 'officer', a);
    await signIn('clerk');
    expect(await currentOfficial()).not.toBeNull();
    register.get('clerk')!.active = false;
    resetSubstrateOfficerCache(); // the few seconds' cache has passed
    expect(await currentOfficial()).toBeNull();
    register.get('clerk')!.active = true;
    resetSubstrateOfficerCache();
    expect(await currentOfficial()).not.toBeNull();
    registerDown = true;
    resetSubstrateOfficerCache();
    expect(await currentOfficial()).toBeNull();
  });

  it('refuses sign-in for an officer who is not active in the register', async () => {
    officer('gone', 'officer', a, false);
    expect((await signIn('gone')).status).toBe(401);
  });
});

describe('signing out ends the session on the server (review M-1)', () => {
  beforeEach(() => { resetOfficials(); cookie = undefined; register.clear(); resetSubstrateOfficerCache(); });

  it('refuses a copy of the cookie after sign-out', async () => {
    process.env.CIVICOS_LOCAL_ACCOUNTS = 'allow';
    process.env.CIVICOS_SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
    await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: 'correct horse battery', setupToken: 'test-setup-token-0123456789abcdef' }, null);
    const r = await POST(new NextRequest('http://localhost/api/auth/official', { method: 'POST', body: JSON.stringify({ email: 'a@g.gov', password: 'correct horse battery' }) }));
    const copy = /civicos_official=([^;]+)/.exec(r.headers.getSetCookie().find(c => c.startsWith('civicos_official='))!)![1]!;
    cookie = copy;
    expect(await currentOfficial()).toMatchObject({ name: 'A' });
    await DELETE(new NextRequest('http://localhost/api/auth/official', { method: 'DELETE' }));
    cookie = copy; // the browser forgot it; someone kept a copy
    expect(await currentOfficial()).toBeNull();
    delete process.env.CIVICOS_LOCAL_ACCOUNTS;
    delete process.env.CIVICOS_SETUP_TOKEN;
  });
});
