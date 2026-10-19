import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { resetOfficials, createAccount, checkPassword, startTwoStep, confirmTwoStep } from './officials';
import { hotp, stepAt } from './totp';
import { seal, open, isSealed, parseKek } from '@/lib/crypto/envelope';

const PW = 'correct horse battery staple';
const now = Date.parse('2026-10-18T12:00:00Z');
type Acc = { id: string; twoStep?: { secret: string }; twoStepPending?: { secret: string } };
const stored = () => (globalThis as unknown as { __civicosOfficials: { accounts: Acc[] } }).__civicosOfficials.accounts;
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error(r.error); return r as T; };

describe('authenticator secrets at rest (AES-256-GCM under CIVICOS_DATA_KEK)', () => {
  const kek = randomBytes(32).toString('base64');
  beforeEach(() => { resetOfficials(); process.env.CIVICOS_DATA_KEK = kek; delete process.env.CIVICOS_DATA_KEK_PREVIOUS; });
  afterEach(() => { delete process.env.CIVICOS_DATA_KEK; delete process.env.CIVICOS_DATA_KEK_PREVIOUS; });

  it('seals and opens, bound to what it belongs to', () => {
    const s = seal('JBSWY3DPEHPK3PXP', 'totp:a');
    expect(isSealed(s)).toBe(true);
    expect(s).not.toContain('JBSWY3DPEHPK3PXP');
    expect(open(s, 'totp:a')).toEqual({ plain: 'JBSWY3DPEHPK3PXP', reseal: false });
    expect(open(s, 'totp:b')).toEqual({ error: expect.stringMatching(/does not open/) });
    const tampered = s.slice(0, -2) + (s.endsWith('A') ? 'BB' : 'AA');
    expect(open(tampered, 'totp:a')).toHaveProperty('error');
  });

  it('accepts hex keys and refuses keys of the wrong length', () => {
    expect(parseKek(randomBytes(32).toString('hex'))).toHaveLength(32);
    expect(() => parseKek(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
  });

  it('keeps the secret sealed in the state through setup and sign-in', () => {
    const a = ok(createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    const { secret } = ok(startTwoStep(a.id, 'State'));
    expect(isSealed(stored()[0]!.twoStepPending!.secret)).toBe(true);
    ok(confirmTwoStep(a.id, hotp(secret, stepAt(now)), now));
    const at = stored()[0]!.twoStep!.secret;
    expect(isSealed(at)).toBe(true);
    expect(JSON.stringify(stored())).not.toContain(secret);
    const later = now + 90_000;
    expect(checkPassword('ps@agri.gov', PW, later, hotp(secret, stepAt(later)))).toMatchObject({ secondStep: true });
  });

  it('still reads a plaintext secret from before, and seals it on its next use', () => {
    const a = ok(createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    stored()[0]!.twoStep = { secret, since: '2026-01-01', lastStep: 0, recovery: [] } as never;
    const later = now + 90_000;
    expect(checkPassword('ps@agri.gov', PW, later, hotp(secret, stepAt(later)))).toMatchObject({ secondStep: true, id: a.id });
    expect(isSealed(stored()[0]!.twoStep!.secret)).toBe(true);
    expect(open(stored()[0]!.twoStep!.secret, `totp:${a.id}`)).toMatchObject({ plain: secret });
  });

  it('re-seals under a rotated key and says clearly when the key is missing', () => {
    const a = ok(createAccount({ email: 'ps@agri.gov', name: 'J. Otieno', office: 'PS', password: PW }, null));
    const { secret } = ok(startTwoStep(a.id, 'State'));
    ok(confirmTwoStep(a.id, hotp(secret, stepAt(now)), now));
    const before = stored()[0]!.twoStep!.secret;

    process.env.CIVICOS_DATA_KEK_PREVIOUS = kek;
    process.env.CIVICOS_DATA_KEK = randomBytes(32).toString('base64');
    let t = now + 90_000;
    expect(checkPassword('ps@agri.gov', PW, t, hotp(secret, stepAt(t)))).toMatchObject({ secondStep: true });
    expect(stored()[0]!.twoStep!.secret.split(':')[2]).not.toBe(before.split(':')[2]);

    delete process.env.CIVICOS_DATA_KEK; delete process.env.CIVICOS_DATA_KEK_PREVIOUS;
    t += 90_000;
    expect(checkPassword('ps@agri.gov', PW, t, hotp(secret, stepAt(t)))).toEqual({ error: expect.stringMatching(/CIVICOS_DATA_KEK/), needsCode: true });
  });

  it('leaves secrets as they are when no key is configured', () => {
    delete process.env.CIVICOS_DATA_KEK;
    expect(seal('abc', 'x')).toBe('abc');
    expect(open('abc', 'x')).toEqual({ plain: 'abc', reseal: false });
  });
});
