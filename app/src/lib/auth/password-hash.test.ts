import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes, scryptSync } from 'node:crypto';
import { resetOfficials, createAccount, checkPassword, needsRehash, SCRYPT } from './officials';

const PW = 'correct horse battery';
type Acc = { passwordHash: string };
const stored = () => (globalThis as unknown as { __civicosOfficials: { accounts: Acc[] } }).__civicosOfficials.accounts;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error(r.error); return r as T; };

describe('password hashing (async scrypt, N=2^17)', () => {
  beforeEach(() => { resetOfficials(); });

  it('hashes new passwords with N=2^17, r=8, p=1', async () => {
    ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    const h = stored()[0]!.passwordHash;
    expect(h.split('$')[1]).toBe(String(2 ** 17));
    expect(SCRYPT).toMatchObject({ N: 131072, r: 8, p: 1 });
    expect(needsRehash(h)).toBe(false);
    expect(await checkPassword('a@g.gov', PW)).toMatchObject({ name: 'A' });
  });

  it('accepts an old N=2^14 hash and replaces it at the next successful sign-in', async () => {
    ok(await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null));
    const salt = randomBytes(16);
    const old = `scrypt$16384$${salt.toString('base64')}$${scryptSync(PW, salt, 32, { N: 16384 }).toString('base64')}`;
    stored()[0]!.passwordHash = old;
    expect(needsRehash(old)).toBe(true);
    expect(await checkPassword('a@g.gov', 'wrong password!!')).toEqual({ error: 'Wrong email or password' });
    expect(stored()[0]!.passwordHash).toBe(old);
    expect(await checkPassword('a@g.gov', PW)).toMatchObject({ name: 'A' });
    const now = stored()[0]!.passwordHash;
    expect(now).not.toBe(old);
    expect(now.split('$')[1]).toBe('131072');
    expect(await checkPassword('a@g.gov', PW)).toMatchObject({ name: 'A' });
  });

  it('does not block the event loop while hashing', async () => {
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 1);
    await createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null);
    clearInterval(timer);
    expect(ticks).toBeGreaterThan(0);
  });

  it('refuses a second first account created while the first was hashing', async () => {
    const [a, b] = await Promise.all([
      createAccount({ email: 'a@g.gov', name: 'A', office: 'O', password: PW }, null),
      createAccount({ email: 'b@g.gov', name: 'B', office: 'O', password: PW }, null),
    ]);
    expect([a, b].filter(r => 'error' in r)).toHaveLength(1);
    expect(stored()).toHaveLength(1);
  });
});
