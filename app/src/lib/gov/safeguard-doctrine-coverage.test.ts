import { describe, it, expect } from 'vitest';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';
import { SAFEGUARD_DOCTRINE } from './safeguard-doctrine';

// Lock the doctrine ↔ safeguard registry bridge: every registered
// safeguard family must declare a doctrine line, and no orphan doctrine
// keys may exist without a matching family.
describe('safeguard ↔ doctrine bridge', () => {
  it('every safeguard family has a doctrine line', () => {
    for (const s of SAFEGUARD_REGISTRY) {
      expect(SAFEGUARD_DOCTRINE[s.key]).toBeTruthy();
      expect((SAFEGUARD_DOCTRINE[s.key] ?? '').length).toBeGreaterThan(30);
    }
  });

  it('every doctrine key maps to a registered safeguard family', () => {
    const fams = new Set(SAFEGUARD_REGISTRY.map(s => s.key));
    for (const k of Object.keys(SAFEGUARD_DOCTRINE)) {
      expect(fams.has(k)).toBe(true);
    }
  });
});
