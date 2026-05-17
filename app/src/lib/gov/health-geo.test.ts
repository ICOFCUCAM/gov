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
