import { describe, it, expect } from 'vitest';
import { senateBoard, SENATE_SAFEGUARDS } from './senate-engine';

describe('senateBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = senateBoard(1_700_000_000_000);
    const b = senateBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('returns 8 bills, 6 treaties, and 7 committees', () => {
    const b = senateBoard(1_700_000_000_000);
    expect(b.bills).toHaveLength(8);
    expect(b.treaties).toHaveLength(6);
    expect(b.committees).toHaveLength(7);
  });

  it('every bill has a positive page count and a documented stage', () => {
    const b = senateBoard(1_700_000_000_000);
    const stages = ['second-reading','committee','amendment','final-vote','awaiting-assent'];
    for (const bill of b.bills) {
      expect(bill.pageCount).toBeGreaterThan(0);
      expect(stages).toContain(bill.stage);
    }
  });

  it('every treaty scope is one of the documented categories', () => {
    const b = senateBoard(1_700_000_000_000);
    const scopes = ['bilateral','regional','multilateral','universal'];
    for (const t of b.treaties) {
      expect(scopes).toContain(t.scope);
    }
  });

  it('committee metrics are non-negative integers', () => {
    const b = senateBoard(1_700_000_000_000);
    for (const c of b.committees) {
      expect(c.inquiriesActive).toBeGreaterThanOrEqual(0);
      expect(c.reportsTabledYTD).toBeGreaterThanOrEqual(0);
      expect(c.hearingsThisQ).toBeGreaterThanOrEqual(0);
    }
  });

  it('exposes the safeguards prohibited list verbatim', () => {
    const b = senateBoard(1_700_000_000_000);
    expect(b.prohibited).toBe(SENATE_SAFEGUARDS.prohibited);
  });

  it('encodes the two-thirds override and treaty ratification invariants', () => {
    expect(SENATE_SAFEGUARDS.twoThirdsForOverride).toBe(true);
    expect(SENATE_SAFEGUARDS.treatyRatificationRequired).toBe(true);
    expect(SENATE_SAFEGUARDS.prohibited).toContain('override-without-two-thirds');
  });
});
