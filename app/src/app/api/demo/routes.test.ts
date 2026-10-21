// /api/demo/cast and /api/demo/act-as: 404 in production, cast creation for
// administrators only, switching for an administrator or cast member only,
// through the ordinary session code and audited naming both officials.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));

import { resetOfficials, createAccount, sessionSecret, listDemoAccounts } from '@/lib/auth/officials';
import { signClaims, verifyToken, OFFICIAL_COOKIE } from '@/lib/auth/session-token';
import { sessionKey } from '@/lib/auth/official';
import { sessionRevoked } from '@/lib/auth/officials';
import { setSovereign, listMinistries, listAudit } from '@/lib/data/store';
import { mutationRule, apiPermission } from '@/lib/auth/roles';
const cast = await import('./cast/route');
const actAs = await import('./act-as/route');

process.env.CIVICOS_SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SCRYPT_N = '16384';

const PW = 'correct horse battery';
let ADMIN = '', OFFICER = '', CIVIL = '';
async function signInAs(id: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${id}`, name: 'x', method: 'local', role: role as 'officer', iat: now, exp: now + 600 }, sessionSecret());
}
const post = (path: string, body?: unknown) => new NextRequest(`http://localhost${path}`, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const castMember = (name: string) => listDemoAccounts().find(a => a.name === name)!;

beforeEach(async () => {
  resetOfficials(); cookie = undefined;
  CIVIL = listMinistries()[0]!.id;
  setSovereign({ deployment: { authorities: { civilRegistration: CIVIL } } }, 'test');
  const a = await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW, setupToken: process.env.CIVICOS_SETUP_TOKEN }, null);
  const o = await createAccount({ email: 'officer@gov.test', name: 'Officer', office: 'Clerk', password: PW, role: 'officer', institution: CIVIL }, 'Admin');
  if ('error' in a || 'error' in o) throw new Error('setup');
  ADMIN = a.id; OFFICER = o.id;
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('demo routes', () => {
  it('are covered by the existing permission rules: the cast for administrators, switching for every role', () => {
    expect(mutationRule('/api/demo/cast')).toBe('admin');
    expect(mutationRule('/api/demo/act-as')).toBe('any-role');
    expect(apiPermission({ role: 'officer', institution: CIVIL }, 'POST', '/api/demo/cast')).toMatch(/administrator/);
    expect(apiPermission({ role: 'auditor' }, 'POST', '/api/demo/act-as')).toBeNull();
  });

  it('answer 404 in a production installation', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    await signInAs(ADMIN, 'administrator');
    expect((await cast.GET()).status).toBe(404);
    expect((await cast.POST(post('/api/demo/cast'))).status).toBe(404);
    expect((await actAs.POST(post('/api/demo/act-as', { accountId: 'x' }))).status).toBe(404);
    expect(listDemoAccounts()).toHaveLength(0);
  });

  it('let only an administrator create the cast; GET lists it grouped by institution without addresses', async () => {
    expect((await cast.POST(post('/api/demo/cast'))).status).toBe(401);
    await signInAs(OFFICER, 'officer');
    expect((await cast.POST(post('/api/demo/cast'))).status).toBe(403);
    await signInAs(ADMIN, 'administrator');
    const r = await cast.POST(post('/api/demo/cast'));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ created: 6 });
    const g = await (await cast.GET()).json();
    expect(g.canSwitch).toBe(true);
    expect(g.groups.map((x: { institution: string }) => x.institution)).toEqual([CIVIL, '']);
    expect(JSON.stringify(g)).not.toContain('@');
  });

  it('switches by issuing a session for the cast account, ends the old one and audits both names', async () => {
    await signInAs(ADMIN, 'administrator');
    await cast.POST(post('/api/demo/cast'));
    const adminToken = cookie!;
    const b = castMember('Demo registrar B (sample)');
    const r = await actAs.POST(post('/api/demo/act-as', { accountId: b.id }));
    expect(r.status).toBe(200);
    const set = r.cookies.get(OFFICIAL_COOKIE)?.value;
    const claims = await verifyToken(set, sessionSecret());
    expect(claims).toMatchObject({ sub: `local:${b.id}`, name: 'Demo registrar B (sample)', role: 'signatory', institution: CIVIL, method: 'local' });
    expect(sessionRevoked(sessionKey(adminToken))).toBe(true);
    const e = listAudit().filter(x => x.action === 'demo.act-as' && x.outcome === 'ok').at(-1)!;
    expect(e.actor).toMatch(/^Admin/);
    expect(e.resource).toBe(`Official:local:${b.id}`);
    expect(e.detail).toContain(`local:${ADMIN}`);
    expect(e.detail).toContain('Demo registrar B (sample)');

    // Now as the cast member: switching on to their colleague is allowed, a second official for four-eyes.
    cookie = set;
    const a = castMember('Demo registrar A (sample)');
    const r2 = await actAs.POST(post('/api/demo/act-as', { accountId: a.id }));
    expect(r2.status).toBe(200);
    expect((await verifyToken(r2.cookies.get(OFFICIAL_COOKIE)?.value, sessionSecret()))?.sub).toBe(`local:${a.id}`);
  });

  it('refuses an official who is neither an administrator nor in the cast, and anyone not signed in', async () => {
    await signInAs(ADMIN, 'administrator');
    await cast.POST(post('/api/demo/cast'));
    const b = castMember('Demo registrar B (sample)');
    cookie = undefined;
    expect((await actAs.POST(post('/api/demo/act-as', { accountId: b.id }))).status).toBe(401);
    await signInAs(OFFICER, 'officer');
    const r = await actAs.POST(post('/api/demo/act-as', { accountId: b.id }));
    expect(r.status).toBe(403);
    expect(r.cookies.get(OFFICIAL_COOKIE)).toBeUndefined();
    expect(listAudit().some(x => x.action === 'demo.act-as' && x.outcome === 'denied')).toBe(true);
    // Only cast accounts can be switched to: never an ordinary account.
    await signInAs(ADMIN, 'administrator');
    expect((await actAs.POST(post('/api/demo/act-as', { accountId: OFFICER }))).status).toBe(404);
  });
});
