// The constitutional profile's store and the reads every other module needs
// from it (docs/CONSTITUTIONAL_ARCHITECTURE.md §7, §7.2.6, §7.4; plan phase 5).
// Kept apart from lib/constitution/profile.ts (the lifecycle) so the modules
// that only ask "which profile version is in force?" (sealed decisions, the
// access log) or "is this part frozen by a dispute?" (lib/law/policy-change.ts)
// import nothing else: no store, no case engine, no audit chain.
//
// A profile is a versioned package that bundles, by reference and SHA-256
// digest, the parts of the constitution the platform already keeps on their
// own (classification, institution terms, who is responsible, offices,
// relationships, the country's dual-control and suspension rules). Each part
// keeps its own change process; the profile records which version of each was
// approved together, by whom, under which law, from when.
//
// Pure reads: they never change the store (activation at the effective date
// is written by activateDue() in profile.ts, from the scheduled job or a read
// of the profile API); a profile approved and due counts as in force here even
// before that write, so nothing waits on a timer.

import { touch } from '@/lib/data/repo/track';
import type { Citation } from '@/lib/law/register';
import type { PolicyChanges } from '@/lib/law/policy-change';

export type ProfileStatus =
  | 'draft' | 'legal_review' | 'consultation' | 'security_validation' | 'approval' | 'scheduled'
  | 'active' | 'superseded' | 'disputed' | 'suspended_pending_review' | 'withdrawn' | 'set_aside';

/** The parts a profile bundles: each kept and changed on its own (lib/constitution/parts.ts). */
export type PartKey = 'classification' | 'institutions' | 'authorities' | 'offices' | 'relationships' | 'dualControl' | 'suspension' | 'competences' | 'transitionRules';
export const PART_KEYS: PartKey[] = ['classification', 'institutions', 'authorities', 'offices', 'relationships', 'dualControl', 'suspension', 'competences', 'transitionRules'];

/**
 * The change process (policy-change.ts `audit` key) of each part: a dispute
 * freezes a part by refusing new proposals and confirmations under its key
 * (withdrawal stays open).
 */
export const PART_AUDIT: Record<PartKey, string> = {
  classification: 'constitution.classification',
  institutions: 'institution.terms',
  authorities: 'sovereign.authorities',
  offices: 'office.terms',
  relationships: 'institution.relationship',
  dualControl: 'dual-control.policy',
  suspension: 'permit-authority.suspension-policy',
  // Plan phase 6 (lib/transitions): competence allocations between national and subnational institutions, and the
  // country's transition rules (caretaker restrictions, who records each impeachment stage, emergency limits).
  competences: 'transition.competence',
  transitionRules: 'transition.rules',
};
export const PART_LABELS: Record<PartKey, string> = {
  classification: 'Classification of the state',
  institutions: 'Institutions\' standing and independence',
  authorities: 'Who is responsible',
  offices: 'Offices of state',
  relationships: 'Relationships between institutions',
  dualControl: 'Two-official rules for decisions',
  suspension: 'Emergency suspension rules',
  competences: 'Allocation of powers between national and regional institutions',
  transitionRules: 'Rules for transitions and emergencies',
};

/** One part as a profile holds it: the version in force when captured (the count of adopted changes) and the digest of its values. */
export interface PartRef { key: PartKey; label: string; version: number; digest: string; summary: string }

/** What a sealed decision and an access-log entry record: the profile version in force when it happened. */
export interface ProfileRef { id: string; version: number; digest: string }

export interface ProfileActor { by: string; byId?: string; institution?: string }
export interface ProfileEvent extends ProfileActor {
  seq: number; at: string;
  /** What happened: drafted, submitted, legal-review, consulted, validated, approved, scheduled, activated, superseded, disputed, resolved, withdrawn, refreshed. */
  step: string;
  from?: ProfileStatus; to: ProfileStatus;
  note?: string; outcome?: string;
  /** The legal act or decision recorded with the step (an approval's authorising act, a dispute's resolution). */
  reference?: string;
}
export interface ProfileDispute {
  raisedBy: string; raisedById?: string; institution?: string; at: string;
  grounds: string;
  /** The status it was in when disputed (returned to when upheld). */
  statusBefore: ProfileStatus;
  /** The parts it touches, frozen until resolved. */
  frozen: PartKey[];
  resolution?: { by: string; byId?: string; at: string; outcome: 'upheld' | 'set-aside'; reference: string; note?: string };
}

export interface ConstitutionalProfile {
  id: string;
  /** 1, 2 … in the order drafted. */
  version: number;
  title: string;
  status: ProfileStatus;
  parts: PartRef[];
  /** SHA-256 over the canonical JSON of the parts (key, version, digest). */
  digest: string;
  /** The profile in force when this one was drafted (or last refreshed). */
  previous?: ProfileRef;
  /** The parts that differ from the previous profile (all of them for the first). */
  touches: PartKey[];
  /** The date it is to apply from (YYYY-MM-DD). */
  effectiveFrom: string;
  /** The legal instruments the change rests on (laws register), required to leave the draft. */
  basis: Citation[];
  /** Migration and rollback constraints, in words (§7.4). */
  constraints?: string;
  note?: string;
  drafted: ProfileActor & { at: string };
  /** Institutions asked for their view (the consultation step, where the nation requires it or the drafter names them). */
  consult: string[];
  consultations: (ProfileActor & { institution: string; at: string; response: 'agree' | 'object' | 'no-comment'; note?: string })[];
  legalReview?: ProfileActor & { at: string; outcome: 'cleared' | 'returned'; note?: string };
  security?: ProfileActor & { at: string; checks: { label: string; ok: boolean; blocking: boolean; detail?: string }[] };
  approvals: (ProfileActor & { at: string; authorisedBy: string; note?: string; independence: 'identity-provider' | 'accounts-only' | 'unverified' })[];
  activatedAt?: string;
  supersededAt?: string; supersededBy?: string;
  disputes: ProfileDispute[];
  events: ProfileEvent[];
}

/** The nation's own steps for a profile (a country rule set, changed through policy-change.ts). */
export interface ProfileProcessValues {
  /** Whether an institutional consultation is required for every profile (optional: only the institutions the drafter names). */
  consultation: 'optional' | 'required';
  /** How many officials approve: never fewer than two (the platform minimum). */
  approvals: number;
  /** The institution whose officials carry out the legal review (e.g. the attorney-general's office), when the nation names one. */
  legalReviewInstitution?: string;
}
export interface ProfileProcess extends ProfileProcessValues {
  /** False while these are the platform's defaults, not the nation's adopted rules. */
  adopted: boolean;
  changes?: PolicyChanges<ProfileProcessValues>;
}
export const DEFAULT_PROCESS: ProfileProcess = { consultation: 'optional', approvals: 2, adopted: false };

export interface ProfileStore { profiles: ConstitutionalProfile[]; process: ProfileProcess }
const seed = (): ProfileStore => ({ profiles: [], process: structuredClone(DEFAULT_PROCESS) });
const g = globalThis as unknown as { __civicosConstitutionProfile?: ProfileStore };
// Every installation starts with none: no profile is shipped, approved or as a draft (production included).
export const profileDb = (): ProfileStore => {
  const d = touch('__civicosConstitutionProfile', g.__civicosConstitutionProfile ??= seed());
  d.profiles ??= [];
  d.process ??= structuredClone(DEFAULT_PROCESS);
  d.process.consultation ??= 'optional';
  d.process.approvals ??= 2;
  d.process.adopted ??= false;
  for (const p of d.profiles) { p.disputes ??= []; p.events ??= []; p.approvals ??= []; p.consultations ??= []; p.consult ??= []; p.touches ??= []; p.basis ??= []; }
  return d;
};
export function resetConstitutionProfile(): void { g.__civicosConstitutionProfile = undefined; }

const today = (now: Date) => now.toISOString().slice(0, 10);
/** Statuses under which a profile is the status quo: active, or active and under review. */
export const IN_FORCE_STATUSES: ProfileStatus[] = ['active', 'suspended_pending_review'];

/**
 * The profile in force on `now`: the active one (or the active one under
 * review: the status quo stays), or a scheduled one whose date has come and
 * that activateDue() has not yet written; the latest by date.
 */
export function profileInForce(now = new Date()): ConstitutionalProfile | undefined {
  const on = today(now);
  const live = profileDb().profiles.filter(p => IN_FORCE_STATUSES.includes(p.status) || (p.status === 'scheduled' && p.effectiveFrom <= on));
  return live.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.version - b.version).at(-1);
}

/** The reference a consequential action records: the profile version in force, or none when the nation has approved none. */
export function profileRef(now = new Date()): ProfileRef | undefined {
  try {
    const p = profileInForce(now);
    return p ? { id: p.id, version: p.version, digest: p.digest } : undefined;
  } catch { return undefined; }
}

/** The parts frozen by a dispute or a review, with the profile and grounds. */
export function frozenParts(): { part: PartKey; profile: string; version: number; grounds: string }[] {
  const out: { part: PartKey; profile: string; version: number; grounds: string }[] = [];
  for (const p of profileDb().profiles) {
    if (p.status !== 'disputed' && p.status !== 'suspended_pending_review') continue;
    const d = p.disputes.at(-1);
    for (const part of d?.frozen ?? p.touches) out.push({ part, profile: p.id, version: p.version, grounds: d?.grounds ?? '' });
  }
  return out;
}

/**
 * Why a change through policy-change.ts under `audit` is refused because a
 * dispute froze its part, or null. Withdrawing a waiting proposal stays open.
 */
export function frozenRefusal(audit: string): string | null {
  const part = (Object.keys(PART_AUDIT) as PartKey[]).find(k => PART_AUDIT[k] === audit);
  if (!part) return null;
  let hit: ReturnType<typeof frozenParts>[number] | undefined;
  try { hit = frozenParts().find(f => f.part === part); } catch { return null; }
  if (!hit) return null;
  return `${PART_LABELS[part]} is frozen: constitutional profile version ${hit.version} is disputed or under review${hit.grounds ? ` (${hit.grounds.slice(0, 120)})` : ''}. The status quo stays in force until a recorded decision resolves it; only withdrawing a waiting proposal is open (Constitution → Disputes).`;
}
