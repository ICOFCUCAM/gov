import { describe, it, expect } from 'vitest';
import { judicialBranchBoard, JUDICIAL_BRANCH_SAFEGUARDS } from './judicial-branch-engine';

describe('judicialBranchBoard', () => {
  it('is deterministic per operational epoch', () => {
    const a = judicialBranchBoard(1_700_000_000_000);
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(a).toEqual(b);
  });

  it('declares the five-tier court structure', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(b.tiers.map(t => t.tier)).toEqual([
      'Constitutional', 'Supreme', 'Appeals', 'Trial', 'Tribunal',
    ]);
  });

  it('every tier has at least one bench and non-negative case counts', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    for (const t of b.tiers) {
      expect(t.benches).toBeGreaterThan(0);
      expect(t.activeCases).toBeGreaterThanOrEqual(0);
      expect(t.backlog).toBeGreaterThanOrEqual(0);
      expect(t.clearancePct).toBeGreaterThanOrEqual(0);
      expect(t.clearancePct).toBeLessThanOrEqual(100);
    }
  });

  it('declares 11 justices led by a Chief Justice', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(b.justices).toHaveLength(11);
    expect(b.justices[0]!.name).toContain('Chief Justice');
  });

  it('emits 10 cases and 3 conduct cases', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(b.cases).toHaveLength(10);
    expect(b.conductCases).toHaveLength(3);
  });

  it('flags right-to-counsel as guaranteed per safeguard', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(b.rightsToCounselGuaranteed).toBe(true);
  });

  it('exposes the safeguards prohibited list verbatim', () => {
    const b = judicialBranchBoard(1_700_000_000_000);
    expect(b.prohibited).toBe(JUDICIAL_BRANCH_SAFEGUARDS.prohibited);
  });

  it('encodes judicial independence and open-reasoning on the safeguards', () => {
    expect(JUDICIAL_BRANCH_SAFEGUARDS.judicialIndependence).toBe(true);
    expect(JUDICIAL_BRANCH_SAFEGUARDS.openReasoningInEveryDecision).toBe(true);
    expect(JUDICIAL_BRANCH_SAFEGUARDS.prohibited).toContain('political-pressure-on-justices');
  });
});
