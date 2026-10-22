// The tax register (owner's Cycle 3 directive, workstream 1): taxpayers, their
// tax accounts as ledgers, returns and assessments. It holds what decided
// cases put there (lib/tax/procedures.ts): a taxpayer registered, a return
// filed or amended, an assessment made, an objection decided; and payments
// posted from receipts that carry the assessment's reference
// (reconcileTaxPayments()).
//
// Nothing statutory is invented here: an assessment's amount comes from the
// approved rule in force for that tax type (lib/law/rules.ts, citing the law)
// or, when none is approved, is entered by an official with reasons. There
// are no built-in rates, penalties, interest or deadlines.
//
// Tax records are confidential (tax secrecy): read by the tax authority's
// officials and auditors with a purpose, every read logged by the routes.
// Others learn only whether a taxpayer is registered and active, through the
// exchange (taxpayer.status). Held in platform state.
//
// Tax services (plan step I5, forms batch 6): a registration changed by a
// decided amendment (versioned, the earlier state kept); refunds decided,
// instructed and reconciled once against the payout's confirmation; payment
// arrangements whose instalments are bills carrying the assessment's
// reference; voluntary disclosures and compliance reviews that end in an
// assessment; formal rulings. Interest, penalties and reliefs come only from
// an approved rule (lib/law/rules.ts); none ships.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { samplesAllowed } from '@/lib/ops/mode';
import { nextNumber, legacyMax } from '@/lib/data/numbering';
import type { Citation } from '@/lib/law/register';

export interface TaxpayerRef { kind: 'person' | 'organisation'; id: string; name: string }

export interface Taxpayer {
  id: string;
  /** The taxpayer identification number this register gives. */
  tin: string;
  party: TaxpayerRef;
  taxTypes: string[];
  state: 'active' | 'suspended' | 'deregistered';
  registeredAt: string;
  case: string;
  /** The responsible tax office, where the nation assigns one (a transfer changes it). */
  office?: string;
  /** Contact and address details as last amended (restricted, tax secrecy). */
  details?: Record<string, string>;
  /** The registration's version: each decided amendment makes a new one, the earlier state kept in history. */
  version?: number;
  history: { at: string; by: string; what: string; case?: string; before?: RegistrationState }[];
}
/** What an amendment can change, kept as it was before each change. */
export interface RegistrationState { taxTypes: string[]; state: Taxpayer['state']; office?: string; details?: Record<string, string> }

export interface LedgerEntry {
  id: string;
  at: string;
  kind: 'assessment' | 'payment' | 'adjustment' | 'refund';
  /** Positive: owed by the taxpayer; negative: credited to them. */
  amountMinor: number;
  currency: string;
  reference: string;
  case?: string;
  by: string;
  reason: string;
}

/** How a return version came: on time, nil (nothing to declare where the law requires a return), late (its consequences are the approved rule's), or an amendment. */
export type ReturnKind = 'periodic' | 'nil' | 'late' | 'amended';

export interface TaxReturn {
  id: string;
  taxpayer: string;
  taxType: string;
  /** The period it covers: YYYY, YYYY-MM or YYYY-Qn. */
  period: string;
  versions: { n: number; baseMinor: number; currency: string; filedAt: string; filedBy: string; case: string; reason: string; kind?: ReturnKind }[];
  state: 'filed' | 'assessed' | 'under-objection' | 'final';
}

export interface Assessment {
  id: string;
  /** The reference bills and receipts carry: tax:<id>. */
  reference: string;
  taxpayer: string;
  taxType: string;
  period: string;
  returnId?: string;
  baseMinor: number;
  amountMinor: number;
  currency: string;
  /** How the amount was set: by an approved rule (cited) or entered by an official with reasons. */
  method: { kind: 'rule'; rule: string; version: number; digest: string; citations: Citation[]; steps: string[] } | { kind: 'entered'; reasons: string };
  case: string;
  decision?: string;
  /** Where the assessment came from: a return, a compliance review or a voluntary disclosure (absent: a return). */
  origin?: 'return' | 'compliance' | 'disclosure';
  state: 'issued' | 'varied' | 'withdrawn';
  at: string;
  by: string;
}

/**
 * How an amount the law decides (interest, a penalty, a relief) was set: by an
 * approved rule, cited; entered with reasons (demonstration and training
 * installations only: production refuses without an approved rule); or none,
 * when the deciding officials state with reasons that the law gives none.
 */
export type LawAmount = { kind: 'rule'; rule: string; version: number; digest: string; amountMinor: number } | { kind: 'entered'; amountMinor: number; reasons: string } | { kind: 'none'; reasons: string };

export interface Refund {
  id: string;
  /** The reference the payout carries: tax-refund:<id>. */
  reference: string;
  taxpayer: string;
  taxType: string;
  period?: string;
  claimedMinor: number;
  approvedMinor: number;
  currency: string;
  basis: string;
  /** existing-credit: paid from a credit the account already shows; new-entitlement: the decision credits the account. */
  credit: 'existing-credit' | 'new-entitlement';
  interest?: LawAmount;
  state: 'approved' | 'refused' | 'instructed' | 'paid';
  reasons: string;
  case: string;
  decision?: string;
  at: string;
  by: string;
  instruction?: { at: string; by: string; case: string };
  payout?: { at: string; by: string; railReference: string; amountMinor: number; paidAt: string };
}

export interface Instalment { n: number; due: string; amountMinor: number; reference: string; bill?: string }
export interface PaymentPlan {
  id: string;
  taxpayer: string;
  taxType: string;
  /** The assessments (tax:ASM-…) the arrangement covers: every amount traces to an approved liability. */
  liabilities: string[];
  currency: string;
  instalments: Instalment[];
  interest?: LawAmount;
  state: 'approved' | 'varied' | 'cancelled' | 'defaulted' | 'completed';
  case: string;
  decision?: string;
  at: string;
  by: string;
  history: { at: string; by: string; what: string; case: string; reasons: string }[];
}

export interface Disclosure {
  id: string;
  taxpayer: string;
  taxType: string;
  periods: string[];
  /** The assessment the accepted disclosure made (tax:ASM-…), if any. */
  assessment?: string;
  /** A penalty the law imposes on the disclosure, only as the approved rule calculates it (none, with reasons, where it gives none). */
  penalty?: LawAmount;
  state: 'accepted' | 'refused';
  reasons: string;
  case: string;
  decision?: string;
  at: string;
  by: string;
}

export interface Ruling {
  id: string;
  taxpayer: string;
  taxType: string;
  /** The question as presented and the applicant's facts, kept apart from the authority's conclusion. */
  question: string;
  facts: string;
  conclusion: string;
  citations: Citation[];
  state: 'issued' | 'refused' | 'withdrawn';
  case: string;
  decision?: string;
  at: string;
  by: string;
}

interface Db {
  taxpayers: Taxpayer[]; ledger: Record<string, LedgerEntry[]>; returns: TaxReturn[]; assessments: Assessment[]; posted: string[]; seq: Record<string, number>; tinSeq: number; asmSeq: number;
  refunds: Refund[]; plans: PaymentPlan[]; disclosures: Disclosure[]; rulings: Ruling[];
  rfdSeq: number; ppaSeq: number; vdsSeq: number; rulSeq: number;
}
const g = globalThis as unknown as { __civicosTax?: Db };
const db = (): Db => {
  const d = touch('__civicosTax', g.__civicosTax ??= { taxpayers: [], ledger: {}, returns: [], assessments: [], posted: [], seq: {}, tinSeq: 0, asmSeq: 0, refunds: [], plans: [], disclosures: [], rulings: [], rfdSeq: 0, ppaSeq: 0, vdsSeq: 0, rulSeq: 0 });
  d.taxpayers ??= []; d.ledger ??= {}; d.returns ??= []; d.assessments ??= []; d.posted ??= []; d.seq ??= {};
  d.tinSeq ??= legacyMax(d.seq, 'TIN'); d.asmSeq ??= legacyMax(d.seq, 'ASM');
  d.refunds ??= []; d.plans ??= []; d.disclosures ??= []; d.rulings ??= [];
  d.rfdSeq ??= 0; d.ppaSeq ??= 0; d.vdsSeq ??= 0; d.rulSeq ??= 0;
  return d;
};
export function resetTax(): void { g.__civicosTax = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const TAX_TYPE = /^[a-z][a-z0-9-]{1,40}$/;
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/;

const SEQ = { TIN: 'tinSeq', ASM: 'asmSeq', RFD: 'rfdSeq', PPA: 'ppaSeq', VDS: 'vdsSeq', RUL: 'rulSeq' } as const;
const next = (k: keyof typeof SEQ, now: Date) => nextNumber(db() as unknown as Record<string, unknown>, SEQ[k], k, now);

// ── Taxpayers ─────────────────────────────────────────────────────────────────

export function registerTaxpayer(input: { party: TaxpayerRef; taxTypes: string[] }, caseId: string, by: string, now = new Date()): Taxpayer | { error: string } {
  if (!input.party?.id?.trim() || !input.party.name?.trim()) return { error: 'Name the person or organisation and its register reference' };
  if (!['person', 'organisation'].includes(input.party.kind)) return { error: 'A taxpayer is a person or an organisation' };
  const types = [...new Set(input.taxTypes)].filter(t => TAX_TYPE.test(t));
  if (!types.length) return { error: 'Name at least one tax type (e.g. income, value-added)' };
  if (db().taxpayers.some(t => t.party.kind === input.party.kind && t.party.id === input.party.id && t.state === 'active')) return { error: `${input.party.name} is already registered` };
  const at = now.toISOString();
  const t: Taxpayer = { id: uuid7(), tin: next('TIN', now), party: { kind: input.party.kind, id: input.party.id.trim().slice(0, 80), name: input.party.name.trim().slice(0, 200) }, taxTypes: types, state: 'active', registeredAt: at, case: caseId, history: [{ at, by, what: `Registered for ${types.join(', ')}`, case: caseId }] };
  db().taxpayers.push(t);
  recordAudit(by, 'tax.taxpayer.register', `Taxpayer:${t.tin}`, 'ok', `${t.party.kind} · ${types.join(', ')} · case ${caseId}`);
  return clone(t);
}

export const getTaxpayer = (tinOrId: string): Taxpayer | undefined => { const t = db().taxpayers.find(x => x.tin === tinOrId || x.id === tinOrId); return t ? clone(t) : undefined; };
export const findTaxpayers = (q: { party?: string; tin?: string }): Taxpayer[] => db().taxpayers.filter(t => (q.tin && t.tin === q.tin) || (q.party && t.party.id === q.party)).map(clone);

// ── Returns ───────────────────────────────────────────────────────────────────

/** File a return (or a new version of one: an amendment). The base is what the taxpayer declares, in minor units. */
export function fileReturn(input: { tin: string; taxType: string; period: string; baseMinor: number; currency: string; reason?: string; kind?: ReturnKind }, caseId: string, by: string, now = new Date()): TaxReturn | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t || t.state !== 'active') return { error: `No active taxpayer ${input.tin}` };
  if (!t.taxTypes.includes(input.taxType)) return { error: `${t.tin} is not registered for ${input.taxType}` };
  if (!PERIOD.test(input.period)) return { error: 'The period is a year (2026), a month (2026-03) or a quarter (2026-Q1)' };
  if (!Number.isInteger(input.baseMinor) || input.baseMinor < 0) return { error: 'The declared base is a whole, non-negative number of minor units' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  if (input.kind === 'nil' && input.baseMinor !== 0) return { error: 'A nil return declares nothing: its base is zero' };
  const kind = input.kind && input.kind !== 'periodic' ? { kind: input.kind } : {};
  const d = db();
  const at = now.toISOString();
  let r = d.returns.find(x => x.taxpayer === t.id && x.taxType === input.taxType && x.period === input.period);
  if (r) {
    if (r.state === 'final') return { error: 'This return is final: an amendment needs a decided objection or the law\'s reopening procedure' };
    r.versions.push({ n: r.versions.length + 1, baseMinor: input.baseMinor, currency: input.currency, filedAt: at, filedBy: by, case: caseId, reason: (input.reason ?? 'Amended').slice(0, 500), kind: 'amended' });
    r.state = 'filed';
    recordAudit(by, 'tax.return.amend', `TaxReturn:${r.id}`, 'ok', `${t.tin} · ${input.taxType} ${input.period} · version ${r.versions.length}`);
  } else {
    r = { id: uuid7(), taxpayer: t.id, taxType: input.taxType, period: input.period, versions: [{ n: 1, baseMinor: input.baseMinor, currency: input.currency, filedAt: at, filedBy: by, case: caseId, reason: 'Filed', ...kind }], state: 'filed' };
    d.returns.push(r);
    recordAudit(by, 'tax.return.file', `TaxReturn:${r.id}`, 'ok', `${t.tin} · ${input.taxType} ${input.period}${kind.kind ? ` · ${kind.kind}` : ''}`);
  }
  return clone(r);
}

export const getReturn = (id: string): TaxReturn | undefined => { const r = db().returns.find(x => x.id === id); return r ? clone(r) : undefined; };
export const returnsOf = (taxpayerId: string): TaxReturn[] => db().returns.filter(r => r.taxpayer === taxpayerId).map(clone);
export const returnFor = (taxpayerId: string, taxType: string, period: string): TaxReturn | undefined => { const r = db().returns.find(x => x.taxpayer === taxpayerId && x.taxType === taxType && x.period === period); return r ? clone(r) : undefined; };

// ── Assessments and the ledger ────────────────────────────────────────────────

function post(taxpayer: string, taxType: string, e: Omit<LedgerEntry, 'id'>) {
  const k = `${taxpayer}|${taxType}`;
  (db().ledger[k] ??= []).push({ id: uuid7(), ...e });
}

/** Record an assessment a decided case made, and post it to the tax account. */
export function recordAssessment(input: Omit<Assessment, 'id' | 'reference' | 'state' | 'at'>, now = new Date()): Assessment | { error: string } {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) return { error: 'The assessed amount is a whole, non-negative number of minor units' };
  if (input.method.kind === 'entered' && !input.method.reasons.trim()) return { error: 'An amount entered without an approved rule needs its reasons' };
  const id = next('ASM', now);
  const a: Assessment = { ...clone(input), id, reference: `tax:${id}`, state: 'issued', at: now.toISOString() };
  db().assessments.push(a);
  post(a.taxpayer, a.taxType, { at: a.at, kind: 'assessment', amountMinor: a.amountMinor, currency: a.currency, reference: a.reference, case: a.case, by: a.by, reason: a.method.kind === 'rule' ? `Rule ${a.method.rule} v${a.method.version}` : a.method.reasons });
  const r = a.returnId ? db().returns.find(x => x.id === a.returnId) : undefined;
  if (r) r.state = 'assessed';
  recordAudit(a.by, 'tax.assess', `Assessment:${a.id}`, 'ok', `${a.taxType} ${a.period} · ${a.currency} ${a.amountMinor / 100} · ${a.method.kind === 'rule' ? `rule ${a.method.rule} v${a.method.version}` : 'entered with reasons'} · case ${a.case}`);
  return clone(a);
}

export function attachAssessmentDecision(id: string, decision: string): void {
  const a = db().assessments.find(x => x.id === id);
  if (a) a.decision ??= decision;
}

/** An objection decided in the taxpayer's favour (or against): the assessment is varied and the difference posted. */
export function varyAssessment(id: string, newAmountMinor: number, reasons: string, caseId: string, by: string, now = new Date()): Assessment | { error: string } {
  const a = db().assessments.find(x => x.id === id || x.reference === id);
  if (!a) return { error: 'No such assessment' };
  if (!Number.isInteger(newAmountMinor) || newAmountMinor < 0) return { error: 'The varied amount is a whole, non-negative number of minor units' };
  if (!reasons.trim()) return { error: 'State the reasons' };
  const diff = newAmountMinor - a.amountMinor;
  post(a.taxpayer, a.taxType, { at: now.toISOString(), kind: 'adjustment', amountMinor: diff, currency: a.currency, reference: a.reference, case: caseId, by, reason: reasons.slice(0, 500) });
  a.amountMinor = newAmountMinor;
  a.state = 'varied';
  recordAudit(by, 'tax.assessment.vary', `Assessment:${a.id}`, 'ok', `${diff >= 0 ? '+' : ''}${diff / 100} · case ${caseId}`);
  return clone(a);
}

export const getAssessment = (idOrRef: string): Assessment | undefined => { const a = db().assessments.find(x => x.id === idOrRef || x.reference === idOrRef); return a ? clone(a) : undefined; };
export const assessmentsOf = (taxpayerId: string): Assessment[] => db().assessments.filter(a => a.taxpayer === taxpayerId).map(clone);
/** The assessment a case made (its latest). */
export const assessmentOfCase = (caseId: string): Assessment | undefined => { const a = [...db().assessments].reverse().find(x => x.case === caseId); return a ? clone(a) : undefined; };

/** A tax account: its entries and balance (positive: owed). */
export function account(taxpayerId: string, taxType: string): { entries: LedgerEntry[]; balanceMinor: number } {
  const entries = (db().ledger[`${taxpayerId}|${taxType}`] ?? []).map(clone);
  return { entries, balanceMinor: entries.reduce((s, e) => s + e.amountMinor, 0) };
}

/**
 * Post the payments that arrived for tax assessments (receipts carrying a
 * `tax:` reference, from the citizen's bill or a recorded transfer). Each
 * receipt is posted once.
 */
export function reconcileTaxPayments(receipts: { id: string; reference?: string; amountMinor: number; currency: string; paidAt: string; rail: string; simulated?: boolean }[], by = 'System (reconciliation)'): { posted: number; unmatched: string[] } {
  const d = db();
  let posted = 0; const unmatched: string[] = [];
  for (const r of receipts) {
    if (!r.reference?.startsWith('tax:') || d.posted.includes(r.id)) continue;
    // A stand-in payment (no money moved) never counts in production.
    if (r.simulated && !samplesAllowed()) continue;
    // An instalment of a payment arrangement carries the assessment's reference and its own number (tax:ASM-…#PPA-…/n).
    const [ref, instalment] = r.reference.split('#') as [string, string | undefined];
    const a = d.assessments.find(x => x.reference === ref);
    if (!a) { unmatched.push(r.id); continue; }
    post(a.taxpayer, a.taxType, { at: r.paidAt, kind: 'payment', amountMinor: -r.amountMinor, currency: r.currency, reference: a.reference, by, reason: `Payment ${r.id} by ${r.rail}${instalment ? ` (instalment ${instalment})` : ''}` });
    d.posted.push(r.id);
    posted++;
  }
  if (posted) recordAudit(by, 'tax.payments.reconcile', 'Tax:ledger', 'ok', `${posted} payments posted${unmatched.length ? ` · ${unmatched.length} unmatched` : ''}`);
  return { posted, unmatched };
}

/** Counts only (no taxpayer data): taxpayers by kind and state, returns by state, assessments by method. */
export function taxCounts() {
  const d = db();
  const count = <T,>(xs: T[], k: (x: T) => string) => xs.reduce<Record<string, number>>((m, x) => { m[k(x)] = (m[k(x)] ?? 0) + 1; return m; }, {});
  return {
    taxpayers: count(d.taxpayers, t => `${t.party.kind}:${t.state}`), returns: count(d.returns, r => r.state), assessments: count(d.assessments, a => a.method.kind),
    refunds: count(d.refunds, r => r.state), plans: count(d.plans, p => p.state), disclosures: count(d.disclosures, x => x.state), rulings: count(d.rulings, x => x.state),
  };
}

// ── Tax services (plan step I5, forms batch 6) ────────────────────────────────
// Each changes the register only from the effect of a decided case
// (lib/tax/procedures.ts). Nothing here sets an amount the law decides: an
// interest, penalty or relief comes in as a LawAmount the procedure resolved
// from an approved rule.

const ok = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const lawAmountProblem = (x: LawAmount | undefined): string | null => (!x ? null
  : x.kind === 'rule' ? (Number.isInteger(x.amountMinor) && x.amountMinor >= 0 ? null : 'The rule\'s amount is a whole, non-negative number of minor units')
  : x.kind === 'entered' ? (Number.isInteger(x.amountMinor) && x.amountMinor >= 0 && ok(x.reasons) ? null : 'An amount entered without an approved rule needs a whole amount and its reasons')
  : ok(x.reasons) ? null : 'Say why the law gives none');

/** A decided amendment of a registration: details, an obligation added or cancelled, a transfer, a suspension or a reactivation. The earlier state is kept. */
export type RegistrationChange =
  | { kind: 'details'; details: Record<string, string> }
  | { kind: 'obligation-add'; taxTypes: string[] }
  | { kind: 'obligation-cancel'; taxTypes: string[] }
  | { kind: 'transfer'; office: string }
  | { kind: 'suspend' }
  | { kind: 'reactivate' };

export function amendRegistration(tin: string, change: RegistrationChange, reasons: string, caseId: string, by: string, now = new Date()): Taxpayer | { error: string } {
  const t = db().taxpayers.find(x => x.tin === tin || x.id === tin);
  if (!t) return { error: `No taxpayer ${tin}` };
  if (t.state === 'deregistered') return { error: `${t.tin} is deregistered: a new registration is a registration case` };
  if (!ok(reasons)) return { error: 'State the reasons for the change' };
  const before: RegistrationState = { taxTypes: [...t.taxTypes], state: t.state, ...(t.office ? { office: t.office } : {}), ...(t.details ? { details: { ...t.details } } : {}) };
  let what = '';
  switch (change.kind) {
    case 'details': {
      const d = Object.fromEntries(Object.entries(change.details ?? {}).filter(([k, v]) => /^[a-z][a-z0-9-]{0,40}$/.test(k) && ok(v)).map(([k, v]) => [k, v.trim().slice(0, 500)]));
      if (!Object.keys(d).length) return { error: 'Name the details that change' };
      t.details = { ...(t.details ?? {}), ...d };
      what = `Details changed: ${Object.keys(d).join(', ')}`;
      break;
    }
    case 'obligation-add': {
      const add = [...new Set(change.taxTypes)].filter(x => TAX_TYPE.test(x) && !t.taxTypes.includes(x));
      if (!add.length) return { error: 'Name a tax type the taxpayer is not yet registered for' };
      t.taxTypes = [...t.taxTypes, ...add];
      what = `Registered for ${add.join(', ')}`;
      break;
    }
    case 'obligation-cancel': {
      const drop = change.taxTypes.filter(x => t.taxTypes.includes(x));
      if (!drop.length) return { error: 'Name a tax type the taxpayer is registered for' };
      if (drop.length === t.taxTypes.length) return { error: 'Cancelling every obligation is a deregistration, decided under its own procedure' };
      t.taxTypes = t.taxTypes.filter(x => !drop.includes(x));
      what = `Obligation cancelled: ${drop.join(', ')}`;
      break;
    }
    case 'transfer':
      if (!ok(change.office)) return { error: 'Name the tax office the taxpayer moves to' };
      if (change.office.trim() === t.office) return { error: 'The taxpayer is already with that office' };
      t.office = change.office.trim().slice(0, 120);
      what = `Transferred to ${t.office}`;
      break;
    case 'suspend':
      if (t.state !== 'active') return { error: `${t.tin} is not active` };
      t.state = 'suspended';
      what = 'Registration suspended';
      break;
    case 'reactivate':
      if (t.state !== 'suspended') return { error: `${t.tin} is not suspended` };
      t.state = 'active';
      what = 'Registration reactivated';
      break;
    default: return { error: 'Unknown change' };
  }
  t.version = (t.version ?? 1) + 1;
  t.history.push({ at: now.toISOString(), by, what: `${what} (version ${t.version}): ${reasons.trim().slice(0, 300)}`, case: caseId, before });
  recordAudit(by, 'tax.taxpayer.amend', `Taxpayer:${t.tin}`, 'ok', `${change.kind} · version ${t.version} · case ${caseId}`);
  return clone(t);
}

// Refunds: decided (approved, adjusted or refused) by two officials; instructed; paid out and reconciled once.

export function decideRefund(input: { tin: string; taxType: string; period?: string; claimedMinor: number; approvedMinor: number; currency: string; basis: string; credit: Refund['credit']; interest?: LawAmount; reasons: string }, caseId: string, by: string, now = new Date()): Refund | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t) return { error: `No taxpayer ${input.tin}` };
  if (!t.taxTypes.includes(input.taxType)) return { error: `${t.tin} is not registered for ${input.taxType}` };
  for (const [k, v] of [['claimed', input.claimedMinor], ['approved', input.approvedMinor]] as const) if (!Number.isInteger(v) || v < 0) return { error: `The ${k} amount is a whole, non-negative number of minor units` };
  if (input.approvedMinor > input.claimedMinor) return { error: 'A refund is never more than was claimed (interest the law gives is shown apart)' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  if (!ok(input.basis) || !ok(input.reasons)) return { error: 'Name the claim basis and the reasons' };
  const why = lawAmountProblem(input.interest);
  if (why) return { error: why };
  const balance = account(t.id, input.taxType).balanceMinor;
  if (input.approvedMinor > 0 && input.credit === 'existing-credit' && -balance < input.approvedMinor) return { error: `The account shows a credit of ${Math.max(0, -balance) / 100}, less than the refund: decide it as a new entitlement with reasons, or adjust it` };
  const id = next('RFD', now);
  const at = now.toISOString();
  const r: Refund = { id, reference: `tax-refund:${id}`, taxpayer: t.id, taxType: input.taxType, ...(input.period ? { period: input.period } : {}), claimedMinor: input.claimedMinor, approvedMinor: input.approvedMinor, currency: input.currency, basis: input.basis.trim().slice(0, 120), credit: input.credit, ...(input.interest ? { interest: clone(input.interest) } : {}), state: input.approvedMinor > 0 ? 'approved' : 'refused', reasons: input.reasons.trim().slice(0, 2000), case: caseId, at, by };
  db().refunds.push(r);
  // A new entitlement is credited to the account by the decision; the payout debits it when it is reconciled.
  if (r.state === 'approved' && r.credit === 'new-entitlement') post(t.id, r.taxType, { at, kind: 'adjustment', amountMinor: -r.approvedMinor, currency: r.currency, reference: r.reference, case: caseId, by, reason: `Refund entitlement decided: ${r.reasons.slice(0, 200)}` });
  recordAudit(by, 'tax.refund.decide', `Refund:${r.id}`, 'ok', `${r.state} · ${r.currency} ${r.approvedMinor / 100} of ${r.claimedMinor / 100}${r.interest ? ` · interest ${r.interest.kind}` : ''} · case ${caseId}`);
  return clone(r);
}

const interestOf = (r: Pick<Refund, 'interest'>) => (r.interest && r.interest.kind !== 'none' ? r.interest.amountMinor : 0);

/** The approved refund's payment instruction (to the treasury or the paying bank): recorded once, never a payment. */
export function instructRefund(id: string, caseId: string, by: string, now = new Date()): Refund | { error: string } {
  const r = db().refunds.find(x => x.id === id || x.reference === id);
  if (!r) return { error: 'No such refund' };
  if (r.state !== 'approved') return { error: r.state === 'refused' ? 'A refused refund is not paid' : 'The refund is already instructed' };
  r.state = 'instructed';
  r.instruction = { at: now.toISOString(), by, case: caseId };
  recordAudit(by, 'tax.refund.instruct', `Refund:${r.id}`, 'ok', `${r.currency} ${(r.approvedMinor + interestOf(r)) / 100} · case ${caseId}`);
  return clone(r);
}

/**
 * The payout's confirmation (the treasury's or bank's own reference), matched
 * to the instructed refund and posted to the account once: a second
 * confirmation of the same payout, or of the same refund, posts nothing.
 */
export function reconcileRefundPayout(id: string, payout: { railReference: string; amountMinor: number; paidAt: string; simulated?: boolean }, by: string, now = new Date()): Refund | { error: string } {
  const r = db().refunds.find(x => x.id === id || x.reference === id);
  if (!r) return { error: 'No such refund' };
  if (r.payout) return r.payout.railReference === payout.railReference ? clone(r) : { error: `Refund ${r.id} was already reconciled against ${r.payout.railReference}` };
  if (r.state !== 'instructed') return { error: 'Only an instructed refund is reconciled' };
  if (!ok(payout.railReference) || !DATE.test(String(payout.paidAt).slice(0, 10))) return { error: 'Give the payout\'s own reference and the date it was paid' };
  if (db().refunds.some(x => x.payout?.railReference === payout.railReference)) return { error: `Payout ${payout.railReference} is already reconciled against another refund` };
  // A stand-in payout (no money moved) never counts in production.
  if (payout.simulated && !samplesAllowed()) return { error: 'A simulated payout is not reconciled in production' };
  const due = r.approvedMinor + interestOf(r);
  if (payout.amountMinor !== due) return { error: `The payout (${payout.amountMinor / 100}) differs from the instructed refund (${due / 100}): it stays unreconciled for an official to resolve` };
  r.payout = { at: now.toISOString(), by, railReference: payout.railReference.trim().slice(0, 120), amountMinor: payout.amountMinor, paidAt: payout.paidAt };
  r.state = 'paid';
  post(r.taxpayer, r.taxType, { at: payout.paidAt, kind: 'refund', amountMinor: r.approvedMinor, currency: r.currency, reference: r.reference, case: r.case, by, reason: `Refund paid out (${r.payout.railReference})` });
  recordAudit(by, 'tax.refund.reconcile', `Refund:${r.id}`, 'ok', `${r.currency} ${payout.amountMinor / 100} · ${r.payout.railReference}`);
  return clone(r);
}

export const getRefund = (idOrRef: string): Refund | undefined => { const r = db().refunds.find(x => x.id === idOrRef || x.reference === idOrRef); return r ? clone(r) : undefined; };
export const refundOfCase = (caseId: string): Refund | undefined => { const r = [...db().refunds].reverse().find(x => x.case === caseId); return r ? clone(r) : undefined; };
export const refundsOf = (taxpayerId: string): Refund[] => db().refunds.filter(r => r.taxpayer === taxpayerId).map(clone);

// Payment arrangements: a schedule over approved liabilities, each instalment a bill carrying the assessment's reference.

const owedOn = (a: Assessment) => Math.max(0, (db().ledger[`${a.taxpayer}|${a.taxType}`] ?? []).filter(e => e.reference === a.reference).reduce((m, e) => m + e.amountMinor, 0));
const scheduleProblem = (sched: { due: string; amountMinor: number }[]): string | null => {
  if (!sched.length || sched.some(i => !DATE.test(i.due) || !Number.isInteger(i.amountMinor) || i.amountMinor <= 0)) return 'Each instalment has a due date and a positive whole amount';
  if (sched.some((i, n) => n > 0 && i.due <= sched[n - 1]!.due)) return 'Instalments fall due in order, one after another';
  return null;
};

export function recordPaymentPlan(input: { tin: string; liabilities: string[]; instalments: { due: string; amountMinor: number }[]; interest?: LawAmount }, caseId: string, by: string, now = new Date()): PaymentPlan | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t) return { error: `No taxpayer ${input.tin}` };
  const refs = [...new Set(input.liabilities.map(x => x.trim()).filter(Boolean))];
  if (!refs.length) return { error: 'Name the assessed liabilities the arrangement covers' };
  const found = refs.map(r => db().assessments.find(a => a.reference === r || a.id === r));
  if (found.some(a => !a || a.taxpayer !== t.id)) return { error: 'Every liability must be an assessment of this taxpayer (a balance never stands alone)' };
  const list = found as Assessment[];
  if (new Set(list.map(a => `${a.taxType}|${a.currency}`)).size > 1) return { error: 'One arrangement covers one tax type in one currency' };
  if (db().plans.some(p => ['approved', 'varied'].includes(p.state) && p.liabilities.some(l => list.some(a => a.reference === l)))) return { error: 'A liability is already under an arrangement in force: change that arrangement instead' };
  const why = lawAmountProblem(input.interest) ?? scheduleProblem(input.instalments ?? []);
  if (why) return { error: why };
  // The schedule pays exactly what is owed on those liabilities as the ledger shows it, plus interest the approved rule gives.
  const owed = list.reduce((s, a) => s + owedOn(a), 0);
  const total = input.instalments.reduce((s, i) => s + i.amountMinor, 0);
  const interest = input.interest && input.interest.kind !== 'none' ? input.interest.amountMinor : 0;
  if (owed <= 0) return { error: 'Nothing is owed on these liabilities' };
  if (total !== owed + interest) return { error: `The instalments (${total / 100}) must add up to what is owed (${owed / 100})${interest ? ` and the interest the rule gives (${interest / 100})` : ''}` };
  const id = next('PPA', now);
  const first = list[0]!;
  const at = now.toISOString();
  const plan: PaymentPlan = {
    id, taxpayer: t.id, taxType: first.taxType, liabilities: list.map(a => a.reference), currency: first.currency,
    instalments: input.instalments.map((i, n) => ({ n: n + 1, due: i.due, amountMinor: i.amountMinor, reference: `${first.reference}#${id}/${n + 1}` })),
    ...(input.interest ? { interest: clone(input.interest) } : {}), state: 'approved', case: caseId, at, by,
    history: [{ at, by, what: `Approved: ${input.instalments.length} instalment(s)`, case: caseId, reasons: '' }],
  };
  db().plans.push(plan);
  recordAudit(by, 'tax.plan.approve', `PaymentPlan:${plan.id}`, 'ok', `${plan.instalments.length} instalments · ${plan.currency} ${total / 100} · case ${caseId}`);
  return clone(plan);
}

/** Record the bill an instalment was issued as. */
export function attachInstalmentBill(planId: string, n: number, bill: string): void {
  const i = db().plans.find(p => p.id === planId)?.instalments.find(x => x.n === n);
  if (i) i.bill ??= bill;
}

/** A decided change of an arrangement's standing: varied (what is left, rescheduled), cancelled, found in default, or completed. Reasons are the deciding officials'. */
export function changePlan(id: string, change: { state: 'varied'; instalments: { due: string; amountMinor: number }[] } | { state: 'cancelled' | 'defaulted' | 'completed' }, reasons: string, caseId: string, by: string, now = new Date()): PaymentPlan | { error: string } {
  const p = db().plans.find(x => x.id === id);
  if (!p) return { error: 'No such arrangement' };
  if (!['approved', 'varied'].includes(p.state)) return { error: `The arrangement is ${p.state}` };
  if (!ok(reasons)) return { error: 'State the reasons' };
  if (change.state === 'varied') {
    const why = scheduleProblem(change.instalments ?? []);
    if (why) return { error: why };
    // Instalments already issued as bills stay as they are; only what is left is rescheduled.
    const kept = p.instalments.filter(i => i.bill);
    const left = p.instalments.filter(i => !i.bill).reduce((s, i) => s + i.amountMinor, 0);
    const after = change.instalments.reduce((s, i) => s + i.amountMinor, 0);
    if (after !== left) return { error: `A variation reschedules what is left (${left / 100}); it does not change the amount owed (${after / 100})` };
    p.instalments = [...kept, ...change.instalments.map((i, k) => ({ n: kept.length + k + 1, due: i.due, amountMinor: i.amountMinor, reference: `${p.liabilities[0]}#${p.id}/${kept.length + k + 1}` }))];
  }
  p.state = change.state;
  p.history.push({ at: now.toISOString(), by, what: change.state, case: caseId, reasons: reasons.trim().slice(0, 1000) });
  recordAudit(by, `tax.plan.${change.state}`, `PaymentPlan:${p.id}`, 'ok', `case ${caseId}`);
  return clone(p);
}

export const getPaymentPlan = (id: string): PaymentPlan | undefined => { const p = db().plans.find(x => x.id === id); return p ? clone(p) : undefined; };
export const planOfCase = (caseId: string): PaymentPlan | undefined => { const p = [...db().plans].reverse().find(x => x.case === caseId || x.history.some(h => h.case === caseId)); return p ? clone(p) : undefined; };
export const plansOf = (taxpayerId: string): PaymentPlan[] => db().plans.filter(p => p.taxpayer === taxpayerId).map(clone);

// Voluntary disclosures: accepted (with the assessment the decision made) or refused, with reasons.

export function recordDisclosure(input: { tin: string; taxType: string; periods: string[]; assessment?: string; penalty?: LawAmount; accepted: boolean; reasons: string }, caseId: string, by: string, now = new Date()): Disclosure | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t) return { error: `No taxpayer ${input.tin}` };
  const periods = [...new Set(input.periods)].filter(p => PERIOD.test(p));
  if (!periods.length) return { error: 'Name the periods disclosed (2025, 2025-03 or 2025-Q1)' };
  if (!ok(input.reasons)) return { error: 'State the reasons' };
  const why = lawAmountProblem(input.penalty);
  if (why) return { error: why };
  if (input.assessment && !db().assessments.some(a => a.reference === input.assessment && a.taxpayer === t.id)) return { error: 'The assessment must be this taxpayer\'s' };
  const x: Disclosure = { id: next('VDS', now), taxpayer: t.id, taxType: input.taxType, periods, ...(input.assessment ? { assessment: input.assessment } : {}), ...(input.penalty ? { penalty: clone(input.penalty) } : {}), state: input.accepted ? 'accepted' : 'refused', reasons: input.reasons.trim().slice(0, 2000), case: caseId, at: now.toISOString(), by };
  db().disclosures.push(x);
  recordAudit(by, 'tax.disclosure.decide', `Disclosure:${x.id}`, 'ok', `${x.state} · ${periods.join(', ')} · case ${caseId}`);
  return clone(x);
}
export const disclosureOfCase = (caseId: string): Disclosure | undefined => { const x = [...db().disclosures].reverse().find(y => y.case === caseId); return x ? clone(x) : undefined; };

// Formal rulings: issued or refused by two officials, citing the law.

export function recordRuling(input: { tin: string; taxType: string; question: string; facts: string; conclusion: string; citations: Citation[]; issued: boolean }, caseId: string, by: string, now = new Date()): Ruling | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t) return { error: `No taxpayer ${input.tin}` };
  if (!ok(input.question) || !ok(input.facts)) return { error: 'A ruling answers a question on stated facts' };
  if (!ok(input.conclusion)) return { error: 'State the ruling or the reasons for refusing it' };
  if (input.issued && !input.citations.length) return { error: 'A ruling cites the provisions of law it interprets' };
  const r: Ruling = { id: next('RUL', now), taxpayer: t.id, taxType: input.taxType, question: input.question.trim().slice(0, 20000), facts: input.facts.trim().slice(0, 20000), conclusion: input.conclusion.trim().slice(0, 20000), citations: clone(input.citations), state: input.issued ? 'issued' : 'refused', case: caseId, at: now.toISOString(), by };
  db().rulings.push(r);
  recordAudit(by, 'tax.ruling.decide', `Ruling:${r.id}`, 'ok', `${r.state} · ${r.taxType} · case ${caseId}`);
  return clone(r);
}
export const rulingOfCase = (caseId: string): Ruling | undefined => { const r = [...db().rulings].reverse().find(x => x.case === caseId); return r ? clone(r) : undefined; };

/** Attach the sealed decision to the record a tax service case made. */
export function attachServiceDecision(kind: 'refund' | 'plan' | 'disclosure' | 'ruling', id: string, decision: string): void {
  const d = db();
  const x = kind === 'refund' ? d.refunds.find(r => r.id === id) : kind === 'plan' ? d.plans.find(p => p.id === id) : kind === 'disclosure' ? d.disclosures.find(r => r.id === id) : d.rulings.find(r => r.id === id);
  if (x) x.decision ??= decision;
}
