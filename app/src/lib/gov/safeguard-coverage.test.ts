import { describe, it, expect } from 'vitest';
import { safeguardCoverage, enginesUnderFamily } from './safeguard-coverage';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';

describe('safeguard coverage map', () => {
  it('every safeguard family has at least one engine under it', () => {
    for (const s of SAFEGUARD_REGISTRY) {
      const engines = enginesUnderFamily(s.key);
      expect(engines.length).toBeGreaterThan(0);
    }
  });

  it('coverage rows are complete and consistent with the registry', () => {
    const rows = safeguardCoverage();
    expect(rows.length).toBeGreaterThan(SAFEGUARD_REGISTRY.length);
    const claimedFamilies = new Set(rows.map(r => r.family).filter(Boolean));
    for (const s of SAFEGUARD_REGISTRY) {
      expect(claimedFamilies.has(s.key)).toBe(true);
    }
  });
});
