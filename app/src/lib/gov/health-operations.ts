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
