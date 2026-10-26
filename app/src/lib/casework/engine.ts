// The workflow engine (docs/GOVERNMENT_OPERATING_MODEL.md §6.4, directions
// §5): opens cases under the procedure version in force, and moves them only
// by the procedure's actions, each checked against the case rules
// (caseActRefusal() in lib/auth/roles.ts), the procedure's requirements
// (fields, documents, reasons, citations of the law in force that day),
// four-eyes (a second, different official confirms), a stale-version check
// and repeated-request protection (idempotency keys). A decision is sealed
// (lib/records/decisions.ts) with the exact laws it cites. Domain logic stays
// in the module that owns it: a procedure names effects (`civil.registerBirth`)
// that its module registers here. Every step is appended to the case's
// history and the audit chain; nothing is deleted. Events carry the case id,
// procedure and stage, never personal fields. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { authorityFor, getSovereign, getMinistry, institutionBounds } from '@/lib/data/store';
import { editionRefusal } from '@/lib/nation/edition';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { samplesAllowed } from '@/lib/ops/mode';
import { caseActRefusal, delegationCovering, roleOf, type CaseScope } from '@/lib/auth/roles';
import { calendarOf } from '@/lib/nation/deployment';
import { cite, type Citation } from '@/lib/law/register';
import { recordDecision, type SignedDecision } from '@/lib/records/decisions';
import { getDocument } from '@/lib/records/documents';
import { activePackage, getPackage, ownerInstitution } from './packages';
import { addDays, lapsed } from './calendar';
import type { Case, CasePackage, ActionSpec, Party, Step, Channel, Intake } from './types';
import { serverCheck, serviceCheck, needsServiceCheck, recordsChecks } from '@/lib/forms/server';
import { isPersonalField, shown, type FieldError } from '@/lib/forms/contract';
import { queueMirror } from '@/lib/db/mirror';
import { recusedOn } from '@/lib/transitions/state';

interface CaseDb { cases: Case[]; seq: number }
const g = globalThis as unknown as { __civicosCases?: CaseDb };
const db = (): CaseDb => { const d = touch('__civicosCases', g.__civicosCases ??= { cases: [], seq: 0 }); d.seq ??= 0; return d; };
export function resetCases(): void { g.__civicosCases = undefined; }

/** Every case of one institution, as kept (no limit), for an institution's portable export (lib/portability/export.ts). Read only. */
export const casesOf = (owner: string): Case[] => db().cases.filter(c => c.owner === owner).map(c => structuredClone(c));
/**
 * Put back an institution's cases keeping their ids, references and history
 * (lib/portability/import.ts only: the confirmed import of an institution's own export (two officials) into an installation that holds none of these records). No step is added and nothing is decided: the cases stand as
 * they stood in the export, and work continues through act().
 */
export function restoreCases(list: Case[]): { restored: number } | { error: string } {
  const d = db();
  const clash = list.find(c => d.cases.some(x => x.id === c.id || x.ref === c.ref));
  if (clash) return { error: `Case ${clash.ref} is already in this installation` };
  d.cases.push(...list.map(c => structuredClone(c)));
  d.seq = Math.max(d.seq, ...list.map(c => Number(/-(\d+)$/.exec(c.ref)?.[1] ?? 0)));
  return { restored: list.length };
}

/** Who is acting: the verified official (scope) or, without sign-in enforced, a declared name (no scope). */
export interface Actor { id?: string; name: string; scope: (CaseScope & { id?: string }) | null; institution?: string }

// ── Effects: domain logic the owning module registers ────────────────────────
export interface EffectContext { case: Case; package: CasePackage; action: ActionSpec; actor: Actor; now: Date }
/** What an effect returns: facts the decision fixes, and work to do once the decision is sealed. */
export interface EffectResult {
  facts?: Record<string, string | number | boolean>;
  /** The operational rule versions the effect calculated with (lib/law/rules.ts), kept on the sealed decision. */
  rules?: RuleRef[];
  after?: (decision: SignedDecision | undefined, c: Case) => Promise<void> | void;
  error?: string;
}
/** A rule version a decision calculated with. */
export interface RuleRef { key: string; version: number; digest: string }
/** Where the authority for a decision came from, as checked when it was made (kept on the sealed decision). */
export type DecisionAuthority =
  | { basis: 'mapping'; permitType: string; power: string; version: number; lead: string; approvedAt?: string }
  | { basis: 'deployment'; authority: string }
  | { basis: 'unmapped'; permitType?: string; note: string };
/**
 * A check every decision step passes, when proposed and again when it is made
 * (lib/permits/decisions.ts registers the platform's): an error refuses it;
 * otherwise it says where the authority came from.
 */
export type DecisionGuard = (c: Case, a: ActionSpec, pkg: CasePackage, now: Date, citations?: Citation[]) => { error: string } | { authority?: DecisionAuthority };
const gg = globalThis as unknown as { __caseDecisionGuards?: Map<string, DecisionGuard> };
/** The dual-control rules (lib/casework/dual-control-policy.ts registers them): who needs two officials, how long a proposal waits. */
export interface DualControlRules { twoOfficials: (c: Case, a: ActionSpec, pkg: CasePackage) => boolean; pendingHours: () => number; requireIdentityBinding: () => boolean }
const gd = globalThis as unknown as { __caseDualControl?: DualControlRules };
export function registerDualControlRules(r: DualControlRules): void { gd.__caseDualControl = r; }
/** Whether a procedure's form takes submissions (lib/forms/publication.ts registers it): a reason when not. */
export type IntakeGuard = (pkg: CasePackage, now: Date) => string | null;
const gp = globalThis as unknown as { __caseIntakeGuard?: IntakeGuard };
export function registerIntakeGuard(fn: IntakeGuard): void { gp.__caseIntakeGuard = fn; }
const twoOfficials = (c: Case, a: ActionSpec, pkg: CasePackage) => !!a.needs.fourEyes || !!gd.__caseDualControl?.twoOfficials(c, a, pkg);
const pendingHours = () => gd.__caseDualControl?.pendingHours() ?? 24;

/** A proposal past its waiting period lapses: kept on the case, no longer confirmable. Returns whether it did. */
function lapsePending(c: Case, now: Date): boolean {
  const p = c.pending;
  if (!p?.expiresAt || now.toISOString() <= p.expiresAt) return false;
  (c.lapsedProposals ??= []).push({ ...p, lapsedAt: now.toISOString() });
  delete c.pending;
  c.version += 1;
  recordAudit('System (dual control)', 'case.propose.lapse', `Case:${c.ref}`, 'ok', `${p.action} proposed by ${p.by.name} on ${p.at.slice(0, 10)} was not confirmed by ${p.expiresAt.slice(0, 16)}: propose again`);
  return true;
}

/** Lapse every proposal past its waiting period (the case-deadlines job). */
export function lapseProposals(now = new Date()): string[] {
  const out: string[] = [];
  for (const c of db().cases) if (lapsePending(c, now)) out.push(c.ref);
  return out;
}

export function registerDecisionGuard(name: string, fn: DecisionGuard): void { (gg.__caseDecisionGuards ??= new Map()).set(name, fn); }
/**
 * Called after a decision is sealed and its step recorded (plan I9: events
 * emitted from the decisions that cause them, lib/federation/emit.ts). A
 * listener never changes the case or the decision and never undoes it: its
 * errors are swallowed (it records its own outcome).
 */
export type DecisionListener = (decision: SignedDecision, c: Case, now: Date) => Promise<void> | void;
const gl = globalThis as unknown as { __caseDecisionListeners?: Map<string, DecisionListener> };
export function registerDecisionListener(name: string, fn: DecisionListener): void { (gl.__caseDecisionListeners ??= new Map()).set(name, fn); }
function guardDecision(c: Case, a: ActionSpec, pkg: CasePackage, now: Date, citations: Citation[]): { error: string } | { authority?: DecisionAuthority } {
  let authority: DecisionAuthority | undefined;
  for (const g of gg.__caseDecisionGuards?.values() ?? []) {
    const r = g(c, a, pkg, now, citations);
    if ('error' in r) return r;
    authority ??= r.authority;
  }
  return authority ? { authority } : {};
}
export type Effect = (ctx: EffectContext) => Promise<EffectResult | void> | EffectResult | void;
const ge = globalThis as unknown as { __caseEffects?: Map<string, Effect> };
const effectsMap = () => (ge.__caseEffects ??= new Map());
export function registerEffect(name: string, fn: Effect): void { effectsMap().set(name, fn); }
export const registeredEffects = (): string[] => [...effectsMap().keys()];
/**
 * The marker an effect puts on the register entry it writes from a sample case
 * (`{ sample: true }`, else nothing): entries made in a demo or training run
 * stay recognisable as samples wherever they are read or restored.
 */
export const sampleMark = (c: Pick<Case, 'source'>): { sample?: true } => (c.source === 'sample' ? { sample: true } : {});

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = (now: Date) => now.toISOString().slice(0, 10);
const clone = <T,>(x: T): T => structuredClone(x);
const by = (a: Actor) => ({ ...(a.id ? { id: a.id } : {}), name: a.name, ...(a.scope?.institution ?? a.institution ? { institution: a.scope?.institution ?? a.institution } : {}) });

/** A refusal, with the answers it concerns (a form shows each beside its field and in its error summary). */
export type Refusal = { error: string; fieldErrors?: FieldError[] };

/**
 * Check answers against the procedure's fields (lib/forms/contract.ts): the
 * same functions and messages the browser uses, with the approved lists,
 * register references and unique references resolved here. `submit` is an
 * applicant's form under a procedure with a form: what is required applies.
 */
function checkFields(pkg: CasePackage, input: Record<string, unknown> | undefined, opts: { submit?: boolean; existing?: Record<string, unknown>; locale?: string; on?: string; except?: string } = {}): { values: Record<string, unknown> } | Refusal {
  const r = serverCheck({
    pkg, input, mode: opts.submit ? 'submit' : 'partial', ...(opts.existing ? { existing: opts.existing } : {}), ...(opts.locale ? { locale: opts.locale } : {}), ...(opts.on ? { on: opts.on } : {}),
    pending: (ref, procedure) => db().cases.some(c => !c.closedAt && c.package.key === procedure && c.ref === ref),
    taken: (field, value) => db().cases.some(c => !c.closedAt && c.id !== opts.except && c.package.key === pkg.key && c.fields[field] === value),
  });
  if (r.errors.length) return { error: r.errors[0]!.message, fieldErrors: r.errors };
  // A conditional question not asked keeps no answer.
  if (opts.submit) for (const f of pkg.fields) if (!shown(f, { ...(opts.existing ?? {}), ...r.values }) && f.key in r.values) delete r.values[f.key];
  return { values: r.values };
}

/** Answers checked by serviceCheck() for one opening (never made by a caller: openCase() refuses positions and checked identifiers without it). */
const CHECKED = new WeakSet<object>();
interface Checked { values: Record<string, unknown>; verifications: Case['verifications'] }

function deadlinesFrom(pkg: CasePackage, stage: string, at: string): Case['deadlines'] {
  const cal = calendarOf(getSovereign().deployment);
  // An approved version has every day count set (approvePackage()); a deadline without one is never started.
  return pkg.deadlines.filter(d => d.from === stage && d.days !== undefined).map(d => ({ key: d.key, label: d.label, due: addDays(at, d.days!, d.calendar, cal), ...(d.citation ? { citation: d.citation } : {}), ...(pkg.sampleDeadlines ? { sample: true as const } : {}) }));
}

function resolveCitations(list: { instrument?: string; eId?: string }[] | undefined, on: string): Citation[] | { error: string } {
  const out: Citation[] = [];
  for (const l of list ?? []) {
    const c = cite(String(l.instrument ?? ''), String(l.eId ?? ''), on);
    if ('error' in c) return { error: `Legal basis: ${c.error}` };
    out.push(c);
  }
  return out;
}

/** The facility and jurisdiction a case names, through the fields its procedure marks (CasePackage.scopeFields; plan I2). */
const scopeOf = (pkg: Pick<CasePackage, 'scopeFields'> | undefined, fields: Record<string, unknown>) => {
  const f = pkg?.scopeFields?.facility, j = pkg?.scopeFields?.jurisdiction;
  const v = (k?: string) => (k && typeof fields[k] === 'string' && (fields[k] as string).trim() ? (fields[k] as string).trim() : undefined);
  return { ...(v(f) ? { facility: v(f) } : {}), ...(v(j) ? { jurisdiction: v(j) } : {}) };
};

/** The delegation of authority an actor takes this decision step under, when they cannot sign there themselves (plan I2). */
function delegationUsed(actor: Actor, c: Case, a: ActionSpec, now: Date): Step['delegation'] | undefined {
  if (!a.decision || !actor.scope || roleOf(actor.scope) === 'signatory' || !a.needs.delegable) return undefined;
  const g = delegationCovering(actor.scope, c.owner, c.package.key, a.key, a.needs.task, now.toISOString().slice(0, 10));
  return g ? { id: g.id, delegator: { ...g.delegator } } : undefined;
}

const facts = (c: Case, a?: ActionSpec, pkg?: Pick<CasePackage, 'scopeFields'>) => {
  // Courts (standing judiciary, or named for the judiciary or a constitutional court) are closed to every other
  // institution (directions 4.6); several may exist. Independent institutions (legislature, head of state,
  // independent bodies) to every other institution too, save the public audit office reading with a purpose.
  const b = institutionBounds();
  return {
    owner: c.owner, sensitivity: c.sensitivity, assigned: c.assignee ? [c.assignee.id] : [],
    // The procedure's key: a read relationship may cover one procedure's cases only (plan phase 3).
    ...(c.package?.key ? { recordType: c.package.key } : {}),
    judicial: b.judicial.includes(c.owner),
    independent: b.independent.includes(c.owner),
    // Officials who declared a conflict of interest on this case step aside from acting on it (plan phase 6, lib/transitions).
    recused: recusedOn([c.id, c.ref]),
    ...(a ? { decision: !!a.decision, stepUp: !!a.needs.stepUp, action: a.key, ...(a.needs.task ? { task: a.needs.task } : {}), ...(a.needs.delegable ? { delegable: true } : {}) } : {}),
    // Attribute scope (plan I2): the facility and jurisdiction the case names.
    ...scopeOf(pkg ?? (c.package ? getPackage(c.package.key, c.package.version) : undefined), c.fields ?? {}),
  };
};

function audit(actor: Actor, action: string, c: Case, detail: string) {
  recordAudit(actor.name, action, `Case:${c.ref}`, 'ok', `${c.package.key}@${c.package.version} · ${detail}`);
  // The substrate's copy of the case's progress (lib/db/mirror.ts), after the change.
  queueMirror('case', c.id);
}

// ── Opening ───────────────────────────────────────────────────────────────────
export interface OpenInput {
  procedure: string;
  fields?: Record<string, unknown>;
  subject?: Party[];
  applicant?: Party;
  onBehalfOf?: Party;
  delegation?: string;
  source?: Case['source'];
  priority?: Case['priority'];
  idempotencyKey?: string;
  /** Opened by another institution's official (a referral): the owner's rules are not applied to the opener. */
  referral?: { from: string };
  /**
   * An applicant's form (lib/forms/contract.ts): self-service (the applicant,
   * signed in), assisted (an official at an office, who records the identity
   * evidence seen) or paper (an official transcribing a paper form). What the
   * procedure's form requires then applies, and the case keeps the form,
   * declaration and evidence-policy versions it was submitted under.
   */
  channel?: Channel;
  /** The applicant confirmed the form's declaration of this version. */
  declaration?: { version: string };
  assisted?: { servicePoint?: string; identityEvidence: string };
  paper?: { receivedOn?: string };
  /** The language the applicant used. */
  locale?: string;
  /** Set by submitForm() only. */
  checked?: Checked;
}

export function openCase(input: OpenInput, actor: Actor, now = new Date()): Case | Refusal {
  const pkg = activePackage(input.procedure, today(now));
  if (!pkg) return { error: `No approved version of the procedure ${input.procedure} applies today` };
  const owner = ownerInstitution(pkg.owner, authorityFor);
  if (!owner) return { error: `No institution is named as responsible for ${pkg.title} (Configuration → Who is responsible)` };
  // An Institutional Edition runs only its own institutions' procedures (lib/nation/edition.ts).
  const outside = editionRefusal(owner);
  if (outside) return { error: outside };
  const source = input.source ?? 'entered';
  // Sample cases exist only in demo and training installations (lib/ops/mode.ts; step I0.1).
  if (source === 'sample' && !samplesAllowed()) return { error: 'A production installation opens no sample case' };
  if (actor.scope && source !== 'citizen' && !input.referral) {
    const why = caseActRefusal(actor.scope, { owner, sensitivity: pkg.sensitivity, assigned: [actor.scope.id ?? ''], ...scopeOf(pkg, input.fields ?? {}) }, now.getTime());
    if (why) return { error: why };
  }
  // A repeated request returns the case it opened: only after the check above, and only a case of the
  // same procedure and institution (keys are chosen by callers and are not unique across institutions).
  if (input.idempotencyKey) {
    const seen = db().cases.find(c => c.owner === owner && c.package.key === pkg.key && c.history[0]?.idempotencyKey === input.idempotencyKey);
    if (seen) return clone(seen);
  }
  // The applicant's channel and what it records (spec Part 1 §11).
  const intake = intakeOf(pkg, input, actor, now);
  if ('error' in intake) return intake;
  const submit = !!input.channel && !!pkg.form;
  const checked = checkFields(pkg, input.fields, { submit, ...(input.locale ? { locale: input.locale } : {}), on: today(now) });
  if ('error' in checked) return checked;
  let fields = checked.values;
  // Positions, checked identifiers and other answers that wait on another system come through submitForm().
  if (needsServiceCheck(pkg.fields, fields)) {
    if (!input.checked || !CHECKED.has(input.checked)) return { error: 'This form has answers the platform checks with other registers: send it through the form check (submitForm)' };
    fields = { ...fields, ...input.checked.values };
  }
  // A confidentiality request holds the case as restricted (never lowers it).
  const raised = pkg.fields.some(f => f.raisesSensitivity && fields[f.key] === true);
  const d = db();
  d.seq += 1;
  const at = now.toISOString();
  const stage = pkg.stages[0]!.key;
  const c: Case = {
    id: uuid7(), ref: `${pkg.refPrefix}-${now.getUTCFullYear()}-${String(d.seq).padStart(6, '0')}`,
    package: { key: pkg.key, version: pkg.version }, owner, stage,
    subject: (input.subject ?? []).slice(0, 20), ...(input.applicant ? { applicant: input.applicant } : {}), ...(input.onBehalfOf ? { onBehalfOf: input.onBehalfOf } : {}), ...(input.delegation ? { delegation: input.delegation } : {}),
    fields, documents: [], priority: input.priority ?? 'routine',
    // The official of the responsible institution who opens a case is assigned to it (restricted cases need an assignee).
    ...(actor.scope?.id && actor.scope.institution === owner ? { assignee: { id: actor.scope.id, name: actor.name } } : {}),
    deadlines: [...deadlinesFrom(pkg, 'opened', at), ...deadlinesFrom(pkg, stage, at)],
    decisions: [], links: input.referral ? [{ kind: 'referred-from', case: input.referral.from }] : [], sensitivity: raised && pkg.sensitivity === 'normal' ? 'restricted' : pkg.sensitivity,
    history: [{ seq: 1, action: 'open', from: '', to: stage, by: by(actor), at, ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}) }],
    source, version: 1, openedAt: at,
    ...(intake.intake ? { intake: intake.intake } : {}),
    ...(input.checked?.verifications?.length ? { verifications: input.checked.verifications } : {}),
    fieldSources: sourcesOf(fields, input.checked?.verifications ?? [], { at, by: actor.name, channel: input.channel }),
  };
  d.cases.push(c);
  audit(actor, 'case.open', c, `opened at ${stage}${input.referral ? ` · referred from ${input.referral.from}` : ''}${c.intake ? ` · ${c.intake.channel}, form ${c.intake.form.version}` : ''}`);
  // An application taken at an office names who assisted, where, and the kind of identity evidence seen (never its number or the applicant).
  if (c.intake?.assisted) recordAudit(actor.name, 'case.open.assisted', `Case:${c.ref}`, 'ok', `${c.package.key}@${c.package.version} · form ${c.intake.form.version} · assisted by ${c.intake.assisted.by.name}${c.intake.assisted.servicePoint ? ` at ${c.intake.assisted.servicePoint}` : ''} · identity evidence seen: ${c.intake.assisted.identityEvidence}`);
  if (c.intake?.paper) recordAudit(actor.name, 'case.open.paper', `Case:${c.ref}`, 'ok', `${c.package.key}@${c.package.version} · paper form ${c.intake.form.version} transcribed by ${c.intake.paper.by.name}`);
  return clone(c);
}

/** The declaration-text versions a submission is made under: the form's declaration and each declaration field's. */
const declarationVersions = (pkg: CasePackage): string => [...(pkg.form?.declaration ? [`form@${pkg.form.declaration.version}`] : []), ...pkg.fields.filter(f => f.type === 'attestation' && f.attestation).map(f => `${f.key}@${f.attestation!.version}`)].join(', ');

/** Where each answer came from: entered on a channel or at a step, or verified with a service (the latest result wins). */
function sourcesOf(values: Record<string, unknown>, verifications: NonNullable<Case['verifications']>, who: { at: string; by: string; channel?: Channel | 'step' }): NonNullable<Case['fieldSources']> {
  const out: NonNullable<Case['fieldSources']> = {};
  for (const [k, v] of Object.entries(values)) if (v !== '' && v !== undefined) out[k] = { source: 'entered', at: who.at, by: who.by, ...(who.channel ? { channel: who.channel } : {}) };
  for (const v of verifications) if (v.result === 'verified' && out[v.field]) out[v.field] = { source: 'verified', at: v.at, service: v.service };
  return out;
}

/** How an application arrived, checked: who may use each channel, the declaration, the assisting official's record. */
function intakeOf(pkg: CasePackage, input: OpenInput, actor: Actor, now: Date): { intake?: Intake } | Refusal {
  if (!input.channel) return {};
  if (!['self-service', 'assisted', 'paper'].includes(input.channel)) return { error: 'The channel is self-service, assisted or paper' };
  const at = now.toISOString();
  const who = { ...(actor.id ? { id: actor.id } : {}), name: actor.name };
  const base: Intake = { channel: input.channel, at, form: { version: pkg.form?.version ?? `procedure-${pkg.version}`, ...(declarationVersions(pkg) ? { declaration: declarationVersions(pkg) } : {}), ...(pkg.form?.evidencePolicy ? { evidencePolicy: pkg.form.evidencePolicy } : {}) }, ...(input.locale && /^[a-z]{2,3}$/.test(input.locale) ? { locale: input.locale } : {}) };
  // A form takes submissions in production only once its release is approved (lib/forms/publication.ts registers the check; without it a production installation refuses); demonstrations show its status instead.
  const unreleased = gp.__caseIntakeGuard ? gp.__caseIntakeGuard(pkg, now) : pkg.form && !samplesAllowed() ? 'This form\'s publication gates are not loaded: it takes no submissions' : null;
  if (unreleased) return { error: unreleased };
  if (input.channel === 'self-service' && actor.scope) return { error: 'An official records an application as assisted or from a paper form' };
  if (input.channel !== 'self-service' && !actor.scope && !samplesAllowed()) return { error: 'An assisted or paper application is recorded by a signed-in official' };
  const decl = pkg.form?.declaration;
  if (decl) {
    if (input.declaration?.version !== decl.version) return { error: input.declaration ? 'The declaration has changed since it was read: read it again and confirm it' : 'Confirm the declaration', fieldErrors: [{ field: 'declaration', rule: 'required', message: input.declaration ? 'The declaration has changed since it was read: read it again and confirm it' : 'Confirm the declaration' }] };
    base.declaration = { version: decl.version, confirmedAt: at };
  }
  if (input.channel === 'assisted') {
    // The nation decides whether offices take applications for people (Configuration → identity).
    if (getSovereign().deployment?.identity?.assisted === false) return { error: 'The nation has not enabled assisted applications at offices (Configuration → identity)' };
    const seen = String(input.assisted?.identityEvidence ?? '').trim().slice(0, 120);
    const kinds = pkg.form?.identityEvidence;
    if (!seen) return { error: 'Record the identity evidence you saw', fieldErrors: [{ field: 'identityEvidence', rule: 'required', message: 'Record the identity evidence you saw' }] };
    if (kinds?.length && !kinds.some(k => k.key === seen)) return { error: `The identity evidence is one of: ${kinds.map(k => k.label).join(', ')}` };
    const label = kinds?.find(k => k.key === seen)?.label ?? seen;
    base.assisted = { by: who, identityEvidence: label, ...(input.assisted?.servicePoint?.trim() ? { servicePoint: input.assisted.servicePoint.trim().slice(0, 120) } : {}) };
  }
  if (input.channel === 'paper') {
    const on = input.paper?.receivedOn;
    if (on !== undefined && on !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(on)) return { error: 'The date the paper form was received is a date (YYYY-MM-DD)' };
    base.paper = { by: who, ...(on ? { receivedOn: on } : {}) };
  }
  return { intake: base };
}

/**
 * Submit an applicant's form: the answers that wait on another system
 * (positions read against the nation's map, references into registers read
 * here, identifiers checked with an exchange service where the law allows,
 * the signed declaration) are checked first, then the case opens under the
 * procedure in force with what openCase() checks. Routes that take a form
 * (POST /api/cases, the citizen's applications) call this.
 */
export async function submitForm(input: OpenInput, actor: Actor, now = new Date()): Promise<Case | Refusal> {
  const pkg = activePackage(input.procedure, today(now));
  if (!pkg) return { error: `No approved version of the procedure ${input.procedure} applies today` };
  if (input.channel) {
    const unreleased = gp.__caseIntakeGuard ? gp.__caseIntakeGuard(pkg, now) : pkg.form && !samplesAllowed() ? 'This form\'s publication gates are not loaded: it takes no submissions' : null;
    if (unreleased) return { error: unreleased };
  }
  const pre = checkFields(pkg, input.fields, { submit: !!input.channel && !!pkg.form, ...(input.locale ? { locale: input.locale } : {}), on: today(now) });
  if ('error' in pre) return pre;
  if (!needsServiceCheck(pkg.fields, pre.values) && !recordsChecks(pkg.fields, pre.values)) return openCase(input, actor, now);
  const owner = ownerInstitution(pkg.owner, authorityFor) ?? '';
  // Who signs a declaration: the signed-in applicant (self-service), or the applicant identified by the official at an office or on a signed paper form.
  const identified = input.channel === 'self-service' ? !!actor.id : !!actor.scope || (!!input.channel && samplesAllowed());
  const r = await serviceCheck(pkg.fields, pre.values, { procedure: pkg.key, institution: owner, signer: { identified, name: actor.name } }, today(now));
  if (r.errors.length) return { error: r.errors[0]!.message, fieldErrors: r.errors };
  const checked: Checked = { values: r.values, verifications: r.verifications };
  CHECKED.add(checked);
  return openCase({ ...input, checked }, actor, now);
}

// ── Acting ────────────────────────────────────────────────────────────────────
export interface ActInput {
  action: string;
  fields?: Record<string, unknown>;
  reason?: string;
  citations?: { instrument?: string; eId?: string }[];
  /** The case version the official saw; a later change refuses the step (directions 5.9). */
  expectedVersion?: number;
  idempotencyKey?: string;
}

export type ActResult = { case: Case; pending?: boolean; decision?: SignedDecision } | Refusal;

export async function act(caseId: string, input: ActInput, actor: Actor, now = new Date()): Promise<ActResult> {
  const c = db().cases.find(x => x.id === caseId);
  if (!c) return { error: 'No such case' };
  const pkg = getPackage(c.package.key, c.package.version);
  if (!pkg) return { error: 'The procedure version this case runs under is missing' };
  const a = pkg.actions.find(x => x.key === input.action);
  if (!a) return { error: `This procedure has no action ${input.action}` };
  // A sample case (kept from a demo or training run) is never acted on in production: nothing it decides reaches a register.
  if (c.source === 'sample' && !samplesAllowed()) return { error: `${c.ref} is a sample case: a production installation takes no step or decision on it` };
  // Who may act is decided before anything about the case is returned, a repeated request included.
  if (actor.scope) {
    const why = caseActRefusal(actor.scope, facts(c, a, pkg), now.getTime());
    if (why) return { error: why };
  }
  // Separation of duties (plan I2): this step's official is a different person from those who took the steps it names.
  for (const s of c.history.filter(h => a.needs.distinctFrom?.includes(h.action))) {
    for (const earlier of [s.by, ...(s.confirmedBy ? [s.confirmedBy] : [])]) {
      const same = dualControlRefusal({ by: earlier.name, ...(earlier.id ? { byId: earlier.id } : {}) }, { by: actor.name, ...(actor.id ? { byId: actor.id } : {}) });
      if (same) return { error: `Separation of duties: ${a.label.toLowerCase()} is taken by a different person from the one who took "${pkg.actions.find(x => x.key === s.action)?.label ?? s.action}" (${earlier.name})` };
    }
  }
  // A proposal past its waiting period lapses before anything else; a repeat of it is not a new proposal.
  const lapsedNow = c.pending?.action === a.key ? c.pending : undefined;
  if (lapsePending(c, now) && lapsedNow) return { error: `The proposal to ${a.label.toLowerCase()} made by ${lapsedNow.by.name} lapsed unconfirmed at ${lapsedNow.expiresAt!.slice(0, 16)}: it is kept on the case; propose again as a new request` };
  if (input.idempotencyKey && c.lapsedProposals?.some(p => p.idempotencyKey === input.idempotencyKey)) return { error: 'That proposal lapsed unconfirmed: propose again as a new request' };
  // A repeated request (same key, same action) returns the case as it now stands instead of acting again.
  if (input.idempotencyKey && ((c.pending?.action === a.key && c.pending.idempotencyKey === input.idempotencyKey) || c.history.some(s => s.action === a.key && (s.idempotencyKey === input.idempotencyKey || s.confirmIdempotencyKey === input.idempotencyKey)))) return { case: clone(c), ...(c.pending ? { pending: true } : {}) };
  if (input.expectedVersion !== undefined && input.expectedVersion !== c.version) return { error: 'This case changed since you opened it: reload it and check before acting' };
  if (!a.from.includes(c.stage)) return { error: `${a.label} is not possible while the case is ${pkg.stages.find(s => s.key === c.stage)?.label ?? c.stage}` };
  // An action the procedure gives to the assigned official only.
  if (actor.scope && a.needs.assigned && c.assignee?.id !== actor.scope.id) return { error: c.assignee ? `${a.label} is for the official assigned to this case (${c.assignee.name})` : `${a.label} needs an assigned official: assign the case first` };
  const pending = c.pending?.action === a.key ? c.pending : undefined;
  if (c.pending && !pending) return { error: `${pkg.actions.find(x => x.key === c.pending!.action)?.label ?? c.pending.action} is waiting for a second official: confirm or cancel it first` };

  // What the step carries: fields merged, reasons, citations of the law in force today.
  const checked = checkFields(pkg, pending ? pending.fields : input.fields, { existing: c.fields, on: today(now), except: c.id });
  if ('error' in checked) return checked;
  let fields = checked.values;
  // Answers that wait on another system (a position, a register read here, a checked identifier), as at opening.
  let verifications: NonNullable<Case['verifications']> = [];
  if (!pending && (needsServiceCheck(pkg.fields, fields) || recordsChecks(pkg.fields, fields))) {
    const r = await serviceCheck(pkg.fields, fields, { procedure: pkg.key, institution: c.owner, signer: { identified: !!actor.scope || !!actor.id, name: actor.name } }, today(now));
    if (r.errors.length) return { error: r.errors[0]!.message, fieldErrors: r.errors };
    fields = r.values;
    verifications = r.verifications;
  }
  // A confirmation carries the answers exactly as they were checked when proposed.
  if (pending?.fields) fields = { ...pending.fields };
  const merged = { ...c.fields, ...fields };
  for (const f of a.requires?.fields ?? []) if (merged[f] === undefined || merged[f] === '') return { error: `${pkg.fields.find(x => x.key === f)?.label ?? f} is needed first` };
  const classes = new Set(c.documents.map(id => getDocument(id)?.class).filter(Boolean));
  for (const d of a.requires?.documents ?? []) if (!classes.has(d)) return { error: `${pkg.documents.find(x => x.class === d)?.label ?? d} must be attached first` };
  const reason = (pending ? pending.reason : input.reason)?.trim();
  if (a.requires?.reasons && !reason) return { error: 'State the reasons' };
  const on = today(now);
  let citations: Citation[];
  if (pending?.citations) citations = pending.citations;
  else {
    const asked = resolveCitations(input.citations, on);
    if ('error' in asked) return asked;
    citations = asked;
    if (a.decision && !citations.length && pkg.citations.length) {
      const fromPkg = resolveCitations(pkg.citations, on);
      if ('error' in fromPkg) return fromPkg;
      citations = fromPkg;
    }
  }
  if (a.requires?.citations && !citations.length) return { error: 'Cite the provisions of law this rests on' };

  // A decision is checked against the authority it rests on when proposed and again when made.
  const guarded = a.decision ? guardDecision(c, a, pkg, now, citations) : {};
  if ('error' in guarded) return guarded;

  // Four-eyes: the first official proposes; a different one confirms.
  const fourEyes = twoOfficials(c, a, pkg);
  if (fourEyes && !pending) {
    if (verifications.length) (c.verifications ??= []).push(...verifications);
    const proposedUnder = delegationUsed(actor, c, a, now);
    c.pending = { action: a.key, by: by(actor), at: now.toISOString(), expiresAt: new Date(now.getTime() + pendingHours() * 3_600_000).toISOString(), ...(reason ? { reason } : {}), citations, fields, ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}), ...(proposedUnder ? { delegation: proposedUnder } : {}) };
    c.version += 1;
    audit(actor, 'case.propose', c, `${a.key} proposed; a second official confirms`);
    return { case: clone(c), pending: true };
  }
  let independence: Step['independence'];
  if (pending) {
    const same = dualControlRefusal({ by: pending.by.name, byId: pending.by.id }, { by: actor.name, byId: actor.id });
    if (same) return { error: same };
    // In production both are signed-in officials, each in their own request.
    if (!samplesAllowed() && (!pending.by.id || !actor.id)) return { error: 'A two-official decision is proposed and confirmed by two signed-in officials' };
    independence = independenceOf(pending.by.id, actor.id);
    if (gd.__caseDualControl?.requireIdentityBinding() && independence !== 'identity-provider') return { error: 'The nation requires both officials to be linked to the national identity provider before a two-official decision (Officials → link identity)' };
  }
  const decidedBy = pending ? pending.by : by(actor);
  const confirmedBy = pending ? by(actor) : undefined;
  // A delegated act records both the delegate (decidedBy) and the delegator (plan I2, transparent delegation).
  const delegation = pending ? pending.delegation : delegationUsed(actor, c, a, now);

  // Domain effects, then the sealed decision, then the effects' follow-up.
  const ctx: EffectContext = { case: clone({ ...c, fields: merged }), package: pkg, action: a, actor, now };
  const results: EffectResult[] = [];
  for (const name of a.effects ?? []) {
    const fn = effectsMap().get(name);
    if (!fn) return { error: `No module provides ${name}` };
    const r = (await fn(ctx)) ?? {};
    if (r.error) return { error: r.error };
    results.push(r);
  }
  let decision: SignedDecision | undefined;
  if (a.decision) {
    const inst = getMinistry(c.owner);
    const sealed = await recordDecision({
      subject: { kind: 'case', id: c.id, ref: c.ref, procedure: c.package },
      institution: { id: c.owner, name: inst?.name ?? c.owner },
      decision: a.decision, reasons: reason ?? '', citations,
      officials: [{ role: 'decided', name: decidedBy.name, ...(decidedBy.id ? { id: decidedBy.id } : {}), ...(delegation ? { delegatedBy: { id: delegation.delegator.id, name: delegation.delegator.name, delegation: delegation.id } } : {}) }, ...(confirmedBy ? [{ role: 'confirmed' as const, name: confirmedBy.name, ...(confirmedBy.id ? { id: confirmedBy.id } : {}) }] : [])],
      ...(results.some(r => r.facts) ? { facts: Object.assign({}, ...results.map(r => r.facts ?? {})) } : {}),
      ...(guarded.authority ? { authority: guarded.authority } : {}),
      ...(independence ? { independence } : {}),
      ...(results.some(r => r.rules?.length) ? { rules: results.flatMap(r => r.rules ?? []) } : {}),
      at: now.toISOString(),
    });
    if ('error' in sealed) return sealed;
    decision = sealed;
    c.decisions.push(sealed.id);
  }
  const at = now.toISOString();
  const from = c.stage;
  c.fields = merged;
  if (verifications.length) (c.verifications ??= []).push(...verifications);
  c.fieldSources = { ...(c.fieldSources ?? {}), ...sourcesOf(fields, verifications, { at: now.toISOString(), by: (pending ? pending.by : by(actor)).name, channel: 'step' }) };
  c.stage = a.to;
  const step: Step = { seq: c.history.length + 1, action: a.key, from, to: a.to, by: decidedBy, ...(confirmedBy ? { confirmedBy } : {}), at, ...(reason ? { reason } : {}), ...(citations.length ? { citations } : {}), ...(decision ? { decision: decision.id } : {}), ...((pending?.idempotencyKey ?? input.idempotencyKey) ? { idempotencyKey: pending?.idempotencyKey ?? input.idempotencyKey } : {}), ...(pending?.idempotencyKey && input.idempotencyKey && input.idempotencyKey !== pending.idempotencyKey ? { confirmIdempotencyKey: input.idempotencyKey } : {}), ...(independence ? { independence } : {}), ...(delegation ? { delegation } : {}) };
  c.history.push(step);
  delete c.pending;
  for (const d of c.deadlines) if (!d.met && !d.lapsed && pkg.deadlines.find(x => x.key === d.key)?.from === from) d.met = at;
  c.deadlines.push(...deadlinesFrom(pkg, a.to, at));
  if (pkg.stages.find(s => s.key === a.to)?.terminal) {
    c.closedAt = at;
    if (pkg.appeal?.days !== undefined && decision) c.deadlines.push({ key: 'appeal', label: `Appeal to ${pkg.appeal.body}`, due: addDays(at, pkg.appeal.days, 'calendar'), ...(pkg.appeal.citation ? { citation: pkg.appeal.citation } : {}), ...(pkg.sampleDeadlines ? { sample: true as const } : {}) });
  }
  c.version += 1;
  audit(actor, decision ? 'case.decide' : 'case.stage', c, `${a.key}: ${from} → ${a.to}${decision ? ` · decision ${decision.id} · ${decision.sha256.slice(0, 12)}` : ''}${confirmedBy ? ` · confirmed by ${confirmedBy.name}` : ''}${delegation ? ` · by ${decidedBy.name} under delegation ${delegation.id} from ${delegation.delegator.name}` : ''}`);
  for (const r of results) if (r.after) await r.after(decision, clone(c));
  if (decision) for (const fn of gl.__caseDecisionListeners?.values() ?? []) { try { await fn(decision, clone(c), now); } catch { /* a listener never undoes a decision */ } }
  return { case: clone(c), ...(decision ? { decision } : {}) };
}

/** Withdraw a four-eyes proposal (the proposer, or an official who can sign there). */
export function cancelPending(caseId: string, actor: Actor, reason: string): Case | { error: string } {
  const c = db().cases.find(x => x.id === caseId);
  if (!c) return { error: 'No such case' };
  if (!c.pending) return { error: 'Nothing is waiting for confirmation' };
  if (!reason?.trim()) return { error: 'Say why it is withdrawn' };
  if (actor.scope) {
    const why = caseActRefusal(actor.scope, facts(c));
    if (why) return { error: why };
  }
  const p = c.pending;
  delete c.pending;
  c.version += 1;
  audit(actor, 'case.propose.withdraw', c, `${p.action} proposed by ${p.by.name} withdrawn: ${reason.trim().slice(0, 200)}`);
  return clone(c);
}

// ── Other steps ───────────────────────────────────────────────────────────────
function guard(caseId: string, actor: Actor): Case | { error: string } {
  const c = db().cases.find(x => x.id === caseId);
  if (!c) return { error: 'No such case' };
  if (actor.scope) {
    const why = caseActRefusal(actor.scope, facts(c));
    if (why) return { error: why };
  }
  return c;
}

export function assign(caseId: string, to: { id: string; name: string }, actor: Actor): Case | { error: string } {
  const c = guard(caseId, actor);
  if ('error' in c) return c;
  c.assignee = { id: to.id, name: to.name };
  c.version += 1;
  audit(actor, 'case.assign', c, `assigned to ${to.name}`);
  return clone(c);
}

/** Attach a document that belongs to this case (lib/records/documents.ts). */
export function attach(caseId: string, documentId: string, actor: Actor): Case | { error: string } {
  const c = guard(caseId, actor);
  if ('error' in c) return c;
  const d = getDocument(documentId);
  if (!d || d.belongsTo.kind !== 'case' || d.belongsTo.id !== c.id) return { error: 'That document does not belong to this case' };
  if (!c.documents.includes(documentId)) c.documents.push(documentId);
  c.version += 1;
  audit(actor, 'case.attach', c, `${d.class} ${d.id}`);
  return clone(c);
}

export function hold(caseId: string, reason: string, actor: Actor, now = new Date()): Case | { error: string } {
  const c = guard(caseId, actor);
  if ('error' in c) return c;
  if (!reason?.trim()) return { error: 'Say why the case is held' };
  c.legalHold = { by: actor.name, at: now.toISOString(), reason: reason.trim().slice(0, 300) };
  c.version += 1;
  audit(actor, 'case.hold', c, reason.trim().slice(0, 200));
  return clone(c);
}

export function release(caseId: string, actor: Actor): Case | { error: string } {
  const c = guard(caseId, actor);
  if ('error' in c) return c;
  if (!c.legalHold) return { error: 'This case is not held' };
  delete c.legalHold;
  c.version += 1;
  audit(actor, 'case.release', c, 'hold released');
  return clone(c);
}

/**
 * Refer: open a case under another institution's procedure, linked both ways
 * (Education asks Health for an inspection before accrediting a campus,
 * directions 16.7). The referring official must be able to work this case;
 * the new case belongs to the other procedure's owner.
 */
export function refer(caseId: string, input: { procedure: string; fields?: Record<string, unknown>; reason: string }, actor: Actor, now = new Date()): { from: Case; to: Case } | { error: string } {
  const c = guard(caseId, actor);
  if ('error' in c) return c;
  if (!input.reason?.trim()) return { error: 'Say what is asked of the other institution' };
  // A referral from a sample case is itself a sample (and refused in production by openCase).
  const to = openCase({ procedure: input.procedure, fields: input.fields, subject: c.subject, referral: { from: c.id }, source: c.source === 'sample' ? 'sample' : 'entered' }, actor, now);
  if ('error' in to) return to;
  c.links.push({ kind: 'referral', case: to.id });
  c.version += 1;
  audit(actor, 'case.refer', c, `referred to ${to.ref} (${input.procedure}): ${input.reason.trim().slice(0, 200)}`);
  return { from: clone(c), to };
}

/** Deadlines past due: mark them lapsed (the scheduled job applies their effect and notifies). */
export function lapseDeadlines(now = new Date()): { case: string; ref: string; deadline: string; onLapse: string; owner: string }[] {
  const out: { case: string; ref: string; deadline: string; onLapse: string; owner: string }[] = [];
  for (const c of db().cases) {
    if (c.closedAt && !c.deadlines.some(d => d.key === 'appeal')) continue;
    const pkg = getPackage(c.package.key, c.package.version);
    for (const d of c.deadlines) {
      if (d.met || d.lapsed || !lapsed(d.due, now)) continue;
      if (d.key === 'appeal') { d.met = now.toISOString(); continue; }
      d.lapsed = now.toISOString();
      const onLapse = pkg?.deadlines.find(x => x.key === d.key)?.onLapse ?? 'notify';
      if (onLapse === 'escalate' && c.priority !== 'urgent') c.priority = c.priority === 'routine' ? 'priority' : 'urgent';
      c.version += 1;
      recordAudit('case deadlines', 'case.deadline.lapse', `Case:${c.ref}`, 'ok', `${d.key} due ${d.due} · ${onLapse}`);
      out.push({ case: c.id, ref: c.ref, deadline: d.key, onLapse, owner: c.owner });
    }
  }
  return out;
}

// ── Reading ───────────────────────────────────────────────────────────────────
/**
 * The nation's retention rule for closed cases under procedures
 * (lib/data/retention.ts): personal fields and the parties' names of cases
 * closed before `before` are removed in place; the case, its steps, its
 * sealed decisions and its documents' records stay (documents follow their
 * own rule). Never a case under a legal hold, a sample, or a procedure whose
 * retention class is permanent (`…-permanent`, e.g. the civil register).
 */
export function anonymiseClosedCases(before: string, now = new Date(), held?: (c: Case) => boolean): number {
  let n = 0;
  for (const c of db().cases) {
    if (!c.closedAt || c.closedAt >= before || c.anonymisedAt || c.legalHold || c.source === 'sample') continue;
    // A legal hold of the records management register (plan I13): the caller says which cases one covers.
    if (held?.(c)) continue;
    const pkg = getPackage(c.package.key, c.package.version);
    if (!pkg || /-permanent$/.test(pkg.retention)) continue;
    const personal = new Set(pkg.fields.filter(isPersonalField).map(f => f.key));
    for (const k of Object.keys(c.fields)) if (personal.has(k)) c.fields[k] = '';
    c.subject = c.subject.map(p => ({ kind: p.kind, name: '(removed under the retention rule)' }));
    if (c.applicant) c.applicant = { kind: c.applicant.kind, name: '(removed under the retention rule)' };
    if (c.onBehalfOf) c.onBehalfOf = { kind: c.onBehalfOf.kind, name: '(removed under the retention rule)' };
    c.anonymisedAt = now.toISOString();
    c.version += 1;
    n++;
  }
  return n;
}

export const getCase = (id: string): Case | undefined => { const c = db().cases.find(x => x.id === id || x.ref === id); return c ? clone(c) : undefined; };
export function listCases(filter: { owner?: string; procedure?: string; open?: boolean; stage?: string; limit?: number } = {}): Case[] {
  const limit = Math.min(filter.limit ?? 200, 1000);
  return db().cases.filter(c => (!filter.owner || c.owner === filter.owner) && (!filter.procedure || c.package.key === filter.procedure) && (filter.open === undefined || !c.closedAt === filter.open) && (!filter.stage || c.stage === filter.stage))
    .slice(-limit).reverse().map(clone);
}
/** The rule facts of a case, for the routes' read checks. */
export const caseFacts = (c: Case) => facts(c);
