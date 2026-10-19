// Bills and receipts.
import type {
  Bill,
  PaymentReceipt,
} from '@/lib/api/types';
import { db } from './state';
import { uid, hash } from './shared';
import { recordAudit } from './audit';

// ── Payments ──────────────────────────────────────────────────────────
export function listBills(): Bill[] {
  return db.bills;
}

export function listReceipts(): PaymentReceipt[] {
  return db.receipts;
}

export function payBill(billId: string, rail: string): PaymentReceipt | { error: string } {
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
  };
  db.receipts.unshift(receipt);
  recordAudit('citizen', 'payment.execute', `Bill:${billId}`, 'ok', `${bill.currency} ${bill.amountMinor / 100}`);
  return receipt;
}
