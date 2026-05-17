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

// ── Patient / citizen healthcare infrastructure ────────────────────────
export interface Appointment { id: string; clinic: string; when: string; status: 'scheduled' | 'confirmed' | 'in-queue' | 'completed' }
export interface VaccinationRecord { vaccine: string; doses: number; status: 'up-to-date' | 'due' | 'overdue' }
export interface HealthAlert { label: string; level: 'info' | 'advisory' | 'urgent'; detail: string }
export interface PatientServices {
  registeredM: number;          // millions enrolled in the citizen portal
  portalUptime: number;
  appointmentsToday: number;
  appointments: Appointment[];
  vaccination: VaccinationRecord[];
  insuranceCoverage: number;    // % population covered
  claimsPending: number;
  treatmentTracking: { active: number; adherencePct: number };
  alerts: HealthAlert[];
}
const CLINICS = ['Central Polyclinic', 'Northern District Hospital', 'Coastal Health Centre', 'Highland Clinic', 'Eastern Referral'];
const VACCINES = ['Routine childhood', 'Influenza (seasonal)', 'Measles (MR)', 'HPV', 'COVID booster'];
export function patientServices(instId: string, t: number): PatientServices {
  const appointments: Appointment[] = Array.from({ length: 8 }, (_, i) => {
    const phase = Math.floor((t / 6 + seed(`ap:o:${instId}:${i}`) * 4)) % 4;
    return {
      id: `AP-${300 + i}`,
      clinic: CLINICS[i % CLINICS.length]!,
      when: `${1 + Math.round(seed(`ap:w:${instId}:${i}`) * 13)}:${seed(`ap:m:${instId}:${i}`) > 0.5 ? '30' : '00'}`,
      status: (['scheduled', 'confirmed', 'in-queue', 'completed'] as const)[phase]!,
    };
  });
  const vaccination: VaccinationRecord[] = VACCINES.map((vaccine, i) => {
    const s = seed(`vx:${instId}:${i}`);
    return { vaccine, doses: 1 + Math.round(seed(`vxd:${instId}:${i}`) * 3), status: s > 0.78 ? 'overdue' : s > 0.5 ? 'due' : 'up-to-date' };
  });
  const insuranceCoverage = Math.round(wave(`ins:${instId}`, t, 48, 92));
  const alerts: HealthAlert[] = [
    { label: 'Seasonal influenza advisory', level: 'advisory', detail: 'Elevated transmission — vaccination recommended for at-risk groups' },
    { label: 'Prescription ready for collection', level: 'info', detail: 'Pharmacy dispensing queue normal' },
    ...(seed(`ha:${instId}:${Math.floor(t / 12)}`) > 0.7 ? [{ label: 'Outbreak containment notice', level: 'urgent' as const, detail: 'Localised cluster — follow regional health directives' }] : []),
  ];
  return {
    registeredM: Math.round(wave(`pp:reg:${instId}`, t, 18, 42) * 10) / 10,
    portalUptime: Math.round(wave(`pp:up:${instId}`, t, 96, 100) * 100) / 100,
    appointmentsToday: Math.round(wave(`pp:ap:${instId}`, t, 1200, 9800)),
    appointments,
    vaccination,
    insuranceCoverage,
    claimsPending: Math.round(wave(`pp:cl:${instId}`, t, 200, 4200)),
    treatmentTracking: { active: Math.round(wave(`pp:tt:${instId}`, t, 800, 7400)), adherencePct: Math.round(wave(`pp:ad:${instId}`, t, 62, 94)) },
    alerts,
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

export interface NationalHealthcareCapacity {
  hospitals: number;          // active HEALTH institutions in scope
  bedOccupancyPct: number;
  icuOccupancyPct: number;
  ambulanceAvailablePct: number;
  doctorAvailabilityPct: number;
  capacityIndex: number;      // 0-100 (higher = more headroom)
  tone: 'ok' | 'warn' | 'alert';
}
// Rule 3: national healthcare capacity is EMERGENT — it derives from the
// actual hospital/ICU/ambulance/doctor state of every active HEALTH
// institution, never a hardcoded number. Pure & deterministic.
export function nationalHealthcareCapacity(
  healthInstitutionIds: string[],
  t: number,
): NationalHealthcareCapacity {
  if (healthInstitutionIds.length === 0) {
    return { hospitals: 0, bedOccupancyPct: 0, icuOccupancyPct: 0, ambulanceAvailablePct: 100, doctorAvailabilityPct: 100, capacityIndex: 100, tone: 'ok' };
  }
  let bed = 0, icu = 0, ambAvail = 0, docAvail = 0;
  for (const id of healthInstitutionIds) {
    const h = hospitalOps(id, t);
    const roster = doctorRoster(id, t);
    bed += h.beds.occupancyPct;
    icu += h.icu.occupancyPct;
    ambAvail += Math.round((h.ambulances.available / Math.max(1, h.ambulances.fleet)) * 100);
    docAvail += Math.round((roster.filter(d => d.status === 'available').length / Math.max(1, roster.length)) * 100);
  }
  const n = healthInstitutionIds.length;
  const bedOccupancyPct = Math.round(bed / n);
  const icuOccupancyPct = Math.round(icu / n);
  const ambulanceAvailablePct = Math.round(ambAvail / n);
  const doctorAvailabilityPct = Math.round(docAvail / n);
  const capacityIndex = Math.round(Math.max(0, Math.min(100,
    (100 - bedOccupancyPct) * 0.3 + (100 - icuOccupancyPct) * 0.35 +
    ambulanceAvailablePct * 0.2 + doctorAvailabilityPct * 0.15,
  )));
  return {
    hospitals: n, bedOccupancyPct, icuOccupancyPct, ambulanceAvailablePct, doctorAvailabilityPct,
    capacityIndex,
    tone: capacityIndex >= 55 ? 'ok' : capacityIndex >= 35 ? 'warn' : 'alert',
  };
}

// ── Laboratory Systems ───────────────────────────────────────────────
// The national diagnostic network is an execution surface, not a chart:
// specimens flow through accession → assay → verification → report, with
// per-assay turnaround telemetry, a regional lab grid that escalates under
// load, and critical-result alerting. Pure & deterministic.
const ASSAYS = ['Haematology', 'Microbiology culture', 'Molecular / PCR', 'Clinical chemistry', 'Histopathology', 'Serology'];

export interface LabAssayLine {
  assay: string; pending: number; inProcess: number; turnaroundHrs: number;
  tone: 'ok' | 'warn' | 'alert';
}
export interface LabRegionNode {
  region: string; capacityPct: number; backlog: number;
  escalation: 'nominal' | 'surge' | 'divert'; tone: 'ok' | 'warn' | 'alert';
}
export interface LaboratoryOps {
  specimensToday: number;
  accessioned: number;
  backlog: number;
  criticalResults: number;
  meanTurnaroundHrs: number;
  rejectionRatePct: number;
  assays: LabAssayLine[];
  regions: LabRegionNode[];
  posture: 'nominal' | 'strained' | 'overloaded';
}
export function laboratoryOps(instId: string, t: number): LaboratoryOps {
  const assays: LabAssayLine[] = ASSAYS.map((assay, i) => {
    const pending = Math.round(wave(`lab:pend:${instId}:${i}`, t, 6, 140));
    const inProcess = Math.round(wave(`lab:proc:${instId}:${i}`, t, 4, 70));
    const turnaroundHrs = Math.round(wave(`lab:tat:${instId}:${i}`, t, 2, 54));
    const tone: 'ok' | 'warn' | 'alert' =
      turnaroundHrs >= 36 || pending >= 110 ? 'alert' : turnaroundHrs >= 20 || pending >= 70 ? 'warn' : 'ok';
    return { assay, pending, inProcess, turnaroundHrs, tone };
  });
  const regions: LabRegionNode[] = REGIONS.map((region, i) => {
    const capacityPct = Math.round(wave(`lab:cap:${instId}:${region}`, t, 1, 100));
    const backlog = Math.round(wave(`lab:bk:${instId}:${region}`, t, 0, 320));
    const escalation: LabRegionNode['escalation'] =
      capacityPct < 35 || backlog > 240 ? 'divert' : capacityPct < 60 || backlog > 140 ? 'surge' : 'nominal';
    const tone: 'ok' | 'warn' | 'alert' =
      escalation === 'divert' ? 'alert' : escalation === 'surge' ? 'warn' : 'ok';
    return { region, capacityPct, backlog, escalation, tone };
  }).sort((a, b) => a.capacityPct - b.capacityPct);
  const backlog = regions.reduce((s, r) => s + r.backlog, 0);
  const specimensToday = Math.round(wave(`lab:spec:${instId}`, t, 600, 5200));
  const accessioned = Math.round(specimensToday * (0.6 + seed(`lab:acc:${instId}`) * 0.35));
  const criticalResults = Math.round(wave(`lab:crit:${instId}`, t, 0, 24));
  const meanTurnaroundHrs = Math.round(assays.reduce((s, a) => s + a.turnaroundHrs, 0) / assays.length);
  const rejectionRatePct = Math.round(wave(`lab:rej:${instId}`, t, 1, 9) * 10) / 10;
  const divert = regions.filter(r => r.escalation === 'divert').length;
  const posture: LaboratoryOps['posture'] =
    divert >= 2 || meanTurnaroundHrs >= 34 ? 'overloaded'
      : divert >= 1 || meanTurnaroundHrs >= 22 ? 'strained' : 'nominal';
  return {
    specimensToday, accessioned, backlog, criticalResults,
    meanTurnaroundHrs, rejectionRatePct, assays, regions, posture,
  };
}

// ── Pharmaceutical Systems ───────────────────────────────────────────
// The national medicine supply chain is an execution surface: inventory
// by class with live days-of-cover, stock-exhaustion prediction, a
// regional distribution grid that flags emergency redistribution, and a
// procurement pipeline. Pure & deterministic.
const DRUG_CLASSES = ['Antibiotics', 'Analgesics', 'Antimalarials', 'Insulin & endocrine', 'Vaccines (cold chain)', 'Emergency / resus', 'Antiretrovirals', 'Oncology'];

export interface DrugStockLine {
  drugClass: string; stockUnits: number; daysCover: number;
  monthlyBurn: number; status: 'ok' | 'low' | 'critical' | 'stockout';
  etaStockoutDays: number; tone: 'ok' | 'warn' | 'alert';
}
export interface PharmaRegionNode {
  region: string; fillRatePct: number; shortages: number;
  action: 'stocked' | 'replenish' | 'emergency-redistribute'; tone: 'ok' | 'warn' | 'alert';
}
export interface PharmaceuticalOps {
  skuTracked: number;
  classesCritical: number;
  nationalDaysCover: number;
  emergencyRedistributions: number;
  procurementInFlight: number;
  coldChainIntegrityPct: number;
  inventory: DrugStockLine[];
  regions: PharmaRegionNode[];
  posture: 'secure' | 'strained' | 'shortage';
}
export function pharmaceuticalOps(instId: string, t: number): PharmaceuticalOps {
  const inventory: DrugStockLine[] = DRUG_CLASSES.map((drugClass, i) => {
    const stockUnits = Math.round(wave(`ph:stk:${instId}:${i}`, t, 0, 90_000));
    const monthlyBurn = Math.round(wave(`ph:burn:${instId}:${i}`, t, 1_800, 30_000));
    const daysCover = Math.round((stockUnits / Math.max(1, monthlyBurn)) * 30);
    const status: DrugStockLine['status'] =
      daysCover <= 0 ? 'stockout' : daysCover < 14 ? 'critical' : daysCover < 30 ? 'low' : 'ok';
    const tone: 'ok' | 'warn' | 'alert' =
      status === 'stockout' || status === 'critical' ? 'alert' : status === 'low' ? 'warn' : 'ok';
    return { drugClass, stockUnits, daysCover, monthlyBurn, status, etaStockoutDays: daysCover, tone };
  }).sort((a, b) => a.daysCover - b.daysCover);
  const regions: PharmaRegionNode[] = REGIONS.map((region) => {
    const fillRatePct = Math.round(wave(`ph:fill:${instId}:${region}`, t, 35, 100));
    const shortages = Math.round(wave(`ph:short:${instId}:${region}`, t, 0, 9));
    const action: PharmaRegionNode['action'] =
      fillRatePct < 55 || shortages >= 6 ? 'emergency-redistribute' : fillRatePct < 78 || shortages >= 2 ? 'replenish' : 'stocked';
    const tone: 'ok' | 'warn' | 'alert' =
      action === 'emergency-redistribute' ? 'alert' : action === 'replenish' ? 'warn' : 'ok';
    return { region, fillRatePct, shortages, action, tone };
  }).sort((a, b) => a.fillRatePct - b.fillRatePct);
  const classesCritical = inventory.filter(d => d.status === 'critical' || d.status === 'stockout').length;
  const emergencyRedistributions = regions.filter(r => r.action === 'emergency-redistribute').length;
  const nationalDaysCover = Math.round(inventory.reduce((s, d) => s + d.daysCover, 0) / inventory.length);
  const posture: PharmaceuticalOps['posture'] =
    classesCritical >= 3 || emergencyRedistributions >= 2 ? 'shortage'
      : classesCritical >= 1 || emergencyRedistributions >= 1 ? 'strained' : 'secure';
  return {
    skuTracked: Math.round(wave(`ph:sku:${instId}`, t, 1_200, 4_800)),
    classesCritical,
    nationalDaysCover,
    emergencyRedistributions,
    procurementInFlight: Math.round(wave(`ph:proc:${instId}`, t, 2, 28)),
    coldChainIntegrityPct: Math.round(wave(`ph:cc:${instId}`, t, 88, 100)),
    inventory,
    regions,
    posture,
  };
}

// ── Emergency Medical Systems ────────────────────────────────────────
// Pre-hospital & disaster medicine as an execution surface: live incident
// load by category, ambulance fleet disposition, response-time telemetry,
// a regional EMS grid that escalates to mass-casualty, and surge posture.
// Pure & deterministic.
const EMS_TYPES = ['Trauma / RTA', 'Cardiac arrest', 'Obstetric emergency', 'Respiratory', 'Mass-casualty', 'Paediatric', 'Stroke', 'Poisoning'];

export interface EmsIncidentLine {
  type: string; active: number; meanResponseMin: number;
  priority: 'P1' | 'P2' | 'P3'; tone: 'ok' | 'warn' | 'alert';
}
export interface EmsRegionNode {
  region: string; unitsAvailable: number; unitsCommitted: number;
  meanResponseMin: number; posture: 'ready' | 'surge' | 'mass-casualty';
  tone: 'ok' | 'warn' | 'alert';
}
export interface EmergencyMedicalOps {
  activeIncidents: number;
  fleetTotal: number;
  fleetAvailable: number;
  meanResponseMin: number;
  dispatchBacklog: number;
  massCasualtyActive: number;
  incidents: EmsIncidentLine[];
  regions: EmsRegionNode[];
  posture: 'nominal' | 'surged' | 'overwhelmed';
}
export function emergencyMedicalOps(instId: string, t: number): EmergencyMedicalOps {
  const incidents: EmsIncidentLine[] = EMS_TYPES.map((type, i) => {
    const active = Math.round(wave(`ems:act:${instId}:${i}`, t, 0, 60));
    const meanResponseMin = Math.round(wave(`ems:rt:${instId}:${i}`, t, 5, 34));
    const priority: EmsIncidentLine['priority'] = i <= 1 || type === 'Mass-casualty' ? 'P1' : i <= 4 ? 'P2' : 'P3';
    const tone: 'ok' | 'warn' | 'alert' =
      meanResponseMin >= 20 || (priority === 'P1' && active >= 25) ? 'alert' : meanResponseMin >= 12 || active >= 30 ? 'warn' : 'ok';
    return { type, active, meanResponseMin, priority, tone };
  }).sort((a, b) => b.active - a.active);
  const regions: EmsRegionNode[] = REGIONS.map((region) => {
    const fleet = 14 + Math.round(seed(`ems:flt:${instId}:${region}`) * 22);
    const unitsCommitted = Math.round(wave(`ems:cmt:${instId}:${region}`, t, 0, fleet));
    const unitsAvailable = Math.max(0, fleet - unitsCommitted);
    const meanResponseMin = Math.round(wave(`ems:rrt:${instId}:${region}`, t, 5, 38));
    const ratio = unitsAvailable / fleet;
    const posture: EmsRegionNode['posture'] =
      ratio < 0.12 || meanResponseMin >= 26 ? 'mass-casualty' : ratio < 0.32 || meanResponseMin >= 16 ? 'surge' : 'ready';
    const tone: 'ok' | 'warn' | 'alert' =
      posture === 'mass-casualty' ? 'alert' : posture === 'surge' ? 'warn' : 'ok';
    return { region, unitsAvailable, unitsCommitted, meanResponseMin, posture, tone };
  }).sort((a, b) => a.unitsAvailable - b.unitsAvailable);
  const fleetTotal = regions.reduce((s, r) => s + r.unitsAvailable + r.unitsCommitted, 0);
  const fleetAvailable = regions.reduce((s, r) => s + r.unitsAvailable, 0);
  const activeIncidents = incidents.reduce((s, i) => s + i.active, 0);
  const meanResponseMin = Math.round(regions.reduce((s, r) => s + r.meanResponseMin, 0) / regions.length);
  const massCasualtyActive = regions.filter(r => r.posture === 'mass-casualty').length;
  const posture: EmergencyMedicalOps['posture'] =
    massCasualtyActive >= 2 || meanResponseMin >= 24 ? 'overwhelmed'
      : massCasualtyActive >= 1 || meanResponseMin >= 15 ? 'surged' : 'nominal';
  return {
    activeIncidents, fleetTotal, fleetAvailable, meanResponseMin,
    dispatchBacklog: Math.round(wave(`ems:bk:${instId}`, t, 0, 40)),
    massCasualtyActive, incidents, regions, posture,
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
