// Bills and receipts.
import type {
  Bill,
  PaymentReceipt,
} from '@/lib/api/types';
import { db } from './state';
import { uid, hash } from './shared';
import { recordAudit } from './audit';
import { samplesAllowed } from '@/lib/ops/mode';
import { touch } from '@/lib/data/repo/track';

// ── Payments ──────────────────────────────────────────────────────────
export function listBills(): Bill[] {
  return db.bills;
}

export function listReceipts(): PaymentReceipt[] {
  return db.receipts;
}

export const getBill = (id: string): Bill | undefined => db.bills.find(b => b.id === id);

/**
 * The bills a viewer may see. A bill raised for a liability with a named
 * payer (a tax assessment, customs duty) is confidential to the institution
 * that issued it (tax secrecy, commercial confidentiality); the general bills
 * without a payer are shown to everyone who sees payments. The citizen's
 * wallet shows only those until citizens' identity is linked to payers.
 */
export function billsFor(viewer: { institution?: string } | null): Bill[] {
  return db.bills.filter(b => !b.payer || (!!viewer?.institution && b.issuer === viewer.institution));
}

/** The receipts of the bills a viewer may see (by bill or by liability reference). */
export function receiptsVisibleTo(viewer: { institution?: string } | null): PaymentReceipt[] {
  const bills = billsFor(viewer);
  const ids = new Set(bills.map(b => b.id)), refs = new Set(bills.map(b => b.reference).filter(Boolean));
  return db.receipts.filter(r => ids.has(r.billId) || (r.reference && refs.has(r.reference)) || (!r.reference && !r.billId));
}

/**
 * The platform's stand-in payment (integration register 1.8): marks a bill
 * paid without money moving. Its receipts are marked simulated and are never
 * counted by reconciliation in production. It refuses itself in a
 * production installation (step I0.1), whoever calls it: there payments are
 * recorded from the payment provider or bank.
 */
export function payBill(billId: string, rail: string, by = 'citizen'): PaymentReceipt | { error: string } {
  if (!samplesAllowed()) return { error: 'No payment provider is connected: payments are recorded from the payment provider or bank, never marked paid here' };
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) return { error: 'Bill not found' };
  if (bill.status === 'paid') return { error: 'Bill already paid' };
  bill.status = 'paid';
  const receipt: PaymentReceipt = {
    id: uid('PR'),
    billId,
    amountMinor: bill.amountMinor,
    currency: bill.currency,
    rail,
    paidAt: new Date().toISOString(),
    hash: hash(billId + Date.now()),
    ...(bill.reference ? { reference: bill.reference } : {}),
    simulated: true,
  };
  db.receipts.unshift(receipt);
  recordAudit(by, 'payment.execute', `Bill:${billId}`, 'ok', `${bill.currency} ${bill.amountMinor / 100}`);
  return receipt;
}

/**
 * Issue a bill for a liability (a tax assessment, a customs declaration, a
 * licence fee): the payer pays it on the nation's rail like any bill, and the
 * receipt carries the liability reference for reconciliation. Audited, never
 * with the payer's name.
 */
export function issueBill(input: { kind: Bill['kind']; description: string; amountMinor: number; currency: string; dueDate: string; reference: string; payer?: Bill['payer']; issuer?: string }, by: string): Bill | { error: string } {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) return { error: 'A bill is for a positive whole number of minor units' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  if (!input.reference.trim()) return { error: 'A bill names the liability it settles' };
  if (db.bills.some(b => b.reference === input.reference && b.status !== 'paid')) return { error: `A bill for ${input.reference} is already open` };
  const bill: Bill = { id: uid('BL'), kind: input.kind, description: input.description.slice(0, 200), amountMinor: input.amountMinor, currency: input.currency, dueDate: input.dueDate, status: 'due', reference: input.reference, ...(input.payer ? { payer: input.payer } : {}), ...(input.issuer ? { issuer: input.issuer } : {}) };
  db.bills.unshift(bill);
  recordAudit(by, 'payment.bill.issue', `Bill:${bill.id}`, 'ok', `${input.reference} · ${input.currency} ${input.amountMinor / 100}`);
  return bill;
}

/** A payment that arrived outside the platform (a bank transfer), recorded by an official against a liability reference. Idempotent on the rail reference. */
export function recordTransfer(input: { reference: string; amountMinor: number; currency: string; rail: string; railReference: string; paidAt: string }, by: string): PaymentReceipt | { error: string } {
  if (!input.reference.trim() || !input.railReference.trim()) return { error: 'Give the liability reference and the transfer reference' };
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) return { error: 'The amount is a positive whole number of minor units' };
  const seen = db.receipts.find(r => r.railReference === input.railReference && r.rail === input.rail);
  if (seen) return seen;
  const bill = db.bills.find(b => b.reference === input.reference && b.status !== 'paid');
  const receipt: PaymentReceipt = { id: uid('PR'), billId: bill?.id ?? '', amountMinor: input.amountMinor, currency: input.currency, rail: input.rail, paidAt: input.paidAt, hash: hash(input.railReference + input.reference), reference: input.reference, railReference: input.railReference, recordedBy: by };
  if (bill && input.amountMinor >= bill.amountMinor) bill.status = 'paid';
  db.receipts.unshift(receipt);
  recordAudit(by, 'payment.transfer.record', `Receipt:${receipt.id}`, 'ok', `${input.reference} · ${input.currency} ${input.amountMinor / 100} · ${input.rail} ${input.railReference}`);
  return receipt;
}

/** Everything paid against a liability reference, for reconciliation. */
export const receiptsFor = (reference: string): PaymentReceipt[] => db.receipts.filter(r => r.reference === reference);

// ── Refunds (plan step I13) ─────────────────────────────────────────────
// A fee is refunded only through the payments system and only as what was
// paid: a refund names the receipt it returns, its amount is that receipt's
// amount (never typed), the bill it settled was issued by the refunding
// institution, and a receipt is refunded once. It is instructed by the
// decision of a refund case (lib/frontdoor/procedures.ts, two officials) and
// recorded paid from the rail's reference by an official, like a transfer
// that arrived outside the platform. No payment provider is connected
// (integration register 1.8): a stand-in receipt is never refunded in
// production. Held apart from the store's state object, under its own key.

export interface Refund {
  id: string;
  receipt: string;
  billId: string;
  reference?: string;
  amountMinor: number;
  currency: string;
  issuer: string;
  /** The refund case that decided it. */
  case: string;
  instructedBy: string;
  instructedAt: string;
  paid?: { at: string; rail: string; railReference: string; by: string };
  /** Refunds a stand-in receipt (demo and training only). */
  simulated?: true;
}
type RefundDb = { refunds: Refund[] };
const refundStore = globalThis as unknown as { __civicosRefunds?: RefundDb };
const refundDb = (): RefundDb => touch('__civicosRefunds', refundStore.__civicosRefunds ??= { refunds: [] });
export function resetRefunds(): void { refundStore.__civicosRefunds = undefined; }

/** The receipt and its bill when this institution may refund it, else why not. */
export function refundableReceipt(receiptId: string, institution: string): { receipt: PaymentReceipt; bill: Bill } | { error: string } {
  const receipt = db.receipts.find(r => r.id === receiptId);
  if (!receipt) return { error: 'No such payment receipt' };
  const bill = db.bills.find(b => b.id === receipt.billId) ?? (receipt.reference ? db.bills.find(b => b.reference === receipt.reference) : undefined);
  if (!bill) return { error: 'The receipt settles no bill of this installation: nothing to refund here' };
  if (bill.issuer !== institution) return { error: 'The bill this receipt paid was issued by another institution: only the institution that charged a fee refunds it' };
  if (receipt.simulated && !samplesAllowed()) return { error: 'A stand-in payment (no money moved) is never refunded in production' };
  if (refundDb().refunds.some(x => x.receipt === receipt.id)) return { error: 'This receipt has already been refunded' };
  return { receipt, bill };
}

/** Instruct the refund of exactly what a receipt paid (the refund case's decision). */
export function instructRefund(input: { receipt: string; institution: string; case: string }, by: string, now = new Date()): Refund | { error: string } {
  const r = refundableReceipt(input.receipt, input.institution);
  if ('error' in r) return r;
  const refund: Refund = { id: uid('RF'), receipt: r.receipt.id, billId: r.bill.id, ...(r.receipt.reference ? { reference: r.receipt.reference } : {}), amountMinor: r.receipt.amountMinor, currency: r.receipt.currency, issuer: input.institution, case: input.case, instructedBy: by, instructedAt: now.toISOString(), ...(r.receipt.simulated ? { simulated: true as const } : {}) };
  refundDb().refunds.unshift(refund);
  recordAudit(by, 'payment.refund.instruct', `Refund:${refund.id}`, 'ok', `receipt ${refund.receipt} · ${refund.currency} ${refund.amountMinor / 100} · case ${input.case}`);
  return { ...refund };
}

/** Record that an instructed refund was paid out on the rail (its reference); once. */
export function recordRefundPaid(refundId: string, input: { rail: string; railReference: string; paidAt: string }, by: string): Refund | { error: string } {
  const x = refundDb().refunds.find(r => r.id === refundId);
  if (!x) return { error: 'No such refund' };
  if (x.paid) return x.paid.railReference === input.railReference ? { ...x } : { error: 'This refund is already recorded as paid' };
  if (!input.rail.trim() || !input.railReference.trim()) return { error: 'Give the rail and the payment reference of the refund' };
  if (!/^\d{4}-\d{2}-\d{2}/.test(input.paidAt)) return { error: 'Give the date it was paid' };
  x.paid = { at: input.paidAt, rail: input.rail.trim().slice(0, 60), railReference: input.railReference.trim().slice(0, 120), by };
  recordAudit(by, 'payment.refund.paid', `Refund:${x.id}`, 'ok', `${x.paid.rail} ${x.paid.railReference}`);
  return { ...x };
}

export const refundOfServiceCase = (caseRef: string): Refund | undefined => { const x = refundDb().refunds.find(r => r.case === caseRef); return x ? { ...x } : undefined; };
export const listRefunds = (issuer?: string): Refund[] => refundDb().refunds.filter(r => !issuer || r.issuer === issuer).map(r => ({ ...r }));
