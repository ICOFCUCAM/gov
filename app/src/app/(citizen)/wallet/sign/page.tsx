import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { SignClient } from './SignClient';

export default function SignPage() {
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Sign a document</strong>
            <span />
          </>
        }
      >
        <SignClient />
      </PhoneShell>
    </main>
  );
}
