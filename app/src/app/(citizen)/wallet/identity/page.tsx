import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Plain } from '@/components/ui/Plain';
import { SelectiveDisclosure } from './SelectiveDisclosure';
import { getSession } from '@/lib/data/store';

export default function IdentityPage() {
  const session = getSession();
  const c = session.citizen!;

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Digital identity</strong>
            <span />
          </>
        }
      >
        <Card tight>
          <h3 className="font-semibold mb-1">CivicID</h3>
          <p><strong>{c.displayName}</strong></p>
          <div className="text-sm text-ink-muted">Municipality: {c.municipality}</div>
          <div className="text-sm text-ink-muted">Status: active</div>
        </Card>

        <Plain>
          Your identity is yours. When a service asks for your details, you
          choose exactly what to share — and you can see what you are{' '}
          <strong>not</strong> sharing. There is no global ID number that
          follows you everywhere.
        </Plain>

        <section>
          <h3 className="font-semibold text-lg mb-2">Share your details</h3>
          <SelectiveDisclosure subjectName={c.displayName} />
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">How this works</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Each service gets a different identifier — they cannot link you across services.</li>
            <li>You approve every disclosure, one at a time.</li>
            <li>You can revoke a disclosure later.</li>
            <li>Every disclosure appears in your records access log.</li>
          </ul>
        </section>
      </PhoneShell>
    </main>
  );
}
