import { describe, it, expect } from 'vitest';
import { laborOps, laborInstability } from './labor-systems';

describe('labour systems engine', () => {
  it('deterministic & bounded', () => {
    expect(laborOps('L', 50)).toEqual(laborOps('L', 50));
    const o = laborOps('L', 50);
    expect(o.socialInsurance.payoutOnTimePct).toBeLessThanOrEqual(100);
    expect(o.disputes.resolvedRate).toBeLessThanOrEqual(100);
    for (const t of [10, 90, 300]) {
      const v = laborInstability('L', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
