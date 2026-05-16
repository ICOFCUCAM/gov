import { describe, it, expect } from 'vitest';
import { ministryOpState } from './ministry-ops';

describe('deep ministry operational model', () => {
  it('is deterministic and fully bounded', () => {
    const a = ministryOpState('m1', 'HEALTH', 55, 120);
    const b = ministryOpState('m1', 'HEALTH', 55, 120);
    expect(a).toEqual(b);
    for (const k of ['readiness', 'slaCompliance', 'staffingFilled', 'budgetPressure', 'logisticsHealth', 'publicPressure', 'compliance', 'corruptionRisk', 'infrastructureStatus', 'regionalImpact'] as const) {
      expect(a[k]).toBeGreaterThanOrEqual(0);
      expect(a[k]).toBeLessThanOrEqual(100);
    }
  });

  it('high pressure raises escalation tier and lowers readiness', () => {
    const calm = ministryOpState('x', 'ENERGY', 20, 60);
    const hot = ministryOpState('x', 'ENERGY', 90, 60);
    expect(hot.escalationTier).toBeGreaterThan(calm.escalationTier);
    expect(hot.readiness).toBeLessThan(calm.readiness);
  });

  it('classifies constitutional posture from compliance', () => {
    const s = ministryOpState('c', 'JUSTICE', 50, 90);
    expect(['compliant', 'review', 'breach']).toContain(s.constitutional);
    expect(s.aiAdvisory.length).toBeGreaterThan(0);
  });
});
