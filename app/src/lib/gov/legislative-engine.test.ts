import { describe, it, expect } from 'vitest';
import { legislativeState, committeeInquiries, BILL_STAGES } from './legislative-engine';

describe('live legislative engine', () => {
  it('instantiates bills as a deterministic, bounded state machine', () => {
    const a = legislativeState(50);
    const b = legislativeState(50);
    expect(a).toEqual(b);
    expect(a.bills.length).toBeGreaterThan(8);
    for (const bl of a.bills) {
      expect(bl.progressPct).toBeGreaterThanOrEqual(0);
      expect(bl.progressPct).toBeLessThanOrEqual(100);
      if (bl.stage !== 'Withdrawn') {
        expect(BILL_STAGES).toContain(bl.stage);
        expect(bl.stageIdx).toBeGreaterThanOrEqual(0);
      } else {
        expect(bl.stageIdx).toBe(-1);
      }
    }
    expect(a.parties.reduce((x, p) => x + p.seats, 0)).toBeGreaterThan(0);
    expect(a.attendancePct).toBeGreaterThanOrEqual(0);
    expect(a.attendancePct).toBeLessThanOrEqual(100);
  });

  it('bills advance through stages as time progresses', () => {
    const t0 = legislativeState(0);
    const t1 = legislativeState(400);
    // at least one bill changes stage between two distant ticks
    const changed = t0.bills.some((b, i) => b.stage !== t1.bills[i]!.stage || b.progressPct !== t1.bills[i]!.progressPct);
    expect(changed).toBe(true);
  });

  it('a bill on the floor produces a coherent division', () => {
    for (const t of [10, 60, 120, 250, 500]) {
      const s = legislativeState(t);
      if (s.division) {
        const d = s.division;
        expect(d.ayes + d.noes + d.abstain).toBe(d.total);
        expect(d.carried).toBe(d.ayes >= d.threshold);
        expect(d.threshold).toBeLessThanOrEqual(d.total);
      }
    }
  });

  it('committee inquiries are deterministic and cycle through phases', () => {
    const c = committeeInquiries(40);
    expect(c).toEqual(committeeInquiries(40));
    expect(c.length).toBeGreaterThan(0);
    for (const i of c) {
      expect(['gathering evidence', 'hearings', 'report drafting', 'reported']).toContain(i.status);
      expect(i.witnessesHeard).toBeGreaterThanOrEqual(0);
    }
  });
});
