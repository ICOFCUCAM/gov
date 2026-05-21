import { describe, it, expect } from 'vitest';
import { presidencyBoard, PRESIDENTIAL_SAFEGUARDS } from './presidency-engine';

describe('presidencyBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = presidencyBoard(1_700_000_000_000);
    const b = presidencyBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('returns 15 ministers (one per documented ministry)', () => {
    const b = presidencyBoard(1_700_000_000_000);
    expect(b.ministers).toHaveLength(15);
    expect(b.ministers.every(m => m.id.startsWith('MIN-'))).toBe(true);
  });

  it('emits 8 executive orders with citation strings', () => {
    const b = presidencyBoard(1_700_000_000_000);
    expect(b.orders).toHaveLength(8);
    expect(b.orders.every(o => o.citation.startsWith('§'))).toBe(true);
  });

  it('keeps every minister term within [0, 48] months', () => {
    const b = presidencyBoard(1_700_000_000_000);
    for (const m of b.ministers) {
      expect(m.termMonthsRemaining).toBeGreaterThanOrEqual(0);
      expect(m.termMonthsRemaining).toBeLessThanOrEqual(48);
    }
  });

  it('keeps the approval index plausible (0–100)', () => {
    const b = presidencyBoard(1_700_000_000_000);
    expect(b.approvalIndex).toBeGreaterThanOrEqual(0);
    expect(b.approvalIndex).toBeLessThanOrEqual(100);
  });

  it('exposes the safeguards prohibited list verbatim', () => {
    const b = presidencyBoard(1_700_000_000_000);
    expect(b.prohibited).toBe(PRESIDENTIAL_SAFEGUARDS.prohibited);
  });

  it('encodes civil supremacy and term limits in the safeguards', () => {
    expect(PRESIDENTIAL_SAFEGUARDS.civilSupremacyOverMilitary).toBe(true);
    expect(PRESIDENTIAL_SAFEGUARDS.termLimitedExecutive).toBe(true);
    expect(PRESIDENTIAL_SAFEGUARDS.prohibited).toContain('unilateral-rule-by-decree');
  });
});
