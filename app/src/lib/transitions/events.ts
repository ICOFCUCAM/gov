// Recording transitions and emergencies (docs/CONSTITUTIONAL_ARCHITECTURE.md
// §4; plan phase 6). Every transition is a legal event the nation's law
// provides for: recorded by one official citing the laws register, confirmed
// by a different person (dualControlRefusal(), which compares persons through
// personOf()), every version kept and audited (lib/law/policy-change.ts).
// The platform never decides one, never infers one and ships none.
//
// Who records and confirms each kind (when an official is signed in):
//   taking up office, acting appointment, succession   an administrator whose scope reaches the office's
//        institution records; an administrator or one who can sign there confirms (its own officials when it is
//        independent); never the person named;
//   delegation      the delegating official, or an administrator; confirmed by another official of the institution;
//   caretaker       an administrator of the institution (the whole government's for `executive-office`);
//   dissolution     officials of the dissolving institution, under an approved `dissolve` relationship in force
//                   (lib/data/store/relationships.ts) — the platform never assumes who may dissolve;
//   impeachment     each of the seven stages by officials of the institution the nation names for it
//                   (transition rules); no stage skipped; no outcome changes anyone's account or holding;
//   court ruling    officials of a court (judiciary standing or named for the judiciary), confirmed by another of
//                   that court; it flags affected decisions and blocks new decisions only where the effect requires;
//   emergency       officials of a declaring institution the nation names; time-limited, lapses at its expiry,
//                   renewed only by a new confirmed declaration; it never changes a permission;
//   transfer of a power (devolution, recentralisation)   an administrator; confirmed by another official, by the
//                   independent end's own when one is;
//   conflict of interest   the official concerned (or an administrator or one who can sign); acknowledged by another
//                   person; the recusal applies from the declaration and is lifted only by two people.
// A part of the constitutional profile frozen by a dispute (lib/constitution/profile-state.ts) freezes the
// transitions that touch it (TOUCHES); a court's ruling, an emergency and a conflict declaration touch none.

import { randomUUID } from 'node:crypto';
import { proposePolicy, confirmPolicy, withdrawPolicy, lapsePolicy, type PolicyVersion } from '@/lib/law/policy-change';
import { getInstrument, type Citation } from '@/lib/law/register';
import { dualControlPendingHours, independenceOf } from '@/lib/data/dual-control';
import { getMinistry, listMinistries } from '@/lib/data/store/ministries';
import { getSovereign } from '@/lib/data/store/sovereign';
import { institutionBounds } from '@/lib/data/store/institutions';
import { relationshipGrants } from '@/lib/data/store/relationships';
import { accountById, hasOwnSigners } from '@/lib/auth/officials';
import { reaches, EXECUTIVE_OFFICE, type Boundaries, type OfficialRole } from '@/lib/auth/roles';
import { getOfficeRecord, officeTermsOf, listHoldings, holdingFromTransition, endTransitionHolding, pastTermHoldings } from '@/lib/nation/office-register';
import { suspensionInForce } from '@/lib/permits/authority';
import { listDecisions } from '@/lib/records/decisions';
import { frozenRefusal, PART_AUDIT, type PartKey } from '@/lib/constitution/profile-state';
import { nationRegions } from '@/lib/nation/registry';
import {
  transitionsDb, statusOf, currentVersion, adoptedVersions, inForce, judicialEffectsOn, caretakersInForce, competencesInForce,
  TRANSITION_KINDS, IMPEACHMENT_STAGES, CLOSING_OUTCOMES, JUDICIAL_EFFECTS, REFERENCE_CARETAKER_RESTRICTIONS, EMPTY_RULES,
  isTransitionKind, transitionKindLabel,
  type TransitionKind, type TransitionTerms, type TransitionEvent, type TransitionStatus, type TransitionRulesValues, type NamedPerson, type JudicialEffect, type Finality,
} from './state';

export const LEGAL_EVENTS_NOTICE = 'These are the nation\'s legal events. CivicOS records what the competent body decided, under the law it cites, confirmed by a second official; it never decides, infers or ends one by itself. An emergency never lifts audit, access logging, two-official rules or privacy rules.';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = (now: Date) => now.toISOString().slice(0, 10);
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const audit = (k: TransitionKind) => `transition.${k}`;
const nameOf = (id?: string) => (!id ? '' : id === EXECUTIVE_OFFICE ? 'The whole government' : getMinistry(id)?.name ?? id);

/** The parts of the constitutional profile each kind touches: a dispute freezing one freezes it too. */
export const TOUCHES: Record<TransitionKind, PartKey[]> = {
  assumption: ['offices'], acting: ['offices'], succession: ['offices'], delegation: [],
  caretaker: ['institutions', 'transitionRules'], dissolution: ['institutions', 'relationships'],
  impeachment: ['offices', 'transitionRules'], competence: ['competences', 'authorities'],
  'judicial-review': [], emergency: [], conflict: [],
};
function frozen(kind: TransitionKind): string | null {
  for (const p of TOUCHES[kind]) { const why = frozenRefusal(PART_AUDIT[p]); if (why) return why; }
  return null;
}

export interface TransitionActor { by: string; byId?: string; role?: OfficialRole; institution?: string }
const accountKey = (id?: string) => (id ?? '').replace(/^local:/, '');

// ── Reading a request ─────────────────────────────────────────────────────────

export type TransitionInput = Record<string, unknown>;

function person(v: unknown, what: string): NamedPerson | { error: string } | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const x = (typeof v === 'string' ? { accountId: v } : v) as { accountId?: unknown; name?: unknown };
  const id = accountKey(str(x.accountId, 120));
  if (id) {
    const a = accountById(id);
    if (!a || a.disabled) return { error: `${what}: name an active official account` };
    return { accountId: a.id, name: a.name };
  }
  const name = str(x.name, 200);
  return name ? { name } : { error: `${what}: name the person (an official account, or their name)` };
}
const list = (v: unknown, max: number, len: number): string[] | { error: string } => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max || v.some(x => typeof x !== 'string')) return { error: `A list of up to ${max} entries is expected` };
  return [...new Set((v as string[]).map(x => x.trim().slice(0, len)).filter(Boolean))];
};

/** The terms a request asks for, checked for their shape; what the kind requires is checked by checkTerms(). */
function parse(kind: TransitionKind, b: TransitionInput, now: Date): TransitionTerms | { error: string } {
  const t: TransitionTerms = { kind, status: 'recorded', effectiveFrom: today(now) };
  for (const k of ['effectiveFrom', 'effectiveTo'] as const) {
    const v = b[k];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' || !ISO_DATE.test(v)) return { error: 'Dates are YYYY-MM-DD' };
    t[k] = v;
  }
  for (const k of ['institution', 'actingInstitution', 'office', 'competence', 'reference', 'interest', 'renews', 'trigger', 'arrangements', 'reason', 'outcome'] as const) {
    const v = str(b[k], k === 'arrangements' || k === 'reason' || k === 'interest' ? 1000 : 200);
    if (v) t[k] = v;
  }
  for (const [k, what] of [['person', 'The person'], ['delegator', 'The delegating official']] as const) {
    const p = person(b[k], what);
    if (p && 'error' in p) return p;
    if (p) t[k] = p;
  }
  for (const [k, max, len] of [['powers', 30, 300], ['regions', 200, 120], ['decisions', 50, 80], ['cases', 50, 80], ['suspensions', 30, 120]] as const) {
    const l = list(b[k], max, len);
    if ('error' in l) return { error: `${k}: ${l.error}` };
    if (l.length) t[k] = l;
  }
  if (b.direction !== undefined) {
    if (!['devolution', 'recentralisation', 'transfer'].includes(String(b.direction))) return { error: 'The direction is devolution, recentralisation or transfer' };
    t.direction = b.direction as TransitionTerms['direction'];
  }
  if (b.target !== undefined && b.target !== null) {
    const x = b.target as { instrument?: unknown; eId?: unknown };
    const instrument = str(x?.instrument, 300), eId = str(x?.eId, 200);
    if (!instrument) return { error: 'Name the law ruled on (its id from the laws register)' };
    t.target = { instrument, ...(eId ? { eId } : {}) };
  }
  if (b.effect !== undefined) {
    if (!JUDICIAL_EFFECTS.some(e => e.key === b.effect)) return { error: `The effect is one of ${JUDICIAL_EFFECTS.map(e => e.key).join(', ')}` };
    t.effect = b.effect as JudicialEffect;
  }
  if (b.finality !== undefined) {
    if (!['final', 'stayed', 'under-appeal'].includes(String(b.finality))) return { error: 'Finality is final, stayed or under-appeal' };
    t.finality = b.finality as Finality;
  }
  if (b.stage !== undefined) {
    const n = Number(b.stage);
    if (!Number.isInteger(n) || n < 1 || n > 7) return { error: 'The stage is 1 to 7' };
    t.stage = n;
  }
  return t;
}

const registered = (id?: string) => !!id && !!getMinistry(id) && getMinistry(id)!.status !== 'merged';
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** What each kind requires of its terms (the record itself; who may record it is checked apart). */
function checkTerms(t: TransitionTerms, now: Date): string | null {
  if (t.effectiveTo && t.effectiveTo < t.effectiveFrom) return 'It cannot end before it applies';
  const rules = transitionsDb().rules;
  const officeInForce = () => {
    const o = t.office ? getOfficeRecord(t.office) : undefined;
    const ot = o ? officeTermsOf(o, now) : null;
    return ot && (!ot.effectiveTo || ot.effectiveTo >= today(now)) ? ot : null;
  };
  switch (t.kind) {
    case 'assumption': {
      if (!officeInForce()) return 'Name an office in force (Offices)';
      if (!t.person?.accountId) return 'Name the official account taking up the office';
      const held = listHoldings(t.office, now).some(h => h.accountId === t.person!.accountId && (h.state === 'active' || h.state === 'waiting'));
      return held ? null : 'Link the official to the office first (Offices → link a holder, or a confirmed succession or acting appointment)';
    }
    case 'acting':
      if (!officeInForce()) return 'Name an office in force (Offices)';
      if (!t.person?.accountId) return 'Name the official account who acts';
      if (!t.effectiveTo) return 'An acting appointment is time-limited: give the date it ends';
      return t.reason ? null : 'Say why someone acts (vacancy, absence, incapacity …), as the office\'s acting rule provides';
    case 'succession':
      if (!officeInForce()) return 'Name an office in force (Offices)';
      if (!t.person) return 'Name the successor as the designated authority determined';
      if (!registered(t.actingInstitution)) return 'Name the institution the law designates to determine the succession';
      return t.trigger ? null : 'Say what triggered the succession (death, abdication, resignation, end of term …)';
    case 'delegation':
      if (!t.delegator?.accountId || !t.person?.accountId) return 'Name the delegating official and the delegate (official accounts)';
      if (t.delegator.accountId === t.person.accountId) return 'An official does not delegate to themselves';
      if (!t.powers?.length) return 'List the powers delegated (as the law names them)';
      if (!t.effectiveTo) return 'A delegation is time-limited: give the date it ends';
      return t.institution && !registered(t.institution) ? 'The institution is not in the register' : null;
    case 'caretaker':
      return t.institution === EXECUTIVE_OFFICE || registered(t.institution) ? null : 'Name the government (the whole government) or the institution in a caretaker period';
    case 'dissolution': {
      if (!registered(t.institution)) return 'Name the institution dissolved';
      if (!registered(t.actingInstitution)) return 'Name the institution whose decision dissolves it';
      if (t.institution === t.actingInstitution) return 'An institution dissolving itself is recorded with the body the law names as deciding (e.g. by its own resolution: name the body that confirms it)';
      const grant = relationshipGrants(now).find(g => g.type === 'dissolve' && g.from === t.actingInstitution && g.to === t.institution);
      return grant ? null : `No approved relationship lets ${nameOf(t.actingInstitution)} dissolve ${nameOf(t.institution)}: record it under Relationships, citing the law (the platform never assumes who may dissolve)`;
    }
    case 'impeachment': {
      if (!officeInForce()) return 'Name the office concerned (Offices)';
      if (!t.person) return 'Name the office-holder concerned';
      const stage = IMPEACHMENT_STAGES.find(s => s.stage === t.stage);
      if (!stage) return 'Give the stage (1 to 7)';
      if (!t.outcome || !stage.outcomes.includes(t.outcome)) return `The outcome of stage ${stage.stage} (${stage.label}) is one of ${stage.outcomes.join(', ')}`;
      return rules.impeachmentStages[stage.stage - 1] ? null : `The nation has not named the institution that records stage ${stage.stage} (${stage.label}): adopt it under the rules for transitions, citing the law`;
    }
    case 'judicial-review': {
      if (!registered(t.actingInstitution) || !institutionBounds(now).judicial.includes(t.actingInstitution!)) return 'Name the court (an institution of judiciary standing, or named for the judiciary or a constitutional court)';
      if (!t.reference) return 'Give the court\'s case reference';
      if (!t.effect) return 'Say what the ruling does: invalid, suspended, read-down, interpretation or remittal';
      if (!t.target && !t.decisions?.length) return 'Name the provision (law and provision) or the decisions ruled on';
      if (t.target) {
        const i = getInstrument(t.target.instrument);
        if (!i) return 'The law ruled on is not in the laws register';
        if (t.target.eId && !i.versions.some(v => v.provisions.some(p => p.eId === t.target!.eId))) return `The law has no provision ${t.target.eId}`;
      }
      return null;
    }
    case 'emergency': {
      const declarer = t.actingInstitution;
      if (!(declarer === EXECUTIVE_OFFICE || registered(declarer))) return 'Name the institution that declares it (the whole government, or a registered institution)';
      if (!rules.emergencyDeclarers.length) return 'The nation has not named who may declare an emergency: adopt it under the rules for transitions, citing the law';
      if (!rules.emergencyDeclarers.includes(declarer!)) return `${nameOf(declarer)} is not among those the nation\'s law lets declare an emergency`;
      if (!t.trigger) return 'Give the trigger the law recognises';
      if (!t.effectiveTo) return 'An emergency is time-limited: give the date it expires (renewal is a new declaration)';
      if (rules.emergencyMaxDays && days(t.effectiveFrom, t.effectiveTo) > rules.emergencyMaxDays) return `The nation\'s law allows at most ${rules.emergencyMaxDays} days before renewal`;
      const known = (getSovereign().regions?.length ? getSovereign().regions! : [...nationRegions()]);
      const unknown = (t.regions ?? []).filter(r => !known.includes(r));
      if (unknown.length) return `Regions come from the nation's list (${unknown.join(', ')} is not on it); leave the list empty for the whole territory`;
      const notSuspended = (t.suspensions ?? []).filter(p => !suspensionInForce(p, t.effectiveFrom));
      if (notSuspended.length) return `No emergency suspension of the authority mapping is in force for ${notSuspended.join(', ')} (suspend it under Permit authorities first; its own rules apply)`;
      if (t.renews) {
        const prev = transitionsDb().events.find(e => e.id === t.renews || e.ref === t.renews);
        if (!prev || prev.kind !== 'emergency' || !currentVersion(prev)) return 'A renewal names the declaration it renews';
        if (statusOf(prev, now) === 'ended') return 'That declaration was revoked: declare a new emergency instead';
      }
      return null;
    }
    case 'competence':
      if (!t.competence) return 'Name the power or service transferred';
      if (!registered(t.actingInstitution)) return 'Name the institution that holds the power from the date';
      if (t.institution && !registered(t.institution)) return 'The institution that held it is not in the register';
      if (t.institution === t.actingInstitution) return 'A transfer moves a power between two institutions';
      return t.direction ? null : 'Say whether it is devolution, recentralisation or another transfer';
    case 'conflict':
      if (!t.person?.accountId) return 'Name the official account declaring the interest';
      return t.interest ? null : 'Describe the interest declared';
  }
}

// ── Who may record and confirm ───────────────────────────────────────────────

const signs = (r?: OfficialRole) => r === 'administrator' || r === 'signatory';
function within(actor: TransitionActor, id: string | undefined, b: Boundaries): boolean {
  if (!id) return !actor.institution;
  if (id === EXECUTIVE_OFFICE) return !actor.institution;
  return reaches({ role: actor.role, institution: actor.institution, bounds: b }, id);
}
const officeInstitution = (t: TransitionTerms, now: Date) => { const o = t.office ? getOfficeRecord(t.office) : undefined; return o ? officeTermsOf(o, now)?.institution : undefined; };
/** The institution whose officials record and confirm this kind (undefined: the whole government). */
function home(t: TransitionTerms, now: Date): string | undefined {
  switch (t.kind) {
    case 'assumption': case 'acting': case 'succession': return officeInstitution(t, now);
    case 'delegation': case 'caretaker': return t.institution;
    case 'dissolution': case 'judicial-review': case 'emergency': return t.actingInstitution;
    case 'impeachment': return transitionsDb().rules.impeachmentStages[(t.stage ?? 1) - 1] || undefined;
    case 'competence': case 'conflict': return undefined;
  }
}

function proposerRefusal(t: TransitionTerms, actor: TransitionActor, b: Boundaries, now: Date): string | null {
  if (!actor.role) return null;
  if (actor.role === 'auditor') return 'Auditors can read records but not change them';
  const h = home(t, now);
  switch (t.kind) {
    case 'assumption': case 'acting': case 'succession': case 'caretaker':
      return actor.role === 'administrator' && within(actor, h, b) ? null : `An administrator of ${h ? nameOf(h) : 'the whole government'} records this (serving the whole government does not reach an independent institution)`;
    case 'delegation':
      if (actor.byId && accountKey(actor.byId) === t.delegator?.accountId) return null;
      return actor.role === 'administrator' && within(actor, h, b) ? null : 'The delegating official, or an administrator of the institution, records a delegation';
    case 'dissolution': case 'emergency':
      return signs(actor.role) && within(actor, h, b) ? null : `An official who can sign at ${nameOf(h)} records this`;
    case 'judicial-review':
      return actor.institution && actor.institution === h && b.judicial.includes(actor.institution) ? null : 'An official of the court records its ruling';
    case 'impeachment':
      return h && actor.institution === h ? null : `An official of ${nameOf(h) || 'the institution the nation names for this stage'} records stage ${t.stage}`;
    case 'competence': {
      const ends = [t.institution, t.actingInstitution].filter((x): x is string => !!x);
      return actor.role === 'administrator' && (!actor.institution || ends.includes(actor.institution)) ? null : 'An administrator of the whole government or of either institution records a transfer of a power';
    }
    case 'conflict':
      return actor.byId && accountKey(actor.byId) === t.person?.accountId ? null : signs(actor.role) ? null : 'The official concerned, an administrator or an official who can sign records a declaration';
  }
}

function confirmerRefusal(t: TransitionTerms, actor: TransitionActor, b: Boundaries, now: Date): string | null {
  if (actor.byId && t.person?.accountId && accountKey(actor.byId) === t.person.accountId) return 'The person the record names does not confirm it';
  if (actor.byId && t.kind === 'delegation' && t.delegator?.accountId === accountKey(actor.byId)) return 'The delegating official does not confirm their own delegation';
  if (!actor.role) return null;
  if (!signs(actor.role)) return 'An administrator or an official who can sign confirms it';
  const h = home(t, now);
  switch (t.kind) {
    case 'judicial-review': case 'impeachment':
      return h && actor.institution === h ? null : `An official who can sign at ${nameOf(h) || 'the institution the nation names'} confirms it`;
    case 'competence': {
      const ind = [t.institution, t.actingInstitution].filter((x): x is string => !!x && b.independent.includes(x) && hasOwnSigners(x));
      if (ind.length) return actor.institution && ind.includes(actor.institution) ? null : `${ind.map(nameOf).join(' or ')} is independent: an official who can sign there confirms the transfer`;
      return within(actor, t.actingInstitution, b) || !actor.institution ? null : 'An official of the institution that receives the power, or of the whole government, confirms it';
    }
    case 'conflict': return null;
    default:
      return within(actor, h, b) ? null : `An official of ${h ? nameOf(h) : 'the whole government'} confirms it`;
  }
}

// ── Views ─────────────────────────────────────────────────────────────────────

export interface TransitionView {
  id: string; ref: string; kind: TransitionKind; kindLabel: string; status: TransitionStatus;
  terms: TransitionTerms; basis: Citation[];
  pending: (PolicyVersion<TransitionTerms> & { expiresAt: string }) | null;
  history: (PolicyVersion<TransitionTerms> & { outcome: string; version?: number })[];
  names: { institution?: string; actingInstitution?: string; office?: string; home?: string };
  stageLabel?: string;
  /** Impeachment: the next stage open, and who records it. */
  next?: { stage: number; label: string; institution?: string };
  holding?: string;
  createdAt: string; createdBy: string;
}

function view(e: TransitionEvent, now: Date): TransitionView {
  const v = currentVersion(e);
  const latest = v ?? e.changes.pending ?? e.changes.history?.at(-1);
  const t = structuredClone(latest!.values);
  let n = 0;
  const status = statusOf(e, now);
  const stage = t.kind === 'impeachment' ? IMPEACHMENT_STAGES.find(s => s.stage === t.stage) : undefined;
  const nextStage = t.kind === 'impeachment' && status === 'in-force' && v ? IMPEACHMENT_STAGES.find(s => s.stage === (v.values.stage ?? 0) + 1) : undefined;
  const o = t.office ? getOfficeRecord(t.office) : undefined;
  const h = home(t, now);
  return {
    id: e.id, ref: e.ref, kind: e.kind, kindLabel: transitionKindLabel(e.kind), status, terms: t, basis: structuredClone(latest!.basis),
    pending: e.changes.pending ? structuredClone(e.changes.pending) : null,
    history: (e.changes.history ?? []).map(x => ({ ...structuredClone(x), ...(x.outcome === 'adopted' ? { version: ++n } : {}) })).reverse(),
    names: {
      ...(t.institution ? { institution: nameOf(t.institution) } : {}), ...(t.actingInstitution ? { actingInstitution: nameOf(t.actingInstitution) } : {}),
      ...(o ? { office: officeTermsOf(o, now)?.title ?? o.recorded?.title ?? o.id } : {}), ...(h ? { home: nameOf(h) } : {}),
    },
    ...(stage ? { stageLabel: `Stage ${stage.stage}: ${stage.label}` } : {}),
    ...(nextStage ? { next: { stage: nextStage.stage, label: nextStage.label, ...(transitionsDb().rules.impeachmentStages[nextStage.stage - 1] ? { institution: nameOf(transitionsDb().rules.impeachmentStages[nextStage.stage - 1]) } : {}) } } : {}),
    ...(e.holding ? { holding: e.holding } : {}),
    createdAt: e.createdAt, createdBy: e.createdBy,
  };
}

const describe = (t: TransitionTerms) => {
  const bits = [transitionKindLabel(t.kind)];
  if (t.office) bits.push(`office ${getOfficeRecord(t.office)?.recorded?.title ?? t.office}`);
  if (t.person) bits.push(t.person.name);
  if (t.institution) bits.push(nameOf(t.institution));
  if (t.actingInstitution) bits.push(`by ${nameOf(t.actingInstitution)}`);
  if (t.stage) bits.push(`stage ${t.stage}${t.outcome ? ` (${t.outcome})` : ''}`);
  if (t.effect) bits.push(`${t.effect}${t.target ? ` ${t.target.instrument}${t.target.eId ? `#${t.target.eId}` : ''}` : ''}`);
  if (t.competence) bits.push(`${t.competence} (${t.direction ?? 'transfer'})`);
  if (t.cases?.length) bits.push(`steps aside from ${t.cases.length} case(s)`);
  if (t.status === 'ended') bits.push(`ended: ${t.endReason ?? ''}`);
  return `${bits.join(' · ')} · from ${t.effectiveFrom}${t.effectiveTo ? ` to ${t.effectiveTo}` : ''}`;
};

export function lapseTransitions(now = new Date()): void {
  for (const e of transitionsDb().events) if (e.changes.pending) lapsePolicy(e.changes, now, audit(e.kind));
  const r = transitionsDb().rules;
  if (r.changes.pending) lapsePolicy(r.changes, now, 'transition.rules');
}

export function listTransitions(filter: { kind?: TransitionKind; office?: string } = {}, now = new Date()): TransitionView[] {
  lapseTransitions(now);
  return transitionsDb().events.filter(e => (!filter.kind || e.kind === filter.kind) && (!filter.office || (currentVersion(e) ?? e.changes.pending ?? e.changes.history?.at(-1))?.values.office === filter.office))
    .map(e => view(e, now)).reverse();
}
export const getTransition = (id: string, now = new Date()): TransitionView | undefined => {
  const e = transitionsDb().events.find(x => x.id === id || x.ref === id);
  return e ? view(e, now) : undefined;
};

// ── Recording ────────────────────────────────────────────────────────────────

/**
 * One official records a transition, citing the laws register (a declaration
 * of interest may be made without a citation: it only restricts the declarant).
 * It waits for a different person (confirmTransition()); a conflict
 * declaration's recusal applies at once.
 */
export function proposeTransition(input: TransitionInput, actor: TransitionActor, now = new Date()): { transition: TransitionView } | { error: string } {
  const kind = input.kind;
  if (!isTransitionKind(kind)) return { error: `The kind is one of ${TRANSITION_KINDS.map(k => k.key).join(', ')}` };
  if (kind === 'impeachment' && input.stage !== undefined && Number(input.stage) !== 1) return { error: 'A proceeding begins at stage 1 (complaint or allegation); later stages are recorded on it in order' };
  const parsed = parse(kind, { ...input, ...(kind === 'impeachment' ? { stage: 1, outcome: 'received' } : {}) }, now);
  if ('error' in parsed) return parsed;
  // What the record needs first (the law, the office, the court …), then who may record it, then a dispute's freeze.
  const why = checkTerms(parsed, now) ?? proposerRefusal(parsed, actor, institutionBounds(now), now) ?? frozen(kind);
  if (why) return { error: why };
  const d = transitionsDb();
  const e: TransitionEvent = { id: `tr-${randomUUID().slice(0, 8)}`, ref: `TR-${now.getUTCFullYear()}-${String(d.seq + 1).padStart(4, '0')}`, kind, createdAt: now.toISOString(), createdBy: actor.by, changes: {} };
  const r = proposePolicy(e.changes, parsed, {}, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: audit(kind),
    context: transitionKindLabel(kind), describe, check: v => checkTerms(v, now), optionalBasis: kind === 'conflict',
  });
  if ('error' in r) return r;
  d.seq += 1;
  d.events.push(e);
  return { transition: view(e, now) };
}

/**
 * The next stage of an impeachment, in order: recorded by an official of the
 * institution the nation names for it, citing the law; never skipped, never
 * after a closing outcome. No outcome changes an account or a holding: a
 * removal is carried out by ending the holding on Offices, citing this record.
 */
export function advanceImpeachment(id: string, input: TransitionInput, actor: TransitionActor, now = new Date()): { transition: TransitionView } | { error: string } {
  lapseTransitions(now);
  const e = transitionsDb().events.find(x => x.id === id || x.ref === id);
  if (!e || e.kind !== 'impeachment') return { error: 'No such impeachment proceeding' };
  if (e.changes.pending) return { error: `Stage ${e.changes.pending.values.stage} is waiting for a second official: confirm or withdraw it first` };
  const v = currentVersion(e);
  if (!v) return { error: 'The complaint has not been confirmed yet' };
  const st = statusOf(e, now);
  if (st !== 'in-force') return { error: st === 'closed' ? 'This proceeding is closed at its last recorded stage' : 'This proceeding is not open' };
  const stage = Number(input.stage ?? (v.values.stage ?? 0) + 1);
  const expected = (v.values.stage ?? 0) + 1;
  if (stage !== expected) return { error: `Stages are recorded in order and none is skipped: the next is stage ${expected} (${IMPEACHMENT_STAGES[expected - 1]?.label ?? 'none'})` };
  const date = input.effectiveFrom === undefined ? today(now) : input.effectiveFrom;
  if (typeof date !== 'string' || !ISO_DATE.test(date) || date < v.values.effectiveFrom) return { error: 'The stage\'s date is YYYY-MM-DD and not before the previous stage' };
  const next: TransitionTerms = { ...structuredClone(v.values), stage, outcome: str(input.outcome, 40), effectiveFrom: date, ...(str(input.reason, 1000) ? { reason: str(input.reason, 1000) } : {}), ...(str(input.reference, 200) ? { reference: str(input.reference, 200) } : {}) };
  const why = proposerRefusal(next, actor, institutionBounds(now), now) ?? frozen('impeachment');
  if (why) return { error: why };
  const r = proposePolicy(e.changes, next, {}, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: audit('impeachment'),
    context: 'Impeachment or removal', describe, check: x => checkTerms(x, now),
  });
  if ('error' in r) return r;
  return { transition: view(e, now) };
}

/**
 * End a transition early, with reasons, as a new version a different person
 * confirms: revoke a delegation, end an acting appointment or a caretaker
 * period, revoke an emergency, lift a recusal, discontinue a proceeding.
 * It stays in force until confirmed.
 */
export function endTransition(id: string, input: TransitionInput, actor: TransitionActor, now = new Date()): { transition: TransitionView } | { error: string } {
  lapseTransitions(now);
  const e = transitionsDb().events.find(x => x.id === id || x.ref === id);
  if (!e) return { error: 'No such transition' };
  if (e.changes.pending) return { error: 'A change to it is waiting for a second official: confirm or withdraw it first' };
  const v = currentVersion(e);
  if (!v) return { error: 'Only a confirmed record is ended; a waiting one is withdrawn' };
  if (['ended', 'closed'].includes(statusOf(e, now))) return { error: 'It has already ended' };
  if (e.kind === 'judicial-review') return { error: 'A court\'s ruling is not ended here: record the later ruling (appeal, stay) as a new court ruling' };
  const reason = str(input.reason, 500);
  if (!reason) return { error: 'Say why it ends' };
  const date = input.effectiveTo === undefined || input.effectiveTo === '' ? today(now) : input.effectiveTo;
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return { error: 'The end date is YYYY-MM-DD' };
  const ended: TransitionTerms = { ...structuredClone(v.values), status: 'ended', endReason: reason, effectiveTo: date < v.values.effectiveFrom ? v.values.effectiveFrom : date };
  // The same officials who record it ask for it to end (the delegator, the declarant, the declaring institution …).
  const why = proposerRefusal(ended, actor, institutionBounds(now), now) ?? frozen(e.kind);
  if (why) return { error: why };
  // A recusal is lifted by two people, never by the recused official alone: the confirmer is never the person named.
  const r = proposePolicy(e.changes, ended, {}, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: audit(e.kind),
    context: transitionKindLabel(e.kind), describe, check: () => null,
  });
  if ('error' in r) return r;
  return { transition: view(e, now) };
}

/** A different person confirms the waiting version: it is adopted (acting appointments and successions create their holding). */
export function confirmTransition(id: string, actor: TransitionActor, now = new Date()): { transition: TransitionView } | { error: string } {
  lapseTransitions(now);
  const e = transitionsDb().events.find(x => x.id === id || x.ref === id);
  if (!e) return { error: 'No such transition' };
  const p = e.changes.pending;
  if (!p) return { error: 'Nothing is waiting to be confirmed (a proposal lapses after the waiting period)' };
  const t = p.values;
  const why = confirmerRefusal(t, actor, institutionBounds(now), now) ?? frozen(e.kind)
    // A version that records a fact (not an ending) is checked again: the law, the office, the relationship may have changed meanwhile.
    ?? (t.status === 'recorded' ? checkTerms(t, now) : null);
  if (why) return { error: why };
  const done = confirmPolicy(e.changes, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: audit(e.kind), describe, adopt: () => undefined });
  if ('error' in done) return done;
  if ((e.kind === 'acting' || e.kind === 'succession') && t.status === 'recorded' && !e.holding && t.person?.accountId && t.office) {
    const h = holdingFromTransition({
      officeId: t.office, accountId: t.person.accountId, from: t.effectiveFrom, ...(t.effectiveTo ? { to: t.effectiveTo } : {}), acting: e.kind === 'acting', basis: done.basis,
      event: e.id, ref: e.ref, proposedBy: p.by, ...(p.byId ? { proposedById: p.byId } : {}), confirmedBy: actor.by, ...(actor.byId ? { confirmedById: actor.byId } : {}),
      independence: independenceOf(p.byId, actor.byId),
    }, now);
    if (!('error' in h)) e.holding = h.id;
  }
  if (t.status === 'ended' && e.holding) endTransitionHolding(e.holding, t.effectiveTo ?? today(now), `${e.ref} ended: ${t.endReason ?? ''}`, actor.by, now);
  return { transition: view(e, now) };
}

/** The proposer (or an administrator) withdraws a waiting version; kept. A declaration of interest is never withdrawn by one person. */
export function withdrawTransition(id: string, actor: TransitionActor, reason?: string): { transition: TransitionView } | { error: string } {
  const e = transitionsDb().events.find(x => x.id === id || x.ref === id);
  if (!e) return { error: 'No such transition' };
  const p = e.changes.pending;
  if (!p) return { error: 'Nothing is waiting' };
  if (e.kind === 'conflict' && !currentVersion(e)) return { error: 'A declaration of interest is kept and its recusal stands: ask for it to be lifted (a different person confirms)' };
  if (actor.role && actor.role !== 'administrator' && p.byId !== actor.byId) return { error: 'The proposer or an administrator withdraws a waiting record' };
  const w = withdrawPolicy(e.changes, { by: actor.by, ...(reason ? { reason } : {}), audit: audit(e.kind) });
  if ('error' in w) return w;
  return { transition: view(e, new Date()) };
}

// ── The country's rules ──────────────────────────────────────────────────────

function checkRules(v: TransitionRulesValues): string | null {
  if (!Array.isArray(v.impeachmentStages) || v.impeachmentStages.length !== 7) return 'Name an institution (or none) for each of the seven impeachment stages';
  const bad = v.impeachmentStages.find(x => x && !registered(x));
  if (bad) return `${bad} is not in the register`;
  if (!Number.isInteger(v.emergencyMaxDays) || v.emergencyMaxDays < 0 || v.emergencyMaxDays > 3650) return 'The longest emergency is a whole number of days (0: not set)';
  const badDecl = v.emergencyDeclarers.find(x => x !== EXECUTIVE_OFFICE && !registered(x));
  if (badDecl) return `${badDecl} is not in the register`;
  return null;
}
const describeRules = (v: TransitionRulesValues) =>
  `caretaker restricts ${v.caretakerProcedures.length + v.caretakerDecisions.length + v.caretakerDirectives.length} kind(s) · impeachment stages named ${v.impeachmentStages.filter(Boolean).length}/7 · emergency ${v.emergencyMaxDays ? `at most ${v.emergencyMaxDays} days` : 'no maximum set'}, declared by ${v.emergencyDeclarers.map(nameOf).join(', ') || 'nobody named'}`;
const rulesValues = (): TransitionRulesValues => {
  const r = transitionsDb().rules;
  return structuredClone({ caretakerProcedures: r.caretakerProcedures, caretakerDecisions: r.caretakerDecisions, caretakerDirectives: r.caretakerDirectives,
    impeachmentStages: r.impeachmentStages, emergencyMaxDays: r.emergencyMaxDays, emergencyDeclarers: r.emergencyDeclarers });
};

/** An administrator proposes the country's rules for transitions, citing the law; values left out are kept. */
export function proposeTransitionRules(input: TransitionInput, actor: TransitionActor, now = new Date()) {
  const change: Partial<TransitionRulesValues> = {};
  for (const k of ['caretakerProcedures', 'caretakerDecisions', 'caretakerDirectives', 'emergencyDeclarers'] as const) {
    if (input[k] === undefined) continue;
    const l = list(input[k], 50, 120);
    if ('error' in l) return { error: `${k}: ${l.error}` };
    change[k] = l;
  }
  if (input.impeachmentStages !== undefined) {
    if (!Array.isArray(input.impeachmentStages) || input.impeachmentStages.length !== 7) return { error: 'impeachmentStages lists seven institution ids (\'\' where none is named)' };
    change.impeachmentStages = (input.impeachmentStages as unknown[]).map(x => str(x, 120));
  }
  if (input.emergencyMaxDays !== undefined) change.emergencyMaxDays = Number(input.emergencyMaxDays);
  const r = transitionsDb().rules;
  return proposePolicy(r.changes, rulesValues(), change, input.legalBasis, {
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, pendingHours: dualControlPendingHours(), audit: 'transition.rules',
    context: 'Rules for transitions and emergencies', check: checkRules, describe: describeRules,
  });
}
export function confirmTransitionRules(actor: TransitionActor, now = new Date()) {
  const r = transitionsDb().rules;
  return confirmPolicy(r.changes, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), now, audit: 'transition.rules', describe: describeRules,
    adopt: v => { Object.assign(r, structuredClone(v.values), { adopted: true }); } });
}
export const withdrawTransitionRules = (actor: TransitionActor, reason?: string) => withdrawPolicy(transitionsDb().rules.changes, { by: actor.by, ...(reason ? { reason } : {}), audit: 'transition.rules' });

// ── What the screens and the onboarding hub read ─────────────────────────────

/** Sealed decisions a court's ruling in force touches (a provision they cite, or the decision itself): flagged for legal assessment, never changed. */
export function flaggedDecisions(now = new Date()): { decision: string; subject: string; institution: string; at: string; ruling: string; effect: JudicialEffect; madeBeforeEffect: boolean; citation?: string }[] {
  const rulings = inForce('judicial-review', now);
  if (!rulings.length) return [];
  const out: ReturnType<typeof flaggedDecisions> = [];
  for (const d of listDecisions()) {
    for (const { event, terms } of rulings) {
      const direct = (terms.decisions ?? []).includes(d.id);
      const cited = terms.target ? d.content.citations.find(c => c.instrument === terms.target!.instrument && (!terms.target!.eId || c.eId === terms.target!.eId)) : undefined;
      if (!direct && !cited) continue;
      out.push({ decision: d.id, subject: d.content.subject.ref ?? d.content.subject.id, institution: d.content.institution.name, at: d.content.at, ruling: event.ref, effect: terms.effect!,
        madeBeforeEffect: d.content.at.slice(0, 10) < terms.effectiveFrom, ...(cited ? { citation: `${cited.title ?? cited.instrument} ${cited.num ?? cited.eId}` } : {}) });
    }
  }
  return out;
}

/** Warnings the screen shows: never an invented restriction, only what the nation has not yet set. */
export function transitionWarnings(now = new Date()): string[] {
  const out: string[] = [];
  const r = transitionsDb().rules;
  const caretakers = caretakersInForce(now);
  if (caretakers.length && !(r.caretakerProcedures.length + r.caretakerDecisions.length + r.caretakerDirectives.length)) {
    out.push(`A caretaker period is in force (${caretakers.map(c => nameOf(c.institution)).join(', ')}), but the nation has adopted no caretaker restrictions: nothing is restricted. The platform never invents one; adopt the restrictions the law supports under the rules below.`);
  }
  if (inForce('emergency', now).length && !r.emergencyMaxDays) out.push('An emergency is in force and the nation has set no longest period before renewal: each declaration carries its own expiry.');
  for (const h of pastTermHoldings(now)) out.push(`${h.holderName}'s term as ${h.title} ended on ${h.termEnded}: no longer in force. Record what the law says follows (an end, a new holding, an acting appointment or a succession).`);
  return out;
}

/** Everything the screen needs, in one read. */
export function transitionsOverview(now = new Date()) {
  lapseTransitions(now);
  const r = transitionsDb().rules;
  const all = listTransitions({}, now);
  return {
    notice: LEGAL_EVENTS_NOTICE,
    kinds: TRANSITION_KINDS, stages: IMPEACHMENT_STAGES, effects: JUDICIAL_EFFECTS, closingOutcomes: CLOSING_OUTCOMES,
    transitions: all,
    inForce: {
      caretaker: caretakersInForce(now).map(c => ({ ...c, name: nameOf(c.institution) })),
      emergencies: inForce('emergency', now).map(x => ({ id: x.event.id, ref: x.event.ref, declaredBy: nameOf(x.terms.actingInstitution), regions: x.terms.regions ?? [], from: x.terms.effectiveFrom, expires: x.terms.effectiveTo ?? '' })),
      rulings: inForce('judicial-review', now).map(x => ({ id: x.event.id, ref: x.event.ref, court: nameOf(x.terms.actingInstitution), effect: x.terms.effect, target: x.terms.target ?? null, from: x.terms.effectiveFrom, finality: x.terms.finality ?? 'final' })),
      competences: competencesInForce(now).map(c => ({ ...c, holderName: nameOf(c.holder), previousName: nameOf(c.previous) })),
    },
    rules: { ...rulesValues(), adopted: r.adopted, changes: structuredClone(r.changes) },
    reference: { caretaker: REFERENCE_CARETAKER_RESTRICTIONS, note: 'Reference drafts, not approved: the nation adopts its own, in its own procedure, decision and directive keys, citing its law.' },
    warnings: transitionWarnings(now),
    flagged: flaggedDecisions(now),
    pastTerm: pastTermHoldings(now),
    regions: getSovereign().regions?.length ? getSovereign().regions! : [...nationRegions()],
    institutions: listMinistries().filter(m => m.status === 'active').map(m => ({ id: m.id, name: m.name })),
    emptyRules: EMPTY_RULES,
  };
}

/** Transitions and rule changes waiting for a second official (the onboarding hub). */
export function waitingTransitions(now = new Date()): { id: string; what: string; by: string; at: string }[] {
  lapseTransitions(now);
  const out = transitionsDb().events.filter(e => e.changes.pending).map(e => ({ id: e.id, what: `${e.ref}: ${describe(e.changes.pending!.values)}`, by: e.changes.pending!.by, at: e.changes.pending!.at }));
  const p = transitionsDb().rules.changes.pending;
  if (p) out.push({ id: 'rules', what: `Rules for transitions and emergencies: ${describeRules(p.values)}`, by: p.by, at: p.at });
  return out;
}

/** How many versions of a transition have been adopted (a check used by tests and screens). */
export const adoptedCount = (id: string) => { const e = transitionsDb().events.find(x => x.id === id); return e ? adoptedVersions(e).length : 0; };
export { judicialEffectsOn };
