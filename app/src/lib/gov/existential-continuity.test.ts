import { describe, it, expect } from 'vitest';
import { existentialBoard, EXISTENTIAL_SAFEGUARDS } from './existential-continuity';
import { ERA_COUNT } from './generational-intelligence';

describe('constitutional existential & species continuity', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(existentialBoard(4000 * 240)))
      .toEqual(JSON.stringify(existentialBoard(4000 * 240 + 970)));
  });

  it('enforces rights-preserving, anti-authoritarian existential safeguards', () => {
    expect(EXISTENTIAL_SAFEGUARDS.perCitizenData).toBe(false);
    expect(EXISTENTIAL_SAFEGUARDS.rightsPreserving).toBe(true);
    expect(EXISTENTIAL_SAFEGUARDS.humanitarian).toBe(true);
    for (const p of ['emergency-authoritarianism', 'coercive-biosurveillance', 'population-value-scoring', 'genetic-prioritization', 'technocratic-survival-hierarchy', 'suspension-of-constitutional-humanity']) {
      expect(EXISTENTIAL_SAFEGUARDS.prohibited).toContain(p);
    }
    const { prohibited, ...rest } = existentialBoard(4000 * 150);
    expect(prohibited.length).toBeGreaterThan(0);
    const json = JSON.stringify(rest).toLowerCase();
    // 'biosurv' would collide with the legitimate 'biosurvival' concept, so
    // we scan only for the truly forbidden cousins.
    for (const forbidden of ['authoritar', 'biosurveil', 'biometriccontrol', 'genetic', 'populationvalue', 'technocrat', 'dystop', 'populationcontrol']) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });

  it('models bounded pandemic / catastrophic / governance / recovery dimensions', () => {
    const b = existentialBoard(4000 * 250);
    for (const v of Object.values(b.pandemic)) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(b.catastrophic)) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(b.governance)) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(b.recovery)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(b.recovery.recoveryTimelineEpochs).toBeGreaterThanOrEqual(1);
    expect(b.recovery.recoveryTimelineEpochs).toBeLessThanOrEqual(20);
  });

  it('forecasts a full-horizon civilization-resilience trajectory + valid mode', () => {
    const b = existentialBoard(4000 * 377);
    expect(b.civilizationResilienceTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.civilizationResilienceTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100);
    }
    expect(['stable-survivability', 'rising-existential-pressure', 'pandemic-strain', 'catastrophic-risk-elevated', 'cascading-fragility', 'continuity-survival', 'distributed-recovery', 'adaptive-restoration', 'restored-civilization-resilience']).toContain(b.mode);
  });

  it('stabilization is lawful, advisory, rights-preserving — never prohibited', () => {
    const b = existentialBoard(4000 * 333);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(EXISTENTIAL_SAFEGUARDS.prohibited as readonly string[]).not.toContain(s.kind);
    }
    expect(b.memory.longestSurvivableRun).toBeGreaterThanOrEqual(0);
  });
});
