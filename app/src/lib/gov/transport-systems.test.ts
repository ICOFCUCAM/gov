import { describe, it, expect } from 'vitest';
import { transportOps, transportInstability } from './transport-systems';

describe('transport systems engine', () => {
  it('deterministic & bounded', () => {
    expect(transportOps('T', 50)).toEqual(transportOps('T', 50));
    const o = transportOps('T', 50);
    expect(o.modes.length).toBe(4);
    expect(o.corridors.length).toBe(5);
    expect(o.networkAvailabilityPct).toBeLessThanOrEqual(100);
    expect(o.fleet.available).toBeLessThanOrEqual(o.fleet.vehicles);
    for (const m of o.modes) expect(['ok', 'warn', 'alert']).toContain(m.tone);
    for (const t of [10, 100, 320]) {
      const v = transportInstability('T', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
