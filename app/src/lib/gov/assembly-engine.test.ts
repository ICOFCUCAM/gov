import { describe, it, expect } from 'vitest';
import { assemblyBoard, ASSEMBLY_SAFEGUARDS } from './assembly-engine';

describe('assemblyBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = assemblyBoard(1_700_000_000_000);
    const b = assemblyBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('returns 10 bills and 8 petitions', () => {
    const b = assemblyBoard(1_700_000_000_000);
    expect(b.bills).toHaveLength(10);
    expect(b.petitions).toHaveLength(8);
  });

  it('blocs are sized near the documented total assembly capacity', () => {
    const b = assemblyBoard(1_700_000_000_000);
    const seatTotal = b.blocs.reduce((s, x) => s + x.seats, 0);
    expect(seatTotal).toBeGreaterThanOrEqual(b.totalMembers);
    expect(seatTotal).toBeLessThan(b.totalMembers + 60);
  });

  it('budget stage is one of the documented stages', () => {
    const b = assemblyBoard(1_700_000_000_000);
    expect(['tabled', 'committee', 'debate', 'appropriation-vote', 'assented']).toContain(b.budget.stage);
  });

  it('keeps petition signature counts non-negative', () => {
    const b = assemblyBoard(1_700_000_000_000);
    for (const p of b.petitions) {
      expect(p.signatures).toBeGreaterThanOrEqual(0);
    }
  });

  it('exposes the safeguards prohibited list verbatim', () => {
    const b = assemblyBoard(1_700_000_000_000);
    expect(b.prohibited).toBe(ASSEMBLY_SAFEGUARDS.prohibited);
  });

  it('encodes public voting and weekly question time on the safeguards', () => {
    expect(ASSEMBLY_SAFEGUARDS.publicVotingByDefault).toBe(true);
    expect(ASSEMBLY_SAFEGUARDS.questionTimeWeekly).toBe(true);
    expect(ASSEMBLY_SAFEGUARDS.prohibited).toContain('secret-ballots-on-policy');
  });
});
