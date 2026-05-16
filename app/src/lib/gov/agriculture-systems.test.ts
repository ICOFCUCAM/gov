import { describe, it, expect } from 'vitest';
import { agricultureOps, agricultureInstability } from './agriculture-systems';

describe('agriculture systems engine', () => {
  it('deterministic & bounded', () => {
    expect(agricultureOps('A', 50)).toEqual(agricultureOps('A', 50));
    const o = agricultureOps('A', 50);
    expect(o.crops.length).toBe(6);
    expect(o.byRegion.length).toBe(6);
    expect(o.foodSecurityIndex).toBeLessThanOrEqual(100);
    expect(o.crops.every(c => ['ok', 'warn', 'alert'].includes(c.tone))).toBe(true);
    for (const t of [10, 90, 300]) {
      const v = agricultureInstability('A', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
