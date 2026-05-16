import { describe, it, expect } from 'vitest';
import { energyOps, energyInstability } from './energy-systems';

describe('energy systems engine', () => {
  it('deterministic & bounded', () => {
    expect(energyOps('E', 50)).toEqual(energyOps('E', 50));
    const o = energyOps('E', 50);
    expect(o.generation.length).toBe(5);
    expect(o.substations.online).toBeLessThanOrEqual(o.substations.total);
    expect(o.electrificationPct).toBeLessThanOrEqual(100);
    expect(typeof o.loadShedding).toBe('boolean');
    for (const t of [10, 80, 260]) {
      const v = energyInstability('E', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
