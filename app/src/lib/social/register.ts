// The social protection register (Institutional specification Part 2 §A.7
// and §C.6; catalogue supplement Part 15, SOC-BEN-001 … 024; plan step I6).
// Kept for the institution the nation names for the `socialProtection` slot:
//
//   claimants    people registered with the authority (an identity record by number, checked through the
//                identity.verify exchange; contact and representative restricted)
//   households   household compositions by version (members by reference and relationship, effective from a date);
//                a change is a new version, the earlier kept
//   claims       a benefit claim under one programme: every assessment by version, each with its inputs (income,
//                assets and deductions, each with its source and whether it was verified, the household size), the
//                means they make, the approved rule version (key, version, digest) that calculated the amount and
//                its steps; the claim's standing (assessed, awarded, refused, suspended, terminated, ended); reviews
//   payments     payment instructions from an awarded claim's current assessment (the amount is never typed), made
//                by one official and approved by a different one, with their result
//   overpayments the amount paid against the amount due recalculated for a period, by the rule version of that
//                period, and the deciding officials' outcome (recover or waive)
//
// Eligibility and amounts come only from approved rules (lib/law/rules.ts,
// `social.<programme>`, a means-tested rule; shipped unset): with no approved
// rule nothing is calculated, so nothing is awarded. A decision's calculation
// can be reproduced from its recorded inputs and rule version
// (reproduceAssessment(); acceptance P2-07). A reassessment adds a version and
// never erases the earlier decision or its evidence. No score of any kind is
// kept: a suspension rests on stated facts and documents, decided by officials.
//
// Restricted: read only by the social protection authority's officials (and
// auditors with a purpose), every read logged by the route
// (lib/auth/roles.ts canReadSocial()). Changes only through the social
// protection procedures' effects (lib/social/procedures.ts). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { recalculate, type RuleInputValues } from '@/lib/law/rules';

export interface Step { at: string; by: string; what: string; reason: string; case?: string; decision?: string }
export interface Claimant { number: string; identity: string; name: string; contact?: string; preferredChannel?: string; representative?: string; household?: string; identityBasis: { kind: 'exchange'; receipt: string } | { kind: 'other-evidence'; reasons: string }; case: string; createdAt: string; sample?: true }
export interface HouseholdVersion { n: number; members: { reference: string; relationship: string }[]; effectiveFrom: string; at: string; by: string; case: string; reason: string }
export interface Household { number: string; claimant: string; versions: HouseholdVersion[]; sample?: true }
export interface InputLine { source: string; amountMinor: number; verified: boolean; counted?: boolean }
export interface Assessment {
  n: number;
  period: { from: string; to: string };
  inputs: { income: InputLine[]; assets: InputLine[]; deductions: InputLine[]; members: number };
  /** Income plus counted assets less deductions, never below zero: what the rule is applied to. */
  meansMinor: number;
  rule: { key: string; version: number; digest: string };
  amountMinor: number;
  steps: string[];
  at: string; by: string; case: string; reason: string;
}
export type ClaimState = 'assessed' | 'awarded' | 'refused' | 'suspended' | 'terminated' | 'ended';
export const CLAIM_STATE_LABEL: Record<ClaimState, string> = { assessed: 'Assessed, awaiting decision', awarded: 'Awarded', refused: 'Refused', suspended: 'Suspended', terminated: 'Terminated', ended: 'Ended' };
export interface Claim {
  number: string; claimant: string; programme: string;
  state: ClaimState;
  assessments: Assessment[];
  /** The assessment the claim stands on now (awarded or varied). */
  current?: number;
  startOn?: string; endOn?: string;
  decisions: { kind: string; case: string; decision?: string; at: string; by: string; assessment?: number }[];
  reviews: { case: string; outcome: string; at: string; by: string; decision?: string }[];
  case: string; history: Step[]; createdAt: string; sample?: true;
}
export interface PaymentInstruction {
  number: string; claim: string; period: { from: string; to: string }; amountMinor: number; currency: string;
  assessment: number; rule: Assessment['rule'];
  maker: { id?: string; name: string }; approver?: { id?: string; name: string };
  state: 'prepared' | 'approved' | 'paid' | 'failed' | 'cancelled';
  result?: { at: string; by: string; externalReference: string };
  case: string; decision?: string; sample?: true;
}
export interface Overpayment { number: string; claim: string; period: { from: string; to: string }; paidMinor: number; dueMinor: number; overMinor: number; rule: Assessment['rule']; payments: string[]; outcome?: 'recover' | 'waive'; case: string; decision?: string; at: string; by: string; sample?: true }

interface Db { claimants: Claimant[]; households: Household[]; claims: Claim[]; payments: PaymentInstruction[]; overpayments: Overpayment[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosSocial?: Db };
const db = (): Db => {
  const d = touch('__civicosSocial', g.__civicosSocial ??= { claimants: [], households: [], claims: [], payments: [], overpayments: [], seq: {} });
  for (const k of ['claimants', 'households', 'claims', 'payments', 'overpayments'] as const) d[k] ??= [];
  d.seq ??= {};
  return d;
};
export function resetSocial(): void { g.__civicosSocial = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const next = (prefix: string, now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); const k = `${prefix}:${y}`; d.seq[k] = (d.seq[k] ?? 0) + 1; return `${prefix}-${y}-${String(d.seq[k]).padStart(6, '0')}`; };
const audit = (by: string, action: string, target: string, detail: string) => recordAudit(by, `social.${action}`, target, 'ok', detail);
type Sample = { sample?: true };

/** The means an assessment applies the rule to: income, plus the assets the officer counted under the programme's rule, less deductions; never below zero. */
export const meansOf = (i: Assessment['inputs']): number => Math.max(0, i.income.reduce((a, x) => a + x.amountMinor, 0) + i.assets.filter(x => x.counted).reduce((a, x) => a + x.amountMinor, 0) - i.deductions.reduce((a, x) => a + x.amountMinor, 0));
/** The rule input an assessment's calculation used (and a reproduction uses again). */
export const ruleInputOf = (a: Pick<Assessment, 'inputs' | 'meansMinor'>): RuleInputValues => ({ amountMinor: a.meansMinor, members: a.inputs.members });

export function checkInputs(i: Assessment['inputs']): string | null {
  for (const l of [...i.income, ...i.assets, ...i.deductions]) {
    if (!l.source.trim()) return 'Each line names its source';
    if (!Number.isInteger(l.amountMinor) || l.amountMinor < 0) return `${l.source}: the amount is a whole, non-negative number of minor units`;
  }
  if (!Number.isInteger(i.members) || i.members < 1) return 'The household has at least one member';
  return null;
}

// ── Claimants and households ─────────────────────────────────────────────────

export function registerClaimant(i: Omit<Claimant, 'number' | 'case' | 'createdAt' | 'household'> & { members?: { reference: string; relationship: string }[]; effectiveFrom?: string } & Sample, caseId: string, by: string, now = new Date()): Claimant | { error: string } {
  if (!i.identity.trim() || !i.name.trim()) return { error: 'The claimant\'s identity record number and name' };
  if (db().claimants.some(c => c.identity === i.identity.trim())) return { error: 'This person is already registered with the authority' };
  if (db().claimants.some(c => c.case === caseId)) return { error: 'This case has already registered a claimant' };
  const at = now.toISOString();
  const number = next('SPC', now);
  let household: string | undefined;
  if (i.members?.length) {
    household = next('HH', now);
    db().households.push({ number: household, claimant: number, versions: [{ n: 1, members: i.members.slice(0, 50), effectiveFrom: i.effectiveFrom ?? at.slice(0, 10), at, by, case: caseId, reason: 'Declared at registration' }], ...(i.sample ? { sample: true } : {}) });
  }
  const c: Claimant = { number, identity: i.identity.trim(), name: i.name.trim().slice(0, 200), ...(i.contact ? { contact: i.contact.slice(0, 200) } : {}), ...(i.preferredChannel ? { preferredChannel: i.preferredChannel } : {}), ...(i.representative ? { representative: i.representative } : {}), ...(household ? { household } : {}), identityBasis: i.identityBasis, case: caseId, createdAt: at, ...(i.sample ? { sample: true } : {}) };
  db().claimants.push(c);
  audit(by, 'claimant.register', `Claimant:${number}`, `case ${caseId}${household ? ` · household ${household}` : ''}${i.sample ? ' · sample' : ''}`);
  return clone(c);
}
/** A household change (a declaration or change of circumstances): a new version, the earlier kept. */
export function declareHousehold(claimant: string, v: { members: { reference: string; relationship: string }[]; effectiveFrom: string; reason: string }, caseId: string, by: string, now = new Date()): Household | { error: string } {
  const c = db().claimants.find(x => x.number === claimant);
  if (!c) return { error: `No claimant ${claimant}` };
  if (!v.members.length || v.members.some(m => !m.reference.trim() || !m.relationship.trim())) return { error: 'Each member: their reference and relationship (one per line: reference | relationship)' };
  if (!DATE.test(v.effectiveFrom)) return { error: 'The date the composition applies from (YYYY-MM-DD)' };
  const at = now.toISOString();
  let h = c.household ? db().households.find(x => x.number === c.household) : undefined;
  if (!h) { h = { number: next('HH', now), claimant, versions: [] }; db().households.push(h); c.household = h.number; }
  h.versions.push({ n: h.versions.length + 1, members: v.members.slice(0, 50), effectiveFrom: v.effectiveFrom, at, by, case: caseId, reason: v.reason.slice(0, 500) });
  audit(by, 'household.declare', `Household:${h.number}`, `version ${h.versions.length} · ${v.members.length} member(s) · case ${caseId}`);
  return clone(h);
}
export const getClaimant = (n: string): Claimant | undefined => { const c = db().claimants.find(x => x.number === n || x.identity === n); return c ? clone(c) : undefined; };
export const getHousehold = (n: string): Household | undefined => { const h = db().households.find(x => x.number === n); return h ? clone(h) : undefined; };

// ── Claims ───────────────────────────────────────────────────────────────────

/** Record an assessment on the claim this case makes (the claim is created by its first assessment). */
export function recordAssessment(i: { claimant: string; programme: string; claim?: string } & Omit<Assessment, 'n' | 'at' | 'by'> & Sample, by: string, now = new Date()): Claim | { error: string } {
  const why = checkInputs(i.inputs);
  if (why) return { error: why };
  if (!DATE.test(i.period.from) || !DATE.test(i.period.to) || i.period.to < i.period.from) return { error: 'The assessment period: from and to, the end not before the start' };
  if (i.meansMinor !== meansOf(i.inputs)) return { error: 'The means are computed from the inputs' };
  let c = i.claim ? db().claims.find(x => x.number === i.claim) : db().claims.find(x => x.case === i.case);
  if (!c) {
    if (!db().claimants.some(x => x.number === i.claimant)) return { error: `No claimant ${i.claimant}` };
    c = { number: next('BEN', now), claimant: i.claimant, programme: i.programme, state: 'assessed', assessments: [], decisions: [], reviews: [], case: i.case, history: [], createdAt: now.toISOString(), ...(i.sample ? { sample: true } : {}) };
    db().claims.push(c);
  }
  if (c.programme !== i.programme) return { error: `Claim ${c.number} is under ${c.programme}` };
  const a: Assessment = { n: c.assessments.length + 1, period: i.period, inputs: clone(i.inputs), meansMinor: i.meansMinor, rule: i.rule, amountMinor: i.amountMinor, steps: i.steps.slice(0, 20), at: now.toISOString(), by, case: i.case, reason: i.reason.slice(0, 500) };
  c.assessments.push(a);
  c.history.push({ at: a.at, by, what: `assessment ${a.n}`, reason: `${i.rule.key} v${i.rule.version}: ${a.amountMinor}`, case: i.case });
  audit(by, 'claim.assess', `Claim:${c.number}`, `assessment ${a.n} · ${i.rule.key} v${i.rule.version} · case ${i.case}`);
  return clone(c);
}
export const claimOfCase = (caseId: string): Claim | undefined => { const c = db().claims.find(x => x.case === caseId); return c ? clone(c) : undefined; };
export const getClaim = (n: string): Claim | undefined => { const c = db().claims.find(x => x.number === n); return c ? clone(c) : undefined; };
export const latestAssessment = (c: Pick<Claim, 'assessments'>, caseId?: string): Assessment | undefined => [...c.assessments].reverse().find(a => !caseId || a.case === caseId);

const MOVES: Record<string, { from: ClaimState[]; to: ClaimState }> = {
  award: { from: ['assessed'], to: 'awarded' }, refuse: { from: ['assessed'], to: 'refused' }, vary: { from: ['awarded'], to: 'awarded' }, continue: { from: ['awarded', 'suspended'], to: 'awarded' },
  end: { from: ['awarded', 'suspended'], to: 'ended' }, suspend: { from: ['awarded'], to: 'suspended' }, terminate: { from: ['awarded', 'suspended'], to: 'terminated' }, reinstate: { from: ['suspended', 'terminated', 'refused'], to: 'awarded' },
};
/** Why a decision could not change the claim now (null when it can). */
export function claimMoveRefusal(claim: string, kind: string): string | null {
  const c = db().claims.find(x => x.number === claim);
  if (!c) return `No claim ${claim || '(none named)'}`;
  const m = MOVES[kind];
  if (!m) return `The decision is one of ${Object.keys(MOVES).join(', ')}`;
  return m.from.includes(c.state) ? null : `A claim that is ${CLAIM_STATE_LABEL[c.state].toLowerCase()} cannot take this decision (${kind})`;
}
/** A decision on a claim (award, refuse, vary, continue, end, suspend, terminate, reinstate): its state; a vary or award stands on the assessment named. */
export function decideClaim(claim: string, kind: string, d: { case: string; reason: string; assessment?: number; startOn?: string; endOn?: string }, by: string, now = new Date()): Claim | { error: string } {
  const why = claimMoveRefusal(claim, kind);
  if (why) return { error: why };
  const c = db().claims.find(x => x.number === claim)!;
  if (d.assessment !== undefined && !c.assessments.some(a => a.n === d.assessment)) return { error: `No assessment ${d.assessment} on ${claim}` };
  const at = now.toISOString();
  const was = c.state;
  c.state = MOVES[kind]!.to;
  if (d.assessment !== undefined && ['award', 'vary', 'reinstate'].includes(kind)) c.current = d.assessment;
  if (kind === 'award' && d.startOn) c.startOn = d.startOn;
  if (['end', 'terminate'].includes(kind)) c.endOn = d.endOn ?? at.slice(0, 10);
  c.decisions.push({ kind, case: d.case, at, by, ...(d.assessment !== undefined ? { assessment: d.assessment } : {}) });
  c.history.push({ at, by, what: `${was} → ${c.state}`, reason: d.reason.slice(0, 500), case: d.case });
  audit(by, `claim.${kind}`, `Claim:${c.number}`, `${was} → ${c.state} · case ${d.case}`);
  return clone(c);
}
export function attachClaimDecision(claim: string, caseId: string, decision: string): void {
  const c = db().claims.find(x => x.number === claim);
  if (!c) return;
  for (const x of c.decisions) if (x.case === caseId) x.decision ??= decision;
  for (const r of c.reviews) if (r.case === caseId) r.decision ??= decision;
  const s = c.history.at(-1);
  if (s && s.case === caseId && !s.decision) s.decision = decision;
}
/** A review or appeal outcome, kept beside the decision it reviews (never changing it). */
export function recordClaimReview(claim: string, r: { case: string; outcome: string }, by: string, now = new Date()): Claim | { error: string } {
  const c = db().claims.find(x => x.number === claim);
  if (!c) return { error: `No claim ${claim}` };
  c.reviews.push({ ...r, at: now.toISOString(), by });
  c.history.push({ at: now.toISOString(), by, what: `review: ${r.outcome}`, reason: `Review case ${r.case}`, case: r.case });
  audit(by, 'claim.review', `Claim:${c.number}`, `${r.outcome} · case ${r.case}`);
  return clone(c);
}

/**
 * Reproduce an assessment from its recorded inputs and the exact rule
 * version it named (acceptance P2-07): the amount the rule gives again, and
 * whether it is the amount recorded.
 */
export function reproduceAssessment(claim: string, n: number): { matches: boolean; recordedMinor: number; reproducedMinor?: number; error?: string } {
  const c = db().claims.find(x => x.number === claim);
  const a = c?.assessments.find(x => x.n === n);
  if (!c || !a) return { matches: false, recordedMinor: 0, error: 'No such assessment' };
  if (meansOf(a.inputs) !== a.meansMinor) return { matches: false, recordedMinor: a.amountMinor, error: 'The recorded means do not follow from the recorded inputs' };
  const r = recalculate(a.rule, ruleInputOf(a));
  if ('error' in r) return { matches: false, recordedMinor: a.amountMinor, error: r.error };
  return { matches: r.amountMinor === a.amountMinor, recordedMinor: a.amountMinor, reproducedMinor: r.amountMinor };
}

// ── Payments and overpayments ────────────────────────────────────────────────

/** Prepare a payment instruction from the claim's current assessment (the amount is the assessment's; never typed). */
export function preparePayment(i: { claim: string; period: { from: string; to: string }; currency: string; maker: { id?: string; name: string } } & Sample, caseId: string, now = new Date()): PaymentInstruction | { error: string } {
  const c = db().claims.find(x => x.number === i.claim);
  if (!c || c.state !== 'awarded' || c.current === undefined) return { error: `${i.claim || 'The claim'} is not awarded` };
  if (!DATE.test(i.period.from) || !DATE.test(i.period.to) || i.period.to < i.period.from) return { error: 'The payment period: from and to' };
  if (c.startOn && i.period.from < c.startOn) return { error: `The award starts on ${c.startOn}` };
  if (db().payments.some(p => p.claim === c.number && p.state !== 'cancelled' && p.state !== 'failed' && p.period.from <= i.period.to && i.period.from <= p.period.to)) return { error: 'A payment instruction already covers part of this period' };
  if (db().payments.some(p => p.case === caseId)) return { error: 'This case has already prepared its instruction' };
  const a = c.assessments.find(x => x.n === c.current)!;
  const p: PaymentInstruction = { number: next('SPP', now), claim: c.number, period: i.period, amountMinor: a.amountMinor, currency: i.currency, assessment: a.n, rule: a.rule, maker: i.maker, state: 'prepared', case: caseId, ...(i.sample ? { sample: true } : {}) };
  db().payments.push(p);
  audit(i.maker.name, 'payment.prepare', `Payment:${p.number}`, `claim ${c.number} · assessment ${a.n} · case ${caseId}`);
  return clone(p);
}
export const paymentOfCase = (caseId: string): PaymentInstruction | undefined => { const p = db().payments.find(x => x.case === caseId); return p ? clone(p) : undefined; };
/** Approve (a different official from the maker), record the payment service's result, or cancel. */
export function settlePayment(caseId: string, move: 'approve' | 'paid' | 'failed' | 'cancel', who: { id?: string; name: string }, x: { externalReference?: string } = {}, now = new Date()): PaymentInstruction | { error: string } {
  const p = db().payments.find(y => y.case === caseId);
  if (!p) return { error: 'This case has prepared no instruction' };
  const from: Record<typeof move, PaymentInstruction['state'][]> = { approve: ['prepared'], paid: ['approved'], failed: ['approved'], cancel: ['prepared'] };
  if (!from[move].includes(p.state)) return { error: `The instruction is ${p.state}` };
  if (move === 'approve') {
    if ((p.maker.id && who.id ? p.maker.id === who.id : p.maker.name === who.name)) return { error: 'A payment instruction is approved by a different official from the one who prepared it' };
    p.approver = who; p.state = 'approved';
  } else if (move === 'cancel') p.state = 'cancelled';
  else {
    if (!x.externalReference?.trim()) return { error: 'Record the payment service\'s reference for the result' };
    p.state = move; p.result = { at: now.toISOString(), by: who.name, externalReference: x.externalReference.trim().slice(0, 80) };
  }
  audit(who.name, `payment.${move}`, `Payment:${p.number}`, `case ${caseId}`);
  return clone(p);
}
export function attachPaymentDecision(caseId: string, decision: string): void { const p = db().payments.find(y => y.case === caseId); if (p) p.decision ??= decision; }
/** What was paid on a claim for a period (instructions the payment service reported paid). */
export const paidFor = (claim: string, period: { from: string; to: string }): { amountMinor: number; payments: string[] } => {
  const ps = db().payments.filter(p => p.claim === claim && p.state === 'paid' && p.period.from >= period.from && p.period.to <= period.to);
  return { amountMinor: ps.reduce((a, p) => a + p.amountMinor, 0), payments: ps.map(p => p.number) };
};

export function recordOverpayment(i: Omit<Overpayment, 'number' | 'at' | 'by' | 'overMinor'> & Sample, by: string, now = new Date()): Overpayment | { error: string } {
  if (i.paidMinor <= i.dueMinor) return { error: 'Nothing was paid above what was due for the period: there is no overpayment' };
  if (db().overpayments.some(o => o.case === i.case)) return { error: 'This case has already calculated its overpayment' };
  const o: Overpayment = { ...clone(i), overMinor: i.paidMinor - i.dueMinor, number: next('OVP', now), at: now.toISOString(), by };
  db().overpayments.push(o);
  audit(by, 'overpayment.calculate', `Overpayment:${o.number}`, `claim ${i.claim} · ${i.rule.key} v${i.rule.version} · case ${i.case}`);
  return clone(o);
}
export const overpaymentOfCase = (caseId: string): Overpayment | undefined => { const o = db().overpayments.find(x => x.case === caseId); return o ? clone(o) : undefined; };
export function decideOverpayment(caseId: string, outcome: 'recover' | 'waive', by: string): Overpayment | { error: string } {
  const o = db().overpayments.find(x => x.case === caseId);
  if (!o) return { error: 'This case has calculated no overpayment' };
  if (o.outcome) return { error: 'Already decided' };
  o.outcome = outcome;
  audit(by, `overpayment.${outcome}`, `Overpayment:${o.number}`, `case ${caseId}`);
  return clone(o);
}
export function attachOverpaymentDecision(caseId: string, decision: string): void { const o = db().overpayments.find(x => x.case === caseId); if (o) o.decision ??= decision; }

// ── Reads ────────────────────────────────────────────────────────────────────

/** Officials' search: a claimant (by number or identity record) with their household and claims, or a claim (the route logs it). */
export function findSocial(q: { claimant?: string; claim?: string }): { claimants: Claimant[]; households: Household[]; claims: Claim[]; payments: PaymentInstruction[]; overpayments: Overpayment[] } {
  const d = db();
  const c = q.claim ? d.claims.find(x => x.number === q.claim) : undefined;
  const who = q.claimant ? d.claimants.find(x => x.number === q.claimant || x.identity === q.claimant) : c ? d.claimants.find(x => x.number === c.claimant) : undefined;
  if (!who) return { claimants: [], households: [], claims: [], payments: [], overpayments: [] };
  const claims = d.claims.filter(x => x.claimant === who.number && (!c || x.number === c.number));
  const nums = claims.map(x => x.number);
  return { claimants: [clone(who)], households: d.households.filter(h => h.claimant === who.number).map(clone), claims: claims.map(clone), payments: d.payments.filter(p => nums.includes(p.claim)).map(clone), overpayments: d.overpayments.filter(o => nums.includes(o.claim)).map(clone) };
}

/** Counts (no person): claims by programme and state, payments by state, overpayments by outcome, reviews by outcome. */
export function socialCounts(): { claimants: number; claims: { programme: string; state: string; count: number }[]; payments: Record<string, number>; overpayments: Record<string, number>; reviews: Record<string, number>; samples: number } {
  const d = db();
  const m = new Map<string, number>();
  for (const c of d.claims) m.set(`${c.programme}|${c.state}`, (m.get(`${c.programme}|${c.state}`) ?? 0) + 1);
  const payments: Record<string, number> = {}, overpayments: Record<string, number> = {}, reviews: Record<string, number> = {};
  for (const p of d.payments) payments[p.state] = (payments[p.state] ?? 0) + 1;
  for (const o of d.overpayments) overpayments[o.outcome ?? 'undecided'] = (overpayments[o.outcome ?? 'undecided'] ?? 0) + 1;
  for (const c of d.claims) for (const r of c.reviews) reviews[r.outcome] = (reviews[r.outcome] ?? 0) + 1;
  return { claimants: d.claimants.length, claims: [...m].map(([k, count]) => { const [programme, state] = k.split('|') as [string, string]; return { programme, state, count }; }), payments, overpayments, reviews, samples: [...d.claimants, ...d.claims].filter(x => x.sample).length };
}
