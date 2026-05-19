import { describe, it, expect } from 'vitest';
import { civicBoard, ETHICAL_GUARDRAILS } from './civic-legitimacy';
import { ERA_COUNT } from './generational-intelligence';

describe('civic stability & democratic legitimacy', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(civicBoard(4000 * 190)))
      .toEqual(JSON.stringify(civicBoard(4000 * 190 + 990)));
  });

  it('enforces hard ethical guardrails — aggregate only, no scoring/ideology', () => {
    expect(ETHICAL_GUARDRAILS.perCitizenData).toBe(false);
    expect(ETHICAL_GUARDRAILS.politicallyNeutral).toBe(true);
    expect(ETHICAL_GUARDRAILS.scope).toBe('institutional-aggregate-only');
    for (const p of ['citizen-loyalty-scoring', 'ideological-classification', 'predictive-political-targeting', 'dissent-suppression', 'election-influence']) {
      expect(ETHICAL_GUARDRAILS.prohibited).toContain(p);
    }
    // The board must never serialize citizen-level / ideological / political
    // fields. (The prohibition list itself legitimately names the banned
    // concepts, so it is excluded from the content scan.)
    const { prohibitedActionsBlocked, ...rest } = civicBoard(4000 * 140);
    expect(prohibitedActionsBlocked.length).toBeGreaterThan(0);
    const json = JSON.stringify(rest).toLowerCase();
    for (const forbidden of ['ideolog', 'loyalty', 'politicalview', 'citizenscore', 'partisan', 'sentiment']) {
      expect(json.includes(forbidden)).toBe(false);
    }
    expect(civicBoard(4000 * 140).prohibitedActionsBlocked.length).toBeGreaterThan(0);
  });

  it('produces bounded aggregate trust, fairness and rights perception', () => {
    const b = civicBoard(4000 * 250);
    for (const v of [b.trustIndex, b.fairnessContinuity, b.civicFatigue, b.regionalImbalance]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of Object.values(b.rights)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(b.regions.length).toBeGreaterThan(0);
    for (const r of b.regions) {
      expect(r.trust).toBeGreaterThanOrEqual(0);
      expect(r.trust).toBeLessThanOrEqual(100);
      expect(r.fractureZone).toBe(r.trust < 42 || r.fatigue > 72);
    }
  });

  it('forecasts a full-horizon legitimacy trajectory', () => {
    const b = civicBoard(4000 * 401);
    expect(b.legitimacyTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.legitimacyTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('mode valid and every stabilization action is lawful + advisory', () => {
    const b = civicBoard(4000 * 377);
    expect(['legitimate-stable', 'trust-eroding', 'procedural-distrust', 'civic-fatigue', 'legitimacy-fracture', 'cohesion-divergence', 'democratic-recovery', 'restored-legitimacy']).toContain(b.mode);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      // lawful civic stabilization only — never a prohibited action
      expect(ETHICAL_GUARDRAILS.prohibited as readonly string[]).not.toContain(s.kind);
    }
  });
});
