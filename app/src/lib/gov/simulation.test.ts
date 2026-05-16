import { describe, it, expect } from 'vitest';
import { simulate, scenarioFor, SCENARIOS } from './simulation';

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

  it('scenarioFor falls back to baseline', () => {
    // @ts-expect-error unknown key
    expect(scenarioFor('nope').key).toBe('baseline');
  });
});
