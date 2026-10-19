import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetOfficials, createAccount, checkPassword, setDisabled, setRole, listAccounts, sessionSecret, MAX_FAILURES } from './officials';
import { signClaims, verifyToken, type OfficialClaims } from './session-token';

// The full N=2^17 cost is covered by password-hash.test.ts; these tests check behaviour, not cost.
process.env.CIVICOS_SCRYPT_N = '16384';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const { withOfficial } = await import('./official');

const PW = 'correct horse battery';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('platform accounts for officials', () => {
  beforeEach(async () => { resetOfficials(); cookie = undefined; });

  it('lets the installation create its first account, then only signed-in officials', async () => {
    const a = ok(await createAccount({ email: 'PS@Agri.gov', name: 'J. Otieno', office: 'Permanent Secretary', password: PW }, null));
    expect(a).toMatchObject({ email: 'ps@agri.gov', createdBy: 'installation' });
    expect(a).not.toHaveProperty('passwordHash');
    expect(await createAccount({ email: 'x@y.gov', name: 'X', office: 'Y', password: PW }, null)).toEqual({ error: expect.stringMatching(/signed-in/) });
    expect(await createAccount({ email: 'x@y.gov', name: 'X', office: 'Y', password: 'short' }, 'J. Otieno')).toEqual({ error: expect.stringMatching(/12 characters/) });
    expect(await createAccount({ email: 'ps@agri.gov', name: 'X', office: 'Y', password: PW }, 'J. Otieno')).toEqual({ error: expect.stringMatching(/already exists/) });
  });

  it('checks passwords against a salted hash and stops guessing after repeated failures', async () => {
    ok(await createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    expect(await checkPassword('ps@agri.gov', PW)).toMatchObject({ name: 'J. Otieno' });
    for (let i = 0; i < MAX_FAILURES; i++) expect(await checkPassword('ps@agri.gov', 'wrong password!!')).toEqual({ error: 'Wrong email or password' });
    expect(await checkPassword('ps@agri.gov', PW)).toEqual({ error: expect.stringMatching(/Too many/) });
    expect(await checkPassword('ps@agri.gov', PW, Date.now() + 16 * 60_000)).toMatchObject({ name: 'J. Otieno' });
  });

  it('gives the first account administration and later ones the role they are given', async () => {
    const a = ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW, role: 'auditor' }, null));
    expect(a).toMatchObject({ role: 'administrator' });
    expect(a.institution).toBeUndefined();
    expect(ok(await createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, 'A'))).toMatchObject({ role: 'officer' });
    const c = ok(await createAccount({ email: 'c@g.gov', name: 'C', office: 'O', password: PW, role: 'signatory', institution: 'fed-treasury' }, 'A'));
    expect(c).toMatchObject({ role: 'signatory', institution: 'fed-treasury' });
    expect(await createAccount({ email: 'd@g.gov', name: 'D', office: 'O', password: PW, role: 'king' }, 'A')).toEqual({ error: 'Unknown role' });
    expect(ok(setRole(c.id, { role: 'officer', institution: null }, 'A'))).toMatchObject({ role: 'officer' });
    expect(listAccounts().find(x => x.id === c.id)?.institution).toBeUndefined();
  });

  it('always keeps one active administrator', async () => {
    const a = ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    ok(await createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, 'A'));
    expect(setRole(a.id, { role: 'officer' }, 'B')).toEqual({ error: expect.stringMatching(/last active administrator/) });
    expect(setDisabled(a.id, true, 'B')).toEqual({ error: expect.stringMatching(/last active administrator/) });
  });

  it('never disables the last active account, and refuses disabled accounts', async () => {
    const a = ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    expect(setDisabled(a.id, true, 'A')).toEqual({ error: expect.stringMatching(/last active/) });
    const b = ok(await createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, 'A'));
    ok(setDisabled(b.id, true, 'A'));
    expect(await checkPassword('b@g.gov', PW)).toEqual({ error: 'Wrong email or password' });
    expect(listAccounts().find(x => x.id === b.id)?.disabled).toBe(true);
  });
});

describe('signed sessions', () => {
  let id = '1';
  beforeEach(async () => { resetOfficials(); cookie = undefined; id = ok(await createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'Permanent Secretary', password: PW }, null)).id; });
  const claims = (exp: number): OfficialClaims => ({ sub: `local:${id}`, name: 'J. Otieno', office: 'Permanent Secretary', method: 'local', iat: 0, exp });

  it('verifies only unexpired tokens signed with this installation\'s key', async () => {
    const future = Math.floor(Date.now() / 1000) + 600;
    const t = await signClaims(claims(future), sessionSecret());
    expect(await verifyToken(t, sessionSecret())).toMatchObject({ name: 'J. Otieno' });
    expect(await verifyToken(t, 'other key')).toBeNull();
    expect(await verifyToken(t.replace(/^./, 'x'), sessionSecret())).toBeNull();
    expect(await verifyToken(await signClaims(claims(1), sessionSecret()), sessionSecret())).toBeNull();
  });

  it('puts the verified official in place of a typed-in name', async () => {
    expect(await withOfficial({ by: 'Anyone', action: 'clear' })).toEqual({ by: 'Anyone', action: 'clear' });
    cookie = await signClaims(claims(Math.floor(Date.now() / 1000) + 600), sessionSecret());
    expect(await withOfficial({ by: 'Anyone', action: 'clear' })).toEqual({ by: 'J. Otieno, Permanent Secretary', action: 'clear' });
    expect(await withOfficial({ decision: 'approve', officerName: 'Typed' })).toMatchObject({ officerName: 'J. Otieno, Permanent Secretary' });
  });
});

describe('the second sign-in step', () => {
  beforeEach(async () => { resetOfficials(); cookie = undefined; });
  const now = Date.parse('2026-10-18T12:00:00Z');

  it('is set up with a confirmed code, then asked for at every sign-in, each code once', async () => {
    const { startTwoStep, confirmTwoStep } = await import('./officials');
    const { hotp, stepAt } = await import('./totp');
    const a = ok(await createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    const { secret } = ok(startTwoStep(a.id, 'Test State'));
    expect(confirmTwoStep(a.id, '000000', now)).toEqual({ error: expect.stringMatching(/not right/) });
    const { recoveryCodes } = ok(confirmTwoStep(a.id, hotp(secret, stepAt(now)), now));
    expect(recoveryCodes).toHaveLength(10);
    expect(JSON.stringify(listAccounts())).not.toContain(secret);

    expect(await checkPassword('ps@agri.gov', PW, now + 60_000)).toEqual({ error: expect.any(String), needsCode: true });
    const later = now + 90_000;
    const code = hotp(secret, stepAt(later));
    expect(await checkPassword('ps@agri.gov', PW, later, code)).toMatchObject({ name: 'J. Otieno', secondStep: true });
    expect(await checkPassword('ps@agri.gov', PW, later, code)).toEqual({ error: expect.stringMatching(/not right/), needsCode: true });
    expect(await checkPassword('ps@agri.gov', PW, later, recoveryCodes[0])).toMatchObject({ secondStep: true });
    expect(await checkPassword('ps@agri.gov', PW, later, recoveryCodes[0])).toMatchObject({ needsCode: true });
  });

  it('is required by policy for those who can sign, and an administrator can reset a lost phone', async () => {
    const { setTwoStepPolicy, startTwoStep, confirmTwoStep, removeTwoStep, accountById } = await import('./officials');
    const { hotp, stepAt } = await import('./totp');
    const { apiPermission } = await import('./roles');
    const admin = ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    const officer = ok(await createAccount({ email: 'o@g.gov', name: 'B', office: 'O', password: PW, role: 'officer' }, 'A'));
    ok(setTwoStepPolicy('signers', 'A'));
    expect(accountById(admin.id)?.twoStepRequired).toBe(true);
    expect(accountById(officer.id)?.twoStepRequired).toBe(false);
    const scope = { role: 'administrator' as const, twoStepRequired: true };
    expect(apiPermission(scope, 'POST', '/api/directives')).toMatch(/second sign-in step/);
    expect(apiPermission(scope, 'POST', '/api/auth/two-step')).toBeNull();
    expect(apiPermission({ ...scope, twoStep: true }, 'POST', '/api/directives')).toBeNull();

    const { secret } = ok(startTwoStep(admin.id, 'S'));
    ok(confirmTwoStep(admin.id, hotp(secret, stepAt(now)), now));
    expect(removeTwoStep(admin.id, { code: hotp(secret, stepAt(now) + 1), by: 'A' }, now + 30_000)).toEqual({ error: expect.stringMatching(/requires/) });
    expect(ok(removeTwoStep(admin.id, { by: 'B (administrator)', reset: true })).twoStepSince).toBeUndefined();
  });
});

describe('changing and resetting passwords', () => {
  beforeEach(async () => { resetOfficials(); cookie = undefined; });
  const NEW = 'a brand new pass phrase';

  it('changes a password with the current one and ends sessions issued before', async () => {
    const { changePassword } = await import('./officials');
    const { currentOfficial } = await import('./official');
    const a = ok(await createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    const iat = Math.floor(Date.now() / 1000) - 60;
    cookie = await signClaims({ sub: `local:${a.id}`, name: 'J. Otieno', method: 'local', iat, exp: iat + 3600 }, sessionSecret());
    expect(await currentOfficial()).not.toBeNull();
    expect(await changePassword(a.id, 'wrong password!!', NEW)).toEqual({ error: expect.stringMatching(/current password/) });
    expect(await changePassword(a.id, PW, 'short')).toEqual({ error: expect.stringMatching(/12 characters/) });
    expect(await changePassword(a.id, PW, PW)).toEqual({ error: expect.stringMatching(/different/) });
    ok(await changePassword(a.id, PW, NEW));
    expect(await currentOfficial()).toBeNull();
    expect(await checkPassword('ps@agri.gov', PW)).toEqual({ error: 'Wrong email or password' });
    expect(await checkPassword('ps@agri.gov', NEW)).toMatchObject({ name: 'J. Otieno' });
  });

  it('resets a forgotten password with a one-time code that expires, never shown again', async () => {
    const { issueReset, resetPassword, accountById } = await import('./officials');
    const now = Date.now();
    ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    const b = ok(await createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, 'A'));
    const { code, expiresAt } = ok(issueReset(b.id, 'A (administrator)', now));
    expect(code).toMatch(/^[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$/);
    expect(JSON.stringify(listAccounts())).not.toContain(code.replace(/-/g, ''));
    expect(accountById(b.id)?.resetPendingUntil).toBe(expiresAt);
    expect(await resetPassword('b@g.gov', 'AAAAAA-AAAAAA-AAAAAA', NEW, now)).toEqual({ error: expect.stringMatching(/not right or has expired/) });
    expect(await resetPassword('b@g.gov', code, NEW, Date.parse(expiresAt) + 1)).toEqual({ error: expect.stringMatching(/expired/) });
    ok(await resetPassword('b@g.gov', code.toLowerCase(), NEW, now));
    expect(await resetPassword('b@g.gov', code, 'another long phrase', now)).toEqual({ error: expect.stringMatching(/not right/) });
    expect(await checkPassword('b@g.gov', NEW, now)).toMatchObject({ name: 'B' });
    expect(accountById(b.id)?.resetPendingUntil).toBeUndefined();
  });

  it('counts wrong reset codes toward the lockout', async () => {
    const { resetPassword } = await import('./officials');
    ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    for (let i = 0; i < MAX_FAILURES; i++) await resetPassword('a@g.gov', 'nope', NEW);
    expect(await resetPassword('a@g.gov', 'nope', NEW)).toEqual({ error: expect.stringMatching(/Too many/) });
  });
});

describe('an official\'s sign-in activity', () => {
  beforeEach(async () => { resetOfficials(); cookie = undefined; });

  it('shows their sign-ins, failed attempts against them and administrators\' changes, from the audit chain', async () => {
    const { accountActivity, deviceOf } = await import('./activity');
    const { recordAudit } = await import('@/lib/data/store');
    const { issueReset } = await import('./officials');
    ok(await createAccount({ email: 'a@g.gov', name: 'Admin', office: 'O', password: PW }, null));
    const b = ok(await createAccount({ email: 'b@g.gov', name: 'Bea', office: 'Clerk', password: PW }, 'Admin, O'));
    recordAudit('Bea, Clerk', 'auth.sign-in', `Official:local:${b.id}`, 'ok', 'local · Firefox on Linux');
    await checkPassword('b@g.gov', 'wrong password!!');
    await checkPassword('b@g.gov', 'wrong again!!!!!');
    await checkPassword('nobody@g.gov', 'wrong password!!');
    ok(issueReset(b.id, 'Admin, O'));
    recordAudit('Bea, Clerk', 'auth.sign-in', `Official:local:${b.id}`, 'ok', 'local · Safari on iPhone or iPad');
    const { entries, failedSincePreviousSignIn } = accountActivity(b.id, 'Bea');
    expect(entries.slice(0, 5).map(e => e.what)).toEqual(['Signed in', 'Password reset code issued', 'Failed sign-in', 'Failed sign-in', 'Signed in']);
    expect(entries[0]).toMatchObject({ ok: true, detail: 'Safari on iPhone or iPad' });
    expect(entries[1]).toMatchObject({ by: 'Admin, O' });
    expect(entries[2]).toMatchObject({ ok: false, detail: 'wrong email or password' });
    expect(failedSincePreviousSignIn).toBe(2);
    expect(JSON.stringify(entries)).not.toContain('b@g.gov');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36')).toBe('Chrome on Windows');
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone or iPad');
  });
});
