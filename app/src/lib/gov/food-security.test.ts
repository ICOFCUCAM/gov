import { describe, it, expect } from 'vitest';
import { foodSecurityBoard } from './food-security';

describe('food security sovereign engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(foodSecurityBoard(4000 * 240)))
      .toEqual(JSON.stringify(foodSecurityBoard(4000 * 240 + 990)));
  });

  it('every region carries a shortage risk classification consistent with reserves', () => {
    for (const r of foodSecurityBoard(4000 * 333).command.regions) {
      const exp = r.reservesDays < 14 ? 'imminent' : r.reservesDays < 30 ? 'monitor' : 'none';
      expect(r.shortageRisk).toBe(exp);
      expect(r.productionIdx).toBeGreaterThanOrEqual(0);
      expect(r.productionIdx).toBeLessThanOrEqual(100);
    }
  });

  it('seasonal cycle advances deterministically through the four seasons', () => {
    const seasonsSeen = new Set<string>();
    for (let e = 0; e < 200; e++) seasonsSeen.add(foodSecurityBoard(e * 4000).currentSeason);
    expect(seasonsSeen.size).toBe(4);
  });

  it('every incident propagates to at least one other ministry', () => {
    for (const i of foodSecurityBoard(4000 * 412).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
    }
  });

  it('reservoirs reflect status thresholds and bounded fill', () => {
    for (const r of foodSecurityBoard(4000 * 401).reservoirs) {
      const exp = r.capacityFillPct < 30 ? 'emergency' : r.capacityFillPct < 50 ? 'rationing' : 'nominal';
      expect(r.status).toBe(exp);
      expect(r.capacityFillPct).toBeGreaterThanOrEqual(0);
      expect(r.capacityFillPct).toBeLessThanOrEqual(100);
    }
  });

  it('forecast carries aligned 6-week horizon arrays', () => {
    const f = foodSecurityBoard(4000 * 270).forecast;
    expect(f.horizonWeeks.length).toBe(6);
    expect(f.yieldOutlook.length).toBe(6);
    expect(f.droughtRisk.length).toBe(6);
    expect(f.scarcityRisk).toBeGreaterThanOrEqual(0);
    expect(f.scarcityRisk).toBeLessThanOrEqual(100);
  });
});
