// The form registry's publication gates (owner's direction of 21 October
// 2026, docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md §3; the
// supplement's ten production activation gates and its Part 22 lifecycle,
// docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md).
//
// Two kinds of gate, kept apart here, in the API and on screen:
//
//   automatic  what the platform verifies itself, recomputed on every read
//              from the records that hold the facts (the package and its
//              tests, the laws register, who is responsible, the permit
//              authority registry, the scope lists, translations)
//   human      approvals only an authorised person gives: an act by a
//              signed-in official who can sign at the institution
//              responsible, a different person from whoever drafted or
//              changed the form (dualControlRefusal(), persons not
//              accounts), written to the audit chain and bound to the
//              contract as it stood (its SHA-256): any later change voids it
//
// A form's register status (catalogued … production) is derived from these;
// there is no status field to set. A status or approval written into a form
// or a package (form.status, a legal basis "approved", a package "state")
// is ignored. A self-service form in a production installation takes
// submissions only once its status is production (engine submitForm()).

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { authorityFor } from '@/lib/data/store/sovereign';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { caseActRefusal, type CaseScope } from '@/lib/auth/roles';
import { samplesAllowed } from '@/lib/ops/mode';
import { cite, type Citation } from '@/lib/law/register';
import { classifyDecision } from '@/lib/permits/decisions';
import { mappingInForce } from '@/lib/permits/authority';
import { isAuthorityKey, provisionalOwner, type OwnerResolution } from '@/lib/nation/deployment';
import { withDefaults } from '@/lib/data/defaults';
import { nationLanguages } from '@/lib/nation/registry';
import { checkPackage, getPackage, runPackageTests, unsetDays } from '@/lib/casework/packages';
import type { Case, CasePackage } from '@/lib/casework/types';
import { registerIntakeGuard } from '@/lib/casework/engine';
import { DATA_CLASSES, fieldClass, translationStatus, type ContractDocument, type ContractField, type FormSpec } from './contract';
import { RULE_REGISTRY } from './rules';
import { formScope, type ScopeFinding } from './scope';
import { formIdentity, identityOfForm } from './identity';
import { LINK_LABEL, packageLink, procedureLink, type LinkSubject, type ProcedureLinkView } from './procedure-link';

/** The register statuses of the owner's direction (§2). */
export type FormStatus = 'catalogued' | 'contract_missing' | 'contract_draft' | 'under_review' | 'blocked' | 'excluded' | 'approved' | 'production';
export const STATUS_LABEL: Record<FormStatus, string> = {
  catalogued: 'Catalogued', contract_missing: 'Contract missing', contract_draft: 'Contract draft', under_review: 'Under review',
  blocked: 'Blocked', excluded: 'Excluded by scope', approved: 'Approved', production: 'In production',
};

/** The approvals only a person gives. */
export type ApprovalKind = 'legal-review' | 'authority' | 'privacy' | 'scope-review' | 'release-proposal' | 'release-approval';
export const APPROVAL_LABEL: Record<ApprovalKind, string> = {
  'legal-review': 'Legal basis reviewed (the law versions cited)',
  authority: 'Competent authority confirmed',
  privacy: 'Data and privacy review',
  'scope-review': 'Legal review of the scope (forms the scope holds for review)',
  'release-proposal': 'Release proposed, with its rollback plan',
  'release-approval': 'Release approved by a second official',
};

export interface PublicationAct {
  key: string; version: number;
  /**
   * The identity of the form the act was given on (lib/forms/identity.ts:
   * catalogue + form ID + version, or PROCEDURE:key@version for a
   * procedure's own form). An act counts only for that identity and the
   * contract hash below; acts recorded before identities were kept take the
   * identity of the version they were given on (db()).
   */
  form: string;
  kind: ApprovalKind; outcome: 'approved' | 'returned';
  by: string; byId: string; institution?: string; role?: string; at: string;
  /** The contract the act was given on (its SHA-256): a later change voids it. */
  digest: string;
  note: string;
  /** Scope review: the law it rests on, as cited from the laws register. */
  citation?: Citation;
  /** Legal review: the citations as they stood. */
  citations?: { instrument: string; eId: string; version: string }[];
  /** Authority: the institution confirmed. */
  authority?: string;
  /** Release proposal. */
  rollbackPlan?: string; releaseNotes?: string; environment?: string;
  /** The audit chain entry that records it. */
  audit?: { seq: number; hash: string };
}

interface Db { acts: PublicationAct[] }
const g = globalThis as unknown as { __civicosFormPublication?: Db };
/** The identity a procedure version's form is approved and published under. */
export function publicationIdentity(p: Pick<CasePackage, 'key' | 'version' | 'form'>): string {
  const id = identityOfForm(p.form);
  return id ? formIdentity(id) : formIdentity({ catalogue: 'PROCEDURE', formId: p.key, version: String(p.version) });
}
const db = (): Db => {
  const d = touch('__civicosFormPublication', g.__civicosFormPublication = withDefaults(g.__civicosFormPublication as unknown as Record<string, unknown>, { acts: [] }) as unknown as Db);
  // Acts saved before identities were kept: the identity of the version they were given on (their contract hash still binds them).
  for (const a of d.acts) if (!a.form) { const p = getPackage(a.key, a.version); a.form = p ? publicationIdentity(p) : formIdentity({ catalogue: 'PROCEDURE', formId: a.key, version: String(a.version) }); }
  return d;
};
export function resetPublication(): void { g.__civicosFormPublication = undefined; }

export interface Gate { id: string; label: string; kind: 'automatic' | 'human'; passed: boolean; applies: boolean; detail: string[]; act?: Pick<PublicationAct, 'by' | 'at' | 'outcome' | 'note'>; notes?: string[] }
export interface Publication {
  key: string; version: number; title: string; status: FormStatus; scope: ScopeFinding;
  /** The form's identity: what approvals are recorded under. */
  identity: string;
  /** The link to the procedure that carries it (missing, draft, under review, approved), computed from the package register. */
  procedure: Pick<ProcedureLinkView, 'state' | 'required' | 'detail' | 'carriedBy' | 'exchange'>;
  /** Who owns it: the institution named for its slot, or a provisional stand-in (never proof of legal competence). */
  owner: OwnerResolution | { institution?: string };
  automatic: Gate[]; human: Gate[];
  /** What stops the next status, in plain words. */
  blockers: string[];
  pendingRelease?: Pick<PublicationAct, 'by' | 'at' | 'rollbackPlan' | 'releaseNotes' | 'environment'>;
  /** Not production: a demonstration or training installation takes submissions anyway, with this shown. */
  warning?: string;
}

/** The contract as it stands, hashed: what a human approval is bound to. */
export function contractDigest(p: Pick<CasePackage, 'key' | 'version' | 'title' | 'fields' | 'documents' | 'form' | 'citations' | 'actions' | 'deadlines' | 'appeal' | 'retention' | 'sensitivity' | 'owner'>): string {
  const { status: _s, envelope: _e, ...form } = (p.form ?? {}) as NonNullable<CasePackage['form']>;
  void _s; void _e;
  const body = JSON.stringify([p.key, p.version, p.title, p.owner, p.fields, p.documents, form, p.citations, p.actions, p.deadlines, p.appeal ?? null, p.retention, p.sensitivity]);
  return createHash('sha256').update(body).digest('hex');
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);
/** Procedures whose decisions are classified from the case (its register or profession, lib/permits/decisions.ts): checked when decided. */
const CASE_CLASSIFIED = ['prof.', 'org.', 'edu.school', 'health.facility', 'health.pharmacy'];
const flat = (fields: ContractField[]): ContractField[] => fields.flatMap(f => [f, ...(f.items ? flat(f.items as ContractField[]) : [])]);
const CLASS_KEYS = DATA_CLASSES.map(c => c.key);

/** The procedure's scope finding: its key, its specification and catalogue ids, its fields. */
export function packageScope(p: Pick<CasePackage, 'key' | 'fields' | 'form'>): ScopeFinding {
  return formScope(p.key, p.form, p.fields);
}

/** Who owns a procedure or library form: the slot's institution, else a provisional stand-in (lib/nation/deployment.ts). */
export function ownerOf(owner: string): OwnerResolution | { institution?: string } {
  // An internal-administration library draft (owner `institution`) names no institution: each one adopts it as its own procedure.
  if (owner === 'institution') return {};
  return isAuthorityKey(owner) ? provisionalOwner(owner, authorityFor) : { institution: owner };
}

/** The gate a required procedure that is missing cannot pass (owner's direction 2026-10-21, health integration §2). */
function linkGate(link: ProcedureLinkView): Gate {
  const label = `A procedure carries the form (procedure: ${LINK_LABEL[link.state]})`;
  const detail: string[] = [];
  if (link.required && link.state === 'missing') detail.push(`procedure: missing. ${link.detail}: the form cannot go live without it`);
  if (!link.required && link.exchange && !link.exchange.exists) detail.push(`${link.detail}: the form cannot go live until it exists and two officials approve it`);
  return { id: 'procedure-link', label, kind: 'automatic', applies: true, passed: detail.length === 0, detail, notes: [link.detail] };
}

/** The automatic gates: everything the platform verifies itself. */
function automaticGates(p: CasePackage, now: Date, effects?: string[], link: ProcedureLinkView = packageLink(p)): Gate[] {
  const on = today(now);
  const gate = (id: string, label: string, detail: string[], applies = true): Gate => ({ id, label, kind: 'automatic', applies, passed: !applies || detail.length === 0, detail });

  // 1. Schema complete, validation tests passing.
  const schema: string[] = [];
  if (!p.fields.length) schema.push('The form has no fields');
  const structure = checkPackage(p, effects ?? p.actions.flatMap(a => a.effects ?? []));
  if (structure) schema.push(structure);
  if (!p.tests.length) schema.push('The procedure has no tests of its own');
  else { const t = runPackageTests(p); if (!t.ok) schema.push(...t.failures); }

  // 2. Legal basis: every law it cites, and every document's citation, resolves to the confirmed version in force today.
  const legal: string[] = [];
  if (!p.citations.length) legal.push('It cites no law');
  for (const c of [...p.citations, ...p.documents.flatMap(d => (d.citation ? [d.citation] : []))]) {
    const r = cite(c.instrument, c.eId, on);
    if ('error' in r) legal.push(`${c.instrument} ${c.eId}: ${r.error}`);
    else if (c.version && r.version !== c.version) legal.push(`${c.instrument} ${c.eId}: cites version ${c.version}; the version in force is ${r.version}`);
  }

  // 3. Competent authority: who is responsible names the institution, and each decision rests on an approved mapping or the deployment profile.
  const authority: string[] = [];
  const resolved = ownerOf(p.owner);
  const owner = resolved.institution;
  const authorityNotes: string[] = [];
  const provisional = 'provisional' in resolved ? resolved.provisional : undefined;
  if (!owner) authority.push(p.owner === 'institution' ? 'An internal-administration form: each institution adopts it in its own procedure (adm.<template>.<institution>), which names the institution' : provisional ? `Who is responsible does not name the institution for this procedure yet (${provisional})` : 'Who is responsible does not name the institution for this procedure yet');
  else if (provisional) {
    // A stand-in owner is recorded as provisional: never proof of legal competence; production refuses it.
    if (samplesAllowed()) authorityNotes.push(`Owner ${provisional}`);
    else authority.push(`Owner ${provisional}: production takes only the institution the nation names as competent`);
  }
  // A case of this procedure with no answers yet: decisions whose authority depends on the case (a register, a profession) are classified when decided.
  const stub = { id: 'publication-check', fields: {}, procedure: p.key, package: { key: p.key, version: p.version }, history: [], links: [] } as unknown as Case;
  for (const a of p.actions.filter(x => x.decision)) {
    let c: ReturnType<typeof classifyDecision>;
    try { c = classifyDecision(stub, a, p); } catch { c = null; }
    if (!c) { if (!CASE_CLASSIFIED.some(x => p.key.startsWith(x))) authority.push(`${a.label}: the platform cannot say which authority this decision rests on`); continue; }
    if (c.kind === 'mapping' && !mappingInForce(c.permitType, on)) authority.push(`${a.label}: no approved mapping of ${c.permitType} is in force`);
    if (c.kind === 'deployment' && isAuthorityKey(c.authority) && !authorityFor(c.authority)) authority.push(`${a.label}: who is responsible does not name ${c.authority}`);
  }

  // 4. Institution-scoped permissions and a privacy class on every field.
  const privacy: string[] = [];
  if (!owner) privacy.push('Permissions are scoped to the institution responsible, which is not named yet');
  for (const f of flat(p.fields)) if (!CLASS_KEYS.includes(fieldClass(f))) privacy.push(`${f.label}: no personal-data class`);
  if (!p.sensitivity) privacy.push('The procedure states no sensitivity');

  // 5. Evidence, retention, audit.
  const evidence: string[] = [];
  if (!p.retention?.trim()) evidence.push('No retention rule');
  for (const d of p.documents) if (!d.citation && !d.purpose) evidence.push(`${d.label}: evidence without a legal or procedural basis (cite the law or state the purpose)`);
  const audit = p.form?.envelope?.audit;
  if (audit && Object.values(audit).some(v => v === false)) evidence.push('The form turns part of the audit off; every case event is audited');

  // 6. Accessibility and localisation.
  const access: string[] = [];
  for (const f of flat(p.fields)) {
    if (!f.label?.trim()) access.push(`${f.key}: no label`);
    else if (f.label.length > 160) access.push(`${f.label.slice(0, 40)}…: a label longer than 160 characters; move the detail to a hint`);
    for (const o of f.options ?? []) if (!String(o).trim()) access.push(`${f.label}: an option without a label`);
  }
  for (const l of nationLanguages().filter(x => x !== 'en')) {
    const t = translationStatus(p.fields, p.documents, p.form, l);
    if (t.missing.length || t.stale.length) access.push(`${l}: ${t.missing.length} strings not translated, ${t.stale.length} out of date (translations go through review)`);
  }

  // 7. Scope restrictions.
  const scope = packageScope(p);
  const scopeDetail = scope.status === 'excluded' ? [scope.reason!] : [];

  // 8. The nation's values: day counts set, no demonstration values in production, every rule able to run.
  const values: string[] = [];
  const unset = unsetDays(p);
  if (unset.length) values.push(`Days the law gives are not set: ${unset.join(', ')}`);
  if (p.sampleDeadlines && !samplesAllowed()) values.push('It carries sample day counts from a demonstration');
  const binding = [...new Set(flat(p.fields).flatMap(f => (f.rules ?? []).flatMap(r => (r.rule === 'registered' && RULE_REGISTRY[r.name]?.scope === 'binding' ? [`${f.label}: ${RULE_REGISTRY[r.name]!.label} needs ${RULE_REGISTRY[r.name]!.needs}`] : []))))];
  values.push(...binding);

  const authorityGate = gate('authority', 'The competent authority resolves (who is responsible, permit mappings)', authority);
  if (authorityNotes.length) authorityGate.notes = authorityNotes;
  return [
    gate('schema', 'Schema complete and its validation tests pass', schema),
    linkGate(link),
    gate('legal-basis', 'Every law cited resolves to the confirmed version in force', legal),
    authorityGate,
    gate('privacy', 'Institution-scoped permissions and a personal-data class on every field', privacy),
    gate('evidence', 'Evidence has a basis, a retention rule is set, every event is audited', evidence),
    gate('accessibility', 'Labels, options and translations complete (accessibility and localisation)', access),
    gate('scope', 'Inside the approved scope', scopeDetail),
    gate('values', 'The nation\'s day counts set and every check able to run', values),
  ];
}

/** The latest act of a kind on a version, under the form identity it carries (an act given on another identity never counts). */
const latest = (key: string, version: number, kind: ApprovalKind, form: string) => [...db().acts].reverse().find(a => a.key === key && a.version === version && a.kind === kind && a.form === form);

/** Whether an act still holds: approved, on the contract as it stands, by someone other than whoever wrote or changed it. */
function holds(a: PublicationAct | undefined, p: CasePackage, digest: string): boolean {
  if (!a || a.outcome !== 'approved' || a.digest !== digest) return false;
  if (!p.reference && dualControlRefusal({ by: p.author, byId: p.authorId }, { by: a.by, byId: a.byId })) return false;
  return !(p.editors ?? []).some(e => dualControlRefusal({ by: e.by, byId: e.byId }, { by: a.by, byId: a.byId }));
}

/** The human gates, read from the recorded acts. */
function humanGates(p: CasePackage, digest: string, scope: ScopeFinding, form: string): Gate[] {
  const g1 = (kind: ApprovalKind, applies = true, extra: string[] = []): Gate => {
    const a = latest(p.key, p.version, kind, form);
    const ok = holds(a, p, digest);
    const detail = !applies ? [] : ok ? extra : [a && a.digest !== digest ? 'Given on an earlier text of the form: it changed since, so it is needed again' : a?.outcome === 'returned' ? `Returned by ${a.by}: ${a.note}` : 'Waiting for an authorised official', ...extra];
    return { id: kind, label: APPROVAL_LABEL[kind], kind: 'human', applies, passed: !applies || (ok && extra.length === 0), detail, ...(a ? { act: { by: a.by, at: a.at, outcome: a.outcome, note: a.note } } : {}) };
  };
  const procedure: Gate = {
    id: 'procedure-approval', label: 'Procedure approved by a second official', kind: 'human', applies: true,
    passed: p.state === 'approved' || p.state === 'superseded',
    detail: p.state === 'draft' ? ['The procedure is a draft: a different official who can sign approves it'] : p.state === 'superseded' ? ['A later version replaces it'] : [],
    ...(p.approvedBy ? { act: { by: p.approvedBy, at: p.approvedAt ?? '', outcome: 'approved' as const, note: `Written by ${p.author}` } } : {}),
  };
  const proposal = latest(p.key, p.version, 'release-proposal', form);
  const approval = latest(p.key, p.version, 'release-approval', form);
  const release = g1('release-approval', true, approval && proposal && approval.at < proposal.at ? ['A newer proposal waits for approval'] : []);
  return [procedure, g1('legal-review'), g1('authority'), g1('privacy'), g1('scope-review', scope.status === 'legal_review'), release];
}

/** The publication of one procedure version: its gates, apart by kind, and the status they give. */
export function publicationOf(p: CasePackage, now = new Date(), effects?: string[], link: ProcedureLinkView = packageLink(p)): Publication {
  const digest = contractDigest(p);
  const scope = packageScope(p);
  const identity = publicationIdentity(p);
  const automatic = automaticGates(p, now, effects, link);
  const human = humanGates(p, digest, scope, identity);
  const failA = automatic.filter(x => x.applies && !x.passed), failH = human.filter(x => x.applies && !x.passed);
  const release = human.find(x => x.id === 'release-approval')!;
  const others = failH.filter(x => x.id !== 'release-approval');
  const status: FormStatus = scope.status === 'excluded' ? 'excluded'
    : !p.fields.length ? 'contract_missing'
    : p.state === 'draft' || automatic.find(x => x.id === 'schema')!.passed === false ? 'contract_draft'
    : failA.length ? 'blocked'
    : others.length ? 'under_review'
    : release.passed ? 'production' : 'approved';
  const blockers = [...failA, ...failH].flatMap(x => x.detail.map(d => `${x.label}: ${d}`));
  const proposal = latest(p.key, p.version, 'release-proposal', identity);
  const approved = latest(p.key, p.version, 'release-approval', identity);
  const open = proposal && proposal.outcome === 'approved' && proposal.digest === digest && !(approved && approved.at >= proposal.at);
  return {
    key: p.key, version: p.version, title: p.title, status, scope, identity, automatic, human, blockers,
    procedure: { state: link.state, required: link.required, detail: link.detail, ...(link.carriedBy ? { carriedBy: link.carriedBy } : {}), ...(link.exchange ? { exchange: link.exchange } : {}) },
    owner: ownerOf(p.owner),
    ...(open ? { pendingRelease: { by: proposal.by, at: proposal.at, ...(proposal.rollbackPlan ? { rollbackPlan: proposal.rollbackPlan } : {}), ...(proposal.releaseNotes ? { releaseNotes: proposal.releaseNotes } : {}), ...(proposal.environment ? { environment: proposal.environment } : {}) } } : {}),
    ...(status !== 'production' && samplesAllowed() ? { warning: 'Not released for production: a demonstration or training installation takes submissions anyway' } : {}),
  };
}

/**
 * A library form (a contract no procedure of this installation carries yet)
 * as the draft procedure it would be: no stages, no tests, no law cited, no
 * approval. Its gates are read from the same records as any procedure's, so
 * it is a contract draft until a procedure carrying it is drafted, tested and
 * approved and every gate passes. Never stored; nothing in the form is read
 * as a status.
 */
export function libraryPackage(lib: { key: string; title: string; owner: string; fields: ContractField[]; documents: ContractDocument[]; form?: FormSpec }): CasePackage {
  return {
    key: lib.key, version: 1, owner: lib.owner, title: lib.title, refPrefix: 'LIB', citations: [],
    fields: structuredClone(lib.fields) as CasePackage['fields'], documents: structuredClone(lib.documents), ...(lib.form ? { form: structuredClone(lib.form) } : {}),
    stages: [], actions: [], deadlines: [], notifications: [], retention: '', sensitivity: 'restricted',
    state: 'draft', author: 'CivicOS form library', createdAt: '2026-10-21T00:00:00.000Z', reference: true, tests: [],
  };
}

/** What the procedure link reads of a library form of any source (a catalogue contract, a specification or field series form). */
export function linkSubject(lib: object): LinkSubject {
  const x = lib as { identity?: unknown; procedure?: unknown; attachesTo?: unknown; exchange?: unknown; deviations?: unknown };
  const proc = x.procedure && typeof x.procedure === 'object' && typeof (x.procedure as { key?: unknown }).key === 'string' ? { key: (x.procedure as { key: string }).key }
    : typeof x.attachesTo === 'string' ? { key: x.attachesTo, carried: true } : null;
  return {
    ...(typeof x.identity === 'string' ? { identity: x.identity } : {}), procedure: proc,
    ...(typeof x.exchange === 'string' ? { exchange: x.exchange } : {}),
    deviations: Array.isArray(x.deviations) ? (x.deviations as { id?: unknown }[]).map(d => (typeof d?.id === 'string' ? { id: d.id } : {})) : [],
  };
}

/**
 * The publication of a library form: its gates as they stand, the first
 * saying what it waits for. Its procedure link is computed from the package
 * register (lib/forms/procedure-link.ts); `services` are the exchange
 * services that exist, for a form an exchange service answers.
 */
export function libraryPublication(lib: Parameters<typeof libraryPackage>[0] & { identity?: string }, waitsFor: string, now = new Date(), opts: { services?: string[]; link?: ProcedureLinkView } = {}): Publication {
  const link = opts.link ?? procedureLink(linkSubject(lib), { ...(opts.services ? { services: opts.services } : {}) });
  const pub = publicationOf(libraryPackage(lib), now, [], link);
  // A library form is published under its own identity, never the bare key.
  if (lib.identity) pub.identity = lib.identity;
  const schema = pub.automatic.find(x => x.id === 'schema')!;
  schema.detail = [`No procedure of this installation carries it yet: ${waitsFor}`, ...schema.detail.filter(d => !/procedure key|at least two stages|reference prefix/.test(d))];
  schema.passed = false;
  pub.blockers = [...pub.automatic, ...pub.human].filter(x => x.applies && !x.passed).flatMap(x => x.detail.map(d => `${x.label}: ${d}`));
  return pub;
}

/** Refusal for a public (self-service) submission: a production installation takes one only on a form in production. */
export function submissionRefusal(p: CasePackage, now = new Date()): string | null {
  if (samplesAllowed() || !p.form) return null;
  const pub = publicationOf(p, now);
  return pub.status === 'production' ? null : `This form is not released for public use (${STATUS_LABEL[pub.status]}): ${pub.blockers[0] ?? 'its release is not approved'}`;
}

// ── Human acts ───────────────────────────────────────────────────────────────

export interface Official { id?: string; name: string; scope: CaseScope | null }
export interface ActInput {
  kind: ApprovalKind; outcome?: 'approved' | 'returned'; note?: string;
  citation?: { instrument?: string; eId?: string };
  rollbackPlan?: string; releaseNotes?: string; environment?: string;
}

/**
 * Record an approval (or a return) as an act of a signed-in official. Only
 * the fields of ActInput are read: anything else in a request (a status, an
 * "approved" flag, who acted) is ignored.
 */
export function recordApproval(key: string, version: number, input: ActInput, who: Official, now = new Date()): Publication | { error: string } {
  const p = getPackage(key, version);
  if (!p) return { error: 'No such procedure version' };
  if (!(input.kind in APPROVAL_LABEL)) return { error: `Unknown approval ${String(input.kind)}` };
  if (!who.scope || !who.id) return { error: 'An approval is an act of a signed-in official: sign in first' };
  const resolved = ownerOf(p.owner);
  const owner = resolved.institution;
  if (!owner) return { error: 'Name the responsible institution under Who is responsible first' };
  const provisional = 'provisional' in resolved ? resolved.provisional : undefined;
  const refused = caseActRefusal(who.scope, { owner, sensitivity: 'normal', decision: true });
  if (refused) return { error: refused };
  const me = { by: who.name, byId: who.id };
  if (!p.reference) { const same = dualControlRefusal({ by: p.author, byId: p.authorId }, me); if (same) return { error: `${same} (they drafted this form)` }; }
  for (const e of p.editors ?? []) { const same = dualControlRefusal({ by: e.by, byId: e.byId }, me); if (same) return { error: `${same} (they changed this form: ${e.what})` }; }
  const scope = packageScope(p);
  if (scope.status === 'excluded') return { error: `Outside the approved scope: ${scope.reason}` };
  const outcome = input.outcome === 'returned' ? 'returned' : 'approved';
  const note = String(input.note ?? '').trim().slice(0, 2000);
  if (outcome === 'returned' && !note) return { error: 'Say why it is returned' };
  const pub = publicationOf(p, now);
  const autoGate = (id: string) => pub.automatic.find(x => x.id === id)!;
  const digest = contractDigest(p);
  const form = publicationIdentity(p);
  const act: PublicationAct = { key, version, form, kind: input.kind, outcome, by: who.name, byId: who.id, ...(who.scope.institution ? { institution: who.scope.institution } : {}), ...(who.scope.role ? { role: who.scope.role } : {}), at: now.toISOString(), digest, note };

  if (outcome === 'approved') switch (input.kind) {
    case 'legal-review':
      if (!autoGate('legal-basis').passed) return { error: `The law it cites does not resolve: ${autoGate('legal-basis').detail[0]}` };
      act.citations = p.citations.map(c => ({ instrument: c.instrument, eId: c.eId, version: c.version }));
      break;
    case 'authority':
      // A provisional owner is a stand-in, never proof of legal competence: nobody can confirm it as the competent authority.
      if (provisional) return { error: `The owner is ${provisional}. Name the institution under Who is responsible first` };
      if (!autoGate('authority').passed) return { error: `The authority does not resolve: ${autoGate('authority').detail[0]}` };
      act.authority = owner;
      break;
    case 'privacy':
      if (!note) return { error: 'Record what the data and privacy review found' };
      break;
    case 'scope-review': {
      if (scope.status !== 'legal_review') return { error: 'This form needs no scope review' };
      if (!note) return { error: 'Record what the legal review found' };
      const c = cite(String(input.citation?.instrument ?? ''), String(input.citation?.eId ?? ''), today(now));
      if ('error' in c) return { error: `Cite the law the review rests on from the laws register: ${c.error}` };
      act.citation = c;
      break;
    }
    case 'release-proposal': {
      if (p.state !== 'approved') return { error: 'Only an approved procedure version is released' };
      const rollback = String(input.rollbackPlan ?? '').trim();
      if (rollback.length < 20) return { error: 'Record the rollback plan: what happens to submissions and which version takes over if this one is withdrawn' };
      const others = [...pub.automatic, ...pub.human.filter(x => x.id !== 'release-approval')].filter(x => x.applies && !x.passed);
      if (others.length) return { error: `Every other gate passes first: ${others[0]!.label} — ${others[0]!.detail[0]}` };
      Object.assign(act, { rollbackPlan: rollback.slice(0, 4000), releaseNotes: String(input.releaseNotes ?? '').trim().slice(0, 4000), environment: input.environment === 'staging' ? 'staging' : 'production' });
      break;
    }
    case 'release-approval': {
      const prop = latest(key, version, 'release-proposal', form);
      if (!prop || prop.outcome !== 'approved' || prop.digest !== digest) return { error: 'No release proposal is waiting for this version' };
      const same = dualControlRefusal({ by: prop.by, byId: prop.byId }, me);
      if (same) return { error: `${same} (they proposed the release)` };
      const others = [...pub.automatic, ...pub.human.filter(x => x.id !== 'release-approval')].filter(x => x.applies && !x.passed);
      if (others.length) return { error: `Every other gate passes first: ${others[0]!.label} — ${others[0]!.detail[0]}` };
      break;
    }
  }
  const entry = recordAudit(who.name, `form.${input.kind}`, `Procedure:${key}@${version}`, outcome, `${APPROVAL_LABEL[input.kind]} · ${outcome} · contract ${digest.slice(0, 12)}${note ? ` · ${note.slice(0, 200)}` : ''}`) as unknown as { seq?: number; hash?: string };
  if (entry && typeof entry.seq === 'number' && typeof entry.hash === 'string') act.audit = { seq: entry.seq, hash: entry.hash };
  db().acts.push(act);
  return publicationOf(p, now);
}

/** The acts recorded on a version, newest first. */
export function approvalsOf(key: string, version: number): PublicationAct[] {
  return db().acts.filter(a => a.key === key && a.version === version).reverse().map(a => structuredClone(a));
}

// The engine asks this before any form submission (registered like the decision guard; lib/casework/modules.ts loads it).
registerIntakeGuard((pkg, now) => submissionRefusal(pkg, now));

/** Release proposals waiting for a second official (the setup hub's waiting list). */
export function waitingReleases(): { key: string; version: number; by: string; at: string }[] {
  const out: { key: string; version: number; by: string; at: string }[] = [];
  const seen = new Set<string>();
  for (const a of [...db().acts].reverse()) {
    const id = `${a.key}@${a.version}`;
    if (seen.has(id) || (a.kind !== 'release-proposal' && a.kind !== 'release-approval')) continue;
    seen.add(id);
    if (a.kind === 'release-proposal' && a.outcome === 'approved') out.push({ key: a.key, version: a.version, by: a.by, at: a.at });
  }
  return out;
}
