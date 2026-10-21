// Offices of state as records (docs/CONSTITUTIONAL_ARCHITECTURE.md §6, §7.1
// `offices`; plan phase 4; audit F). An office belongs to an institution of the
// register (lib/data/store/institutions.ts), has a title in the nation's
// languages, a kind (head of state, head of government, presiding officer,
// clerk, chief justice, registrar, minister … an open list), references to its
// powers (recorded and enforced elsewhere: who is responsible, permit
// authority mappings, procedures), a term, an acting rule, a succession rule,
// its legal basis and the dates it applies. Head of state and head of
// government are separate offices; one person may hold both where the
// constitution says so (`heldWith`, and two holdings).
//
// These are the nation's facts: the platform offers the fields and keeps the
// history, it never chooses an office, a title or a power.
//
// How they change: during first-run setup an administrator records them
// directly (the commissioning step); afterwards only through the country's
// change process (lib/law/policy-change.ts): proposed by one administrator
// citing the laws register, confirmed by a different official, by one of the
// institution's own officials who can sign when it is independent. Every
// version is kept. Until a nation records a head of government, the office is
// derived from the profile's `executiveTitle`, so nothing changes visibly.
//
// Holding an office: an official account is linked to an office by an
// administrator of the office's institution (or of the whole government when
// the institution is not independent) and confirmed by a different official;
// it has a start and an end date, every step is audited and ended holdings
// are kept. Holding an office grants no permission: lib/auth/roles.ts reads
// the account's role and institution only (guidance §2.2, §6.3: a seniority or
// an office never grants a power its institution lacks).

import { touch } from '@/lib/data/repo/track';
import { recordAudit, getMinistry, getSetup, getSovereign } from '@/lib/data/store';
import { institutionBounds, termsOf as institutionTermsOf } from '@/lib/data/store/institutions';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, citeBasis } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';
import { dualControlRefusal, dualControlPendingHours, independenceOf } from '@/lib/data/dual-control';
import { accountById, hasOwnSigners } from '@/lib/auth/officials';
import { reaches, type OfficialRole, type Boundaries } from '@/lib/auth/roles';
import { applyHeadOffices } from '@/lib/nation/registry';
import { locales } from '@/lib/i18n/config';
import type { OfficeTerms, OfficeRecord, OfficeHolding, SovereignProfile } from '@/lib/api/types';

/** A starting list of kinds of office; the nation may record others (an open list). */
export const OFFICE_KINDS: { key: string; label: string }[] = [
  { key: 'head-of-state', label: 'Head of state' },
  { key: 'head-of-government', label: 'Head of government' },
  { key: 'deputy-head-of-government', label: 'Deputy head of government' },
  { key: 'minister', label: 'Minister' },
  { key: 'permanent-secretary', label: 'Permanent secretary or administrative head' },
  { key: 'agency-director', label: 'Agency director' },
  { key: 'cabinet-secretary', label: 'Cabinet secretary' },
  { key: 'presiding-officer', label: 'Presiding officer of a chamber' },
  { key: 'clerk', label: 'Clerk or secretary-general of a chamber' },
  { key: 'committee-chair', label: 'Committee chair' },
  { key: 'chief-justice', label: 'Chief justice' },
  { key: 'court-president', label: 'Court president or chief judge' },
  { key: 'registrar', label: 'Court registrar' },
  { key: 'prosecutor-general', label: 'Prosecutor-general' },
  { key: 'head-of-independent-body', label: 'Head of an independent body' },
  { key: 'auditor-general', label: 'Auditor-general' },
  { key: 'governor', label: 'Governor' },
  { key: 'traditional-leader', label: 'Traditional or customary leader' },
  { key: 'other', label: 'Other office' },
];
export const officeKindLabel = (k: string) => OFFICE_KINDS.find(x => x.key === k)?.label ?? k;

/** The id of the head-of-government office derived from the profile until the nation records one. */
export const DERIVED_HEAD_OF_GOVERNMENT = 'head-of-government';

interface Db { offices: OfficeRecord[]; holdings: OfficeHolding[] }
const g = globalThis as unknown as { __civicosOffices?: Db };
const db = (): Db => {
  const d = touch('__civicosOffices', g.__civicosOffices ??= { offices: [], holdings: [] });
  d.offices ??= [];
  d.holdings ??= [];
  return d;
};
export function resetOffices(): void { g.__civicosOffices = undefined; }

const AUDIT = 'office.terms';
const HOLD = 'office.holder';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KIND = /^[a-z][a-z0-9-]{1,40}$/;
const today = (now: Date) => now.toISOString().slice(0, 10);
const LANGS = new Set(locales.map(l => l.code as string));
export const setupRunning = () => getSetup() === null;

// ── Reading ────────────────────────────────────────────────────────────────

/**
 * The terms in force on a date: the latest adopted change whose date has
 * come, else what setup recorded; null when nothing has been adopted yet
 * (a proposed office is not an office until a second official confirms it).
 */
export function officeTermsOf(o: OfficeRecord, now = new Date()): OfficeTerms | null {
  const on = today(now);
  const adopted = (o.changes.history ?? []).filter(h => h.outcome === 'adopted' && h.values.effectiveFrom <= on)
    .sort((a, b) => a.values.effectiveFrom.localeCompare(b.values.effectiveFrom) || (a.confirmed?.at ?? '').localeCompare(b.confirmed?.at ?? ''))
    .at(-1);
  if (adopted) return structuredClone(adopted.values);
  if (o.recorded && o.recorded.effectiveFrom <= on) return structuredClone(o.recorded);
  return null;
}

/** Whether the office exists today: its terms are in force and it has not ended. */
const inForce = (t: OfficeTerms | null, now: Date): t is OfficeTerms => !!t && (!t.effectiveTo || t.effectiveTo >= today(now));

export interface OfficeView extends OfficeTerms {
  id: string;
  /** Derived from the profile (executiveTitle) because the nation has recorded no head of government. */
  derived?: boolean;
  /** In force today. */
  inForce: boolean;
  /** Proposed only, or adopted with a later date: not an office yet. */
  status: 'in-force' | 'ended' | 'scheduled' | 'proposed';
  basis?: Citation[];
  institutionName?: string;
  holders: { id: string; name: string; accountId: string; from: string; to?: string; acting?: boolean }[];
}

/** The head of government derived from the profile: the title the nation set in setup, no powers, no institution. */
export function derivedHeadOfGovernment(p: Pick<SovereignProfile, 'executiveTitle'>): OfficeView {
  return {
    id: DERIVED_HEAD_OF_GOVERNMENT, derived: true, inForce: true, status: 'in-force',
    title: p.executiveTitle?.trim() || 'Head of Government', kind: 'head-of-government', powers: [], effectiveFrom: '', holders: [],
  };
}

function holdersOf(officeId: string, now: Date): OfficeView['holders'] {
  const on = today(now);
  return db().holdings.filter(h => h.officeId === officeId && h.state === 'active' && h.from <= on && (!h.to || h.to >= on))
    .map(h => ({ id: h.id, name: h.holderName, accountId: h.accountId, from: h.from, ...(h.to ? { to: h.to } : {}), ...(h.acting ? { acting: true } : {}) }));
}

function view(o: OfficeRecord, now: Date): OfficeView {
  const t = officeTermsOf(o, now);
  const proposed = o.changes.pending?.values;
  const scheduled = (o.changes.history ?? []).find(h => h.outcome === 'adopted' && h.values.effectiveFrom > today(now))?.values;
  const last = (o.changes.history ?? []).at(-1)?.values;
  const terms = t ?? scheduled ?? proposed ?? o.recorded ?? last ?? { title: o.id, kind: 'other', powers: [], effectiveFrom: '' };
  const status: OfficeView['status'] = t ? (inForce(t, now) ? 'in-force' : 'ended') : scheduled || o.recorded ? 'scheduled' : 'proposed';
  const adopted = (o.changes.history ?? []).filter(h => h.outcome === 'adopted').at(-1);
  const basis = adopted?.basis ?? o.basis;
  const inst = terms.institution ? getMinistry(terms.institution) : undefined;
  return { ...structuredClone(terms), id: o.id, inForce: status === 'in-force', status, ...(basis ? { basis: structuredClone(basis) } : {}),
    ...(inst ? { institutionName: inst.name } : {}), holders: holdersOf(o.id, now) };
}

/**
 * Every office: the recorded ones (in force, scheduled, ended or only
 * proposed) and, while the nation has recorded no head of government in
 * force, the one derived from the profile's executive title.
 */
export function listOffices(now = new Date()): OfficeView[] {
  const list = db().offices.map(o => view(o, now));
  const hasHead = list.some(o => o.inForce && o.kind === 'head-of-government');
  return hasHead ? list : [derivedHeadOfGovernment(getSovereign()), ...list];
}

export const getOfficeRecord = (id: string): OfficeRecord | undefined => db().offices.find(o => o.id === id);
export function getOffice(id: string, now = new Date()): OfficeView | undefined {
  const o = getOfficeRecord(id);
  if (o) return view(o, now);
  return id === DERIVED_HEAD_OF_GOVERNMENT ? listOffices(now).find(x => x.id === id && x.derived) : undefined;
}
/** The record with its change history (waiting proposal and every version), for the screens. */
export const officeHistory = (id: string) => structuredClone(getOfficeRecord(id)?.changes ?? {});

/** The titles of the head of state and head of government in force (recorded offices only; absent: the profile's wording stays). */
export function headOfficeTitles(now = new Date()): { headOfState?: string; headOfGovernment?: string } {
  const live = db().offices.map(o => officeTermsOf(o, now)).filter((t): t is OfficeTerms => inForce(t, now));
  const hos = live.find(t => t.kind === 'head-of-state')?.title;
  const hog = live.find(t => t.kind === 'head-of-government')?.title;
  return { ...(hos ? { headOfState: hos } : {}), ...(hog ? { headOfGovernment: hog } : {}) };
}
/** Tell the nation registry (public wording, offices) the titles in force. */
export const syncHeadOffices = () => applyHeadOffices(headOfficeTitles());

/** Offices an account holds today (active holdings of offices in force). */
export function officesHeldBy(accountId: string, now = new Date()): { id: string; title: string; kind: string; institution?: string; acting?: boolean; from: string; to?: string }[] {
  const on = today(now);
  const out: ReturnType<typeof officesHeldBy> = [];
  for (const h of db().holdings) {
    if (h.accountId !== accountId || h.state !== 'active' || h.from > on || (h.to && h.to < on)) continue;
    const o = getOfficeRecord(h.officeId);
    const t = o ? officeTermsOf(o, now) : null;
    if (!inForce(t, now)) continue;
    out.push({ id: h.officeId, title: t.title, kind: t.kind, ...(t.institution ? { institution: t.institution } : {}), ...(h.acting ? { acting: true } : {}), from: h.from, ...(h.to ? { to: h.to } : {}) });
  }
  return out;
}

// ── Checking what is asked ─────────────────────────────────────────────────

export interface OfficeInput {
  institution?: unknown; title?: unknown; titles?: unknown; kind?: unknown; powers?: unknown; term?: unknown;
  acting?: unknown; succession?: unknown; heldWith?: unknown; effectiveFrom?: unknown; effectiveTo?: unknown;
}
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** What a request asks, checked; fields left out keep their current value. */
function parseOffice(input: OfficeInput, selfId: string | undefined): Partial<OfficeTerms> | { error: string } {
  const out: Partial<OfficeTerms> = {};
  if (input.title !== undefined) {
    const t = str(input.title, 200);
    if (!t) return { error: 'An office needs its official title' };
    out.title = t;
  }
  if (input.titles !== undefined) {
    if (!input.titles || typeof input.titles !== 'object' || Array.isArray(input.titles)) return { error: 'Titles in further languages are { language code: title }' };
    const titles: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.titles as Record<string, unknown>)) {
      if (!LANGS.has(k)) return { error: `Unknown language code: ${k}` };
      const t = str(v, 200);
      if (t) titles[k] = t;
    }
    out.titles = titles;
  }
  if (input.kind !== undefined) {
    if (typeof input.kind !== 'string' || !KIND.test(input.kind)) return { error: `The kind of office is a short key (e.g. ${OFFICE_KINDS.slice(0, 4).map(k => k.key).join(', ')}, or the nation's own)` };
    out.kind = input.kind;
  }
  if (input.institution !== undefined) {
    if (input.institution === null || input.institution === '') out.institution = undefined;
    else {
      const m = typeof input.institution === 'string' ? getMinistry(input.institution) : undefined;
      if (!m || m.status === 'merged') return { error: 'The office belongs to an institution of the register (/api/org)' };
      out.institution = m.id;
    }
  }
  if (input.powers !== undefined) {
    if (!Array.isArray(input.powers) || input.powers.length > 40 || input.powers.some(p => typeof p !== 'string')) return { error: 'Powers are a list (up to 40) of references to powers recorded elsewhere' };
    out.powers = [...new Set((input.powers as string[]).map(p => p.trim().slice(0, 200)).filter(Boolean))];
  }
  if (input.term !== undefined) {
    if (input.term === null) out.term = undefined;
    else {
      const t = input.term as { years?: unknown; limit?: unknown; note?: unknown };
      if (typeof t !== 'object') return { error: 'The term is { years?, limit?, note? }' };
      const years = t.years === undefined ? undefined : Number(t.years), limit = t.limit === undefined ? undefined : Number(t.limit);
      if (years !== undefined && (!Number.isInteger(years) || years < 1 || years > 99)) return { error: 'The term in years is a whole number from 1 to 99' };
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 20)) return { error: 'The limit on terms is a whole number from 1 to 20' };
      const note = str(t.note, 500);
      out.term = { ...(years ? { years } : {}), ...(limit ? { limit } : {}), ...(note ? { note } : {}) };
    }
  }
  for (const k of ['acting', 'succession'] as const) {
    if (input[k] !== undefined) out[k] = str(input[k], 1000) || undefined;
  }
  if (input.heldWith !== undefined) {
    if (!Array.isArray(input.heldWith) || input.heldWith.some(x => typeof x !== 'string')) return { error: 'Held with is a list of office ids' };
    const ids = [...new Set(input.heldWith as string[])];
    const unknown = ids.find(x => x === selfId || !getOfficeRecord(x));
    if (unknown) return { error: `No other office ${unknown} to be held with` };
    out.heldWith = ids;
  }
  for (const k of ['effectiveFrom', 'effectiveTo'] as const) {
    const v = input[k];
    if (v === undefined) continue;
    if (k === 'effectiveTo' && (v === null || v === '')) { out.effectiveTo = undefined; continue; }
    if (typeof v !== 'string' || !ISO_DATE.test(v)) return { error: 'Dates are YYYY-MM-DD' };
    out[k] = v;
  }
  return out;
}

const complete = (v: Partial<OfficeTerms>): string | null => {
  if (!v.title) return 'An office needs its official title';
  if (!v.kind) return 'Say what kind of office it is';
  if (!v.effectiveFrom) return 'Say from when the office applies';
  if (v.effectiveTo && v.effectiveTo < v.effectiveFrom) return 'An office cannot end before it applies';
  return null;
};
const clean = (v: Partial<OfficeTerms>): OfficeTerms => {
  const o = { ...v, powers: v.powers ?? [] } as OfficeTerms;
  for (const k of Object.keys(o) as (keyof OfficeTerms)[]) if (o[k] === undefined) delete o[k];
  return o;
};
const describe = (v: OfficeTerms) => `${v.title} (${officeKindLabel(v.kind)})${v.institution ? ` · ${getMinistry(v.institution)?.name ?? v.institution}` : ''} from ${v.effectiveFrom}${v.effectiveTo ? ` to ${v.effectiveTo}` : ''}${v.powers.length ? ` · ${v.powers.length} power reference(s)` : ''}`;

function newId(title: string): string {
  const base = title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 48) || 'office';
  let id = base === DERIVED_HEAD_OF_GOVERNMENT ? `${base}-office` : base;
  for (let i = 2; db().offices.some(o => o.id === id); i++) id = `${base}-${i}`;
  return id;
}

export interface OfficeActor { by: string; byId?: string; role?: OfficialRole; institution?: string }

/**
 * Who may propose a change to an office: an administrator of the whole
 * government or of the office's institution (current or proposed). Null when
 * allowed. `actor.role` absent: no signed-in official (open mode, tests).
 */
function proposerRefusal(actor: OfficeActor, institutions: (string | undefined)[]): string | null {
  if (!actor.role) return null;
  if (actor.role !== 'administrator') return 'An administrator of the whole government or of the office\'s institution proposes a change to an office';
  if (!actor.institution) return null;
  return institutions.filter(Boolean).every(i => i === actor.institution) ? null : 'An institution\'s administrator records only that institution\'s offices';
}

// ── Recording during setup ─────────────────────────────────────────────────

/**
 * During first-run setup only: an administrator records an office directly,
 * as the nation commissions the installation (citation optional, the laws
 * register may still be empty). Creates the office, or replaces the recorded
 * terms of an existing one (`id`). Audited. After setup: proposeOffice().
 */
export function recordOfficeDuringSetup(input: OfficeInput & { id?: unknown; legalBasis?: unknown }, actor: OfficeActor, now = new Date()): OfficeView | { error: string } {
  if (!setupRunning()) return { error: 'Setup is complete: an office now changes only through the change process (propose, citing the law; a different official confirms)' };
  const existing = typeof input.id === 'string' ? getOfficeRecord(input.id) : undefined;
  if (typeof input.id === 'string' && input.id && !existing) return { error: 'No such office' };
  const p = parseOffice(input, existing?.id);
  if ('error' in p) return p;
  const v = { effectiveFrom: today(now), ...(existing?.recorded ?? {}), ...p };
  const why = complete(v) ?? proposerRefusal(actor, [existing?.recorded?.institution, v.institution]);
  if (why) return { error: why };
  let basis: Citation[] | undefined;
  if (Array.isArray(input.legalBasis) && input.legalBasis.length) {
    const c = citeBasis(input.legalBasis, today(now), `Office: ${v.title}`);
    if ('error' in c) return c;
    basis = c;
  }
  const terms = clean(v);
  const o: OfficeRecord = existing ?? { id: newId(terms.title), createdAt: now.toISOString(), createdBy: actor.by, changes: {} };
  o.recorded = terms;
  if (basis) o.basis = basis;
  if (!existing) db().offices.push(o);
  recordAudit(actor.by, `${AUDIT}.setup`, `Office:${o.id}`, 'ok', `${describe(terms)} · recorded during first-run setup`);
  syncHeadOffices();
  return view(o, now);
}

// ── The change process after setup ─────────────────────────────────────────

/**
 * One administrator proposes a new office (no `id`) or a change to one,
 * citing the laws register; fields left out keep their current value. It
 * waits for a different official (confirmOffice()).
 */
export function proposeOffice(input: OfficeInput & { id?: unknown; legalBasis?: unknown }, actor: OfficeActor, now = new Date()) {
  const existing = typeof input.id === 'string' && input.id ? getOfficeRecord(input.id) : undefined;
  if (typeof input.id === 'string' && input.id && !existing) {
    return input.id === DERIVED_HEAD_OF_GOVERNMENT
      ? { error: 'The head of government shown is derived from the profile: propose it as a new office (kind head-of-government) to record it' }
      : { error: 'No such office' };
  }
  const p = parseOffice(input, existing?.id);
  if ('error' in p) return p;
  const current = existing ? officeTermsOf(existing, now) ?? existing.changes.pending?.values ?? existing.recorded : undefined;
  const values = { effectiveFrom: today(now), ...(current ?? {}), ...p };
  const why = complete(values) ?? proposerRefusal(actor, [current?.institution, values.institution]);
  if (why) return { error: why };
  const o: OfficeRecord = existing ?? { id: newId(values.title!), createdAt: now.toISOString(), createdBy: actor.by, changes: {} };
  const r = proposePolicy(o.changes, clean(values), {}, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: AUDIT,
    context: `Office: ${values.title}`, describe, check: () => null,
  });
  if ('error' in r) return r;
  if (!existing) db().offices.push(o);
  return { office: o.id, pending: r };
}

/** Who must confirm: an official who can sign at the office's institution when it is (or would be) independent and has such officials. */
export function officeConfirmer(id: string, now = new Date()): string | null {
  const o = getOfficeRecord(id);
  if (!o) return null;
  const b = institutionBounds(now);
  const ids = [officeTermsOf(o, now)?.institution, o.changes.pending?.values.institution].filter((x): x is string => !!x);
  return ids.find(i => b.independent.includes(i) && hasOwnSigners(i)) ?? null;
}

/**
 * A different official confirms the waiting change (an administrator or an
 * official who can sign; for an independent institution with its own
 * officials who can sign, one of them). Adopted versions apply from their date.
 */
export function confirmOffice(id: string, actor: OfficeActor, now = new Date()) {
  const o = getOfficeRecord(id);
  if (!o) return { error: 'No such office' };
  if (actor.role && actor.role !== 'administrator' && actor.role !== 'signatory') return { error: 'An administrator or an official who can sign confirms a change to an office' };
  const must = officeConfirmer(id, now);
  if (must && actor.role && actor.institution !== must) {
    return { error: `${getMinistry(must)?.name ?? must} is independent: an official who can sign there confirms changes to its offices, not the government` };
  }
  const r = confirmPolicy(o.changes, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: AUDIT, describe, adopt: () => undefined });
  if (!('error' in r)) syncHeadOffices();
  return r;
}

export function withdrawOffice(id: string, actor: OfficeActor, reason?: string) {
  const o = getOfficeRecord(id);
  if (!o) return { error: 'No such office' };
  const p = o.changes.pending;
  if (p && actor.role && actor.role !== 'administrator' && p.byId !== actor.byId) return { error: 'The proposer or an administrator withdraws a waiting change' };
  return withdrawPolicy(o.changes, { by: actor.by, ...(reason ? { reason } : {}), audit: AUDIT });
}

/** Lapse waiting changes and holdings whose time has passed (read time and the daily job). */
export function lapseOffices(now = new Date()): void {
  for (const o of db().offices) if (o.changes.pending) lapsePolicy(o.changes, now, AUDIT);
  for (const h of db().holdings) {
    if (h.state === 'waiting' && Date.parse(h.expiresAt) < now.getTime()) {
      h.state = 'lapsed';
      recordAudit('System (deadlines)', `${HOLD}.lapse`, `Office:${h.officeId}`, 'ok', `${h.holderName}: not confirmed within the waiting period`);
    }
  }
}

/** Offices with a change waiting for its second official. */
export const waitingOffices = () => db().offices.filter(o => o.changes.pending).map(o => ({ id: o.id, title: o.changes.pending!.values.title, institution: o.changes.pending!.values.institution, pending: structuredClone(o.changes.pending!) }));

// ── Holding an office ──────────────────────────────────────────────────────

/** Who may link or end a holding: an administrator of the office's institution, or of the whole government when it is not independent. */
function holderAdminRefusal(actor: OfficeActor, institution: string | undefined, bounds: Boundaries): string | null {
  if (!actor.role) return null;
  if (actor.role !== 'administrator') return 'An administrator of the office\'s institution links an official to an office';
  if (!institution) return actor.institution ? 'This office belongs to no institution: an administrator of the whole government links its holder' : null;
  return reaches({ role: actor.role, institution: actor.institution, bounds }, institution) ? null
    : 'An administrator of the office\'s own institution links its holder (serving the whole government does not reach an independent institution)';
}

const accountIdOf = (v: unknown) => (typeof v === 'string' ? v.replace(/^local:/, '').trim() : '');

/** Link an official account to an office: waits for a second official (confirmHolding()). */
export function proposeHolding(input: { officeId?: unknown; accountId?: unknown; from?: unknown; to?: unknown; acting?: unknown; note?: unknown; legalBasis?: unknown }, actor: OfficeActor, now = new Date()): OfficeHolding | { error: string } {
  lapseOffices(now);
  const officeId = typeof input.officeId === 'string' ? input.officeId : '';
  const o = getOfficeRecord(officeId);
  if (!o) return { error: officeId === DERIVED_HEAD_OF_GOVERNMENT ? 'Record the office first: the head of government shown is derived from the profile' : 'No such office' };
  const t = officeTermsOf(o, now);
  if (!inForce(t, now)) return { error: 'This office is not in force: an official is linked only to an office in force' };
  const why = holderAdminRefusal(actor, t.institution, institutionBounds(now));
  if (why) return { error: why };
  const accountId = accountIdOf(input.accountId);
  const a = accountById(accountId);
  if (!a || a.disabled) return { error: 'Link an active official account' };
  const from = input.from === undefined ? today(now) : input.from;
  if (typeof from !== 'string' || !ISO_DATE.test(from)) return { error: 'The date the holding starts is YYYY-MM-DD' };
  const to = input.to === undefined || input.to === '' ? undefined : input.to;
  if (to !== undefined && (typeof to !== 'string' || !ISO_DATE.test(to) || to < from)) return { error: 'The end date is YYYY-MM-DD and not before the start' };
  if (db().holdings.some(h => h.officeId === o.id && h.accountId === a.id && (h.state === 'waiting' || (h.state === 'active' && (!h.to || h.to >= today(now)))))) {
    return { error: `${a.name} already holds this office or is waiting to` };
  }
  let basis: Citation[] | undefined;
  if (Array.isArray(input.legalBasis) && input.legalBasis.length) {
    const c = citeBasis(input.legalBasis, today(now), `Holder of ${t.title}`);
    if ('error' in c) return c;
    basis = c;
  }
  const h: OfficeHolding = {
    id: `OH-${now.getTime().toString(36)}-${db().holdings.length + 1}`, officeId: o.id, accountId: a.id, holderName: a.name, from, ...(to ? { to } : {}),
    state: 'waiting', ...(input.acting === true ? { acting: true } : {}), ...(basis ? { basis } : {}),
    ...(str(input.note, 300) ? { note: str(input.note, 300) } : {}),
    proposedBy: actor.by, ...(actor.byId ? { proposedById: actor.byId } : {}), proposedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + dualControlPendingHours() * 3_600_000).toISOString(),
  };
  db().holdings.push(h);
  recordAudit(actor.by, `${HOLD}.propose`, `Office:${o.id}`, 'ok', `${a.name} as ${h.acting ? 'acting ' : ''}${t.title} from ${from}${to ? ` to ${to}` : ''} · awaiting a second official`);
  return structuredClone(h);
}

/**
 * A different official confirms a waiting link: an administrator or an
 * official who can sign whose scope reaches the office's institution (its
 * own officials when it is independent).
 */
export function confirmHolding(id: string, actor: OfficeActor, now = new Date()): OfficeHolding | { error: string } {
  lapseOffices(now);
  const h = db().holdings.find(x => x.id === id);
  if (!h) return { error: 'No such holding' };
  if (h.state !== 'waiting') return { error: 'This link is not waiting to be confirmed' };
  const o = getOfficeRecord(h.officeId);
  const t = o ? officeTermsOf(o, now) : null;
  if (actor.role) {
    if (actor.role !== 'administrator' && actor.role !== 'signatory') return { error: 'An administrator or an official who can sign confirms who holds an office' };
    if (t?.institution && !reaches({ role: actor.role, institution: actor.institution, bounds: institutionBounds(now) }, t.institution)) {
      return { error: 'An official of the office\'s own institution confirms who holds it' };
    }
  }
  if (actor.byId && accountIdOf(actor.byId) === h.accountId) return { error: 'The official linked to the office does not confirm their own link' };
  const why = dualControlRefusal({ by: h.proposedBy, ...(h.proposedById ? { byId: h.proposedById } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (why) return { error: why };
  Object.assign(h, { state: 'active', confirmedBy: actor.by, ...(actor.byId ? { confirmedById: actor.byId } : {}), confirmedAt: now.toISOString(), independence: independenceOf(h.proposedById, actor.byId) });
  recordAudit(actor.by, HOLD, `Office:${h.officeId}`, 'ok', `${h.holderName} holds ${t?.title ?? h.officeId}${h.acting ? ' (acting)' : ''} from ${h.from} · linked by ${h.proposedBy}, confirmed by ${actor.by} · ${h.independence} · no permission follows from the office`);
  return structuredClone(h);
}

/** End a holding (or withdraw one still waiting): the same administrators who link; kept with its end date and reason. */
export function endHolding(id: string, input: { to?: unknown; reason?: unknown }, actor: OfficeActor, now = new Date()): OfficeHolding | { error: string } {
  const h = db().holdings.find(x => x.id === id);
  if (!h) return { error: 'No such holding' };
  const o = getOfficeRecord(h.officeId);
  const t = o ? (officeTermsOf(o, now) ?? o.recorded) : undefined;
  const reason = str(input.reason, 300);
  if (h.state === 'waiting') {
    if (actor.role && actor.role !== 'administrator' && h.proposedById !== actor.byId) return { error: 'The proposer or an administrator withdraws a waiting link' };
    Object.assign(h, { state: 'withdrawn', endedBy: actor.by, endedAt: now.toISOString(), ...(reason ? { endReason: reason } : {}) });
    recordAudit(actor.by, `${HOLD}.withdraw`, `Office:${h.officeId}`, 'ok', `${h.holderName}: ${reason || 'withdrawn'}`);
    return structuredClone(h);
  }
  if (h.state !== 'active') return { error: 'This holding has already ended' };
  const why = holderAdminRefusal(actor, t?.institution, institutionBounds(now));
  if (why) return { error: why };
  if (!reason) return { error: 'Say why the holding ends (e.g. term ended, resignation, removal under the law)' };
  const to = input.to === undefined || input.to === '' ? today(now) : input.to;
  if (typeof to !== 'string' || !ISO_DATE.test(to) || to < h.from) return { error: 'The end date is YYYY-MM-DD and not before the start' };
  Object.assign(h, { state: 'ended', to, endedBy: actor.by, endedAt: now.toISOString(), endReason: reason });
  recordAudit(actor.by, `${HOLD}.end`, `Office:${h.officeId}`, 'ok', `${h.holderName} no longer holds ${t?.title ?? h.officeId} from ${to}: ${reason}`);
  return structuredClone(h);
}

/** Every holding, newest first (ended, lapsed and withdrawn ones kept); optionally of one office. */
export function listHoldings(officeId?: string, now = new Date()): OfficeHolding[] {
  lapseOffices(now);
  return structuredClone(db().holdings.filter(h => !officeId || h.officeId === officeId)).reverse();
}
export const waitingHoldings = () => structuredClone(db().holdings.filter(h => h.state === 'waiting'));

/** Whether the nation has recorded any office of its own (beyond the derived head of government). */
export const officesRecorded = (): number => db().offices.filter(o => !!o.recorded || (o.changes.history ?? []).some(h => h.outcome === 'adopted')).length;

/** The standing of an office's institution, for screens that group offices by branch. */
export const officeStanding = (institution: string | undefined, now = new Date()) => {
  const m = institution ? getMinistry(institution) : undefined;
  return m ? institutionTermsOf(m, now).standing : undefined;
};
