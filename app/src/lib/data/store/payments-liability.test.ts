import { describe, it, expect } from 'vitest';
import { issueBill, payBill, recordTransfer, receiptsFor } from './payments';

describe('bills for liabilities', () => {
  it('carries the liability reference into the receipt, refuses a second open bill, and records a transfer once', () => {
    const ref = `tax:A-${Date.now()}`;
    const b = issueBill({ kind: 'tax', description: 'Assessment', amountMinor: 12_345, currency: 'USD', dueDate: '2026-12-31', reference: ref, payer: { kind: 'person', id: 'p1', name: 'Payer' } }, 'Tax officer');
    if ('error' in b) throw new Error(b.error);
    expect(issueBill({ kind: 'tax', description: 'Again', amountMinor: 1, currency: 'USD', dueDate: '2026-12-31', reference: ref }, 'x')).toHaveProperty('error');
    const r = payBill(b.id, 'Test rail');
    expect(r).toMatchObject({ reference: ref, amountMinor: 12_345 });
    const ref2 = `tax:B-${Date.now()}`;
    const t1 = recordTransfer({ reference: ref2, amountMinor: 500, currency: 'USD', rail: 'Bank transfer', railReference: 'TRF-1', paidAt: '2026-10-01T00:00:00Z' }, 'Treasury officer');
    const t2 = recordTransfer({ reference: ref2, amountMinor: 500, currency: 'USD', rail: 'Bank transfer', railReference: 'TRF-1', paidAt: '2026-10-01T00:00:00Z' }, 'Treasury officer');
    expect((t1 as { id: string }).id).toBe((t2 as { id: string }).id);
    expect(receiptsFor(ref2)).toHaveLength(1);
  });
});
