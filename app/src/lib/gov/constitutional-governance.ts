// lib/gov/constitutional-governance.ts
//
// The Ministry of Interior constitutional governance core. Makes the
// platform a CONSTITUTIONAL FEDERATED GOVERNANCE ARCHITECTURE rather than
// a centralized surveillance system: digital separation of powers,
// jurisdiction-based visibility, multi-key sovereign authority, immutable
// oversight mirroring and a redacted citizen-accountability projection.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed } from '@/lib/telemetry';
import { observabilityLedger, AGENCY_LABEL, type Agency, type SovereignTxn } from '@/lib/gov/sovereign-observability';
import type { SovereignRole } from '@/shared/permissions/rbac';

// ── 1. Separation of powers ───────────────────────────────────────────
export type Power = 'execute' | 'monitor' | 'investigate' | 'judge' | 'punish';
export type BranchKey = 'OPERATIONS' | 'OVERSIGHT' | 'JUDICIAL' | 'CITIZEN_PROTECTION';

export interface GovBranch {
  key: BranchKey;
  label: string;
  institutions: string[];
  powers: Power[];
  purpose: string;
}

// Powers are partitioned so no branch can execute, monitor, investigate,
// judge and punish simultaneously. Operations may only execute; it can
// never self-judge or self-punish. Coercive power (judge/punish) is
// judicial-only and requires legal authorization.
export const BRANCHES: GovBranch[] = [
  { key: 'OPERATIONS', label: 'Operations', institutions: ['Ministries', 'Agencies', 'Departments'], powers: ['execute'], purpose: 'Lawful operational execution within mandate' },
  { key: 'OVERSIGHT', label: 'Independent Oversight', institutions: ['Inspectorate', 'Anti-Corruption Authority', 'Parliamentary Review'], powers: ['monitor', 'investigate'], purpose: 'Independent observability & investigation' },
  { key: 'JUDICIAL', label: 'Judicial', institutions: ['Courts', 'Warrant Validation', 'Legal Authorization'], powers: ['judge', 'punish'], purpose: 'Authorization, adjudication & lawful sanction' },
  { key: 'CITIZEN_PROTECTION', label: 'Citizen Protection', institutions: ['Ombudsman', 'Rights-Protection Channels', 'Complaint Escalation'], powers: ['monitor'], purpose: 'Citizen rights, complaints & escalation' },
];

/** Constitutional concentration check — true iff powers stay separated. */
export function separationIntact(): boolean {
  const ops = BRANCHES.find(b => b.key === 'OPERATIONS')!;
  const jud = BRANCHES.find(b => b.key === 'JUDICIAL')!;
  const noBranchHasAll = BRANCHES.every(b => b.powers.length < 5);
  const opsExecuteOnly = ops.powers.length === 1 && ops.powers[0] === 'execute';
  const opsCannotJudgeOrPunish = !ops.powers.includes('judge') && !ops.powers.includes('punish');
  const judicialCannotExecute = !jud.powers.includes('execute');
  const union = new Set(BRANCHES.flatMap(b => b.powers));
  const coversAll = (['execute', 'monitor', 'investigate', 'judge', 'punish'] as Power[]).every(p => union.has(p));
  return noBranchHasAll && opsExecuteOnly && opsCannotJudgeOrPunish && judicialCannotExecute && coversAll;
}

// ── 2. Role-based jurisdiction visibility ─────────────────────────────
export type DataClass = 'operational' | 'intelligence' | 'investigation' | 'citizen-confidential';

// Visibility obeys jurisdiction, role, legal mandate and constitutional
// authority — not blanket access. Line officers see only operational
// data; intelligence/investigation need elevated lawful authority;
// citizen-confidential is never broadly accessible.
export function canAccess(role: SovereignRole, _agency: Agency, dataClass: DataClass): { allowed: boolean; basis: string } {
  if (dataClass === 'citizen-confidential') {
    return role === 'auditor'
      ? { allowed: true, basis: 'Integrity mandate — read-only, audit-logged' }
      : { allowed: false, basis: 'Citizen-confidential — no lawful basis for this role' };
  }
  if (dataClass === 'intelligence' || dataClass === 'investigation') {
    return role === 'commander' || role === 'auditor'
      ? { allowed: true, basis: 'Elevated lawful authority within jurisdiction' }
      : { allowed: false, basis: `${role} lacks legal mandate for ${dataClass} systems` };
  }
  return role === 'observer'
    ? { allowed: true, basis: 'Read-only oversight of operational surface' }
    : { allowed: true, basis: 'Operationally relevant within mandate' };
}

// ── 3. Multi-key sovereign authority ──────────────────────────────────
export type AuthorityKey = 'MINISTRY' | 'JUDICIAL' | 'OVERSIGHT';
export type SovereignActionKind =
  | 'national-surveillance' | 'emergency-powers' | 'record-deletion'
  | 'constitutional-override' | 'national-lockdown' | 'escalated-investigation';

export const SOVEREIGN_ACTION_LABEL: Record<SovereignActionKind, string> = {
  'national-surveillance': 'National surveillance request',
  'emergency-powers': 'Emergency powers assertion',
  'record-deletion': 'Record deletion',
  'constitutional-override': 'Constitutional override',
  'national-lockdown': 'National lockdown',
  'escalated-investigation': 'Escalated investigation',
};

// Every sovereign action needs all three keys; surveillance &
// investigation additionally need a non-expired judicial token.
const NEEDS_JUDICIAL_TOKEN: SovereignActionKind[] = ['national-surveillance', 'escalated-investigation'];

export interface AuthorizationResult {
  permitted: boolean;
  verdict: 'PERMITTED' | 'REFUSED';
  missing: AuthorityKey[];
  reason: string;
}

export function authorizeSovereignAction(
  kind: SovereignActionKind,
  keysHeld: AuthorityKey[],
  judicialToken: { present: boolean; expired: boolean } = { present: false, expired: true },
): AuthorizationResult {
  const required: AuthorityKey[] = ['MINISTRY', 'JUDICIAL', 'OVERSIGHT'];
  const missing = required.filter(k => !keysHeld.includes(k));
  if (missing.length > 0) {
    return { permitted: false, verdict: 'REFUSED', missing, reason: `Distributed authorization incomplete — missing ${missing.join(', ')}` };
  }
  if (NEEDS_JUDICIAL_TOKEN.includes(kind) && (!judicialToken.present || judicialToken.expired)) {
    return { permitted: false, verdict: 'REFUSED', missing: [], reason: 'Runtime refusal — valid judicial token required and not present/active' };
  }
  return { permitted: true, verdict: 'PERMITTED', missing: [], reason: 'All sovereign keys present; constitutional preconditions met' };
}

export interface PendingSovereignAction {
  id: string;
  kind: SovereignActionKind;
  requestedBy: string;
  keysHeld: AuthorityKey[];
  judicialToken: { present: boolean; expired: boolean };
  result: AuthorizationResult;
}

export function pendingSovereignActions(now: number): PendingSovereignAction[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const kinds = Object.keys(SOVEREIGN_ACTION_LABEL) as SovereignActionKind[];
  return kinds.map((kind, i) => {
    const k = `cg:act:${kind}:${Math.floor(epoch / 5)}`;
    const keysHeld: AuthorityKey[] = ([
      ['MINISTRY', seed(`${k}:m`) > 0.25],
      ['JUDICIAL', seed(`${k}:j`) > 0.55],
      ['OVERSIGHT', seed(`${k}:o`) > 0.45],
    ] as [AuthorityKey, boolean][]).filter(([, h]) => h).map(([key]) => key);
    const judicialToken = { present: seed(`${k}:t`) > 0.5, expired: seed(`${k}:te`) > 0.5 };
    const result = authorizeSovereignAction(kind, keysHeld, judicialToken);
    return {
      id: `SA-${4200 + i}-${Math.floor(epoch / 5)}`,
      kind,
      requestedBy: ['Interior Command', 'Regional Authority', 'Security Cell'][i % 3]!,
      keysHeld, judicialToken, result,
    };
  });
}

// ── 4. Independent oversight mirroring ────────────────────────────────
export type MirrorTarget = 'JUDICIARY' | 'INDEPENDENT_AUDIT' | 'ANTI_CORRUPTION_INSPECTORATE' | 'PARLIAMENT';

export interface OversightMirror {
  stream: string;
  targets: MirrorTarget[];
  immutable: true;
  syncedPct: number;
}

export function oversightMirrors(now: number): OversightMirror[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const streams = ['Audit chain', 'Deadline breaches', 'Surveillance requests', 'Override attempts', 'Escalation actions', 'Unauthorized actions'];
  const all: MirrorTarget[] = ['JUDICIARY', 'INDEPENDENT_AUDIT', 'ANTI_CORRUPTION_INSPECTORATE', 'PARLIAMENT'];
  return streams.map(stream => ({
    stream,
    targets: all,
    immutable: true as const,
    syncedPct: 94 + Math.floor(seed(`cg:mir:${stream}:${epoch}`) * 7),
  }));
}

// ── 5. Constitutional color state ─────────────────────────────────────
export type GovColor = 'green' | 'amber' | 'red' | 'purple' | 'blue';

export function colorState(t: SovereignTxn): GovColor {
  if (t.riskFlags.includes('unlawful-pause')) return 'blue';        // judicial hold
  if (t.constitutional === 'breach') return 'red';                  // constitutional breach
  if (t.corruptionRisk >= 65) return 'purple';                      // escalation review
  if (t.escalation === 'watch') return 'amber';                     // approaching deadline
  return 'green';                                                   // compliant
}

export const GOV_COLOR_CSS: Record<GovColor, string> = {
  green: 'rgb(var(--c-ok))',
  amber: 'rgb(var(--c-warn))',
  red: 'rgb(var(--c-alert))',
  purple: '#8a7df0',
  blue: '#5fb0ff',
};

// ── 6. Citizen accountability projection (redacted) ───────────────────
// Citizens see lawful status only. Confidential investigations,
// protected intelligence and national-security operations are never
// exposed — and officer identity / risk scoring is never citizen-visible.
const CONFIDENTIAL_AGENCIES: Agency[] = ['POLICE', 'BORDER'];

export interface CitizenFileView {
  ref: string;
  office: string;
  protected: boolean;
  stage?: string;
  legalDeadlineHrs?: number;
  ageHrs?: number;
  color?: GovColor;
  escalationPath?: string;
}

export function citizenView(now: number, limit = 40): CitizenFileView[] {
  return observabilityLedger(now).slice(0, limit).map((t): CitizenFileView => {
    const confidential = CONFIDENTIAL_AGENCIES.includes(t.agency)
      && seed(`cg:conf:${t.id}`) > 0.55;
    if (confidential) {
      return { ref: `${t.id.slice(0, 3)}-••••`, office: AGENCY_LABEL[t.agency], protected: true };
    }
    const color = colorState(t);
    return {
      ref: t.id,
      office: AGENCY_LABEL[t.agency],
      protected: false,
      stage: t.stage,
      legalDeadlineHrs: t.legalDeadlineHrs,
      ageHrs: t.ageHrs,
      color,
      escalationPath: color === 'red'
        ? 'Ministry oversight → National coordination → Ombudsman'
        : color === 'amber' || color === 'purple'
          ? 'Ministry oversight (escalation available)'
          : 'Within lawful processing window',
    };
  });
}
