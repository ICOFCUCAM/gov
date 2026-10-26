// Who keeps each permit, licence and register type (owner's Cycle 3 directive,
// docs/CYCLE_3_ASSESSMENT.md): a versioned, jurisdiction-specific mapping from
// a permit type to the authority the nation's law designates. Each version
// names the lead authority (issues and decides), the authorities consulted
// (mandatory or advisory; a referral never makes them decide), its territorial
// scope, its legal basis in the laws register, the dates it governs, the
// procedures it allows, the approval rule for decisions, who renews,
// suspends and revokes, which body hears appeals, and whether the public may
// check a standing.
//
// A version governs real decisions only once a second official approved it
// (four-eyes, administrators: the structure of government) and only from its
// effective date; until then it is a draft. Approval needs a legal basis that
// resolves in the laws register on the effective date. A change of lead
// authority needs a handover plan and never moves the power to change
// existing records silently: records keep their owner until the effective
// date, every step is audited. The proposed defaults CivicOS ships are
// drafts with no legal basis, marked as proposals; the platform never names
// a country's authority itself.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { dualControlRefusal, DUAL_CONTROL_HOURS } from '@/lib/data/dual-control';
import { uuid7 } from '@/lib/data/uuid7';
import { cite, type Citation } from '@/lib/law/register';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';
import type { AuthorityKey } from '@/lib/nation/deployment';

export type MappingState = 'draft' | 'approved' | 'withdrawn';
export type Scope = { level: 'national' | 'regional' | 'local'; regions?: string[] };

export interface AuthorityMapping {
  id: string;
  permitType: string;
  title: string;
  version: number;
  /** The legally designated issuing authority: a deployment-profile key or an institution id. */
  lead: AuthorityKey | string;
  /** Authorities consulted before a decision; they advise or approve their part, never decide the permit. */
  consulted: { authority: string; role: string; mandatory: boolean }[];
  scope: Scope;
  legalBasis: Citation[];
  effectiveFrom: string;
  effectiveTo?: string;
  /** Procedure keys allowed for this permit type (lib/casework). */
  procedures: string[];
  decision: { role: 'signatory'; fourEyes: boolean };
  powers: { renew: string; suspend: string; revoke: string; appealBody: string };
  publicCheck: boolean;
  /** Required when the lead authority differs from the version in force before it. */
  handover?: { from: string; plan: string };
  state: MappingState;
  /** A default CivicOS proposes; never in force until a nation approves its own version. */
  proposal: boolean;
  /** What a nation should consider before approving (proposed defaults). */
  note?: string;
  draftedBy: string; draftedById?: string; draftedAt: string;
  approvedBy?: string; approvedById?: string; approvedAt?: string;
  withdrawn?: { by: string; at: string; reason: string };
  /** Emergency suspensions of this approved version, every one kept (newest last). */
  suspensions?: Suspension[];
}

/**
 * An emergency suspension (acceptance hardening G): from the moment it is
 * made no new decision rests on the mapping; earlier decisions stand. A
 * different official confirms it within the policy period and reviews it by
 * its review date; a different official from the one who made it lifts it.
 * An unconfirmed or unreviewed suspension stays in force and is flagged.
 */
export interface Suspension {
  id: string;
  at: string; by: string; byId?: string;
  reason: string;
  /** The date by which it must be reviewed (lifted or kept with a new review date). */
  reviewBy: string;
  confirmed?: { at: string; by: string; byId?: string };
  reviews?: { at: string; by: string; byId?: string; reviewBy: string; reason: string }[];
  lifted?: { at: string; by: string; byId?: string; reason: string };
  /** Overdue flags already raised (once each). */
  raised?: ('unconfirmed' | 'review-overdue')[];
}

/**
 * The suspension policy: platform safety defaults until the country adopts
 * its own periods (who may suspend is the administrators until a country
 * rule says otherwise; the platform does not invent emergency powers).
 */
export interface SuspensionPolicy {
  confirmWithinHours: number; reviewWithinDays: number;
  /** Who may suspend: any administrator (the default), or only the government-wide administrators (not an institution's own). */
  suspendBy?: 'administrator' | 'government-administrator';
  adopted: boolean; by?: string; at?: string;
  /** Periods adopted before citations were required: the instrument as typed. */
  basis?: string;
  citations?: Citation[]; confirmedBy?: string;
  changes?: PolicyChanges<SuspensionValues>;
}
export type SuspensionValues = Pick<SuspensionPolicy, 'confirmWithinHours' | 'reviewWithinDays'> & { suspendBy: 'administrator' | 'government-administrator' };
export const DEFAULT_SUSPENSION_POLICY: SuspensionPolicy = { confirmWithinHours: 72, reviewWithinDays: 30, suspendBy: 'administrator', adopted: false };

interface Db { mappings: AuthorityMapping[]; suspensionPolicy?: SuspensionPolicy }
const g = globalThis as unknown as { __civicosPermitAuthorities?: Db };
const db = (): Db => { const d = touch('__civicosPermitAuthorities', g.__civicosPermitAuthorities ??= { mappings: [] }); d.mappings ??= []; d.suspensionPolicy ??= { ...DEFAULT_SUSPENSION_POLICY }; d.suspensionPolicy.suspendBy ??= 'administrator'; return d; };
export function resetPermitAuthorities(): void { g.__civicosPermitAuthorities = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const KEY = /^[a-z][a-z0-9-]{1,60}$/;
export const TO_BE_DESIGNATED = 'to-be-designated';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface MappingInput {
  permitType?: unknown; title?: unknown; lead?: unknown; consulted?: unknown; scope?: unknown;
  legalBasis?: unknown; effectiveFrom?: unknown; effectiveTo?: unknown; procedures?: unknown;
  fourEyes?: unknown; powers?: unknown; publicCheck?: unknown; handoverPlan?: unknown;
}

/** Draft the next version of a permit type's mapping. Citations are resolved against the laws register on the effective date. */
export function draftMapping(input: MappingInput, by: string, byId?: string, now = new Date(), proposal = false): AuthorityMapping | { error: string } {
  const permitType = str(input.permitType, 61);
  if (!KEY.test(permitType)) return { error: 'A permit type has a short key: lower-case letters, digits and hyphens (e.g. pharmacy-licence)' };
  const title = str(input.title, 200);
  if (title.length < 3) return { error: 'Give the permit type its name' };
  const lead = str(input.lead, 80);
  if (!lead) return { error: 'Name the lead authority (a responsible authority or an institution)' };
  const effectiveFrom = str(input.effectiveFrom, 10);
  if (!DATE.test(effectiveFrom)) return { error: 'Say from which date the mapping governs (YYYY-MM-DD)' };
  const effectiveTo = str(input.effectiveTo, 10);
  if (effectiveTo && (!DATE.test(effectiveTo) || effectiveTo <= effectiveFrom)) return { error: 'An end date is after the start date (YYYY-MM-DD)' };
  const scopeIn = (input.scope ?? {}) as { level?: string; regions?: unknown };
  const level = ['national', 'regional', 'local'].includes(String(scopeIn.level)) ? scopeIn.level as Scope['level'] : 'national';
  const regions = Array.isArray(scopeIn.regions) ? scopeIn.regions.map(r => str(r, 120)).filter(Boolean).slice(0, 200) : [];
  if (level !== 'national' && !regions.length) return { error: 'A regional or local mapping names the regions it covers' };
  const consulted = (Array.isArray(input.consulted) ? input.consulted : []).map(c => c as { authority?: unknown; role?: unknown; mandatory?: unknown })
    .map(c => ({ authority: str(c.authority, 80), role: str(c.role, 200) || 'Consulted', mandatory: c.mandatory === true })).filter(c => c.authority).slice(0, 20);
  if (consulted.some(c => c.authority === lead)) return { error: 'The lead authority is not also a consulted one' };
  const legalBasis: Citation[] = [];
  for (const l of (Array.isArray(input.legalBasis) ? input.legalBasis : []).slice(0, 20)) {
    const x = l as { instrument?: unknown; eId?: unknown };
    const c = cite(str(x.instrument, 300), str(x.eId, 200), effectiveFrom, `Authority for ${permitType}`);
    if ('error' in c) return { error: `Legal basis: ${c.error}` };
    legalBasis.push(c);
  }
  const p = (input.powers ?? {}) as Record<string, unknown>;
  const powers = { renew: str(p.renew, 80) || lead, suspend: str(p.suspend, 80) || lead, revoke: str(p.revoke, 80) || lead, appealBody: str(p.appealBody, 200) };
  const versions = db().mappings.filter(m => m.permitType === permitType);
  const m: AuthorityMapping = {
    id: uuid7(), permitType, title, version: Math.max(0, ...versions.map(v => v.version)) + 1, lead, consulted,
    scope: { level, ...(regions.length ? { regions } : {}) }, legalBasis, effectiveFrom, ...(effectiveTo ? { effectiveTo } : {}),
    procedures: (Array.isArray(input.procedures) ? input.procedures : []).map(x => str(x, 80)).filter(Boolean).slice(0, 30),
    decision: { role: 'signatory', fourEyes: input.fourEyes !== false }, powers, publicCheck: input.publicCheck !== false,
    ...(str(input.handoverPlan, 2000) ? { handover: { from: '', plan: str(input.handoverPlan, 2000) } } : {}),
    state: 'draft', proposal, draftedBy: by, ...(byId ? { draftedById: byId } : {}), draftedAt: now.toISOString(),
  };
  db().mappings.push(m);
  recordAudit(by, 'permit-authority.draft', `PermitType:${permitType}@${m.version}`, 'ok', `${title} · lead ${lead} · from ${effectiveFrom}${proposal ? ' · proposed default' : ''}`);
  return clone(m);
}

/** The approved version that governs a permit type on a date (none: no authority is established for it). */
export function mappingInForce(permitType: string, on = new Date().toISOString().slice(0, 10)): AuthorityMapping | undefined {
  const m = approvedOn(permitType, on);
  return m && !activeSuspension(m) ? clone(m) : undefined;
}

/** The approved version whose dates cover a day, suspended or not. */
function approvedOn(permitType: string, on: string): AuthorityMapping | undefined {
  return db().mappings.filter(m => m.permitType === permitType && m.state === 'approved' && m.effectiveFrom <= on && (!m.effectiveTo || on < m.effectiveTo))
    .sort((a, b) => b.version - a.version)[0];
}
const activeSuspension = (m: AuthorityMapping): Suspension | undefined => m.suspensions?.find(x => !x.lifted);

/** The emergency suspension holding a permit type's mapping on a day, if any. */
export function suspensionInForce(permitType: string, on = new Date().toISOString().slice(0, 10)): { version: number; suspension: Suspension } | undefined {
  const m = approvedOn(permitType, on);
  const s = m && activeSuspension(m);
  return m && s ? { version: m.version, suspension: clone(s) } : undefined;
}

export const suspensionPolicy = (): SuspensionPolicy => clone(db().suspensionPolicy!);

const POLICY_AUDIT = 'permit-authority.suspension-policy';
const policyValues = (p: SuspensionPolicy): SuspensionValues => ({ confirmWithinHours: p.confirmWithinHours, reviewWithinDays: p.reviewWithinDays, suspendBy: p.suspendBy ?? 'administrator' });
const describePolicy = (v: SuspensionValues) => `confirm within ${v.confirmWithinHours} h · review within ${v.reviewWithinDays} d · suspended by ${v.suspendBy === 'government-administrator' ? 'government-wide administrators only' : 'any administrator'}`;
const checkPolicy = (v: SuspensionValues): string | null => {
  if (!Number.isInteger(v.confirmWithinHours) || v.confirmWithinHours < 1 || v.confirmWithinHours > 720) return 'The confirmation period is a whole number of hours from 1 to 720';
  if (!Number.isInteger(v.reviewWithinDays) || v.reviewWithinDays < 1 || v.reviewWithinDays > 365) return 'The review period is a whole number of days from 1 to 365';
  if (v.suspendBy !== 'administrator' && v.suspendBy !== 'government-administrator') return 'Who may suspend is administrator or government-administrator';
  return null;
};

/**
 * The country proposes its own periods and who may suspend, citing the law
 * (lib/law/policy-change.ts): one administrator proposes, values left out
 * keep their current setting; a different official confirms
 * (confirmSuspensionPolicy). `pendingHours` and `requireIdentityBinding` come
 * from the dual-control rules (passed in: that module depends on this one).
 */
export function proposeSuspensionPolicy(input: { confirmWithinHours?: unknown; reviewWithinDays?: unknown; suspendBy?: unknown; legalBasis?: unknown }, by: string, byId?: string, now = new Date(), pendingHours = DUAL_CONTROL_HOURS) {
  const p = db().suspensionPolicy!;
  const change: Partial<SuspensionValues> = {
    ...(input.confirmWithinHours !== undefined ? { confirmWithinHours: Number(input.confirmWithinHours) } : {}),
    ...(input.reviewWithinDays !== undefined ? { reviewWithinDays: Number(input.reviewWithinDays) } : {}),
    ...(input.suspendBy !== undefined ? { suspendBy: input.suspendBy as SuspensionValues['suspendBy'] } : {}),
  };
  return proposePolicy(p.changes ??= {}, policyValues(p), change, input.legalBasis, { by, ...(byId ? { byId } : {}), now, pendingHours, audit: POLICY_AUDIT, context: 'Emergency suspension of authority mappings', check: checkPolicy, describe: describePolicy });
}

/** A different official confirms the proposed periods: they apply to suspensions made from now. */
export function confirmSuspensionPolicy(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const p = db().suspensionPolicy!;
  return confirmPolicy(p.changes ??= {}, {
    by, ...(byId ? { byId } : {}), now, audit: POLICY_AUDIT, requireIdentityBinding, describe: describePolicy,
    adopt: (v: PolicyVersion<SuspensionValues>) => Object.assign(p, v.values, { adopted: true, by: v.by, at: v.confirmed!.at, confirmedBy: v.confirmed!.by, citations: v.basis, basis: undefined }),
  });
}
export const lapseSuspensionPolicy = (now = new Date()) => lapsePolicy(db().suspensionPolicy!.changes ??= {}, now, POLICY_AUDIT);
export const withdrawSuspensionPolicy = (by: string, reason?: string) => withdrawPolicy(db().suspensionPolicy!.changes ??= {}, { by, ...(reason ? { reason } : {}), audit: POLICY_AUDIT });

/** Whether this official may suspend under the country's rule (the route has already checked they are an administrator). */
export function suspenderRefusal(scope: { institution?: string } | null | undefined): string | null {
  if ((db().suspensionPolicy!.suspendBy ?? 'administrator') !== 'government-administrator') return null;
  if (!scope) return 'The country reserves emergency suspension to government-wide administrators: sign in as one';
  return scope.institution ? 'The country reserves emergency suspension to government-wide administrators, not an institution\'s own' : null;
}

const sameOfficial = (a: { by: string; byId?: string }, b: { by: string; byId?: string }) => !!dualControlRefusal(a, b);
const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Suspend an approved mapping in an emergency: no new decision rests on it from now. */
export function suspendMapping(permitType: string, version: number, input: { reason?: unknown; reviewBy?: unknown }, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  if (!m) return { error: 'No such mapping version' };
  if (m.state !== 'approved') return { error: 'Only an approved mapping is suspended (a draft governs nothing)' };
  if (activeSuspension(m)) return { error: 'This mapping is already suspended' };
  const reason = str(input.reason, 1000);
  if (!reason) return { error: 'State the reason for the emergency suspension' };
  const at = now.toISOString(), policy = db().suspensionPolicy!;
  const latest = addDays(at, policy.reviewWithinDays);
  const reviewBy = str(input.reviewBy, 10) || latest;
  if (!DATE.test(reviewBy) || reviewBy <= at.slice(0, 10) || reviewBy > latest) return { error: `The review date is after today and no later than ${latest} (the policy's ${policy.reviewWithinDays} days)` };
  const sus: Suspension = { id: uuid7(), at, by, ...(byId ? { byId } : {}), reason, reviewBy };
  (m.suspensions ??= []).push(sus);
  recordAudit(by, 'permit-authority.suspend', `PermitType:${permitType}@${version}`, 'ok', `review by ${reviewBy} · to be confirmed within ${policy.confirmWithinHours} h · ${reason.slice(0, 200)}`);
  return clone(m);
}

/** A different official confirms the suspension within the policy period. */
export function confirmSuspension(permitType: string, version: number, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  const s = m && activeSuspension(m);
  if (!m || !s) return { error: 'No suspension of this mapping version is in force' };
  if (s.confirmed) return { error: 'Already confirmed' };
  if (sameOfficial(s, { by, byId })) return { error: 'A different official confirms the suspension' };
  const deadline = Date.parse(s.at) + db().suspensionPolicy!.confirmWithinHours * 3_600_000;
  if (now.getTime() > deadline) return { error: 'The confirmation period has passed: the suspension stays in force, flagged for review; lift it or review it' };
  s.confirmed = { at: now.toISOString(), by, ...(byId ? { byId } : {}) };
  recordAudit(by, 'permit-authority.suspend.confirm', `PermitType:${permitType}@${version}`, 'ok', `suspended by ${s.by}`);
  return clone(m);
}

/** A review keeps the suspension with a new review date (a different official from the one who suspended it). */
export function reviewSuspension(permitType: string, version: number, input: { reason?: unknown; reviewBy?: unknown }, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  const s = m && activeSuspension(m);
  if (!m || !s) return { error: 'No suspension of this mapping version is in force' };
  if (sameOfficial(s, { by, byId })) return { error: 'A different official from the one who suspended it reviews it' };
  const reason = str(input.reason, 1000);
  if (!reason) return { error: 'State why the suspension continues' };
  const latest = addDays(now.toISOString(), db().suspensionPolicy!.reviewWithinDays);
  const reviewBy = str(input.reviewBy, 10);
  if (!DATE.test(reviewBy) || reviewBy <= now.toISOString().slice(0, 10) || reviewBy > latest) return { error: `The next review date is after today and no later than ${latest}` };
  (s.reviews ??= []).push({ at: now.toISOString(), by, ...(byId ? { byId } : {}), reviewBy, reason });
  s.reviewBy = reviewBy;
  s.raised = (s.raised ?? []).filter(r => r !== 'review-overdue');
  recordAudit(by, 'permit-authority.suspend.review', `PermitType:${permitType}@${version}`, 'ok', `continues to ${reviewBy} · ${reason.slice(0, 200)}`);
  return clone(m);
}

/** Lift a suspension (a different official from the one who made it): decisions may rest on the mapping again. */
export function liftSuspension(permitType: string, version: number, reason: unknown, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  const s = m && activeSuspension(m);
  if (!m || !s) return { error: 'No suspension of this mapping version is in force' };
  if (sameOfficial(s, { by, byId })) return { error: 'A different official from the one who suspended it lifts it' };
  const why = str(reason, 1000);
  if (!why) return { error: 'State why the suspension is lifted' };
  s.lifted = { at: now.toISOString(), by, ...(byId ? { byId } : {}), reason: why };
  recordAudit(by, 'permit-authority.suspend.lift', `PermitType:${permitType}@${version}`, 'ok', why.slice(0, 200));
  return clone(m);
}

/** Raise each overdue suspension once (unconfirmed past the period; review date passed): run by the daily job. */
export function raiseSuspensionAlerts(now = new Date()): { permitType: string; version: number; flag: 'unconfirmed' | 'review-overdue' }[] {
  const out: { permitType: string; version: number; flag: 'unconfirmed' | 'review-overdue' }[] = [];
  const hours = db().suspensionPolicy!.confirmWithinHours, today = now.toISOString().slice(0, 10);
  for (const m of db().mappings) {
    const s = activeSuspension(m);
    if (!s) continue;
    const flags: ('unconfirmed' | 'review-overdue')[] = [];
    if (!s.confirmed && now.getTime() > Date.parse(s.at) + hours * 3_600_000) flags.push('unconfirmed');
    if (s.reviewBy < today) flags.push('review-overdue');
    for (const f of flags) {
      if (s.raised?.includes(f)) continue;
      (s.raised ??= []).push(f);
      recordAudit('System (suspension watch)', `permit-authority.suspension.${f}`, `PermitType:${m.permitType}@${m.version}`, 'ok', f === 'unconfirmed' ? `suspended by ${s.by} on ${s.at.slice(0, 10)}; still in force` : `review was due ${s.reviewBy}; still in force`);
      out.push({ permitType: m.permitType, version: m.version, flag: f });
    }
  }
  return out;
}

/** A second official approves a draft; from its effective date it governs decisions. */
export function approveMapping(permitType: string, version: number, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  if (!m) return { error: 'No such mapping version' };
  if (m.state !== 'draft') return { error: `This version is ${m.state}` };
  // The same rule as every two-official step: a different signed-in official, and a different person at the identity provider.
  if (dualControlRefusal({ by: m.draftedBy, byId: m.draftedById }, { by, byId })) return { error: 'A different official approves the mapping (four-eyes)' };
  if (m.lead === TO_BE_DESIGNATED) return { error: 'Name the lead authority the law designates before approving' };
  if (!m.legalBasis.length) return { error: 'A mapping governs decisions only with its legal basis cited from the laws register' };
  // The version before it, suspended or not (a suspended lead still hands over).
  const previous = approvedOn(permitType, m.effectiveFrom) ?? approvedOn(permitType, now.toISOString().slice(0, 10));
  if (previous && previous.lead !== m.lead) {
    if (!m.handover?.plan) return { error: `The lead authority changes from ${previous.lead} to ${m.lead}: a handover plan is needed (records, open cases, appeals)` };
    m.handover = { from: previous.lead, plan: m.handover.plan };
  }
  // The version before it stops governing when this one starts.
  for (const x of db().mappings) if (x.permitType === permitType && x.state === 'approved' && x.version < m.version && (!x.effectiveTo || x.effectiveTo > m.effectiveFrom)) x.effectiveTo = m.effectiveFrom;
  Object.assign(m, { state: 'approved', approvedBy: by, ...(byId ? { approvedById: byId } : {}), approvedAt: now.toISOString() });
  recordAudit(by, 'permit-authority.approve', `PermitType:${permitType}@${version}`, 'ok', `${m.title} · lead ${m.lead} from ${m.effectiveFrom}${m.handover ? ` · handover from ${m.handover.from}` : ''} · drafted by ${m.draftedBy}`);
  return clone(m);
}

export function withdrawMapping(permitType: string, version: number, reason: string, by: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  if (!m) return { error: 'No such mapping version' };
  if (m.state !== 'draft') return { error: 'Only a draft is withdrawn; an approved mapping is replaced by a newer approved version' };
  if (!reason.trim()) return { error: 'Say why it is withdrawn' };
  Object.assign(m, { state: 'withdrawn', withdrawn: { by, at: now.toISOString(), reason: reason.slice(0, 500) } });
  recordAudit(by, 'permit-authority.withdraw', `PermitType:${permitType}@${version}`, 'ok', reason.slice(0, 200));
  return clone(m);
}

export const listMappings = (permitType?: string): AuthorityMapping[] => db().mappings.filter(m => !permitType || m.permitType === permitType).map(clone);

/**
 * May this institution exercise this power over this permit type on this
 * date? null when yes. With no approved mapping the answer is the caller's
 * own rule (the register type's authority); `required` makes a missing
 * mapping a refusal (production decisions need one).
 */
export type Power = 'issue' | 'renew' | 'suspend' | 'revoke';

export function powerRefusal(permitType: string, power: Power, institution: string, resolve: (authority: string) => string | undefined, opts: { on?: string; required?: boolean } = {}): string | null {
  // An emergency suspension blocks every new decision, in every installation mode.
  const held = suspensionInForce(permitType, opts.on);
  if (held) return `The authority mapping for ${permitType} (version ${held.version}) is suspended since ${held.suspension.at.slice(0, 10)}: ${held.suspension.reason.slice(0, 120)}. No decision until it is lifted`;
  const m = mappingInForce(permitType, opts.on);
  if (!m) return opts.required ? `No approved authority mapping governs ${permitType}: the nation approves one first (Permit authorities)` : null;
  const holder = power === 'issue' ? m.lead : m.powers[power];
  return resolve(holder) === institution ? null : `${m.title}: ${power === 'issue' ? 'issuing' : `the power to ${power}`} belongs to ${holder} under the approved mapping (version ${m.version})`;
}

/** The permit types of the earlier permit workflow (lib/data/store/permits.ts) and the mapping key each is governed by. */
export const LEGACY_PERMIT_TYPES: Record<string, string> = {
  building: 'building-permit', business: 'trading-licence', 'market-stall': 'market-stall-permit',
  event: 'event-permit', vehicle: 'vehicle-registration', 'food-handling': 'food-handling-permit',
};

/** Defaults CivicOS proposes (owner's Cycle 3 directive): drafts, no legal basis, never in force until the nation approves its own version. */
export const PROPOSED_DEFAULTS: { permitType: string; title: string; lead: string; note: string; consulted?: { authority: string; role: string; mandatory: boolean }[] }[] = [
  { permitType: 'business-registration', title: 'Business registration', lead: 'businessRegister', note: 'Separate company incorporation from sector-specific operating licences.' },
  { permitType: 'trading-licence', title: 'General trading licence', lead: 'businessRegister', note: 'Local governments may issue certain local trading permits.' },
  { permitType: 'university-accreditation', title: 'University accreditation', lead: 'higherEducationAccreditation', note: 'The accrediting body may be independent of the education ministry.' },
  { permitType: 'school-registration', title: 'School registration', lead: 'education', note: 'Distinguish registration, inspection and accreditation.' },
  { permitType: 'health-facility-licence', title: 'Health facility licence', lead: 'healthRegulation', note: 'Could be a separate regulator or a professional or health council.' },
  { permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'healthRegulation', note: 'Separate premises licensing from professional registration and medicine authorisation.' },
  { permitType: 'health-professional-licence', title: 'Health professional licence', lead: 'professionalRegulation', note: 'Different professions may have different statutory regulators.' },
  { permitType: 'building-permit', title: 'Construction or building permit', lead: '', note: 'Local government or the legally designated planning authority; may depend on location, building class and national planning law.' },
  { permitType: 'land-title', title: 'Land title registration', lead: '', note: 'Land registry authority; do not conflate title registration with planning or construction permission.' },
  { permitType: 'environmental-permit', title: 'Environmental permit', lead: '', note: 'Environmental regulator or designated ministry; different activities may need separate approvals.' },
  { permitType: 'work-permit', title: 'Work permit', lead: 'immigration', note: 'Immigration or labour authority as national law provides; sponsorship and residence may be separate decisions.', consulted: [{ authority: 'labour', role: 'Labour market opinion where the law requires it', mandatory: false }] },
  { permitType: 'visa-residence', title: 'Visa and residence permit', lead: 'immigration', note: 'Already within the immigration domain.' },
  { permitType: 'customs-authorisation', title: 'Customs import or export authorisation', lead: 'customs', note: 'Product-specific permits may belong to health, agriculture or other regulators.' },
  { permitType: 'vehicle-registration', title: 'Vehicle registration', lead: '', note: 'Vehicle registration authority; separate registration from driving licences and roadworthiness.' },
  { permitType: 'transport-operator-licence', title: 'Transport operator licence', lead: '', note: 'Transport regulator or designated ministry; local and national routes may differ.' },
  { permitType: 'tax-registration', title: 'Tax registration', lead: 'tax', note: 'A tax account does not itself authorise a business to operate.' },
  // Liabilities and records whose decisions the platform classifies (lib/permits/decisions.ts).
  { permitType: 'tax-assessment', title: 'Tax assessment and its variation', lead: 'tax', note: 'Assessments and decisions on objections; the law may give some taxes to another body (local rates, social contributions).' },
  // Tax services (plan step I5, forms batch 6): proposals naming the tax slot, citing nothing until the nation approves its own.
  { permitType: 'tax-refund', title: 'Tax refund decision', lead: 'tax', note: 'Reference procedure tax.refund: approval, adjustment or refusal of a refund claim by two officials; the payment is instructed and reconciled against the payout, once. Interest on refunds only by an approved rule.' },
  { permitType: 'tax-payment-arrangement', title: 'Payment arrangement for tax debt', lead: 'tax', note: 'Reference procedures tax.payment-plan and tax.payment-plan-review: approval, variation, cancellation and default of an arrangement over assessed liabilities. A debt-management unit or another body may hold this power under the law.' },
  { permitType: 'tax-ruling', title: 'Formal tax ruling', lead: 'tax', note: 'Reference procedure tax.ruling, only where the law provides formal rulings; who is bound by a ruling and whether it is published are the law\'s.' },
  { permitType: 'tax-compliance-review', title: 'Authorisation of a tax compliance review (audit scope)', lead: 'tax', note: 'Reference procedure tax.compliance: the legal basis and scope of a review, authorised by two officials; the resulting assessment rests on tax-assessment. No risk score decides selection or liability.' },
  { permitType: 'customs-clearance', title: 'Customs duty assessment and release of goods', lead: 'customs', note: 'Duty assessment, release and refusal of release; other regulators\' import conditions are referred, not decided here.' },
  { permitType: 'qualification-record', title: 'Record of qualifications', lead: 'education', note: 'An examinations council or qualifications authority may keep this record instead of the education ministry.' },
  // Medicines and medical devices (Health I4, permit-mappings): proposals naming the medicines and controlled-substances slots, citing nothing until the nation approves its own.
  { permitType: 'medicine-marketing-authorisation', title: 'Marketing authorisation of a medicine (and its variation, renewal, suspension and withdrawal)', lead: 'medicinesRegulation', note: 'The medicines regulator the law names; separate from pharmacy premises licensing and professional registration.' },
  { permitType: 'medical-device-registration', title: 'Registration of a medical device', lead: 'medicinesRegulation', note: 'Some nations give devices to a separate regulator or a conformity-assessment body.' },
  { permitType: 'product-recall', title: 'Recall of a medicine or medical device', lead: 'medicinesRegulation', note: 'The law may oblige the holder to recall and give the regulator the power to order it; a safety signal is assessed, never a finding by itself.' },
  { permitType: 'medicine-manufacturing-licence', title: 'Licence to manufacture medicines or medical devices', lead: 'medicinesRegulation', note: 'Good-practice inspection of the site precedes the licence.' },
  { permitType: 'medicine-import-licence', title: 'Licence to import medicines or medical devices', lead: 'medicinesRegulation', note: 'The licence of the importer; each consignment\'s import authorisation is a separate permit type.' },
  { permitType: 'medicine-wholesale-licence', title: 'Licence to distribute medicines wholesale', lead: 'medicinesRegulation', note: 'Distinct from a pharmacy\'s retail licence.' },
  { permitType: 'medicine-import-authorisation', title: 'Authorisation to import a consignment of medicines', lead: 'medicinesRegulation', note: 'Reference procedure medicines.import-authorisation (HLT-MED-013). Customs learns only whether an authorisation is valid (the exchange service product.import-authorisation); customs keeps its own powers.' },
  { permitType: 'controlled-medicine-authorisation', title: 'Authorisation to handle controlled medicines', lead: 'controlledSubstances', note: 'The authority the controlled-substances law names; the medicines regulator where the law gives it the power. Reference procedure medicines.controlled (HLT-MED-014): an organisation, a product and a quantity within the limits the law sets, never a named patient.' },
  { permitType: 'good-practice-corrective-action', title: 'Acceptance and closure of a corrective action plan after a good-practice inspection', lead: 'medicinesRegulation', note: 'Reference procedure medicines.corrective-action (HLT-MED-012); the period for each grade of deficiency is the nation\'s rule. The inspectorate may be a separate body.' },
  { permitType: 'product-safety-assessment', title: 'Assessment of safety reports and device incidents, and safety alerts', lead: 'medicinesRegulation', note: 'Reference procedures medicines.safety-report and medicines.device-incident (HLT-MED-015, 020): a signal is assessed by officials, never a finding by itself; a recall or suspension is its own case.' },
  { permitType: 'medicines-decision-reconsideration', title: 'Reconsideration of a medicines regulatory decision', lead: 'medicinesRegulation', note: 'Reference procedure medicines.reconsideration (HLT-MED-023), decided by officials other than those who made the decision. The law may name a separate review body; an appeal to a court stays with the judiciary.' },
  // Public-health programme administration (Health I4): the public-health authority the nation names; programme-level and area-level only.
  { permitType: 'public-health-programme', title: 'Establishment, amendment, suspension and closure of a public-health programme', lead: 'publicHealth', note: 'Reference procedures public-health.programme and public-health.programme-change: eligibility cited from the nation\'s law, coverage with its documented denominator, budget reference, reporting period. Administrative records and aggregates only.' },
  { permitType: 'public-health-intervention', title: 'Public-health intervention for an area or a population', lead: 'publicHealth', note: 'Reference procedure public-health.intervention, under the nation\'s intervention authority, review and expiry rules (CFG-PH-003, shipped empty; production refuses a kind no adopted rule covers). Orders on individuals are outside the platform\'s scope.' },
  { permitType: 'public-health-communication', title: 'Approval of a public-health risk communication', lead: 'publicHealth', note: 'Reference procedure public-health.risk-communication (HLT-PH-014): the message, its audience and evidence basis, approved by two officials and released exactly as approved.' },
  // Independent oversight (plan I8, lib/oversight/procedures.ts): each body's decisions under its own permit type, the lead its slot of the
  // deployment profile (shipped empty). A recommendation is never an order; what the institution concerned does is decided under its own procedures.
  { permitType: 'ombudsman-recommendation', title: 'Ombudsman: admissibility of a complaint, and findings and recommendations', lead: 'ombudsman', note: 'Reference procedure ombudsman.complaint (DEM-CON-012). The ombudsman\'s law sets its mandate, its powers of investigation and whether a recommendation binds; the complainant\'s identity is kept apart (lib/oversight/protected-identity.ts).' },
  { permitType: 'human-rights-recommendation', title: 'Human rights institution: admissibility of a complaint, and findings and recommendations', lead: 'humanRights', note: 'Reference procedure human-rights.complaint (DEM-CON-013). The institution\'s law (informed by the Paris Principles) sets its powers; complainants, witnesses and vulnerable people are protected.' },
  { permitType: 'integrity-finding', title: 'Anti-corruption commission: admissibility of a disclosure, and findings within its authority', lead: 'anticorruption', note: 'Reference procedure integrity.disclosure (DEM-CON-019, DEM-PUB-009). A referral to a prosecution or a court carries the case reference only (prosecution referrals: legal review, plan I11). A flagged transaction is not proof of corruption.' },
  { permitType: 'public-audit-report', title: 'Public audit office: approval of an audit plan and of the audit report', lead: 'supremeAudit', note: 'Reference procedure audit.engagement (DEM-CON-014, DEM-CON-020). The audit office\'s governance approves its plan and report; the audited institution answers beside a finding and never edits it.' },
  { permitType: 'data-protection-decision', title: 'Data-protection authority: decisions on rights requests and investigations', lead: 'dataProtection', note: 'Reference procedures data-protection.rights-request (DEM-CON-018) and data-protection.investigation. The authority asks the controller under an approved relationship and never reads the records itself; its powers of order and sanction are the nation\'s law.' },
  // Territory and infrastructure (plan I7): proposals naming the slots of the deployment profile (shipped empty), citing nothing until the nation approves its own.
  { permitType: 'land-dealing-registration', title: 'Registration of dealings in registered land: transfers and successions, leases, mortgages, easements, caveats and restrictions, their discharge and corrections', lead: 'landRegistry', note: 'Reference procedures land.transfer, land.encumbrance, land.discharge and land.correction (LND-REG-007 … 012, 016, 020, 021): the parties and the instrument verified, objections and caveats checked, registered by two officials as a new version of the parcel. Deeds-registration, customary and other tenure systems need their own versions; first registration of title is the separate land-title type.' },
  { permitType: 'land-dispute-decision', title: 'Decision of a land registration dispute, objection or conflicting title', lead: 'landRegistry', note: 'Reference procedure land.dispute (LND-REG-005, 017, 022): the interest is held from registration until decided. The law may give disputes to an adjudication officer, a land tribunal or the courts; a referral keeps the interest held until the order is recorded.' },
  { permitType: 'planning-permission', title: 'Planning permission for a development on a parcel', lead: 'buildingControl', note: 'Reference procedure building.planning (HPC-PLN-009, 012, 013). Planning is often a local government\'s power for its area: approve a regional or local version naming it as lead. A permission is not a building approval, ownership or occupancy.' },
  { permitType: 'building-enforcement', title: 'Stop-work orders on building work and their lifting', lead: 'buildingControl', note: 'Reference procedure building.permit, steps stop-work and lift-stop (HPC-BLD-019): the order cites the provision breached and states the review route; lifting is confirmed by a second official.' },
  { permitType: 'occupancy-certificate', title: 'Occupancy or completion certificate', lead: 'buildingControl', note: 'Reference procedure building.permit, steps certify-occupancy and refuse-occupancy (HPC-BLD-020): only after the final inspection; separate from the permit and from completion.' },
  { permitType: 'housing-programme', title: 'Registration of a housing programme and its eligibility and priority rules', lead: 'housing', note: 'Reference procedure housing.programme (HPC-HOU-001): the criteria and priority points are the nation\'s, entered and approved by two officials citing the law; none ship.' },
  { permitType: 'housing-allocation', title: 'Housing eligibility and allocation decisions', lead: 'housing', note: 'Reference procedure housing.application (HPC-HOU-002 … 004): eligibility from the programme\'s terms in force, a home allocated by an official with reasons; an allocation out of priority order says so.' },
  { permitType: 'driving-licence', title: 'Driving licence (issue)', lead: 'vehicleRegistration', note: 'Reference procedure transport.driving-licence (TRN-DRV-001): categories and validity as the law sets them; medical fitness only as a sealed document\'s reference. Separate from vehicle registration and operator licensing.' },
  { permitType: 'road-works-permit', title: 'Permit for works in a public road (and the closure it needs)', lead: 'roadAuthority', note: 'Reference procedure transport.road-works (TRN-ROAD-002, 003): place from the map, period, traffic management plan. Local roads may be a local government\'s: approve a local version naming it.' },
  // The economic group (plan step I5): budget and treasury under the finance slot, the Cabinet office's records under its slot,
  // each institution's own procurement (lead "procuring-entity": the institution conducting it) and the review body's complaints.
  // Proposals naming the slots, citing nothing until the nation approves its own; none governs anything until then.
  { permitType: 'budget-circular', title: 'Issue of the budget call circular', lead: 'finance', note: 'Reference procedure budget.circular. The budget calendar and its submission windows are the nation\'s (country.budget.calendar).' },
  { permitType: 'budget-ceiling', title: 'Approval of an institution\'s budget ceiling', lead: 'finance', note: 'Reference procedure budget.ceiling. Who approves ceilings (a minister, the cabinet, the budget office) is the nation\'s law.' },
  { permitType: 'budget-allocation', title: 'Allocation of an institutional budget bid', lead: 'finance', note: 'Reference procedure budget.bid: within the approved ceiling. An allocation is a budget proposal, never an appropriation: the legislature appropriates.' },
  { permitType: 'appropriation-release', title: 'Release of an enacted appropriation for commitment', lead: 'finance', note: 'Reference procedure budget.appropriation: the enacted appropriation cited from the laws register, its authority validated, released by two officials.' },
  { permitType: 'budget-revision', title: 'Budget revision: virement, reallocation, supplementary funding, further release, reduction', lead: 'finance', note: 'Reference procedure budget.revision. Which revisions are permitted, and whether supplementary funding needs an act of the legislature, are the nation\'s law (country.budget.appropriation_rules).' },
  { permitType: 'expenditure-commitment', title: 'Commitment of funds against an appropriation', lead: 'finance', note: 'Reference procedure finance.commitment. Where the law gives commitment powers to each spending institution\'s accounting officer, the nation maps them so.' },
  { permitType: 'payee-account-change', title: 'Approval of a payee\'s bank account', lead: 'finance', note: 'Reference procedure treasury.payee-account: requested, verified by another person, approved by two officials; never overwritten at once.' },
  { permitType: 'payment-authorisation', title: 'Approval of a government payment', lead: 'finance', note: 'Reference procedure treasury.payment: instructed, verified, approved by two officials (the tier from the approved treasury.payment.approval-tiers rule), executed with the bank\'s reference and reconciled, each by a different person.' },
  { permitType: 'cabinet-decision-record', title: 'Authentication and correction of a Cabinet decision record', lead: 'cabinetOffice', note: 'Reference procedure cabinet.decision: the body that decides is the Cabinet under the nation\'s constitution; this power is the authentication of its record and the assignment of actions. Quorum and voting from the nation\'s adopted Cabinet rules.' },
  { permitType: 'executive-correspondence-response', title: 'Response to, or referral of, a petition or correspondence to the executive office', lead: 'cabinetOffice', note: 'Reference procedure exec.correspondence. The constitutional role of the executive office and its petition powers are the nation\'s.' },
  { permitType: 'procurement-plan', title: 'Approval of a procurement plan item and its method', lead: 'procuring-entity', note: 'Templates proc.plan, adopted by each procuring institution as its own. The method allowed for a value comes from the approved procurement.method-thresholds rule.' },
  { permitType: 'procurement-award', title: 'Publication, award and cancellation of a tender', lead: 'procuring-entity', note: 'Templates proc.tender. Some laws give awards above a threshold to a tender board or a central procurement authority: the nation maps them so.' },
  { permitType: 'procurement-contract', title: 'Variation of a procurement contract and acceptance of deliverables', lead: 'procuring-entity', note: 'Templates proc.contract-variation and proc.contract-delivery; payment certification is never payment execution (the treasury pays).' },
  { permitType: 'procurement-review-decision', title: 'Decision on a procurement complaint, and interim measures', lead: 'procurementReview', note: 'Reference procedure procurement-review.complaint, decided by the review body independently of the procuring institution; appeals go to the court or tribunal the law names.' },
  // Human services (plan step I6): each family's decisions under its own permit type, the lead the slot the nation names
  // (shipped empty). Proposed defaults, drafts: none governs anything until the nation approves its own version citing its law.
  { permitType: 'identity-enrolment', title: 'National identity: enrolment, refusal and the determination of a possible duplicate at enrolment', lead: 'identity', note: 'Reference procedure identity.enrolment (IDN-REG-001 … 005). A civil event never creates or merges an identity; a duplicate is determined by an official with reasons, never merged automatically; no biometric field without a law and a legal review (CFG-IDN-004).' },
  { permitType: 'identity-credential', title: 'National identity credentials: issue, renewal, replacement, suspension, revocation, reinstatement, cancellation and status correction', lead: 'identity', note: 'Reference procedures identity.credential and identity.credential-status (IDN-CARD-001 … 007). A lost or stolen report is not proof of fraud; revocation follows notice and representations.' },
  { permitType: 'identity-resolution', title: 'National identity: determinations on suspected duplicates, misuse, compromise, recovery and verification disputes', lead: 'identity', note: 'Reference procedure identity.resolution (IDN-SEC-001 … 003, IDN-VER-003). Containment and determination by officials with reasons; never a match score.' },
  { permitType: 'travel-document', title: 'Passports and travel documents: issuance, refusal, cancellation, revocation and reinstatement', lead: 'travelDocuments', note: 'Reference procedures passport.application and passport.status (PAS-APP-001 … 015, 017). Fees only from the approved schedule (passports.fees); identity through identity.verify; ICAO Doc 9303 data elements; no biometric template.' },
  { permitType: 'travel-document-review', title: 'Passports and travel documents: review of a refused application', lead: 'travelDocuments', note: 'Reference procedure passport.review (PAS-APP-016), decided by officials who took no part in the refusal.' },
  { permitType: 'citizenship-determination', title: 'Citizenship and nationality: determinations of the competent authority', lead: 'citizenship', note: 'Reference procedure citizenship.application (NAT-APP-001 … 007, 010, 012). Only where the nation\'s law names a competent authority (CFG-NAT-001); an identity number, birthplace, passport or a parent\'s record is not conclusive proof unless the law says so.' },
  { permitType: 'labour-employer-registration', title: 'Labour: employer registration and refusal', lead: 'labour', note: 'Reference procedure labour.employer-registration (LAB-EMP-003). The employer is an organisation of the organisations register.' },
  { permitType: 'labour-employment-registration', title: 'Labour: employment registration and refusal', lead: 'labour', note: 'Reference procedure labour.employment-registration (LAB-EMP-001, 002, 007). A worker who is not a national is checked through immigration.status; an unanswered check holds the case or is referred, never refused by itself.' },
  { permitType: 'labour-inspection-order', title: 'Labour: corrective orders following a workplace inspection', lead: 'labour', note: 'Reference procedure labour.inspection (LAB-EMP-008, 020). Orders follow recorded findings with evidence; a finding is corrected only by a new version.' },
  { permitType: 'labour-complaint-decision', title: 'Labour: outcome of a complaint or wage claim, and declining one outside the mandate', lead: 'labour', note: 'Reference procedure labour.complaint (LAB-EMP-009, 011). An allegation is not a finding; an outcome that upholds names the findings it rests on.' },
  { permitType: 'social-benefit', title: 'Social protection: award, refusal, variation, continuation, ending, suspension and termination of a benefit', lead: 'socialProtection', note: 'Reference procedures social.benefit, social.reassessment and social.suspension (SOC-BEN-002 … 017). Eligibility and amounts only from the approved rule (social.<programme>), its version sealed with the decision; an identity check that cannot be made holds the claim; a score never cuts support.' },
  { permitType: 'social-payment', title: 'Social protection: approval of a payment instruction', lead: 'socialProtection', note: 'Reference procedure social.payment (SOC-BEN-018): prepared by one official from the current assessment, approved by a different one.' },
  { permitType: 'social-overpayment', title: 'Social protection: recovery or waiver of an overpayment', lead: 'socialProtection', note: 'Reference procedure social.overpayment (SOC-BEN-019): calculated by the period\'s rule on corrected inputs, after the recipient\'s response and a hardship review.' },
  { permitType: 'social-appeal', title: 'Social protection: appeal or reconsideration', lead: 'socialProtection', note: 'Reference procedure social.appeal (SOC-BEN-020): decided by two officials who took no part in the decision appealed.' },
  // I12: security governance and resilience (lib/security/procedures.ts). Leads are the slots the nation names (all ship empty);
  // proposed, unapproved: a production installation refuses these decisions until the nation approves its own mapping.
  { permitType: 'cyber-incident-closure', title: 'National cyber incident: closure, or a report found not to be an incident', lead: 'cyberAuthority', note: 'Reference procedure cyber.incident (SEC-CYB-001, 002, 008, 009, 010, 014). Severity on the nation\'s scale with reasons; no attribution of an attack is recorded.' },
  { permitType: 'vulnerability-disclosure', title: 'Vulnerability coordination: acceptance and public disclosure', lead: 'cyberAuthority', note: 'Reference procedure cyber.vulnerability (SEC-CYB-003, 004, 017). Restricted recipients; the public summary only on the disclosure date the officials set.' },
  { permitType: 'supplier-security-decision', title: 'Supplier security assessment decision', lead: 'cyberAuthority', note: 'Reference procedure cyber.supplier (SEC-CYB-011). The supplier is an organisation of the organisations register.' },
  { permitType: 'security-exception', title: 'Security exception: approval, renewal, refusal and revocation', lead: 'cyberAuthority', note: 'Reference procedure cyber.exception (SEC-CYB-012, 013). Always until a date the deciding officials choose; expired reads as expired.' },
  { permitType: 'cyber-exercise-approval', title: 'National cyber exercise: approval of the plan, scope and safeguards', lead: 'cyberAuthority', note: 'Reference procedure cyber.exercise (SEC-CYB-015, 016).' },
  { permitType: 'critical-infrastructure-designation', title: 'Critical infrastructure: designation and its revocation, citing the law and the approved criteria', lead: 'criticalInfrastructure', note: 'Reference procedure ci.designation (SEC-INF-001). A label in the national twin is never a designation (catalogue Part 11 §2.4).' },
  { permitType: 'infrastructure-risk-acceptance', title: 'Critical infrastructure: acceptance of a residual risk, scoped and until a review date', lead: 'criticalInfrastructure', note: 'Reference procedure ci.risk (SEC-INF-003, 014, 015). Two named officials; never automatic and never by a model.' },
  { permitType: 'resilience-plan-approval', title: 'Infrastructure resilience plan: approval', lead: 'criticalInfrastructure', note: 'Reference procedure ci.resilience-plan (SEC-INF-004, 005, 006).' },
  { permitType: 'security-clearance', title: 'Security clearance: grant, refusal, renewal, variation, suspension and withdrawal (metadata only)', lead: 'securityAccreditation', note: 'Reference procedure security.clearance (SEC-INT-007, 008). Vetting stays with the competent authority; a clearance never grants access to a record by itself.' },
];

/** Draft the proposed defaults the installation does not have yet (none governs anything until a nation approves its own version). */
export function installProposedDefaults(by: string, now = new Date()): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const d of PROPOSED_DEFAULTS) {
    if (db().mappings.some(m => m.permitType === d.permitType)) { present.push(d.permitType); continue; }
    const r = draftMapping({ permitType: d.permitType, title: d.title, lead: d.lead || TO_BE_DESIGNATED, consulted: d.consulted, effectiveFrom: now.toISOString().slice(0, 10), handoverPlan: '' }, by, undefined, now, true);
    if (!('error' in r)) { db().mappings.find(m => m.id === r.id)!.note = d.note; drafted.push(d.permitType); }
  }
  return { drafted, present };
}

