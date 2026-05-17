// Ministry of Health — operational engine extensions.
//
// Federated execution engine for the health domains not covered by
// health-systems.ts: pharmaceutical supply, laboratory network, health
// finance/claims, regulatory licensing, emergency medical command and the
// national health command picture. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
type Tone = 'ok' | 'warn' | 'alert';

// ── Pharmaceutical supply chain ────────────────────────────────────────
export interface DrugStock { drug: string; coverDays: number; reorder: boolean; tone: Tone }
export interface PharmaceuticalSupply {
  outlets: number;
  stockoutRiskPct: number;
  pipelineInTransit: number;
  expiringSoon: number;
  drugs: DrugStock[];
  procurementOpen: number;
}
const DRUGS = ['Amoxicillin', 'Adrenaline', 'Insulin', 'Artemether', 'Paracetamol', 'Ceftriaxone', 'Oxytocin', 'Salbutamol'];
export function pharmaceuticalSupply(id: string, t: number): PharmaceuticalSupply {
  const drugs: DrugStock[] = DRUGS.map((drug, i): DrugStock => {
    const cover = Math.round(wave(`ph:cd:${id}:${i}`, t, 4, 90));
    const tone: Tone = cover >= 45 ? 'ok' : cover >= 20 ? 'warn' : 'alert';
    return { drug, coverDays: cover, reorder: cover < 25, tone };
  });
  return {
    outlets: 380 + Math.round(seed(`ph:ou:${id}`) * 420),
    stockoutRiskPct: Math.round(wave(`ph:so:${id}`, t, 2, 38)),
    pipelineInTransit: Math.round(wave(`ph:pt:${id}`, t, 20, 640)),
    expiringSoon: Math.round(wave(`ph:ex:${id}`, t, 0, 140)),
    drugs,
    procurementOpen: Math.round(wave(`ph:pc:${id}`, t, 2, 40)),
  };
}

// ── Laboratory network ─────────────────────────────────────────────────
export interface LaboratoryNetwork {
  labs: number;
  samplesInProcess: number;
  meanTurnaroundHrs: number;
  backlog: number;
  byDiscipline: { discipline: string; load: number; tone: Tone }[];
  syncIntegrityPct: number;
}
const LAB_DISC = ['Pathology', 'Microbiology', 'Haematology', 'Molecular / PCR', 'Toxicology'];
export function laboratoryNetwork(id: string, t: number): LaboratoryNetwork {
  return {
    labs: 80 + Math.round(seed(`lb:n:${id}`) * 90),
    samplesInProcess: Math.round(wave(`lb:sp:${id}`, t, 400, 22000)),
    meanTurnaroundHrs: Math.round(wave(`lb:tt:${id}`, t, 4, 72)),
    backlog: Math.round(wave(`lb:bk:${id}`, t, 100, 8400)),
    byDiscipline: LAB_DISC.map((discipline, i): { discipline: string; load: number; tone: Tone } => {
      const load = Math.round(wave(`lb:d:${id}:${i}`, t, 30, 99));
      const tone: Tone = load >= 85 ? 'alert' : load >= 68 ? 'warn' : 'ok';
      return { discipline, load, tone };
    }),
    syncIntegrityPct: Math.round(wave(`lb:si:${id}`, t, 92, 100) * 100) / 100,
  };
}

// ── Laboratory deep execution system ───────────────────────────────────
// The national diagnostic network as a true execution system: specimen
// lifecycle pipeline, priority-laned testing queues with queue
// intelligence, outbreak detection feeding a regional escalation tree,
// capacity-based diagnostics routing, panic-value alerting and an
// operational timeline. Pure & deterministic.
export type LabStage = 'Collected' | 'In transit' | 'Accessioned' | 'In assay' | 'Verified' | 'Reported';
const LAB_STAGES: LabStage[] = ['Collected', 'In transit', 'Accessioned', 'In assay', 'Verified', 'Reported'];
const LAB_PATHOGENS = ['Cholera', 'Measles', 'Influenza A', 'Dengue', 'Meningitis', 'Viral haemorrhagic'];
const LAB_SPECIMENS = ['Blood culture', 'PCR swab', 'Serology', 'CSF', 'Stool', 'Tissue biopsy'];

export interface LabPipelineStage { stage: LabStage; count: number; inflowPerHr: number; outflowPerHr: number; bottleneck: boolean; tone: Tone }
export interface LabQueueLane { priority: 'STAT' | 'Urgent' | 'Routine'; depth: number; oldestHrs: number; slaHrs: number; breaching: number; throughputPerHr: number; tone: Tone }
export interface LabOutbreakSignal { pathogen: string; region: string; positivityPct: number; trend: 'rising' | 'stable' | 'falling'; escalation: 'monitor' | 'investigate' | 'declare'; tone: Tone }
export interface LabRoute { specimen: string; tier: 'District' | 'Regional reference' | 'National reference'; capacityPct: number; rerouted: boolean; tone: Tone }
export interface LabCriticalAlert { id: string; test: string; patient: string; value: string; ageMin: number; acknowledged: boolean }
export interface LabTimelineEvent { atHrsAgo: number; kind: 'result' | 'escalation' | 'reroute' | 'alert' | 'sync'; detail: string; tone: Tone }
export interface LaboratoryExecution {
  pipeline: LabPipelineStage[];
  queues: LabQueueLane[];
  outbreaks: LabOutbreakSignal[];
  routing: LabRoute[];
  criticalAlerts: LabCriticalAlert[];
  timeline: LabTimelineEvent[];
  slaBreaches: number;
  criticalUnacked: number;
  escalationLevel: 'nominal' | 'regional' | 'national';
  posture: 'steady' | 'strained' | 'crisis';
}
export function laboratoryExecution(id: string, t: number): LaboratoryExecution {
  const pipeline: LabPipelineStage[] = LAB_STAGES.map((stage, i): LabPipelineStage => {
    const count = Math.round(wave(`lx:c:${id}:${i}`, t, 40, 2600));
    const inflowPerHr = Math.round(wave(`lx:in:${id}:${i}`, t, 20, 320));
    const outflowPerHr = Math.round(wave(`lx:out:${id}:${i}`, t, 18, 320));
    const bottleneck = inflowPerHr > outflowPerHr + 40 && i < LAB_STAGES.length - 1;
    const tone: Tone = bottleneck ? 'alert' : inflowPerHr > outflowPerHr ? 'warn' : 'ok';
    return { stage, count, inflowPerHr, outflowPerHr, bottleneck, tone };
  });
  const queues: LabQueueLane[] = (['STAT', 'Urgent', 'Routine'] as const).map((priority, i): LabQueueLane => {
    const slaHrs = priority === 'STAT' ? 2 : priority === 'Urgent' ? 8 : 48;
    const depth = Math.round(wave(`lx:qd:${id}:${i}`, t, 2, priority === 'Routine' ? 1400 : 240));
    const oldestHrs = Math.round(wave(`lx:qo:${id}:${i}`, t, 0, slaHrs * 2.4) * 10) / 10;
    const throughputPerHr = Math.round(wave(`lx:qt:${id}:${i}`, t, 4, 180));
    const breaching = oldestHrs > slaHrs ? Math.round(depth * Math.min(0.6, (oldestHrs - slaHrs) / (slaHrs * 3))) : 0;
    const tone: Tone = breaching > depth * 0.25 ? 'alert' : breaching > 0 ? 'warn' : 'ok';
    return { priority, depth, oldestHrs, slaHrs, breaching, throughputPerHr, tone };
  });
  const outbreaks: LabOutbreakSignal[] = REGIONS.map((region, i): LabOutbreakSignal => {
    const positivityPct = Math.round(wave(`lx:ob:${id}:${i}`, t, 1, 42));
    const tr = wave(`lx:tr:${id}:${i}`, t, 0, 1);
    const trend: LabOutbreakSignal['trend'] = tr > 0.66 ? 'rising' : tr > 0.33 ? 'stable' : 'falling';
    const escalation: LabOutbreakSignal['escalation'] =
      positivityPct >= 28 && trend === 'rising' ? 'declare' : positivityPct >= 15 ? 'investigate' : 'monitor';
    const tone: Tone = escalation === 'declare' ? 'alert' : escalation === 'investigate' ? 'warn' : 'ok';
    return { pathogen: LAB_PATHOGENS[i % LAB_PATHOGENS.length]!, region, positivityPct, trend, escalation, tone };
  }).sort((a, b) => b.positivityPct - a.positivityPct);
  const routing: LabRoute[] = LAB_SPECIMENS.map((specimen, i): LabRoute => {
    const capacityPct = Math.round(wave(`lx:rt:${id}:${i}`, t, 35, 100));
    const tier: LabRoute['tier'] = i < 2 ? 'National reference' : i < 4 ? 'Regional reference' : 'District';
    const rerouted = capacityPct < 50;
    const tone: Tone = capacityPct < 45 ? 'alert' : capacityPct < 65 ? 'warn' : 'ok';
    return { specimen, tier, capacityPct, rerouted, tone };
  });
  const nCrit = Math.round(wave(`lx:nca:${id}`, t, 0, 7));
  const criticalAlerts: LabCriticalAlert[] = Array.from({ length: nCrit }, (_, i): LabCriticalAlert => {
    const ageMin = Math.round(wave(`lx:ca:${id}:${i}`, t, 1, 90));
    return {
      id: `CR-${4200 + i}`,
      test: ['Potassium 7.1', 'Troponin 4.8', 'Lactate 9.2', 'Blood culture +', 'INR 6.4', 'Glucose 1.9'][i % 6]!,
      patient: `PT-${9000 + (i * 7 % 90)}`,
      value: 'PANIC',
      ageMin,
      acknowledged: seed(`lx:ack:${id}:${i}`) > 0.6,
    };
  });
  const slaBreaches = queues.reduce((s, q) => s + q.breaching, 0);
  const criticalUnacked = criticalAlerts.filter(a => !a.acknowledged).length;
  const declared = outbreaks.filter(o => o.escalation === 'declare').length;
  const escalationLevel: LaboratoryExecution['escalationLevel'] =
    declared >= 2 ? 'national' : declared >= 1 || outbreaks.some(o => o.escalation === 'investigate') ? 'regional' : 'nominal';
  const posture: LaboratoryExecution['posture'] =
    declared >= 2 || criticalUnacked >= 4 || slaBreaches > 120 ? 'crisis'
      : declared >= 1 || criticalUnacked >= 1 || slaBreaches > 30 ? 'strained' : 'steady';
  const timeline: LabTimelineEvent[] = [
    { atHrsAgo: 0, kind: 'sync', detail: `LIS sync ${Math.round(wave(`lx:sy:${id}`, t, 92, 100))}% — ${queues[0]!.depth} STAT in queue`, tone: 'ok' },
    { atHrsAgo: 1, kind: outbreaks[0]!.escalation === 'declare' ? 'escalation' : 'result', detail: `${outbreaks[0]!.pathogen} ${outbreaks[0]!.positivityPct}% positivity · ${outbreaks[0]!.region} (${outbreaks[0]!.escalation})`, tone: outbreaks[0]!.tone },
    { atHrsAgo: 2, kind: 'alert', detail: `${criticalUnacked} unacknowledged panic value(s)`, tone: criticalUnacked ? 'alert' : 'ok' },
    { atHrsAgo: 3, kind: 'reroute', detail: `${routing.filter(r => r.rerouted).length} specimen stream(s) rerouted on capacity`, tone: routing.some(r => r.rerouted) ? 'warn' : 'ok' },
    { atHrsAgo: 5, kind: 'result', detail: `Pipeline ${pipeline.find(p => p.bottleneck)?.stage ?? 'flow'} ${pipeline.some(p => p.bottleneck) ? 'bottleneck' : 'nominal'}`, tone: pipeline.some(p => p.bottleneck) ? 'alert' : 'ok' },
  ];
  return { pipeline, queues, outbreaks, routing, criticalAlerts, timeline, slaBreaches, criticalUnacked, escalationLevel, posture };
}

// ── Doctor clinical deep execution system ──────────────────────────────
// Clinical workforce as a true execution system: a patient→clinician
// assignment board, shift coordination with handover-gap detection, live
// emergency escalation codes, treatment-workflow lanes and workforce
// strain. Pure & deterministic.
const DOC_SPECIALTIES = ['Emergency', 'Internal medicine', 'Surgery', 'Paediatrics', 'Obstetrics', 'ICU / Critical'];
const DOC_CODES = ['Code Blue', 'Code Trauma', 'Code Sepsis', 'Code STEMI', 'Code Stroke'];
export interface ClinicianSlot { specialty: string; onDuty: number; required: number; utilisationPct: number; tone: Tone }
export interface AssignmentRow { patient: string; triage: 1 | 2 | 3 | 4 | 5; specialty: string; assignedTo: string | null; waitMin: number; tone: Tone }
export interface EmergencyCode { id: string; code: string; location: string; clinician: string; ageMin: number; status: 'dispatched' | 'on-scene' | 'stabilising'; tone: Tone }
export interface TreatmentLane { stage: 'Triage' | 'Diagnosis' | 'Treatment' | 'Disposition'; patients: number; throughputPerHr: number; tone: Tone }
export interface DoctorClinicalExecution {
  shift: ClinicianSlot[];
  assignments: AssignmentRow[];
  unassigned: number;
  codes: EmergencyCode[];
  lanes: TreatmentLane[];
  meanWorkloadPct: number;
  burnoutAlerts: number;
  nextShiftGap: number;
  timeline: LabTimelineEvent[];
  posture: 'steady' | 'strained' | 'crisis';
}
export function doctorClinicalExecution(id: string, t: number): DoctorClinicalExecution {
  const shift: ClinicianSlot[] = DOC_SPECIALTIES.map((specialty, i): ClinicianSlot => {
    const required = 6 + Math.round(seed(`dc:rq:${id}:${i}`) * 14);
    const onDuty = Math.max(1, Math.round(required * wave(`dc:od:${id}:${i}`, t, 0.5, 1.05)));
    const utilisationPct = Math.round(Math.min(100, (1 - Math.min(1, onDuty / required)) * 0 + wave(`dc:ut:${id}:${i}`, t, 45, 100)));
    const tone: Tone = onDuty < required * 0.7 || utilisationPct >= 92 ? 'alert' : onDuty < required || utilisationPct >= 80 ? 'warn' : 'ok';
    return { specialty, onDuty, required, utilisationPct, tone };
  });
  const nAssign = 8;
  const assignments: AssignmentRow[] = Array.from({ length: nAssign }, (_, i): AssignmentRow => {
    const triage = (1 + Math.floor(seed(`dc:tg:${id}:${i}`) * 5)) as AssignmentRow['triage'];
    const specialty = DOC_SPECIALTIES[i % DOC_SPECIALTIES.length]!;
    const waitMin = Math.round(wave(`dc:wt:${id}:${i}`, t, 0, 220));
    const slot = shift.find(s => s.specialty === specialty)!;
    const assignedTo = slot.onDuty >= slot.required * 0.7 && seed(`dc:as:${id}:${i}`) > 0.35
      ? `DR-${1000 + (i % 12)}` : null;
    const tone: Tone = triage <= 2 && !assignedTo ? 'alert' : !assignedTo || waitMin > 120 ? 'warn' : 'ok';
    return { patient: `PV-${4000 + i}`, triage, specialty, assignedTo, waitMin, tone };
  }).sort((a, b) => a.triage - b.triage || b.waitMin - a.waitMin);
  const unassigned = assignments.filter(a => !a.assignedTo).length;
  const nCodes = Math.round(wave(`dc:nc:${id}`, t, 0, 5));
  const codes: EmergencyCode[] = Array.from({ length: nCodes }, (_, i): EmergencyCode => {
    const ageMin = Math.round(wave(`dc:cm:${id}:${i}`, t, 0, 40));
    const status: EmergencyCode['status'] = ageMin < 4 ? 'dispatched' : ageMin < 14 ? 'on-scene' : 'stabilising';
    return {
      id: `EC-${700 + i}`, code: DOC_CODES[i % DOC_CODES.length]!,
      location: `${['ED', 'Ward 4', 'ICU', 'Theatre 2', 'Maternity'][i % 5]}`,
      clinician: `DR-${1000 + (i * 3 % 12)}`, ageMin, status,
      tone: ageMin >= 14 ? 'alert' : ageMin >= 4 ? 'warn' : 'ok',
    };
  });
  const lanes: TreatmentLane[] = (['Triage', 'Diagnosis', 'Treatment', 'Disposition'] as const).map((stage, i): TreatmentLane => {
    const patients = Math.round(wave(`dc:ln:${id}:${i}`, t, 4, 220));
    const throughputPerHr = Math.round(wave(`dc:tp:${id}:${i}`, t, 6, 90));
    const tone: Tone = patients > 160 ? 'alert' : patients > 90 ? 'warn' : 'ok';
    return { stage, patients, throughputPerHr, tone };
  });
  const meanWorkloadPct = Math.round(shift.reduce((s, x) => s + x.utilisationPct, 0) / shift.length);
  const burnoutAlerts = shift.filter(s => s.utilisationPct >= 92).length;
  const nextShiftGap = shift.reduce((s, x) => s + Math.max(0, x.required - x.onDuty), 0);
  const criticalCodes = codes.filter(c => c.tone === 'alert').length;
  const posture: DoctorClinicalExecution['posture'] =
    criticalCodes >= 2 || unassigned >= 4 || nextShiftGap >= 18 ? 'crisis'
      : criticalCodes >= 1 || unassigned >= 1 || nextShiftGap >= 6 ? 'strained' : 'steady';
  const timeline: LabTimelineEvent[] = [
    { atHrsAgo: 0, kind: 'sync', detail: `${assignments.length - unassigned}/${assignments.length} patients assigned · mean workload ${meanWorkloadPct}%`, tone: unassigned ? 'warn' : 'ok' },
    { atHrsAgo: 1, kind: 'alert', detail: codes.length ? `${codes.length} active emergency code(s) — oldest ${Math.max(0, ...codes.map(c => c.ageMin))}m` : 'No active emergency codes', tone: criticalCodes ? 'alert' : codes.length ? 'warn' : 'ok' },
    { atHrsAgo: 2, kind: 'escalation', detail: `Next-shift gap ${nextShiftGap} clinician(s) — handover risk`, tone: nextShiftGap >= 12 ? 'alert' : nextShiftGap ? 'warn' : 'ok' },
    { atHrsAgo: 4, kind: 'result', detail: `Treatment lane peak · ${lanes.reduce((m, l) => l.patients > m.patients ? l : m).stage}`, tone: lanes.some(l => l.tone === 'alert') ? 'alert' : 'ok' },
  ];
  return { shift, assignments, unassigned, codes, lanes, meanWorkloadPct, burnoutAlerts, nextShiftGap, timeline, posture };
}

// ── Health finance & claims ────────────────────────────────────────────
export interface HealthFinance {
  insuranceCoveragePct: number;
  claimsPending: number;
  claimsSlaMetPct: number;
  budgetExecutionPct: number;
  fraudFlags: number;
  reimbursementBacklogBn: number;
}
export function healthFinance(id: string, t: number): HealthFinance {
  return {
    insuranceCoveragePct: Math.round(wave(`hf:ic:${id}`, t, 48, 92)),
    claimsPending: Math.round(wave(`hf:cp:${id}`, t, 400, 26000)),
    claimsSlaMetPct: Math.round(wave(`hf:cs:${id}`, t, 56, 96)),
    budgetExecutionPct: Math.round(wave(`hf:be:${id}`, t, 52, 97)),
    fraudFlags: Math.round(seed(`hf:ff:${id}:${Math.floor(t / 8)}`) * 16),
    reimbursementBacklogBn: Math.round(wave(`hf:rb:${id}`, t, 1, 18) * 10) / 10,
  };
}

// ── Regulatory & licensing ─────────────────────────────────────────────
export interface HealthRegulatory {
  facilitiesLicensed: number;
  licensingPending: number;
  accreditationDuePct: number;
  practitionersRegisteredK: number;
  compliancePct: number;
  sanctionsOpen: number;
}
export function healthRegulatory(id: string, t: number): HealthRegulatory {
  return {
    facilitiesLicensed: 1200 + Math.round(seed(`rg:fl:${id}`) * 2600),
    licensingPending: Math.round(wave(`rg:lp:${id}`, t, 40, 1800)),
    accreditationDuePct: Math.round(wave(`rg:ad:${id}`, t, 4, 32)),
    practitionersRegisteredK: Math.round(wave(`rg:pr:${id}`, t, 20, 140)),
    compliancePct: Math.round(wave(`rg:cp:${id}`, t, 62, 97)),
    sanctionsOpen: Math.round(seed(`rg:so:${id}:${Math.floor(t / 9)}`) * 14),
  };
}

// ── Emergency medical command ──────────────────────────────────────────
export interface EmergencyMedical {
  ambulanceFleet: number;
  ambulancesAvailable: number;
  activeDispatches: number;
  meanResponseMin: number;
  disasterPosture: 'standby' | 'elevated' | 'major';
  hospitalDivert: number;
}
export function emergencyMedical(id: string, t: number): EmergencyMedical {
  const fleet = 80 + Math.round(seed(`em:fl:${id}`) * 220);
  const dispatched = Math.round(fleet * wave(`em:dp:${id}`, t, 0.2, 0.78));
  const active = Math.round(wave(`em:ac:${id}`, t, 0, 60));
  return {
    ambulanceFleet: fleet,
    ambulancesAvailable: fleet - dispatched,
    activeDispatches: active,
    meanResponseMin: Math.round(wave(`em:rt:${id}`, t, 5, 28)),
    disasterPosture: active >= 40 ? 'major' : active >= 18 ? 'elevated' : 'standby',
    hospitalDivert: Math.round(wave(`em:hd:${id}`, t, 0, 12)),
  };
}

// ── National health command picture ────────────────────────────────────
export interface HealthCommand {
  posture: 'nominal' | 'elevated' | 'crisis';
  regionalEscalations: { region: string; level: 'nominal' | 'watch' | 'critical'; tone: Tone }[];
  logisticsCorridorsOpen: number;
  logisticsCorridorsTotal: number;
  outbreakAlerts: number;
}
export function healthCommand(id: string, t: number, outbreakAlerts: number): HealthCommand {
  const total = 7;
  const open = Math.max(2, total - Math.round(seed(`hc:co:${id}:${Math.floor(t / 9)}`) * 4));
  const posture: HealthCommand['posture'] = outbreakAlerts >= 4 ? 'crisis' : outbreakAlerts >= 1 ? 'elevated' : 'nominal';
  return {
    posture,
    regionalEscalations: REGIONS.map((region, i): { region: string; level: 'nominal' | 'watch' | 'critical'; tone: Tone } => {
      const s = wave(`hc:re:${id}:${i}`, t, 0, 1);
      const level = s > 0.8 ? 'critical' : s > 0.5 ? 'watch' : 'nominal';
      const tone: Tone = level === 'critical' ? 'alert' : level === 'watch' ? 'warn' : 'ok';
      return { region, level, tone };
    }),
    logisticsCorridorsOpen: open,
    logisticsCorridorsTotal: total,
    outbreakAlerts,
  };
}
