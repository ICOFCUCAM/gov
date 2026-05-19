import { describe, it, expect } from 'vitest';
import { territorialBoard, ECOLOGICAL_SAFEGUARDS } from './territorial-continuity';
import { ERA_COUNT } from './generational-intelligence';

describe('ecological & territorial continuity', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(territorialBoard(4000 * 200)))
      .toEqual(JSON.stringify(territorialBoard(4000 * 200 + 970)));
  });

  it('enforces constitutional ecological safeguards', () => {
    expect(ECOLOGICAL_SAFEGUARDS.perCitizenData).toBe(false);
    expect(ECOLOGICAL_SAFEGUARDS.equitableContinuity).toBe(true);
    expect(ECOLOGICAL_SAFEGUARDS.scope).toBe('territorial-aggregate-only');
    for (const p of ['coercive-population-control', 'forced-demographic-engineering', 'territorial-discrimination', 'resource-authoritarianism', 'ecological-surveillance-abuse']) {
      expect(ECOLOGICAL_SAFEGUARDS.prohibited).toContain(p);
    }
    const b = territorialBoard(4000 * 140);
    expect(b.prohibited.length).toBeGreaterThan(0);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(ECOLOGICAL_SAFEGUARDS.prohibited as readonly string[]).not.toContain(s.kind);
    }
  });

  it('models every region with bounded ecology & survivability', () => {
    const b = territorialBoard(4000 * 250);
    expect(b.regions.length).toBe(6);
    for (const r of b.regions) {
      for (const v of [r.drought, r.flooding, r.waterAvailability, r.scarcityIndex, r.survivability]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(160);
      }
      expect(r.survivability).toBeLessThanOrEqual(100);
      expect(r.vulnerabilityZone).toBe(r.survivability < 42 || r.scarcityIndex > 70);
    }
    // sorted worst ecological strain first
    for (let i = 1; i < b.regions.length; i++) {
      expect(b.regions[i - 1]!.ecologicalStrain).toBeGreaterThanOrEqual(b.regions[i]!.ecologicalStrain);
    }
  });

  it('propagates ecological causality into institutional load', () => {
    const b = territorialBoard(4000 * 318);
    expect(b.edges.length).toBeGreaterThan(0);
    for (const e of b.edges) expect(e.magnitude).toBeGreaterThanOrEqual(0);
    expect(b.institutionalAmplification).toBeGreaterThanOrEqual(0);
    expect(b.institutionalAmplification).toBeLessThanOrEqual(60);
  });

  it('forecasts a full-horizon resilience trajectory + valid mode', () => {
    const b = territorialBoard(4000 * 377);
    expect(b.resilienceTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.resilienceTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(['sustainable-continuity', 'rising-environmental-strain', 'territorial-imbalance', 'ecological-overload', 'climate-migration-pressure', 'continuity-fragility', 'adaptation-mobilization', 'ecological-recovery', 'restored-territorial-resilience']).toContain(b.mode);
    expect(b.urbanization.every(u => u.trajectory.length === ERA_COUNT)).toBe(true);
    expect(b.disaster.length).toBe(6);
  });
});
