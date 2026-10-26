// The public finance register (plan step I5; institutional specification
// Part 1 §4; field series Part 2 §2.4 and §2.5): the budget, the
// appropriations it becomes, the commitments made against them, the payment
// orders that settle them and the cash forecasts beside them. Kept for the
// finance authority the nation names in its deployment profile (slot
// `finance`, shipped empty: a ministry of finance, a treasury or a budget
// office, as the law says; never a ministry by name). Changed only by the
// effects of the finance procedures (lib/finance/procedures.ts, decided under
// the case engine; register-writes.test.ts holds it to that).
//
// Distinct records, linked as a traceable chain (specification §4.1: budget
// authority, commitment, invoice and payable, payment, accounting entry are
// separate records): a budget call (circular) → institutional ceilings →
// bids, negotiated and allocated → appropriations enacted under the law
// (cited from the laws register), validated and released → commitments
// against a released appropriation (never above what is available) → payment
// orders against a commitment's invoice (instructed, verified, approved by
// two officials, executed with the bank's own reference, reconciled against
// the bank statement once) → the appropriation's balance, computed from those
// records whenever it is read, never typed. A bid is not an appropriation; an
// approval is not a payment; an execution is not a reconciliation.
//
// Separation of duties by person (specification §4.5; field series §2.4):
// the official who instructs a payment neither verifies, approves, executes
// nor reconciles it; the approvers neither execute nor reconcile; the one who
// executes does not reconcile. The case engine enforces it on the steps
// (`needs.distinctFrom`, dualControlRefusal(): persons, never only accounts)
// and the register checks it again on the record.
//
// Nothing statutory is typed: no ceiling, threshold, tier or period ships.
// Amounts are what officials record under a decision of two officials, or
// what the bank confirms; an approval tier comes only from the approved rule
// `treasury.payment.approval-tiers` (lib/law/rules.ts, a `tiers` rule,
// shipped unset; a production installation refuses an approval without it).
// Payee bank accounts change only through their own procedure (requested,
// verified, approved by two officials, then in force; never overwritten at
// once); the account number is sealed at rest (lib/crypto/envelope.ts) and
// shown masked. Payment records are restricted: read under
// canReadFinance() (lib/auth/roles.ts), every read of a payment or a payee
// account in the access log.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { personOf } from '@/lib/data/dual-control';
import { seal } from '@/lib/crypto/envelope';
import type { Citation } from '@/lib/law/register';

export interface Who { id?: string; name: string }
/** One step of a payment order or a payee account: who took it, when, in which case. */
export interface StepRecord { by: Who; at: string; case: string }
export interface RuleRef { key: string; version: number; digest: string }

export interface BudgetCall {
  id: string; ref: string; period: string; currency: string;
  /** The date the circular itself states for submissions (the circular's own text, decided by two officials; never a platform default). */
  closesOn?: string;
  instructions: string;
  case: string; decision?: string; at: string; by: string; sample?: true;
}
export interface Ceiling {
  id: string; institution: string; period: string; amountMinor: number; currency: string; version: number;
  case: string; decision?: string; at: string; by: string; sample?: true;
  history: { version: number; amountMinor: number; case: string; at: string; by: string }[];
}
export interface Bid {
  id: string; ref: string; institution: string; period: string; programme: string; currency: string; requestedMinor: number;
  versions: { n: number; at: string; requestedMinor: number; reason: string; by: string; case: string }[];
  negotiation?: { at: string; agreedMinor: number; note: string; by: string };
  allocationMinor?: number;
  state: 'submitted' | 'negotiated' | 'allocated' | 'not-allocated' | 'withdrawn';
  case: string; decision?: string; at: string; sample?: true;
}
export interface AppropriationVersion { n: number; at: string; amountMinor: number; releasedMinor: number; change: 'enacted' | 'validated' | 'released' | 'virement-out' | 'virement-in' | 'supplementary' | 'further-release' | 'reduction'; reason: string; case: string; by: string; basis?: Citation[] }
export interface Appropriation {
  id: string;
  /** The appropriation number this register gives (APP-YYYY-NNNNNN). */
  ref: string;
  /** What other records cite: fin:APP-… */
  reference: string;
  period: string; institution: string; programme: string; economicCode?: string; fund?: string;
  /** The amount the law appropriates (as last revised). */
  amountMinor: number;
  /** The part released for commitment (an allotment). */
  releasedMinor: number;
  currency: string;
  /** The provisions of the appropriation law, cited from the laws register on the day recorded. */
  basis: Citation[];
  /** The allocated bid it came from, where it did. */
  bid?: string;
  state: 'enacted' | 'validated' | 'released' | 'not-released';
  validation?: { at: string; by: string; note: string; case: string };
  versions: AppropriationVersion[];
  case: string; decisions: string[]; at: string; sample?: true;
}
export interface Commitment {
  id: string; ref: string; reference: string; appropriation: string; appropriationRef: string; institution: string;
  /** The supplier, an organisation of the organisations register (by number): never a second identity. */
  supplier: { number: string; name: string };
  /** The procurement contract it rests on, where there is one (lib/procurement). */
  contract?: string;
  description: string; amountMinor: number; currency: string;
  state: 'committed' | 'cancelled' | 'closed';
  ended?: { at: string; by: string; reason: string; releasedMinor: number; case: string };
  case: string; decision?: string; at: string; by: string; sample?: true;
}
export interface PaymentOrder {
  id: string; ref: string; reference: string;
  commitment: string; commitmentRef: string; appropriation: string; institution: string;
  payee: { number: string; name: string };
  /** The payee account in force when instructed (masked): the payment goes there and nowhere else. */
  account: { id: string; ref: string; masked: string };
  invoice: { ref: string; date: string; amountMinor: number; certification?: string };
  amountMinor: number; currency: string; purpose: string;
  /** The approval tier from the approved rule, or why there was none (a demonstration only). */
  tier?: { tier: string; rule: RuleRef } | { none: string };
  instructed: StepRecord;
  verified?: StepRecord & { note: string };
  approved?: StepRecord & { confirmedBy: Who; decision?: string };
  executed?: StepRecord & { bankReference: string; valueDate: string; amountMinor: number };
  reconciled?: StepRecord & { statementReference: string; amountMinor: number };
  ended?: StepRecord & { reason: string; kind: 'rejected' | 'failed' | 'cancelled' };
  state: 'instructed' | 'verified' | 'approved' | 'executed' | 'reconciled' | 'rejected' | 'failed' | 'cancelled';
  case: string; sample?: true;
}
export interface PayeeAccount {
  id: string; ref: string; organisation: { number: string; name: string };
  bank: string;
  /** Sealed at rest (lib/crypto/envelope.ts); never returned. */
  sealedNumber: string;
  masked: string;
  state: 'requested' | 'verified' | 'active' | 'superseded' | 'refused';
  requested: StepRecord & { reason: string };
  verified?: StepRecord & { method: string; note: string };
  approved?: StepRecord & { confirmedBy: Who; decision?: string };
  refused?: StepRecord & { reason: string };
  effectiveAt?: string; supersededAt?: string;
  case: string; sample?: true;
}
export interface ForecastLine { category: string; amountMinor: number; date?: string; source?: string }
export interface CashForecast {
  id: string; ref: string; institution: string; period: string; currency: string; version: number;
  /** The version this one revises. */
  previous?: string;
  inflows: ForecastLine[]; outflows: ForecastLine[];
  assumptions: string;
  /** A forecast is what an institution reports: never an observation, never shown as the nation's cash. */
  basis: 'reported';
  varianceNote?: string;
  state: 'submitted' | 'reviewed' | 'returned' | 'closed';
  review?: StepRecord & { note: string };
  case: string; at: string; by: string; sample?: true;
}

interface FinanceDb {
  calls: BudgetCall[]; ceilings: Ceiling[]; bids: Bid[]; appropriations: Appropriation[]; commitments: Commitment[];
  payments: PaymentOrder[]; payees: PayeeAccount[]; forecasts: CashForecast[];
  callSeq: number; appSeq: number; comSeq: number; paySeq: number; pacSeq: number; cfSeq: number;
}
const g = globalThis as unknown as { __civicosFinance?: FinanceDb };
const db = (): FinanceDb => {
  const d = touch('__civicosFinance', g.__civicosFinance ??= { calls: [], ceilings: [], bids: [], appropriations: [], commitments: [], payments: [], payees: [], forecasts: [], callSeq: 0, appSeq: 0, comSeq: 0, paySeq: 0, pacSeq: 0, cfSeq: 0 });
  d.calls ??= []; d.ceilings ??= []; d.bids ??= []; d.appropriations ??= []; d.commitments ??= []; d.payments ??= []; d.payees ??= []; d.forecasts ??= [];
  return d;
};
export function resetFinance(): void { g.__civicosFinance = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const PERIOD = /^\d{4}(-\d{2}|-Q[1-4]|-\d{4})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CUR = /^[A-Z]{3}$/;
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const money = (n: number, c: string) => `${c} ${(n / 100).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ok = (s: unknown, max = 200): string => (typeof s === 'string' ? s.trim().slice(0, max) : '');
/**
 * Whether two officials are the same person: by account and by the person
 * behind it at the identity provider (personOf(), lib/data/dual-control.ts;
 * two accounts of one person are one official); by declared name only where
 * sign-in is not enforced.
 */
export function samePerson(a: Who | undefined, b: Who | undefined): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) {
    if (a.id === b.id) return true;
    const x = personOf(a.id), y = personOf(b.id);
    return x.bound && y.bound && x.key === y.key;
  }
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
const same = samePerson;

// ── Budget preparation (field series §2.5 Department A) ──────────────────────

export function issueCall(input: { period: string; currency: string; closesOn?: string; instructions: string; case: string; by: string; at: string; sample?: true }): BudgetCall | { error: string } {
  if (!PERIOD.test(input.period)) return { error: 'The budget period is a year (2027), a year span (2027-2028) or a part of a year (2027-03, 2027-Q1)' };
  if (!CUR.test(input.currency)) return { error: 'The budget currency is a three-letter code' };
  if (input.closesOn && !DATE.test(input.closesOn)) return { error: 'The date submissions close is a date (YYYY-MM-DD), as the circular states it' };
  if (ok(input.instructions, 4000).length < 10) return { error: 'Give the circular\'s instructions' };
  const d = db();
  const c: BudgetCall = { id: uuid7(), ref: nextNumber(d as unknown as Record<string, unknown>, 'callSeq', 'BC', new Date(input.at)), period: input.period, currency: input.currency, ...(input.closesOn ? { closesOn: input.closesOn } : {}), instructions: ok(input.instructions, 4000), case: input.case, at: input.at, by: input.by, ...(input.sample ? { sample: true as const } : {}) };
  d.calls.push(c);
  recordAudit(input.by, 'finance.call.issue', `BudgetCall:${c.ref}`, 'ok', `budget period ${c.period} · ${c.currency}${c.closesOn ? ` · submissions close ${c.closesOn}` : ''} · case ${input.case}`);
  return clone(c);
}
/** The budget call in force for a period: the latest issued. */
export const callFor = (period: string): BudgetCall | undefined => { const c = [...db().calls].reverse().find(x => x.period === period); return c ? clone(c) : undefined; };

export function setCeiling(input: { institution: string; period: string; amountMinor: number; currency: string; case: string; by: string; at: string; sample?: true }): Ceiling | { error: string } {
  const call = callFor(input.period);
  if (!call) return { error: `No budget call is issued for ${input.period}: the circular comes first` };
  if (call.currency !== input.currency) return { error: `The budget for ${input.period} is in ${call.currency}` };
  if (!whole(input.amountMinor)) return { error: 'A ceiling is a positive whole number of minor units' };
  const d = db();
  const cur = d.ceilings.find(x => x.institution === input.institution && x.period === input.period);
  if (cur) {
    cur.history.push({ version: cur.version, amountMinor: cur.amountMinor, case: cur.case, at: cur.at, by: cur.by });
    Object.assign(cur, { amountMinor: input.amountMinor, version: cur.version + 1, case: input.case, at: input.at, by: input.by });
    recordAudit(input.by, 'finance.ceiling.revise', `Ceiling:${cur.institution}:${cur.period}`, 'ok', `version ${cur.version} · ${money(cur.amountMinor, cur.currency)} · case ${input.case}`);
    return clone(cur);
  }
  const c: Ceiling = { id: uuid7(), institution: input.institution, period: input.period, amountMinor: input.amountMinor, currency: input.currency, version: 1, case: input.case, at: input.at, by: input.by, history: [], ...(input.sample ? { sample: true as const } : {}) };
  d.ceilings.push(c);
  recordAudit(input.by, 'finance.ceiling.approve', `Ceiling:${c.institution}:${c.period}`, 'ok', `${money(c.amountMinor, c.currency)} · case ${input.case}`);
  return clone(c);
}
export const ceilingFor = (institution: string, period: string): Ceiling | undefined => { const c = db().ceilings.find(x => x.institution === institution && x.period === period); return c ? clone(c) : undefined; };

export function recordBid(input: { ref: string; institution: string; period: string; programme: string; requestedMinor: number; currency: string; lateReason?: string; case: string; by: string; at: string; sample?: true }): Bid | { error: string } {
  const call = callFor(input.period);
  if (!call) return { error: `No budget call is issued for ${input.period}` };
  if (call.currency !== input.currency) return { error: `Budget bids for ${input.period} are in ${call.currency}` };
  if (call.closesOn && input.at.slice(0, 10) > call.closesOn && !ok(input.lateReason)) return { error: `Submissions for ${input.period} closed on ${call.closesOn} (the circular's date): record why a late bid is accepted, or return it` };
  if (!ceilingFor(input.institution, input.period)) return { error: `No approved ceiling for this institution in ${input.period}: a bid is made against an approved ceiling` };
  if (!whole(input.requestedMinor)) return { error: 'The amount requested is a positive whole number of minor units' };
  if (!ok(input.programme)) return { error: 'Name the programme or service the funding is for' };
  const d = db();
  if (d.bids.some(b => b.case === input.case)) return { error: 'This case already holds a bid: revise it' };
  const b: Bid = {
    id: uuid7(), ref: input.ref, institution: input.institution, period: input.period, programme: ok(input.programme), currency: input.currency, requestedMinor: input.requestedMinor,
    versions: [{ n: 1, at: input.at, requestedMinor: input.requestedMinor, reason: input.lateReason ? `Submitted late: ${ok(input.lateReason, 500)}` : 'Submitted', by: input.by, case: input.case }],
    state: 'submitted', case: input.case, at: input.at, ...(input.sample ? { sample: true as const } : {}),
  };
  d.bids.push(b);
  recordAudit(input.by, 'finance.bid.record', `Bid:${b.ref}`, 'ok', `${b.institution} · ${b.period} · ${b.programme} · ${money(b.requestedMinor, b.currency)}`);
  return clone(b);
}
const bidOfCase = (caseId: string) => db().bids.find(b => b.case === caseId);
export const getBid = (caseIdOrRef: string): Bid | undefined => { const b = db().bids.find(x => x.case === caseIdOrRef || x.ref === caseIdOrRef); return b ? clone(b) : undefined; };

export function reviseBid(caseId: string, requestedMinor: number, reason: string, by: string, at: string): Bid | { error: string } {
  const b = bidOfCase(caseId);
  if (!b) return { error: 'No bid is recorded on this case' };
  if (b.state !== 'submitted') return { error: `The bid is ${b.state}` };
  if (!whole(requestedMinor)) return { error: 'The revised amount is a positive whole number of minor units' };
  if (!ok(reason)) return { error: 'Say why the bid is revised' };
  b.versions.push({ n: b.versions.length + 1, at, requestedMinor, reason: ok(reason, 500), by, case: caseId });
  b.requestedMinor = requestedMinor;
  recordAudit(by, 'finance.bid.revise', `Bid:${b.ref}`, 'ok', `version ${b.versions.length} · ${money(requestedMinor, b.currency)}`);
  return clone(b);
}

export function negotiateBid(caseId: string, agreedMinor: number, note: string, by: string, at: string): Bid | { error: string } {
  const b = bidOfCase(caseId);
  if (!b) return { error: 'No bid is recorded on this case' };
  if (b.state !== 'submitted' && b.state !== 'negotiated') return { error: `The bid is ${b.state}` };
  if (!Number.isInteger(agreedMinor) || agreedMinor < 0) return { error: 'The outcome of the negotiation is a whole number of minor units (0 when nothing is agreed)' };
  if (!ok(note)) return { error: 'Record what was agreed and why' };
  b.negotiation = { at, agreedMinor, note: ok(note, 2000), by };
  b.state = 'negotiated';
  recordAudit(by, 'finance.bid.negotiate', `Bid:${b.ref}`, 'ok', `agreed ${money(agreedMinor, b.currency)}`);
  return clone(b);
}

/** Allocate a negotiated bid (a decision of two officials): never above the institution's ceiling with its other allocations. */
export function allocateBid(caseId: string, allocationMinor: number, by: string, at: string): Bid | { error: string } {
  const b = bidOfCase(caseId);
  if (!b) return { error: 'No bid is recorded on this case' };
  if (b.state !== 'negotiated') return { error: 'The negotiation outcome is recorded before the allocation' };
  if (!whole(allocationMinor)) return { error: 'The allocation is a positive whole number of minor units' };
  const ceiling = ceilingFor(b.institution, b.period);
  if (!ceiling) return { error: 'No approved ceiling for this institution and period' };
  const others = db().bids.filter(x => x.id !== b.id && x.institution === b.institution && x.period === b.period && x.state === 'allocated').reduce((s, x) => s + (x.allocationMinor ?? 0), 0);
  if (others + allocationMinor > ceiling.amountMinor) return { error: `Above the approved ceiling (${money(ceiling.amountMinor, ceiling.currency)}, of which ${money(others, ceiling.currency)} is allocated): revise the ceiling under its own procedure, or allocate less` };
  b.allocationMinor = allocationMinor;
  b.state = 'allocated';
  recordAudit(by, 'finance.bid.allocate', `Bid:${b.ref}`, 'ok', `${money(allocationMinor, b.currency)} of ${money(b.requestedMinor, b.currency)} requested · ${at.slice(0, 10)}`);
  return clone(b);
}
export function closeBid(caseId: string, state: 'not-allocated' | 'withdrawn', reason: string, by: string): Bid | { error: string } {
  const b = bidOfCase(caseId);
  if (!b) return { error: 'No bid is recorded on this case' };
  if (b.state === 'allocated') return { error: 'An allocated bid is changed only by a budget revision' };
  b.state = state;
  recordAudit(by, `finance.bid.${state === 'withdrawn' ? 'withdraw' : 'refuse'}`, `Bid:${b.ref}`, 'ok', ok(reason, 200));
  return clone(b);
}

// ── Appropriations (§2.5 Department B; specification §4.3, §4.4) ─────────────

export interface AppropriationInput { period: string; institution: string; programme: string; economicCode?: string; fund?: string; amountMinor: number; currency: string; basis: Citation[]; bid?: string; case: string; by: string; at: string; sample?: true }
export function enactAppropriation(input: AppropriationInput): Appropriation | { error: string } {
  if (!PERIOD.test(input.period)) return { error: 'The budget period is a year (2027), a year span or a part of a year' };
  if (!CUR.test(input.currency)) return { error: 'The currency is a three-letter code' };
  if (!whole(input.amountMinor)) return { error: 'The appropriated amount is a positive whole number of minor units' };
  if (!input.basis.length) return { error: 'An appropriation rests on the law that makes it: cite the appropriation act from the laws register' };
  if (!ok(input.programme)) return { error: 'Name the programme the law appropriates for' };
  const d = db();
  const dup = d.appropriations.find(a => a.period === input.period && a.institution === input.institution && a.programme === ok(input.programme) && (a.economicCode ?? '') === (input.economicCode ?? '') && (a.fund ?? '') === (input.fund ?? '') && a.state !== 'not-released');
  if (dup) return { error: `${dup.ref} already appropriates this line: change it through a budget revision` };
  if (input.bid) {
    const b = getBid(input.bid);
    if (!b || b.state !== 'allocated') return { error: `Bid ${input.bid} is not an allocated bid` };
    if (b.institution !== input.institution || b.period !== input.period) return { error: `Bid ${input.bid} is for another institution or period` };
  }
  if (d.appropriations.some(a => a.case === input.case)) return { error: 'This case already recorded an appropriation' };
  const ref = nextNumber(d as unknown as Record<string, unknown>, 'appSeq', 'APP', new Date(input.at));
  const a: Appropriation = {
    id: uuid7(), ref, reference: `fin:${ref}`, period: input.period, institution: input.institution, programme: ok(input.programme),
    ...(input.economicCode ? { economicCode: ok(input.economicCode, 40) } : {}), ...(input.fund ? { fund: ok(input.fund, 80) } : {}),
    amountMinor: input.amountMinor, releasedMinor: 0, currency: input.currency, basis: clone(input.basis), ...(input.bid ? { bid: input.bid } : {}),
    state: 'enacted', versions: [{ n: 1, at: input.at, amountMinor: input.amountMinor, releasedMinor: 0, change: 'enacted', reason: 'Recorded as enacted', case: input.case, by: input.by, basis: clone(input.basis) }],
    case: input.case, decisions: [], at: input.at, ...(input.sample ? { sample: true as const } : {}),
  };
  d.appropriations.push(a);
  recordAudit(input.by, 'finance.appropriation.enact', `Appropriation:${a.ref}`, 'ok', `${a.institution} · ${a.period} · ${a.programme} · ${money(a.amountMinor, a.currency)} · ${a.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ').slice(0, 120)}`);
  return clone(a);
}
const findApp = (x: string) => db().appropriations.find(a => a.id === x || a.ref === x || a.reference === x || a.case === x);
export const getAppropriation = (idOrRef: string): Appropriation | undefined => { const a = findApp(idOrRef.replace(/^fin:/, '')) ?? findApp(idOrRef); return a ? clone(a) : undefined; };

export function validateAppropriation(caseId: string, note: string, by: string, at: string): Appropriation | { error: string } {
  const a = findApp(caseId);
  if (!a) return { error: 'No appropriation is recorded on this case' };
  if (a.state !== 'enacted') return { error: `The appropriation is ${a.state}` };
  if (!ok(note)) return { error: 'Record what was checked: the law in force, the institution\'s authority and the amount' };
  a.validation = { at, by, note: ok(note, 2000), case: caseId };
  a.state = 'validated';
  a.versions.push({ n: a.versions.length + 1, at, amountMinor: a.amountMinor, releasedMinor: a.releasedMinor, change: 'validated', reason: ok(note, 500), case: caseId, by });
  recordAudit(by, 'finance.appropriation.validate', `Appropriation:${a.ref}`, 'ok', ok(note, 160));
  return clone(a);
}

export function releaseAppropriation(caseId: string, releaseMinor: number, reason: string, by: string, at: string): Appropriation | { error: string } {
  const a = findApp(caseId);
  if (!a) return { error: 'No appropriation is recorded on this case' };
  if (a.state !== 'validated') return { error: 'The authority is validated before the appropriation is released' };
  if (!whole(releaseMinor) || releaseMinor > a.amountMinor) return { error: `The release is a positive whole number of minor units, at most the appropriated ${money(a.amountMinor, a.currency)}` };
  a.releasedMinor = releaseMinor;
  a.state = 'released';
  a.versions.push({ n: a.versions.length + 1, at, amountMinor: a.amountMinor, releasedMinor: a.releasedMinor, change: 'released', reason: ok(reason, 500) || 'Released', case: caseId, by });
  recordAudit(by, 'finance.appropriation.release', `Appropriation:${a.ref}`, 'ok', `${money(releaseMinor, a.currency)} of ${money(a.amountMinor, a.currency)} released`);
  return clone(a);
}
export function refuseRelease(caseId: string, reason: string, by: string, at: string): Appropriation | { error: string } {
  const a = findApp(caseId);
  if (!a) return { error: 'No appropriation is recorded on this case' };
  a.state = 'not-released';
  a.versions.push({ n: a.versions.length + 1, at, amountMinor: a.amountMinor, releasedMinor: a.releasedMinor, change: 'released', reason: `Not released: ${ok(reason, 480)}`, case: caseId, by });
  recordAudit(by, 'finance.appropriation.refuse', `Appropriation:${a.ref}`, 'ok', ok(reason, 160));
  return clone(a);
}
export function attachAppropriationDecision(caseId: string, decision: string): void {
  const a = db().appropriations.find(x => x.case === caseId) ?? db().appropriations.find(x => x.versions.some(v => v.case === caseId));
  if (a && !a.decisions.includes(decision)) a.decisions.push(decision);
}

/** What an appropriation holds now, computed from the records each time (never typed). */
export interface Balance { amountMinor: number; releasedMinor: number; committedMinor: number; paidMinor: number; reconciledMinor: number; availableMinor: number; currency: string }
const LIVE_PAYMENT = new Set<PaymentOrder['state']>(['instructed', 'verified', 'approved', 'executed', 'reconciled']);
function committedOn(a: Appropriation): number {
  return db().commitments.filter(c => c.appropriation === a.id).reduce((s, c) => s + (c.state === 'committed' ? c.amountMinor : c.state === 'closed' ? c.amountMinor - (c.ended?.releasedMinor ?? 0) : 0), 0);
}
export function balanceOf(idOrRef: string): Balance | undefined {
  const a = findApp(idOrRef.replace(/^fin:/, '')) ?? findApp(idOrRef);
  if (!a) return undefined;
  const pays = db().payments.filter(p => p.appropriation === a.id);
  const committedMinor = committedOn(a);
  return {
    amountMinor: a.amountMinor, releasedMinor: a.releasedMinor, committedMinor,
    paidMinor: pays.filter(p => p.state === 'executed' || p.state === 'reconciled').reduce((s, p) => s + p.amountMinor, 0),
    reconciledMinor: pays.filter(p => p.state === 'reconciled').reduce((s, p) => s + p.amountMinor, 0),
    availableMinor: a.releasedMinor - committedMinor, currency: a.currency,
  };
}

export type RevisionKind = 'virement' | 'supplementary' | 'further-release' | 'reduction';
export const REVISION_KINDS: { key: RevisionKind; label: string }[] = [
  { key: 'virement', label: 'Transfer between appropriations (virement or reallocation, where the law permits)' },
  { key: 'supplementary', label: 'Supplementary appropriation (the law that provides it cited)' },
  { key: 'further-release', label: 'Further release of an enacted appropriation' },
  { key: 'reduction', label: 'Reduction (never below what is committed)' },
];
/** Check a budget revision against the records as they stand (the source and destination checks): no change is made. */
export function checkRevision(input: { kind: string; source?: string; destination: string; amountMinor: number }): { error: string } | { source?: Appropriation; destination: Appropriation } {
  if (!REVISION_KINDS.some(k => k.key === input.kind)) return { error: `Say what kind of revision (${REVISION_KINDS.map(k => k.key).join(', ')})` };
  if (!whole(input.amountMinor)) return { error: 'The amount is a positive whole number of minor units' };
  const dst = findApp(input.destination.replace(/^fin:/, ''));
  if (!dst) return { error: `No appropriation ${input.destination}` };
  if (input.kind === 'virement') {
    const src = findApp(String(input.source ?? '').replace(/^fin:/, ''));
    if (!src) return { error: 'A transfer names the appropriation it comes from' };
    if (src.id === dst.id) return { error: 'A transfer goes between two different appropriations' };
    if (src.currency !== dst.currency || src.period !== dst.period) return { error: 'A transfer stays within one budget period and currency' };
    if (src.state !== 'released' || dst.state !== 'released') return { error: 'Both appropriations are released before money moves between them' };
    const avail = balanceOf(src.id)!.availableMinor;
    if (input.amountMinor > avail) return { error: `${src.ref} has ${money(avail, src.currency)} available (released and not committed): less than the transfer` };
    return { source: clone(src), destination: clone(dst) };
  }
  if (input.kind === 'further-release') {
    if (dst.state !== 'released') return { error: `${dst.ref} is not released yet: release it under its appropriation procedure` };
    if (dst.releasedMinor + input.amountMinor > dst.amountMinor) return { error: `Only ${money(dst.amountMinor - dst.releasedMinor, dst.currency)} of ${dst.ref} is unreleased` };
  }
  if (input.kind === 'reduction') {
    const b = balanceOf(dst.id)!;
    if (dst.amountMinor - input.amountMinor < b.committedMinor) return { error: `${dst.ref} has ${money(b.committedMinor, dst.currency)} committed: a reduction never goes below that` };
  }
  if (input.kind === 'supplementary' && dst.state === 'not-released') return { error: `${dst.ref} was not released` };
  return { destination: clone(dst) };
}
/** Apply a decided budget revision: a new version of each appropriation it touches, the earlier one kept. */
export function reviseAppropriations(input: { kind: RevisionKind; source?: string; destination: string; amountMinor: number; reason: string; basis: Citation[]; case: string; by: string; at: string }): { source?: Appropriation; destination: Appropriation } | { error: string } {
  const chk = checkRevision(input);
  if ('error' in chk) return chk;
  if (!input.basis.length) return { error: 'A budget revision rests on the law that permits it: cite it from the laws register' };
  const dst = findApp(chk.destination.id)!;
  const v = (a: Appropriation, change: AppropriationVersion['change']) => a.versions.push({ n: a.versions.length + 1, at: input.at, amountMinor: a.amountMinor, releasedMinor: a.releasedMinor, change, reason: ok(input.reason, 500), case: input.case, by: input.by, basis: clone(input.basis) });
  let src: Appropriation | undefined;
  if (input.kind === 'virement') {
    src = findApp(chk.source!.id)!;
    src.amountMinor -= input.amountMinor; src.releasedMinor -= input.amountMinor; v(src, 'virement-out');
    dst.amountMinor += input.amountMinor; dst.releasedMinor += input.amountMinor; v(dst, 'virement-in');
  } else if (input.kind === 'supplementary') { dst.amountMinor += input.amountMinor; v(dst, 'supplementary'); }
  else if (input.kind === 'further-release') { dst.releasedMinor += input.amountMinor; v(dst, 'further-release'); }
  else { dst.amountMinor -= input.amountMinor; dst.releasedMinor = Math.min(dst.releasedMinor, dst.amountMinor); v(dst, 'reduction'); }
  recordAudit(input.by, 'finance.appropriation.revise', `Appropriation:${dst.ref}`, 'ok', `${input.kind} · ${money(input.amountMinor, dst.currency)}${src ? ` from ${src.ref}` : ''} · case ${input.case}`);
  return { ...(src ? { source: clone(src) } : {}), destination: clone(dst) };
}

export function listAppropriations(filter: { institution?: string; institutions?: string[]; period?: string } = {}): (Appropriation & { balance: Balance })[] {
  return db().appropriations
    .filter(a => (!filter.institution || a.institution === filter.institution) && (!filter.institutions || filter.institutions.includes(a.institution)) && (!filter.period || a.period === filter.period))
    .map(a => ({ ...clone(a), balance: balanceOf(a.id)! }));
}

// ── Commitments (§2.5 Department B; specification §4.4) ───────────────────────

export function recordCommitment(input: { appropriation: string; supplier: { number: string; name: string }; contract?: string; description: string; amountMinor: number; currency: string; case: string; by: string; at: string; sample?: true }): Commitment | { error: string } {
  const a = findApp(input.appropriation.replace(/^fin:/, ''));
  if (!a) return { error: `No appropriation ${input.appropriation}` };
  if (a.state !== 'released') return { error: `${a.ref} is not released: nothing is committed against it yet` };
  if (a.currency !== input.currency) return { error: `${a.ref} is in ${a.currency}` };
  if (!whole(input.amountMinor)) return { error: 'The commitment is a positive whole number of minor units' };
  const avail = balanceOf(a.id)!.availableMinor;
  if (input.amountMinor > avail) return { error: `${a.ref} has ${money(avail, a.currency)} available (released and not committed): less than the commitment` };
  const d = db();
  if (d.commitments.some(c => c.case === input.case)) return { error: 'This case already recorded a commitment' };
  const ref = nextNumber(d as unknown as Record<string, unknown>, 'comSeq', 'COM', new Date(input.at));
  const c: Commitment = {
    id: uuid7(), ref, reference: `fin:${ref}`, appropriation: a.id, appropriationRef: a.ref, institution: a.institution, supplier: { number: input.supplier.number, name: input.supplier.name },
    ...(input.contract ? { contract: input.contract } : {}), description: ok(input.description, 500), amountMinor: input.amountMinor, currency: input.currency,
    state: 'committed', case: input.case, at: input.at, by: input.by, ...(input.sample ? { sample: true as const } : {}),
  };
  d.commitments.push(c);
  recordAudit(input.by, 'finance.commitment.record', `Commitment:${c.ref}`, 'ok', `${a.ref} · ${money(c.amountMinor, c.currency)} · supplier ${c.supplier.number}${c.contract ? ` · contract ${c.contract}` : ''}`);
  return clone(c);
}
const findCom = (x: string) => db().commitments.find(c => c.id === x || c.ref === x || c.reference === x || c.case === x);
export const getCommitment = (idOrRef: string): Commitment | undefined => { const c = findCom(idOrRef.replace(/^fin:/, '')); return c ? clone(c) : undefined; };
/** The part of a commitment not yet taken by a live payment order. */
export function commitmentRemaining(idOrRef: string): number | undefined {
  const c = findCom(idOrRef.replace(/^fin:/, ''));
  if (!c) return undefined;
  return c.amountMinor - db().payments.filter(p => p.commitment === c.id && LIVE_PAYMENT.has(p.state)).reduce((s, p) => s + p.amountMinor, 0);
}
/** End a commitment: cancelled when nothing was paid against it, else closed; what is not paid returns to the appropriation. */
export function endCommitment(idOrRef: string, reason: string, caseRef: string, by: string, at: string): Commitment | { error: string } {
  const c = findCom(idOrRef.replace(/^fin:/, ''));
  if (!c) return { error: `No commitment ${idOrRef}` };
  if (c.state !== 'committed') return { error: `${c.ref} is ${c.state}` };
  if (db().payments.some(p => p.commitment === c.id && ['instructed', 'verified', 'approved'].includes(p.state))) return { error: `${c.ref} has a payment order in progress: finish or cancel it first` };
  if (!ok(reason)) return { error: 'Say why the commitment ends' };
  const remaining = commitmentRemaining(c.id)!;
  c.state = remaining === c.amountMinor ? 'cancelled' : 'closed';
  c.ended = { at, by, reason: ok(reason, 500), releasedMinor: remaining, case: caseRef };
  recordAudit(by, `finance.commitment.${c.state === 'cancelled' ? 'cancel' : 'close'}`, `Commitment:${c.ref}`, 'ok', `${money(remaining, c.currency)} returned to ${c.appropriationRef}`);
  return clone(c);
}
export function attachCommitmentDecision(caseId: string, decision: string): void { const c = db().commitments.find(x => x.case === caseId); if (c) c.decision ??= decision; }

// ── Payee accounts (field series Part 3 §3.5 Department B, bank-detail change; §3.7 "supplier payment changes") ──

const mask = (n: string) => `•••• ${n.replace(/\s|-/g, '').slice(-4)}`;
export function requestPayeeAccount(input: { organisation: { number: string; name: string }; bank: string; accountNumber: string; reason: string; case: string; by: Who; at: string; sample?: true }): PayeeAccount | { error: string } {
  const n = ok(input.accountNumber, 60);
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{5,40}$/.test(n)) return { error: 'The account number is letters and digits (an IBAN or the bank\'s account number)' };
  if (!ok(input.bank)) return { error: 'Name the bank (or its identifier)' };
  if (!ok(input.reason)) return { error: 'Say why the account is given or changed' };
  const d = db();
  if (d.payees.some(p => p.case === input.case)) return { error: 'This case already holds an account request' };
  const id = uuid7();
  const p: PayeeAccount = {
    id, ref: nextNumber(d as unknown as Record<string, unknown>, 'pacSeq', 'PAC', new Date(input.at)), organisation: clone(input.organisation), bank: ok(input.bank, 120),
    sealedNumber: seal(n, `payee:${id}`), masked: mask(n), state: 'requested', requested: { by: clone(input.by), at: input.at, case: input.case, reason: ok(input.reason, 500) },
    case: input.case, ...(input.sample ? { sample: true as const } : {}),
  };
  d.payees.push(p);
  recordAudit(input.by.name, 'finance.payee.request', `PayeeAccount:${p.ref}`, 'ok', `${p.organisation.number} · ${p.bank} ${p.masked} requested (not in force)`);
  return clone(p);
}
const payeeOfCase = (caseId: string) => db().payees.find(p => p.case === caseId);
export function verifyPayeeAccount(caseId: string, method: string, note: string, by: Who, at: string): PayeeAccount | { error: string } {
  const p = payeeOfCase(caseId);
  if (!p) return { error: 'No account request on this case' };
  if (p.state !== 'requested') return { error: `The request is ${p.state}` };
  if (same(p.requested.by, by)) return { error: 'Separation of duties: the account is verified by a different person from the one who recorded the request' };
  if (!ok(method) || !ok(note)) return { error: 'Record how the account was verified (the method the nation approves, e.g. a call back to the contact on the organisations register) and what was found' };
  p.verified = { by: clone(by), at, case: caseId, method: ok(method, 120), note: ok(note, 1000) };
  p.state = 'verified';
  recordAudit(by.name, 'finance.payee.verify', `PayeeAccount:${p.ref}`, 'ok', `verified by ${p.verified.method}`);
  return clone(p);
}
export function approvePayeeAccount(caseId: string, proposer: Who, confirmer: Who, at: string): PayeeAccount | { error: string } {
  const p = payeeOfCase(caseId);
  if (!p) return { error: 'No account request on this case' };
  if (p.state !== 'verified') return { error: 'The account is verified before it is approved' };
  for (const o of [proposer, confirmer]) if (same(o, p.requested.by) || same(o, p.verified?.by)) return { error: 'Separation of duties: the account is approved by persons other than those who recorded and verified the request' };
  for (const x of db().payees) if (x.organisation.number === p.organisation.number && x.state === 'active') { x.state = 'superseded'; x.supersededAt = at; }
  p.approved = { by: clone(proposer), confirmedBy: clone(confirmer), at, case: caseId };
  p.state = 'active';
  p.effectiveAt = at;
  recordAudit(confirmer.name, 'finance.payee.approve', `PayeeAccount:${p.ref}`, 'ok', `${p.organisation.number} · ${p.bank} ${p.masked} in force · proposed by ${proposer.name}`);
  return clone(p);
}
export function refusePayeeAccount(caseId: string, reason: string, by: Who, at: string): PayeeAccount | { error: string } {
  const p = payeeOfCase(caseId);
  if (!p) return { error: 'No account request on this case' };
  if (p.state === 'active' || p.state === 'superseded') return { error: `The account is ${p.state}` };
  p.refused = { by: clone(by), at, case: caseId, reason: ok(reason, 500) };
  p.state = 'refused';
  recordAudit(by.name, 'finance.payee.refuse', `PayeeAccount:${p.ref}`, 'ok', ok(reason, 160));
  return clone(p);
}
export function attachPayeeDecision(caseId: string, decision: string): void { const p = payeeOfCase(caseId); if (p?.approved) p.approved.decision ??= decision; }
/** The account a payee is paid into now (masked; the number never leaves the register). */
export function payeeAccountInForce(orgNumber: string): Omit<PayeeAccount, 'sealedNumber'> | undefined {
  const p = db().payees.find(x => x.organisation.number === orgNumber && x.state === 'active');
  if (!p) return undefined;
  const { sealedNumber: _s, ...rest } = clone(p);
  return rest;
}
export const listPayeeAccounts = (orgNumbers?: string[]): Omit<PayeeAccount, 'sealedNumber'>[] =>
  db().payees.filter(p => !orgNumbers || orgNumbers.includes(p.organisation.number)).map(p => { const { sealedNumber: _s, ...rest } = clone(p); return rest; });

// ── Payment orders (§2.4 Department A; specification §4.3 government payment) ─

export function instructPayment(input: { commitment: string; invoice: { ref: string; date: string; amountMinor: number; certification?: string }; amountMinor: number; purpose: string; tier?: PaymentOrder['tier']; case: string; by: Who; at: string; sample?: true }): PaymentOrder | { error: string } {
  const c = findCom(input.commitment.replace(/^fin:/, ''));
  if (!c) return { error: `No commitment ${input.commitment}` };
  if (c.state !== 'committed') return { error: `${c.ref} is ${c.state}: nothing more is paid against it` };
  if (!ok(input.invoice.ref) || !DATE.test(input.invoice.date) || !whole(input.invoice.amountMinor)) return { error: 'Give the invoice\'s reference, date and amount' };
  if (!whole(input.amountMinor) || input.amountMinor > input.invoice.amountMinor) return { error: 'The payment is a positive whole number of minor units, at most the invoice' };
  const remaining = commitmentRemaining(c.id)!;
  if (input.amountMinor > remaining) return { error: `${c.ref} has ${money(remaining, c.currency)} left to pay: less than the payment` };
  const d = db();
  if (d.payments.some(p => p.payee.number === c.supplier.number && p.invoice.ref === ok(input.invoice.ref, 80) && LIVE_PAYMENT.has(p.state))) return { error: `Invoice ${input.invoice.ref} of ${c.supplier.number} already has a payment order: an invoice is paid once` };
  const account = payeeAccountInForce(c.supplier.number);
  if (!account) return { error: `${c.supplier.name} (${c.supplier.number}) has no verified, approved payee account in force: its account is approved under its own procedure first` };
  if (d.payments.some(p => p.case === input.case)) return { error: 'This case already holds a payment order' };
  const ref = nextNumber(d as unknown as Record<string, unknown>, 'paySeq', 'PO', new Date(input.at));
  const p: PaymentOrder = {
    id: uuid7(), ref, reference: `fin:${ref}`, commitment: c.id, commitmentRef: c.ref, appropriation: c.appropriation, institution: c.institution,
    payee: clone(c.supplier), account: { id: account.id, ref: account.ref, masked: account.masked },
    invoice: { ref: ok(input.invoice.ref, 80), date: input.invoice.date, amountMinor: input.invoice.amountMinor, ...(input.invoice.certification ? { certification: input.invoice.certification } : {}) },
    amountMinor: input.amountMinor, currency: c.currency, purpose: ok(input.purpose, 200), ...(input.tier ? { tier: clone(input.tier) } : {}),
    instructed: { by: clone(input.by), at: input.at, case: input.case }, state: 'instructed', case: input.case, ...(input.sample ? { sample: true as const } : {}),
  };
  d.payments.push(p);
  recordAudit(input.by.name, 'finance.payment.instruct', `Payment:${p.ref}`, 'ok', `${c.ref} · ${money(p.amountMinor, p.currency)} to ${p.payee.number} ${p.account.masked} · invoice ${p.invoice.ref}`);
  return clone(p);
}
const payOfCase = (caseId: string) => db().payments.find(p => p.case === caseId);
export const getPayment = (idOrRef: string): PaymentOrder | undefined => { const p = db().payments.find(x => x.id === idOrRef || x.ref === idOrRef || x.reference === idOrRef || x.case === idOrRef); return p ? clone(p) : undefined; };

export function verifyPayment(caseId: string, note: string, by: Who, at: string): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  if (p.state !== 'instructed') return { error: `The payment order is ${p.state}` };
  if (same(p.instructed.by, by)) return { error: 'Separation of duties: the payment is verified by a different person from the one who instructed it' };
  if (!ok(note)) return { error: 'Record what was verified (the invoice against the commitment, the payee account, the evidence)' };
  p.verified = { by: clone(by), at, case: caseId, note: ok(note, 1000) };
  p.state = 'verified';
  recordAudit(by.name, 'finance.payment.verify', `Payment:${p.ref}`, 'ok', ok(note, 120));
  return clone(p);
}
export function approvePayment(caseId: string, proposer: Who, confirmer: Who, at: string): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  if (p.state !== 'verified') return { error: 'The payment is verified before it is approved' };
  if (same(proposer, confirmer)) return { error: 'Two different officials approve a payment' };
  for (const o of [proposer, confirmer]) if (same(o, p.instructed.by) || same(o, p.verified?.by)) return { error: 'Separation of duties: a payment is approved by persons other than those who instructed and verified it' };
  // The money must still be there: the commitment and the appropriation as they stand now.
  const c = findCom(p.commitment)!;
  if (c.state !== 'committed') return { error: `${c.ref} is ${c.state}` };
  p.approved = { by: clone(proposer), confirmedBy: clone(confirmer), at, case: caseId };
  p.state = 'approved';
  recordAudit(confirmer.name, 'finance.payment.approve', `Payment:${p.ref}`, 'ok', `${money(p.amountMinor, p.currency)} · proposed by ${proposer.name}, confirmed by ${confirmer.name}`);
  return clone(p);
}
/** The sealed approval and the tier it was made under (the approved rule's, or why none applied). */
export function attachPaymentDecision(caseId: string, decision: string, tier?: PaymentOrder['tier']): void { const p = payOfCase(caseId); if (p?.approved) { p.approved.decision ??= decision; if (tier) p.tier = clone(tier); } }

/** Record the bank's confirmation that the money moved (its own reference): an approval is never taken as an execution. */
export function executePayment(caseId: string, bank: { bankReference: string; valueDate: string; amountMinor: number }, by: Who, at: string): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  if (p.state !== 'approved') return { error: 'Only an approved payment is executed' };
  for (const o of [p.instructed.by, p.approved?.by, p.approved?.confirmedBy]) if (same(o, by)) return { error: 'Separation of duties: the payment is executed by a person other than those who instructed and approved it' };
  const ref = ok(bank.bankReference, 120);
  if (!ref || !DATE.test(bank.valueDate)) return { error: 'Give the bank\'s own transaction reference and the value date' };
  if (db().payments.some(x => x.executed?.bankReference === ref)) return { error: `Bank transaction ${ref} is already recorded against another payment` };
  if (bank.amountMinor !== p.amountMinor) return { error: `The bank confirms ${money(bank.amountMinor, p.currency)}, not the approved ${money(p.amountMinor, p.currency)}: record a failed or partial execution as an exception` };
  p.executed = { by: clone(by), at, case: caseId, bankReference: ref, valueDate: bank.valueDate, amountMinor: bank.amountMinor };
  p.state = 'executed';
  recordAudit(by.name, 'finance.payment.execute', `Payment:${p.ref}`, 'ok', `bank ${ref} · value ${bank.valueDate}`);
  return clone(p);
}
/** Reconcile an executed payment against the bank statement, once: an execution is never taken as a reconciliation. */
export function reconcilePayment(caseId: string, stmt: { statementReference: string; amountMinor: number }, by: Who, at: string): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  if (p.state === 'reconciled') return { error: `${p.ref} is already reconciled against ${p.reconciled!.statementReference}` };
  if (p.state !== 'executed') return { error: 'Only an executed payment is reconciled' };
  for (const o of [p.instructed.by, p.approved?.by, p.approved?.confirmedBy, p.executed?.by]) if (same(o, by)) return { error: 'Separation of duties: the payment is reconciled by a person other than those who instructed, approved and executed it' };
  const ref = ok(stmt.statementReference, 120);
  if (!ref) return { error: 'Give the bank statement line\'s reference' };
  if (db().payments.some(x => x.reconciled?.statementReference === ref)) return { error: `Statement line ${ref} is already reconciled against another payment` };
  if (stmt.amountMinor !== p.executed!.amountMinor) return { error: `The statement shows ${money(stmt.amountMinor, p.currency)}, not ${money(p.executed!.amountMinor, p.currency)}: it stays unreconciled as an exception for an official to resolve` };
  p.reconciled = { by: clone(by), at, case: caseId, statementReference: ref, amountMinor: stmt.amountMinor };
  p.state = 'reconciled';
  recordAudit(by.name, 'finance.payment.reconcile', `Payment:${p.ref}`, 'ok', `statement ${ref}`);
  return clone(p);
}
export function endPayment(caseId: string, kind: 'rejected' | 'failed' | 'cancelled', reason: string, by: Who, at: string): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  const from: Record<typeof kind, PaymentOrder['state'][]> = { rejected: ['verified'], failed: ['approved'], cancelled: ['instructed', 'verified'] };
  if (!from[kind].includes(p.state)) return { error: `A payment order that is ${p.state} cannot be ${kind}` };
  if (!ok(reason)) return { error: 'Give the reasons' };
  p.ended = { by: clone(by), at, case: caseId, reason: ok(reason, 500), kind };
  p.state = kind;
  recordAudit(by.name, `finance.payment.${kind === 'rejected' ? 'reject' : kind === 'failed' ? 'fail' : 'cancel'}`, `Payment:${p.ref}`, 'ok', ok(reason, 160));
  return clone(p);
}
/** A failed execution is approved again for a retry (the approval stands; the bank reference of the failure is not reused). */
export function retryPayment(caseId: string, by: Who): PaymentOrder | { error: string } {
  const p = payOfCase(caseId);
  if (!p) return { error: 'No payment order on this case' };
  if (p.state !== 'failed') return { error: 'Only a failed execution is retried' };
  p.state = 'approved';
  recordAudit(by.name, 'finance.payment.retry', `Payment:${p.ref}`, 'ok', `retry after: ${p.ended?.reason.slice(0, 120) ?? ''}`);
  delete p.ended;
  return clone(p);
}

// ── Cash forecasts (§2.4 Department B) ────────────────────────────────────────

const lines = (v: unknown): ForecastLine[] | { error: string } => {
  const arr = Array.isArray(v) ? v : [];
  const out: ForecastLine[] = [];
  for (const x of arr.slice(0, 200)) {
    const l = (x ?? {}) as Record<string, unknown>;
    const amount = typeof l.amountMinor === 'number' ? l.amountMinor : Number(l.amountMinor);
    if (!ok(l.category) || !Number.isInteger(amount) || amount < 0) return { error: 'Each forecast line has a category and a whole, non-negative amount in minor units' };
    if (l.date !== undefined && l.date !== '' && !DATE.test(String(l.date))) return { error: 'A forecast line\'s date is YYYY-MM-DD' };
    out.push({ category: ok(l.category, 80), amountMinor: amount, ...(l.date ? { date: String(l.date) } : {}), ...(ok(l.source) ? { source: ok(l.source, 80) } : {}) });
  }
  return out;
};
export function submitForecast(input: { institution: string; period: string; currency: string; inflows: unknown; outflows: unknown; assumptions: string; varianceNote?: string; case: string; by: string; at: string; sample?: true }): CashForecast | { error: string } {
  if (!PERIOD.test(input.period)) return { error: 'The forecast period is a year, a month (YYYY-MM) or a quarter (YYYY-Q1)' };
  if (!CUR.test(input.currency)) return { error: 'The currency is a three-letter code' };
  const inflows = lines(input.inflows), outflows = lines(input.outflows);
  if ('error' in inflows) return inflows;
  if ('error' in outflows) return outflows;
  if (!inflows.length && !outflows.length) return { error: 'A forecast has at least one inflow or outflow line' };
  if (!ok(input.assumptions)) return { error: 'State the assumptions the forecast rests on' };
  const d = db();
  if (d.forecasts.some(f => f.case === input.case)) return { error: 'This case already holds a forecast' };
  const prev = [...d.forecasts].reverse().find(f => f.institution === input.institution && f.period === input.period && f.state !== 'returned');
  if (prev && !ok(input.varianceNote)) return { error: `This revises ${prev.ref} version ${prev.version}: explain the variance` };
  const f: CashForecast = {
    id: uuid7(), ref: nextNumber(d as unknown as Record<string, unknown>, 'cfSeq', 'CF', new Date(input.at)), institution: input.institution, period: input.period, currency: input.currency,
    version: prev ? prev.version + 1 : 1, ...(prev ? { previous: prev.ref } : {}), inflows, outflows, assumptions: ok(input.assumptions, 4000), basis: 'reported',
    ...(ok(input.varianceNote) ? { varianceNote: ok(input.varianceNote, 2000) } : {}), state: 'submitted', case: input.case, at: input.at, by: input.by, ...(input.sample ? { sample: true as const } : {}),
  };
  d.forecasts.push(f);
  recordAudit(input.by, 'finance.forecast.submit', `CashForecast:${f.ref}`, 'ok', `${f.institution} · ${f.period} · version ${f.version} · reported`);
  return clone(f);
}
const fcOfCase = (caseId: string) => db().forecasts.find(f => f.case === caseId);
export function reviewForecast(caseId: string, state: 'reviewed' | 'returned' | 'closed', note: string, by: Who, at: string): CashForecast | { error: string } {
  const f = fcOfCase(caseId);
  if (!f) return { error: 'No forecast on this case' };
  if (state === 'closed' ? f.state !== 'reviewed' : f.state !== 'submitted') return { error: `The forecast is ${f.state}` };
  if (!ok(note)) return { error: 'Record the review: the assumptions and variance considered' };
  if (state !== 'closed') f.review = { by: clone(by), at, case: caseId, note: ok(note, 2000) };
  f.state = state;
  recordAudit(by.name, `finance.forecast.${state === 'reviewed' ? 'review' : state === 'returned' ? 'return' : 'close'}`, `CashForecast:${f.ref}`, 'ok', ok(note, 120));
  return clone(f);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export const getForecast = (idOrRef: string): CashForecast | undefined => { const f = db().forecasts.find(x => x.id === idOrRef || x.ref === idOrRef || x.case === idOrRef); return f ? clone(f) : undefined; };

/** Everything the finance register holds for these institutions (all when undefined): payee account numbers never leave (masked). */
export function financeRecords(institutions?: string[]) {
  const d = db();
  const mine = (i: string) => !institutions || institutions.includes(i);
  return {
    calls: d.calls.map(clone),
    ceilings: d.ceilings.filter(c => mine(c.institution)).map(clone),
    bids: d.bids.filter(b => mine(b.institution)).map(clone),
    appropriations: listAppropriations(institutions ? { institutions } : {}),
    commitments: d.commitments.filter(c => mine(c.institution)).map(c => ({ ...clone(c), remainingMinor: commitmentRemaining(c.id)! })),
    payments: d.payments.filter(p => mine(p.institution)).map(clone),
    payees: listPayeeAccounts(institutions ? [...new Set(d.commitments.filter(c => mine(c.institution)).map(c => c.supplier.number))] : undefined),
    forecasts: d.forecasts.filter(f => mine(f.institution)).map(clone),
  };
}

/** Counts by state (no amounts, no names). */
export function financeCounts() {
  const d = db();
  const by = <T extends { state: string }>(xs: T[]) => xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x.state]: (m[x.state] ?? 0) + 1 }), {});
  return { calls: d.calls.length, ceilings: d.ceilings.length, bids: by(d.bids), appropriations: by(d.appropriations), commitments: by(d.commitments), payments: by(d.payments), payees: by(d.payees), forecasts: by(d.forecasts) };
}
