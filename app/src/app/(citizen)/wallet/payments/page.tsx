import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { PaymentsClient } from './PaymentsClient';
import { listBills, listReceipts } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export default function PaymentsPage() {
  const bills = listBills();
  const receipts = listReceipts();

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Payments</strong>
            <span />
          </>
        }
      >
        <PaymentsClient initialBills={bills} initialReceipts={receipts} />
      </PhoneShell>
    </main>
  );
}
