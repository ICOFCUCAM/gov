import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { NewPermitForm } from './NewPermitForm';

export default function NewPermitPage() {
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet/permits" className="underline underline-offset-2">← Permits</Link>
            <strong>Apply for a permit</strong>
            <span />
          </>
        }
      >
        <NewPermitForm />
      </PhoneShell>
    </main>
  );
}
