import { describe, it, expect } from 'vitest';
import {
  doctorRoster, intakeQueue, referrals, prescriptions, labRequests,
  workloadIntelligence, hospitalOps, diseaseIntel, healthInstability, patientServices,
  nationalHealthcareCapacity, laboratoryOps,
} from './health-systems';

describe('health systems engine', () => {
  it('doctor roster is deterministic and bounded', () => {
    const a = doctorRoster('MOH', 50);
    expect(a).toEqual(doctorRoster('MOH', 50));
    expect(a.length).toBe(12);
    for (const d of a) {
      expect(d.workload).toBeGreaterThanOrEqual(0);
      expect(d.workload).toBeLessThanOrEqual(100);
      expect(d.burnoutRisk).toBeLessThanOrEqual(100);
      expect(['available', 'in-consult', 'in-theatre', 'off-duty']).toContain(d.status);
    }
  });

  it('intake queue is triage-ordered and stages advance over time', () => {
    const q = intakeQueue('MOH', 30);
    for (let i = 1; i < q.length; i++) expect(q[i - 1]!.triage).toBeLessThanOrEqual(q[i]!.triage);
    const q0 = intakeQueue('MOH', 0);
    const q1 = intakeQueue('MOH', 300);
    expect(q0.some((p, i) => p.stage !== q1[i]!.stage)).toBe(true);
  });

  it('referrals, prescriptions and lab requests are coherent', () => {
    expect(referrals('MOH', 10).every(r => ['routine', 'urgent', 'emergency'].includes(r.urgency))).toBe(true);
    expect(prescriptions('MOH', 10).every(p => ['issued', 'dispensed', 'flagged'].includes(p.status))).toBe(true);
    expect(labRequests('MOH', 10).every(l => ['requested', 'in-process', 'resulted'].includes(l.status))).toBe(true);
  });

  it('workload intelligence aggregates by specialty', () => {
    const wl = workloadIntelligence(doctorRoster('MOH', 40));
    expect(wl.specialties.length).toBeGreaterThan(0);
    for (let i = 1; i < wl.specialties.length; i++) expect(wl.specialties[i - 1]!.load).toBeGreaterThanOrEqual(wl.specialties[i]!.load);
    expect(wl.meanWorkload).toBeGreaterThanOrEqual(0);
    expect(wl.meanWorkload).toBeLessThanOrEqual(100);
  });

  it('hospital ops and disease intel are bounded & deterministic', () => {
    const h = hospitalOps('MOH', 60);
    expect(h).toEqual(hospitalOps('MOH', 60));
    expect(h.icu.occupancyPct).toBeLessThanOrEqual(100);
    expect(h.beds.occupied).toBeLessThanOrEqual(h.beds.total);
    expect(['ok', 'warn', 'alert']).toContain(h.loadBalanceTone);

    const d = diseaseIntel('MOH', 60);
    expect(d.outbreaks.length).toBe(6);
    for (let i = 1; i < d.outbreaks.length; i++) expect(d.outbreaks[i - 1]!.rt).toBeGreaterThanOrEqual(d.outbreaks[i]!.rt);
    expect(d.forecast.length).toBe(4);
  });

  it('patient services is deterministic and coherent', () => {
    const p = patientServices('MOH', 70);
    expect(p).toEqual(patientServices('MOH', 70));
    expect(p.portalUptime).toBeLessThanOrEqual(100);
    expect(p.insuranceCoverage).toBeGreaterThanOrEqual(0);
    expect(p.insuranceCoverage).toBeLessThanOrEqual(100);
    expect(p.appointments.length).toBeGreaterThan(0);
    expect(p.vaccination.every(v => ['up-to-date', 'due', 'overdue'].includes(v.status))).toBe(true);
    expect(p.alerts.every(a => ['info', 'advisory', 'urgent'].includes(a.level))).toBe(true);
  });

  it('nationalHealthcareCapacity is emergent, bounded & deterministic', () => {
    const empty = nationalHealthcareCapacity([], 50);
    expect(empty.hospitals).toBe(0);
    expect(empty.capacityIndex).toBe(100);
    const a = nationalHealthcareCapacity(['MOH-1', 'MOH-2'], 50);
    expect(a).toEqual(nationalHealthcareCapacity(['MOH-1', 'MOH-2'], 50));
    expect(a.hospitals).toBe(2);
    expect(a.capacityIndex).toBeGreaterThanOrEqual(0);
    expect(a.capacityIndex).toBeLessThanOrEqual(100);
    expect(['ok', 'warn', 'alert']).toContain(a.tone);
  });

  it('healthInstability is a bounded 0-100 propagation signal', () => {
    for (const t of [10, 80, 200, 450]) {
      const v = healthInstability('MOH', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(healthInstability('MOH', 99)).toBe(healthInstability('MOH', 99));
  });

  it('laboratoryOps is a deterministic, bounded diagnostic execution surface', () => {
    const a = laboratoryOps('MOH', 120);
    expect(a).toEqual(laboratoryOps('MOH', 120));
    expect(['nominal', 'strained', 'overloaded']).toContain(a.posture);
    expect(a.assays.length).toBe(6);
    expect(a.regions.length).toBe(6);
    expect(a.accessioned).toBeLessThanOrEqual(a.specimensToday);
    for (const r of a.regions) {
      expect(r.capacityPct).toBeGreaterThanOrEqual(0);
      expect(r.capacityPct).toBeLessThanOrEqual(100);
      expect(['nominal', 'surge', 'divert']).toContain(r.escalation);
    }
    // worst-capacity region first (escalation ordering)
    for (let i = 1; i < a.regions.length; i++) {
      expect(a.regions[i - 1]!.capacityPct).toBeLessThanOrEqual(a.regions[i]!.capacityPct);
    }
    for (const s of a.assays) {
      expect(s.turnaroundHrs).toBeGreaterThanOrEqual(0);
      expect(['ok', 'warn', 'alert']).toContain(s.tone);
    }
  });
});
