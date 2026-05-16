import { describe, it, expect } from 'vitest';
import { environmentOps, environmentInstability } from './environment-systems';

describe('environment systems engine', () => {
  it('deterministic & bounded', () => {
    expect(environmentOps('N', 50)).toEqual(environmentOps('N', 50));
    const o = environmentOps('N', 50);
    expect(o.monitoringOnline).toBeLessThanOrEqual(o.monitoringTotal);
    expect(o.hazards.length).toBe(6);
    expect(o.hazards.every(h => ['low', 'moderate', 'severe'].includes(h.level))).toBe(true);
    for (const t of [10, 90, 300]) {
      const v = environmentInstability('N', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
