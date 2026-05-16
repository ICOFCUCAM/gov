import { describe, it, expect } from 'vitest';
import { justiceOps, justiceInstability } from './justice-systems';

describe('justice ministry systems engine', () => {
  it('deterministic & bounded', () => {
    expect(justiceOps('J', 50)).toEqual(justiceOps('J', 50));
    const o = justiceOps('J', 50);
    expect(o.corrections.occupancyPct).toBeGreaterThanOrEqual(0);
    expect(o.registries.integrityPct).toBeLessThanOrEqual(100);
    expect(o.accessToJusticeIndex).toBeLessThanOrEqual(100);
    for (const t of [10, 90, 300]) {
      const v = justiceInstability('J', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
