import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { SignClient } from './SignClient';
import { nationMessages } from '@/lib/nation/registry';
export default function SignPage() {
  const m = nationMessages();
  const x = m.pages;
  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{x.signDocument}</strong>
            <span />
          </>
        }
      >
        <SignClient />
      </PhoneShell>
    </div>
  );
}
