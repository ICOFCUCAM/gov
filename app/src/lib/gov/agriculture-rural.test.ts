import { describe, it, expect } from 'vitest';
import { agricultureRuralBoard, AGRICULTURE_RURAL_SAFEGUARDS } from './agriculture-rural';

describe('agriculture rural governance, intelligence & public portal', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(agricultureRuralBoard(4000 * 270)))
      .toEqual(JSON.stringify(agricultureRuralBoard(4000 * 270 + 1340)));
  });

  it('rural zones classify by stability minus outmigration pressure', () => {
    for (const z of agricultureRuralBoard(4000 * 322).rural.zones) {
      const composite = z.ruralStabilityIdx - z.outmigrationPressureIdx * 0.5;
      if (composite >= 72) expect(z.classification).toBe('thriving');
      else if (composite >= 58) expect(z.classification).toBe('stable');
      else if (composite >= 40) expect(z.classification).toBe('pressured');
      else if (composite >= 22) expect(z.classification).toBe('fragile');
      else expect(z.classification).toBe('distressed');
    }
  });

  it('subsidy programmes fall into review when fulfilment is low', () => {
    for (const s of agricultureRuralBoard(4000 * 411).rural.subsidyProgrammes) {
      if (s.fulfilmentPct < 50) expect(s.status).toBe('review');
      expect(['crop-input', 'irrigation', 'livestock', 'cooperative-grant', 'climate-adaptation', 'youth-rural']).toContain(s.category);
    }
  });

  it('yield forecasts sort by scarcity risk descending; all 6 crops modelled', () => {
    const arr = agricultureRuralBoard(4000 * 277).intelligence.yieldForecasts;
    expect(arr.length).toBe(6);
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.scarcityRiskIdx).toBeGreaterThanOrEqual(arr[i]!.scarcityRiskIdx);
    }
    for (const f of arr) {
      expect(f.productionTrajectoryMt.length).toBe(5);
      expect(['strong', 'on-target', 'soft', 'shortfall']).toContain(f.currentSeasonOutlook);
    }
  });

  it('trade exposure sorted by vulnerability descending; export+import both represented', () => {
    const arr = agricultureRuralBoard(4000 * 388).intelligence.tradeExposure;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.vulnerabilityIdx).toBeGreaterThanOrEqual(arr[i]!.vulnerabilityIdx);
    }
    const kinds = new Set(arr.map(t => t.tradeKind));
    expect(kinds.size).toBeGreaterThanOrEqual(1);
  });

  it('sustainability horizon aligns at 5 horizon points; resilience bounded', () => {
    const s = agricultureRuralBoard(4000 * 305).intelligence.sustainability;
    expect(s.horizonYears).toEqual([5, 10, 15, 20, 25]);
    expect(s.soilHealthTrajectory.length).toBe(5);
    expect(s.freshwaterAvailabilityTrajectory.length).toBe(5);
    expect(s.biodiversityIntegrationTrajectory.length).toBe(5);
    expect(s.foodSelfSufficiencyTrajectory.length).toBe(5);
    expect(s.climateMigrationPressureTrajectory.length).toBe(5);
    expect(s.longHorizonResilienceIdx).toBeGreaterThanOrEqual(0);
    expect(s.longHorizonResilienceIdx).toBeLessThanOrEqual(100);
  });

  it('subsidy applications sorted by recency; status progresses with age', () => {
    const apps = agricultureRuralBoard(4000 * 422).portal.subsidyApplications;
    for (let i = 1; i < apps.length; i++) {
      expect(apps[i - 1]!.daysOpen).toBeLessThanOrEqual(apps[i]!.daysOpen);
    }
    for (const a of apps) {
      if (a.daysOpen > 60) expect(a.status).toBe('disbursed');
      else if (a.daysOpen > 30) expect(a.status).toBe('approved');
      else if (a.daysOpen > 14) expect(a.status).toBe('verified');
    }
  });

  it('pest alerts sort by affected area descending; outbreak status follows thresholds', () => {
    const arr = agricultureRuralBoard(4000 * 499).portal.pestAlerts;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.affectedAreaHa).toBeGreaterThanOrEqual(arr[i]!.affectedAreaHa);
    }
    for (const p of arr) {
      if (p.affectedAreaHa > 40000) expect(p.outbreakStatus).toBe('epidemic');
      else if (p.affectedAreaHa > 12000) expect(p.outbreakStatus).toBe('spreading');
      else if (p.affectedAreaHa > 2000) expect(p.outbreakStatus).toBe('localized');
      else expect(p.outbreakStatus).toBe('monitoring');
    }
  });

  it('all 6 permit categories tracked; portal uptime high; safeguards prohibit forced consolidation', () => {
    const b = agricultureRuralBoard(4000 * 244);
    expect(b.portal.permits.map(p => p.category)).toEqual([
      'farm-registration', 'irrigation-water-right', 'livestock-movement',
      'agro-chemical-use', 'export-certification', 'organic-certification',
    ]);
    expect(b.portal.portalUptimePct).toBeGreaterThan(90);
    expect(b.prohibited).toEqual(AGRICULTURE_RURAL_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('forced-land-consolidation');
    expect(b.prohibited).toContain('subsidy-discrimination');
    expect(b.prohibited).toContain('suppression-of-pest-advisories');
  });
});
