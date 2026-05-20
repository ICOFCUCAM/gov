import { describe, it, expect } from 'vitest';
import { environmentalGovernanceBoard, ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS } from './environmental-governance';

describe('environmental governance & public continuity engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(environmentalGovernanceBoard(4000 * 270)))
      .toEqual(JSON.stringify(environmentalGovernanceBoard(4000 * 270 + 1390)));
  });

  it('water allocation status reflects withdrawal thresholds', () => {
    for (const w of environmentalGovernanceBoard(4000 * 322).resources.waterAllocations) {
      if (w.withdrawalPct > 110) expect(w.status).toBe('critical-depletion');
      else if (w.withdrawalPct > 95) expect(w.status).toBe('over-allocation');
      else if (w.withdrawalPct > 80) expect(w.status).toBe('observant');
      else expect(w.status).toBe('within-budget');
      expect(w.allocationMcm).toBeGreaterThan(0);
    }
  });

  it('extraction permits sorted ascending by compliance (weakest first); status valid', () => {
    const perms = environmentalGovernanceBoard(4000 * 411).resources.extractionPermits;
    for (let i = 1; i < perms.length; i++) {
      expect(perms[i - 1]!.complianceIdx).toBeLessThanOrEqual(perms[i]!.complianceIdx);
    }
    for (const p of perms) {
      expect(['active', 'review', 'suspended', 'revoked']).toContain(p.status);
      expect(['minerals', 'aggregates', 'groundwater', 'forestry', 'oil-gas']).toContain(p.resource);
    }
  });

  it('forestry posture follows the illegal logging & sustainability rules', () => {
    for (const f of environmentalGovernanceBoard(4000 * 488).resources.forestry) {
      if (f.illegalLoggingCases >= 12 || f.sustainableHarvestPct < 50) expect(f.posture).toBe('over-extraction');
      else if (f.sustainableHarvestPct < 70) expect(f.posture).toBe('pressured');
      else if (f.reforestationActiveK > 80) expect(f.posture).toBe('recovery');
      else expect(f.posture).toBe('managed');
    }
  });

  it('all 5 protection categories are represented', () => {
    const cats = environmentalGovernanceBoard(4000 * 277).resources.landProtections.map(l => l.category);
    expect(cats).toEqual(['national-park', 'nature-reserve', 'wildlife-corridor', 'wetland', 'marine-protected']);
  });

  it('coupling diagnostics carry valid classification and bounded tension', () => {
    for (const d of environmentalGovernanceBoard(4000 * 533).interdependency.diagnostics) {
      expect(d.tension).toBeGreaterThanOrEqual(0);
      expect(d.tension).toBeLessThanOrEqual(100);
      if (d.tension >= 78) expect(d.classification).toBe('overload');
      else if (d.tension >= 60) expect(d.classification).toBe('tightening');
      else if (d.tension >= 45) expect(d.classification).toBe('observant');
      else expect(d.classification).toBe('balanced');
    }
  });

  it('citizen incident reports sorted by recency; older reports resolve', () => {
    const reports = environmentalGovernanceBoard(4000 * 422).portal.reports;
    for (let i = 1; i < reports.length; i++) {
      expect(reports[i - 1]!.reportedHrsAgo).toBeLessThanOrEqual(reports[i]!.reportedHrsAgo);
    }
    for (const r of reports) {
      if (r.reportedHrsAgo > 96) expect(r.status).toBe('resolved');
      else if (r.reportedHrsAgo > 48) expect(r.status).toBe('investigating');
    }
  });

  it('all 5 permit categories tracked; portal uptime is high availability', () => {
    const b = environmentalGovernanceBoard(4000 * 305);
    const cats = b.portal.permits.map(p => p.category);
    expect(cats).toEqual(['environmental-impact', 'water-use', 'emissions', 'land-change', 'waste-disposal']);
    expect(b.portal.portalUptimePct).toBeGreaterThan(90);
    expect(b.portal.portalUptimePct).toBeLessThanOrEqual(100);
  });

  it('safeguards prohibit unilateral extraction and citizen-report silencing', () => {
    const b = environmentalGovernanceBoard(4000 * 244);
    expect(b.prohibited).toEqual(ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('unilateral-extraction-without-consent');
    expect(b.prohibited).toContain('silencing-of-citizen-reports');
    expect(b.prohibited).toContain('concealment-of-pollution-data');
  });
});
