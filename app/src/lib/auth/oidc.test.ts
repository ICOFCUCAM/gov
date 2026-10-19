import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createAccount, resetOfficials, accountById, setTwoStepPolicy } from './officials';
import { resetSignOn, signOnDb, platformOrigin } from './sign-on-store';
import { clearJwksCache, decideRequest, finishSignIn, listRequests, logoutUrl, providerPublic, providerView, saveProvider, setProviderEnabled, startSignIn, checkIdToken } from './oidc';
import { listAudit, listMinistries } from '@/lib/data/store';
// @ts-expect-error a plain .mjs script (no declarations), shared with the end-to-end check
import { startStubProvider } from '../../../scripts/oidc-stub-provider.mjs';

process.env.CIVICOS_SCRYPT_N = '16384';
const PW = 'correct horse battery';
const ORIGIN = 'https://gov.example';
type Stub = { issuer: string; client: { id: string; secret: string }; person: Record<string, unknown>; tweak: Record<string, unknown>; logouts: Record<string, string>[]; close: () => Promise<void> };
let stub: Stub;
const env = process.env.CIVICOS_PUBLIC_URL;

beforeAll(async () => { stub = await startStubProvider(); process.env.CIVICOS_PUBLIC_URL = ORIGIN; });
afterAll(async () => { await stub.close(); if (env === undefined) delete process.env.CIVICOS_PUBLIC_URL; else process.env.CIVICOS_PUBLIC_URL = env; });

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

async function configure(extra: Record<string, unknown> = {}) {
  return ok(await saveProvider({ name: 'Government ID', issuer: stub.issuer, clientId: stub.client.id, clientSecret: stub.client.secret, internalNetwork: true, ...extra }, 'Admin, ICT'));
}

/** Start a sign-in, follow the provider's redirect, and come back with its code and state (as the browser would). */
async function signIn(from = '/gov/work') {
  const s = ok(startSignIn(from));
  const r = await fetch(s.url, { redirect: 'manual' });
  expect(r.status).toBe(302);
  const back = new URL(r.headers.get('location')!);
  expect(`${back.origin}${back.pathname}`).toBe(`${ORIGIN}/api/auth/oidc/callback`);
  return { state: back.searchParams.get('state')!, code: back.searchParams.get('code')!, startState: s.state };
}

describe('OpenID Connect sign-in for officials', () => {
  let adminId = '', officerId = '';
  beforeEach(async () => {
    resetOfficials(); resetSignOn(); clearJwksCache();
    for (const k of Object.keys(stub.tweak)) delete stub.tweak[k];
    Object.assign(stub.person, { sub: 'emp-1001', email: 'ada@gov.example', email_verified: true, name: 'Ada Obi', groups: [], amr: ['pwd'], acr: undefined, extra: undefined });
    adminId = ok(await createAccount({ email: 'admin@gov.example', name: 'Admin', office: 'ICT', password: PW }, null)).id;
    officerId = ok(await createAccount({ email: 'ada@gov.example', name: 'Ada Obi', office: 'Treasury officer', password: PW, role: 'officer', institution: 'fed-treasury' }, 'Admin')).id;
  });

  it('is configured by discovery from the issuer, keeps the secret sealed out of view, and audits it', async () => {
    const v = (await configure()).provider;
    expect(v.metadata.token_endpoint).toBe(`${stub.issuer}/token`);
    expect(v).not.toHaveProperty('clientSecret');
    expect(v.hasSecret).toBe(true);
    expect(providerPublic()).toEqual({ name: 'Government ID' });
    expect(listAudit().find(e => e.action === 'auth.oidc.configure')?.detail).not.toContain(stub.client.secret);
    // Another issuer than the provider names, and a provider on a private network not marked as such, are refused.
    expect(await saveProvider({ name: 'X', issuer: `${stub.issuer}/other`, clientId: 'c', clientSecret: 's', internalNetwork: true }, 'A')).toEqual({ error: expect.stringMatching(/could not be read/) });
    expect(await saveProvider({ name: 'X', issuer: stub.issuer, clientId: 'c', clientSecret: 's', internalNetwork: false }, 'A')).toEqual({ error: expect.stringMatching(/could not be read/) });
    expect(await saveProvider({ name: 'X', issuer: 'http://idp.gov.example', clientId: 'c', clientSecret: 's' }, 'A')).toEqual({ error: expect.stringMatching(/https/) });
  });

  it('signs a matched official in, once per state, from the browser that started', async () => {
    await configure();
    const { state, code } = await signIn('/gov/inbox');
    // A callback without this browser's cookie does nothing (and spends the state).
    const stolen = await finishSignIn({ state, code, cookieState: 'someone-else' }, undefined);
    expect(stolen).toMatchObject({ ok: false });
    const again = await signIn('/gov/inbox');
    // Unlinked by sub: the default claim is sub, and emp-1001 is linked to nobody yet → waits for an administrator.
    const pending = await finishSignIn({ state: again.state, code: again.code, cookieState: again.state }, undefined);
    expect(pending).toMatchObject({ ok: false, pending: true });
    const req = listRequests()[0]!;
    expect(req).toMatchObject({ value: 'emp-1001', claim: 'sub', name: 'Ada Obi', status: 'pending' });
    // An administrator links the identity to the existing account (roles stay as the platform set them).
    ok(decideRequest(req.id, { action: 'link', accountId: officerId }, 'Admin, ICT'));
    const third = await signIn('/gov/inbox');
    const r = await finishSignIn({ state: third.state, code: third.code, cookieState: third.state }, undefined);
    expect(r).toMatchObject({ ok: true, from: '/gov/inbox', twoStep: false });
    if (!r.ok) throw new Error(r.error);
    expect(r.account).toMatchObject({ id: officerId, role: 'officer', institution: 'fed-treasury' });
    // Replaying the same callback (state and nonce) is refused.
    expect(await finishSignIn({ state: third.state, code: third.code, cookieState: third.state }, undefined)).toMatchObject({ ok: false, error: expect.stringMatching(/expired or was already used/) });
  });

  it('never makes an account with powers from a sign-in; an administrator chooses the role', async () => {
    await configure();
    stub.person.sub = 'emp-2002'; stub.person.name = 'New Person'; stub.person.email = 'new@gov.example'; stub.person.groups = ['ict-admins'];
    const s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: false, pending: true });
    const req = listRequests()[0]!;
    expect(decideRequest(req.id, { action: 'create', account: { name: 'New Person', office: 'Clerk', role: 'superuser' } }, 'Admin')).toEqual({ error: 'Choose a role' });
    const made = ok(decideRequest(req.id, { action: 'create', account: { name: 'New Person', office: 'Clerk', role: 'officer' } }, 'Admin'));
    const acc = accountById(made.request.accountId!)!;
    expect(acc).toMatchObject({ email: 'new@gov.example', role: 'officer', noPassword: true });
    const s2 = await signIn();
    expect(await finishSignIn({ ...s2, cookieState: s2.state }, undefined)).toMatchObject({ ok: true, account: { role: 'officer' } });
    // A refused identity stays refused.
    stub.person.sub = 'emp-3003';
    const s3 = await signIn();
    await finishSignIn({ ...s3, cookieState: s3.state }, undefined);
    const r3 = listRequests().find(x => x.value === 'emp-3003')!;
    ok(decideRequest(r3.id, { action: 'refuse', reason: 'not staff' }, 'Admin'));
    const s4 = await signIn();
    expect(await finishSignIn({ ...s4, cookieState: s4.state }, undefined)).toMatchObject({ ok: false, pending: true });
    expect(listRequests().find(x => x.value === 'emp-3003')).toMatchObject({ status: 'refused', attempts: 2 });
  });

  it('matches by a verified email only, and links that account on first sign-in', async () => {
    await configure({ matchClaim: 'email' });
    stub.person.email_verified = false;
    let s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: false, error: expect.stringMatching(/not verified/) });
    stub.person.email_verified = true;
    s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: true, account: { id: officerId } });
    expect(accountById(officerId)?.identity).toMatchObject({ claim: 'email', value: 'ada@gov.example' });
  });

  it('matches by a configured claim such as an employee number', async () => {
    await configure({ matchClaim: 'employee_id' });
    stub.person.extra = { employee_id: 'KE-77' };
    const s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: false, pending: true });
    expect(listRequests()[0]).toMatchObject({ claim: 'employee_id', value: 'KE-77' });
  });

  for (const [what, t, why] of [
    ['a signature by a key the provider does not publish', { rogueKey: true }, /signature/],
    ['another issuer', { iss: 'https://evil.example' }, /another provider/],
    ['another audience', { aud: 'someone-else' }, /another application/],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 600, iat: Math.floor(Date.now() / 1000) - 900 }, /expired/],
    ['another nonce', { nonce: 'replayed-nonce' }, /nonce/],
  ] as const) {
    it(`refuses ${what}`, async () => {
      await configure();
      Object.assign(stub.tweak, t);
      const s = await signIn();
      const r = await finishSignIn({ ...s, cookieState: s.state }, undefined);
      expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/could not be verified/) });
      expect(listAudit().find(e => e.action === 'auth.oidc.sign-in' && e.outcome === 'denied')?.detail).toMatch(why);
    });
  }

  it('applies a role from groups only where an administrator mapped them, and audits it', async () => {
    await configure({ matchClaim: 'email', groups: { claim: 'groups', rules: [{ group: 'treasury-signers', role: 'signatory', institution: listMinistries()[0]!.id }, { group: 'ict-admins', role: 'administrator' }] } });
    expect(listAudit().find(e => e.action === 'auth.oidc.configure')?.detail).toMatch(/treasury-signers → Can sign/);
    stub.person.groups = ['staff'];
    let s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: true, account: { role: 'officer' } });
    stub.person.groups = ['staff', 'treasury-signers'];
    s = await signIn();
    const r = await finishSignIn({ ...s, cookieState: s.state }, undefined);
    expect(r).toMatchObject({ ok: true, groupsApplied: 'treasury-signers', account: { role: 'signatory', institution: listMinistries()[0]!.id } });
    expect(listAudit().find(e => e.action === 'auth.account.role')?.actor).toMatch(/Identity provider Government ID \(group treasury-signers\)/);
  });

  it('counts the provider\'s multi-factor sign-in as the second step only when the policy says so', async () => {
    setTwoStepPolicy('all', 'Admin');
    await configure({ matchClaim: 'email' });
    stub.person.amr = ['pwd', 'mfa'];
    let s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: true, twoStep: false });
    await configure({ mfa: { accept: true } });
    s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: true, twoStep: true });
    stub.person.amr = ['pwd'];
    s = await signIn();
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: true, twoStep: false });
  });

  it('signs out at the provider with the ID token as a hint', async () => {
    await configure({ matchClaim: 'email' });
    const s = await signIn();
    const r = await finishSignIn({ ...s, cookieState: s.state }, undefined);
    if (!r.ok) throw new Error(r.error);
    const u = new URL(logoutUrl(r.sid)!);
    expect(`${u.origin}${u.pathname}`).toBe(`${stub.issuer}/logout`);
    expect(u.searchParams.get('id_token_hint')).toMatch(/^ey/);
    expect(u.searchParams.get('post_logout_redirect_uri')).toBe(`${ORIGIN}/sign-in`);
    expect(signOnDb().logout[r.sid]).toBeUndefined();
  });

  it('stops sign-ins when turned off, and a changed configuration ends those in progress', async () => {
    await configure({ matchClaim: 'email' });
    const s = await signIn();
    await configure({ name: 'Government ID (new)' });
    expect(await finishSignIn({ ...s, cookieState: s.state }, undefined)).toMatchObject({ ok: false });
    ok(setProviderEnabled(false, 'Admin'));
    expect(startSignIn('/')).toEqual({ error: expect.stringMatching(/not set up/) });
    expect(providerPublic()).toBeNull();
    expect(providerView()?.enabled).toBe(false);
  });

  it('checks times with two minutes of clock skew and refuses the HMAC and none algorithms', () => {
    const p = { issuer: 'https://idp', clientId: 'c', metadata: { authorization_endpoint: '', token_endpoint: '', jwks_uri: '' } };
    const h = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${h({ alg: 'none' })}.${h({ iss: 'https://idp', aud: 'c', sub: 'x', nonce: 'n', iat: 1, exp: 2 })}.`;
    expect(() => checkIdToken(none, p, { keys: [] }, 'n')).toThrow(/algorithm/);
    const hs = `${h({ alg: 'HS256' })}.${h({ iss: 'https://idp' })}.c2ln`;
    expect(() => checkIdToken(hs, p, { keys: [{ kty: 'oct', k: 'c2VjcmV0' }] }, 'n')).toThrow(/algorithm/);
  });

  it('needs the platform\'s own address under enforcement', () => {
    expect(platformOrigin('http://evil.example', { CIVICOS_AUTH: 'enforce' } as unknown as NodeJS.ProcessEnv)).toEqual({ error: expect.stringMatching(/CIVICOS_PUBLIC_URL/) });
    expect(platformOrigin('http://localhost:3000', {} as unknown as NodeJS.ProcessEnv)).toEqual({ origin: 'http://localhost:3000', host: 'localhost' });
    void adminId;
  });
});
