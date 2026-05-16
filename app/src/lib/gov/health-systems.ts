// Health Systems — deep operational engine.
//
// The HEALTH archetype's blueprint groups are not card lists: each is a
// running operational environment. This engine generates the live state
// of the doctor, patient, hospital and disease-intelligence worlds —
// clinicians, encounters, intake queues, beds/ICU/theatres, ambulances,
// outbreaks, epidemiology. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

const FIRST = ['A. Mwangi', 'L. Okonkwo', 'S. Patel', 'R. Diallo', 'M. Hassan', 'T. Ndlovu', 'J. Kamau', 'F. Abebe', 'C. Mensah', 'N. Farah', 'P. Achieng', 'D. Sow'];
const SPECIALTIES = ['Emergency', 'Internal Medicine', 'Surgery', 'Paediatrics', 'Obstetrics', 'Cardiology', 'ICU / Critical Care', 'Infectious Disease'];
const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface Doctor {
  id: string; name: string; specialty: string; region: string;
  workload: number;        // 0-100
  patientsToday: number;
  onCall: boolean;
  status: 'available' | 'in-consult' | 'in-theatre' | 'off-duty';
  burnoutRisk: number;     // 0-100
}
export interface PatientVisit {
  id: string; name: string; age: number;
  triage: 1 | 2 | 3 | 4 | 5;       // 1 = resuscitation … 5 = non-urgent
  complaint: string;
  waitMin: number;
  stage: 'intake' | 'triage' | 'diagnosis' | 'treatment' | 'referral' | 'discharge';
}
export interface Referral { id: string; from: string; to: string; reason: string; urgency: 'routine' | 'urgent' | 'emergency'; ageHrs: number }
export interface Prescription { id: string; drug: string; patient: string; status: 'issued' | 'dispensed' | 'flagged'; }
export interface LabRequest { id: string; test: string; patient: string; priority: 'routine' | 'urgent' | 'stat'; status: 'requested' | 'in-process' | 'resulted' }

const COMPLAINTS = ['Chest pain', 'Trauma — RTA', 'Febrile illness', 'Respiratory distress', 'Obstetric emergency', 'Paediatric fever', 'Abdominal pain', 'Sepsis query', 'Stroke alert', 'Poisoning'];
const DRUGS = ['Amoxicillin', 'Adrenaline', 'Insulin', 'Artemether', 'Paracetamol', 'Ceftriaxone', 'Salbutamol', 'Oxytocin'];
const TESTS = ['Full blood count', 'Malaria RDT', 'Blood culture', 'Chest X-ray', 'CT head', 'Electrolytes', 'PCR panel', 'Crossmatch'];

function pick<T>(arr: T[], k: string): T { return arr[Math.floor(seed(k) * arr.length)]!; }

export function doctorRoster(instId: string, t: number, count = 12): Doctor[] {
  return Array.from({ length: count }, (_, i) => {
    const workload = Math.round(wave(`doc:wl:${instId}:${i}`, t, 35, 99));
    const st = seed(`doc:st:${instId}:${i}`);
    const status: Doctor['status'] = st > 0.82 ? 'in-theatre' : st > 0.5 ? 'in-consult' : st > 0.2 ? 'available' : 'off-duty';
    return {
      id: `DR-${1000 + i}`,
      name: `Dr ${FIRST[i % FIRST.length]}`,
      specialty: SPECIALTIES[i % SPECIALTIES.length]!,
      region: REGIONS[i % REGIONS.length]!,
      workload,
      patientsToday: Math.round(wave(`doc:pt:${instId}:${i}`, t, 4, 38)),
      onCall: seed(`doc:oc:${instId}:${i}`) > 0.6,
      status,
      burnoutRisk: Math.round(Math.min(100, workload * 0.6 + seed(`doc:bo:${instId}:${i}`) * 40)),
    };
  });
}

export function intakeQueue(instId: string, t: number, count = 10): PatientVisit[] {
  const stages: PatientVisit['stage'][] = ['intake', 'triage', 'diagnosis', 'treatment', 'referral', 'discharge'];
  return Array.from({ length: count }, (_, i) => {
    const triage = (1 + Math.floor(seed(`pt:tr:${instId}:${i}`) * 5)) as PatientVisit['triage'];
    const sIdx = Math.floor((t / (6 + seed(`pt:cad:${instId}:${i}`) * 6) + seed(`pt:off:${instId}:${i}`) * stages.length)) % stages.length;
    return {
      id: `PV-${4000 + i}`,
      name: `Patient ${String.fromCharCode(65 + (i % 26))}${i}`,
      age: 1 + Math.round(seed(`pt:ag:${instId}:${i}`) * 88),
      triage,
      complaint: pick(COMPLAINTS, `pt:cp:${instId}:${i}`),
      waitMin: Math.round(wave(`pt:wt:${instId}:${i}`, t, 2, 180) * (triage >= 4 ? 1.4 : 0.5)),
      stage: stages[sIdx]!,
    };
  }).sort((a, b) => a.triage - b.triage);
}

export function referrals(instId: string, t: number, count = 6): Referral[] {
  const urg: Referral['urgency'][] = ['routine', 'urgent', 'emergency'];
  return Array.from({ length: count }, (_, i) => ({
    id: `RF-${700 + i}`,
    from: `${pick(REGIONS, `rf:fr:${instId}:${i}`)} district`,
    to: pick(SPECIALTIES, `rf:to:${instId}:${i}`),
    reason: pick(COMPLAINTS, `rf:rs:${instId}:${i}`),
    urgency: urg[Math.floor(seed(`rf:ur:${instId}:${i}`) * 3)]!,
    ageHrs: Math.round(wave(`rf:ag:${instId}:${i}`, t, 0, 72)),
  }));
}

export function prescriptions(instId: string, t: number, count = 8): Prescription[] {
  return Array.from({ length: count }, (_, i) => {
    const s = seed(`rx:st:${instId}:${i}:${Math.floor(t / 8)}`);
    return {
      id: `RX-${9000 + i}`,
      drug: pick(DRUGS, `rx:dg:${instId}:${i}`),
      patient: `PV-${4000 + (i % 10)}`,
      status: s > 0.86 ? 'flagged' : s > 0.45 ? 'dispensed' : 'issued',
    };
  });
}

export function labRequests(instId: string, t: number, count = 8): LabRequest[] {
  const pr: LabRequest['priority'][] = ['routine', 'urgent', 'stat'];
  return Array.from({ length: count }, (_, i) => {
    const phase = Math.floor((t / 7 + seed(`lab:o:${instId}:${i}`) * 3)) % 3;
    return {
      id: `LB-${5000 + i}`,
      test: pick(TESTS, `lab:ts:${instId}:${i}`),
      patient: `PV-${4000 + (i % 10)}`,
      priority: pr[Math.floor(seed(`lab:pr:${instId}:${i}`) * 3)]!,
      status: (['requested', 'in-process', 'resulted'] as const)[phase]!,
    };
  });
}

export interface SpecialtyLoad { specialty: string; load: number; doctors: number; tone: 'ok' | 'warn' | 'alert' }
export function workloadIntelligence(roster: Doctor[]): { specialties: SpecialtyLoad[]; meanWorkload: number; burnoutAlert: number } {
  const bySpec = new Map<string, Doctor[]>();
  for (const d of roster) { const a = bySpec.get(d.specialty) ?? []; a.push(d); bySpec.set(d.specialty, a); }
  const specialties: SpecialtyLoad[] = [...bySpec.entries()].map(([specialty, ds]): SpecialtyLoad => {
    const load = Math.round(ds.reduce((a, d) => a + d.workload, 0) / ds.length);
    return { specialty, load, doctors: ds.length, tone: load >= 85 ? 'alert' : load >= 70 ? 'warn' : 'ok' };
  }).sort((a, b) => b.load - a.load);
  return {
    specialties,
    meanWorkload: Math.round(roster.reduce((a, d) => a + d.workload, 0) / roster.length),
    burnoutAlert: roster.filter(d => d.burnoutRisk >= 70).length,
  };
}

// ── Hospital operational command ───────────────────────────────────────
export interface HospitalOps {
  beds: { total: number; occupied: number; occupancyPct: number };
  icu: { beds: number; occupied: number; occupancyPct: number; ventilators: number; ventInUse: number };
  theatres: { total: number; active: number; scheduledToday: number; utilisationPct: number };
  ambulances: { fleet: number; available: number; dispatched: number; meanResponseMin: number };
  mortalityIndex: number;     // per 1000, lower better
  staffingPct: number;
  loadBalanceTone: 'ok' | 'warn' | 'alert';
}
export function hospitalOps(instId: string, t: number): HospitalOps {
  const bedsTotal = 1800 + Math.round(seed(`ho:bt:${instId}`) * 1200);
  const occPct = Math.round(wave(`ho:oc:${instId}`, t, 58, 99));
  const icuBeds = 90 + Math.round(seed(`ho:ic:${instId}`) * 110);
  const icuOcc = Math.round(wave(`ho:io:${instId}`, t, 55, 100));
  const vents = Math.round(icuBeds * 0.7);
  const theatres = 14 + Math.round(seed(`ho:th:${instId}`) * 22);
  const tUtil = Math.round(wave(`ho:tu:${instId}`, t, 50, 97));
  const fleet = 60 + Math.round(seed(`ho:fl:${instId}`) * 120);
  const dispatched = Math.round(fleet * wave(`ho:dp:${instId}`, t, 0.2, 0.7));
  return {
    beds: { total: bedsTotal, occupied: Math.round(bedsTotal * occPct / 100), occupancyPct: occPct },
    icu: { beds: icuBeds, occupied: Math.round(icuBeds * icuOcc / 100), occupancyPct: icuOcc, ventilators: vents, ventInUse: Math.round(vents * Math.min(1, icuOcc / 100 + 0.05)) },
    theatres: { total: theatres, active: Math.round(theatres * tUtil / 100), scheduledToday: Math.round(theatres * 1.8), utilisationPct: tUtil },
    ambulances: { fleet, available: fleet - dispatched, dispatched, meanResponseMin: Math.round(wave(`ho:rt:${instId}`, t, 6, 26)) },
    mortalityIndex: Math.round(wave(`ho:mo:${instId}`, t, 6, 22) * 10) / 10,
    staffingPct: Math.round(wave(`ho:sf:${instId}`, t, 62, 97)),
    loadBalanceTone: occPct >= 92 || icuOcc >= 95 ? 'alert' : occPct >= 82 ? 'warn' : 'ok',
  };
}

// ── Disease intelligence (national epidemiology) ───────────────────────
export interface OutbreakCell { region: string; disease: string; rt: number; cases: number; trend: 'rising' | 'stable' | 'falling'; severity: 'contained' | 'active' | 'critical' }
export interface DiseaseIntel {
  outbreaks: OutbreakCell[];
  nationalRt: number;
  activeCases: number;
  mortality7d: number;
  vaccinationCoverage: number;
  worstRegion: string;
  forecast: { tPlusDays: number; projectedCases: number }[];
}
const DISEASES = ['Cholera', 'Measles', 'Influenza-like', 'Dengue', 'Viral haemorrhagic', 'Respiratory cluster'];
export function diseaseIntel(instId: string, t: number): DiseaseIntel {
  const outbreaks: OutbreakCell[] = REGIONS.map((region, i): OutbreakCell => {
    const rt = Math.round(wave(`di:rt:${instId}:${i}`, t, 0.6, 2.4) * 100) / 100;
    const cases = Math.round(wave(`di:ca:${instId}:${i}`, t, 30, 1400) * (rt > 1.3 ? 1.4 : 0.7));
    return {
      region,
      disease: pick(DISEASES, `di:ds:${instId}:${i}`),
      rt,
      cases,
      trend: rt > 1.2 ? 'rising' : rt < 0.9 ? 'falling' : 'stable',
      severity: rt > 1.6 ? 'critical' : rt > 1.05 ? 'active' : 'contained',
    };
  }).sort((a, b) => b.rt - a.rt);
  const activeCases = outbreaks.reduce((a, o) => a + o.cases, 0);
  const nationalRt = Math.round((outbreaks.reduce((a, o) => a + o.rt, 0) / outbreaks.length) * 100) / 100;
  return {
    outbreaks,
    nationalRt,
    activeCases,
    mortality7d: Math.round(wave(`di:m7:${instId}`, t, 10, 320)),
    vaccinationCoverage: Math.round(wave(`di:vc:${instId}`, t, 52, 95)),
    worstRegion: outbreaks[0]!.region,
    forecast: [3, 7, 14, 21].map(d => ({
      tPlusDays: d,
      projectedCases: Math.round(activeCases * Math.pow(nationalRt, d / 7)),
    })),
  };
}

/** 0-100 national healthcare instability — drives cross-system propagation. */
export function healthInstability(instId: string, t: number): number {
  const h = hospitalOps(instId, t);
  const d = diseaseIntel(instId, t);
  const wl = workloadIntelligence(doctorRoster(instId, t));
  const v =
    (h.icu.occupancyPct - 70) * 0.6 +
    (h.beds.occupancyPct - 75) * 0.4 +
    Math.max(0, (d.nationalRt - 1) * 60) +
    (wl.meanWorkload - 70) * 0.5 +
    wl.burnoutAlert * 3 +
    Math.max(0, (h.ambulances.meanResponseMin - 12) * 1.5);
  return Math.round(Math.max(0, Math.min(100, v)));
}
