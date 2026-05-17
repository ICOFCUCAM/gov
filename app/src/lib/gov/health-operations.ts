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

// ── Pharmaceutical deep execution system ───────────────────────────────
// Inventory management with depletion prediction, regional medicine
// routing, a procurement pipeline and an emergency-redistribution queue
// as a true execution system. Pure & deterministic.
export interface DrugInventory { drug: string; coverDays: number; monthlyBurn: number; stockoutEtaDays: number; status: 'ok' | 'reorder' | 'critical' | 'stockout'; tone: Tone }
export interface PharmaRegionFill { region: string; fillRatePct: number; shortages: number; action: 'stocked' | 'replenish' | 'redistribute'; tone: Tone }
export interface ProcurementStage { stage: 'Requisition' | 'Tender' | 'Awarded' | 'In transit' | 'Received'; count: number; valueM: number; tone: Tone }
export interface RedistributionOrder { id: string; drug: string; fromRegion: string; toRegion: string; units: number; status: 'proposed' | 'authorised' | 'in-transit'; tone: Tone }
export interface PharmaceuticalDeepExecution {
  inventory: DrugInventory[];
  regions: PharmaRegionFill[];
  procurement: ProcurementStage[];
  redistribution: RedistributionOrder[];
  criticalDrugs: number;
  emergencyOrders: number;
  nationalCoverDays: number;
  timeline: LabTimelineEvent[];
  posture: 'secure' | 'strained' | 'shortage';
}
export function pharmaceuticalDeepExecution(id: string, t: number): PharmaceuticalDeepExecution {
  const base = pharmaceuticalSupply(id, t);
  const inventory: DrugInventory[] = base.drugs.map((d, i): DrugInventory => {
    const monthlyBurn = Math.round(wave(`pd:mb:${id}:${i}`, t, 1800, 30000));
    const stockoutEtaDays = d.coverDays;
    const status: DrugInventory['status'] =
      d.coverDays <= 0 ? 'stockout' : d.coverDays < 14 ? 'critical' : d.coverDays < 25 ? 'reorder' : 'ok';
    const tone: Tone = status === 'stockout' || status === 'critical' ? 'alert' : status === 'reorder' ? 'warn' : 'ok';
    return { drug: d.drug, coverDays: d.coverDays, monthlyBurn, stockoutEtaDays, status, tone };
  }).sort((a, b) => a.coverDays - b.coverDays);
  const regions: PharmaRegionFill[] = REGIONS.map((region, i): PharmaRegionFill => {
    const fillRatePct = Math.round(wave(`pd:fr:${id}:${i}`, t, 35, 100));
    const shortages = Math.round(wave(`pd:sh:${id}:${i}`, t, 0, 9));
    const action: PharmaRegionFill['action'] = fillRatePct < 55 || shortages >= 6 ? 'redistribute' : fillRatePct < 78 || shortages >= 2 ? 'replenish' : 'stocked';
    const tone: Tone = action === 'redistribute' ? 'alert' : action === 'replenish' ? 'warn' : 'ok';
    return { region, fillRatePct, shortages, action, tone };
  }).sort((a, b) => a.fillRatePct - b.fillRatePct);
  const procurement: ProcurementStage[] = (['Requisition', 'Tender', 'Awarded', 'In transit', 'Received'] as const).map((stage, i): ProcurementStage => {
    const count = Math.round(wave(`pd:pc:${id}:${i}`, t, 1, 36));
    const valueM = Math.round(wave(`pd:pv:${id}:${i}`, t, 2, 180));
    const tone: Tone = stage === 'Requisition' && count > 24 ? 'warn' : 'ok';
    return { stage, count, valueM, tone };
  });
  const nRedist = Math.round(wave(`pd:nr:${id}`, t, 0, 6));
  const redistribution: RedistributionOrder[] = Array.from({ length: nRedist }, (_, i): RedistributionOrder => {
    const st = wave(`pd:rs:${id}:${i}`, t, 0, 1);
    const status: RedistributionOrder['status'] = st > 0.66 ? 'in-transit' : st > 0.33 ? 'authorised' : 'proposed';
    return {
      id: `RD-${500 + i}`,
      drug: base.drugs[i % base.drugs.length]!.drug,
      fromRegion: REGIONS[i % REGIONS.length]!,
      toRegion: REGIONS[(i + 3) % REGIONS.length]!,
      units: 500 + Math.round(wave(`pd:ru:${id}:${i}`, t, 0, 9500)),
      status,
      tone: status === 'proposed' ? 'warn' : 'ok',
    };
  });
  const criticalDrugs = inventory.filter(d => d.status === 'critical' || d.status === 'stockout').length;
  const emergencyOrders = redistribution.filter(r => r.status === 'proposed').length;
  const nationalCoverDays = Math.round(inventory.reduce((s, d) => s + d.coverDays, 0) / inventory.length);
  const redistRegions = regions.filter(r => r.action === 'redistribute').length;
  const posture: PharmaceuticalDeepExecution['posture'] =
    criticalDrugs >= 3 || redistRegions >= 2 ? 'shortage'
      : criticalDrugs >= 1 || redistRegions >= 1 ? 'strained' : 'secure';
  const timeline: LabTimelineEvent[] = [
    { atHrsAgo: 0, kind: 'sync', detail: `National cover ${nationalCoverDays}d · ${base.pipelineInTransit} units in transit`, tone: nationalCoverDays < 21 ? 'warn' : 'ok' },
    { atHrsAgo: 1, kind: 'alert', detail: `${criticalDrugs} drug class(es) critical/stockout · worst ${inventory[0]!.drug} ${inventory[0]!.coverDays}d`, tone: criticalDrugs ? 'alert' : 'ok' },
    { atHrsAgo: 2, kind: 'reroute', detail: `${emergencyOrders} emergency redistribution order(s) awaiting authorisation`, tone: emergencyOrders ? 'warn' : 'ok' },
    { atHrsAgo: 4, kind: 'result', detail: `${base.expiringSoon} batch(es) expiring soon · ${base.procurementOpen} procurements open`, tone: base.expiringSoon > 80 ? 'warn' : 'ok' },
  ];
  return { inventory, regions, procurement, redistribution, criticalDrugs, emergencyOrders, nationalCoverDays, timeline, posture };
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

// ── Health finance deep execution system ───────────────────────────────
// Insurance orchestration, a claims-adjudication pipeline, fraud-detection
// case queue, reimbursement chains and treasury coordination as a true
// execution system. Pure & deterministic.
export interface ClaimsStage { stage: 'Submitted' | 'Adjudication' | 'Approved' | 'Paid' | 'Denied'; count: number; valueM: number; tone: Tone }
export interface InsuranceScheme { scheme: string; coveredM: number; collectionPct: number; claimsRatioPct: number; solvency: 'solvent' | 'pressured' | 'deficit'; tone: Tone }
export interface FraudCase { id: string; pattern: string; exposureM: number; confidencePct: number; status: 'flagged' | 'investigating' | 'referred'; tone: Tone }
export interface ReimbursementChain { tier: string; owedM: number; ageDays: number; tone: Tone }
export interface HealthFinanceExecution {
  claims: ClaimsStage[];
  schemes: InsuranceScheme[];
  fraud: FraudCase[];
  reimbursement: ReimbursementChain[];
  treasuryDrawdownPct: number;
  fraudExposureM: number;
  posture: 'solvent' | 'strained' | 'distressed';
}
export function healthFinanceExecution(id: string, t: number): HealthFinanceExecution {
  const claims: ClaimsStage[] = (['Submitted', 'Adjudication', 'Approved', 'Paid', 'Denied'] as const).map((stage, i): ClaimsStage => {
    const count = Math.round(wave(`hfx:c:${id}:${i}`, t, 200, 22000));
    const valueM = Math.round(wave(`hfx:v:${id}:${i}`, t, 4, 320));
    const tone: Tone = stage === 'Adjudication' && count > 14000 ? 'alert' : stage === 'Denied' && count > 6000 ? 'warn' : 'ok';
    return { stage, count, valueM, tone };
  });
  const schemes: InsuranceScheme[] = ['National Health Insurance', 'Civil-service scheme', 'Indigent cover', 'Maternity & child', 'Chronic-illness fund'].map((scheme, i): InsuranceScheme => {
    const collectionPct = Math.round(wave(`hfx:cl:${id}:${i}`, t, 52, 99));
    const claimsRatioPct = Math.round(wave(`hfx:cr:${id}:${i}`, t, 62, 128));
    const solvency: InsuranceScheme['solvency'] = claimsRatioPct > 108 ? 'deficit' : claimsRatioPct > 95 ? 'pressured' : 'solvent';
    const tone: Tone = solvency === 'deficit' ? 'alert' : solvency === 'pressured' ? 'warn' : 'ok';
    return { scheme, coveredM: Math.round(wave(`hfx:cm:${id}:${i}`, t, 1, 22) * 10) / 10, collectionPct, claimsRatioPct, solvency, tone };
  }).sort((a, b) => b.claimsRatioPct - a.claimsRatioPct);
  const nFraud = Math.round(wave(`hfx:nf:${id}`, t, 0, 6));
  const fraud: FraudCase[] = Array.from({ length: nFraud }, (_, i): FraudCase => {
    const confidencePct = Math.round(wave(`hfx:fc:${id}:${i}`, t, 45, 99));
    const st = seed(`hfx:fs:${id}:${i}`);
    const status: FraudCase['status'] = st > 0.7 ? 'referred' : st > 0.4 ? 'investigating' : 'flagged';
    return {
      id: `FR-${300 + i}`,
      pattern: ['Phantom billing', 'Upcoding', 'Duplicate claims', 'Ghost providers', 'Kickback ring', 'Eligibility fraud'][i % 6]!,
      exposureM: Math.round(wave(`hfx:fe:${id}:${i}`, t, 1, 90)),
      confidencePct, status,
      tone: confidencePct >= 80 ? 'alert' : confidencePct >= 60 ? 'warn' : 'ok',
    };
  }).sort((a, b) => b.exposureM - a.exposureM);
  const reimbursement: ReimbursementChain[] = ['Public hospitals', 'Private providers', 'Pharmacies', 'Diagnostic labs'].map((tier, i): ReimbursementChain => {
    const owedM = Math.round(wave(`hfx:ro:${id}:${i}`, t, 5, 480));
    const ageDays = Math.round(wave(`hfx:ra:${id}:${i}`, t, 4, 150));
    const tone: Tone = ageDays >= 90 || owedM > 360 ? 'alert' : ageDays >= 45 || owedM > 180 ? 'warn' : 'ok';
    return { tier, owedM, ageDays, tone };
  });
  const treasuryDrawdownPct = Math.round(wave(`hfx:td:${id}`, t, 35, 100));
  const fraudExposureM = fraud.reduce((s, f) => s + f.exposureM, 0);
  const deficits = schemes.filter(s => s.solvency === 'deficit').length;
  const posture: HealthFinanceExecution['posture'] =
    deficits >= 2 || treasuryDrawdownPct >= 95 || fraudExposureM > 240 ? 'distressed'
      : deficits >= 1 || treasuryDrawdownPct >= 85 || fraudExposureM > 90 ? 'strained' : 'solvent';
  return { claims, schemes, fraud, reimbursement, treasuryDrawdownPct, fraudExposureM, posture };
}

// ── Disease intelligence deep epidemiology engine ──────────────────────
// Not a heatmap row: per-pathogen epidemiological intelligence (Rt,
// doubling time, attack rate, CFR), a region×severity grid, a predictive
// spread curve with peak estimate, and intervention modelling that
// projects case reduction under containment / vaccination. Pure &
// deterministic.
const EPI_PATHOGENS = ['Cholera', 'Measles', 'Influenza A(H3)', 'Dengue', 'Meningococcal', 'Viral haemorrhagic'];
export interface PathogenIntel {
  pathogen: string;
  rt: number;
  doublingDays: number;
  attackRatePer100k: number;
  cfrPct: number;
  trend: 'rising' | 'plateau' | 'declining';
  phase: 'sporadic' | 'cluster' | 'epidemic';
  tone: Tone;
}
export interface EpiGridCell { region: string; pathogen: string; intensity: number; severity: 'contained' | 'active' | 'critical'; tone: Tone }
export interface SpreadPoint { tPlusDays: number; projected: number; lower: number; upper: number }
export interface InterventionScenario { scenario: 'No action' | 'Containment' | 'Mass vaccination' | 'Combined'; peakCases: number; reductionPct: number; tone: Tone }
export interface DiseaseEpidemiology {
  pathogens: PathogenIntel[];
  grid: EpiGridCell[];
  spread: SpreadPoint[];
  peakInDays: number;
  scenarios: InterventionScenario[];
  dominantPathogen: string;
  nationalRt: number;
  posture: 'surveillance' | 'response' | 'epidemic';
}
export function diseaseEpidemiology(id: string, t: number): DiseaseEpidemiology {
  const pathogens: PathogenIntel[] = EPI_PATHOGENS.map((pathogen, i): PathogenIntel => {
    const rt = Math.round(wave(`ep:rt:${id}:${i}`, t, 0.5, 2.6) * 100) / 100;
    const doublingDays = rt > 1 ? Math.max(1, Math.round(10 / (rt - 1 + 0.15))) : 99;
    const attackRatePer100k = Math.round(wave(`ep:ar:${id}:${i}`, t, 2, 480));
    const cfrPct = Math.round(wave(`ep:cf:${id}:${i}`, t, 0, 14) * 10) / 10;
    const trend: PathogenIntel['trend'] = rt > 1.15 ? 'rising' : rt > 0.95 ? 'plateau' : 'declining';
    const phase: PathogenIntel['phase'] = rt > 1.3 && attackRatePer100k > 200 ? 'epidemic' : rt > 1.05 ? 'cluster' : 'sporadic';
    const tone: Tone = phase === 'epidemic' ? 'alert' : phase === 'cluster' ? 'warn' : 'ok';
    return { pathogen, rt, doublingDays, attackRatePer100k, cfrPct, trend, phase, tone };
  }).sort((a, b) => b.rt - a.rt);
  const grid: EpiGridCell[] = [];
  for (const r of REGIONS) {
    for (let p = 0; p < 3; p++) {
      const pathogen = pathogens[p]!.pathogen;
      const intensity = Math.round(wave(`ep:gi:${id}:${r}:${p}`, t, 0, 100));
      const severity: EpiGridCell['severity'] = intensity >= 70 ? 'critical' : intensity >= 38 ? 'active' : 'contained';
      grid.push({ region: r, pathogen, intensity, severity, tone: severity === 'critical' ? 'alert' : severity === 'active' ? 'warn' : 'ok' });
    }
  }
  const lead = pathogens[0]!;
  const base = Math.round(wave(`ep:bc:${id}`, t, 200, 6000));
  const spread: SpreadPoint[] = [0, 7, 14, 21, 30].map((tPlusDays): SpreadPoint => {
    const growth = Math.pow(Math.max(0.6, lead.rt), tPlusDays / Math.max(3, lead.doublingDays));
    const projected = Math.round(base * growth);
    return { tPlusDays, projected, lower: Math.round(projected * 0.78), upper: Math.round(projected * 1.3) };
  });
  // peak when Rt-driven growth saturates the susceptible pool (bounded model)
  const peakInDays = lead.rt <= 1 ? 0 : Math.min(60, Math.round(lead.doublingDays * 3.2));
  const peakNoAction = spread.at(-1)!.upper;
  const scenarios: InterventionScenario[] = [
    { scenario: 'No action', peakCases: peakNoAction, reductionPct: 0, tone: 'alert' },
    { scenario: 'Containment', peakCases: Math.round(peakNoAction * 0.62), reductionPct: 38, tone: 'warn' },
    { scenario: 'Mass vaccination', peakCases: Math.round(peakNoAction * 0.5), reductionPct: 50, tone: 'warn' },
    { scenario: 'Combined', peakCases: Math.round(peakNoAction * 0.31), reductionPct: 69, tone: 'ok' },
  ];
  const epidemic = pathogens.filter(p => p.phase === 'epidemic').length;
  const posture: DiseaseEpidemiology['posture'] =
    epidemic >= 2 || lead.rt > 1.5 ? 'epidemic' : epidemic >= 1 || lead.rt > 1.1 ? 'response' : 'surveillance';
  return { pathogens, grid, spread, peakInDays, scenarios, dominantPathogen: lead.pathogen, nationalRt: lead.rt, posture };
}

// ── Emergency incident deep execution system ───────────────────────────
// Pre-hospital command as a true master/detail execution system: a live
// incident board where every incident carries its own command core —
// stage machine, assigned responders, hospital routing, escalation
// matrix, recommended action and an incident timeline. Pure &
// deterministic.
export type IncidentStage = 'Received' | 'Dispatched' | 'On scene' | 'Transporting' | 'Cleared';
const INC_STAGES: IncidentStage[] = ['Received', 'Dispatched', 'On scene', 'Transporting', 'Cleared'];
const INC_TYPES = ['Cardiac arrest', 'Major trauma / RTA', 'Obstetric emergency', 'Respiratory distress', 'Mass-casualty', 'Stroke', 'Paediatric critical', 'Toxic exposure'];
export interface IncidentResponder { unit: string; kind: 'ALS ambulance' | 'BLS ambulance' | 'Rapid responder' | 'Air ambulance'; etaMin: number; status: 'assigned' | 'en route' | 'on scene'; tone: Tone }
export interface IncidentEscalationStep { tier: string; reached: boolean; authority: string }
export interface EmergencyIncident {
  id: string;
  type: string;
  region: string;
  severity: 1 | 2 | 3;            // 1 = immediate
  stage: IncidentStage;
  ageMin: number;
  callerReports: number;
  responders: IncidentResponder[];
  destinationHospital: string;
  hospitalAccepting: boolean;
  rerouted: boolean;
  escalation: IncidentEscalationStep[];
  recommended: string;
  timeline: { atMinAgo: number; detail: string; tone: Tone }[];
  tone: Tone;
}
export interface EmergencyIncidentExecution {
  incidents: EmergencyIncident[];
  immediate: number;
  unitsCommitted: number;
  meanDispatchMin: number;
  divertActive: boolean;
  posture: 'steady' | 'surge' | 'mci';
}
export function emergencyIncidentExecution(id: string, t: number): EmergencyIncidentExecution {
  const base = emergencyMedical(id, t);
  const n = 6 + Math.round(wave(`ei:n:${id}`, t, 0, 6));
  const incidents: EmergencyIncident[] = Array.from({ length: n }, (_, i): EmergencyIncident => {
    const severity = (1 + Math.floor(seed(`ei:sv:${id}:${i}`) * 3)) as 1 | 2 | 3;
    const stPhase = Math.floor((t / 4 + seed(`ei:sp:${id}:${i}`) * 5)) % 5;
    const stage = INC_STAGES[stPhase]!;
    const ageMin = Math.round(wave(`ei:ag:${id}:${i}`, t, 1, 120));
    const region = REGIONS[i % REGIONS.length]!;
    const nResp = severity === 1 ? 3 : severity === 2 ? 2 : 1;
    const responders: IncidentResponder[] = Array.from({ length: nResp }, (_, r): IncidentResponder => {
      const etaMin = Math.round(wave(`ei:re:${id}:${i}:${r}`, t, 0, 26));
      const kind = (['ALS ambulance', 'Rapid responder', 'BLS ambulance', 'Air ambulance'] as const)[(i + r) % 4]!;
      const rs = stage === 'Received' ? 'assigned' : stage === 'Dispatched' ? 'en route' : 'on scene';
      return { unit: `${kind === 'Air ambulance' ? 'HEMS' : 'EMS'}-${100 + i * 3 + r}`, kind, etaMin, status: rs, tone: etaMin >= 18 ? 'alert' : etaMin >= 10 ? 'warn' : 'ok' };
    });
    const hospitalAccepting = seed(`ei:ha:${id}:${i}`) > 0.25 && !(base.hospitalDivert > 2 && severity >= 2);
    const rerouted = !hospitalAccepting;
    const escTiers = ['Station', 'Regional EOC', 'National EMS', 'Health Command'];
    const escIdx = severity === 1 ? (stage === 'Cleared' ? 1 : 3) : severity === 2 ? 2 : 1;
    const escalation: IncidentEscalationStep[] = escTiers.map((tier, k) => ({
      tier, reached: k <= escIdx,
      authority: ['Duty officer', 'Regional controller', 'National EMS director', 'Health Command'][k]!,
    }));
    const tone: Tone = severity === 1 && stage !== 'Cleared' ? 'alert' : severity === 2 || ageMin > 60 ? 'warn' : 'ok';
    const recommended =
      rerouted ? `Re-route — destination diverting; nearest accepting facility`
        : stage === 'Received' ? 'Dispatch nearest ALS unit now'
          : stage === 'On scene' && severity === 1 ? 'Confirm transport decision · pre-alert receiving ED'
            : stage === 'Transporting' ? 'Pre-alert hospital · maintain handover chain'
              : 'Hold — incident progressing within protocol';
    return {
      id: `INC-${5200 + i}`, type: INC_TYPES[i % INC_TYPES.length]!, region, severity, stage, ageMin,
      callerReports: 1 + Math.round(seed(`ei:cr:${id}:${i}`) * 6),
      responders,
      destinationHospital: ['Central Trauma', 'Northern District', 'Coastal Referral', 'Highland General', 'Eastern Referral'][i % 5]!,
      hospitalAccepting, rerouted, escalation, recommended,
      timeline: [
        { atMinAgo: ageMin, detail: `${base ? 'Call received' : ''} · ${1 + Math.round(seed(`ei:cr:${id}:${i}`) * 6)} caller report(s)`, tone: 'ok' },
        { atMinAgo: Math.max(0, ageMin - 3), detail: `${responders.length} unit(s) assigned`, tone: 'ok' },
        { atMinAgo: Math.max(0, ageMin - 9), detail: stage === 'Received' ? 'Awaiting dispatch' : `Stage → ${stage}`, tone: stage === 'Received' && severity === 1 ? 'alert' : 'warn' },
        { atMinAgo: Math.max(0, ageMin - 14), detail: rerouted ? 'Destination diverting — reroute evaluated' : `Destination ${['Central Trauma', 'Northern District', 'Coastal Referral', 'Highland General', 'Eastern Referral'][i % 5]} accepting`, tone: rerouted ? 'alert' : 'ok' },
      ],
      tone,
    };
  }).sort((a, b) => a.severity - b.severity || b.ageMin - a.ageMin);
  const immediate = incidents.filter(x => x.severity === 1 && x.stage !== 'Cleared').length;
  const unitsCommitted = incidents.reduce((s, x) => s + x.responders.length, 0);
  const meanDispatchMin = base.meanResponseMin;
  const divertActive = base.hospitalDivert > 2;
  const posture: EmergencyIncidentExecution['posture'] =
    base.disasterPosture === 'major' || immediate >= 3 ? 'mci'
      : base.disasterPosture === 'elevated' || immediate >= 1 || divertActive ? 'surge' : 'steady';
  return { incidents, immediate, unitsCommitted, meanDispatchMin, divertActive, posture };
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

// ── Hospital network deep execution system ─────────────────────────────
// ICU orchestration, bed intelligence, operating-theatre management,
// ambulance coordination and national capacity telemetry as a true
// execution system. Pure & deterministic.
export interface HospRegionCapacity { region: string; bedOccPct: number; icuOccPct: number; surge: 'nominal' | 'surge' | 'divert'; transfersPending: number; tone: Tone }
export interface IcuUnit { unit: string; beds: number; occupied: number; ventilated: number; ecmo: number; escalation: 'stable' | 'stretched' | 'critical'; tone: Tone }
export interface TheatreSlot { theatre: string; caseType: 'Elective' | 'Emergency' | 'Trauma'; status: 'in-progress' | 'turnover' | 'delayed' | 'scheduled'; delayMin: number; tone: Tone }
export interface AmbulanceZone { zone: string; units: number; available: number; meanEtaMin: number; posture: 'covered' | 'thin' | 'critical'; tone: Tone }
export interface HospitalDeepExecution {
  regions: HospRegionCapacity[];
  icu: IcuUnit[];
  theatres: TheatreSlot[];
  ambulanceZones: AmbulanceZone[];
  nationalBedHeadroomPct: number;
  transferRequests: number;
  blockedBeds: number;
  admissionsPerHr: number;
  dischargesPerHr: number;
  timeline: LabTimelineEvent[];
  posture: 'steady' | 'strained' | 'crisis';
}
export function hospitalDeepExecution(id: string, t: number): HospitalDeepExecution {
  const regions: HospRegionCapacity[] = REGIONS.map((region, i): HospRegionCapacity => {
    const bedOccPct = Math.round(wave(`hd:bo:${id}:${i}`, t, 55, 102));
    const icuOccPct = Math.round(wave(`hd:io:${id}:${i}`, t, 50, 104));
    const surge: HospRegionCapacity['surge'] = bedOccPct >= 98 || icuOccPct >= 98 ? 'divert' : bedOccPct >= 88 || icuOccPct >= 90 ? 'surge' : 'nominal';
    const transfersPending = Math.round(wave(`hd:tp:${id}:${i}`, t, 0, 24));
    const tone: Tone = surge === 'divert' ? 'alert' : surge === 'surge' ? 'warn' : 'ok';
    return { region, bedOccPct, icuOccPct, surge, transfersPending, tone };
  }).sort((a, b) => b.icuOccPct - a.icuOccPct);
  const icu: IcuUnit[] = ['Medical ICU', 'Surgical ICU', 'Neonatal ICU', 'Cardiac ICU'].map((unit, i): IcuUnit => {
    const beds = 14 + Math.round(seed(`hd:ib:${id}:${i}`) * 26);
    const occupied = Math.round(beds * wave(`hd:iu:${id}:${i}`, t, 0.55, 1.04));
    const ventilated = Math.round(Math.min(occupied, occupied * wave(`hd:vt:${id}:${i}`, t, 0.4, 0.95)));
    const ecmo = Math.round(wave(`hd:ec:${id}:${i}`, t, 0, 5));
    const ratio = occupied / beds;
    const escalation: IcuUnit['escalation'] = ratio >= 1 ? 'critical' : ratio >= 0.88 ? 'stretched' : 'stable';
    const tone: Tone = escalation === 'critical' ? 'alert' : escalation === 'stretched' ? 'warn' : 'ok';
    return { unit, beds, occupied: Math.min(occupied, beds + 2), ventilated, ecmo, escalation, tone };
  });
  const theatres: TheatreSlot[] = Array.from({ length: 8 }, (_, i): TheatreSlot => {
    const caseType: TheatreSlot['caseType'] = i % 4 === 0 ? 'Trauma' : i % 3 === 0 ? 'Emergency' : 'Elective';
    const delayMin = Math.round(wave(`hd:td:${id}:${i}`, t, 0, 140));
    const status: TheatreSlot['status'] = delayMin > 90 ? 'delayed' : i % 5 === 0 ? 'turnover' : delayMin > 0 && i % 2 === 0 ? 'in-progress' : 'scheduled';
    const tone: Tone = status === 'delayed' ? 'alert' : status === 'turnover' ? 'warn' : 'ok';
    return { theatre: `OR-${i + 1}`, caseType, status, delayMin, tone };
  });
  const ambulanceZones: AmbulanceZone[] = REGIONS.slice(0, 5).map((zone, i): AmbulanceZone => {
    const units = 8 + Math.round(seed(`hd:au:${id}:${i}`) * 26);
    const available = Math.round(units * wave(`hd:aa:${id}:${i}`, t, 0.15, 0.85));
    const meanEtaMin = Math.round(wave(`hd:ae:${id}:${i}`, t, 5, 32));
    const ratio = available / units;
    const posture: AmbulanceZone['posture'] = ratio < 0.15 || meanEtaMin >= 24 ? 'critical' : ratio < 0.35 || meanEtaMin >= 15 ? 'thin' : 'covered';
    const tone: Tone = posture === 'critical' ? 'alert' : posture === 'thin' ? 'warn' : 'ok';
    return { zone, units, available, meanEtaMin, posture, tone };
  });
  const nationalBedHeadroomPct = Math.max(0, Math.round(100 - regions.reduce((s, r) => s + r.bedOccPct, 0) / regions.length));
  const transferRequests = regions.reduce((s, r) => s + r.transfersPending, 0);
  const blockedBeds = Math.round(wave(`hd:bb:${id}`, t, 10, 420));
  const admissionsPerHr = Math.round(wave(`hd:ad:${id}`, t, 20, 180));
  const dischargesPerHr = Math.round(wave(`hd:di:${id}`, t, 18, 175));
  const diverts = regions.filter(r => r.surge === 'divert').length;
  const criticalIcu = icu.filter(u => u.escalation === 'critical').length;
  const posture: HospitalDeepExecution['posture'] =
    diverts >= 2 || criticalIcu >= 2 || nationalBedHeadroomPct < 4 ? 'crisis'
      : diverts >= 1 || criticalIcu >= 1 || nationalBedHeadroomPct < 12 ? 'strained' : 'steady';
  const timeline: LabTimelineEvent[] = [
    { atHrsAgo: 0, kind: 'sync', detail: `National bed headroom ${nationalBedHeadroomPct}% · ${admissionsPerHr}↓/${dischargesPerHr}↑ per hr`, tone: nationalBedHeadroomPct < 12 ? 'warn' : 'ok' },
    { atHrsAgo: 1, kind: 'escalation', detail: `${diverts} region(s) on divert · ${transferRequests} inter-facility transfers pending`, tone: diverts ? 'alert' : transferRequests > 30 ? 'warn' : 'ok' },
    { atHrsAgo: 2, kind: 'alert', detail: `${criticalIcu} ICU unit(s) at/over capacity`, tone: criticalIcu ? 'alert' : 'ok' },
    { atHrsAgo: 3, kind: 'reroute', detail: `${theatres.filter(x => x.status === 'delayed').length} theatre(s) delayed · ${blockedBeds} blocked beds`, tone: theatres.some(x => x.status === 'delayed') ? 'warn' : 'ok' },
  ];
  return { regions, icu, theatres, ambulanceZones, nationalBedHeadroomPct, transferRequests, blockedBeds, admissionsPerHr, dischargesPerHr, timeline, posture };
}

// ── Patient deep execution system ──────────────────────────────────────
// Citizen-facing health as a true execution system: an intake workflow
// board, records & prescription integrity, appointment throughput,
// vaccination-coverage intelligence and emergency citizen status. Pure &
// deterministic.
export interface IntakeRow { id: string; channel: 'Walk-in' | 'Referral' | 'Ambulance' | 'Telehealth'; triage: 1 | 2 | 3 | 4 | 5; stage: 'registration' | 'triage' | 'clinician' | 'admitted'; waitMin: number; tone: Tone }
export interface RxIntegrity { category: string; issued: number; flagged: number; interactionAlerts: number; tone: Tone }
export interface VaxCoverage { vaccine: string; coveragePct: number; trend: 'rising' | 'stable' | 'falling'; tone: Tone }
export interface CitizenEmergencyStatus { id: string; citizen: string; status: 'critical' | 'admitted' | 'observation'; facility: string; ageMin: number; tone: Tone }
export interface PatientDeepExecution {
  intake: IntakeRow[];
  unrouted: number;
  rx: RxIntegrity[];
  vaccination: VaxCoverage[];
  emergencyStatuses: CitizenEmergencyStatus[];
  recordsIntegrityPct: number;
  appointmentsHonouredPct: number;
  meanIntakeWaitMin: number;
  timeline: LabTimelineEvent[];
  posture: 'steady' | 'strained' | 'crisis';
}
export function patientDeepExecution(id: string, t: number): PatientDeepExecution {
  const intake: IntakeRow[] = Array.from({ length: 9 }, (_, i): IntakeRow => {
    const triage = (1 + Math.floor(seed(`pe:tg:${id}:${i}`) * 5)) as IntakeRow['triage'];
    const channel = (['Walk-in', 'Referral', 'Ambulance', 'Telehealth'] as const)[i % 4]!;
    const stPhase = Math.floor((t / 5 + seed(`pe:st:${id}:${i}`) * 4)) % 4;
    const stage = (['registration', 'triage', 'clinician', 'admitted'] as const)[stPhase]!;
    const waitMin = Math.round(wave(`pe:wt:${id}:${i}`, t, 0, 240));
    const tone: Tone = triage <= 2 && stage !== 'clinician' && stage !== 'admitted' ? 'alert' : waitMin > 140 ? 'warn' : 'ok';
    return { id: `IN-${600 + i}`, channel, triage, stage, waitMin, tone };
  }).sort((a, b) => a.triage - b.triage || b.waitMin - a.waitMin);
  const unrouted = intake.filter(r => r.stage === 'registration' || r.stage === 'triage').length;
  const rx: RxIntegrity[] = ['Antibiotics', 'Analgesics', 'Chronic-care', 'Controlled', 'Paediatric'].map((category, i): RxIntegrity => {
    const issued = Math.round(wave(`pe:rx:${id}:${i}`, t, 200, 14000));
    const flagged = Math.round(wave(`pe:rf:${id}:${i}`, t, 0, 240));
    const interactionAlerts = Math.round(wave(`pe:ri:${id}:${i}`, t, 0, 90));
    const tone: Tone = flagged > 150 || interactionAlerts > 60 ? 'alert' : flagged > 60 || interactionAlerts > 25 ? 'warn' : 'ok';
    return { category, issued, flagged, interactionAlerts, tone };
  });
  const vaccination: VaxCoverage[] = ['Routine childhood', 'Measles (MR)', 'Influenza', 'HPV', 'COVID booster'].map((vaccine, i): VaxCoverage => {
    const coveragePct = Math.round(wave(`pe:vx:${id}:${i}`, t, 38, 97));
    const tr = wave(`pe:vt:${id}:${i}`, t, 0, 1);
    const trend: VaxCoverage['trend'] = tr > 0.66 ? 'rising' : tr > 0.33 ? 'stable' : 'falling';
    const tone: Tone = coveragePct < 60 ? 'alert' : coveragePct < 80 ? 'warn' : 'ok';
    return { vaccine, coveragePct, trend, tone };
  }).sort((a, b) => a.coveragePct - b.coveragePct);
  const nEmg = Math.round(wave(`pe:ne:${id}`, t, 0, 6));
  const emergencyStatuses: CitizenEmergencyStatus[] = Array.from({ length: nEmg }, (_, i): CitizenEmergencyStatus => {
    const sv = wave(`pe:es:${id}:${i}`, t, 0, 1);
    const status: CitizenEmergencyStatus['status'] = sv > 0.7 ? 'critical' : sv > 0.4 ? 'admitted' : 'observation';
    return {
      id: `ES-${800 + i}`, citizen: `CZ-${70000 + (i * 137 % 9000)}`,
      status, facility: ['Central', 'Northern District', 'Coastal', 'Highland', 'Eastern Referral'][i % 5]!,
      ageMin: Math.round(wave(`pe:ea:${id}:${i}`, t, 1, 180)),
      tone: status === 'critical' ? 'alert' : status === 'admitted' ? 'warn' : 'ok',
    };
  });
  const recordsIntegrityPct = Math.round(wave(`pe:ri2:${id}`, t, 94, 100) * 100) / 100;
  const appointmentsHonouredPct = Math.round(wave(`pe:ah:${id}`, t, 58, 96));
  const meanIntakeWaitMin = Math.round(intake.reduce((s, r) => s + r.waitMin, 0) / intake.length);
  const acuteUnrouted = intake.filter(r => r.triage <= 2 && (r.stage === 'registration' || r.stage === 'triage')).length;
  const critEmg = emergencyStatuses.filter(e => e.status === 'critical').length;
  const posture: PatientDeepExecution['posture'] =
    acuteUnrouted >= 2 || critEmg >= 3 || recordsIntegrityPct < 96 ? 'crisis'
      : acuteUnrouted >= 1 || critEmg >= 1 || meanIntakeWaitMin > 90 ? 'strained' : 'steady';
  const timeline: LabTimelineEvent[] = [
    { atHrsAgo: 0, kind: 'sync', detail: `${intake.length - unrouted}/${intake.length} intake routed · mean wait ${meanIntakeWaitMin}m`, tone: unrouted ? 'warn' : 'ok' },
    { atHrsAgo: 1, kind: 'alert', detail: `${critEmg} citizen(s) in critical emergency status`, tone: critEmg ? 'alert' : 'ok' },
    { atHrsAgo: 2, kind: 'result', detail: `Records integrity ${recordsIntegrityPct}% · appointments honoured ${appointmentsHonouredPct}%`, tone: recordsIntegrityPct < 97 ? 'warn' : 'ok' },
    { atHrsAgo: 4, kind: 'escalation', detail: `Lowest vaccination coverage · ${vaccination[0]!.vaccine} ${vaccination[0]!.coveragePct}% (${vaccination[0]!.trend})`, tone: vaccination[0]!.tone },
  ];
  return { intake, unrouted, rx, vaccination, emergencyStatuses, recordsIntegrityPct, appointmentsHonouredPct, meanIntakeWaitMin, timeline, posture };
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
