import { describe, it, expect } from 'vitest';
import { labourExtendedBoard, LABOUR_EXTENDED_SAFEGUARDS } from './labour-extended';

describe('labour extended — emergency / rights / portal', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(labourExtendedBoard(4000 * 280)))
      .toEqual(JSON.stringify(labourExtendedBoard(4000 * 280 + 1380)));
  });

  it('emergency posture reflects active major closures and aggregate displaced', () => {
    const b = labourExtendedBoard(4000 * 322);
    const activeMajor = b.emergency.closures.filter(c => c.workersDisplacedK >= 8 && c.phase !== 'closed').length;
    const total = b.emergency.totalDisplacedK;
    if (activeMajor >= 3 || total >= 80) expect(b.emergency.posture).toBe('national-mobilisation');
    else if (activeMajor >= 1 || total >= 30) expect(b.emergency.posture).toBe('major-displacement');
    else if (b.emergency.closures.some(c => c.phase !== 'closed')) expect(b.emergency.posture).toBe('engaged');
    else expect(b.emergency.posture).toBe('standby');
  });

  it('closures sorted by workers displaced desc; redeployment corridors carry distinct sectors', () => {
    const arr = labourExtendedBoard(4000 * 411).emergency.closures;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.workersDisplacedK).toBeGreaterThanOrEqual(arr[i]!.workersDisplacedK);
    }
    for (const c of labourExtendedBoard(4000 * 411).emergency.redeploymentCorridors) {
      expect(c.fromSector).not.toEqual(c.toSector);
      expect(['opening', 'active', 'congested', 'saturated']).toContain(c.status);
    }
  });

  it('inspection severity follows findings count threshold', () => {
    for (const i of labourExtendedBoard(4000 * 388).rights.inspections) {
      if (i.findings === 0) expect(i.severity).toBe('compliant');
      else if (i.findings >= 12) expect(i.severity).toBe('shutdown-order');
      else if (i.findings >= 6) expect(i.severity).toBe('major-findings');
      else expect(i.severity).toBe('minor-findings');
    }
  });

  it('inspections sort by severity then recency; fatalities surface first among incidents', () => {
    const arr = labourExtendedBoard(4000 * 277).rights.inspections;
    const sev = (s: typeof arr[number]['severity']) => s === 'shutdown-order' ? 3 : s === 'major-findings' ? 2 : s === 'minor-findings' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.daysSinceInspection).toBeLessThanOrEqual(cur.daysSinceInspection);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
    }
    const incidents = labourExtendedBoard(4000 * 277).rights.incidents;
    const firstFatalIdx = incidents.findIndex(i => i.kind === 'fatality');
    const firstNonFatalIdx = incidents.findIndex(i => i.kind !== 'fatality');
    if (firstFatalIdx !== -1 && firstNonFatalIdx !== -1) {
      expect(firstFatalIdx).toBeLessThan(firstNonFatalIdx);
    }
  });

  it('all 4 tribunal lanes covered with bounded win rate', () => {
    const lanes = labourExtendedBoard(4000 * 533).rights.tribunalLanes;
    expect(lanes.map(l => l.lane)).toEqual(['mediation', 'conciliation', 'arbitration', 'labour-court']);
    for (const l of lanes) {
      expect(l.workerWinRatePct).toBeGreaterThanOrEqual(0);
      expect(l.workerWinRatePct).toBeLessThanOrEqual(100);
    }
  });

  it('employment applications sort by days open asc; pension status progresses with days', () => {
    const apps = labourExtendedBoard(4000 * 444).portal.employmentApplications;
    for (let i = 1; i < apps.length; i++) {
      expect(apps[i - 1]!.daysOpen).toBeLessThanOrEqual(apps[i]!.daysOpen);
    }
    for (const p of labourExtendedBoard(4000 * 444).portal.pensionRequests) {
      if (p.daysOpen >= 50) expect(p.status).toBe('disbursed');
      else if (p.daysOpen >= 25) expect(p.status).toBe('approved');
      else if (p.daysOpen >= 7) expect(p.status).toBe('verifying');
      else expect(p.status).toBe('submitted');
    }
  });

  it('complaints sorted by severity then recency; wage-theft / unsafe / harassment auto-escalate', () => {
    const arr = labourExtendedBoard(4000 * 422).portal.complaints;
    const sev = (s: typeof arr[number]['severity']) => s === 'critical' ? 2 : s === 'serious' ? 1 : 0;
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1]!; const cur = arr[i]!;
      if (sev(prev.severity) === sev(cur.severity)) expect(prev.daysOpen).toBeLessThanOrEqual(cur.daysOpen);
      else expect(sev(prev.severity)).toBeGreaterThanOrEqual(sev(cur.severity));
    }
    for (const c of arr) {
      if (c.kind === 'wage-theft' || c.kind === 'unsafe-conditions' || c.kind === 'harassment') {
        expect(['serious', 'critical']).toContain(c.severity);
      }
    }
  });

  it('all 6 vocational programmes tracked; safeguards prohibit retaliatory termination', () => {
    const b = labourExtendedBoard(4000 * 305);
    expect(b.portal.vocationalEnrolments.map(v => v.programme)).toEqual([
      'apprenticeship', 'reskilling', 'upskilling', 'youth-pathway', 'returner-bridging', 'rural-vocational',
    ]);
    expect(b.portal.portalAvailabilityPct).toBeGreaterThan(90);
    expect(b.prohibited).toEqual(LABOUR_EXTENDED_SAFEGUARDS.prohibited);
    expect(b.prohibited).toContain('retaliatory-termination-for-complaint');
    expect(b.prohibited).toContain('wage-theft-tolerance');
    expect(b.prohibited).toContain('discriminatory-redeployment');
  });
});
