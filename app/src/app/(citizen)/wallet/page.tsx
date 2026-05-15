import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Plain } from '@/components/ui/Plain';
import { ReceiptCard } from '@/components/ui/Receipt';
import type { Receipt } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const today = new Date('2026-05-14T09:14:00');

const receipts: Receipt[] = [
  {
    id: 'R-3F9A2',
    title: 'Child grant deposited',
    summary: 'Today, 09:14 — 2,400 KES → M-Pesa',
    amount: '2,400 KES',
    date: today.toISOString(),
    officerName: 'K. Otieno',
    aiClass: 'B',
    contestable: true,
  },
  {
    id: 'R-3F862',
    title: 'Health record updated',
    summary: 'Yesterday, 16:02 — vaccination (pneumococcal)',
    date: new Date('2026-05-13T16:02:00').toISOString(),
    officerName: 'Dr. K. Mwangi',
    contestable: true,
  },
  {
    id: 'R-3F511',
    title: 'Tax draft 2026 ready for review',
    summary: '10 May, 12:48 — no signature needed yet',
    date: new Date('2026-05-10T12:48:00').toISOString(),
    aiClass: 'C',
    contestable: true,
  },
];

const needsTo = [
  { title: 'Confirm your address', subtitle: 'for the school transfer — about 2 minutes', href: '#' },
  { title: 'Review your tax draft', subtitle: 'due in 12 days', href: '#' },
];

export default function WalletHomePage() {
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <div>
              <strong>Civic Wallet</strong>
              <div className="text-xs text-ink-muted">Amina H. Mwangi</div>
            </div>
            <div className="flex gap-2 items-center">
              <button className="text-sm underline underline-offset-2" aria-label="Notifications">
                🔔
              </button>
            </div>
          </>
        }
      >
        <section aria-labelledby="greet">
          <h2 id="greet" className="text-2xl font-semibold leading-tight">Good morning, Amina.</h2>
          <p className="text-ink-muted">{formatDate(today)}</p>
        </section>

        <section aria-labelledby="needs">
          <h3 id="needs" className="text-lg font-semibold mb-2">You need to</h3>
          <div className="space-y-2">
            {needsTo.map(item => (
              <Link
                key={item.title}
                href={item.href}
                className="block p-4 border border-line rounded-md bg-surface no-underline text-ink hover:bg-surface-2"
              >
                <strong>{item.title}</strong>
                <div className="text-sm text-ink-muted">{item.subtitle}</div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="do">
          <h3 id="do" className="text-lg font-semibold mb-2">Do something</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: '/wallet/permits', label: 'Permits' },
              { href: '/wallet/payments', label: 'Pay a bill' },
              { href: '/wallet/identity', label: 'Identity' },
              { href: '/wallet/documents', label: 'Verify a doc' },
              { href: '/wallet/sign', label: 'Sign' },
              { href: '/wallet/inbox', label: 'Inbox' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="p-3 border border-line rounded-md bg-surface text-center text-sm no-underline text-ink hover:bg-surface-2"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </section>

        <hr className="border-line" />

        <section aria-labelledby="receipts">
          <h3 id="receipts" className="text-lg font-semibold mb-2">Receipts</h3>
          <div className="space-y-2">
            {receipts.map(r => (
              <ReceiptCard key={r.id} receipt={r} href={`/wallet/receipt/${r.id}`} />
            ))}
          </div>
          <p className="mt-3">
            <Link href="#" className="text-link underline underline-offset-2">
              Show all receipts →
            </Link>
          </p>
        </section>

        <hr className="border-line" />

        <section>
          <Plain>
            <strong>Today, 3 people looked at your records.</strong> All for the
            medical visit you booked.{' '}
            <Link href="/wallet/records" className="text-link underline underline-offset-2">
              See who and why
            </Link>.
          </Plain>
        </section>
      </PhoneShell>
    </main>
  );
}
