import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Plain } from '@/components/ui/Plain';
import { ReceiptCard } from '@/components/ui/Receipt';
import type { Receipt } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { DEMO_CITIZEN, DEMO_OFFICERS, homePlace, money, nationPaymentRail } from '@/lib/nation/persona';

import { nationMessages } from '@/lib/nation/registry';
import { t } from '@/lib/i18n';
const today = new Date('2026-05-14T09:14:00');

// Sample data follows the installed nation's currency and payment rail.
const receiptsFor = (): Receipt[] => [
  {
    id: 'R-3F9A2',
    title: 'Child grant deposited',
    summary: `Today, 09:14 — ${money(2400)} → ${nationPaymentRail()}`,
    amount: money(2400),
    date: today.toISOString(),
    officerName: DEMO_OFFICERS.caseworker,
    aiClass: 'B',
    contestable: true,
  },
  {
    id: 'R-3F862',
    title: 'Health record updated',
    summary: 'Yesterday, 16:02 — vaccination (pneumococcal)',
    date: new Date('2026-05-13T16:02:00').toISOString(),
    officerName: DEMO_OFFICERS.clinician,
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
  { title: 'Confirm your address', subtitle: 'for the school transfer — about 2 minutes', href: '/wallet/identity' },
  { title: 'Review your tax draft', subtitle: 'due in 12 days', href: '/wallet/receipt/R-3F511' },
];

export default function WalletHomePage() {
  const m = nationMessages();
  // First sentence in bold, as before; the dictionary holds the whole hint.
  const hint = t(m.wallet.accessHint, { count: 3 });
  const cut = hint.indexOf('. ') + 1;
  const access = cut > 0 ? { lead: hint.slice(0, cut), rest: hint.slice(cut) } : { lead: hint, rest: '' };
  const receipts = receiptsFor();
  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <div>
              <strong>Civic Wallet</strong>
              <div className="text-xs text-ink-muted">{DEMO_CITIZEN.short}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Link href="/wallet/inbox" className="text-sm underline underline-offset-2" aria-label="Notifications">
                🔔
              </Link>
            </div>
          </>
        }
      >
        <section aria-labelledby="greet">
          <h2 id="greet" className="text-2xl font-semibold leading-tight">{t(m.wallet.greeting, { name: DEMO_CITIZEN.name.split(' ')[0]! })}</h2>
          <p className="text-ink-muted">{formatDate(today)}</p>
        </section>

        <section aria-labelledby="needs">
          <h3 id="needs" className="text-lg font-semibold mb-2">{m.wallet.needsTo}</h3>
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
              { href: '/wallet/inbox', label: m.common.inbox },
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
          <h3 id="receipts" className="text-lg font-semibold mb-2">{m.wallet.receipts}</h3>
          <div className="space-y-2">
            {receipts.map(r => (
              <ReceiptCard key={r.id} receipt={r} href={`/wallet/receipt/${r.id}`} />
            ))}
          </div>
          <p className="mt-3">
            <Link href="/wallet/inbox" className="text-link underline underline-offset-2">
              {m.wallet.showAllReceipts} →
            </Link>
          </p>
        </section>

        <hr className="border-line" />

        <section>
          <Plain>
            <strong>{access.lead}</strong>{access.rest}{' '}
            <Link href="/wallet/records" className="text-link underline underline-offset-2">
              {m.wallet.seeWhoAndWhy}
            </Link>.
          </Plain>
        </section>
      </PhoneShell>
    </main>
  );
}
