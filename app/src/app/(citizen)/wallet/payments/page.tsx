import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { PaymentsClient } from './PaymentsClient';
import { listBills, listReceipts } from '@/lib/data/store';
import { nationMessages } from '@/lib/nation/registry';
export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  const m = nationMessages();
  const x = m.pages;
  const bills = listBills();
  const receipts = listReceipts();

  return (
    <main className="bg-bg min-h-screen">
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
    </main>
  );
}
