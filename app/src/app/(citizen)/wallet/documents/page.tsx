import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { VerifyClient } from './VerifyClient';

export default function DocumentsPage() {
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/records"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Verify a document</strong>
            <span />
          </>
        }
      >
        <VerifyClient />
      </PhoneShell>
    </main>
  );
}
