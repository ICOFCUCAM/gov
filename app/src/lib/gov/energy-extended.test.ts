import { describe, it, expect } from 'vitest';
import { energyExtendedBoard, ENERGY_EXTENDED_SAFEGUARDS } from './energy-extended';

describe('energy extended — emergency / intelligence / portal', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(energyExtendedBoard(4000 * 280)))
      .toEqual(JSON.stringify(energyExtendedBoard(4000 * 280 + 1390)));
  });

  it('emergency posture reflects active major blackouts and total affected', () => {
    const b = energyExtendedBoard(4000 * 322);
    const activeMajor = b.emergency.blackouts.filter(x => x.populationAffectedK >= 400 && x.phase !== 'stabilised').length;
    const total = b.emergency.blackouts.reduce((s, x) => s + x.populationAffectedK, 0);
    if (activeMajor >= 2 || total >= 1800) expect(b.emergency.posture).toBe('national-recovery');
    else if (activeMajor >= 1 || total >= 800) expect(b.emergency.posture).toBe('major-restoration');
    else if (b.emergency.blackouts.some(x => x.phase !== 'stabilised')) expect(b.emergency.posture).toBe('engaged');
    else expect(b.emergency.posture).toBe('standby');
  });

  it('blackouts sorted by population affected desc; load restored bounded', () => {
    const arr = energyExtendedBoard(4000 * 411).emergency.blackouts;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.populationAffectedK).toBeGreaterThanOrEqual(arr[i]!.populationAffectedK);
    }
    for (const b of arr) {
      expect(b.loadRestoredPct).toBeGreaterThanOrEqual(0);
      expect(b.loadRestoredPct).toBeLessThanOrEqual(100);
      expect(['storm', 'equipment-failure', 'overload', 'cyber-incident', 'wildfire', 'cascading-trip', 'cold-snap']).toContain(b.cause);
    }
  });

  it('critical services on backup classify by remaining hours', () => {
    for (const s of energyExtendedBoard(4000 * 388).emergency.criticalServicesOnBackup) {
      if (s.backupHrsRemaining < 6) expect(s.status).toBe('critical');
      else if (s.backupHrsRemaining < 18) expect(s.status).toBe('low-fuel');
      else expect(s.status).toBe('fuel-ok');
    }
  });

  it('demand forecast spans 5 horizon points; bounded indices', () => {
    const d = energyExtendedBoard(4000 * 277).intelligence.demand;
    expect(d.horizonYears).toEqual([5, 10, 15, 20, 25]);
    expect(d.peakDemandTrajectoryGw.length).toBe(5);
    expect(d.renewableShareTrajectoryPct.length).toBe(5);
    expect(d.carbonIntensityTrajectory.length).toBe(5);
    expect(d.energyImportDependencyTrajectory.length).toBe(5);
    expect(d.gridResilienceTrajectory.length).toBe(5);
    expect(d.selfSufficiencyTrajectory.length).toBe(5);
  });

  it('climate risks sorted by composite desc; classification follows thresholds', () => {
    const arr = energyExtendedBoard(4000 * 533).intelligence.climateRisks;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.composite).toBeGreaterThanOrEqual(arr[i]!.composite);
    }
    for (const r of arr) {
      if (r.composite >= 70) expect(r.classification).toBe('severe');
      else if (r.composite >= 45) expect(r.classification).toBe('elevated');
      else if (r.composite >= 25) expect(r.classification).toBe('moderate');
      else expect(r.classification).toBe('low');
    }
  });

  it('cascading scenarios with deep + wide cascades classify as systemic', () => {
    for (const c of energyExtendedBoard(4000 * 444).intelligence.cascadingScenarios) {
      expect(['localised', 'regional', 'national', 'systemic']).toContain(c.impactSeverity);
      if (c.cascadeDepth >= 5 && c.affectedRegions >= 4) expect(c.impactSeverity).toBe('systemic');
    }
  });

  it('outages sorted by severity then recency; status progresses with hours', () => {
    const arr = energyExtendedBoard(4000 * 422).portal.outages;
    const sev = (s: typeof arr[number]['severity']) => s === 'critical' ? 2 : s === 'major' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.reportedHrsAgo).toBeLessThanOrEqual(cur.reportedHrsAgo);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
    }
  });

  it('all 6 permit categories tracked; safeguards prohibit critical-services blackout', () => {
    const b = energyExtendedBoard(4000 * 305);
    expect(b.portal.permits.map(p => p.category)).toEqual([
      'rooftop-solar', 'industrial-connection', 'ev-charger', 'biogas-microgrid', 'wind-turbine', 'storage-battery',
    ]);
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(90);
    expect(b.prohibited).toEqual(ENERGY_EXTENDED_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('critical-services-blackout-without-protocol');
    expect(b.prohibited).toContain('discriminatory-disconnection');
    expect(b.prohibited).toContain('concealment-of-grid-incidents');
  });
});
