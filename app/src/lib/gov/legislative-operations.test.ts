import { describe, it, expect } from 'vitest';
import { parliamentarySchedule, budgetApprovalPipeline, oversightHearings } from './legislative-operations';

describe('legislative operations engine', () => {
  it('deterministic & coherent', () => {
    expect(parliamentarySchedule(50)).toEqual(parliamentarySchedule(50));
    const bp = budgetApprovalPipeline(50);
    expect(['tabled', 'committee', 'debate', 'appropriation vote', 'assented']).toContain(bp.stage);
    expect(bp.scrutinyDaysLeft).toBeGreaterThanOrEqual(0);
    const oh = oversightHearings(50);
    expect(oh.active.length).toBeGreaterThan(0);
    expect(oh.active.every(a => ['scheduled', 'in session', 'reported'].includes(a.status))).toBe(true);
    expect(oversightHearings(50)).toEqual(oversightHearings(50));
  });
});
