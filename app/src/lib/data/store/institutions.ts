// The institution register's constitutional terms (docs/CONSTITUTIONAL_ARCHITECTURE.md
// §2.1, §7.1–7.2; plan phase 1; audit B and I). The ministry registry
// (/api/org) is the institution register: each record carries, besides its
// name and departments, its standing (executive ministry, independent body,
// legislature, judiciary, head of state…), branch, establishing law,
// effective date, independence recorded per dimension (decisions,
// appointment, dismissal, funding, instructions), what the law forbids and
// the records it owns. These are the nation's facts: the platform offers the
// fields and enforces them, it never chooses them.
//
// How they change: during first-run setup an administrator records them
// directly (the commissioning step); once setup is complete only through the
// country's change process (lib/law/policy-change.ts): proposed by one
// administrator citing the laws register, confirmed by a different official,
// every version kept. When the institution's current or proposed standing is
// independent and it has officials who can sign, the confirmation comes from
// one of them (§4.10: an executive official cannot silently change an
// independent body's mandate). Renaming, deactivating or merging an
// independent institution goes the same way (structuralRefusal()).
//
// Who stands outside whole-government reach (lib/auth/roles.ts Boundaries)
// is read from here at use: institutionBounds().

import type { Ministry, InstitutionStanding, InstitutionTerms, IndependenceDimension, IndependenceRule, InstitutionProhibition, InstitutionStructuralChange } from '@/lib/api/types';
import type { BranchKey } from '@/lib/gov/constitution';
import type { Boundaries } from '@/lib/auth/roles';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, citeBasis, type PolicyVersion } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';
import { dualControlPendingHours } from '@/lib/data/dual-control';
import { INDEPENDENT_SLOTS, JUDICIAL_SLOTS } from '@/lib/nation/deployment';
import { db } from './state';
import { recordAudit } from './audit';
import { getMinistry, renameMinistry, deactivateMinistry, mergeMinistry } from './ministries';
import { authorityFor, getSetup } from './sovereign';
import { relationshipGrants } from './relationships';

export const STANDINGS: { key: InstitutionStanding; label: string; means: string }[] = [
  { key: 'executive-ministry', label: 'Ministry (executive)', means: 'Part of the government, under a minister.' },
  { key: 'executive-agency', label: 'Agency (executive)', means: 'Delivers a public service for the government within the powers given to it.' },
  { key: 'independent-statutory', label: 'Independent body set up by law', means: 'A body an ordinary law sets up; independent only in the ways that law says.' },
  { key: 'independent-constitutional', label: 'Independent body set up by the constitution', means: 'A body the constitution sets up and protects, such as an audit office or electoral body.' },
  { key: 'legislature', label: 'Legislature', means: 'The parliament or one of its chambers, with its own clerk and records.' },
  { key: 'judiciary', label: 'Court or judicial body', means: 'A court, tribunal or judicial administration; decides cases independently.' },
  { key: 'head-of-state', label: 'Head of state\'s office', means: 'The office of the head of state, separate from the government.' },
  { key: 'subnational', label: 'Regional or local government', means: 'A state, province, region or municipality with its own powers.' },
  { key: 'customary-or-religious', label: 'Customary or religious authority', means: 'An authority the law recognises for a defined community or subject.' },
];
export const isStanding = (v: unknown): v is InstitutionStanding => STANDINGS.some(s => s.key === v);
export const standingLabel = (k: InstitutionStanding) => STANDINGS.find(s => s.key === k)?.label ?? k;

export const INDEPENDENCE_DIMENSIONS: { key: IndependenceDimension; label: string; question: string }[] = [
  { key: 'decisions', label: 'Its decisions', question: 'Does the law protect its decisions from direction by another institution?' },
  { key: 'appointment', label: 'Appointing its head', question: 'Who appoints its head or members, and is that protected?' },
  { key: 'dismissal', label: 'Removing its head', question: 'Who may remove its head or members, and on what protected grounds?' },
  { key: 'funding', label: 'Its funding', question: 'Who sets its budget, and is its funding protected?' },
  { key: 'instructions', label: 'Instructions it receives', question: 'May any other institution instruct it, and on what?' },
];
const DIMENSIONS = INDEPENDENCE_DIMENSIONS.map(d => d.key);
const PROHIBITION_KINDS: InstitutionProhibition['kind'][] = ['direction', 'data-access', 'non-delegable'];
export const BRANCHES: { key: BranchKey; label: string }[] = [
  { key: 'executive', label: 'Executive' }, { key: 'legislature', label: 'Legislature' }, { key: 'judiciary', label: 'Judiciary' },
  { key: 'oversight', label: 'Oversight' }, { key: 'crown', label: 'Crown or head of state' }, { key: 'electoral', label: 'Electoral' },
  { key: 'federal-council', label: 'Federal council' },
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AUDIT = 'institution.terms';
const today = (now: Date) => now.toISOString().slice(0, 10);

/** Standings outside whole-government reach whatever else is recorded. */
const ALWAYS_INDEPENDENT: InstitutionStanding[] = ['legislature', 'judiciary', 'independent-constitutional', 'head-of-state'];

/**
 * Whether these terms make an institution independent of the government:
 * the legislature, the courts, constitutional bodies and the head of state's
 * office always; a body set up by ordinary law only when its decisions are
 * recorded as protected. Executive, regional and customary bodies are not.
 */
export function independentTerms(t: Pick<InstitutionTerms, 'standing' | 'independence'>): boolean {
  if (ALWAYS_INDEPENDENT.includes(t.standing)) return true;
  return t.standing === 'independent-statutory' && !!t.independence?.decisions?.protected;
}

/** The terms as recorded on the record itself (setup, or the latest change in force when it was adopted); defaults for records from before. */
function recorded(m: Ministry): InstitutionTerms {
  return {
    standing: m.standing ?? 'executive-ministry', ...(m.branch ? { branch: m.branch } : {}),
    effectiveFrom: m.effectiveFrom ?? m.createdAt.slice(0, 10),
    independence: structuredClone(m.independence ?? {}), prohibitions: structuredClone(m.prohibitions ?? []), records: [...(m.records ?? [])],
  };
}

type Adopted = PolicyVersion<InstitutionTerms> & { outcome: string };
const adopted = (m: Ministry): Adopted[] => (m.terms?.history ?? []).filter(h => h.outcome === 'adopted');

/**
 * The terms in force for an institution on a date: the latest adopted change
 * whose effective date has come, else what the record carries (setup, or
 * an executive ministry with no independence claims for records from before).
 */
export function termsOf(m: Ministry, now = new Date()): InstitutionTerms & { basis?: Citation[] } {
  const on = today(now);
  const inForce = adopted(m).filter(h => h.values.effectiveFrom <= on)
    .sort((a, b) => a.values.effectiveFrom.localeCompare(b.values.effectiveFrom) || (a.confirmed?.at ?? '').localeCompare(b.confirmed?.at ?? ''))
    .at(-1);
  if (inForce) { const { change: _c, ...v } = structuredClone(inForce.values); return { ...v, basis: inForce.basis }; }
  return { ...recorded(m), ...(m.basis ? { basis: structuredClone(m.basis) } : {}) };
}

/** Adopted changes whose date has not come yet. */
export const scheduledTerms = (m: Ministry, now = new Date()) => adopted(m).filter(h => h.values.effectiveFrom > today(now)).map(h => structuredClone(h));

/** Whether an institution (registry id) is independent today: its terms, or a slot that makes it so (INDEPENDENT_SLOTS). */
export function isIndependentInstitution(id: string, now = new Date()): boolean {
  return institutionBounds(now).independent.includes(id);
}

/**
 * Who stands outside whole-government reach, read at use and carried with
 * the official to lib/auth/roles.ts (which imports nothing): independent
 * institutions (their terms, or the slots that make one so), courts (standing
 * judiciary, or named for the judiciary or a constitutional court), the
 * public audit office when the nation named one and recorded it as set up by
 * the constitution, and every registered institution.
 */
export function institutionBounds(now = new Date()): Boundaries {
  const independent = new Set<string>(), judicial = new Set<string>();
  const institutions: string[] = [], subnational: string[] = [];
  for (const m of db.ministries) {
    institutions.push(m.id);
    const t = termsOf(m, now);
    if (independentTerms(t)) independent.add(m.id);
    if (t.standing === 'judiciary') judicial.add(m.id);
    // A regional or local government with its own powers (plan phase 7, audit K): outside central reach.
    if (t.standing === 'subnational') subnational.push(m.id);
  }
  for (const k of INDEPENDENT_SLOTS) { const id = authorityFor(k); if (id) independent.add(id); }
  for (const k of JUDICIAL_SLOTS) { const id = authorityFor(k); if (id) { judicial.add(id); independent.add(id); } }
  const auditId = authorityFor('supremeAudit');
  const auditM = auditId ? getMinistry(auditId) : undefined;
  const audit = auditM && termsOf(auditM, now).standing === 'independent-constitutional' ? auditM.id : undefined;
  // The approved relationships in force today (plan phase 3), for the rules that read them.
  const relationships = relationshipGrants(now);
  const legislature = authorityFor('legislature'), headOfState = authorityFor('headOfState');
  return {
    independent: [...independent], judicial: [...judicial], ...(audit ? { audit } : {}), institutions, ...(relationships.length ? { relationships } : {}),
    ...(subnational.length ? { subnational } : {}), ...(legislature ? { legislature } : {}), ...(headOfState ? { headOfState } : {}),
  };
}

/** The registered institutions a directive's targets name (id, slug or name), with their ids and names. */
export function registeredTargets(targets: string[]): { target: string; id: string; name: string }[] {
  const out: { target: string; id: string; name: string }[] = [];
  for (const t of targets) {
    const k = t.trim().toLowerCase();
    const m = db.ministries.find(x => x.id.toLowerCase() === k || x.slug.toLowerCase() === k || x.name.toLowerCase() === k);
    if (m) out.push({ target: t, id: m.id, name: m.name });
  }
  return out;
}

/** The registered institutions a directive's targets name (id, slug or name) that are independent today. */
export function independentTargets(targets: string[], now = new Date()): { target: string; id: string; name: string }[] {
  const b = institutionBounds(now);
  const out: { target: string; id: string; name: string }[] = [];
  for (const t of targets) {
    const k = t.trim().toLowerCase();
    const m = db.ministries.find(x => x.id.toLowerCase() === k || x.slug.toLowerCase() === k || x.name.toLowerCase() === k);
    if (m && b.independent.includes(m.id)) out.push({ target: t, id: m.id, name: m.name });
  }
  return out;
}

// ── Reading and checking a change ───────────────────────────────────────────

export interface TermsInput {
  standing?: unknown; branch?: unknown; effectiveFrom?: unknown; independence?: unknown;
  prohibitions?: unknown; records?: unknown; change?: unknown;
}

/** What a request asks to change, checked; values left out keep their current setting. */
function parseTerms(id: string, input: TermsInput, now: Date): Partial<InstitutionTerms> | { error: string } {
  const out: Partial<InstitutionTerms> = {};
  if (input.standing !== undefined) {
    if (!isStanding(input.standing)) return { error: `Standing must be one of ${STANDINGS.map(s => s.key).join(', ')}` };
    out.standing = input.standing;
  }
  if (input.branch !== undefined && input.branch !== null && input.branch !== '') {
    if (!BRANCHES.some(b => b.key === input.branch)) return { error: `Branch must be one of ${BRANCHES.map(b => b.key).join(', ')}` };
    out.branch = input.branch as BranchKey;
  }
  if (input.effectiveFrom !== undefined) {
    if (typeof input.effectiveFrom !== 'string' || !ISO_DATE.test(input.effectiveFrom)) return { error: 'The date it applies from is YYYY-MM-DD' };
    out.effectiveFrom = input.effectiveFrom;
  }
  if (input.independence !== undefined) {
    const x = input.independence;
    if (!x || typeof x !== 'object' || Array.isArray(x)) return { error: 'Independence is recorded per dimension: { decisions, appointment, dismissal, funding, instructions }' };
    const ind: Partial<Record<IndependenceDimension, IndependenceRule>> = {};
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (!DIMENSIONS.includes(k as IndependenceDimension)) return { error: `Unknown dimension of independence: ${k} (${DIMENSIONS.join(', ')})` };
      if (v === null) continue;
      const r = v as { protected?: unknown; actor?: unknown; note?: unknown; basis?: unknown };
      if (!r || typeof r !== 'object' || typeof r.protected !== 'boolean') return { error: `Say for ${k} whether the law protects it (protected: true or false)` };
      const rule: IndependenceRule = { protected: r.protected };
      if (typeof r.actor === 'string' && r.actor.trim()) rule.actor = r.actor.trim().slice(0, 200);
      if (typeof r.note === 'string' && r.note.trim()) rule.note = r.note.trim().slice(0, 500);
      if (Array.isArray(r.basis) && r.basis.length) {
        const c = citeBasis(r.basis, today(now), `Independence of ${id}: ${k}`);
        if ('error' in c) return { error: `${k}: ${c.error}` };
        rule.basis = c;
      }
      ind[k as IndependenceDimension] = rule;
    }
    out.independence = ind;
  }
  if (input.prohibitions !== undefined) {
    if (!Array.isArray(input.prohibitions) || input.prohibitions.length > 30) return { error: 'Prohibitions are a list (up to 30) of { kind: direction | data-access | non-delegable, text }' };
    const list: InstitutionProhibition[] = [];
    for (const p of input.prohibitions) {
      const x = p as { kind?: unknown; text?: unknown } | null;
      if (!x || !PROHIBITION_KINDS.includes(x.kind as InstitutionProhibition['kind']) || typeof x.text !== 'string' || !x.text.trim()) return { error: 'Each prohibition needs kind (direction, data-access or non-delegable) and text' };
      list.push({ kind: x.kind as InstitutionProhibition['kind'], text: x.text.trim().slice(0, 300) });
    }
    out.prohibitions = list;
  }
  if (input.records !== undefined) {
    if (!Array.isArray(input.records) || input.records.length > 30 || input.records.some(r => typeof r !== 'string')) return { error: 'Records owned are a list (up to 30) of names' };
    out.records = [...new Set((input.records as string[]).map(r => r.trim().slice(0, 120)).filter(Boolean))];
  }
  if (input.change !== undefined && input.change !== null) {
    const c = input.change as { kind?: unknown; name?: unknown; into?: unknown };
    let change: InstitutionStructuralChange;
    if (c?.kind === 'rename' && typeof c.name === 'string' && c.name.trim()) change = { kind: 'rename', name: c.name.trim().slice(0, 200) };
    else if (c?.kind === 'deactivate') change = { kind: 'deactivate' };
    else if (c?.kind === 'merge' && typeof c.into === 'string' && c.into) {
      if (c.into === id) return { error: 'An institution cannot be merged into itself' };
      const into = getMinistry(c.into);
      if (!into || into.status !== 'active') return { error: 'Merge into an active institution' };
      if (isIndependentInstitution(into.id, now)) return { error: `${into.name} is independent: another institution is not merged into it here (its own terms change through its own process)` };
      change = { kind: 'merge', into: c.into };
    } else return { error: 'A change is { kind: rename, name } | { kind: deactivate } | { kind: merge, into }' };
    out.change = change;
  }
  return out;
}

const describe = (m: Ministry) => (v: InstitutionTerms) => {
  const dims = DIMENSIONS.filter(d => v.independence[d]?.protected);
  const change = v.change ? ` · ${v.change.kind === 'rename' ? `rename to ${v.change.name}` : v.change.kind === 'merge' ? `merge into ${v.change.into}` : 'deactivate'}` : '';
  return `${m.name}: ${standingLabel(v.standing)}${v.branch ? ` (${v.branch})` : ''} from ${v.effectiveFrom}${dims.length ? ` · protected: ${dims.join(', ')}` : ''}${change}`;
};

/** Whether setup is still running (first-run): the commissioning step records terms directly. */
export const setupRunning = () => getSetup() === null;

/**
 * During first-run setup only: an administrator records an institution's
 * terms directly, as the nation commissions the installation (the legal
 * basis optional, since the laws register may still be empty). Audited.
 * After setup, refused: use proposeInstitutionTerms().
 */
export function recordTermsDuringSetup(id: string, input: TermsInput & { legalBasis?: unknown }, by: string, now = new Date()): Ministry | { error: string } {
  if (!setupRunning()) return { error: 'Setup is complete: an institution\'s standing now changes only through the change process (propose, citing the law; a different official confirms)' };
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  const p = parseTerms(id, input, now);
  if ('error' in p) return p;
  if (p.change) return { error: 'Rename, deactivate or merge an institution with the registry\'s own actions during setup' };
  let basis: Citation[] | undefined;
  if (Array.isArray(input.legalBasis) && input.legalBasis.length) {
    const c = citeBasis(input.legalBasis, today(now), `Establishment of ${m.name}`);
    if ('error' in c) return c;
    basis = c;
  }
  const v = { ...recorded(m), ...p };
  Object.assign(m, { standing: v.standing, effectiveFrom: v.effectiveFrom, independence: v.independence, prohibitions: v.prohibitions, records: v.records },
    v.branch ? { branch: v.branch } : {}, basis ? { basis } : {});
  recordAudit(by, `${AUDIT}.setup`, `Ministry:${id}`, 'ok', `${describe(m)(v)} · recorded during first-run setup`);
  return m;
}

/** One administrator proposes new terms for an institution, citing the laws register; values left out keep their current setting. */
export function proposeInstitutionTerms(id: string, input: TermsInput & { legalBasis?: unknown }, actor: { by: string; byId?: string }, now = new Date()) {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  if (m.status === 'merged') return { error: 'This institution was merged into another' };
  const p = parseTerms(id, input, now);
  if ('error' in p) return p;
  const current = termsOf(m, now);
  const { basis: _b, ...values } = current;
  const change: Partial<InstitutionTerms> = { effectiveFrom: today(now), ...p };
  return proposePolicy(m.terms ??= {}, values, change, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: AUDIT,
    context: `Constitutional standing of ${m.name}`, describe: describe(m),
    check: v => (v.change && v.effectiveFrom > today(now) ? 'A rename, merge or deactivation takes effect when confirmed: leave its date as today' : null),
  });
}

/** Who must confirm: an official of the institution itself when it is (or would become) independent and has officials who can sign. */
export function confirmerRequired(id: string, now = new Date()): string | null {
  const m = getMinistry(id);
  if (!m) return null;
  const pending = m.terms?.pending;
  const independentNow = isIndependentInstitution(id, now);
  return independentNow || (pending && independentTerms(pending.values)) ? id : null;
}

/**
 * A different official confirms the waiting change; it is adopted (in force
 * from its date). `actor` is the signed-in official: an administrator or an
 * official who can sign; for an independent institution with its own
 * officials who can sign (`ownSigners`), one of them.
 */
export function confirmInstitutionTerms(id: string, actor: { by: string; byId?: string; role?: string; institution?: string }, opts: { ownSigners: boolean }, now = new Date()) {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  if (actor.role && actor.role !== 'administrator' && actor.role !== 'signatory') return { error: 'An administrator or an official who can sign confirms a change to an institution\'s standing' };
  if (opts.ownSigners && confirmerRequired(id, now) && actor.institution !== id) {
    return { error: `${m.name} is independent: an official who can sign there confirms changes to its standing, not the government` };
  }
  return confirmPolicy(m.terms ??= {}, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: AUDIT, describe: describe(m),
    adopt: (v: PolicyVersion<InstitutionTerms>) => {
      const { change, ...rest } = v.values;
      if (rest.effectiveFrom <= today(now)) {
        Object.assign(m, { standing: rest.standing, effectiveFrom: rest.effectiveFrom, independence: rest.independence, prohibitions: rest.prohibitions, records: rest.records, basis: v.basis });
        if (rest.branch) m.branch = rest.branch; else delete m.branch;
      }
      if (change?.kind === 'rename') renameMinistry(id, change.name, actor.by);
      if (change?.kind === 'deactivate') deactivateMinistry(id, actor.by);
      if (change?.kind === 'merge') mergeMinistry(id, change.into, actor.by);
    },
  });
}

export const withdrawInstitutionTerms = (id: string, by: string, reason?: string) => {
  const m = getMinistry(id);
  if (!m) return { error: 'No such institution' };
  return withdrawPolicy(m.terms ??= {}, { by, ...(reason ? { reason } : {}), audit: AUDIT });
};

/** Lapse waiting changes whose time has passed (read-time and the daily job). */
export function lapseInstitutionTerms(now = new Date()): void {
  for (const m of db.ministries) if (m.terms?.pending) lapsePolicy(m.terms, now, AUDIT);
}

/** Every institution with a change waiting for its second official. */
export const waitingInstitutionTerms = () => db.ministries.filter(m => m.terms?.pending).map(m => ({ id: m.id, name: m.name, pending: structuredClone(m.terms!.pending!) }));

/**
 * Renaming, deactivating or merging through the registry's own actions
 * (/api/org/ministries/{id}/rename|deactivate|merge): refused once setup is
 * complete when the institution (or the one it would merge into) is
 * independent; those changes go through the change process instead.
 */
export function structuralRefusal(id: string, into?: string, now = new Date()): string | null {
  if (setupRunning()) return null;
  const hit = [id, into].filter((x): x is string => !!x).find(x => isIndependentInstitution(x, now));
  if (!hit) return null;
  const name = getMinistry(hit)?.name ?? hit;
  return `${name} is independent: renaming, merging or deactivating it goes through the change process (propose it under its standing, citing the law; ${name} confirms)`;
}
