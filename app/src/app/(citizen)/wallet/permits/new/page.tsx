import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { NewPermitForm } from './NewPermitForm';

import { nationMessages } from '@/lib/nation/registry';
export default function NewPermitPage() {
  const m = nationMessages();
  const x = m.pages;
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet/permits" className="underline underline-offset-2">← {x.permits}</Link>
            <strong>{x.applyPermit}</strong>
            <span />
          </>
        }
      >
        <NewPermitForm />
      </PhoneShell>
    </main>
  );
}
