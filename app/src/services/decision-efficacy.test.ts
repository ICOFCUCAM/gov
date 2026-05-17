import { describe, it, expect } from 'vitest';
import { decisionEfficacy, efficacyRollup } from './decision-efficacy';

describe('decision efficacy ledger', () => {
  it('unactioned directives carry no accountability signal', () => {
    const r = decisionEfficacy({ baseline: 40, current: 90, goal: 'raise', actioned: false });
    expect(r.verdict).toBe('unactioned');
    expect(r.delta).toBe(0);
  });

  it('credits movement in the intended direction (raise)', () => {
    const r = decisionEfficacy({ baseline: 40, current: 58, goal: 'raise', actioned: true });
    expect(r.verdict).toBe('effective');
    expect(r.delta).toBe(18);
  });

  it('credits movement in the intended direction (lower)', () => {
    const r = decisionEfficacy({ baseline: 22, current: 6, goal: 'lower', actioned: true });
    expect(r.verdict).toBe('effective');
    expect(r.delta).toBe(16);
  });

  it('flags regression against the goal', () => {
    const r = decisionEfficacy({ baseline: 60, current: 50, goal: 'raise', actioned: true });
    expect(r.verdict).toBe('ineffective');
    expect(r.delta).toBe(-10);
  });

  it('treats sub-material movement as pending', () => {
    const r = decisionEfficacy({ baseline: 60, current: 61, goal: 'raise', actioned: true });
    expect(r.verdict).toBe('pending');
  });

  it('rolls up a hit-rate over actioned decisions only', () => {
    const roll = efficacyRollup([
      decisionEfficacy({ baseline: 40, current: 60, goal: 'raise', actioned: true }),  // effective
      decisionEfficacy({ baseline: 40, current: 30, goal: 'raise', actioned: true }),  // ineffective
      decisionEfficacy({ baseline: 40, current: 41, goal: 'raise', actioned: true }),  // pending
      decisionEfficacy({ baseline: 40, current: 99, goal: 'raise', actioned: false }), // unactioned
    ]);
    expect(roll.effective).toBe(1);
    expect(roll.ineffective).toBe(1);
    expect(roll.pending).toBe(1);
    expect(roll.unactioned).toBe(1);
    expect(roll.hitRate).toBe(33); // 1 effective of 3 actioned
  });

  it('hit-rate is −1 when nothing has been actioned', () => {
    const roll = efficacyRollup([decisionEfficacy({ baseline: 1, current: 9, goal: 'raise', actioned: false })]);
    expect(roll.hitRate).toBe(-1);
  });
});
