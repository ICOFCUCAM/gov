import { describe, it, expect } from 'vitest';
import { climateResilienceBoard, CLIMATE_RESILIENCE_SAFEGUARDS, ECOREGIONS } from './climate-resilience';

describe('climate resilience & ecological continuity engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(climateResilienceBoard(4000 * 280)))
      .toEqual(JSON.stringify(climateResilienceBoard(4000 * 280 + 1450)));
  });

  it('climate posture is consistent with tipping ecoregions and risk index', () => {
    const b = climateResilienceBoard(4000 * 320);
    const tipping = b.command.ecoregions.filter(x => x.classification === 'tipping').length;
    const critical = b.command.ecoregions.filter(x => x.classification === 'critical').length;
    const r = b.command.climateRiskPostureIdx;
    if (tipping >= 1 || r < 45) expect(b.command.posture).toBe('crisis-coordination');
    else if (critical >= 2 || r < 60) expect(b.command.posture).toBe('stressed');
    else if (critical >= 1 || r < 72) expect(b.command.posture).toBe('engaged');
    else if (r < 84) expect(b.command.posture).toBe('observant');
    else expect(b.command.posture).toBe('stable');
  });

  it('every ecoregion carries a composite stress reflecting its four pressures', () => {
    for (const er of climateResilienceBoard(4000 * 411).command.ecoregions) {
      const composite = Math.round((er.thermalStressIdx + er.hydroStressIdx + er.biodiversityPressureIdx + er.pollutionPressureIdx) / 4);
      expect(er.compositeStress).toBe(composite);
      expect(['stable', 'observant', 'stressed', 'critical', 'tipping']).toContain(er.classification);
    }
    expect(ECOREGIONS.length).toBe(6);
  });

  it('protected regions degrade when integrity or ranger coverage is low', () => {
    for (const p of climateResilienceBoard(4000 * 277).biosphere.protectedRegions) {
      if (p.integrityPct < 60 || p.rangerCoverage < 50) expect(p.status).toBe('degrading');
      expect(p.hectaresK).toBeGreaterThan(0);
      expect(p.speciesUnderProtection).toBeGreaterThan(0);
    }
  });

  it('atmospheric event severity is one of advisory/watch/warning/emergency', () => {
    for (const e of climateResilienceBoard(4000 * 333).atmosphere.activeEvents) {
      expect(['advisory', 'watch', 'warning', 'emergency']).toContain(e.severity);
      expect(['heatwave', 'cold-snap', 'severe-storm', 'wind-event', 'air-quality-spike', 'pollen-surge']).toContain(e.kind);
    }
  });

  it('river basin status reflects flow and contamination thresholds', () => {
    for (const r of climateResilienceBoard(4000 * 388).rivers) {
      if (r.contaminationIdx >= 50) expect(r.status).toBe('contaminated');
      else if (r.flowIdx < 50) expect(r.status).toBe('stressed');
      else if (r.flowIdx < 75) expect(r.status).toBe('thinning');
      else expect(r.status).toBe('healthy');
    }
  });

  it('every climate incident propagates to at least one ministry with valid status', () => {
    for (const i of climateResilienceBoard(4000 * 510).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['emergency-response', 'evacuation-relief', 'remediation', 'restoration']).toContain(i.recoveryPathway);
      for (const c of i.ministryCascade) expect(['pending', 'engaged', 'cleared']).toContain(c.status);
    }
  });

  it('pollution emitter shares are sorted descending', () => {
    const arr = climateResilienceBoard(4000 * 422).pollution.topEmitters;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.sharePct).toBeGreaterThanOrEqual(arr[i]!.sharePct);
    }
  });

  it('forecast horizon arrays align at 5 horizon points; safeguards prohibit ecological exploitation', () => {
    const b = climateResilienceBoard(4000 * 305);
    const f = b.forecast;
    expect(f.horizonYears.length).toBe(5);
    expect(f.temperatureAnomalyTrajectory.length).toBe(5);
    expect(f.biodiversityTrajectory.length).toBe(5);
    expect(f.forestCoverTrajectory.length).toBe(5);
    expect(f.waterStressTrajectory.length).toBe(5);
    expect(f.carbonContinuityTrajectory.length).toBe(5);
    expect(f.planetaryResilienceIdx).toBeGreaterThanOrEqual(0);
    expect(f.planetaryResilienceIdx).toBeLessThanOrEqual(100);
    expect(f.ecosystemCollapseRisk).toBeGreaterThanOrEqual(0);
    expect(f.ecosystemCollapseRisk).toBeLessThanOrEqual(100);
    expect(b.prohibited).toEqual(CLIMATE_RESILIENCE_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('ecological-exploitation');
    expect(b.prohibited).toContain('climate-data-suppression');
  });
});
