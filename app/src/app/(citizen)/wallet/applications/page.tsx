import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { nationMessages } from '@/lib/nation/registry';
import { Applications } from './Applications';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My applications' };

// The citizen's applications (design §8.4): notify a birth, report an
// incident to the police, and follow each to its outcome. Reads and writes /api/citizen/applications.
export default function ApplicationsPage() {
  const m = nationMessages();
  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell activeTab="/wallet/services" header={<><Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link><h1 className="text-base font-bold">My applications</h1><span /></>}>
        <Applications />
      </PhoneShell>
    </div>
  );
}
