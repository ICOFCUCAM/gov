import { describe, it, expect } from 'vitest';
import { geopoliticalBoard, GEOPOLITICAL_SAFEGUARDS } from './geopolitical-continuity';
import { ERA_COUNT } from './generational-intelligence';

describe('constitutional geopolitical & strategic continuity', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(geopoliticalBoard(4000 * 230)))
      .toEqual(JSON.stringify(geopoliticalBoard(4000 * 230 + 950)));
  });

  it('enforces defensive, internationally-lawful safeguards', () => {
    expect(GEOPOLITICAL_SAFEGUARDS.perCitizenData).toBe(false);
    expect(GEOPOLITICAL_SAFEGUARDS.internationallyLawful).toBe(true);
    expect(GEOPOLITICAL_SAFEGUARDS.defensiveOnly).toBe(true);
    for (const p of ['geopolitical-aggression', 'offensive-strategic-manipulation', 'unlawful-intelligence-aggregation', 'external-ideological-targeting', 'population-influence-operations']) {
      expect(GEOPOLITICAL_SAFEGUARDS.prohibited).toContain(p);
    }
    const { prohibited, ...rest } = geopoliticalBoard(4000 * 150);
    expect(prohibited.length).toBeGreaterThan(0);
    const json = JSON.stringify(rest).toLowerCase();
    for (const forbidden of ['offensive', 'aggression', 'conquest', 'ideolog', 'propaganda', 'espionage', 'coerc', 'influenceop']) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });

  it('models bounded strategic autonomy & cross-border propagation', () => {
    const b = geopoliticalBoard(4000 * 250);
    for (const v of Object.values(b.autonomy)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    for (const vec of b.vectors) expect(vec.magnitude).toBeGreaterThanOrEqual(0);
    expect(b.externalAmplification).toBeGreaterThanOrEqual(0);
    expect(b.externalAmplification).toBeLessThanOrEqual(60);
    expect(b.migration.length).toBeGreaterThan(0);
    for (const m of b.migration) {
      for (const v of [m.migrationPressure, m.humanitarianCapacity, m.borderContinuity, m.displacementStress]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('forecasts a full-horizon sovereignty trajectory + valid mode', () => {
    const b = geopoliticalBoard(4000 * 377);
    expect(b.sovereigntyTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.sovereigntyTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(['sovereign-stable', 'rising-external-pressure', 'dependency-exposure', 'regional-destabilization', 'migration-pressure', 'strategic-fragility', 'alliance-strain', 'strategic-recovery', 'restored-strategic-autonomy']).toContain(b.mode);
  });

  it('stabilization is lawful, advisory, never a prohibited action', () => {
    const b = geopoliticalBoard(4000 * 333);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(GEOPOLITICAL_SAFEGUARDS.prohibited as readonly string[]).not.toContain(s.kind);
    }
    for (const v of Object.values(b.globalShock)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
