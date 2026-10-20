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
  state: 'active' | 'deregistered';
  registeredAt: string;
  case: string;
  history: { at: string; by: string; what: string; case?: string }[];
}

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

export interface TaxReturn {
  id: string;
  taxpayer: string;
  taxType: string;
  /** The period it covers: YYYY, YYYY-MM or YYYY-Qn. */
  period: string;
  versions: { n: number; baseMinor: number; currency: string; filedAt: string; filedBy: string; case: string; reason: string }[];
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
  state: 'issued' | 'varied' | 'withdrawn';
  at: string;
  by: string;
}

interface Db { taxpayers: Taxpayer[]; ledger: Record<string, LedgerEntry[]>; returns: TaxReturn[]; assessments: Assessment[]; posted: string[]; seq: Record<string, number>; tinSeq: number; asmSeq: number }
const g = globalThis as unknown as { __civicosTax?: Db };
const db = (): Db => {
  const d = touch('__civicosTax', g.__civicosTax ??= { taxpayers: [], ledger: {}, returns: [], assessments: [], posted: [], seq: {}, tinSeq: 0, asmSeq: 0 });
  d.taxpayers ??= []; d.ledger ??= {}; d.returns ??= []; d.assessments ??= []; d.posted ??= []; d.seq ??= {};
  d.tinSeq ??= legacyMax(d.seq, 'TIN'); d.asmSeq ??= legacyMax(d.seq, 'ASM');
  return d;
};
export function resetTax(): void { g.__civicosTax = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const TAX_TYPE = /^[a-z][a-z0-9-]{1,40}$/;
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$/;

const next = (k: 'TIN' | 'ASM', now: Date) => nextNumber(db() as unknown as Record<string, unknown>, k === 'TIN' ? 'tinSeq' : 'asmSeq', k, now);

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
export function fileReturn(input: { tin: string; taxType: string; period: string; baseMinor: number; currency: string; reason?: string }, caseId: string, by: string, now = new Date()): TaxReturn | { error: string } {
  const t = db().taxpayers.find(x => x.tin === input.tin);
  if (!t || t.state !== 'active') return { error: `No active taxpayer ${input.tin}` };
  if (!t.taxTypes.includes(input.taxType)) return { error: `${t.tin} is not registered for ${input.taxType}` };
  if (!PERIOD.test(input.period)) return { error: 'The period is a year (2026), a month (2026-03) or a quarter (2026-Q1)' };
  if (!Number.isInteger(input.baseMinor) || input.baseMinor < 0) return { error: 'The declared base is a whole, non-negative number of minor units' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  const d = db();
  const at = now.toISOString();
  let r = d.returns.find(x => x.taxpayer === t.id && x.taxType === input.taxType && x.period === input.period);
  if (r) {
    if (r.state === 'final') return { error: 'This return is final: an amendment needs a decided objection or the law\'s reopening procedure' };
    r.versions.push({ n: r.versions.length + 1, baseMinor: input.baseMinor, currency: input.currency, filedAt: at, filedBy: by, case: caseId, reason: (input.reason ?? 'Amended').slice(0, 500) });
    r.state = 'filed';
    recordAudit(by, 'tax.return.amend', `TaxReturn:${r.id}`, 'ok', `${t.tin} · ${input.taxType} ${input.period} · version ${r.versions.length}`);
  } else {
    r = { id: uuid7(), taxpayer: t.id, taxType: input.taxType, period: input.period, versions: [{ n: 1, baseMinor: input.baseMinor, currency: input.currency, filedAt: at, filedBy: by, case: caseId, reason: 'Filed' }], state: 'filed' };
    d.returns.push(r);
    recordAudit(by, 'tax.return.file', `TaxReturn:${r.id}`, 'ok', `${t.tin} · ${input.taxType} ${input.period}`);
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
    const a = d.assessments.find(x => x.reference === r.reference);
    if (!a) { unmatched.push(r.id); continue; }
    post(a.taxpayer, a.taxType, { at: r.paidAt, kind: 'payment', amountMinor: -r.amountMinor, currency: r.currency, reference: a.reference, by, reason: `Payment ${r.id} by ${r.rail}` });
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
  return { taxpayers: count(d.taxpayers, t => `${t.party.kind}:${t.state}`), returns: count(d.returns, r => r.state), assessments: count(d.assessments, a => a.method.kind) };
}
