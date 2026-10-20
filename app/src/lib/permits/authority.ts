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
import { dualControlRefusal } from '@/lib/data/dual-control';
import { uuid7 } from '@/lib/data/uuid7';
import { cite, type Citation } from '@/lib/law/register';
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
export interface SuspensionPolicy { confirmWithinHours: number; reviewWithinDays: number; adopted: boolean; by?: string; at?: string; basis?: string }
export const DEFAULT_SUSPENSION_POLICY: SuspensionPolicy = { confirmWithinHours: 72, reviewWithinDays: 30, adopted: false };

interface Db { mappings: AuthorityMapping[]; suspensionPolicy?: SuspensionPolicy }
const g = globalThis as unknown as { __civicosPermitAuthorities?: Db };
const db = (): Db => { const d = touch('__civicosPermitAuthorities', g.__civicosPermitAuthorities ??= { mappings: [] }); d.mappings ??= []; d.suspensionPolicy ??= { ...DEFAULT_SUSPENSION_POLICY }; return d; };
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

/** The country adopts its own periods (administrators, audited; the basis names the instrument). */
export function setSuspensionPolicy(input: { confirmWithinHours?: unknown; reviewWithinDays?: unknown; basis?: unknown }, by: string, now = new Date()): SuspensionPolicy | { error: string } {
  const h = Number(input.confirmWithinHours), d = Number(input.reviewWithinDays);
  if (!Number.isInteger(h) || h < 1 || h > 720) return { error: 'The confirmation period is a whole number of hours from 1 to 720' };
  if (!Number.isInteger(d) || d < 1 || d > 365) return { error: 'The review period is a whole number of days from 1 to 365' };
  const basis = str(input.basis, 300);
  if (!basis) return { error: 'Name the instrument or decision these periods come from' };
  db().suspensionPolicy = { confirmWithinHours: h, reviewWithinDays: d, adopted: true, by, at: now.toISOString(), basis };
  recordAudit(by, 'permit-authority.suspension-policy', 'SuspensionPolicy', 'ok', `confirm within ${h} h · review within ${d} d · ${basis.slice(0, 120)}`);
  return suspensionPolicy();
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
  { permitType: 'customs-clearance', title: 'Customs duty assessment and release of goods', lead: 'customs', note: 'Duty assessment, release and refusal of release; other regulators\' import conditions are referred, not decided here.' },
  { permitType: 'qualification-record', title: 'Record of qualifications', lead: 'education', note: 'An examinations council or qualifications authority may keep this record instead of the education ministry.' },
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

