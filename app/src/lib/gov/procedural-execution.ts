// lib/gov/procedural-execution.ts
//
// The Ministry of Interior procedural sovereign-execution environment.
// Turns the observable national ledger into a real institutional process
// runtime: every file flows a constitutionally-bounded execution chain
// with approvals, stalls, rejections, appeals, jurisdiction transfers,
// time-limited delegated authority, judicial interruption and national
// continuity governance. AI is advisory, non-sovereign and auditable.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed } from '@/lib/telemetry';
import { observabilityLedger, AGENCY_LABEL, type SovereignTxn } from '@/lib/gov/sovereign-observability';

export type Jurisdiction =
  | 'citizen' | 'municipal' | 'regional' | 'national' | 'judicial' | 'oversight';

export interface ProcStage { key: string; label: string; jurisdiction: Jurisdiction }

// The canonical sovereign workflow chain (directive §2).
export const PROC_STAGES: ProcStage[] = [
  { key: 'application', label: 'Application', jurisdiction: 'citizen' },
  { key: 'municipal-review', label: 'Municipal Review', jurisdiction: 'municipal' },
  { key: 'regional-validation', label: 'Regional Validation', jurisdiction: 'regional' },
  { key: 'national-registry-commit', label: 'National Registry Commit', jurisdiction: 'national' },
  { key: 'judicial-exception-review', label: 'Judicial Exception Review', jurisdiction: 'judicial' },
  { key: 'ministry-synchronization', label: 'Ministry Synchronization', jurisdiction: 'national' },
  { key: 'citizen-notification', label: 'Citizen Notification', jurisdiction: 'national' },
  { key: 'archive-audit', label: 'Archive & Audit Chain', jurisdiction: 'oversight' },
];

export type ProcStatus =
  | 'running' | 'stalled' | 'rejected' | 'redirected'
  | 'appealed' | 'judicial-hold' | 'rolled-back' | 'archived';

export interface DelegationRecord {
  actingOfficer: string;
  fromOfficer: string;
  jurisdiction: Jurisdiction;
  expiresInHrs: number;
}

export interface AppealChain {
  filedHrsAgo: number;
  reviewDeadlineHrs: number;
  resolved: boolean;
  overdue: boolean;
  chain: { step: string; atHrsAgo: number }[];
}

export interface AiAdvisory {
  action: 'expedite' | 'reassign' | 'escalate' | 'monitor';
  reasoningChain: string[];
  legalBasis: string;
  confidence: number;       // 0..1
  humanApprover: string;
  overrideHistory: number;
  sovereignBlocked: true;   // AI may never punish/authorize surveillance/override judiciary
}

export interface ProceduralFile {
  id: string;
  office: string;
  officer: string;
  stageIndex: number;
  stage: ProcStage;
  status: ProcStatus;
  jurisdiction: Jurisdiction;
  ageHrs: number;
  legalDeadlineHrs: number;
  remainingHrs: number;
  lineage: { stage: string; jurisdiction: Jurisdiction; atHrsAgo: number }[];
  transferred: boolean;
  delegation: DelegationRecord | null;
  appeal: AppealChain | null;
  judicialHoldReason: string | null;
  ai: AiAdvisory;
}

const OFFICERS = ['A. Okonkwo', 'M. Larsen', 'R. Vargas', 'S. Khan', 'D. Costa', 'L. Mensah', 'K. Petrov', 'T. Diallo'];
const off = (k: string) => OFFICERS[Math.floor(seed(k) * OFFICERS.length)]!;

function aiFor(t: SovereignTxn, status: ProcStatus): AiAdvisory {
  const action: AiAdvisory['action'] =
    status === 'stalled' ? 'expedite'
      : t.reassignments >= 2 ? 'reassign'
        : t.escalation === 'breach' ? 'escalate' : 'monitor';
  return {
    action,
    reasoningChain: [
      `Observed age ${t.ageHrs}h vs legal deadline ${t.legalDeadlineHrs}h`,
      `Escalation ${t.escalation}; corruption-risk index ${t.corruptionRisk}`,
      status === 'stalled' ? 'Non-advancing past SLA — recommend lawful expedite/supervisory review'
        : action === 'reassign' ? 'Repeated reassignment anomaly — recommend integrity review'
          : 'Within advisory tolerance — continue monitoring',
    ],
    legalBasis: 'Administrative Service Act §  procedural timeliness; advisory only',
    confidence: Math.round((0.55 + seed(`ai:c:${t.id}`) * 0.4) * 100) / 100,
    humanApprover: off(`ai:h:${t.id}`),
    overrideHistory: seed(`ai:o:${t.id}`) > 0.85 ? 1 : 0,
    sovereignBlocked: true,
  };
}

function deriveFile(t: SovereignTxn): ProceduralFile {
  const terminalRejected = t.stage === 'rejected';
  const terminalArchived = t.stage === 'archived';
  // Procedural progress is seeded but bounded by the file's age pressure.
  const ratio = Math.min(1, t.ageHrs / Math.max(1, t.legalDeadlineHrs));
  let stageIndex = terminalArchived ? PROC_STAGES.length - 1
    : Math.min(PROC_STAGES.length - 2, Math.floor(ratio * (PROC_STAGES.length - 1)));

  const judicialHold = !terminalArchived && seed(`pf:jh:${t.id}`) > 0.88;
  const appealed = terminalRejected && seed(`pf:ap:${t.id}`) > 0.45;
  const redirected = !terminalArchived && !judicialHold && seed(`pf:rd:${t.id}`) > 0.86;
  const rolledBack = !terminalArchived && stageIndex >= 3 && seed(`pf:rb:${t.id}`) > 0.9;
  const stalled = !terminalArchived && !judicialHold && t.escalation !== 'nominal'
    && (t.stage === 'captured' || t.stage === 'validated');

  let status: ProcStatus = 'running';
  if (terminalArchived) status = 'archived';
  else if (judicialHold) status = 'judicial-hold';
  else if (appealed) status = 'appealed';
  else if (terminalRejected) status = 'rejected';
  else if (rolledBack) status = 'rolled-back';
  else if (redirected) status = 'redirected';
  else if (stalled) status = 'stalled';

  if (judicialHold) stageIndex = Math.min(stageIndex, 4); // frozen at/at-before judicial review
  if (rolledBack) stageIndex = Math.max(1, stageIndex - 2);

  const stage = PROC_STAGES[stageIndex]!;
  const transferred = redirected || t.region !== 'Capital District' && seed(`pf:tx:${t.id}`) > 0.7;
  const jurisdiction: Jurisdiction = redirected ? 'regional' : stage.jurisdiction;

  // Audit lineage — every traversed stage, deadline carried across.
  const lineage = PROC_STAGES.slice(0, stageIndex + 1).map((s, i) => ({
    stage: s.label,
    jurisdiction: s.jurisdiction,
    atHrsAgo: Math.max(0, Math.round(t.ageHrs * (1 - i / Math.max(1, stageIndex + 1)))),
  }));

  const delegation: DelegationRecord | null = seed(`pf:dg:${t.id}`) > 0.82 ? {
    actingOfficer: off(`pf:da:${t.id}`),
    fromOfficer: t.officer,
    jurisdiction,
    expiresInHrs: 4 + Math.floor(seed(`pf:de:${t.id}`) * 44),
  } : null;

  const appeal: AppealChain | null = appealed ? (() => {
    const filedHrsAgo = 6 + Math.floor(seed(`pf:af:${t.id}`) * 90);
    const reviewDeadlineHrs = 120;
    const resolved = seed(`pf:ar:${t.id}`) > 0.6;
    return {
      filedHrsAgo,
      reviewDeadlineHrs,
      resolved,
      overdue: !resolved && filedHrsAgo > reviewDeadlineHrs,
      chain: [
        { step: 'Appeal filed by citizen', atHrsAgo: filedHrsAgo },
        { step: 'Acknowledged — rights-protection channel', atHrsAgo: Math.max(0, filedHrsAgo - 8) },
        ...(resolved ? [{ step: 'Independent review concluded', atHrsAgo: Math.max(0, filedHrsAgo - 40) }] : []),
      ],
    };
  })() : null;

  return {
    id: t.id,
    office: AGENCY_LABEL[t.agency],
    officer: t.officer,
    stageIndex,
    stage,
    status,
    jurisdiction,
    ageHrs: t.ageHrs,
    legalDeadlineHrs: t.legalDeadlineHrs,
    remainingHrs: t.legalDeadlineHrs - t.ageHrs,
    lineage,
    transferred,
    delegation,
    appeal,
    judicialHoldReason: judicialHold
      ? ['Constitutional exception review', 'Unauthorized-escalation freeze', 'Warrant validation pending', 'Authority dispute'][Math.floor(seed(`pf:jr:${t.id}`) * 4)]!
      : null,
    ai: aiFor(t, status),
  };
}

export function proceduralLedger(now: number): ProceduralFile[] {
  return observabilityLedger(now).map(deriveFile);
}

export type ContinuityMode = 'nominal' | 'regional-fallback' | 'ministry-failover' | 'constitutional-emergency';

export interface ProceduralBoard {
  total: number;
  byStatus: Record<ProcStatus, number>;
  stageCounts: { stage: ProcStage; count: number; stalled: number }[];
  jurisdictionCounts: { jurisdiction: Jurisdiction; count: number }[];
  judicialHolds: number;
  appealed: number;
  unresolvedAppeals: number;
  overdueAppeals: number;
  delegations: number;
  transfers: number;
  continuity: ContinuityMode;
  recurringBottleneck: string;   // institutional memory: most-stalled stage
}

export function proceduralBoard(now: number): ProceduralBoard {
  const files = proceduralLedger(now);
  const byStatus = {
    running: 0, stalled: 0, rejected: 0, redirected: 0,
    appealed: 0, 'judicial-hold': 0, 'rolled-back': 0, archived: 0,
  } as Record<ProcStatus, number>;
  for (const f of files) byStatus[f.status]++;

  const stageCounts = PROC_STAGES.map(stage => {
    const inStage = files.filter(f => f.stage.key === stage.key);
    return { stage, count: inStage.length, stalled: inStage.filter(f => f.status === 'stalled').length };
  });
  const jurisdictions: Jurisdiction[] = ['citizen', 'municipal', 'regional', 'national', 'judicial', 'oversight'];
  const jurisdictionCounts = jurisdictions.map(j => ({ jurisdiction: j, count: files.filter(f => f.jurisdiction === j).length }));

  const stalledFrac = (byStatus.stalled + byStatus['judicial-hold']) / Math.max(1, files.length);
  const breachFrac = files.filter(f => f.remainingHrs < 0).length / Math.max(1, files.length);
  const continuity: ContinuityMode =
    breachFrac > 0.5 ? 'constitutional-emergency'
      : stalledFrac > 0.35 ? 'ministry-failover'
        : stalledFrac > 0.2 ? 'regional-fallback' : 'nominal';

  const recurring = [...stageCounts].sort((a, b) => b.stalled - a.stalled)[0];

  return {
    total: files.length,
    byStatus,
    stageCounts,
    jurisdictionCounts,
    judicialHolds: byStatus['judicial-hold'],
    appealed: byStatus.appealed,
    unresolvedAppeals: files.filter(f => f.appeal && !f.appeal.resolved).length,
    overdueAppeals: files.filter(f => f.appeal && f.appeal.overdue).length,
    delegations: files.filter(f => f.delegation).length,
    transfers: files.filter(f => f.transferred).length,
    continuity,
    recurringBottleneck: recurring ? recurring.stage.label : PROC_STAGES[0]!.label,
  };
}
