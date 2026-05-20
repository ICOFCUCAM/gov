import { describe, it, expect } from 'vitest';
import { workforceContinuityBoard, WORKFORCE_SAFEGUARDS } from './workforce-continuity';

describe('workforce continuity & social protection engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(workforceContinuityBoard(4000 * 240)))
      .toEqual(JSON.stringify(workforceContinuityBoard(4000 * 240 + 1280)));
  });

  it('workforce posture is consistent with distressed regions and unemployment', () => {
    const b = workforceContinuityBoard(4000 * 311);
    const distressed = b.command.regions.filter(r => r.classification === 'distressed').length;
    const strained = b.command.regions.filter(r => r.classification === 'strained').length;
    const u = b.command.unemploymentPct;
    if (distressed >= 2 || u >= 18) expect(b.command.posture).toBe('crisis-mobilisation');
    else if (distressed >= 1 || u >= 12) expect(b.command.posture).toBe('strained');
    else if (strained >= 1 || u >= 8) expect(b.command.posture).toBe('tightening');
    else if (b.command.participationRatePct < 64) expect(b.command.posture).toBe('stable');
    else expect(b.command.posture).toBe('thriving');
  });

  it('each regional workforce carries a classification derived from hardship', () => {
    for (const r of workforceContinuityBoard(4000 * 401).command.regions) {
      if (r.hardshipIdx >= 72) expect(r.classification).toBe('distressed');
      else if (r.hardshipIdx >= 56) expect(r.classification).toBe('strained');
      else if (r.hardshipIdx >= 38) expect(r.classification).toBe('tightening');
      else if (r.hardshipIdx >= 22) expect(r.classification).toBe('stable');
      else expect(r.classification).toBe('thriving');
    }
  });

  it('benefits programmes status reflects fund coverage and payout thresholds', () => {
    for (const p of workforceContinuityBoard(4000 * 277).social.programmes) {
      if (p.fundCoverageMonths < 6 || p.payoutOnTimePct < 80) expect(p.status).toBe('stressed');
      else if (p.fundCoverageMonths < 18 || p.payoutOnTimePct < 88) expect(p.status).toBe('pressured');
      else if (p.fundCoverageMonths < 36) expect(p.status).toBe('observant');
      else expect(p.status).toBe('solvent');
      expect(['pension', 'unemployment', 'welfare', 'emergency-support', 'disability']).toContain(p.category);
    }
  });

  it('demographic cohorts span all 6 bands; youth carries the highest unemployment band by construction', () => {
    const d = workforceContinuityBoard(4000 * 333).demographics;
    expect(d.cohorts.length).toBe(6);
    expect(d.cohorts.map(c => c.band)).toEqual(['15-24', '25-34', '35-44', '45-54', '55-64', '65+']);
    expect(d.youthUnemploymentPct).toBe(d.cohorts[0]!.unemploymentPct);
  });

  it('regional hardship list is sorted descending by hardship index', () => {
    const list = workforceContinuityBoard(4000 * 422).pressure.regionalHardship;
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.hardshipIdx).toBeGreaterThanOrEqual(list[i]!.hardshipIdx);
    }
  });

  it('every incident propagates to at least one ministry with valid status', () => {
    for (const i of workforceContinuityBoard(4000 * 488).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['redeployment', 'reskilling', 'social-bridge', 'employment-program']).toContain(i.recoveryPathway);
      for (const c of i.ministryCascade) expect(['pending', 'engaged', 'cleared']).toContain(c.status);
    }
  });

  it('disputes sorted by workers affected; rights status set to alert raises the alert count', () => {
    const r = workforceContinuityBoard(4000 * 277).rights;
    for (let i = 1; i < r.disputes.length; i++) {
      expect(r.disputes[i - 1]!.workersAffectedK).toBeGreaterThanOrEqual(r.disputes[i]!.workersAffectedK);
    }
    const alerts = r.disputes.filter(d => d.rightsStatus === 'alert').length;
    expect(r.rightsAlertsRaised).toBe(alerts);
  });

  it('forecast horizon arrays align at 5 horizon points; safeguards prohibit forced labour', () => {
    const b = workforceContinuityBoard(4000 * 305);
    const f = b.forecast;
    expect(f.horizonYears.length).toBe(5);
    expect(f.employmentTrajectory.length).toBe(5);
    expect(f.participationTrajectory.length).toBe(5);
    expect(f.productivityTrajectory.length).toBe(5);
    expect(f.automationDisplacementTrajectory.length).toBe(5);
    expect(f.pensionSolvencyTrajectory.length).toBe(5);
    expect(f.systemicLaborRisk).toBeGreaterThanOrEqual(0);
    expect(f.systemicLaborRisk).toBeLessThanOrEqual(100);
    expect(b.prohibited).toEqual(WORKFORCE_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('forced-labor-practices');
    expect(b.prohibited).toContain('wage-theft-tolerance');
  });
});
