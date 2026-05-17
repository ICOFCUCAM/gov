import { describe, it, expect } from 'vitest';
import {
  pharmaceuticalSupply, laboratoryNetwork, healthFinance,
  healthRegulatory, emergencyMedical, healthCommand, laboratoryExecution,
  doctorClinicalExecution, hospitalDeepExecution, pharmaceuticalDeepExecution,
  patientDeepExecution, emergencyIncidentExecution, diseaseEpidemiology,
  healthFinanceExecution, healthRegulatoryExecution, nationalSituation, nationalHealthcareGrid, citizenHealthPortal, nationalInteroperability, healthSimulation, sovereignSecurity,
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

  it('diseaseEpidemiology is a deterministic, bounded epidemiology engine', () => {
    const a = diseaseEpidemiology('MOH', 155);
    expect(a).toEqual(diseaseEpidemiology('MOH', 155));
    expect(a.pathogens.length).toBe(6);
    expect(a.grid.length).toBe(18); // 6 regions × 3 pathogens
    expect(a.spread.map(s => s.tPlusDays)).toEqual([0, 7, 14, 21, 30]);
    expect(a.scenarios.length).toBe(4);
    expect(['surveillance', 'response', 'epidemic']).toContain(a.posture);
    // Rt-ordered; scenarios monotonically reduce peak
    for (let i = 1; i < a.pathogens.length; i++) {
      expect(a.pathogens[i - 1]!.rt).toBeGreaterThanOrEqual(a.pathogens[i]!.rt);
    }
    for (let i = 1; i < a.scenarios.length; i++) {
      expect(a.scenarios[i]!.peakCases).toBeLessThanOrEqual(a.scenarios[i - 1]!.peakCases);
      expect(a.scenarios[i]!.reductionPct).toBeGreaterThanOrEqual(a.scenarios[i - 1]!.reductionPct);
    }
    for (const p of a.pathogens) {
      expect(['sporadic', 'cluster', 'epidemic']).toContain(p.phase);
      expect(p.rt).toBeGreaterThanOrEqual(0);
    }
    for (const s of a.spread) {
      expect(s.lower).toBeLessThanOrEqual(s.projected);
      expect(s.upper).toBeGreaterThanOrEqual(s.projected);
    }
  });

  it('healthFinanceExecution is a deterministic, bounded fiscal execution system', () => {
    const a = healthFinanceExecution('MOH', 165);
    expect(a).toEqual(healthFinanceExecution('MOH', 165));
    expect(a.claims.map(c => c.stage)).toEqual(['Submitted', 'Adjudication', 'Approved', 'Paid', 'Denied']);
    expect(a.schemes.length).toBe(5);
    expect(a.reimbursement.length).toBe(4);
    expect(['solvent', 'strained', 'distressed']).toContain(a.posture);
    // schemes claims-ratio ordered; fraud exposure ordered
    for (let i = 1; i < a.schemes.length; i++) {
      expect(a.schemes[i - 1]!.claimsRatioPct).toBeGreaterThanOrEqual(a.schemes[i]!.claimsRatioPct);
    }
    for (let i = 1; i < a.fraud.length; i++) {
      expect(a.fraud[i - 1]!.exposureM).toBeGreaterThanOrEqual(a.fraud[i]!.exposureM);
    }
    for (const s of a.schemes) expect(['solvent', 'pressured', 'deficit']).toContain(s.solvency);
    for (const f of a.fraud) expect(['flagged', 'investigating', 'referred']).toContain(f.status);
    expect(a.fraudExposureM).toBe(a.fraud.reduce((s, f) => s + f.exposureM, 0));
  });

  it('healthRegulatoryExecution is a deterministic, bounded regulatory execution system', () => {
    const a = healthRegulatoryExecution('MOH', 175);
    expect(a).toEqual(healthRegulatoryExecution('MOH', 175));
    expect(a.licensing.map(l => l.stage)).toEqual(['Application', 'Review', 'Inspection', 'Granted', 'Refused']);
    expect(a.accreditation.length).toBe(4);
    expect(a.registry.length).toBe(5);
    expect(['compliant', 'watch', 'breach']).toContain(a.posture);
    expect(a.compliancePct).toBeGreaterThanOrEqual(0);
    expect(a.compliancePct).toBeLessThanOrEqual(100);
    const rank = { critical: 0, serious: 1, minor: 2 } as const;
    for (let i = 1; i < a.enforcement.length; i++) {
      expect(rank[a.enforcement[i - 1]!.severity]).toBeLessThanOrEqual(rank[a.enforcement[i]!.severity]);
    }
    for (const e of a.enforcement) expect(['notice', 'hearing', 'sanctioned']).toContain(e.stage);
    expect(a.criticalBreaches).toBe(a.enforcement.filter(e => e.severity === 'critical').length);
  });

  it('nationalSituation fuses subsystems into a deterministic command picture', () => {
    const a = nationalSituation('MOH', 150);
    expect(a).toEqual(nationalSituation('MOH', 150));
    expect(a.regions.length).toBe(6);
    expect(['steady', 'elevated', 'crisis']).toContain(a.posture);
    expect(['normal', 'watch', 'emergency', 'national-disaster']).toContain(a.disasterState);
    // composite-ordered (worst region first)
    for (let i = 1; i < a.regions.length; i++) {
      expect(a.regions[i - 1]!.composite).toBeGreaterThanOrEqual(a.regions[i]!.composite);
    }
    for (const r of a.regions) {
      expect(r.composite).toBeGreaterThanOrEqual(0);
      expect(r.composite).toBeLessThanOrEqual(100);
      expect(['stable', 'elevated', 'critical']).toContain(r.state);
    }
    expect(a.worstRegion).toBe(a.regions[0]!.region);
    expect(a.headline.length).toBeGreaterThan(10);
  });

  it('nationalHealthcareGrid is deterministic & bounded', () => {
    const a = nationalHealthcareGrid('MOH', 140);
    expect(a).toEqual(nationalHealthcareGrid('MOH', 140));
    expect(a.classes.length).toBe(7);
    expect(a.regions.length).toBe(6);
    expect(['operational','degraded','critical']).toContain(a.posture);
    expect(a.onlinePct).toBeGreaterThanOrEqual(0);
    expect(a.onlinePct).toBeLessThanOrEqual(100);
    for (const c of a.classes) { expect(c.online).toBeLessThanOrEqual(c.total); expect(['ok','warn','alert']).toContain(c.tone); }
    for (let i = 1; i < a.regions.length; i++) expect(a.regions[i - 1]!.onlinePct).toBeLessThanOrEqual(a.regions[i]!.onlinePct);
  });

  it('citizenHealthPortal is deterministic & bounded', () => {
    const a = citizenHealthPortal('MOH', 130);
    expect(a).toEqual(citizenHealthPortal('MOH', 130));
    expect(['healthy','attention','at-risk']).toContain(a.posture);
    expect(['low','moderate','elevated']).toContain(a.riskBand);
    expect(a.healthScore).toBeGreaterThanOrEqual(0);
    expect(a.healthScore).toBeLessThanOrEqual(100);
    expect(a.timeline.length).toBeGreaterThan(3);
    expect(a.prescriptions.length).toBe(3);
    expect(a.aiGuidance.length).toBeGreaterThan(2);
    for (const p of a.prescriptions) expect(['active','refill-due','collected']).toContain(p.status);
  });

  it('interop / simulation / security engines are deterministic & bounded', () => {
    const io = nationalInteroperability('MOH', 120);
    expect(io).toEqual(nationalInteroperability('MOH', 120));
    expect(io.links.length).toBe(9);
    expect(['integrated', 'partial', 'fragmented']).toContain(io.posture);
    for (const l of io.links) expect(['live', 'degraded', 'down']).toContain(l.status);

    const sm = healthSimulation('MOH', 120);
    expect(sm).toEqual(healthSimulation('MOH', 120));
    expect(sm.scenarios.length).toBe(5);
    expect(['stable', 'watch', 'critical']).toContain(sm.posture);
    for (let i = 1; i < sm.collapseRisks.length; i++) {
      expect(sm.collapseRisks[i - 1]!.riskPct).toBeGreaterThanOrEqual(sm.collapseRisks[i]!.riskPct);
    }

    const se = sovereignSecurity('MOH', 120);
    expect(se).toEqual(sovereignSecurity('MOH', 120));
    expect(se.accessTiers.length).toBe(5);
    expect(['secure', 'guarded', 'breach']).toContain(se.posture);
    expect(se.openIncidents).toBe(se.threats.filter(x => !x.blocked).length);
  });
});
