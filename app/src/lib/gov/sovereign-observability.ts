// lib/gov/sovereign-observability.ts
//
// The Ministry of Interior national transaction observability + deadline
// enforcement + anti-corruption runtime. ONE deterministic sovereign
// ledger: every citizen-facing Interior transaction is nationally
// observable, deadline-governed, and continuously scored for obstruction
// /bribery risk. Pure (no React/DOM); SSR-stable per operational epoch and
// "alive" as the epoch advances. Folds the live filed-record store in so
// the runtime is connected to real bureaucratic activity, not synthetic.

import { seed, wave } from '@/lib/telemetry';
import { nationalRecords } from '@/lib/gov/records-store';

export type Agency =
  | 'POLICE' | 'IMMIGRATION' | 'CIVIL_REGISTRY' | 'MUNICIPAL' | 'LICENSING'
  | 'CORRECTIONS' | 'REGIONAL' | 'EMERGENCY' | 'CITIZEN_SERVICES' | 'NATIONAL_ID'
  | 'PERMITS' | 'BORDER' | 'CONTRACTS' | 'PAYMENTS';

export const AGENCIES: Agency[] = [
  'POLICE', 'IMMIGRATION', 'CIVIL_REGISTRY', 'MUNICIPAL', 'LICENSING',
  'CORRECTIONS', 'REGIONAL', 'EMERGENCY', 'CITIZEN_SERVICES', 'NATIONAL_ID',
  'PERMITS', 'BORDER', 'CONTRACTS', 'PAYMENTS',
];

export const AGENCY_LABEL: Record<Agency, string> = {
  POLICE: 'Police Command', IMMIGRATION: 'Immigration & Borders', CIVIL_REGISTRY: 'Civil Registry',
  MUNICIPAL: 'Municipal Systems', LICENSING: 'Licensing', CORRECTIONS: 'Corrections',
  REGIONAL: 'Regional Administration', EMERGENCY: 'Emergency Operations', CITIZEN_SERVICES: 'Citizen Services',
  NATIONAL_ID: 'National Identification', PERMITS: 'Permits & Certification', BORDER: 'Border Systems',
  CONTRACTS: 'Contract Processing', PAYMENTS: 'Payment Processing',
};

const CATEGORY: Record<Agency, string> = {
  POLICE: 'Police filing', IMMIGRATION: 'Immigration processing', CIVIL_REGISTRY: 'Registration',
  MUNICIPAL: 'Municipal approval', LICENSING: 'Licensing', CORRECTIONS: 'Corrections processing',
  REGIONAL: 'Administrative review', EMERGENCY: 'Emergency request', CITIZEN_SERVICES: 'Citizen request',
  NATIONAL_ID: 'ID application', PERMITS: 'Permit issuance', BORDER: 'Border clearance',
  CONTRACTS: 'Procurement contract', PAYMENTS: 'Payment approval',
};

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export type TxnStage = 'captured' | 'validated' | 'ministry-commit' | 'national-sync' | 'archived' | 'rejected';
export type Escalation = 'nominal' | 'watch' | 'breach';
export type SyncState = 'local' | 'ministry' | 'national';
export type Constitutional = 'compliant' | 'at-risk' | 'breach';

export type RiskFlag =
  | 'invisible-delay' | 'unauthorized-hold' | 'unlawful-pause'
  | 'reassignment-anomaly' | 'officer-anomaly' | 'queue-stagnation';

export interface SovereignTxn {
  id: string;
  agency: Agency;
  category: string;
  officer: string;
  region: string;
  createdHrs: number;      // hours before now (lineage anchor)
  ageHrs: number;
  slaHrs: number;          // ministry SLA
  legalDeadlineHrs: number; // constitutional service deadline
  stage: TxnStage;
  escalation: Escalation;
  sync: SyncState;
  reassignments: number;
  corruptionRisk: number;  // 0..100
  riskFlags: RiskFlag[];
  constitutional: Constitutional;
  fromLedger: boolean;     // folded from the live filed-record store
}

const STAGE_ORDER: TxnStage[] = ['captured', 'validated', 'ministry-commit', 'national-sync', 'archived'];
const SYNC_FOR: Record<TxnStage, SyncState> = {
  captured: 'local', validated: 'local', 'ministry-commit': 'ministry',
  'national-sync': 'national', archived: 'national', rejected: 'ministry',
};

function officerName(agency: Agency, i: number): string {
  const F = ['A.', 'M.', 'R.', 'S.', 'D.', 'L.', 'K.', 'T.'];
  const S = ['Okonkwo', 'Larsen', 'Vargas', 'Khan', 'Costa', 'Mensah', 'Petrov', 'Diallo', 'Nakamura', 'Reyes'];
  const h = Math.floor(seed(`obs:off:${agency}:${i}`) * 1e6);
  return `${F[h % F.length]} ${S[(h >> 3) % S.length]}`;
}

// Deterministic transaction field for an epoch. Each agency emits a
// bounded stream; ids are stable across the epoch so lineage holds.
function genTxns(epoch: number, perAgency = 7): SovereignTxn[] {
  const out: SovereignTxn[] = [];
  for (const agency of AGENCIES) {
    for (let i = 0; i < perAgency; i++) {
      const k = `${agency}:${i}`;
      const cadence = 5 + seed(`obs:cad:${k}`) * 10;
      const slaHrs = [48, 72, 96, 120][Math.floor(seed(`obs:sla:${k}`) * 4)]!;
      const legalDeadlineHrs = Math.round(slaHrs * (1.4 + seed(`obs:leg:${k}`) * 0.6));
      // Age oscillates with the epoch so the runtime is procedurally alive.
      const ageHrs = Math.round(wave(`obs:age:${k}`, epoch / cadence, 2, legalDeadlineHrs * 1.35));
      const progress = Math.min(STAGE_ORDER.length - 1, Math.floor((ageHrs / Math.max(1, slaHrs)) * 2));
      const rejected = seed(`obs:rej:${k}:${Math.floor(epoch / 9)}`) > 0.94;
      // Deliberate-hold pattern: a file pinned in an early stage no matter
      // how old it gets — the bribery-solicitation signature the
      // anti-corruption layer must expose (not silently auto-advance).
      const held = !rejected && seed(`obs:held:${k}`) > 0.8;
      const stage: TxnStage = rejected
        ? 'rejected'
        : held
          ? STAGE_ORDER[seed(`obs:hs:${k}`) > 0.5 ? 1 : 0]!
          : STAGE_ORDER[progress]!;
      const reassignments = seed(`obs:re:${k}`) > 0.8 ? (seed(`obs:re2:${k}`) > 0.55 ? 2 : 1) : 0;

      // Deadline governance.
      const overSla = ageHrs > slaHrs;
      const overLegal = ageHrs > legalDeadlineHrs;
      const advancing = stage === 'ministry-commit' || stage === 'national-sync' || stage === 'archived';
      const escalation: Escalation = overLegal ? 'breach' : overSla ? 'watch' : 'nominal';
      const constitutional: Constitutional =
        overLegal && !advancing ? 'breach' : overSla ? 'at-risk' : 'compliant';

      // Anti-corruption: an obstructed file is one that is past its SLA
      // while still parked in an early, non-advancing stage — the exact
      // signature of a deliberately delayed file held to solicit a bribe.
      const flags: RiskFlag[] = [];
      const stalledEarly = !advancing && stage !== 'rejected';
      if (overSla && stalledEarly) flags.push('invisible-delay');
      if (seed(`obs:hold:${k}`) > 0.86 && ageHrs > slaHrs * 0.6) flags.push('unauthorized-hold');
      if (overLegal && SYNC_FOR[stage] === 'local') flags.push('unlawful-pause');
      if (reassignments >= 2) flags.push('reassignment-anomaly');
      if (seed(`obs:oa:${agency}:${i % 3}`) > 0.9) flags.push('officer-anomaly');
      if (ageHrs > slaHrs * 1.5 && stalledEarly) flags.push('queue-stagnation');

      const stagnation = Math.min(2, ageHrs / Math.max(1, slaHrs));
      const corruptionRisk = Math.max(0, Math.min(100, Math.round(
        28 * stagnation + 14 * flags.length + (overLegal && stalledEarly ? 18 : 0),
      )));

      out.push({
        id: `${agency.slice(0, 3)}-${100000 + Math.floor(seed(`obs:id:${k}`) * 800000)}`,
        agency,
        category: CATEGORY[agency],
        officer: officerName(agency, i),
        region: REGIONS[Math.floor(seed(`obs:rg:${k}`) * REGIONS.length)]!,
        createdHrs: ageHrs,
        ageHrs,
        slaHrs,
        legalDeadlineHrs,
        stage,
        escalation,
        sync: SYNC_FOR[stage],
        reassignments,
        corruptionRisk,
        riskFlags: flags,
        constitutional,
        fromLedger: false,
      });
    }
  }
  return out;
}

const RECORD_AGENCY: Record<string, Agency> = {
  INTERIOR: 'CIVIL_REGISTRY', JUSTICE: 'CORRECTIONS', FINANCE: 'PAYMENTS',
  HEALTH: 'CITIZEN_SERVICES', TRANSPORT: 'MUNICIPAL',
};

/** The national observability ledger for an operational epoch. */
export function observabilityLedger(now: number): SovereignTxn[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const txns = genTxns(epoch);
  // Fold the live filed-record store in — real bureaucratic activity
  // becomes nationally observable alongside the runtime stream.
  for (const { rec, ministryKey } of nationalRecords(10)) {
    const agency = RECORD_AGENCY[ministryKey] ?? 'CITIZEN_SERVICES';
    const ageHrs = Math.max(0, Math.round((now - rec.at) / 4000));
    const slaHrs = 72;
    const legalDeadlineHrs = 120;
    const advancing = rec.stage === 'committed' || rec.stage === 'synced';
    const escalation: Escalation = ageHrs > legalDeadlineHrs ? 'breach' : ageHrs > slaHrs ? 'watch' : 'nominal';
    txns.push({
      id: rec.ref,
      agency,
      category: 'Filed record',
      officer: rec.byActor,
      region: 'Capital District',
      createdHrs: ageHrs,
      ageHrs,
      slaHrs,
      legalDeadlineHrs,
      stage: advancing ? 'ministry-commit' : 'captured',
      escalation,
      sync: advancing ? 'ministry' : 'local',
      reassignments: rec.returns ?? 0,
      corruptionRisk: Math.min(100, (rec.returns ?? 0) * 20 + (escalation === 'breach' ? 40 : escalation === 'watch' ? 20 : 0)),
      riskFlags: (rec.returns ?? 0) >= 2 ? ['reassignment-anomaly'] : [],
      constitutional: ageHrs > legalDeadlineHrs && !advancing ? 'breach' : ageHrs > slaHrs ? 'at-risk' : 'compliant',
      fromLedger: true,
    });
  }
  return txns;
}

export interface AgencyPressure {
  agency: Agency;
  label: string;
  total: number;
  delayed: number;
  breached: number;
  meanRisk: number;
  worstRegion: string;
}

export interface ControlBoard {
  total: number;
  delayed: number;            // escalation watch + breach
  breached: number;           // constitutional breach
  corruptionHotspots: number; // risk >= 65
  unresolvedEscalations: number;
  syncFailures: number;       // past legal deadline, still local
  ledgerFolded: number;
  agencies: AgencyPressure[]; // sorted worst-first
  regionHeat: { region: string; risk: number; delayed: number }[];
  watchlist: SovereignTxn[];  // highest-risk delayed files
}

export function controlBoard(now: number): ControlBoard {
  const txns = observabilityLedger(now);
  const delayed = txns.filter(t => t.escalation !== 'nominal');
  const breached = txns.filter(t => t.constitutional === 'breach');
  const byAgency: AgencyPressure[] = AGENCIES.map(agency => {
    const a = txns.filter(t => t.agency === agency);
    const ad = a.filter(t => t.escalation !== 'nominal');
    const regionRisk = REGIONS.map(r => ({
      r, risk: a.filter(t => t.region === r).reduce((s, t) => s + t.corruptionRisk, 0),
    })).sort((x, y) => y.risk - x.risk);
    return {
      agency,
      label: AGENCY_LABEL[agency],
      total: a.length,
      delayed: ad.length,
      breached: a.filter(t => t.constitutional === 'breach').length,
      meanRisk: a.length ? Math.round(a.reduce((s, t) => s + t.corruptionRisk, 0) / a.length) : 0,
      worstRegion: regionRisk[0]?.r ?? REGIONS[0]!,
    };
  }).sort((x, y) => (y.breached - x.breached) || (y.meanRisk - x.meanRisk));

  const regionHeat = REGIONS.map(region => {
    const r = txns.filter(t => t.region === region);
    return {
      region,
      risk: r.length ? Math.round(r.reduce((s, t) => s + t.corruptionRisk, 0) / r.length) : 0,
      delayed: r.filter(t => t.escalation !== 'nominal').length,
    };
  }).sort((x, y) => y.risk - x.risk);

  return {
    total: txns.length,
    delayed: delayed.length,
    breached: breached.length,
    corruptionHotspots: txns.filter(t => t.corruptionRisk >= 65).length,
    unresolvedEscalations: delayed.filter(t => t.stage !== 'archived' && t.stage !== 'rejected').length,
    syncFailures: txns.filter(t => t.ageHrs > t.legalDeadlineHrs && t.sync === 'local').length,
    ledgerFolded: txns.filter(t => t.fromLedger).length,
    agencies: byAgency,
    regionHeat,
    watchlist: [...delayed].sort((a, b) => b.corruptionRisk - a.corruptionRisk).slice(0, 12),
  };
}
