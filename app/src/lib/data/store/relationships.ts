// The relationship register (docs/CONSTITUTIONAL_ARCHITECTURE.md §3.1, §3.3,
// §5.1; plan phase 3; audit E). Part of the institution register: each record
// says that one registered institution (the actor) holds one power over, or
// link to, another (the target): appoints, dismisses, funds, instructs,
// reviews, vetoes, audits, investigates, dissolves, impeaches, refers to,
// requests information from or receives reports from it, within a scope
// (record types, purposes, territory), under conditions, resting on the law
// (laws-register citations), between dates. These are the nation's facts: the
// platform offers the fields and enforces the ones it can, it never chooses
// them, and it ships none approved (no reference relationships at all).
//
// How they change: only through the country's change process
// (lib/law/policy-change.ts): proposed by one administrator citing the laws
// register, confirmed by a different official; every version kept (adopted,
// lapsed, withdrawn), an earlier adopted version superseded by a later one.
// When either end is independent and has officials who can sign, an official
// who can sign there confirms (one from each such end, the last of them
// adopting it), as for an institution's standing (institutions.ts). An
// instruction to an independent institution needs that institution's own
// confirmation in every case. Suspending or ending a relationship is a new
// version and goes the same way.
//
// What is enforced (lib/auth/roles.ts, the one place that decides; the
// approved relationships in force reach it through institutionBounds()):
//   - instruct: a directive that instructs (not a request, communication or
//     referral) reaches an independent institution, or goes from one
//     institution to another, only under an approved `instruct` relationship
//     from the issuer to the target that covers its kind;
//   - audit, request_information: officials of the actor may read the
//     target's records of the listed types for a listed purpose, read only,
//     each read in the access log with the relationship and version; never
//     a change or a decision, never a court's cases, never a secret case.
// Appointment, dismissal and the rest are recorded here; offices and their
// powers are enforced in later phases.

import { randomUUID } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyChanges, type PolicyVersion } from '@/lib/law/policy-change';
import { cite, type Citation } from '@/lib/law/register';
import { dualControlRefusal, dualControlPendingHours } from '@/lib/data/dual-control';
import { EXECUTIVE_OFFICE, INSTRUCTION_KINDS, type RelationshipGrant } from '@/lib/auth/roles';
import { recordAudit } from './audit';
import { frozenRefusal } from '@/lib/constitution/profile-state';
import { getMinistry } from './ministries';
import { isIndependentInstitution } from './institutions';

export type RelationshipType =
  | 'appoint' | 'dismiss' | 'fund' | 'instruct' | 'review' | 'veto' | 'audit' | 'investigate'
  | 'dissolve' | 'impeach' | 'refer' | 'request_information' | 'receive_reports'
  // I9 (federation): the actor receives the target's exchange services and events listed, for the purposes listed.
  | 'exchange';

export const RELATIONSHIP_TYPES: { key: RelationshipType; label: string; means: string; enforced?: string }[] = [
  { key: 'appoint', label: 'Appoints', means: 'Appoints the head or members of the other institution.' },
  { key: 'dismiss', label: 'Removes', means: 'May remove the head or members of the other institution, on the grounds the law sets.' },
  { key: 'fund', label: 'Funds', means: 'Sets or approves the other institution\'s budget.' },
  { key: 'instruct', label: 'Instructs', means: 'May give the other institution binding instructions on the matters listed.', enforced: 'Directives that instruct reach the other institution only under this relationship.' },
  { key: 'review', label: 'Reviews', means: 'Reviews the other institution\'s decisions (administrative or judicial review).' },
  { key: 'veto', label: 'Can veto', means: 'May block the other institution\'s acts or decisions.' },
  { key: 'audit', label: 'Audits', means: 'Audits the other institution: reads the listed records for the listed purposes, never changes them.', enforced: 'Its officials read the listed records with a stated purpose, read only, every read logged.' },
  { key: 'investigate', label: 'Investigates', means: 'May investigate the other institution within its mandate.' },
  { key: 'dissolve', label: 'Can dissolve', means: 'May dissolve the other institution, under the conditions the law sets.' },
  { key: 'impeach', label: 'Can impeach', means: 'May begin or decide the removal of the other institution\'s office-holders by impeachment.' },
  { key: 'refer', label: 'Refers matters', means: 'Refers matters to the other institution (referrals are cases between institutions).' },
  { key: 'request_information', label: 'Requests information', means: 'May ask the other institution for the listed records for the listed purposes; never all its records, never a change.', enforced: 'Its officials read the listed records with a stated purpose, read only, every read logged.' },
  { key: 'receive_reports', label: 'Receives reports', means: 'Receives the other institution\'s reports.' },
  // I9 (federation and portability): exchange services and events between institutions answer only under this relationship.
  { key: 'exchange', label: 'Exchanges data with', means: 'Receives answers from the other institution\'s exchange services, and its events, listed by id (a service id, or event:<type>), for the purposes listed; never its records.', enforced: 'callService() answers between institutions, and the event receiver accepts an event, only while this relationship is in force; suspending, ending or its end date stops the next exchange at once.' },
];
export const isRelationshipType = (v: unknown): v is RelationshipType => RELATIONSHIP_TYPES.some(t => t.key === v);
export const relationshipTypeLabel = (k: RelationshipType) => RELATIONSHIP_TYPES.find(t => t.key === k)?.label ?? k;
/** The types that let the actor read the target's records (read only, purpose-bound). */
const READ_TYPES: RelationshipType[] = ['audit', 'request_information'];

export interface RelationshipScope {
  /** Read relationships: the record types covered (`cases`, `queue`, or a procedure's key). Instruct: the kinds of directive covered (none listed: every kind that instructs). */
  recordTypes: string[];
  /** Read relationships: the purposes a read may state. */
  purposes: string[];
  /** Regions or territories it applies to, as the law says (recorded, not enforced). */
  territories: string[];
}
/** What a version of a relationship says. A type alias so withDefaults() and policy-change take it as a plain record. */
export type RelationshipTerms = {
  from: string; to: string; type: RelationshipType;
  scope: RelationshipScope;
  /** Conditions the law sets, in words (recorded and shown, not checked by the platform). */
  conditions: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  /** What this version makes it: approved, suspended, or ended (withdrawn). */
  status: 'approved' | 'suspended' | 'withdrawn';
  note?: string;
};
export interface Relationship {
  id: string;
  createdAt: string; createdBy: string;
  changes: PolicyChanges<RelationshipTerms>;
  /** Confirmations by the independent ends collected for the waiting proposal (its `at`), before the last one adopts it. */
  endorsements?: { proposalAt: string; institution: string; by: string; byId?: string; at: string }[];
}
export type RelationshipStatus = 'draft' | 'approved' | 'suspended' | 'withdrawn';

type Store = { relationships: Relationship[] };
const seed = (): Store => ({ relationships: [] });
const g = globalThis as unknown as { __civicosRelationships?: Store };
// A production installation (and every other) starts with none: no relationship is shipped, approved or as a draft.
const db = (): Store => touch('__civicosRelationships', g.__civicosRelationships = withDefaults(g.__civicosRelationships ??= seed(), seed()));
export function resetRelationships(): void { g.__civicosRelationships = undefined; }

const AUDIT = 'institution.relationship';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = (now: Date) => now.toISOString().slice(0, 10);
const nameOf = (id: string) => (id === EXECUTIVE_OFFICE ? 'The executive office' : getMinistry(id)?.name ?? id);
/** A purpose as compared: lower case, words only. */
export const purposeKey = (p: string) => p.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ── Versions and status ─────────────────────────────────────────────────────

type Adopted = PolicyVersion<RelationshipTerms> & { outcome: string };
const adopted = (r: Relationship): Adopted[] => (r.changes.history ?? []).filter(h => h.outcome === 'adopted');
/** An adopted version's number (1, 2 …): its place among the adopted versions (by identity: two may share a timestamp). */
const versionOf = (r: Relationship, v: PolicyVersion<RelationshipTerms>) => adopted(r).indexOf(v as Adopted) + 1;

/** The adopted version in force on a date: the latest whose date has come. */
function inForceVersion(r: Relationship, now: Date): Adopted | undefined {
  const on = today(now);
  return adopted(r).filter(h => h.values.effectiveFrom <= on)
    .sort((a, b) => a.values.effectiveFrom.localeCompare(b.values.effectiveFrom) || (a.confirmed?.at ?? '').localeCompare(b.confirmed?.at ?? ''))
    .at(-1);
}

/** The latest terms anyone proposed (waiting, or the last in the history). */
const latestTerms = (r: Relationship) => (r.changes.pending ?? r.changes.history?.at(-1))!;

export interface RelationshipView {
  id: string;
  status: RelationshipStatus;
  /** Whether it grants what it says today: approved, its dates covering today, both ends active, its law in force. */
  inForce: boolean;
  /** The adopted version in force (1, 2 …), when there is one. */
  version?: number;
  terms: RelationshipTerms;
  basis: Citation[];
  fromName: string; toName: string;
  pending: (PolicyVersion<RelationshipTerms> & { expiresAt: string }) | null;
  /** Independent ends that confirm the waiting proposal, and those that already have. */
  confirmFrom: { id: string; name: string }[];
  endorsed: string[];
  /** Every version, newest first, adopted ones numbered; an adopted one no longer in force is superseded. */
  history: (PolicyVersion<RelationshipTerms> & { outcome: string; version?: number; superseded?: boolean })[];
  createdAt: string; createdBy: string;
}

/** Whether both ends are registered and active (the executive office counts as an end for an instruction). */
const endsActive = (t: RelationshipTerms) =>
  [t.from, t.to].every(id => (id === EXECUTIVE_OFFICE && t.type === 'instruct' && id === t.from) || getMinistry(id)?.status === 'active');
/** Whether every provision it cites is still in force on the date (a repealed basis grants nothing). */
const lawInForce = (basis: Citation[], on: string) => basis.every(c => !('error' in cite(c.instrument, c.eId, on)));

function grantsToday(v: Adopted | undefined, now: Date): boolean {
  if (!v || v.values.status !== 'approved') return false;
  const on = today(now);
  if (v.values.effectiveTo && v.values.effectiveTo < on) return false;
  return endsActive(v.values) && lawInForce(v.basis, on);
}

function statusOf(r: Relationship, now: Date): RelationshipStatus {
  const v = inForceVersion(r, now);
  if (v) return v.values.status;
  // Adopted but not yet in force (a later date): what it was adopted as; the view says it is not in force today.
  const scheduled = adopted(r).at(-1);
  if (scheduled) return scheduled.values.status;
  const h = r.changes.history ?? [];
  if (!r.changes.pending && h.length && h.every(x => x.outcome === 'withdrawn' || x.outcome === 'lapsed') && h.at(-1)!.outcome === 'withdrawn') return 'withdrawn';
  return 'draft';
}

function confirmersOf(t: RelationshipTerms, ownSigners: (id: string) => boolean, now: Date): string[] {
  return [...new Set([t.from, t.to])].filter(id => id !== EXECUTIVE_OFFICE && isIndependentInstitution(id, now) && ownSigners(id));
}

function view(r: Relationship, now: Date, ownSigners: (id: string) => boolean): RelationshipView {
  const current = inForceVersion(r, now);
  const latest = latestTerms(r);
  const terms = structuredClone(current?.values ?? latest.values);
  const pending = r.changes.pending ? structuredClone(r.changes.pending) : null;
  const confirmFrom = pending ? confirmersOf(pending.values, ownSigners, now) : [];
  return {
    id: r.id, status: statusOf(r, now), inForce: grantsToday(current, now),
    ...(current ? { version: versionOf(r, current) } : {}),
    terms, basis: structuredClone(current?.basis ?? latest.basis), fromName: nameOf(terms.from), toName: nameOf(terms.to),
    pending, confirmFrom: confirmFrom.map(id => ({ id, name: nameOf(id) })),
    endorsed: pending ? (r.endorsements ?? []).filter(e => e.proposalAt === pending.at).map(e => e.institution) : [],
    history: [...(r.changes.history ?? [])].map(h => {
      const version = h.outcome === 'adopted' ? versionOf(r, h) : undefined;
      return { ...structuredClone(h), ...(version ? { version } : {}), ...(h.outcome === 'adopted' && current && h !== current && version! < versionOf(r, current) ? { superseded: true } : {}) };
    }).reverse(),
    createdAt: r.createdAt, createdBy: r.createdBy,
  };
}

const noSigners = () => false;

/** Every relationship (lapsing waiting proposals whose time has passed first), optionally those touching one institution. */
export function listRelationships(opts: { institution?: string; ownSigners?: (id: string) => boolean } = {}, now = new Date()): RelationshipView[] {
  lapseRelationships(now);
  return db().relationships
    .filter(r => { const t = latestTerms(r).values; return !opts.institution || t.from === opts.institution || t.to === opts.institution; })
    .map(r => view(r, now, opts.ownSigners ?? noSigners));
}

export function getRelationship(id: string, ownSigners: (id: string) => boolean = noSigners, now = new Date()): RelationshipView | undefined {
  const r = db().relationships.find(x => x.id === id);
  return r ? view(r, now, ownSigners) : undefined;
}

/**
 * The approved relationships in force today, as lib/auth/roles.ts reads them
 * (institutionBounds(), carried with the signed-in official): approved, the
 * dates covering today, both ends registered and active, every provision
 * cited still in force.
 */
export function relationshipGrants(now = new Date()): RelationshipGrant[] {
  const out: RelationshipGrant[] = [];
  for (const r of db().relationships) {
    const v = inForceVersion(r, now);
    if (!grantsToday(v, now)) continue;
    const t = v!.values;
    out.push({ id: r.id, version: versionOf(r, v!), from: t.from, to: t.to, type: t.type, recordTypes: [...t.scope.recordTypes], purposes: t.scope.purposes.map(purposeKey) });
  }
  return out;
}

/**
 * I9: every relationship of a kind between two institutions that ever covered
 * a record type, service or event (adopted at least once), with its status and
 * whether it grants today. Lets the exchange binding say that an exchange
 * stopped because a relationship was suspended, ended or expired.
 */
export function relationshipsCovering(from: string, to: string, type: RelationshipType, recordType: string, now = new Date()): { id: string; status: RelationshipStatus; inForce: boolean; version?: number; effectiveTo?: string }[] {
  const out: { id: string; status: RelationshipStatus; inForce: boolean; version?: number; effectiveTo?: string }[] = [];
  for (const r of db().relationships) {
    const ever = adopted(r).filter(h => h.values.from === from && h.values.to === to && h.values.type === type && h.values.scope.recordTypes.includes(recordType));
    if (!ever.length) continue;
    const v = inForceVersion(r, now);
    out.push({ id: r.id, status: statusOf(r, now), inForce: grantsToday(v, now) && !!v?.values.scope.recordTypes.includes(recordType), ...(v ? { version: versionOf(r, v) } : {}), ...(v?.values.effectiveTo ? { effectiveTo: v.values.effectiveTo } : {}) });
  }
  return out;
}

// ── Reading and checking a proposal ─────────────────────────────────────────

export interface RelationshipInput {
  from?: unknown; to?: unknown; type?: unknown;
  scope?: { recordTypes?: unknown; purposes?: unknown; territories?: unknown } | null;
  conditions?: unknown; effectiveFrom?: unknown; effectiveTo?: unknown; note?: unknown;
}

const strings = (v: unknown, max: number, len: number, what: string): string[] | { error: string } => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max || v.some(x => typeof x !== 'string')) return { error: `${what} are a list (up to ${max}) of words` };
  return [...new Set((v as string[]).map(x => x.trim().slice(0, len)).filter(Boolean))];
};

function parse(input: RelationshipInput): Partial<RelationshipTerms> | { error: string } {
  const out: Partial<RelationshipTerms> = {};
  if (input.from !== undefined) out.from = String(input.from ?? '').trim();
  if (input.to !== undefined) out.to = String(input.to ?? '').trim();
  if (input.type !== undefined) {
    if (!isRelationshipType(input.type)) return { error: `The kind of relationship is one of ${RELATIONSHIP_TYPES.map(t => t.key).join(', ')}` };
    out.type = input.type;
  }
  if (input.scope !== undefined && input.scope !== null) {
    if (typeof input.scope !== 'object' || Array.isArray(input.scope)) return { error: 'The scope is { recordTypes, purposes, territories }' };
    const recordTypes = strings(input.scope.recordTypes, 30, 80, 'Record types');
    if ('error' in recordTypes) return recordTypes;
    const purposes = strings(input.scope.purposes, 20, 120, 'Purposes');
    if ('error' in purposes) return purposes;
    const territories = strings(input.scope.territories, 50, 120, 'Territories');
    if ('error' in territories) return territories;
    out.scope = { recordTypes, purposes, territories };
  }
  if (input.conditions !== undefined) {
    const c = strings(input.conditions, 20, 300, 'Conditions');
    if ('error' in c) return c;
    out.conditions = c;
  }
  for (const k of ['effectiveFrom', 'effectiveTo'] as const) {
    const v = input[k];
    if (v === undefined) continue;
    if (k === 'effectiveTo' && (v === null || v === '')) { out.effectiveTo = undefined; continue; }
    if (typeof v !== 'string' || !ISO_DATE.test(v)) return { error: `${k === 'effectiveFrom' ? 'The date it applies from' : 'The date it ends'} is YYYY-MM-DD` };
    out[k] = v;
  }
  if (typeof input.note === 'string') out.note = input.note.trim().slice(0, 500) || undefined;
  return out;
}

/** Whether a version is acceptable (both ends, the scope its kind needs, its dates). */
function check(v: RelationshipTerms): string | null {
  if (!v.from || !v.to) return 'Name both institutions: the one that holds the power (from) and the one it applies to (to)';
  if (v.from === v.to) return 'A relationship joins two different institutions';
  if (v.from === EXECUTIVE_OFFICE) {
    if (v.type !== 'instruct') return 'The executive office (the whole government) is an end only of an instruction; for any other power name the institution that holds it';
  } else if (!getMinistry(v.from)) return 'The institution that holds the power (from) is not in the register';
  if (!getMinistry(v.to)) return 'The institution it applies to (to) is not in the register';
  if (v.status === 'approved' && [v.from, v.to].some(id => id !== EXECUTIVE_OFFICE && getMinistry(id)?.status !== 'active')) return 'Both institutions must be active';
  if (READ_TYPES.includes(v.type) && (!v.scope.recordTypes.length || !v.scope.purposes.length)) {
    return 'Name the record types it covers and the purposes a read may state: asking for information never means reading every record';
  }
  // I9: an exchange relationship names the services or events it covers and the purposes a call may state.
  if (v.type === 'exchange') {
    if (!v.scope.recordTypes.length || !v.scope.purposes.length) return 'Name the exchange services (their ids) or events (event:<type>) it covers and the purposes a call may state: exchanging data never means every service';
    const bad = v.scope.recordTypes.filter(k => !/^(event:)?[a-z][a-z0-9.-]{1,60}$/.test(k));
    if (bad.length) return `An exchange relationship lists service ids (e.g. taxpayer.status) or events (event:permit.issued); not: ${bad.join(', ')}`;
  }
  if (v.type === 'instruct') {
    const bad = v.scope.recordTypes.filter(k => !INSTRUCTION_KINDS.includes(k));
    if (bad.length) return `An instruction covers kinds of directive (${INSTRUCTION_KINDS.join(', ')}); not: ${bad.join(', ')}`;
  }
  if (v.effectiveTo && v.effectiveTo < v.effectiveFrom) return 'It cannot end before it applies';
  return null;
}

const describe = (v: RelationshipTerms) => {
  const scope = [v.scope.recordTypes.length ? `records: ${v.scope.recordTypes.join(', ')}` : '', v.scope.purposes.length ? `purposes: ${v.scope.purposes.join(', ')}` : '', v.scope.territories.length ? `territory: ${v.scope.territories.join(', ')}` : ''].filter(Boolean).join('; ');
  return `${nameOf(v.from)} ${relationshipTypeLabel(v.type).toLowerCase()} ${nameOf(v.to)} · ${v.status} from ${v.effectiveFrom}${v.effectiveTo ? ` to ${v.effectiveTo}` : ''}${scope ? ` · ${scope}` : ''}`;
};

const EMPTY: Omit<RelationshipTerms, 'from' | 'to' | 'type'> = { scope: { recordTypes: [], purposes: [], territories: [] }, conditions: [], effectiveFrom: '', status: 'approved' };

/**
 * One administrator proposes a relationship, or a new version of one (`id`),
 * citing the laws register; values left out keep their current setting; the
 * two ends and the kind of a relationship never change (record a new one).
 * `status` suspended or withdrawn proposes suspending or ending it.
 */
export function proposeRelationship(input: RelationshipInput & { id?: unknown; legalBasis?: unknown; status?: 'approved' | 'suspended' | 'withdrawn' }, actor: { by: string; byId?: string }, now = new Date()): { relationship: RelationshipView } | { error: string } {
  const p = parse(input);
  if ('error' in p) return p;
  let r: Relationship | undefined;
  if (typeof input.id === 'string' && input.id) {
    r = db().relationships.find(x => x.id === input.id);
    if (!r) return { error: 'No such relationship' };
    const t = latestTerms(r).values;
    if ((p.from && p.from !== t.from) || (p.to && p.to !== t.to) || (p.type && p.type !== t.type)) return { error: 'The institutions and the kind of a relationship stay as recorded: propose a new relationship instead' };
  }
  const base: RelationshipTerms = r ? structuredClone(inForceVersion(r, now)?.values ?? latestTerms(r).values) : { ...structuredClone(EMPTY), from: p.from ?? '', to: p.to ?? '', type: p.type ?? 'request_information' };
  if (input.status && !['approved', 'suspended', 'withdrawn'].includes(input.status)) return { error: 'status is approved, suspended or withdrawn' };
  if (input.status && input.status !== 'approved' && (!r || !adopted(r).length)) return { error: 'Only an approved relationship is suspended or ended; a draft is withdrawn' };
  // An end date cleared on purpose (effectiveTo: null) is dropped; one left out is kept.
  if ('effectiveTo' in p && p.effectiveTo === undefined) delete base.effectiveTo;
  const change: Partial<RelationshipTerms> = { effectiveFrom: today(now), ...p, status: input.status ?? 'approved' };
  const created = !r;
  const rel: Relationship = r ?? { id: `rel-${randomUUID().slice(0, 8)}`, createdAt: now.toISOString(), createdBy: actor.by, changes: {} };
  const proposed = proposePolicy(rel.changes, base, change, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: AUDIT,
    context: 'Relationship between institutions', describe, check,
  });
  if ('error' in proposed) return proposed;
  if (created) db().relationships.push(rel);
  rel.endorsements = [];
  return { relationship: view(rel, now, noSigners) };
}

/**
 * A different official confirms the waiting proposal. When an end is
 * independent and has officials who can sign (`ownSigners`), an official
 * who can sign there confirms, one per such end; the last adopts it. An
 * instruction to an independent institution is confirmed by that
 * institution in every case. Returns the relationship, and which ends are
 * still to confirm when it waits for another.
 */
export function confirmRelationship(id: string, actor: { by: string; byId?: string; role?: string; institution?: string }, ownSigners: (id: string) => boolean, now = new Date()): { relationship: RelationshipView; waitingFor?: string[] } | { error: string } {
  const r = db().relationships.find(x => x.id === id);
  if (!r) return { error: 'No such relationship' };
  lapseOne(r, now);
  const p = r.changes.pending;
  if (!p) return { error: 'No change is waiting to be confirmed (a proposal lapses after the waiting period)' };
  if (actor.role && actor.role !== 'administrator' && actor.role !== 'signatory') return { error: 'An administrator or an official who can sign confirms a relationship' };
  // A dispute over the constitutional profile freezes relationships (plan phase 5): no endorsement either.
  const frozen = frozenRefusal(AUDIT);
  if (frozen) return { error: frozen };
  const t = p.values;
  if (t.type === 'instruct' && isIndependentInstitution(t.to, now) && !ownSigners(t.to)) {
    return { error: `${nameOf(t.to)} is independent: an instruction to it is confirmed by an official who can sign there, and it has none yet` };
  }
  const same = dualControlRefusal({ by: p.by, ...(p.byId ? { byId: p.byId } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (same) return { error: same };
  const required = confirmersOf(t, ownSigners, now);
  const endorsed = (r.endorsements ?? []).filter(e => e.proposalAt === p.at).map(e => e.institution);
  const remaining = required.filter(x => !endorsed.includes(x));
  if (remaining.length) {
    if (!actor.institution || !remaining.includes(actor.institution)) {
      const names = remaining.map(nameOf);
      return { error: `${names.join(' and ')} ${names.length === 1 ? 'is' : 'are'} independent: an official who can sign there confirms this relationship, not the government` };
    }
    if (remaining.length > 1) {
      (r.endorsements ??= []).push({ proposalAt: p.at, institution: actor.institution, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString() });
      recordAudit(actor.by, `${AUDIT}.endorse`, `Relationship:${r.id}`, 'ok', `${describe(t)} · confirmed for ${nameOf(actor.institution)}; waiting for ${remaining.filter(x => x !== actor.institution).map(nameOf).join(', ')}`);
      return { relationship: view(r, now, ownSigners), waitingFor: remaining.filter(x => x !== actor.institution) };
    }
  }
  const done = confirmPolicy(r.changes, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: AUDIT, describe, adopt: () => undefined });
  if ('error' in done) return done;
  r.endorsements = [];
  return { relationship: view(r, now, ownSigners) };
}

/** The proposer (or an administrator) withdraws a waiting proposal; it is kept. */
export function withdrawRelationshipProposal(id: string, by: string, reason?: string): { relationship: RelationshipView } | { error: string } {
  const r = db().relationships.find(x => x.id === id);
  if (!r) return { error: 'No such relationship' };
  const w = withdrawPolicy(r.changes, { by, ...(reason ? { reason } : {}), audit: AUDIT });
  if ('error' in w) return w;
  r.endorsements = [];
  return { relationship: view(r, new Date(), noSigners) };
}

function lapseOne(r: Relationship, now: Date): void {
  if (!r.changes.pending) return;
  lapsePolicy(r.changes, now, AUDIT);
  if (!r.changes.pending) r.endorsements = [];
}

/** Lapse waiting proposals whose time has passed (read-time). */
export function lapseRelationships(now = new Date()): void {
  for (const r of db().relationships) lapseOne(r, now);
}

/** Every relationship with a proposal waiting for confirmation (the onboarding hub). */
export function waitingRelationships(now = new Date()): { id: string; what: string; by: string; at: string }[] {
  lapseRelationships(now);
  return db().relationships.filter(r => r.changes.pending).map(r => ({ id: r.id, what: describe(r.changes.pending!.values), by: r.changes.pending!.by, at: r.changes.pending!.at }));
}

/** Who proposed the waiting change (the route lets the proposer or an administrator withdraw it). */
export const pendingProposer = (id: string): { by: string; byId?: string } | undefined => {
  const p = db().relationships.find(x => x.id === id)?.changes.pending;
  return p ? { by: p.by, ...(p.byId ? { byId: p.byId } : {}) } : undefined;
};
