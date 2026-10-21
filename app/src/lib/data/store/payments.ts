// Bills and receipts.
import type {
  Bill,
  PaymentReceipt,
} from '@/lib/api/types';
import { db } from './state';
import { uid, hash } from './shared';
import { recordAudit } from './audit';
import { samplesAllowed } from '@/lib/ops/mode';

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
