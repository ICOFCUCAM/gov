import { describe, it, expect } from 'vitest';
import { foreignAffairsExtendedBoard, FOREIGN_EXTENDED_SAFEGUARDS } from './foreign-affairs-extended';

describe('foreign affairs extended — intelligence / law / portal', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(foreignAffairsExtendedBoard(4000 * 280)))
      .toEqual(JSON.stringify(foreignAffairsExtendedBoard(4000 * 280 + 1410)));
  });

  it('geopolitical anomalies sorted by risk tier then recency', () => {
    const arr = foreignAffairsExtendedBoard(4000 * 322).intelligence.anomalies;
    const tier = (t: typeof arr[number]['riskTier']) => t === 'critical' ? 3 : t === 'urgent' ? 2 : t === 'elevated' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (tier(prev.riskTier) === tier(cur.riskTier)) expect(prev.detectedHrsAgo).toBeLessThanOrEqual(cur.detectedHrsAgo);
      else expect(tier(prev.riskTier)).toBeGreaterThanOrEqual(tier(cur.riskTier));
    }
    for (const a of arr) expect(['observation', 'elevated', 'urgent', 'critical']).toContain(a.riskTier);
  });

  it('conflict probabilities sorted descending; trajectory spikes when probability is high', () => {
    const arr = foreignAffairsExtendedBoard(4000 * 411).intelligence.conflictProbabilities;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.probability30dPct).toBeGreaterThanOrEqual(arr[i]!.probability30dPct);
    }
    for (const c of arr) {
      if (c.probability30dPct >= 50) expect(c.trajectory).toBe('spiking');
      expect(['cooling', 'stable', 'rising', 'spiking']).toContain(c.trajectory);
    }
  });

  it('strategic dependencies classify critical only under high dependency + low diversification', () => {
    for (const d of foreignAffairsExtendedBoard(4000 * 388).intelligence.strategicDependencies) {
      if (d.dependencyPct >= 60 && d.diversificationIdx < 50) expect(d.exposureClass).toBe('critical');
      else if (d.dependencyPct >= 40) expect(d.exposureClass).toBe('concentration');
      else if (d.dependencyPct >= 22) expect(d.exposureClass).toBe('moderate');
      else expect(d.exposureClass).toBe('low');
    }
  });

  it('disputes sorted by age in forum descending; all forums + stages valid', () => {
    const arr = foreignAffairsExtendedBoard(4000 * 277).law.disputes;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.ageInForum).toBeGreaterThanOrEqual(arr[i]!.ageInForum);
    }
    for (const d of arr) {
      expect(['bilateral', 'arbitration-tribunal', 'international-court', 'mediation']).toContain(d.forum);
      expect(['consultation', 'memorial', 'oral-hearings', 'deliberation', 'ruling-pending']).toContain(d.stage);
    }
  });

  it('treaty legality covers 7 treaties; international compliance is the mean integrity', () => {
    const b = foreignAffairsExtendedBoard(4000 * 533);
    expect(b.law.treatyLegality.length).toBe(7);
    const mean = Math.round(b.law.treatyLegality.reduce((s, t) => s + t.legalIntegrityIdx, 0) / b.law.treatyLegality.length);
    expect(b.law.internationalComplianceIdx).toBe(mean);
  });

  it('consular requests sorted by severity then recency; passport pipelines bounded', () => {
    const b = foreignAffairsExtendedBoard(4000 * 444);
    const reqs = b.portal.consularRequests;
    const sev = (s: typeof reqs[number]['severity']) => s === 'critical' ? 2 : s === 'urgent' ? 1 : 0;
    for (let i = 1; i < reqs.length; i++) {
      const prev = reqs[i - 1]!; const cur = reqs[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.hrsOpen).toBeLessThanOrEqual(cur.hrsOpen);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
    }
    for (const p of b.portal.passports) {
      expect(p.issuedToday).toBeLessThanOrEqual(p.applicationsToday);
      expect(p.medianTurnaroundDays).toBeGreaterThanOrEqual(1);
    }
  });

  it('travel advisory level escalates with tension; portal availability high', () => {
    const b = foreignAffairsExtendedBoard(4000 * 305);
    for (const a of b.portal.travelAdvisories) {
      expect(['normal', 'heightened-caution', 'reconsider-travel', 'do-not-travel']).toContain(a.level);
      if (a.level === 'normal') expect(a.reasonsActive).toBe(0);
    }
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(90);
  });

  it('safeguards prohibit breach of diplomatic immunity and foreign-election manipulation', () => {
    const b = foreignAffairsExtendedBoard(4000 * 244);
    expect(b.prohibited).toEqual(FOREIGN_EXTENDED_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('breach-of-diplomatic-immunity');
    expect(b.prohibited).toContain('manipulation-of-foreign-elections');
    expect(b.prohibited).toContain('denial-of-consular-access');
  });
});
