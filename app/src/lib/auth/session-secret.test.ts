import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { resetOfficials, createAccount, sessionSecret, sessionSecretProblem, SessionSecretMissing } from './officials';
import { signClaims } from './session-token';

process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const { currentOfficial, issueSession } = await import('./official');
const { POST, GET } = await import('@/app/api/auth/official/route');

const PW = 'correct horse battery';
const LONG = 'x'.repeat(48);

describe('the session key under CIVICOS_AUTH=enforce', () => {
  beforeEach(() => { resetOfficials(); cookie = undefined; delete process.env.CIVICOS_AUTH; delete process.env.CIVICOS_SESSION_SECRET; });
  afterEach(() => { delete process.env.CIVICOS_AUTH; delete process.env.CIVICOS_SESSION_SECRET; vi.restoreAllMocks(); });

  it('generates a key in the state only outside enforce mode', () => {
    expect(sessionSecretProblem()).toBeNull();
    expect(sessionSecret()).toMatch(/.{40,}/);
    process.env.CIVICOS_AUTH = 'enforce';
    expect(sessionSecretProblem()).toMatch(/CIVICOS_SESSION_SECRET is not set/);
    expect(() => sessionSecret()).toThrow(SessionSecretMissing);
    process.env.CIVICOS_SESSION_SECRET = 'short';
    expect(sessionSecretProblem()).toMatch(/shorter than 32/);
    process.env.CIVICOS_SESSION_SECRET = LONG;
    expect(sessionSecret()).toBe(LONG);
  });

  it('refuses to sign anyone in, and says why, when enforce mode has no secret', async () => {
    await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null);
    process.env.CIVICOS_AUTH = 'enforce';
    const res = await POST(new NextRequest('http://localhost/api/auth/official', { method: 'POST', body: JSON.stringify({ email: 'a@g.gov', password: PW }) }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/CIVICOS_SESSION_SECRET/);
    expect((await (await GET()).json()).sessionKeyProblem).toMatch(/CIVICOS_SESSION_SECRET/);
    const issued = await issueSession(NextResponse.json({}), { sub: 'local:x', name: 'A', method: 'local', iat: 0, exp: 9e9 }, false);
    expect(issued.status).toBe(503);
  });

  it('accepts no session, even one signed with the earlier generated key', async () => {
    const a = await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null);
    if ('error' in a) throw new Error(a.error);
    const now = Math.floor(Date.now() / 1000);
    cookie = await signClaims({ sub: `local:${a.id}`, name: 'A', method: 'local', iat: now, exp: now + 600 }, sessionSecret());
    expect(await currentOfficial()).not.toBeNull();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.CIVICOS_AUTH = 'enforce';
    expect(await currentOfficial()).toBeNull();
    process.env.CIVICOS_SESSION_SECRET = LONG;
    expect(await currentOfficial()).toBeNull();
    cookie = await signClaims({ sub: `local:${a.id}`, name: 'A', method: 'local', iat: now, exp: now + 600 }, LONG);
    expect(await currentOfficial()).toMatchObject({ name: 'A' });
  });
});
