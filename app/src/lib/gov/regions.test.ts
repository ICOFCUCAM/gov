import { describe, it, expect } from 'vitest';
import { nationalRegions, regionRollup, projectRegions } from './regions';

describe('national regional command model', () => {
  it('models every region with infra, domains and posture', () => {
    const rs = nationalRegions(120);
    expect(rs.length).toBe(6);
    for (const r of rs) {
      expect(r.infra.length).toBe(6);
      expect(r.domains.length).toBe(6);
      expect(r.readiness).toBeGreaterThanOrEqual(1);
      expect(r.readiness).toBeLessThanOrEqual(100);
      expect(['stable', 'watch', 'elevated', 'critical']).toContain(r.posture);
    }
  });

  it('the capital has no capital-dependency; regions do', () => {
    const rs = nationalRegions(60);
    const cap = rs.find(r => r.capital)!;
    expect(cap.capitalDependency).toBe(0);
    expect(rs.filter(r => !r.capital).every(r => r.capitalDependency > 0)).toBe(true);
  });

  it('rollup aggregates coherently and is deterministic', () => {
    const a = regionRollup(nationalRegions(90));
    const b = regionRollup(nationalRegions(90));
    expect(a).toEqual(b);
    expect(a.meanReadiness).toBeGreaterThanOrEqual(0);
    expect(a.meanReadiness).toBeLessThanOrEqual(100);
    expect(a.population).toBeGreaterThan(0);
  });

  it('readiness is the inverse of composite stress', () => {
    for (const r of nationalRegions(33)) expect(r.readiness).toBe(Math.max(1, 100 - r.composite));
  });

  it('baseline projection is a no-op; a shock only degrades and stays bounded & deterministic', () => {
    const flat = projectRegions('baseline', 80);
    expect(flat.every(r => r.readinessDelta === 0)).toBe(true);
    expect(flat.every(r => r.readiness === r.baseReadiness)).toBe(true);

    const a = projectRegions('energy-outage', 80);
    expect(a).toEqual(projectRegions('energy-outage', 80));
    for (const r of a) {
      expect(r.readinessDelta).toBeLessThanOrEqual(0);
      expect(r.readiness).toBeGreaterThanOrEqual(1);
      expect(r.readiness).toBeLessThanOrEqual(r.baseReadiness);
      expect(['stable', 'watch', 'elevated', 'critical']).toContain(r.projectedPosture);
    }
  });
});
