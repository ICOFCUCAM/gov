// Transitions and emergencies as recorded legal events
// (docs/CONSTITUTIONAL_ARCHITECTURE.md §4.1–4.13, §5.1; plan phase 6): the
// store and the reads every other module needs from it. Kept apart from
// ./events.ts (recording and confirming) so the modules that only ask "is
// this official recused on this case?" (the case engine), "is a caretaker
// status or a court's ruling in force?" (decision and directive checks) or
// "which competence allocation is in force?" (the constitutional profile)
// import nothing else: no case engine, no audit chain, no office register.
//
// What is kept: each transition is one record with its versions
// (lib/law/policy-change.ts): the first adopted version is the event as
// recorded by one official and confirmed by a different person, citing the
// laws register; ending it early (revoking a delegation, lifting a recusal,
// revoking an emergency) or, for impeachment, each further stage is a new
// version confirmed the same way. Nothing is deleted or rewritten: lapsed and
// withdrawn proposals are kept beside the adopted versions.
//
// These are the nation's legal events: the platform records them and enforces
// the few consequences that are mechanical (a recusal, a caretaker
// restriction the nation listed, a court's ruling that a provision is invalid
// or suspended); it never decides one, never infers one (an election result,
// a family relationship, a complaint) and ships none, in any mode.

import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import type { Citation } from '@/lib/law/register';
import type { PolicyChanges, PolicyVersion } from '@/lib/law/policy-change';

export type TransitionKind =
  | 'assumption' | 'acting' | 'delegation' | 'caretaker' | 'dissolution' | 'impeachment'
  | 'judicial-review' | 'emergency' | 'succession' | 'competence' | 'conflict';

export const TRANSITION_KINDS: { key: TransitionKind; label: string; means: string }[] = [
  { key: 'assumption', label: 'Taking up office', means: 'An office-holder takes up the office (oath or assumption of office) on the date the law requires.' },
  { key: 'acting', label: 'Acting appointment', means: 'Someone acts in an office for a limited time, under the office\'s acting rule.' },
  { key: 'delegation', label: 'Delegation', means: 'An official delegates named powers to another for a limited time; revocable with reasons.' },
  { key: 'succession', label: 'Succession', means: 'The authority the law designates determines who succeeds to an office, from a date.' },
  { key: 'caretaker', label: 'Caretaker period', means: 'A government or institution acts in a caretaker capacity: the restrictions the nation\'s law sets apply to it.' },
  { key: 'dissolution', label: 'Dissolution', means: 'An institution (usually a chamber) is dissolved by the body the law empowers.' },
  { key: 'impeachment', label: 'Impeachment or removal', means: 'Seven separate stages, each recorded by the institution the nation names; an allegation never removes anyone.' },
  { key: 'judicial-review', label: 'Court ruling on a law or decision', means: 'A court\'s binding ruling that a provision or decision is invalid, suspended or to be read down. Affected records are flagged, never deleted.' },
  { key: 'emergency', label: 'State of emergency', means: 'A time-limited legal status over a territory. It lapses at expiry and never lifts audit, access logging, two-official rules or privacy rules.' },
  { key: 'competence', label: 'Transfer of a power', means: 'A power or service moves between national and regional institutions (devolution or recentralisation), as a new version from a date.' },
  { key: 'conflict', label: 'Conflict of interest', means: 'An official declares an interest and steps aside from the cases it touches. A declaration is not proof of wrongdoing.' },
];
export const isTransitionKind = (v: unknown): v is TransitionKind => TRANSITION_KINDS.some(k => k.key === v);
export const transitionKindLabel = (k: TransitionKind) => TRANSITION_KINDS.find(x => x.key === k)?.label ?? k;

/** The seven separate stages of impeachment and removal (guidance §4.6); who records each is the nation's (rules). */
export const IMPEACHMENT_STAGES: { stage: number; label: string; outcomes: string[] }[] = [
  { stage: 1, label: 'Complaint or allegation', outcomes: ['received'] },
  { stage: 2, label: 'Investigation or preliminary review', outcomes: ['proceed', 'dismissed'] },
  { stage: 3, label: 'Formal initiation of proceedings', outcomes: ['initiated', 'not-initiated'] },
  { stage: 4, label: 'Vote or other required decision', outcomes: ['carried', 'defeated'] },
  { stage: 5, label: 'Judicial or constitutional determination', outcomes: ['upheld', 'quashed', 'not-required'] },
  { stage: 6, label: 'Legal consequence (suspension, removal or other)', outcomes: ['removed', 'suspended', 'other-consequence', 'no-consequence'] },
  { stage: 7, label: 'Appeal or later review', outcomes: ['confirmed', 'reversed', 'varied'] },
];
/** Outcomes that close a proceeding at their stage (no later stage follows; an appeal may still follow stage 6). */
export const CLOSING_OUTCOMES = ['dismissed', 'not-initiated', 'defeated', 'quashed', 'confirmed', 'reversed', 'varied'];

export const JUDICIAL_EFFECTS: { key: JudicialEffect; label: string; blocks: boolean }[] = [
  { key: 'invalid', label: 'Declared invalid', blocks: true },
  { key: 'suspended', label: 'Suspended', blocks: true },
  { key: 'read-down', label: 'To be read down (narrowed)', blocks: false },
  { key: 'interpretation', label: 'Binding interpretation', blocks: false },
  { key: 'remittal', label: 'Remitted for a new decision', blocks: false },
];
export type JudicialEffect = 'invalid' | 'suspended' | 'read-down' | 'interpretation' | 'remittal';
export type Finality = 'final' | 'stayed' | 'under-appeal';

/** A person a transition names: an official account where there is one, and the name as recorded. */
export type NamedPerson = { accountId?: string; name: string };

/** What a version of a transition says. A type alias so withDefaults() and policy-change take it as a plain record. */
export type TransitionTerms = {
  kind: TransitionKind;
  /** recorded: in force between its dates; ended: ended early (revoked, lifted), with a reason. */
  status: 'recorded' | 'ended';
  effectiveFrom: string;
  /** Last day it applies (inclusive): an acting appointment's or delegation's end, an emergency's expiry. */
  effectiveTo?: string;
  /** The institution concerned: the caretaker government (or `executive-office`), the dissolved body, a competence's previous holder. */
  institution?: string;
  /** The institution that acts: dissolves, determines a succession, declares an emergency, the court, a competence's new holder. */
  actingInstitution?: string;
  office?: string;
  /** The acting holder, the delegate, the successor, the subject of an impeachment, the declarant of a conflict, the one taking up office. */
  person?: NamedPerson;
  delegator?: NamedPerson;
  /** Delegated powers; an emergency's exceptional powers (as the declaration words them; never a platform permission). */
  powers?: string[];
  /** Regions from the nation's list; empty means the whole territory. */
  regions?: string[];
  /** A competence: the power or service affected (a register, a procedure family, a service). */
  competence?: string;
  direction?: 'devolution' | 'recentralisation' | 'transfer';
  /** Judicial review: the provision ruled on (eId absent: the whole instrument) and decisions ruled on directly. */
  target?: { instrument: string; eId?: string };
  decisions?: string[];
  effect?: JudicialEffect;
  finality?: Finality;
  /** The court's case reference; a dissolution's or succession's instrument; a conflict's reference. */
  reference?: string;
  /** Conflict of interest: the case ids or references the declarant steps aside from, and the interest declared. */
  cases?: string[];
  interest?: string;
  /** Impeachment: the stage this version records, and its outcome. */
  stage?: number;
  outcome?: string;
  /** Emergency: the declaration it renews, the trigger the law recognises, the permit types whose authority mapping is suspended under it. */
  renews?: string;
  trigger?: string;
  suspensions?: string[];
  /** Transfers of records, assets, staff; election deadline after a dissolution; oversight and reporting; reasons. */
  arrangements?: string;
  reason?: string;
  endReason?: string;
};

export interface TransitionEvent {
  id: string;
  /** TR-2026-0001 … in the order recorded. */
  ref: string;
  kind: TransitionKind;
  createdAt: string; createdBy: string;
  changes: PolicyChanges<TransitionTerms>;
  /** The office holding an adopted acting appointment or succession created (lib/nation/office-register.ts). */
  holding?: string;
}

/** The country's own rules for transitions (a rule set changed through policy-change.ts; none ships). */
export type TransitionRulesValues = {
  /** Caretaker restrictions the nation's law or convention supports: procedure keys (or families, `procurement`) whose decisions are refused … */
  caretakerProcedures: string[];
  /** … decision keys (`appoint`, `award`) refused under any procedure … */
  caretakerDecisions: string[];
  /** … and kinds of directive (`policy`, `budget`) a caretaker issuer may not sign. */
  caretakerDirectives: string[];
  /** The institution that records each of the seven impeachment stages ('' where the nation has named none). */
  impeachmentStages: string[];
  /** The longest an emergency declaration may run before it must be renewed (days); 0 while the nation has set none. */
  emergencyMaxDays: number;
  /** The institutions that may declare an emergency (`executive-office` for the whole government); empty: not named. */
  emergencyDeclarers: string[];
};
export interface TransitionRules extends TransitionRulesValues {
  /** False while these are the platform's empty defaults, not the nation's adopted rules. */
  adopted: boolean;
  changes: PolicyChanges<TransitionRulesValues>;
}
export const EMPTY_RULES: TransitionRulesValues = { caretakerProcedures: [], caretakerDecisions: [], caretakerDirectives: [], impeachmentStages: ['', '', '', '', '', '', ''], emergencyMaxDays: 0, emergencyDeclarers: [] };

/**
 * Reference drafts (unapproved; never applied): what guidance §4.2 lists as
 * restrictions a caretaker period may carry. A nation adopts its own list, in
 * its own procedure and decision keys, citing its law; until it does, a
 * caretaker period restricts nothing and the screen says so.
 */
export const REFERENCE_CARETAKER_RESTRICTIONS = [
  'New appointments', 'Major contracts and long-term commitments', 'Certain regulations or policy changes', 'Extraordinary spending', 'Sensitive transfers of powers',
];

type Store = { events: TransitionEvent[]; seq: number; rules: TransitionRules };
const seed = (): Store => ({ events: [], seq: 0, rules: { ...structuredClone(EMPTY_RULES), adopted: false, changes: {} } });
const g = globalThis as unknown as { __civicosTransitions?: Store };
// Every installation starts with none: no transition, no rule, no reference procedure approved (production included).
export const transitionsDb = (): Store => touch('__civicosTransitions', g.__civicosTransitions = withDefaults(g.__civicosTransitions ??= seed(), seed()));
export function resetTransitions(): void { g.__civicosTransitions = undefined; }

const today = (now: Date) => now.toISOString().slice(0, 10);
type Adopted = PolicyVersion<TransitionTerms> & { outcome: string };
export const adoptedVersions = (e: TransitionEvent): Adopted[] => (e.changes.history ?? []).filter(h => h.outcome === 'adopted') as Adopted[];
/** The latest adopted version (an event's terms as they stand). */
export const currentVersion = (e: TransitionEvent): Adopted | undefined => adoptedVersions(e).at(-1);

export type TransitionStatus = 'waiting' | 'scheduled' | 'in-force' | 'expired' | 'ended' | 'closed' | 'withdrawn' | 'lapsed';

/** Where a transition stands on a date: computed, so an emergency lapses at its expiry without a job. */
export function statusOf(e: TransitionEvent, now = new Date()): TransitionStatus {
  const v = currentVersion(e);
  if (!v) {
    if (e.changes.pending) return 'waiting';
    return (e.changes.history?.at(-1)?.outcome as 'withdrawn' | 'lapsed' | undefined) ?? 'withdrawn';
  }
  const t = v.values;
  if (t.status === 'ended') return 'ended';
  if (t.kind === 'impeachment' && t.outcome && (CLOSING_OUTCOMES.includes(t.outcome) || t.stage === 7)) return 'closed';
  const on = today(now);
  if (t.effectiveFrom > on) return 'scheduled';
  if (t.effectiveTo && t.effectiveTo < on) return 'expired';
  return 'in-force';
}

/** Adopted transitions of a kind in force on a date. */
export function inForce(kind: TransitionKind, now = new Date()): { event: TransitionEvent; terms: TransitionTerms; basis: Citation[] }[] {
  return transitionsDb().events.filter(e => e.kind === kind && statusOf(e, now) === 'in-force')
    .map(e => { const v = currentVersion(e)!; return { event: e, terms: v.values, basis: v.basis }; });
}

/** The country's transition rules as they stand (empty and not adopted until the nation adopts its own). */
export const transitionRules = (): TransitionRules => structuredClone(transitionsDb().rules);

// ── The mechanical consequences, read by the modules that enforce them ──────

/**
 * The official accounts recused from a case (by id or reference): every
 * conflict-of-interest declaration naming it, from the moment it is declared
 * (a recusal restricts, so it applies while it waits for acknowledgment, and
 * still when nobody acknowledged it in time) until a confirmed version lifts it. The case engine passes these to
 * caseActRefusal() (lib/auth/roles.ts).
 */
export function recusedOn(caseIds: string[], now = new Date()): string[] {
  const out = new Set<string>();
  const ids = caseIds.filter(Boolean);
  for (const e of transitionsDb().events) {
    if (e.kind !== 'conflict') continue;
    // Lifted (a confirmed later version) or past its end date: no longer recused. Waiting for acknowledgment, or
    // never acknowledged (lapsed): still recused; a declaration is never withdrawn by one person (events.ts).
    const st = statusOf(e, now);
    if (st === 'ended' || st === 'expired') continue;
    const v = currentVersion(e)?.values ?? e.changes.pending?.values ?? e.changes.history?.at(-1)?.values;
    if (!v?.person?.accountId || !(v.cases ?? []).some(c => ids.includes(c))) continue;
    // As the account id and as the session subject of a platform account (`local:<id>`), which case rules compare.
    out.add(v.person.accountId);
    out.add(`local:${v.person.accountId}`);
  }
  return [...out];
}

/** A court's ruling in force that touches a cited provision (its eId, or the whole instrument). */
export interface JudicialHit { event: string; ref: string; court?: string; reference?: string; effect: JudicialEffect; from: string; finality: Finality; target: { instrument: string; eId?: string }; blocks: boolean }

/** The rulings recorded as in force on a date that touch any of these provisions. A stayed ruling is shown but never blocks. */
export function judicialEffectsOn(citations: { instrument: string; eId?: string }[], now = new Date()): JudicialHit[] {
  const out: JudicialHit[] = [];
  for (const { event, terms } of inForce('judicial-review', now)) {
    const t = terms.target;
    if (!t || !terms.effect) continue;
    if (!citations.some(c => c.instrument === t.instrument && (!t.eId || t.eId === c.eId))) continue;
    const finality = terms.finality ?? 'final';
    out.push({ event: event.id, ref: event.ref, ...(terms.actingInstitution ? { court: terms.actingInstitution } : {}), ...(terms.reference ? { reference: terms.reference } : {}),
      effect: terms.effect, from: terms.effectiveFrom, finality, target: t, blocks: finality !== 'stayed' && !!JUDICIAL_EFFECTS.find(x => x.key === terms.effect)?.blocks });
  }
  return out;
}

/** The caretaker periods in force: the institution (or `executive-office`, the whole government) each covers. */
export const caretakersInForce = (now = new Date()) => inForce('caretaker', now).map(x => ({ id: x.event.id, ref: x.event.ref, institution: x.terms.institution ?? '', from: x.terms.effectiveFrom, ...(x.terms.effectiveTo ? { to: x.terms.effectiveTo } : {}) }));

/** The competence allocations in force: for each power, the latest adopted transfer whose date has come. */
export function competencesInForce(now = new Date()): { competence: string; holder: string; previous?: string; regions: string[]; from: string; event: string; ref: string; direction?: string }[] {
  const latest = new Map<string, ReturnType<typeof competencesInForce>[number]>();
  const on = today(now);
  const all = transitionsDb().events.filter(e => e.kind === 'competence')
    .flatMap(e => { const v = currentVersion(e); return v && v.values.status === 'recorded' && v.values.effectiveFrom <= on ? [{ e, t: v.values }] : []; })
    .sort((a, b) => a.t.effectiveFrom.localeCompare(b.t.effectiveFrom) || a.e.ref.localeCompare(b.e.ref));
  for (const { e, t } of all) {
    const key = `${t.competence}|${[...(t.regions ?? [])].sort().join(',')}`;
    latest.set(key, { competence: t.competence ?? '', holder: t.actingInstitution ?? '', ...(t.institution ? { previous: t.institution } : {}), regions: [...(t.regions ?? [])], from: t.effectiveFrom, event: e.id, ref: e.ref, ...(t.direction ? { direction: t.direction } : {}) });
  }
  return [...latest.values()];
}
/** How many competence transfers have been adopted (the profile part's version). */
export const competenceVersions = () => transitionsDb().events.filter(e => e.kind === 'competence').reduce((n, e) => n + adoptedVersions(e).length, 0);
/** Competence transfers waiting for a second official. */
export const competencesWaiting = () => transitionsDb().events.filter(e => e.kind === 'competence' && e.changes.pending).length;
