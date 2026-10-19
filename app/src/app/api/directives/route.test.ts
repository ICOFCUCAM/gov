import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetOfficials, createAccount, sessionSecret } from '@/lib/auth/officials';
import { signClaims } from '@/lib/auth/session-token';
import { resetDirectives } from '@/lib/data/directives';
// The first account needs the one-time setup code (lib/auth/setup-token.ts, review C-1).
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

// The full N=2^17 cost is covered by password-hash.test.ts; these tests check behaviour, not cost.
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const list = await import('./route');
const one = await import('./[ref]/route');

const PW = 'correct horse battery';
const req = (body: unknown) => new NextRequest('http://localhost/api/directives', { method: 'POST', body: JSON.stringify(body) });
async function signInAs(id: string) {
  const now = Math.floor(Date.now() / 1000);
  cookie = await signClaims({ sub: `local:${id}`, name: 'x', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
}
const make = async (email: string, role: string, institution?: string) => {
  const a = await createAccount({ email, name: email.split('@')[0], office: 'Office', password: PW, role, institution }, 'Admin');
  if ('error' in a) throw new Error(a.error);
  return a.id;
};

describe('directives under official roles', () => {
  beforeEach(async () => {
    resetOfficials(); resetDirectives(); cookie = undefined;
    await createAccount({ email: 'admin@gov.test', name: 'Admin', office: 'Head of Service', password: PW , setupToken: SETUP_TOKEN }, null);
  });

  it('drafts for the official\'s own institution and lets only its signatories sign', async () => {
    const officer = await make('officer@gov.test', 'officer', 'fed-treasury');
    const signer = await make('signer@gov.test', 'signatory', 'fed-treasury');
    const other = await make('other@gov.test', 'signatory', 'fed-health');

    await signInAs(officer);
    const r = await list.POST(req({ ref: 'DIR-T1', title: 'Release of reserves', issuedByCharterId: 'fed-health', by: 'Typed' }));
    expect(r.status).toBe(201);
    expect((await r.json()).directive).toMatchObject({ issued_by_charter_id: 'fed-treasury', issued_by_name: 'officer, Office' });
    const ctx = { params: Promise.resolve({ ref: 'DIR-T1' }) };
    expect((await one.POST(req({ action: 'sign' }), ctx)).status).toBe(403);

    await signInAs(other);
    expect((await one.GET(req({}), ctx)).status).toBe(404);
    expect((await (await list.GET(new NextRequest('http://localhost/api/directives'))).json()).directives).toEqual([]);
    expect((await one.POST(req({ action: 'sign' }), ctx)).status).toBe(403);

    await signInAs(signer);
    const s = await one.POST(req({ action: 'sign' }), ctx);
    expect(s.status).toBe(200);
    expect((await s.json()).directive).toMatchObject({ status: 'effective', signed_by_id: 'signer, Office' });

    await signInAs(other);
    expect((await one.GET(req({}), ctx)).status).toBe(200);
  });

  it('refuses auditors, and drops a disabled account\'s session at once', async () => {
    const auditor = await make('audit@gov.test', 'auditor');
    await signInAs(auditor);
    expect((await list.POST(req({ ref: 'DIR-A', title: 't', by: 'x' }))).status).toBe(403);
    const { setDisabled } = await import('@/lib/auth/officials');
    setDisabled(auditor, true, 'Admin');
    const { currentOfficial } = await import('@/lib/auth/official');
    expect(await currentOfficial()).toBeNull();
  });
});
