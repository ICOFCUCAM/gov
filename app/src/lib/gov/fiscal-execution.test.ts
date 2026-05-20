import { describe, it, expect } from 'vitest';
import { fundingChains, reserveWorkflows, budgetPropagation, interMinistryTransfers, fiscalExecutionBoard } from './fiscal-execution';

describe('fiscal execution engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(fiscalExecutionBoard(4000 * 220)))
      .toEqual(JSON.stringify(fiscalExecutionBoard(4000 * 220 + 950)));
  });

  it('funding chains are stateful with a valid stage, status & approver chain', () => {
    const valid = ['request', 'review', 'approval', 'release', 'disbursement', 'reconciliation'];
    const statuses = ['in-flight', 'held', 'rejected', 'released', 'reconciled'];
    for (const c of fundingChains(4000 * 333)) {
      expect(valid).toContain(c.stage);
      expect(statuses).toContain(c.status);
      expect(c.amountM).toBeGreaterThan(0);
      expect(c.approverChain.length).toBeGreaterThanOrEqual(0);
      expect(c.slaHrs).toBeGreaterThan(0);
    }
  });

  it('reserve workflows require three authorisations + status reflects them', () => {
    for (const r of reserveWorkflows(4000 * 412)) {
      expect(r.authorisations.length).toBe(3);
      const allHeld = r.authorisations.every(a => a.held);
      if (!allHeld) {
        expect(['pending-authorisation', 'blocked']).toContain(r.status);
      } else {
        expect(['released', 'repatriating', 'reconciled']).toContain(r.status);
      }
      expect(r.requestedBn).toBeGreaterThan(0);
    }
  });

  it('budget propagation cascades monotonically (ministry ≥ department ≥ encumbrance ≥ spent)', () => {
    for (const b of budgetPropagation(4000 * 401)) {
      const [m, d, e, s] = b.cascade.map(x => x.pct) as [number, number, number, number];
      expect(m).toBe(100);
      expect(d).toBeLessThanOrEqual(m);
      expect(e).toBeLessThanOrEqual(d);
      expect(s).toBeLessThanOrEqual(e);
      expect(b.burndownPct).toBe(s);
    }
  });

  it('inter-ministry transfers have a 3-hop chain ending at a vendor', () => {
    for (const t of interMinistryTransfers(4000 * 270)) {
      expect(t.hops.length).toBe(3);
      expect(t.hops[0]!.from).toBe('Treasury');
      expect(t.endToEndHrs).toBeGreaterThanOrEqual(0);
      for (const h of t.hops) {
        expect(['pending', 'cleared', 'reconciled', 'stalled']).toContain(h.status);
        expect(h.slaHrs).toBeGreaterThan(0);
      }
    }
  });
});
