import { describe, it, expect } from 'vitest';
import { energyGridBoard } from './energy-grid';

describe('energy grid sovereign engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(energyGridBoard(4000 * 240)))
      .toEqual(JSON.stringify(energyGridBoard(4000 * 240 + 990)));
  });

  it('grid command is bounded and posture matches signals', () => {
    const b = energyGridBoard(4000 * 333);
    expect(b.command.regions.length).toBe(6);
    expect(b.command.blackoutPreventionPct).toBeGreaterThanOrEqual(0);
    expect(b.command.blackoutPreventionPct).toBeLessThanOrEqual(100);
    expect(['stable', 'engaged', 'strained', 'critical', 'blackout-watch']).toContain(b.command.posture);
    for (const r of b.command.regions) {
      expect(['none', 'monitor', 'imminent']).toContain(r.loadShedRisk);
      expect(r.demandGw).toBeGreaterThan(0);
    }
  });

  it('generation units have 5 sources and bounded output', () => {
    for (const g of energyGridBoard(4000 * 250).generation) {
      expect(g.outputPct).toBeGreaterThanOrEqual(0);
      expect(g.outputPct).toBeLessThanOrEqual(100);
      expect(g.outputGw).toBeGreaterThanOrEqual(0);
      expect(['live', 'scheduled', 'unscheduled']).toContain(g.maintenance);
    }
    expect(energyGridBoard(4000 * 250).generation.length).toBe(5);
  });

  it('strategic reserves expose days cover and geopolitical exposure', () => {
    for (const r of energyGridBoard(4000 * 401).reserves) {
      expect(r.daysCover).toBeGreaterThanOrEqual(0);
      expect(r.capacityFillPct).toBeGreaterThanOrEqual(0);
      expect(r.capacityFillPct).toBeLessThanOrEqual(100);
      expect(r.geopoliticalExposure).toBeGreaterThanOrEqual(0);
      expect(r.geopoliticalExposure).toBeLessThanOrEqual(100);
    }
  });

  it('every incident cascades to at least one other ministry', () => {
    for (const i of energyGridBoard(4000 * 377).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      for (const c of i.ministryCascade) {
        expect(['pending', 'engaged', 'cleared']).toContain(c.status);
      }
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
    }
  });

  it('forecast horizon has aligned demand / supply / weather arrays', () => {
    const f = energyGridBoard(4000 * 412).forecast;
    expect(f.horizonHrs.length).toBe(6);
    expect(f.demandGw.length).toBe(6);
    expect(f.supplyGw.length).toBe(6);
    expect(f.weatherStress.length).toBe(6);
    expect(f.cascadingFailureRisk).toBeGreaterThanOrEqual(0);
    expect(f.cascadingFailureRisk).toBeLessThanOrEqual(100);
  });
});
