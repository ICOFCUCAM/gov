// Live Judicial Engine.
//
// The judiciary is a running case-processing organism: cases are filed,
// flow through pre-trial → hearing → judgment, some appeal upward, some
// reach constitutional review; backlog accumulates when inflow outpaces
// clearance and propagates up the court hierarchy. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export const CASE_STAGES = [
  'Filed', 'Pre-trial', 'Hearing', 'Judgment', 'Appeal', 'Constitutional review', 'Closed',
] as const;
export type CaseStage = (typeof CASE_STAGES)[number];
export type CaseType = 'criminal' | 'civil' | 'constitutional' | 'commercial' | 'appeal';

const MATTERS = [
  'State v. procurement syndicate', 'Constitutional challenge — emergency powers',
  'Land restitution dispute', 'Electoral petition', 'Tax assessment appeal',
  'Public-interest environmental suit', 'Corruption prosecution', 'Labour dispute appeal',
  'Commercial arbitration enforcement', 'Habeas corpus application',
  'Judicial review — licensing', 'Sentencing appeal',
];

export interface CourtCase {
  id: string;
  matter: string;
  type: CaseType;
  court: string;
  stage: CaseStage;
  stageIdx: number;
  progressPct: number;
  backlogged: boolean;
  ageDays: number;
}

export interface CourtTier {
  tier: string;
  inflow: number;       // cases/period
  cleared: number;      // cases/period
  backlog: number;      // accumulated pending
  clearancePct: number; // cleared / inflow
  tone: 'ok' | 'warn' | 'alert';
}

export interface RegionalCourt { region: string; load: number; clearancePct: number; backlog: number }
export interface JudicialSignal { label: string; level: 'info' | 'watch' | 'risk'; detail: string }

export interface JudicialState {
  cases: CourtCase[];
  tiers: CourtTier[];
  regional: RegionalCourt[];
  signals: JudicialSignal[];
  openCases: number;
  appeals: number;
  constitutionalMatters: number;
  meanClearance: number;
  totalBacklog: number;
}

const TIERS = ['Trial Courts', 'Courts of Appeal', 'Supreme Court', 'Constitutional Court'];
const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
const CTYPE: CaseType[] = ['criminal', 'civil', 'constitutional', 'commercial', 'appeal'];

export function judicialState(t: number): JudicialState {
  const cases: CourtCase[] = MATTERS.map((matter, i) => {
    const cadence = 11 + seed(`jc:cad:${i}`) * 9;
    const raw = (t / cadence) + seed(`jc:off:${i}`) * CASE_STAGES.length;
    let stageIdx = Math.floor(raw) % (CASE_STAGES.length + 1);
    if (stageIdx >= CASE_STAGES.length) stageIdx = CASE_STAGES.length - 1; // dwell at Closed
    const backlogged = stageIdx < CASE_STAGES.length - 1 && seed(`jc:bk:${i}:${Math.floor(raw / 2)}`) > 0.72;
    const type = CTYPE[Math.floor(seed(`jc:ty:${i}`) * CTYPE.length)]!;
    const tierIdx = type === 'constitutional' ? 3 : type === 'appeal' ? 1 : 0;
    return {
      id: `C-${2400 + i}`,
      matter,
      type,
      court: TIERS[Math.min(3, tierIdx + (stageIdx >= 4 ? 1 : 0))]!,
      stage: CASE_STAGES[stageIdx]!,
      stageIdx,
      progressPct: Math.round(((stageIdx + (raw % 1)) / CASE_STAGES.length) * 100),
      backlogged,
      ageDays: 20 + Math.round(seed(`jc:age:${i}`) * 520),
    };
  });

  // Backlog propagates UP: a fraction of trial-court backlog becomes
  // appellate inflow, and so on.
  let carried = 0;
  const tiers: CourtTier[] = TIERS.map((tier, i) => {
    const baseInflow = Math.round(wave(`jt:in:${i}`, t, 40, 100) * (i === 0 ? 4 : 1));
    const inflow = baseInflow + Math.round(carried * 0.35);
    const cap = Math.round(wave(`jt:cap:${i}`, t, 45, 96) * (i === 0 ? 4 : 1));
    const cleared = Math.min(inflow, cap);
    const unmet = Math.max(0, inflow - cleared);
    const backlog = Math.round(unmet * (3 + seed(`jt:bk:${i}`) * 6));
    carried = unmet;
    const clearancePct = inflow ? Math.round((cleared / inflow) * 100) : 100;
    return {
      tier, inflow, cleared, backlog, clearancePct,
      tone: clearancePct >= 85 ? 'ok' : clearancePct >= 65 ? 'warn' : 'alert',
    };
  });

  const regional: RegionalCourt[] = REGIONS.map((region, i) => {
    const load = 200 + Math.round(wave(`jr:l:${i}`, t, 120, 900));
    const clearancePct = Math.round(wave(`jr:c:${i}`, t, 55, 95));
    return { region, load, clearancePct, backlog: Math.round(load * (1 - clearancePct / 100) * 2) };
  });

  const totalBacklog = tiers.reduce((a, x) => a + x.backlog, 0);
  const meanClearance = Math.round(tiers.reduce((a, x) => a + x.clearancePct, 0) / tiers.length);
  const apexBacklog = tiers[3]!.backlog;

  const signals: JudicialSignal[] = [
    {
      label: 'Backlog trajectory',
      level: totalBacklog > 900 ? 'risk' : totalBacklog > 500 ? 'watch' : 'info',
      detail: `${totalBacklog} pending across tiers; clearance ${meanClearance}%`,
    },
    {
      label: 'Constitutional docket',
      level: apexBacklog > 60 ? 'risk' : apexBacklog > 30 ? 'watch' : 'info',
      detail: `${cases.filter(c => c.type === 'constitutional').length} constitutional matters · apex backlog ${apexBacklog}`,
    },
    {
      label: 'Appellate pressure',
      level: tiers[1]!.tone === 'alert' ? 'risk' : tiers[1]!.tone === 'warn' ? 'watch' : 'info',
      detail: `Appeal-tier clearance ${tiers[1]!.clearancePct}% · inflow ${tiers[1]!.inflow}`,
    },
    {
      label: 'Regional disparity',
      level: Math.max(...regional.map(r => r.clearancePct)) - Math.min(...regional.map(r => r.clearancePct)) > 30 ? 'watch' : 'info',
      detail: 'Clearance variance across regional courts',
    },
  ];

  return {
    cases,
    tiers,
    regional,
    signals,
    openCases: cases.filter(c => c.stage !== 'Closed').length,
    appeals: cases.filter(c => c.stage === 'Appeal' || c.type === 'appeal').length,
    constitutionalMatters: cases.filter(c => c.type === 'constitutional' || c.stage === 'Constitutional review').length,
    meanClearance,
    totalBacklog,
  };
}
