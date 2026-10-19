import { describe, it, expect } from 'vitest';
import { afterEach } from 'vitest';
import { nationalRegions, regionRollup, projectRegions } from './regions';
import { applyNation } from '@/lib/nation/registry';

describe('national regional command model', () => {
  afterEach(() => applyNation({ configured: false }));

  it('models every one of the nation\'s regions, each once, the first as the seat of government', () => {
    const counties = Array.from({ length: 47 }, (_, i) => `County ${i + 1}`);
    applyNation({ configured: true, stateName: 'Meridia', regions: counties });
    const rs = nationalRegions(50);
    expect(rs.map(r => r.name)).toEqual(counties);
    expect(rs.filter(r => r.capital).map(r => r.name)).toEqual(['County 1']);
    applyNation({ configured: true, stateName: 'Meridia', regions: ['North', 'South', 'East', 'West', 'Capital'] });
    expect(new Set(nationalRegions(50).map(r => r.name)).size).toBe(5);
  });

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
