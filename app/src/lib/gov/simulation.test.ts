import { describe, it, expect } from 'vitest';
import { simulate, scenarioFor, scenarioSweep, mitigationPlaybook, prioritisedThreats, SCENARIOS } from './simulation';

describe('sovereign state simulation engine', () => {
  it('baseline applies no shock', () => {
    const s = simulate('baseline', 100);
    expect(s.nationalReadinessDelta).toBe(0);
    expect(s.cascadeNodes).toBe(0);
    expect(s.timeline.length).toBeGreaterThan(0);
  });

  it('a severe scenario degrades readiness, hits epicentres hardest, is deterministic', () => {
    const a = simulate('energy-outage', 60);
    const b = simulate('energy-outage', 60);
    expect(a).toEqual(b);
    expect(a.nationalReadinessDelta).toBeLessThan(0);
    expect(a.cascadeNodes).toBeGreaterThan(0);
    // ENERGY is an epicentre → among the most-stressed
    const top = a.ministryImpact.slice(0, 3).map(m => m.archetype);
    expect(top).toContain('ENERGY');
  });

  it('every scenario yields bounded, ranked, coherent impact', () => {
    for (const sc of SCENARIOS) {
      const s = simulate(sc.key, 33);
      expect(s.scenario.key).toBe(sc.key);
      expect(s.civilUnrestProb).toBeGreaterThanOrEqual(0);
      expect(s.civilUnrestProb).toBeLessThanOrEqual(100);
      expect(s.constitutionalStress).toBeLessThanOrEqual(100);
      for (let i = 1; i < s.ministryImpact.length; i++) {
        expect(s.ministryImpact[i - 1]!.stress).toBeGreaterThanOrEqual(s.ministryImpact[i]!.stress);
      }
      expect(s.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('scenarioSweep ranks every non-baseline vector by bounded composite risk', () => {
    const sweep = scenarioSweep(50);
    expect(sweep.length).toBe(SCENARIOS.length - 1);
    expect(sweep.some(s => s.key === 'baseline')).toBe(false);
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i - 1]!.composite).toBeGreaterThanOrEqual(sweep[i]!.composite);
    }
    for (const r of sweep) {
      expect(r.composite).toBeGreaterThanOrEqual(0);
      expect(r.composite).toBeLessThanOrEqual(100);
      expect(['severe', 'high', 'elevated', 'contained']).toContain(r.band);
    }
    expect(scenarioSweep(50)).toEqual(sweep);
  });

  it('mitigationPlaybook reduces gross risk and stays coherent for every scenario', () => {
    for (const sc of SCENARIOS) {
      const pb = mitigationPlaybook(sc.key, 50);
      expect(pb.scenario.key).toBe(sc.key);
      expect(pb.residualRisk).toBeLessThanOrEqual(pb.grossRisk);
      expect(pb.residualRisk).toBeGreaterThanOrEqual(0);
      expect(pb.effectiveness).toBeGreaterThanOrEqual(0);
      expect(pb.effectiveness).toBeLessThanOrEqual(100);
      expect(pb.phases.length).toBeGreaterThan(0);
      for (const ph of pb.phases) expect(ph.actions.length).toBeGreaterThan(0);
    }
    expect(mitigationPlaybook('baseline', 50).grossRisk).toBe(0);
    const a = mitigationPlaybook('energy-outage', 70);
    expect(a).toEqual(mitigationPlaybook('energy-outage', 70));
    expect(a.grossRisk).toBeGreaterThan(0);
  });

  it('prioritisedThreats ranks by residual-weighted priority, deterministic & bounded', () => {
    const p = prioritisedThreats(50);
    expect(p.length).toBe(SCENARIOS.length - 1);
    for (let i = 1; i < p.length; i++) {
      expect(p[i - 1]!.priority).toBeGreaterThanOrEqual(p[i]!.priority);
    }
    for (const r of p) {
      expect(r.priority).toBeGreaterThanOrEqual(0);
      expect(r.residualRisk).toBeLessThanOrEqual(r.composite);
      expect(r.effectiveness).toBeGreaterThanOrEqual(0);
      expect(r.effectiveness).toBeLessThanOrEqual(100);
    }
    expect(prioritisedThreats(50)).toEqual(p);
  });

  it('scenarioFor falls back to baseline', () => {
    // @ts-expect-error unknown key
    expect(scenarioFor('nope').key).toBe('baseline');
  });
});
