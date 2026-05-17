import { describe, it, expect } from 'vitest';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps, bankingRails,
  citizenFinance, fiscalAssurance, treasuryInstability, treasuryCommand,
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

  it('treasuryCommand is a deterministic, bounded synthesis surface', () => {
    const c = treasuryCommand('F', 110);
    expect(c).toEqual(treasuryCommand('F', 110));
    expect(['steady', 'engaged', 'crisis']).toContain(c.posture);
    expect(c.postureIndex).toBeGreaterThanOrEqual(0);
    expect(c.postureIndex).toBeLessThanOrEqual(100);
    expect(c.domains.length).toBe(5);
    for (const d of c.domains) expect(['ok', 'warn', 'alert']).toContain(d.tone);
    const rank = { critical: 0, priority: 1, advisory: 2 } as const;
    for (let i = 1; i < c.directives.length; i++) {
      expect(rank[c.directives[i - 1]!.priority]).toBeLessThanOrEqual(rank[c.directives[i]!.priority]);
    }
  });
});
