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
}

interface Db { mappings: AuthorityMapping[] }
const g = globalThis as unknown as { __civicosPermitAuthorities?: Db };
const db = (): Db => { const d = touch('__civicosPermitAuthorities', g.__civicosPermitAuthorities ??= { mappings: [] }); d.mappings ??= []; return d; };
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
  const live = db().mappings.filter(m => m.permitType === permitType && m.state === 'approved' && m.effectiveFrom <= on && (!m.effectiveTo || on < m.effectiveTo))
    .sort((a, b) => b.version - a.version);
  return live[0] ? clone(live[0]) : undefined;
}

/** A second official approves a draft; from its effective date it governs decisions. */
export function approveMapping(permitType: string, version: number, by: string, byId?: string, now = new Date()): AuthorityMapping | { error: string } {
  const m = db().mappings.find(x => x.permitType === permitType && x.version === version);
  if (!m) return { error: 'No such mapping version' };
  if (m.state !== 'draft') return { error: `This version is ${m.state}` };
  if ((byId && m.draftedById && byId === m.draftedById) || by === m.draftedBy) return { error: 'A different official approves the mapping (four-eyes)' };
  if (m.lead === TO_BE_DESIGNATED) return { error: 'Name the lead authority the law designates before approving' };
  if (!m.legalBasis.length) return { error: 'A mapping governs decisions only with its legal basis cited from the laws register' };
  const previous = mappingInForce(permitType, m.effectiveFrom) ?? mappingInForce(permitType, now.toISOString().slice(0, 10));
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

