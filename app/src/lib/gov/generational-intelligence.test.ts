import { describe, it, expect } from 'vitest';
import { generationalBoard, ERA_COUNT } from './generational-intelligence';
import { SHELLS } from './national-causality';

describe('generational / civilizational continuity intelligence', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(generationalBoard(4000 * 180)))
      .toEqual(JSON.stringify(generationalBoard(4000 * 180 + 950)));
  });

  it('projects bounded multi-era continuity & durability', () => {
    const b = generationalBoard(4000 * 250);
    expect(b.continuityHealth.length).toBe(ERA_COUNT);
    expect(b.durability.length).toBe(ERA_COUNT);
    for (const h of b.continuityHealth) {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(100);
    }
    for (const d of b.durability) {
      for (const v of [d.emergencyNormalization, d.oversightStrength, d.judicialIndependence, d.separationResilience, d.concentrationDrift, d.authoritarianDriftRisk]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('models every shell as an aging institution with consistent state', () => {
    const b = generationalBoard(4000 * 320);
    expect(b.aging.length).toBe(SHELLS.length);
    for (const a of b.aging) {
      expect(a.ageYears).toBeGreaterThan(0);
      for (const v of [a.brittleness, a.sclerosis, a.adaptability]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      const exp = a.adaptability >= 60 ? 'adaptive' : a.adaptability >= 42 ? 'maturing' : a.adaptability >= 25 ? 'rigid' : 'sclerotic';
      expect(a.state).toBe(exp);
    }
  });

  it('demographic currents have a full-horizon bounded trajectory', () => {
    for (const d of generationalBoard(4000 * 401).demographics) {
      expect(d.trajectory.length).toBe(ERA_COUNT);
      for (const v of d.trajectory) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('civilization mode + memory valid; stabilization is advisory', () => {
    const b = generationalBoard(4000 * 377);
    expect(['resilient-continuity', 'adaptive-governance', 'institutional-aging', 'regional-divergence', 'constitutional-fatigue', 'corruption-normalization', 'continuity-degradation', 'democratic-recovery', 'restored-constitutional-resilience']).toContain(b.mode);
    expect(b.driftRiskNow).toBeGreaterThanOrEqual(0);
    expect(b.driftRiskHorizon).toBeLessThanOrEqual(100);
    expect(b.corruption.normalization.length).toBe(ERA_COUNT);
    expect(b.memory.longestStableRun).toBeGreaterThanOrEqual(0);
    for (const s of b.stabilization) expect(s.advisory).toBe(true);
  });
});
