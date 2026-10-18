import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetOfficials, createAccount, checkPassword, setDisabled, listAccounts, sessionSecret, MAX_FAILURES } from './officials';
import { signClaims, verifyToken, type OfficialClaims } from './session-token';

let cookie: string | undefined;
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));
const { withOfficial } = await import('./official');

const PW = 'correct horse battery';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('platform accounts for officials', () => {
  beforeEach(() => { resetOfficials(); cookie = undefined; });

  it('lets the installation create its first account, then only signed-in officials', () => {
    const a = ok(createAccount({ email: 'PS@Agri.gov', name: 'J. Otieno', office: 'Permanent Secretary', password: PW }, null));
    expect(a).toMatchObject({ email: 'ps@agri.gov', createdBy: 'installation' });
    expect(a).not.toHaveProperty('passwordHash');
    expect(createAccount({ email: 'x@y.gov', name: 'X', office: 'Y', password: PW }, null)).toEqual({ error: expect.stringMatching(/signed-in/) });
    expect(createAccount({ email: 'x@y.gov', name: 'X', office: 'Y', password: 'short' }, 'J. Otieno')).toEqual({ error: expect.stringMatching(/12 characters/) });
    expect(createAccount({ email: 'ps@agri.gov', name: 'X', office: 'Y', password: PW }, 'J. Otieno')).toEqual({ error: expect.stringMatching(/already exists/) });
  });

  it('checks passwords against a salted hash and stops guessing after repeated failures', () => {
    ok(createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    expect(checkPassword('ps@agri.gov', PW)).toMatchObject({ name: 'J. Otieno' });
    for (let i = 0; i < MAX_FAILURES; i++) expect(checkPassword('ps@agri.gov', 'wrong password!!')).toEqual({ error: 'Wrong email or password' });
    expect(checkPassword('ps@agri.gov', PW)).toEqual({ error: expect.stringMatching(/Too many/) });
    expect(checkPassword('ps@agri.gov', PW, Date.now() + 16 * 60_000)).toMatchObject({ name: 'J. Otieno' });
  });

  it('never disables the last active account, and refuses disabled accounts', () => {
    const a = ok(createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    expect(setDisabled(a.id, true, 'A')).toEqual({ error: expect.stringMatching(/last active/) });
    const b = ok(createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, 'A'));
    ok(setDisabled(b.id, true, 'A'));
    expect(checkPassword('b@g.gov', PW)).toEqual({ error: 'Wrong email or password' });
    expect(listAccounts().find(x => x.id === b.id)?.disabled).toBe(true);
  });
});

describe('signed sessions', () => {
  beforeEach(() => { resetOfficials(); cookie = undefined; });
  const claims = (exp: number): OfficialClaims => ({ sub: 'local:1', name: 'J. Otieno', office: 'Permanent Secretary', method: 'local', iat: 0, exp });

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
