import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { VerifyClient } from './VerifyClient';
import { nationMessages } from '@/lib/nation/registry';
export default function DocumentsPage() {
  const m = nationMessages();
  const x = m.pages;
  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/records"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{x.verifyDocument}</strong>
            <span />
          </>
        }
      >
        <VerifyClient />
      </PhoneShell>
    </div>
  );
}
