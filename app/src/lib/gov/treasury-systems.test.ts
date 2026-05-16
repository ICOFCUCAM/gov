import { describe, it, expect } from 'vitest';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps, bankingRails,
  citizenFinance, fiscalAssurance, treasuryInstability,
} from './treasury-systems';

describe('treasury systems engine', () => {
  it('every world is deterministic and bounded', () => {
    expect(fiscalCommand('F', 50)).toEqual(fiscalCommand('F', 50));
    const fc = fiscalCommand('F', 50);
    expect(fc.macroStability).toBeGreaterThanOrEqual(0);
    expect(fc.macroStability).toBeLessThanOrEqual(100);
    expect(['ok', 'warn', 'alert']).toContain(fc.tone);

    const rv = revenueOps('F', 50);
    expect(rv.byStream.length).toBe(6);
    expect(rv.collectionRatePct).toBeLessThanOrEqual(100);

    const bg = budgetOps('F', 50);
    expect(bg.byMinistry.length).toBe(6);
    expect(bg.executionPct).toBeLessThanOrEqual(100);

    const pc = procurementOps('F', 50);
    expect(pc.pipeline.length).toBe(5);
    expect(pc.integrityPct).toBeLessThanOrEqual(100);

    const br = bankingRails('F', 50);
    expect(br.channelsOnline).toBeLessThanOrEqual(br.channelsTotal);

    expect(citizenFinance('F', 50).portalUptime).toBeLessThanOrEqual(100);

    const fa = fiscalAssurance('F', 50);
    expect(fa.regionalRisk.length).toBe(6);
    expect(fa.regionalRisk.every(r => ['ok', 'warn', 'alert'].includes(r.tone))).toBe(true);
  });

  it('treasuryInstability is a bounded, deterministic propagation signal', () => {
    for (const t of [10, 90, 240, 500]) {
      const v = treasuryInstability('F', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(treasuryInstability('F', 77)).toBe(treasuryInstability('F', 77));
  });
});
