// Sovereign institution chain — the bureaucratic spine the platform was
// missing. Every public actor serves the state THROUGH an institution:
//
//   actor (doctor / officer / inspector / teacher …)
//     → facility (hospital / station / depot / branch / school …)
//       → ministry (Health / Interior / Transport / Finance …)
//         → national system
//
// Records originate with the actor, are first held at the facility, roll
// up to the ministry, then synchronise to the national system. This module
// is pure & deterministic (seed/telemetry), unit-testable, and shared by
// every ministry surface so the hierarchy is uniform, not dashboard-local.

import { seed, wave } from '@/lib/telemetry';

export type ChainTier = 'ACTOR' | 'FACILITY' | 'MINISTRY' | 'NATIONAL';

// Per-ministry facility taxonomy + the actor role that staffs it.
export interface MinistryChainDef {
  ministry: string;          // display name
  facilityKind: string;      // hospital / station / depot …
  facilityPrefix: string;    // HSP / STN / DEP …
  actorRole: string;         // Physician / Officer / Inspector …
  recordNoun: string;        // clinical record / case file / manifest …
}
export const MINISTRY_CHAIN: Record<string, MinistryChainDef> = {
  HEALTH:      { ministry: 'Ministry of Health', facilityKind: 'Hospital', facilityPrefix: 'HSP', actorRole: 'Physician', recordNoun: 'clinical record' },
  INTERIOR:    { ministry: 'Ministry of Interior', facilityKind: 'Station', facilityPrefix: 'STN', actorRole: 'Officer', recordNoun: 'case file' },
  TRANSPORT:   { ministry: 'Ministry of Transport', facilityKind: 'Logistics depot', facilityPrefix: 'DEP', actorRole: 'Controller', recordNoun: 'movement manifest' },
  FINANCE:     { ministry: 'Treasury & Finance', facilityKind: 'Revenue branch', facilityPrefix: 'BRN', actorRole: 'Assessor', recordNoun: 'fiscal record' },
  EDUCATION:   { ministry: 'Ministry of Education', facilityKind: 'Institution', facilityPrefix: 'EDU', actorRole: 'Educator', recordNoun: 'enrolment record' },
  ENERGY:      { ministry: 'Ministry of Energy', facilityKind: 'Grid station', facilityPrefix: 'GRD', actorRole: 'Engineer', recordNoun: 'grid log' },
  AGRICULTURE: { ministry: 'Ministry of Agriculture', facilityKind: 'Extension office', facilityPrefix: 'AGX', actorRole: 'Extension officer', recordNoun: 'holding record' },
  TRADE:       { ministry: 'Ministry of Trade & Industry', facilityKind: 'Trade office', facilityPrefix: 'TRD', actorRole: 'Trade officer', recordNoun: 'licence record' },
  JUSTICE:     { ministry: 'Ministry of Justice', facilityKind: 'Court registry', facilityPrefix: 'CRT', actorRole: 'Registrar', recordNoun: 'docket' },
  LABOR:       { ministry: 'Ministry of Labour', facilityKind: 'Labour office', facilityPrefix: 'LAB', actorRole: 'Inspector', recordNoun: 'employment record' },
  ENVIRONMENT: { ministry: 'Ministry of Environment', facilityKind: 'Field unit', facilityPrefix: 'ENV', actorRole: 'Field officer', recordNoun: 'monitoring record' },
  LEGISLATURE: { ministry: 'National Legislature', facilityKind: 'Committee office', facilityPrefix: 'CMT', actorRole: 'Clerk', recordNoun: 'bill record' },
};
export function chainDef(ministryKey: string): MinistryChainDef {
  return MINISTRY_CHAIN[ministryKey]
    ?? { ministry: 'Ministry', facilityKind: 'Facility', facilityPrefix: 'FAC', actorRole: 'Officer', recordNoun: 'record' };
}

const REGION_NAMES = ['Capital District', 'Northern Province', 'Highland Region', 'Eastern Region', 'Western Region', 'Coastal Region'];
const FAC_QUAL = ['Central', 'General', 'Regional', 'District', 'National', 'Metro', 'Provincial', 'Eastern', 'Northern', 'Coastal'];

export interface Facility {
  id: string;
  name: string;
  region: string;
  tier: 'tertiary' | 'secondary' | 'primary';
  capacity: number;       // enrolled-actor / throughput capacity
  load: number;           // 0..100 current load
  staff: number;          // enrolled actors
  syncPct: number;        // 0..100 record sync to ministry
  status: 'operational' | 'strained' | 'degraded';
  headId: string;
}
export function facilities(ministryKey: string, epoch: number, count = 6): Facility[] {
  const d = chainDef(ministryKey);
  return Array.from({ length: count }).map((_, i) => {
    const region = REGION_NAMES[i % REGION_NAMES.length]!;
    const qual = FAC_QUAL[Math.floor(seed(`fac:q:${ministryKey}:${i}`) * FAC_QUAL.length)] ?? 'Central';
    const tier: Facility['tier'] = i === 0 ? 'tertiary' : i < 3 ? 'secondary' : 'primary';
    const capacity = tier === 'tertiary' ? 240 : tier === 'secondary' ? 140 : 70;
    const load = Math.round(wave(`fac:l:${ministryKey}:${i}`, epoch, 32, 96));
    const staff = Math.max(4, Math.round(capacity * (0.4 + seed(`fac:s:${ministryKey}:${i}`) * 0.5)));
    const syncPct = Math.round(wave(`fac:y:${ministryKey}:${i}`, epoch, 78, 99.5));
    const status: Facility['status'] = load >= 88 || syncPct < 84 ? 'degraded' : load >= 72 ? 'strained' : 'operational';
    return {
      id: `${d.facilityPrefix}-${String(i + 1).padStart(2, '0')}`,
      name: `${qual} ${d.facilityKind}`,
      region, tier, capacity, load, staff, syncPct, status,
      headId: `${d.facilityPrefix}-${String(i + 1).padStart(2, '0')}-HEAD`,
    };
  });
}

const FIRST = ['Amara', 'Kofi', 'Lena', 'Tariq', 'Mei', 'Ravi', 'Nadia', 'Diego', 'Sara', 'Yusuf', 'Ingrid', 'Omar'];
const LAST = ['Okonkwo', 'Haddad', 'Vargas', 'Petrov', 'Nakamura', 'Diallo', 'Costa', 'Khan', 'Larsen', 'Mensah'];
export interface ChainActor {
  id: string;
  name: string;
  role: string;
  facilityId: string;
  enrolledEpoch: number;
  caseload: number;
  standing: 'active' | 'probation' | 'suspended';
  reliability: number;     // 0..100
}
export function actors(ministryKey: string, facilityId: string, epoch: number, count = 8): ChainActor[] {
  const d = chainDef(ministryKey);
  return Array.from({ length: count }).map((_, i) => {
    const fn = FIRST[Math.floor(seed(`act:f:${facilityId}:${i}`) * FIRST.length)] ?? 'Amara';
    const ln = LAST[Math.floor(seed(`act:l:${facilityId}:${i}`) * LAST.length)] ?? 'Okonkwo';
    const enrolledEpoch = Math.max(0, epoch - Math.floor(seed(`act:e:${facilityId}:${i}`) * 40));
    const reliability = Math.round(60 + seed(`act:r:${facilityId}:${i}`) * 38);
    const s = seed(`act:s:${facilityId}:${i}`);
    const standing: ChainActor['standing'] = s > 0.94 ? 'suspended' : s > 0.86 ? 'probation' : 'active';
    return {
      id: `${facilityId}-${d.actorRole.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      role: d.actorRole,
      facilityId,
      enrolledEpoch,
      caseload: Math.round(wave(`act:c:${facilityId}:${i}`, epoch, 4, 38)),
      standing,
      reliability,
    };
  });
}

// Records never go straight to the state — they originate with the actor,
// are held at the facility, roll to the ministry, then sync to national.
export interface RecordLineageStage { tier: ChainTier; label: string; done: boolean; }
export interface RecordLineage {
  recordId: string;
  stages: RecordLineageStage[];
  current: ChainTier;
  synced: boolean;
}
export function recordLineage(
  recordId: string, actorName: string, facility: Facility, ministryKey: string, epoch: number,
): RecordLineage {
  const d = chainDef(ministryKey);
  // progression keyed by record age + facility sync health (deterministic).
  const age = (Math.abs(hash(recordId)) % 5);
  const synced = facility.syncPct >= 90 && age >= 4;
  const reached = (n: number) => age >= n;
  const stages: RecordLineageStage[] = [
    { tier: 'ACTOR', label: `Captured by ${actorName} (${d.actorRole})`, done: true },
    { tier: 'FACILITY', label: `Held & validated at ${facility.name} (${facility.id})`, done: reached(1) },
    { tier: 'FACILITY', label: `Facility registry committed`, done: reached(2) },
    { tier: 'MINISTRY', label: `Rolled up to ${d.ministry}`, done: reached(3) },
    { tier: 'NATIONAL', label: `Synchronised to National System`, done: synced },
  ];
  const current: ChainTier = synced ? 'NATIONAL' : reached(3) ? 'MINISTRY' : reached(1) ? 'FACILITY' : 'ACTOR';
  return { recordId, stages, current, synced };
}

/** Re-derive a lineage so that stages 0..stageIndex are done — used to make
 *  the lineage strip reflect a real record's live custody stage (0=captured
 *  … 4=synced) instead of the deterministic placeholder progression. */
export function lineageAtStage(base: RecordLineage, stageIndex: number): RecordLineage {
  const i = Math.max(0, Math.min(stageIndex, base.stages.length - 1));
  const stages = base.stages.map((s, idx) => ({ ...s, done: idx <= i }));
  return { ...base, stages, current: stages[i]!.tier, synced: i >= base.stages.length - 1 };
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

// Facility → ministry → national synchronisation integrity for a ministry.
export interface ChainIntegrity {
  ministry: string;
  facilities: number;
  meanSyncPct: number;
  unsynced: number;          // facilities below sync threshold
  uplinkLatencyMin: number;  // facility→ministry roll-up latency
  nationalLagMin: number;    // ministry→national lag
  status: 'synchronised' | 'lagging' | 'degraded';
}
export function chainIntegrity(ministryKey: string, epoch: number): ChainIntegrity {
  const fs = facilities(ministryKey, epoch);
  const d = chainDef(ministryKey);
  const meanSyncPct = Math.round(fs.reduce((s, f) => s + f.syncPct, 0) / fs.length);
  const unsynced = fs.filter(f => f.syncPct < 88).length;
  const uplinkLatencyMin = Math.round(wave(`chain:ul:${ministryKey}`, epoch, 3, 28));
  const nationalLagMin = Math.round(wave(`chain:nl:${ministryKey}`, epoch, 2, 22));
  const status: ChainIntegrity['status'] =
    meanSyncPct >= 94 && unsynced === 0 ? 'synchronised'
    : meanSyncPct >= 86 ? 'lagging' : 'degraded';
  return { ministry: d.ministry, facilities: fs.length, meanSyncPct, unsynced, uplinkLatencyMin, nationalLagMin, status };
}
