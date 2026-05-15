'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plain } from '@/components/ui/Plain';
import { BillStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import { formatMinor } from '@/lib/utils';
import type { Bill, PaymentReceipt } from '@/lib/api/types';

export function PaymentsClient({
  initialBills,
  initialReceipts,
}: {
  initialBills: Bill[];
  initialReceipts: PaymentReceipt[];
}) {
  const [bills, setBills] = React.useState(initialBills);
  const [receipts, setReceipts] = React.useState(initialReceipts);
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const due = bills.filter(b => b.status !== 'paid');

  async function pay(billId: string) {
    setPayingId(billId);
    setError(null);
    try {
      const { receipt } = await api.payments.pay(billId, 'M-Pesa');
      setReceipts(r => [receipt, ...r]);
      setBills(bs => bs.map(b => (b.id === billId ? { ...b, status: 'paid' as const } : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Plain>
        Pay bills and fees here. Every payment gives you a receipt you can
        verify. We show the full amount and the rail before you pay — no
        hidden fees.
      </Plain>

      <section>
        <h3 className="font-semibold text-lg mb-2">To pay</h3>
        {due.length === 0 ? (
          <EmptyState title="Nothing due" hint="You're all caught up." />
        ) : (
          <div className="space-y-2">
            {due.map(b => (
              <Card tight key={b.id}>
                <div className="flex justify-between items-baseline gap-2">
                  <strong>{b.description}</strong>
                  <BillStatusBadge status={b.status} />
                </div>
                <div className="text-sm text-ink-muted">
                  Due {new Date(b.dueDate).toLocaleDateString()}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-serif text-xl">
                    {formatMinor(b.amountMinor, b.currency)}
                  </span>
                  <Button
                    onClick={() => pay(b.id)}
                    disabled={payingId === b.id}
                  >
                    {payingId === b.id ? 'Paying…' : 'Pay with M-Pesa'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {error ? (
          <p className="text-alert text-sm mt-2" role="alert">{error}</p>
        ) : null}
      </section>

      <hr className="border-line" />

      <section>
        <h3 className="font-semibold text-lg mb-2">Payment history</h3>
        {receipts.length === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <div className="space-y-2">
            {receipts.map(r => (
              <Card tight key={r.id}>
                <div className="flex justify-between items-baseline gap-2">
                  <strong>{formatMinor(r.amountMinor, r.currency)}</strong>
                  <span className="font-mono text-xs text-ink-muted">{r.id}</span>
                </div>
                <div className="text-sm text-ink-muted">
                  {r.rail} · {new Date(r.paidAt).toLocaleString()}
                </div>
                <div className="text-xs text-ink-muted mt-1">
                  Receipt hash: <code className="font-mono">{r.hash}</code>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
