import { describe, it, expect, beforeEach } from 'vitest';
import { createAccount, resetOfficials, checkPassword, passkeyRegistrationOptions, registerPasskey, removePasskey, passkeySignInOptions, signInWithPasskey, removeTwoStep, setTwoStepPolicy, accountById, listAccounts } from './officials';
import { relyingParty, type RelyingParty } from './passkeys';
import { resetSignOn } from './sign-on-store';
import { SoftAuthenticator } from './soft-authenticator';
import { listAudit } from '@/lib/data/store';
// The first account needs the one-time setup code (lib/auth/setup-token.ts, review C-1).
const SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;

process.env.CIVICOS_SCRYPT_N = '16384';
const PW = 'correct horse battery';
const rp: RelyingParty = { rpId: 'gov.example', origin: 'https://gov.example', name: 'Government' };
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

async function register(id: string, auth: SoftAuthenticator, sessionPassed = false) {
  const o = ok(passkeyRegistrationOptions(id, rp, sessionPassed));
  expect(o.publicKey.rp.id).toBe('gov.example');
  expect(o.publicKey.attestation).toBe('none');
  return registerPasskey(id, { challengeId: o.challengeId, response: auth.register(o.publicKey.challenge), name: 'Laptop' }, rp);
}

describe('passkeys for platform accounts', () => {
  let id = '', other = '';
  beforeEach(async () => {
    resetOfficials(); resetSignOn();
    id = ok(await createAccount({ email: 'ada@gov.example', name: 'Ada Obi', office: 'Officer', password: PW, setupToken: SETUP_TOKEN }, null)).id;
    other = ok(await createAccount({ email: 'ben@gov.example', name: 'Ben', office: 'Officer', password: PW }, 'Ada')).id;
  });

  it('takes the relying party from the platform\'s configured address', () => {
    expect(relyingParty(undefined, { CIVICOS_PUBLIC_URL: 'https://civicos.gov.example/' } as unknown as NodeJS.ProcessEnv)).toMatchObject({ rpId: 'civicos.gov.example', origin: 'https://civicos.gov.example' });
    expect(relyingParty('https://spoofed.example', { CIVICOS_AUTH: 'enforce' } as unknown as NodeJS.ProcessEnv)).toEqual({ error: expect.stringMatching(/CIVICOS_PUBLIC_URL/) });
  });

  it('registers a passkey, keeps only its public key, and audits it', async () => {
    const auth = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    const r = ok(await register(id, auth));
    expect(r.passkey).toMatchObject({ name: 'Laptop' });
    expect(accountById(id)).toMatchObject({ secondStepOn: true, passkeys: [{ name: 'Laptop' }] });
    expect(JSON.stringify(listAccounts())).not.toContain('publicKey');
    expect(listAudit().find(e => e.action === 'auth.passkey.add')).toMatchObject({ outcome: 'ok', resource: `Official:${id}` });
    // The same authenticator cannot be registered twice; with a second step on, adding another needs a session that passed it.
    expect(passkeyRegistrationOptions(id, rp, false)).toEqual({ error: expect.stringMatching(/current second step/) });
    expect(await register(id, auth, true)).toEqual({ error: 'This passkey is already registered' });
  });

  it('refuses a registration for another site, a reused challenge, or another account\'s challenge', async () => {
    const auth = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    const o = ok(passkeyRegistrationOptions(id, rp, false));
    expect(registerPasskey(id, { challengeId: o.challengeId, response: auth.register(o.publicKey.challenge, { origin: 'https://evil.example' }) }, rp)).toEqual({ error: expect.stringMatching(/origin/) });
    expect(registerPasskey(id, { challengeId: o.challengeId, response: auth.register(o.publicKey.challenge) }, rp)).toEqual({ error: expect.stringMatching(/expired or was used/) });
    const o2 = ok(passkeyRegistrationOptions(id, rp, false));
    expect(registerPasskey(other, { challengeId: o2.challengeId, response: auth.register(o2.publicKey.challenge) }, rp)).toEqual({ error: expect.stringMatching(/expired or was used/) });
  });

  it('asks for the passkey after the password, and signs in with it', async () => {
    const auth = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    ok(await register(id, auth));
    const first = await checkPassword('ada@gov.example', PW, Date.now(), undefined, { rp });
    if (!('passkey' in first) || !first.passkey) throw new Error('expected passkey options');
    expect(first.error).toMatch(/passkey/);
    expect(first.passkey.publicKey.allowCredentials).toHaveLength(1);
    // A wrong password never gets this far.
    expect(await checkPassword('ada@gov.example', 'wrong password!!', Date.now(), undefined, { rp })).toEqual({ error: 'Wrong email or password' });
    const response = auth.assert(first.passkey.publicKey.challenge);
    const done = await checkPassword('ada@gov.example', PW, Date.now(), undefined, { rp, challengeId: first.passkey.challengeId, response });
    expect(done).toMatchObject({ id, secondStep: true });
    // Replaying the same answer (same challenge, same counter) is refused.
    expect(await checkPassword('ada@gov.example', PW, Date.now(), undefined, { rp, challengeId: first.passkey.challengeId, response })).toMatchObject({ error: expect.stringMatching(/expired or was used/) });
  });

  it('does not accept one account\'s passkey challenge for another', async () => {
    const a = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    const b = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    ok(await register(id, a)); ok(await register(other, b));
    const forA = await checkPassword('ada@gov.example', PW, Date.now(), undefined, { rp });
    if (!('passkey' in forA) || !forA.passkey) throw new Error('expected options');
    const r = await checkPassword('ben@gov.example', PW, Date.now(), undefined, { rp, challengeId: forA.passkey.challengeId, response: b.assert(forA.passkey.publicKey.challenge) });
    expect(r).toMatchObject({ error: expect.stringMatching(/expired or was used/) });
  });

  it('signs in with a passkey alone when it verified the person, and refuses a counter going backwards', async () => {
    const auth = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    ok(await register(id, auth));
    const o = passkeySignInOptions(rp);
    expect(o.publicKey.userVerification).toBe('required');
    const r = signInWithPasskey({ challengeId: o.challengeId, response: auth.assert(o.publicKey.challenge, { userHandle: Buffer.from(id).toString('base64url') }) }, rp);
    expect(r).toMatchObject({ id, secondStep: true });
    // A copy of the authenticator that has not moved its counter forward.
    const o2 = passkeySignInOptions(rp);
    expect(signInWithPasskey({ challengeId: o2.challengeId, response: auth.assert(o2.publicKey.challenge, { keepCounter: true }) }, rp)).toEqual({ error: expect.stringMatching(/counter/) });
    expect(listAudit().find(e => e.action === 'auth.passkey.counter')).toMatchObject({ outcome: 'denied' });
    // Without user verification it is not enough on its own.
    const noUv = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin, uv: false });
    ok(await register(other, noUv));
    const o3 = passkeySignInOptions(rp);
    expect(signInWithPasskey({ challengeId: o3.challengeId, response: noUv.assert(o3.publicKey.challenge) }, rp)).toEqual({ error: expect.stringMatching(/verify the person/) });
    // Another account's user handle is refused.
    const o4 = passkeySignInOptions(rp);
    expect(signInWithPasskey({ challengeId: o4.challengeId, response: auth.assert(o4.publicKey.challenge, { userHandle: Buffer.from(other).toString('base64url') }) }, rp)).toEqual({ error: expect.stringMatching(/another account/) });
  });

  it('keeps the last second step the policy requires, and an administrator\'s reset removes passkeys', async () => {
    setTwoStepPolicy('all', 'Ada');
    const auth = new SoftAuthenticator({ rpId: rp.rpId, origin: rp.origin });
    const pk = ok(await register(id, auth)).passkey;
    expect(removePasskey(id, pk.id, 'Ada', false)).toEqual({ error: expect.stringMatching(/second step before/) });
    expect(removePasskey(id, pk.id, 'Ada', true)).toEqual({ error: expect.stringMatching(/requires a second step/) });
    ok(removeTwoStep(id, { by: 'Ben', reset: true }));
    expect(accountById(id)).toMatchObject({ passkeys: [], secondStepOn: false });
    expect(listAudit().find(e => e.action === 'auth.passkey.reset')).toMatchObject({ actor: 'Ben' });
  });
});
