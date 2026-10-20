import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { PaymentsClient } from './PaymentsClient';
import { billsFor, receiptsVisibleTo } from '@/lib/data/store';
import { nationMessages } from '@/lib/nation/registry';
export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  const m = nationMessages();
  const x = m.pages;
  // Only general bills: a tax or customs bill is never shown in the wallet until citizens' identity is linked to payers.
  const bills = billsFor(null);
  const receipts = receiptsVisibleTo(null);

  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{x.payments}</strong>
            <span />
          </>
        }
      >
        <PaymentsClient initialBills={bills} initialReceipts={receipts} />
      </PhoneShell>
    </div>
  );
}
