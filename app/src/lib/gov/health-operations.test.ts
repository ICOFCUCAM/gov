import { describe, it, expect } from 'vitest';
import {
  pharmaceuticalSupply, laboratoryNetwork, healthFinance,
  healthRegulatory, emergencyMedical, healthCommand, laboratoryExecution,
  doctorClinicalExecution, hospitalDeepExecution, pharmaceuticalDeepExecution,
  patientDeepExecution, emergencyIncidentExecution,
} from './health-operations';

describe('ministry of health operations engine', () => {
  it('all domains deterministic & bounded', () => {
    const ph = pharmaceuticalSupply('MOH', 50);
    expect(ph).toEqual(pharmaceuticalSupply('MOH', 50));
    expect(ph.drugs.length).toBe(8);
    expect(ph.drugs.every(d => ['ok', 'warn', 'alert'].includes(d.tone))).toBe(true);

    const lb = laboratoryNetwork('MOH', 50);
    expect(lb.byDiscipline.length).toBe(5);
    expect(lb.syncIntegrityPct).toBeLessThanOrEqual(100);

    const hf = healthFinance('MOH', 50);
    expect(hf.insuranceCoveragePct).toBeLessThanOrEqual(100);
    expect(hf.claimsSlaMetPct).toBeLessThanOrEqual(100);

    const rg = healthRegulatory('MOH', 50);
    expect(rg.compliancePct).toBeLessThanOrEqual(100);

    const em = emergencyMedical('MOH', 50);
    expect(em.ambulancesAvailable).toBeLessThanOrEqual(em.ambulanceFleet);
    expect(['standby', 'elevated', 'major']).toContain(em.disasterPosture);

    const hc = healthCommand('MOH', 50, 3);
    expect(hc.posture).toBe('elevated');
    expect(hc.regionalEscalations.length).toBe(6);
    expect(hc.logisticsCorridorsOpen).toBeLessThanOrEqual(hc.logisticsCorridorsTotal);
    expect(healthCommand('MOH', 50, 0).posture).toBe('nominal');
    expect(healthCommand('MOH', 50, 5).posture).toBe('crisis');
  });

  it('laboratoryExecution is a deterministic, bounded deep execution system', () => {
    const a = laboratoryExecution('MOH', 120);
    expect(a).toEqual(laboratoryExecution('MOH', 120));
    expect(a.pipeline.length).toBe(6);
    expect(a.pipeline[0]!.stage).toBe('Collected');
    expect(a.pipeline.at(-1)!.stage).toBe('Reported');
    expect(a.queues.length).toBe(3);
    expect(a.queues.map(q => q.priority)).toEqual(['STAT', 'Urgent', 'Routine']);
    expect(a.outbreaks.length).toBe(6);
    for (let i = 1; i < a.outbreaks.length; i++) {
      expect(a.outbreaks[i - 1]!.positivityPct).toBeGreaterThanOrEqual(a.outbreaks[i]!.positivityPct);
    }
    expect(['nominal', 'regional', 'national']).toContain(a.escalationLevel);
    expect(['steady', 'strained', 'crisis']).toContain(a.posture);
    expect(a.criticalUnacked).toBe(a.criticalAlerts.filter(x => !x.acknowledged).length);
    expect(a.slaBreaches).toBe(a.queues.reduce((s, q) => s + q.breaching, 0));
    for (const q of a.queues) {
      expect(q.breaching).toBeGreaterThanOrEqual(0);
      expect(q.breaching).toBeLessThanOrEqual(q.depth);
      expect(['ok', 'warn', 'alert']).toContain(q.tone);
    }
    expect(a.timeline.length).toBeGreaterThan(3);
  });

  it('doctorClinicalExecution is a deterministic, bounded clinical execution system', () => {
    const a = doctorClinicalExecution('MOH', 130);
    expect(a).toEqual(doctorClinicalExecution('MOH', 130));
    expect(a.shift.length).toBe(6);
    expect(a.assignments.length).toBe(8);
    expect(a.lanes.map(l => l.stage)).toEqual(['Triage', 'Diagnosis', 'Treatment', 'Disposition']);
    expect(['steady', 'strained', 'crisis']).toContain(a.posture);
    expect(a.unassigned).toBe(a.assignments.filter(x => !x.assignedTo).length);
    // assignment board triage-ordered (acute first)
    for (let i = 1; i < a.assignments.length; i++) {
      expect(a.assignments[i - 1]!.triage).toBeLessThanOrEqual(a.assignments[i]!.triage);
    }
    for (const s of a.shift) {
      expect(s.onDuty).toBeGreaterThanOrEqual(1);
      expect(s.utilisationPct).toBeGreaterThanOrEqual(0);
      expect(s.utilisationPct).toBeLessThanOrEqual(100);
      expect(['ok', 'warn', 'alert']).toContain(s.tone);
    }
    for (const c of a.codes) expect(['dispatched', 'on-scene', 'stabilising']).toContain(c.status);
    expect(a.nextShiftGap).toBeGreaterThanOrEqual(0);
  });

  it('hospitalDeepExecution is a deterministic, bounded hospital execution system', () => {
    const a = hospitalDeepExecution('MOH', 140);
    expect(a).toEqual(hospitalDeepExecution('MOH', 140));
    expect(a.regions.length).toBe(6);
    expect(a.icu.length).toBe(4);
    expect(a.theatres.length).toBe(8);
    expect(a.ambulanceZones.length).toBe(5);
    expect(['steady', 'strained', 'crisis']).toContain(a.posture);
    expect(a.nationalBedHeadroomPct).toBeGreaterThanOrEqual(0);
    expect(a.nationalBedHeadroomPct).toBeLessThanOrEqual(100);
    // regions ICU-occupancy ordered (worst first)
    for (let i = 1; i < a.regions.length; i++) {
      expect(a.regions[i - 1]!.icuOccPct).toBeGreaterThanOrEqual(a.regions[i]!.icuOccPct);
    }
    for (const u of a.icu) {
      expect(u.occupied).toBeLessThanOrEqual(u.beds + 2);
      expect(['stable', 'stretched', 'critical']).toContain(u.escalation);
    }
    for (const z of a.ambulanceZones) {
      expect(z.available).toBeLessThanOrEqual(z.units);
      expect(['covered', 'thin', 'critical']).toContain(z.posture);
    }
    expect(a.transferRequests).toBe(a.regions.reduce((s, r) => s + r.transfersPending, 0));
  });

  it('pharmaceuticalDeepExecution is a deterministic, bounded supply execution system', () => {
    const a = pharmaceuticalDeepExecution('MOH', 160);
    expect(a).toEqual(pharmaceuticalDeepExecution('MOH', 160));
    expect(a.inventory.length).toBe(8);
    expect(a.regions.length).toBe(6);
    expect(a.procurement.map(p => p.stage)).toEqual(['Requisition', 'Tender', 'Awarded', 'In transit', 'Received']);
    expect(['secure', 'strained', 'shortage']).toContain(a.posture);
    // inventory worst-cover first; regions worst-fill first
    for (let i = 1; i < a.inventory.length; i++) {
      expect(a.inventory[i - 1]!.coverDays).toBeLessThanOrEqual(a.inventory[i]!.coverDays);
    }
    for (let i = 1; i < a.regions.length; i++) {
      expect(a.regions[i - 1]!.fillRatePct).toBeLessThanOrEqual(a.regions[i]!.fillRatePct);
    }
    for (const d of a.inventory) expect(['ok', 'reorder', 'critical', 'stockout']).toContain(d.status);
    for (const o of a.redistribution) expect(['proposed', 'authorised', 'in-transit']).toContain(o.status);
    expect(a.emergencyOrders).toBe(a.redistribution.filter(o => o.status === 'proposed').length);
  });

  it('patientDeepExecution is a deterministic, bounded citizen-health execution system', () => {
    const a = patientDeepExecution('MOH', 175);
    expect(a).toEqual(patientDeepExecution('MOH', 175));
    expect(a.intake.length).toBe(9);
    expect(a.rx.length).toBe(5);
    expect(a.vaccination.length).toBe(5);
    expect(['steady', 'strained', 'crisis']).toContain(a.posture);
    expect(a.recordsIntegrityPct).toBeGreaterThanOrEqual(0);
    expect(a.recordsIntegrityPct).toBeLessThanOrEqual(100);
    // intake triage-ordered; vaccination worst-coverage first
    for (let i = 1; i < a.intake.length; i++) {
      expect(a.intake[i - 1]!.triage).toBeLessThanOrEqual(a.intake[i]!.triage);
    }
    for (let i = 1; i < a.vaccination.length; i++) {
      expect(a.vaccination[i - 1]!.coveragePct).toBeLessThanOrEqual(a.vaccination[i]!.coveragePct);
    }
    for (const r of a.intake) expect(['registration', 'triage', 'clinician', 'admitted']).toContain(r.stage);
    for (const e of a.emergencyStatuses) expect(['critical', 'admitted', 'observation']).toContain(e.status);
    expect(a.unrouted).toBe(a.intake.filter(r => r.stage === 'registration' || r.stage === 'triage').length);
  });

  it('emergencyIncidentExecution is a deterministic master/detail incident system', () => {
    const a = emergencyIncidentExecution('MOH', 145);
    expect(a).toEqual(emergencyIncidentExecution('MOH', 145));
    expect(a.incidents.length).toBeGreaterThanOrEqual(6);
    expect(['steady', 'surge', 'mci']).toContain(a.posture);
    // severity-ordered (immediate first)
    for (let i = 1; i < a.incidents.length; i++) {
      expect(a.incidents[i - 1]!.severity).toBeLessThanOrEqual(a.incidents[i]!.severity);
    }
    for (const x of a.incidents) {
      expect(['Received', 'Dispatched', 'On scene', 'Transporting', 'Cleared']).toContain(x.stage);
      expect([1, 2, 3]).toContain(x.severity);
      expect(x.responders.length).toBeGreaterThanOrEqual(1);
      expect(x.escalation.length).toBe(4);
      expect(x.escalation.some(e => e.reached)).toBe(true);
      expect(x.recommended.length).toBeGreaterThan(3);
      expect(x.timeline.length).toBeGreaterThan(2);
    }
    expect(a.immediate).toBe(a.incidents.filter(x => x.severity === 1 && x.stage !== 'Cleared').length);
    expect(a.unitsCommitted).toBe(a.incidents.reduce((s, x) => s + x.responders.length, 0));
  });
});
