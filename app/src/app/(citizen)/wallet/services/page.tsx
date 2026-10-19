'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { nationMessages } from '@/lib/nation/registry';
import { t as fill, type Messages } from '@/lib/i18n';

type Svc = { label: string; href: string };
// In the nation's language (lib/i18n); links are unchanged.
const lifeSituationsFor = (t: Messages['services']): { title: string; sub: string; services: Svc[] }[] => [
  { title: t.childTitle, sub: t.childSub, services: [
    { label: t.registerBirth, href: '/wallet/identity' },
    { label: t.applyChildGrant, href: '/wallet/permits' },
    { label: t.bookVaccinations, href: '/wallet/inbox' },
  ] },
  { title: t.schoolTitle, sub: t.schoolSub, services: [
    { label: t.schoolEnrolment, href: '/wallet/permits' },
    { label: t.requestTransfer, href: '/wallet/inbox' },
  ] },
  { title: t.lossTitle, sub: t.lossSub, services: [
    { label: t.registerDeath, href: '/wallet/identity' },
    { label: t.bereavementSupport, href: '/wallet/inbox' },
  ] },
  { title: t.businessTitle, sub: t.businessSub, services: [
    { label: t.applyPermit, href: '/wallet/permits' },
    { label: t.taxRegistration, href: '/wallet/payments' },
  ] },
  { title: t.movingTitle, sub: t.movingSub, services: [
    { label: t.changeAddress, href: '/wallet/identity' },
    { label: t.transferUtilities, href: '/wallet/payments' },
  ] },
  { title: t.olderTitle, sub: t.olderSub, services: [
    { label: t.pensionServices, href: '/wallet/payments' },
    { label: t.healthcareAccess, href: '/wallet/inbox' },
  ] },
];

// The link keeps the ministry's English key; the label is in the nation's language.
const ministriesFor = (t: Messages['services']): { key: string; label: string }[] => [
  { key: 'Health', label: t.health }, { key: 'Education', label: t.education },
  { key: 'Social protection', label: t.socialProtection }, { key: 'Tax and revenue', label: t.taxRevenue },
  { key: 'Land and property', label: t.landProperty }, { key: 'Justice and legal aid', label: t.justice },
];

export default function ServicesPage() {
  const m = nationMessages();
  const lifeSituations = lifeSituationsFor(m.services);
  const ministries = ministriesFor(m.services);
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState<string | null>(null);
  const norm = q.trim().toLowerCase();
  const life = lifeSituations.filter(s => !norm || s.title.toLowerCase().includes(norm) || s.sub.toLowerCase().includes(norm) || s.services.some(v => v.label.toLowerCase().includes(norm)));
  const mins = ministries.filter(x => !norm || x.label.toLowerCase().includes(norm));

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← {m.common.home}</Link>
            <strong>{m.common.services}</strong>
            <span />
          </>
        }
      >
        <div>
          <label htmlFor="q" className="sr-only">{m.services.search}</label>
          <input
            id="q"
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={m.services.placeholder}
            className="w-full min-h-tap p-3 border border-line rounded-sm bg-surface"
          />
        </div>

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.services.lifeSituations}</h3>
          {life.length === 0 ? <p className="text-sm text-ink-muted">{m.services.noMatch}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            {life.map(s => (
              <button
                key={s.title}
                type="button"
                onClick={() => setOpen(o => (o === s.title ? null : s.title))}
                aria-expanded={open === s.title}
                className="focus-ring p-4 border border-line rounded-md bg-surface text-left text-ink hover:bg-surface-2"
              >
                <strong>{s.title}</strong>
                <div className="text-sm text-ink-muted">{s.sub}</div>
              </button>
            ))}
          </div>
          {open ? (
            <div className="mt-2 rounded-md border border-line bg-surface p-3">
              <div className="mb-1 text-sm font-semibold text-ink">{open}</div>
              <ul className="space-y-1">
                {(lifeSituations.find(s => s.title === open)?.services ?? []).map(v => (
                  <li key={v.label}>
                    <Link href={v.href} className="text-link underline underline-offset-2">{v.label} →</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <hr className="border-line" />

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.services.byMinistry}</h3>
          <ul className="space-y-2">
            {mins.map(x => (
              <li key={x.key}>
                <Link href={`/wallet/inbox?ministry=${encodeURIComponent(x.key)}`} className="text-link underline underline-offset-2">
                  {x.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/wallet/inbox" className="text-link underline underline-offset-2">
                {fill(m.services.allMinistries, { count: 124 })}
              </Link>
            </li>
          </ul>
        </section>

        <hr className="border-line" />

        <section>
          <h3 className="font-semibold text-lg mb-2">{m.services.inProgress}</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/wallet/permits" className="text-link underline underline-offset-2">
                {m.services.progressGrant}
              </Link>
            </li>
            <li>
              <Link href="/wallet/inbox" className="text-link underline underline-offset-2">
                {m.services.progressTransfer}
              </Link>
            </li>
          </ul>
        </section>
      </PhoneShell>
    </main>
  );
}
