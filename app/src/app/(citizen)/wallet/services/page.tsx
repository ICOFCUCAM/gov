'use client';

import * as React from 'react';
import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';

type Svc = { label: string; href: string };
const lifeSituations: { title: string; sub: string; services: Svc[] }[] = [
  { title: 'Having a child', sub: 'birth registration, child grant, vaccinations', services: [
    { label: 'Register a birth', href: '/wallet/identity' },
    { label: 'Apply for child grant', href: '/wallet/permits' },
    { label: 'Book vaccinations', href: '/wallet/inbox' },
  ] },
  { title: 'Going to school', sub: 'enrollment, transfer, feeding', services: [
    { label: 'School enrolment', href: '/wallet/permits' },
    { label: 'Request a transfer', href: '/wallet/inbox' },
  ] },
  { title: 'Lost a family member', sub: 'death registration, estate, support', services: [
    { label: 'Register a death', href: '/wallet/identity' },
    { label: 'Bereavement support', href: '/wallet/inbox' },
  ] },
  { title: 'Starting a business', sub: 'permits, registration, tax', services: [
    { label: 'Apply for a permit', href: '/wallet/permits' },
    { label: 'Tax registration', href: '/wallet/payments' },
  ] },
  { title: 'Moving house', sub: 'address change, utilities', services: [
    { label: 'Change of address', href: '/wallet/identity' },
    { label: 'Transfer utilities', href: '/wallet/payments' },
  ] },
  { title: 'Older adult support', sub: 'pension, healthcare, accommodations', services: [
    { label: 'Pension services', href: '/wallet/payments' },
    { label: 'Healthcare access', href: '/wallet/inbox' },
  ] },
];

const ministries = ['Health', 'Education', 'Social protection', 'Tax and revenue', 'Land and property', 'Justice and legal aid'];

export default function ServicesPage() {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState<string | null>(null);
  const norm = q.trim().toLowerCase();
  const life = lifeSituations.filter(s => !norm || s.title.toLowerCase().includes(norm) || s.sub.toLowerCase().includes(norm) || s.services.some(v => v.label.toLowerCase().includes(norm)));
  const mins = ministries.filter(m => !norm || m.toLowerCase().includes(norm));

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet/services"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Services</strong>
            <span />
          </>
        }
      >
        <div>
          <label htmlFor="q" className="sr-only">Search services</label>
          <input
            id="q"
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="What do you need?"
            className="w-full min-h-tap p-3 border border-line rounded-sm bg-surface"
          />
        </div>

        <section>
          <h3 className="font-semibold text-lg mb-2">Life situations</h3>
          {life.length === 0 ? <p className="text-sm text-ink-muted">No matching services.</p> : null}
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
          <h3 className="font-semibold text-lg mb-2">By ministry</h3>
          <ul className="space-y-2">
            {mins.map(m => (
              <li key={m}>
                <Link href={`/wallet/inbox?ministry=${encodeURIComponent(m)}`} className="text-link underline underline-offset-2">
                  {m}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/wallet/inbox" className="text-link underline underline-offset-2">
                All ministries (124)
              </Link>
            </li>
          </ul>
        </section>

        <hr className="border-line" />

        <section>
          <h3 className="font-semibold text-lg mb-2">In progress</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/wallet/permits" className="text-link underline underline-offset-2">
                Child grant renewal — under review
              </Link>
            </li>
            <li>
              <Link href="/wallet/inbox" className="text-link underline underline-offset-2">
                School transfer — waiting on the new school
              </Link>
            </li>
          </ul>
        </section>
      </PhoneShell>
    </main>
  );
}
