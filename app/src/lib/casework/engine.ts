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
import { authorityFor, getSovereign, getMinistry } from '@/lib/data/store';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { caseActRefusal, type CaseScope } from '@/lib/auth/roles';
import { calendarOf } from '@/lib/nation/deployment';
import { cite, type Citation } from '@/lib/law/register';
import { recordDecision, type SignedDecision } from '@/lib/records/decisions';
import { getDocument } from '@/lib/records/documents';
import { activePackage, getPackage, ownerInstitution } from './packages';
import { addDays, lapsed } from './calendar';
import type { Case, CasePackage, ActionSpec, FieldSpec, Party, Step } from './types';
import { queueMirror } from '@/lib/db/mirror';

interface CaseDb { cases: Case[]; seq: number }
const g = globalThis as unknown as { __civicosCases?: CaseDb };
const db = (): CaseDb => { const d = touch('__civicosCases', g.__civicosCases ??= { cases: [], seq: 0 }); d.seq ??= 0; return d; };
export function resetCases(): void { g.__civicosCases = undefined; }

/** Who is acting: the verified official (scope) or, without sign-in enforced, a declared name (no scope). */
export interface Actor { id?: string; name: string; scope: (CaseScope & { id?: string }) | null; institution?: string }

// ── Effects: domain logic the owning module registers ────────────────────────
export interface EffectContext { case: Case; package: CasePackage; action: ActionSpec; actor: Actor; now: Date }
/** What an effect returns: facts the decision fixes, and work to do once the decision is sealed. */
export interface EffectResult { facts?: Record<string, string | number | boolean>; after?: (decision: SignedDecision | undefined, c: Case) => Promise<void> | void; error?: string }
export type Effect = (ctx: EffectContext) => Promise<EffectResult | void> | EffectResult | void;
const ge = globalThis as unknown as { __caseEffects?: Map<string, Effect> };
const effectsMap = () => (ge.__caseEffects ??= new Map());
export function registerEffect(name: string, fn: Effect): void { effectsMap().set(name, fn); }
export const registeredEffects = (): string[] => [...effectsMap().keys()];

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = (now: Date) => now.toISOString().slice(0, 10);
const clone = <T,>(x: T): T => structuredClone(x);
const by = (a: Actor) => ({ ...(a.id ? { id: a.id } : {}), name: a.name, ...(a.scope?.institution ?? a.institution ? { institution: a.scope?.institution ?? a.institution } : {}) });

function checkFields(spec: FieldSpec[], input: Record<string, unknown> | undefined): { values: Record<string, unknown> } | { error: string } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    const f = spec.find(x => x.key === k);
    if (!f) return { error: `This procedure has no field ${k}` };
    if (v === null || v === '') { out[k] = ''; continue; }
    switch (f.type) {
      case 'number': if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `${f.label} must be a number` }; break;
      case 'boolean': if (typeof v !== 'boolean') return { error: `${f.label} must be yes or no` }; break;
      case 'date': if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: `${f.label} must be a date (YYYY-MM-DD)` }; break;
      case 'choice': if (!f.options?.includes(String(v))) return { error: `${f.label} must be one of ${f.options?.join(', ')}` }; break;
      default: if (typeof v !== 'string' || v.length > (f.max ?? (f.type === 'longtext' ? 20_000 : 500))) return { error: `${f.label} must be text (at most ${f.max ?? (f.type === 'longtext' ? 20_000 : 500)} characters)` };
    }
    out[k] = v;
  }
  return { values: out };
}

function deadlinesFrom(pkg: CasePackage, stage: string, at: string): Case['deadlines'] {
  const cal = calendarOf(getSovereign().deployment);
  return pkg.deadlines.filter(d => d.from === stage).map(d => ({ key: d.key, label: d.label, due: addDays(at, d.days, d.calendar, cal), ...(d.citation ? { citation: d.citation } : {}) }));
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

const facts = (c: Case, a?: ActionSpec) => ({
  owner: c.owner, sensitivity: c.sensitivity, assigned: c.assignee ? [c.assignee.id] : [],
  // The judiciary named in the deployment profile: its cases are closed to every other institution (directions 4.6).
  judicial: !!authorityFor('judiciary') && c.owner === authorityFor('judiciary'),
  ...(a ? { decision: !!a.decision, stepUp: !!a.needs.stepUp } : {}),
});

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
}

export function openCase(input: OpenInput, actor: Actor, now = new Date()): Case | { error: string } {
  const pkg = activePackage(input.procedure, today(now));
  if (!pkg) return { error: `No approved version of the procedure ${input.procedure} applies today` };
  const owner = ownerInstitution(pkg.owner, authorityFor);
  if (!owner) return { error: `No institution is named as responsible for ${pkg.title} (Configuration, Who is responsible)` };
  if (input.idempotencyKey) {
    const seen = db().cases.find(c => c.history[0]?.idempotencyKey === input.idempotencyKey);
    if (seen) return clone(seen);
  }
  const source = input.source ?? 'entered';
  if (actor.scope && source !== 'citizen' && !input.referral) {
    const why = caseActRefusal(actor.scope, { owner, sensitivity: pkg.sensitivity, assigned: [actor.scope.id ?? ''] }, now.getTime());
    if (why) return { error: why };
  }
  const checked = checkFields(pkg.fields, input.fields);
  if ('error' in checked) return checked;
  const fields = checked.values;
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
    decisions: [], links: input.referral ? [{ kind: 'referred-from', case: input.referral.from }] : [], sensitivity: pkg.sensitivity,
    history: [{ seq: 1, action: 'open', from: '', to: stage, by: by(actor), at, ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}) }],
    source, version: 1, openedAt: at,
  };
  d.cases.push(c);
  audit(actor, 'case.open', c, `opened at ${stage}${input.referral ? ` · referred from ${input.referral.from}` : ''}`);
  return clone(c);
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

export type ActResult = { case: Case; pending?: boolean; decision?: SignedDecision } | { error: string };

export async function act(caseId: string, input: ActInput, actor: Actor, now = new Date()): Promise<ActResult> {
  const c = db().cases.find(x => x.id === caseId);
  if (!c) return { error: 'No such case' };
  if (input.idempotencyKey && c.history.some(s => s.idempotencyKey === input.idempotencyKey)) return { case: clone(c) };
  if (input.expectedVersion !== undefined && input.expectedVersion !== c.version) return { error: 'This case changed since you opened it: reload it and check before acting' };
  const pkg = getPackage(c.package.key, c.package.version);
  if (!pkg) return { error: 'The procedure version this case runs under is missing' };
  const a = pkg.actions.find(x => x.key === input.action);
  if (!a) return { error: `This procedure has no action ${input.action}` };
  if (!a.from.includes(c.stage)) return { error: `${a.label} is not possible while the case is ${pkg.stages.find(s => s.key === c.stage)?.label ?? c.stage}` };
  if (actor.scope) {
    const why = caseActRefusal(actor.scope, facts(c, a), now.getTime());
    if (why) return { error: why };
    // An action the procedure gives to the assigned official only.
    if (a.needs.assigned && c.assignee?.id !== actor.scope.id) return { error: c.assignee ? `${a.label} is for the official assigned to this case (${c.assignee.name})` : `${a.label} needs an assigned official: assign the case first` };
  }
  const pending = c.pending?.action === a.key ? c.pending : undefined;
  if (c.pending && !pending) return { error: `${pkg.actions.find(x => x.key === c.pending!.action)?.label ?? c.pending.action} is waiting for a second official: confirm or cancel it first` };

  // What the step carries: fields merged, reasons, citations of the law in force today.
  const checked = checkFields(pkg.fields, pending ? pending.fields : input.fields);
  if ('error' in checked) return checked;
  const fields = checked.values;
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

  // Four-eyes: the first official proposes; a different one confirms.
  if (a.needs.fourEyes && !pending) {
    c.pending = { action: a.key, by: by(actor), at: now.toISOString(), ...(reason ? { reason } : {}), citations, fields, ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}) };
    c.version += 1;
    audit(actor, 'case.propose', c, `${a.key} proposed; a second official confirms`);
    return { case: clone(c), pending: true };
  }
  if (pending) {
    const same = dualControlRefusal({ by: pending.by.name, byId: pending.by.id }, { by: actor.name, byId: actor.id });
    if (same) return { error: same };
  }
  const decidedBy = pending ? pending.by : by(actor);
  const confirmedBy = pending ? by(actor) : undefined;

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
      officials: [{ role: 'decided', name: decidedBy.name, ...(decidedBy.id ? { id: decidedBy.id } : {}) }, ...(confirmedBy ? [{ role: 'confirmed' as const, name: confirmedBy.name, ...(confirmedBy.id ? { id: confirmedBy.id } : {}) }] : [])],
      ...(results.some(r => r.facts) ? { facts: Object.assign({}, ...results.map(r => r.facts ?? {})) } : {}),
      at: now.toISOString(),
    });
    if ('error' in sealed) return sealed;
    decision = sealed;
    c.decisions.push(sealed.id);
  }
  const at = now.toISOString();
  const from = c.stage;
  c.fields = merged;
  c.stage = a.to;
  const step: Step = { seq: c.history.length + 1, action: a.key, from, to: a.to, by: decidedBy, ...(confirmedBy ? { confirmedBy } : {}), at, ...(reason ? { reason } : {}), ...(citations.length ? { citations } : {}), ...(decision ? { decision: decision.id } : {}), ...((pending?.idempotencyKey ?? input.idempotencyKey) ? { idempotencyKey: pending?.idempotencyKey ?? input.idempotencyKey } : {}) };
  c.history.push(step);
  delete c.pending;
  for (const d of c.deadlines) if (!d.met && !d.lapsed && pkg.deadlines.find(x => x.key === d.key)?.from === from) d.met = at;
  c.deadlines.push(...deadlinesFrom(pkg, a.to, at));
  if (pkg.stages.find(s => s.key === a.to)?.terminal) {
    c.closedAt = at;
    if (pkg.appeal && decision) c.deadlines.push({ key: 'appeal', label: `Appeal to ${pkg.appeal.body}`, due: addDays(at, pkg.appeal.days, 'calendar'), ...(pkg.appeal.citation ? { citation: pkg.appeal.citation } : {}) });
  }
  c.version += 1;
  audit(actor, decision ? 'case.decide' : 'case.stage', c, `${a.key}: ${from} → ${a.to}${decision ? ` · decision ${decision.id} · ${decision.sha256.slice(0, 12)}` : ''}${confirmedBy ? ` · confirmed by ${confirmedBy.name}` : ''}`);
  for (const r of results) if (r.after) await r.after(decision, clone(c));
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
  const to = openCase({ procedure: input.procedure, fields: input.fields, subject: c.subject, referral: { from: c.id }, source: 'entered' }, actor, now);
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
export const getCase = (id: string): Case | undefined => { const c = db().cases.find(x => x.id === id || x.ref === id); return c ? clone(c) : undefined; };
export function listCases(filter: { owner?: string; procedure?: string; open?: boolean; stage?: string; limit?: number } = {}): Case[] {
  const limit = Math.min(filter.limit ?? 200, 1000);
  return db().cases.filter(c => (!filter.owner || c.owner === filter.owner) && (!filter.procedure || c.package.key === filter.procedure) && (filter.open === undefined || !c.closedAt === filter.open) && (!filter.stage || c.stage === filter.stage))
    .slice(-limit).reverse().map(clone);
}
/** The rule facts of a case, for the routes' read checks. */
export const caseFacts = (c: Case) => facts(c);
