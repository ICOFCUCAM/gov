// The indicator register (plan step I3, plan §3.2: "a definition before a
// number"; forms catalogue GOV-STA-006 "Official indicator definition —
// versioned indicator methodology", part 13 §8.2). Each definition: a stable
// id, an owner (the institution the deployment profile names for a slot, or
// each institution for its own records) and every version of its terms
// (numerator, denominator, period, coverage, method and its version, the
// approved-aggregate disclosure rule, the domain's qualifications and
// limitations; never a target value). A version is drafted by one official and
// approved, for one institution, by a different official who can sign there
// (lib/auth/roles.ts indicatorDraftRefusal() / indicatorApproveRefusal(),
// lib/data/dual-control.ts dualControlRefusal()); approvals can be withdrawn
// with a reason and are kept; nothing is deleted. Reference definitions ship
// in every mode as the platform's drafts and are never approved by shipping:
// an institution's official drafts its own version from one first.
//
// Values are computed from the records (lib/indicators/compute.ts), never
// stored here. Held in platform state (lib/data/persist.ts).

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit } from '@/lib/data/store/audit';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { indicatorDraftRefusal, indicatorApproveRefusal, type Scope } from '@/lib/auth/roles';
import { isUcum } from '@/lib/twin/metrics';
import { getMethod } from './methods';
import { REFERENCE_DEFINITIONS, referenceTerms } from './reference';
import type { IndicatorApproval, IndicatorDefinition, IndicatorOwner, IndicatorTerms, IndicatorVersion } from './types';
import type { AuthorityKey } from '@/lib/nation/deployment';

export const REFERENCE_AUTHOR = 'CivicOS reference (unapproved draft)';

type Db = { definitions: IndicatorDefinition[] };
const seed = (): Db => ({ definitions: [] });
const g = globalThis as unknown as { __civicosIndicators?: Db };
const clone = <T,>(x: T): T => structuredClone(x);

function db(): Db {
  const d = touch('__civicosIndicators', g.__civicosIndicators = withDefaults(g.__civicosIndicators ??= seed(), seed()));
  // Reference drafts the register does not hold yet (a new platform version may add some); never overwrites a definition.
  if (d.definitions.length < REFERENCE_DEFINITIONS.length || REFERENCE_DEFINITIONS.some(r => !d.definitions.some(x => x.id === r.id))) {
    for (const r of REFERENCE_DEFINITIONS) {
      if (d.definitions.some(x => x.id === r.id)) continue;
      d.definitions.push({ id: r.id, owner: r.owner, approvals: [], versions: [{ n: 1, terms: referenceTerms(r), by: REFERENCE_AUTHOR, at: '2026-10-21T00:00:00.000Z', reason: 'Reference definition shipped with the platform', reference: true }] });
    }
  }
  return d;
}
export function resetIndicators(): void { g.__civicosIndicators = undefined; }

/** Who acts: the verified official (scope) or, where sign-in is not enforced, a declared name. */
export interface IndicatorActor { name: string; id?: string; scope: (Scope & { institution?: string }) | null }

export const ownerLabel = (o: IndicatorOwner): string => ('slot' in o ? o.slot : 'each institution, for its own records');
/** The institution that owns a slot-owned definition (undefined for one each institution keeps; '' when the slot is empty). */
export const ownerInstitutionOf = (o: IndicatorOwner): string | undefined => ('slot' in o ? authorityFor(o.slot) ?? '' : undefined);

export function listDefinitions(): IndicatorDefinition[] { return db().definitions.map(clone); }
export function getDefinition(id: string): IndicatorDefinition | undefined { const d = db().definitions.find(x => x.id === id); return d ? clone(d) : undefined; }

/** The approvals in force for an institution (not withdrawn). */
const live = (d: IndicatorDefinition, institution: string) => d.approvals.filter(a => a.institution === institution && !a.withdrawn);

/**
 * The version an institution's figures are computed under: the highest version
 * approved there, else the latest draft; with the newer draft when one waits.
 */
export function versionFor(d: IndicatorDefinition, institution: string | undefined): { version: IndicatorVersion; status: 'approved' | 'draft'; newerDraft?: number } {
  const latest = d.versions.at(-1)!;
  const approved = institution ? live(d, institution).map(a => a.version).sort((a, b) => b - a)[0] : undefined;
  if (approved === undefined) return { version: latest, status: 'draft' };
  const v = d.versions.find(x => x.n === approved)!;
  return { version: v, status: 'approved', ...(latest.n > approved ? { newerDraft: latest.n } : {}) };
}

/** Institutions where a definition is approved now (any version). */
export const approvedAt = (d: IndicatorDefinition): string[] => [...new Set(d.approvals.filter(a => !a.withdrawn).map(a => a.institution))];

// ── checks ─────────────────────────────────────────────────────────────────

const ID = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max = 12) => (Array.isArray(v) ? v.map(x => str(x, 400)).filter(Boolean).slice(0, max) : []);
/** Fields a version may carry. A target, threshold or expected value is not one: the definition says what is counted, never what it should be. */
const TERM_KEYS: (keyof IndicatorTerms)[] = ['title', 'definition', 'intendedUse', 'domain', 'numerator', 'denominator', 'method', 'period', 'coverage', 'disclosure', 'qualifications', 'limitations', 'source', 'unit'];

/** Check a version's terms: every field the contract needs, a method that exists in that version, a disclosure rule, no target. */
export function checkTerms(input: Record<string, unknown>): IndicatorTerms | { error: string } {
  const extra = Object.keys(input).filter(k => !(TERM_KEYS as string[]).includes(k));
  if (extra.length) return { error: `A definition carries no ${extra.join(', ')}: targets and expected values are not part of it (plan §3.2)` };
  const title = str(input.title, 120), definition = str(input.definition, 600), intendedUse = str(input.intendedUse, 400), domain = str(input.domain, 80), numerator = str(input.numerator, 400);
  if (!title || !definition) return { error: 'Give the indicator a title and a definition (what it means)' };
  if (!numerator) return { error: 'Say what is counted (the numerator)' };
  if (!domain) return { error: 'Name the domain the indicator belongs to' };
  const m = (input.method ?? {}) as { id?: unknown; version?: unknown; params?: unknown };
  const method = getMethod(str(m.id, 80), Number(m.version));
  if (!method) return { error: `No computation ${str(m.id, 80) || '(none)'} version ${String(m.version ?? '?')}: choose one of the register's methods` };
  const params: Record<string, string> = {};
  if (m.params && typeof m.params === 'object') for (const [k, v] of Object.entries(m.params as Record<string, unknown>)) {
    if (!(method.params ?? []).includes(k)) return { error: `${method.id} takes no parameter ${k}` };
    const val = str(v, 80);
    if (val) params[k] = val;
  }
  const denominator = str(input.denominator, 400);
  if (method.unit === '%' && !denominator) return { error: 'A share needs its denominator in words' };
  const unit = str(input.unit, 24) || method.unit;
  if (!isUcum(unit)) return { error: `"${unit}" is not a UCUM unit` };
  if (unit !== method.unit) return { error: `${method.id} computes values in ${method.unit}` };
  const dsc = (input.disclosure ?? {}) as { kind?: unknown; reason?: unknown };
  const disclosure = dsc.kind === 'small-cells' ? { kind: 'small-cells' as const }
    : dsc.kind === 'not-personal' && str(dsc.reason, 400).length >= 10 ? { kind: 'not-personal' as const, reason: str(dsc.reason, 400) } : null;
  if (!disclosure) return { error: 'Choose the disclosure rule: small-cells (counts about people) or not-personal with the reason no person can be identified' };
  const src = (input.source ?? {}) as { registerId?: unknown; recordType?: unknown };
  const source = { registerId: str(src.registerId, 80), recordType: str(src.recordType, 80) };
  if (!source.registerId || !source.recordType) return { error: 'Name the register and record type it is computed from' };
  return {
    title, definition, intendedUse: intendedUse || '—', domain, unit, numerator, ...(denominator ? { denominator } : {}),
    method: { id: method.id, version: method.version, ...(Object.keys(params).length ? { params } : {}) },
    period: 'month', coverage: method.coverage, disclosure,
    qualifications: list(input.qualifications), limitations: list(input.limitations), source,
  };
}

const parseOwner = (v: unknown): IndicatorOwner | null => {
  const o = (v ?? {}) as { slot?: unknown; each?: unknown };
  if (o.each === 'institution') return { each: 'institution' };
  if (typeof o.slot === 'string' && /^[a-zA-Z]{2,40}$/.test(o.slot)) return { slot: o.slot as AuthorityKey };
  return null;
};

// ── changes ────────────────────────────────────────────────────────────────

/**
 * Draft a new version of a definition (or a new definition with its owner):
 * the given terms over the latest version's, checked, kept beside every
 * earlier version. Drafted by an official of the owning institution.
 */
export function draftVersion(input: { id?: unknown; owner?: unknown; terms?: unknown; reason?: unknown }, actor: IndicatorActor, now = new Date()): IndicatorDefinition | { error: string } {
  const id = str(input.id, 80);
  if (!ID.test(id)) return { error: 'An indicator id is lower-case words joined by dots, e.g. civil.births_registered' };
  const reason = str(input.reason, 400);
  if (!reason) return { error: 'Say why this version is drafted' };
  const d = db();
  const existing = d.definitions.find(x => x.id === id);
  const owner = existing?.owner ?? parseOwner(input.owner);
  if (!owner) return { error: 'Name the owner: { slot } for the institution named under Who is responsible, or { each: "institution" }' };
  if (actor.scope) {
    const why = indicatorDraftRefusal(actor.scope, ownerInstitutionOf(owner));
    if (why) return { error: why };
  }
  const base = existing?.versions.at(-1)?.terms;
  const given = (input.terms && typeof input.terms === 'object' && !Array.isArray(input.terms)) ? input.terms as Record<string, unknown> : {};
  const merged: Record<string, unknown> = { ...(base ?? {}), ...given };
  delete merged.period; delete merged.coverage;
  const terms = checkTerms(merged);
  if ('error' in terms) return terms;
  const v: IndicatorVersion = { n: (existing?.versions.at(-1)?.n ?? 0) + 1, terms, by: actor.name, ...(actor.id ? { byId: actor.id } : {}), at: now.toISOString(), reason };
  const def = existing ?? (d.definitions[d.definitions.push({ id, owner, versions: [], approvals: [] }) - 1]!);
  def.versions.push(v);
  recordAudit(actor.name, 'indicator.draft', `Indicator:${id}`, 'ok', `version ${v.n} · ${terms.method.id}@${terms.method.version} · ${terms.disclosure.kind} · ${reason.slice(0, 120)}`);
  return clone(def);
}

/** The institution an approval is for: the slot's institution, or the approving official's own for a definition each institution keeps. */
function approvalInstitution(def: IndicatorDefinition, actor: IndicatorActor, requested: unknown): string | { error: string } {
  const owner = ownerInstitutionOf(def.owner);
  if (owner === '') return { error: `No institution is named as responsible for ${'slot' in def.owner ? def.owner.slot : 'this indicator'} (Configuration → Who is responsible)` };
  if (owner) return owner;
  const inst = actor.scope?.institution ?? str(requested, 80);
  if (!inst || !getMinistry(inst)) return { error: 'Name the institution whose figures this definition is approved for' };
  return inst;
}

/**
 * Approve one version for one institution: an official who can sign there,
 * other than the version's drafter (compared by verified identity). A
 * reference draft is never approved as shipped.
 */
export function approveVersion(id: unknown, version: unknown, actor: IndicatorActor, opts: { institution?: unknown; now?: Date } = {}): IndicatorDefinition | { error: string } {
  const now = opts.now ?? new Date();
  const def = db().definitions.find(x => x.id === str(id, 80));
  if (!def) return { error: 'No such indicator' };
  const v = def.versions.find(x => x.n === Number(version));
  if (!v) return { error: 'No such version' };
  if (v.reference) return { error: 'A reference draft is the platform\'s, not an institution\'s: an official of the institution drafts its own version from it first (Draft a version), then a different official approves it' };
  if (!getMethod(v.terms.method.id, v.terms.method.version)) return { error: `The computation ${v.terms.method.id} version ${v.terms.method.version} is no longer offered: draft a version under the current method` };
  const inst = approvalInstitution(def, actor, opts.institution);
  if (typeof inst !== 'string') return inst;
  if (actor.scope) {
    const why = indicatorApproveRefusal(actor.scope, inst);
    if (why) return { error: why };
  }
  const dc = dualControlRefusal({ by: v.by, ...(v.byId ? { byId: v.byId } : {}) }, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) });
  if (dc) return { error: dc };
  if (live(def, inst).some(a => a.version === v.n)) return { error: `Version ${v.n} is already approved for this institution` };
  // A newer approval replaces an older one for the same institution; the older is kept, marked withdrawn by this approval.
  for (const a of live(def, inst)) a.withdrawn = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}), at: now.toISOString(), reason: `Replaced by version ${v.n}` };
  const approval: IndicatorApproval = { version: v.n, institution: inst, by: actor.name, ...(actor.id ? { byId: actor.id } : {}), at: now.toISOString(), independence: independenceOf(v.byId, actor.id) };
  def.approvals.push(approval);
  recordAudit(actor.name, 'indicator.approve', `Indicator:${def.id}`, 'ok', `version ${v.n} for ${getMinistry(inst)?.name ?? inst} · drafted by ${v.by} · ${approval.independence}`);
  return clone(def);
}

/** Withdraw an institution's approval (an official who can sign there, with a reason); kept. */
export function withdrawApproval(id: unknown, actor: IndicatorActor, reason: unknown, opts: { institution?: unknown; now?: Date } = {}): IndicatorDefinition | { error: string } {
  const now = opts.now ?? new Date();
  const def = db().definitions.find(x => x.id === str(id, 80));
  if (!def) return { error: 'No such indicator' };
  const why = str(reason, 400);
  if (!why) return { error: 'Say why the approval is withdrawn' };
  const inst = approvalInstitution(def, actor, opts.institution);
  if (typeof inst !== 'string') return inst;
  if (actor.scope) {
    const r = indicatorApproveRefusal(actor.scope, inst);
    if (r) return { error: r };
  }
  const now_ = live(def, inst);
  if (!now_.length) return { error: 'Nothing is approved for this institution' };
  for (const a of now_) a.withdrawn = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}), at: now.toISOString(), reason: why };
  recordAudit(actor.name, 'indicator.approval.withdraw', `Indicator:${def.id}`, 'ok', `${getMinistry(inst)?.name ?? inst} · ${why.slice(0, 160)}`);
  return clone(def);
}
