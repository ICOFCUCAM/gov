import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { nationMessages } from '@/lib/nation/registry';
import { Representation } from './Representation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Who may act for you' };

// Plan step I13: representation the person grants and revokes themselves (/api/citizen/representation).
export default function RepresentationPage() {
  const m = nationMessages();
  return (
    <div className="bg-bg min-h-screen">
      <PhoneShell activeTab="/wallet/services" header={<><Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link><h1 className="text-base font-bold">Who may act for you</h1><span /></>}>
        <Representation />
      </PhoneShell>
    </div>
  );
}
