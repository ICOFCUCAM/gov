import { describe, it, expect } from 'vitest';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';

// Every safeguard family must declare its protective extras as TRUE.
// A regression that flips any of them (e.g., politicallyNeutral: false)
// must fail CI loudly — the ethical posture cannot silently regress.
describe('safeguard protective extras', () => {
  it('every declared extra resolves true (no safeguard regression)', () => {
    for (const s of SAFEGUARD_REGISTRY) {
      for (const e of s.extras) {
        expect(e.value).toBe(true);
      }
    }
  });
});
