import { describe, it, expect } from 'vitest';
import { base32Decode, base32Encode, hotp, matchStep, otpauthUri, newSecret, stepAt } from './totp';

// RFC 6238 Appendix B (SHA-1 seed "12345678901234567890"), last six digits.
const SEED = base32Encode(Buffer.from('12345678901234567890'));

describe('authenticator codes (RFC 6238)', () => {
  it('round-trips base32 and matches the RFC test vectors', () => {
    expect(SEED).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(SEED).toString()).toBe('12345678901234567890');
    expect(hotp(SEED, stepAt(59_000))).toBe('287082');
    expect(hotp(SEED, stepAt(1_111_111_109_000))).toBe('081804');
    expect(hotp(SEED, stepAt(1_234_567_890_000))).toBe('005924');
    expect(hotp(SEED, stepAt(20_000_000_000_000))).toBe('353130');
  });

  it('accepts one step of clock drift, never a code twice, nothing else', () => {
    const now = 1_234_567_890_000, s = stepAt(now);
    expect(matchStep(SEED, hotp(SEED, s), now)).toBe(s);
    expect(matchStep(SEED, hotp(SEED, s - 1), now)).toBe(s - 1);
    expect(matchStep(SEED, hotp(SEED, s + 2), now)).toBeNull();
    expect(matchStep(SEED, hotp(SEED, s), now, s)).toBeNull();
    expect(matchStep(SEED, '12345', now)).toBeNull();
  });

  it('makes 160-bit secrets and the link authenticator apps open', () => {
    expect(base32Decode(newSecret())).toHaveLength(20);
    expect(otpauthUri(SEED, 'ps@agri.gov', 'Republic of Example')).toBe('otpauth://totp/Republic%20of%20Example%3Aps%40agri.gov?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=Republic%20of%20Example&algorithm=SHA1&digits=6&period=30');
  });
});
