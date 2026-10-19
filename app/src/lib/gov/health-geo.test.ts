import { describe, it, expect } from 'vitest';
import { healthGeo } from './health-geo';

describe('national health geospatial intelligence', () => {
  it('is deterministic and spatially bounded', () => {
    const a = healthGeo('MOH', 140);
    expect(a).toEqual(healthGeo('MOH', 140));
    expect(a.regions.length).toBe(6);
    expect(a.corridors.length).toBe(8);
    expect(a.assets.length).toBe(16);
    for (const r of a.regions) {
      expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x).toBeLessThanOrEqual(100);
      expect(r.y).toBeGreaterThanOrEqual(0); expect(r.y).toBeLessThanOrEqual(100);
      expect(['stable', 'elevated', 'critical']).toContain(r.escalation);
      expect(['ok', 'warn', 'alert']).toContain(r.tone);
    }
    for (const m of a.assets) {
      expect(m.x).toBeGreaterThanOrEqual(0); expect(m.x).toBeLessThanOrEqual(100);
      expect(m.y).toBeGreaterThanOrEqual(0); expect(m.y).toBeLessThanOrEqual(100);
      expect(['ambulance', 'supply']).toContain(m.kind);
    }
  });

  it('produces a quantified, bounded reroute directive', () => {
    const a = healthGeo('MOH', 90);
    expect(a.reroute.overloadProb).toBeGreaterThanOrEqual(0);
    expect(a.reroute.overloadProb).toBeLessThanOrEqual(1);
    expect(a.reroute.patients).toBeGreaterThanOrEqual(0);
    expect(a.reroute.windowMin).toBeGreaterThanOrEqual(8);
    expect(a.reroute.text.length).toBeGreaterThan(20);
    expect(['ok', 'warn', 'alert']).toContain(a.reroute.tone);
    if (a.reroute.active) {
      expect(a.reroute.fromRegion).not.toBe(a.reroute.toRegion);
      expect(a.reroute.patients).toBeGreaterThan(0);
    }
  });

  it('assets travel along corridors over time', () => {
    const t0 = healthGeo('MOH', 0);
    const t1 = healthGeo('MOH', 600);
    expect(t0.assets.some((m, i) => m.x !== t1.assets[i]!.x || m.y !== t1.assets[i]!.y)).toBe(true);
  });
});

describe('national health map for the installed nation', () => {
  it('has one entry per region of the nation, corridors between its regions, and samples over a window', async () => {
    const { applyNation } = await import('@/lib/nation/registry');
    const { healthGeoWindow } = await import('./health-geo');
    const regions = ['Mombasa', 'Kwale', 'Kilifi', 'Garissa', 'Nairobi City', 'Kisumu', 'Nakuru', 'Turkana', 'Marsabit'];
    applyNation({ iso3: 'KEN', regions, configured: true } as never);
    try {
      const g = healthGeo('MOH', 140);
      expect(g.regions.map(r => r.region)).toEqual(regions);
      const names = new Set(regions);
      expect(g.corridors.length).toBeGreaterThan(0);
      for (const c of g.corridors) { expect(names.has(c.from)).toBe(true); expect(names.has(c.to)).toBe(true); }
      // The hub is the capital's region (Nairobi), not the first in the list.
      expect(g.corridors.filter(c => c.from === 'Nairobi City').length).toBeGreaterThanOrEqual(7);
      for (const r of g.regions) {
        expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x).toBeLessThanOrEqual(100);
        expect(r.testPositivity).toBeGreaterThanOrEqual(0); expect(r.vaccinationGap).toBeLessThanOrEqual(100);
      }
      for (const m of g.assets) { expect(m.phase).toBeGreaterThanOrEqual(0); expect(m.phase).toBeLessThanOrEqual(1); }
      const y = healthGeoWindow('MOH', 140, '1Y');
      expect(y.regions.map(r => r.region)).toEqual(regions);
      expect(y.regions.some((r, i) => r.pressure !== g.regions[i]!.pressure)).toBe(true);
      expect(healthGeoWindow('MOH', 140, '7D')).toEqual(g);
    } finally {
      applyNation({ regions: [], configured: false } as never);
    }
  });
});
