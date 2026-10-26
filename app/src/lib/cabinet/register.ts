// The Cabinet register (plan step I5; institutional specification Part 1 §3;
// field series Part 2 §2.2): Cabinet submissions with their versions and
// reviews, the decisions the collective body takes (the exact text, its legal
// category and basis, the meeting's quorum and vote under the nation's
// adopted rules, the officials who recorded and confirmed it, every
// correction as a new version), the controlled distribution of each decision,
// and the action register: what each decision asks of which institution, by
// when, its progress and its closure with evidence. Kept for the cabinet
// office the nation names (deployment-profile slot `cabinetOffice`, shipped
// empty). Changed only by the effects of the Cabinet procedure
// (lib/cabinet/procedures.ts) and, outside it, by the assigned institution's
// own progress report and proposed closure of an action, confirmed by a
// different official of the cabinet office, and by the Cabinet rules set
// through lib/law/policy-change.ts (register-writes.test.ts lists them).
//
// A Cabinet decision is not a statute, an appropriation or an executive order:
// its legal category is recorded with it, and an action never transfers the
// receiving institution's powers. An action addressed to an independent
// institution, or one institution's action to another, is an instruction only
// under an approved `instruct` relationship (directiveTargetRefusal() in
// lib/auth/roles.ts, read from the relationships in force); otherwise it is
// recorded as a request. Minutes and decisions are neither universally public
// nor universally secret: each decision carries its classification and the
// disclosure the publishing official records with reasons.
//
// The quorum and the vote come only from the nation's adopted Cabinet rules
// (the members counted, the quorum and the decision rule; shipped unset): a
// production installation refuses to record a decision without them; a
// demonstration records that none was adopted.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { personOf } from '@/lib/data/dual-control';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';

export interface Who { id?: string; name: string }
export interface Submission {
  id: string; ref: string; sponsor: string; title: string; decisionRequested: string; classification: string;
  basis: Citation[];
  fiscal?: string;
  versions: { n: number; at: string; by: string; reason: string; case: string }[];
  legalReview?: { by: Who; at: string; note: string };
  fiscalReview?: { by: Who; at: string; note: string };
  conflicts?: string;
  state: 'submitted' | 'returned' | 'reviewed' | 'circulated' | 'decided' | 'withdrawn';
  case: string; at: string; sample?: true;
}
export interface Vote { present: number; quorum: number; members: number; rule: string; consensus: boolean; for?: number; against?: number; abstain?: number; rulesVersion?: number; met: boolean }
export interface DecisionVersion { n: number; at: string; text: string; reason: string; by: Who; confirmedBy?: Who; case: string; decision?: string }
export interface CabinetDecision {
  id: string; ref: string; submission: string; title: string;
  /** What kind of act it is under the nation's law (a decision is never itself a statute or an appropriation). */
  legalCategory: string;
  basis: Citation[];
  meetingDate: string; vote: Vote | { notAdopted: string };
  effectiveDate?: string; implementationOwner?: string;
  classification: string;
  disclosure?: { state: 'published' | 'withheld'; reasons: string; by: Who; at: string };
  distribution: { to: string; at: string; by: string; version: number }[];
  versions: DecisionVersion[];
  case: string; sample?: true;
}
export interface CabinetAction {
  id: string; ref: string; decision: string; institution: string; description: string; due?: string;
  /** An instruction (under an approved instruct relationship, or to the executive's own institutions) or, otherwise, a request. */
  kind: 'instruction' | 'request';
  state: 'open' | 'closure-proposed' | 'closed' | 'returned';
  updates: { at: string; by: Who; text: string }[];
  closure?: { proposedBy: Who; at: string; evidence: string; confirmedBy?: Who; confirmedAt?: string; returned?: { by: Who; at: string; reasons: string } };
  at: string; sample?: true;
}
/** The nation's Cabinet rules: how many members, the quorum and the decision rule. None ships. */
export interface CabinetRules { members?: number; quorum?: { numerator: number; denominator: number }; rule?: 'consensus' | 'simple-majority' | 'qualified-majority'; qualified?: { numerator: number; denominator: number } }

interface CabinetDb { submissions: Submission[]; decisions: CabinetDecision[]; actions: CabinetAction[]; rules: CabinetRules & { version: number }; ruleChanges: PolicyChanges<CabinetRules>; subSeq: number; decSeq: number; actSeq: number }
const g = globalThis as unknown as { __civicosCabinet?: CabinetDb };
const db = (): CabinetDb => {
  const d = touch('__civicosCabinet', g.__civicosCabinet ??= { submissions: [], decisions: [], actions: [], rules: { version: 0 }, ruleChanges: {}, subSeq: 0, decSeq: 0, actSeq: 0 });
  d.submissions ??= []; d.decisions ??= []; d.actions ??= []; d.rules ??= { version: 0 }; d.ruleChanges ??= {};
  return d;
};
export function resetCabinet(): void { g.__civicosCabinet = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const ok = (s: unknown, max = 200): string => (typeof s === 'string' ? s.trim().slice(0, max) : '');
const counters = () => db() as unknown as Record<string, unknown>;
export function samePerson(a: Who | undefined, b: Who | undefined): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) {
    if (a.id === b.id) return true;
    const x = personOf(a.id), y = personOf(b.id);
    return x.bound && y.bound && x.key === y.key;
  }
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
export const CLASSIFICATIONS = ['public', 'restricted', 'confidential', 'secret'];

// ── The Cabinet rules (a country rule set: lib/law/policy-change.ts) ─────────

const RULE_AUDIT = 'cabinet.rules';
const fraction = (f: unknown): f is { numerator: number; denominator: number } => {
  const x = f as { numerator?: unknown; denominator?: unknown } | undefined;
  return !!x && Number.isInteger(x.numerator) && Number.isInteger(x.denominator) && (x.numerator as number) > 0 && (x.denominator as number) >= (x.numerator as number);
};
function checkRules(v: CabinetRules): string | null {
  if (!Number.isInteger(v.members) || (v.members ?? 0) < 1) return 'Say how many members the Cabinet has (as the nation\'s law or convention composes it)';
  if (!fraction(v.quorum)) return 'The quorum is a fraction of the members (numerator and denominator), as the nation\'s rules set it';
  if (!['consensus', 'simple-majority', 'qualified-majority'].includes(v.rule ?? '')) return 'The decision rule is consensus, simple majority or a qualified majority';
  if (v.rule === 'qualified-majority' && !fraction(v.qualified)) return 'A qualified majority is a fraction of the votes cast';
  return null;
}
const describeRules = (v: CabinetRules) => `${v.members} members · quorum ${v.quorum?.numerator}/${v.quorum?.denominator} · ${v.rule}${v.rule === 'qualified-majority' ? ` ${v.qualified?.numerator}/${v.qualified?.denominator}` : ''}`;
export function proposeCabinetRules(input: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  const x = (input ?? {}) as Record<string, unknown>;
  const want: Partial<CabinetRules> = {
    ...(x.members !== undefined ? { members: Number(x.members) } : {}),
    ...(x.quorum !== undefined ? { quorum: x.quorum as CabinetRules['quorum'] } : {}),
    ...(x.rule !== undefined ? { rule: String(x.rule) as CabinetRules['rule'] } : {}),
    ...(x.qualified !== undefined ? { qualified: x.qualified as CabinetRules['qualified'] } : {}),
  };
  const { version: _v, ...current } = db().rules;
  return proposePolicy(db().ruleChanges, current, want, legalBasis, { by, ...(byId ? { byId } : {}), now, pendingHours, audit: RULE_AUDIT, context: 'Cabinet composition, quorum and decision rule', check: checkRules, describe: describeRules });
}
export function confirmCabinetRules(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const d = db();
  return confirmPolicy(d.ruleChanges, { by, ...(byId ? { byId } : {}), now, audit: RULE_AUDIT, requireIdentityBinding, describe: describeRules, adopt: v => { d.rules = { ...clone(v.values), version: d.rules.version + 1 }; } });
}
export const withdrawCabinetRules = (by: string, reason?: string) => withdrawPolicy(db().ruleChanges, { by, ...(reason ? { reason } : {}), audit: RULE_AUDIT });
export const cabinetRules = (): CabinetRules & { version: number } => clone(db().rules);
export const cabinetRuleChanges = (): PolicyChanges<CabinetRules> => clone(db().ruleChanges);

/** Check a meeting's quorum and vote against the adopted rules: whether the decision was taken. */
export function checkVote(input: { present: number; consensus: boolean; for?: number; against?: number; abstain?: number }): Vote | { notAdopted: string } | { error: string } {
  const r = db().rules;
  if (!r.version || !r.members || !r.quorum || !r.rule) return { notAdopted: 'The nation has not adopted its Cabinet rules (members, quorum, decision rule)' };
  if (!Number.isInteger(input.present) || input.present < 0 || input.present > r.members) return { error: `Members present is a whole number up to the ${r.members} members` };
  const quorum = Math.ceil((r.members * r.quorum.numerator) / r.quorum.denominator);
  const base = { present: input.present, quorum, members: r.members, rule: r.rule, consensus: input.consensus, rulesVersion: r.version };
  if (input.present < quorum) return { ...base, met: false };
  if (r.rule === 'consensus' || input.consensus) {
    if (r.rule !== 'consensus' && input.consensus) return { ...base, met: true };
    return { ...base, met: input.consensus };
  }
  const f = input.for ?? NaN, a = input.against ?? NaN, ab = input.abstain ?? 0;
  if (![f, a, ab].every(n => Number.isInteger(n) && n >= 0) || f + a + ab > input.present) return { error: 'Votes for, against and abstaining are whole numbers that add up to no more than those present' };
  const met = r.rule === 'simple-majority' ? f > a : f * r.qualified!.denominator >= (f + a) * r.qualified!.numerator && f > 0;
  return { ...base, for: f, against: a, abstain: ab, met };
}

// ── Submissions (Department A) ───────────────────────────────────────────────

export function registerSubmission(input: { sponsor: string; title: string; decisionRequested: string; classification: string; basis: Citation[]; fiscal?: string; conflicts?: string; case: string; by: string; at: string; sample?: true }): Submission | { error: string } {
  if (ok(input.title, 300).length < 5) return { error: 'Give the paper its title (5 to 300 characters)' };
  if (ok(input.decisionRequested, 5000).length < 20) return { error: 'State precisely what Cabinet is asked to decide (20 to 5,000 characters)' };
  if (!CLASSIFICATIONS.includes(input.classification)) return { error: `Classify the paper (${CLASSIFICATIONS.join(', ')}), as the nation's rules provide` };
  const d = db();
  if (d.submissions.some(s => s.case === input.case)) return { error: 'This case already holds a submission' };
  const s: Submission = {
    id: uuid7(), ref: nextNumber(counters(), 'subSeq', 'CAB', new Date(input.at)), sponsor: input.sponsor, title: ok(input.title, 300), decisionRequested: ok(input.decisionRequested, 5000),
    classification: input.classification, basis: clone(input.basis), ...(ok(input.fiscal) ? { fiscal: ok(input.fiscal, 2000) } : {}), ...(ok(input.conflicts) ? { conflicts: ok(input.conflicts, 2000) } : {}),
    versions: [{ n: 1, at: input.at, by: input.by, reason: 'Submitted', case: input.case }], state: 'submitted', case: input.case, at: input.at, ...(input.sample ? { sample: true as const } : {}),
  };
  d.submissions.push(s);
  recordAudit(input.by, 'cabinet.submission.register', `CabinetPaper:${s.ref}`, 'ok', `${s.sponsor} · ${s.classification}`);
  return clone(s);
}
const subOf = (caseId: string) => db().submissions.find(s => s.case === caseId);
export const getSubmission = (x: string): Submission | undefined => { const s = db().submissions.find(y => y.id === x || y.ref === x || y.case === x); return s ? clone(s) : undefined; };
export function reviewSubmission(caseId: string, kind: 'legal' | 'fiscal', note: string, by: Who, at: string): Submission | { error: string } {
  const s = subOf(caseId);
  if (!s) return { error: 'No submission on this case' };
  if (!ok(note)) return { error: 'Record what the review found' };
  if (kind === 'legal') s.legalReview = { by: clone(by), at, note: ok(note, 4000) };
  else s.fiscalReview = { by: clone(by), at, note: ok(note, 4000) };
  if (s.legalReview && s.fiscalReview) s.state = 'reviewed';
  recordAudit(by.name, `cabinet.submission.${kind}-review`, `CabinetPaper:${s.ref}`, 'ok', ok(note, 120));
  return clone(s);
}
export function setSubmissionState(caseId: string, state: Submission['state'], reason: string, by: string, at: string): Submission | { error: string } {
  const s = subOf(caseId);
  if (!s) return { error: 'No submission on this case' };
  if (state === 'submitted' && s.state === 'returned') s.versions.push({ n: s.versions.length + 1, at, by, reason: ok(reason, 500) || 'Revised', case: caseId });
  s.state = state;
  recordAudit(by, `cabinet.submission.${state}`, `CabinetPaper:${s.ref}`, 'ok', ok(reason, 120));
  return clone(s);
}

// ── Decisions ────────────────────────────────────────────────────────────────

export function recordCabinetDecision(input: { case: string; text: string; legalCategory: string; basis: Citation[]; meetingDate: string; vote: Vote | { notAdopted: string }; effectiveDate?: string; implementationOwner?: string; by: Who; confirmedBy?: Who; at: string; sample?: true }): CabinetDecision | { error: string } {
  const s = subOf(input.case);
  if (!s) return { error: 'No submission on this case' };
  if (s.state !== 'circulated') return { error: 'The paper is circulated to the members before Cabinet decides' };
  if (ok(input.text, 10000).length < 10) return { error: 'Record the exact text of the decision' };
  if (!ok(input.legalCategory)) return { error: 'Record the decision\'s legal category under the nation\'s law' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.meetingDate)) return { error: 'Give the date of the meeting' };
  if ('met' in input.vote && !input.vote.met) return { error: input.vote.present < input.vote.quorum ? `No quorum: ${input.vote.present} present, ${input.vote.quorum} needed under the nation's rules` : 'The vote does not carry the decision under the nation\'s rules' };
  const d = db();
  const c: CabinetDecision = {
    id: uuid7(), ref: nextNumber(counters(), 'decSeq', 'CDN', new Date(input.at)), submission: s.ref, title: s.title, legalCategory: ok(input.legalCategory, 120), basis: clone(input.basis),
    meetingDate: input.meetingDate, vote: clone(input.vote), ...(input.effectiveDate ? { effectiveDate: input.effectiveDate } : {}), ...(input.implementationOwner ? { implementationOwner: input.implementationOwner } : {}),
    classification: s.classification, distribution: [],
    versions: [{ n: 1, at: input.at, text: ok(input.text, 10000), reason: 'Recorded', by: clone(input.by), ...(input.confirmedBy ? { confirmedBy: clone(input.confirmedBy) } : {}), case: input.case }],
    case: input.case, ...(input.sample ? { sample: true as const } : {}),
  };
  d.decisions.push(c);
  s.state = 'decided';
  recordAudit((input.confirmedBy ?? input.by).name, 'cabinet.decision.record', `CabinetDecision:${c.ref}`, 'ok', `${c.legalCategory} · meeting ${c.meetingDate} · ${'met' in c.vote ? `${c.vote.present} present of ${c.vote.members}, quorum ${c.vote.quorum}, ${c.vote.rule}` : c.vote.notAdopted}`);
  return clone(c);
}
const decOf = (caseId: string) => db().decisions.find(x => x.case === caseId);
export const getCabinetDecision = (x: string): CabinetDecision | undefined => { const c = db().decisions.find(y => y.id === x || y.ref === x || y.case === x); return c ? clone(c) : undefined; };
export function attachCabinetDecision(caseId: string, sealed: string): void { const c = decOf(caseId); if (c) { const v = c.versions[c.versions.length - 1]!; v.decision ??= sealed; } }
/** A correction is a new version (two officials), the earlier text kept. */
export function correctCabinetDecision(caseId: string, text: string, reason: string, by: Who, confirmedBy: Who | undefined, at: string): CabinetDecision | { error: string } {
  const c = decOf(caseId);
  if (!c) return { error: 'No decision on this case' };
  if (ok(text, 10000).length < 10 || !ok(reason)) return { error: 'Give the corrected text and why it is corrected' };
  c.versions.push({ n: c.versions.length + 1, at, text: ok(text, 10000), reason: ok(reason, 1000), by: clone(by), ...(confirmedBy ? { confirmedBy: clone(confirmedBy) } : {}), case: caseId });
  recordAudit((confirmedBy ?? by).name, 'cabinet.decision.correct', `CabinetDecision:${c.ref}`, 'ok', `version ${c.versions.length} · ${ok(reason, 120)}`);
  return clone(c);
}
export function distribute(caseId: string, to: string[], by: string, at: string): CabinetDecision | { error: string } {
  const c = decOf(caseId);
  if (!c) return { error: 'No decision on this case' };
  for (const t of to) c.distribution.push({ to: t, at, by, version: c.versions.length });
  recordAudit(by, 'cabinet.decision.distribute', `CabinetDecision:${c.ref}`, 'ok', `version ${c.versions.length} to ${to.length} recipient(s)`);
  return clone(c);
}
export function setDisclosure(caseId: string, state: 'published' | 'withheld', reasons: string, by: Who, at: string): CabinetDecision | { error: string } {
  const c = decOf(caseId);
  if (!c) return { error: 'No decision on this case' };
  if (!ok(reasons)) return { error: 'Record why it is published or withheld, under the nation\'s disclosure rules' };
  if (state === 'published' && c.classification !== 'public' && !/declassif|releas|law/i.test(reasons)) return { error: `The decision is classified ${c.classification}: say under which rule it is released` };
  c.disclosure = { state, reasons: ok(reasons, 2000), by: clone(by), at };
  recordAudit(by.name, `cabinet.decision.${state === 'published' ? 'publish' : 'withhold'}`, `CabinetDecision:${c.ref}`, 'ok', ok(reasons, 120));
  return clone(c);
}

// ── Actions (the government action register) ─────────────────────────────────

export function assignAction(caseId: string, input: { institution: string; description: string; due?: string; kind: 'instruction' | 'request'; by: string; at: string; sample?: true }): CabinetAction | { error: string } {
  const c = decOf(caseId);
  if (!c) return { error: 'No decision on this case' };
  if (!ok(input.description)) return { error: 'Describe the action' };
  if (input.due && !/^\d{4}-\d{2}-\d{2}$/.test(input.due)) return { error: 'The deadline is a date (as the decision sets it)' };
  const d = db();
  const a: CabinetAction = { id: uuid7(), ref: nextNumber(counters(), 'actSeq', 'ACT', new Date(input.at)), decision: c.ref, institution: input.institution, description: ok(input.description, 2000), ...(input.due ? { due: input.due } : {}), kind: input.kind, state: 'open', updates: [], at: input.at, ...(input.sample ? { sample: true as const } : {}) };
  d.actions.push(a);
  recordAudit(input.by, 'cabinet.action.assign', `CabinetAction:${a.ref}`, 'ok', `${c.ref} → ${a.institution} (${a.kind})${a.due ? ` by ${a.due}` : ''}`);
  return clone(a);
}
const actOf = (x: string) => db().actions.find(a => a.id === x || a.ref === x);
export const getAction = (x: string): CabinetAction | undefined => { const a = actOf(x); return a ? clone(a) : undefined; };
/** The assigned institution reports progress on its action (an official of that institution). */
export function reportAction(ref: string, text: string, by: Who, institution: string | undefined, at: string): CabinetAction | { error: string } {
  const a = actOf(ref);
  if (!a) return { error: `No action ${ref}` };
  if (institution !== a.institution) return { error: 'Progress is reported by an official of the institution the action is assigned to' };
  if (a.state === 'closed') return { error: `${a.ref} is closed` };
  if (!ok(text)) return { error: 'Describe the progress' };
  a.updates.push({ at, by: clone(by), text: ok(text, 2000) });
  if (a.state === 'returned') a.state = 'open';
  recordAudit(by.name, 'cabinet.action.report', `CabinetAction:${a.ref}`, 'ok', ok(text, 80));
  return clone(a);
}
/** The assigned institution proposes closure with its evidence; a cabinet office official who is a different person confirms or returns it. */
export function proposeActionClosure(ref: string, evidence: string, by: Who, institution: string | undefined, at: string): CabinetAction | { error: string } {
  const a = actOf(ref);
  if (!a) return { error: `No action ${ref}` };
  if (institution !== a.institution) return { error: 'Closure is proposed by an official of the institution the action is assigned to' };
  if (a.state !== 'open') return { error: `${a.ref} is ${a.state}` };
  if (!ok(evidence)) return { error: 'Give the completion evidence' };
  a.closure = { proposedBy: clone(by), at, evidence: ok(evidence, 4000) };
  a.state = 'closure-proposed';
  recordAudit(by.name, 'cabinet.action.propose-closure', `CabinetAction:${a.ref}`, 'ok', ok(evidence, 80));
  return clone(a);
}
export function decideActionClosure(ref: string, confirm: boolean, reasons: string, by: Who, at: string): CabinetAction | { error: string } {
  const a = actOf(ref);
  if (!a?.closure) return { error: `No closure proposed for ${ref}` };
  if (a.state !== 'closure-proposed') return { error: `${a.ref} is ${a.state}` };
  if (samePerson(a.closure.proposedBy, by)) return { error: 'A different official confirms the closure' };
  if (confirm) { a.closure.confirmedBy = clone(by); a.closure.confirmedAt = at; a.state = 'closed'; }
  else { if (!ok(reasons)) return { error: 'Say why the closure is returned' }; a.closure.returned = { by: clone(by), at, reasons: ok(reasons, 2000) }; a.state = 'returned'; }
  recordAudit(by.name, `cabinet.action.${confirm ? 'close' : 'return'}`, `CabinetAction:${a.ref}`, 'ok', ok(reasons, 80));
  return clone(a);
}
export const actionsOf = (decisionRef: string): CabinetAction[] => db().actions.filter(a => a.decision === decisionRef).map(clone);

// ── Reads ────────────────────────────────────────────────────────────────────

/** What a viewer sees: for the cabinet office everything; for another institution its own submissions and the actions assigned to it (and the decisions they come from, text only where published). */
export function cabinetRecords(viewer: { institution?: string } | 'all') {
  const d = db();
  if (viewer === 'all') return { submissions: d.submissions.map(clone), decisions: d.decisions.map(clone), actions: d.actions.map(clone) };
  const inst = viewer.institution;
  const actions = d.actions.filter(a => a.institution === inst);
  const decRefs = new Set(actions.map(a => a.decision));
  return {
    submissions: d.submissions.filter(s => s.sponsor === inst).map(clone),
    decisions: d.decisions.filter(c => decRefs.has(c.ref) || c.disclosure?.state === 'published').map(c => (c.disclosure?.state === 'published' || c.distribution.some(x => x.to === inst) ? clone(c) : { ...clone(c), versions: c.versions.map(v => ({ ...v, text: '(withheld: not distributed to your institution)' })) })),
    actions: actions.map(clone),
  };
}

/** The indicators of specification §3.6, computed from the records each time they are read (never typed). */
export function cabinetIndicators(now = new Date()) {
  const d = db();
  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
  const decided = d.decisions.map(c => { const s = d.submissions.find(x => x.ref === c.submission); return s ? days(s.at, c.versions[0]!.at) : null; }).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const pct = (q: number) => (decided.length ? decided[Math.min(decided.length - 1, Math.ceil(q * decided.length) - 1)]! : null);
  const today = now.toISOString().slice(0, 10);
  const overdue = d.actions.filter(a => a.state !== 'closed' && a.due && a.due < today);
  return {
    submissions: { received: d.submissions.length, returned: d.submissions.filter(s => s.state === 'returned').length, decided: d.submissions.filter(s => s.state === 'decided').length },
    daysToDecision: { median: pct(0.5), p90: pct(0.9) },
    decisionsWithBasis: { withBasisAndSeal: d.decisions.filter(c => c.basis.length && c.versions[0]!.decision).length, of: d.decisions.length },
    actions: { completedByDeadline: d.actions.filter(a => a.state === 'closed' && (!a.due || (a.closure?.confirmedAt ?? '') <= `${a.due}T23:59:59`)).length, of: d.actions.length },
    overdueByInstitution: overdue.reduce<Record<string, number>>((m, a) => ({ ...m, [a.institution]: (m[a.institution] ?? 0) + 1 }), {}),
    source: 'computed from the Cabinet register when read',
  };
}

export function cabinetCounts() {
  const d = db();
  const by = <T extends { state: string }>(xs: T[]) => xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x.state]: (m[x.state] ?? 0) + 1 }), {});
  return { submissions: by(d.submissions), decisions: d.decisions.length, actions: by(d.actions), rules: d.rules.version ? 'adopted' : 'not adopted' };
}
