import { describe, it, expect } from 'vitest';
import { pickIndex } from './pick-index';

describe('pickIndex', () => {
  it('is deterministic and in range', () => {
    for (const k of ['health-1', 'inst-42', 'abc']) {
      const a = pickIndex(k, 6);
      expect(a).toBe(pickIndex(k, 6));
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(6);
    }
  });

  it('matches the legacy inline formula (seed 9 default)', () => {
    const k = 'instance-xyz';
    const legacy = Math.abs([...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 9)) % 6;
    expect(pickIndex(k, 6)).toBe(legacy);
  });

  it('honours a custom seed and guards empty lists', () => {
    expect(pickIndex('x', 5, 7)).toBe(Math.abs([...'x'].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 5);
    expect(pickIndex('x', 0)).toBe(0);
  });

  it('two-sided invariant: same appId+len+default-seed resolves the same facility', () => {
    // CitizenWalletApp (PUBLIC side) and that ministry's MinistryChainSection
    // (OFFICIAL side) must pick the SAME facility for the shared encounter
    // scope to connect. Both call pickIndex(appId, len) with the default seed.
    for (const appId of ['cw-finance-01', 'instanceABC', 'x']) {
      for (const len of [3, 6, 8]) {
        expect(pickIndex(appId, len)).toBe(pickIndex(appId, len));
        expect(pickIndex(appId, len)).toBe(pickIndex(appId, len, 9));
      }
    }
  });
});
