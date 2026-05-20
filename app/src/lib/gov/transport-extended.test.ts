import { describe, it, expect } from 'vitest';
import { transportExtendedBoard, TRANSPORT_EXTENDED_SAFEGUARDS } from './transport-extended';

describe('transport extended — emergency / intelligence / portal', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(transportExtendedBoard(4000 * 280)))
      .toEqual(JSON.stringify(transportExtendedBoard(4000 * 280 + 1430)));
  });

  it('emergency posture reflects active major failures and total disrupted', () => {
    const b = transportExtendedBoard(4000 * 322);
    const activeMajor = b.emergency.failures.filter(f => f.populationDisruptedK >= 200 && f.phase !== 'restored').length;
    const total = b.emergency.failures.reduce((s, f) => s + f.populationDisruptedK, 0);
    if (activeMajor >= 3 || total >= 1600) expect(b.emergency.posture).toBe('national-recovery');
    else if (activeMajor >= 1 || total >= 600) expect(b.emergency.posture).toBe('major-disruption');
    else if (b.emergency.failures.some(f => f.phase !== 'restored')) expect(b.emergency.posture).toBe('engaged');
    else expect(b.emergency.posture).toBe('standby');
  });

  it('failures sorted by population disrupted descending; mode + cause valid', () => {
    const arr = transportExtendedBoard(4000 * 411).emergency.failures;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.populationDisruptedK).toBeGreaterThanOrEqual(arr[i]!.populationDisruptedK);
    }
    for (const f of arr) {
      expect(['highway', 'rail', 'aviation', 'maritime', 'urban-transit', 'bridge-tunnel']).toContain(f.mode);
      expect(['flood', 'collapse', 'collision', 'wildfire', 'storm', 'subsidence', 'cyber-incident']).toContain(f.cause);
      expect(f.reroutedTrafficPctOfNormal).toBeGreaterThanOrEqual(0);
      expect(f.reroutedTrafficPctOfNormal).toBeLessThanOrEqual(100);
    }
  });

  it('evacuation corridor status follows utilisation thresholds', () => {
    for (const e of transportExtendedBoard(4000 * 388).emergency.evacuationCorridors) {
      if (e.utilisationPct >= 100) expect(e.status).toBe('capacity-pressured');
      else if (e.utilisationPct >= 70) expect(e.status).toBe('priority-lanes-open');
      else if (e.utilisationPct >= 20) expect(e.status).toBe('activated');
      else expect(e.status).toBe('closed');
      expect(e.modesActive.length).toBeGreaterThan(0);
    }
  });

  it('demand forecast spans 5 horizon points', () => {
    const d = transportExtendedBoard(4000 * 277).intelligence.demand;
    expect(d.horizonYears).toEqual([5, 10, 15, 20, 25]);
    expect(d.passengerKmTrajectory.length).toBe(5);
    expect(d.freightTonKmTrajectory.length).toBe(5);
    expect(d.electrificationShareTrajectory.length).toBe(5);
    expect(d.congestionIndexTrajectory.length).toBe(5);
    expect(d.infrastructureResilienceTrajectory.length).toBe(5);
  });

  it('climate risks sorted by composite desc; classification follows thresholds', () => {
    const arr = transportExtendedBoard(4000 * 533).intelligence.climateRisks;
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

  it('freight bottlenecks classify by utilisation and delay', () => {
    for (const f of transportExtendedBoard(4000 * 444).intelligence.bottlenecks) {
      if (f.utilisationPct >= 100 || f.averageDelayHrs >= 24) expect(f.classification).toBe('critical');
      else if (f.utilisationPct >= 85 || f.averageDelayHrs >= 12) expect(f.classification).toBe('congested');
      else if (f.utilisationPct >= 65) expect(f.classification).toBe('thinning');
      else expect(f.classification).toBe('flowing');
    }
  });

  it('mobility anomalies sorted by tier then recency; logistics requests sorted by cargo desc', () => {
    const b = transportExtendedBoard(4000 * 422);
    const arr = b.intelligence.anomalies;
    const t = (x: typeof arr[number]['tier']) => x === 'critical' ? 3 : x === 'urgent' ? 2 : x === 'elevated' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (t(prev.tier) === t(cur.tier)) expect(prev.detectedHrsAgo).toBeLessThanOrEqual(cur.detectedHrsAgo);
      else expect(t(prev.tier)).toBeGreaterThanOrEqual(t(cur.tier));
    }
    const reqs = b.portal.logisticsRequests;
    for (let i = 1; i < reqs.length; i++) {
      expect(reqs[i - 1]!.cargoTons).toBeGreaterThanOrEqual(reqs[i]!.cargoTons);
    }
  });

  it('all 6 transit modes + 6 permit categories tracked; safeguards prohibit discriminatory closure', () => {
    const b = transportExtendedBoard(4000 * 305);
    expect(b.portal.schedules.map(s => s.mode)).toEqual([
      'urban-rail', 'long-distance-rail', 'bus', 'ferry', 'aviation', 'tram-light-rail',
    ]);
    expect(b.portal.permits.map(p => p.category)).toEqual([
      'commercial-vehicle', 'oversize-cargo', 'hazardous-materials',
      'cross-border-freight', 'special-event-routing', 'aviation-charter',
    ]);
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(90);
    expect(b.prohibited).toEqual(TRANSPORT_EXTENDED_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('discriminatory-route-closure');
    expect(b.prohibited).toContain('denial-of-evacuation-priority');
    expect(b.prohibited).toContain('arbitrary-freight-detention');
  });
});
