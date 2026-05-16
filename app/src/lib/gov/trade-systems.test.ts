import { describe, it, expect } from 'vitest';
import { tradeOps, tradeInstability } from './trade-systems';

describe('trade systems engine', () => {
  it('deterministic & bounded', () => {
    expect(tradeOps('T', 50)).toEqual(tradeOps('T', 50));
    const o = tradeOps('T', 50);
    expect(o.exports.corridorsOpen).toBeLessThanOrEqual(o.exports.corridorsTotal);
    expect(o.standards.conformityPct).toBeLessThanOrEqual(100);
    expect(o.tradeBalanceIdx).toBeLessThanOrEqual(100);
    for (const t of [10, 90, 300]) {
      const v = tradeInstability('T', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
