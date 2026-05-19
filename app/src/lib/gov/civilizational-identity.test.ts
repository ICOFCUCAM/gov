import { describe, it, expect } from 'vitest';
import { civilizationalBoard, CIVIC_IDENTITY_SAFEGUARDS } from './civilizational-identity';
import { ERA_COUNT } from './generational-intelligence';

describe('constitutional cultural & civilizational continuity', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(civilizationalBoard(4000 * 210)))
      .toEqual(JSON.stringify(civilizationalBoard(4000 * 210 + 980)));
  });

  it('enforces pluralistic constitutional safeguards — no ethnic/ideological/identity classification', () => {
    expect(CIVIC_IDENTITY_SAFEGUARDS.perCitizenData).toBe(false);
    expect(CIVIC_IDENTITY_SAFEGUARDS.politicallyNeutral).toBe(true);
    expect(CIVIC_IDENTITY_SAFEGUARDS.pluralistic).toBe(true);
    for (const p of ['ethnic-classification', 'ideological-loyalty-scoring', 'religious-profiling', 'political-identity-targeting', 'forced-assimilation', 'identity-based-discrimination']) {
      expect(CIVIC_IDENTITY_SAFEGUARDS.prohibited).toContain(p);
    }
    // Serialized board (excluding the prohibition list, which legitimately
    // names the banned concepts) must contain no ethnic / religious /
    // ideological / political-identity / conformity fields.
    const { prohibited, ...rest } = civilizationalBoard(4000 * 150);
    expect(prohibited.length).toBeGreaterThan(0);
    const json = JSON.stringify(rest).toLowerCase();
    for (const forbidden of ['ethnic', 'religio', 'ideolog', 'loyalty', 'conformity', 'partisan', 'racial', 'creed']) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });

  it('models every region with bounded aggregate cultural resilience', () => {
    const b = civilizationalBoard(4000 * 250);
    expect(b.regions.length).toBe(6);
    for (const r of b.regions) {
      for (const v of [r.languageContinuity, r.culturalParticipation, r.heritageIntegrity, r.civicBelonging, r.culturalResilience]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(r.fragmentationZone).toBe(r.culturalResilience < 45 || r.civicBelonging < 40);
    }
    for (let i = 1; i < b.regions.length; i++) {
      expect(b.regions[i - 1]!.culturalResilience).toBeLessThanOrEqual(b.regions[i]!.culturalResilience);
    }
  });

  it('forecasts a full-horizon continuity trajectory + valid mode', () => {
    const b = civilizationalBoard(4000 * 377);
    expect(b.continuityTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.continuityTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(['cohesive-continuity', 'rising-fragmentation', 'regional-identity-imbalance', 'cultural-erosion', 'integration-pressure', 'continuity-fragility', 'cohesion-mobilization', 'civic-recovery', 'restored-pluralistic-continuity']).toContain(b.mode);
    expect(b.integration.length).toBe(6);
  });

  it('stabilization is lawful, advisory, never a prohibited action', () => {
    const b = civilizationalBoard(4000 * 333);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(CIVIC_IDENTITY_SAFEGUARDS.prohibited as readonly string[]).not.toContain(s.kind);
    }
  });
});
