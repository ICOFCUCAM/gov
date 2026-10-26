// Public — the government's service catalogue (plan step I13;
// lib/frontdoor/catalogue.ts publicCatalogue()). Only published entries, each
// with the institution responsible and its status worked out from the
// records each time it is shown: a service whose procedure is not approved
// never shows as active, and says why. A plain form filters by words (no
// script). Nothing here comes from typed figures; sample entries appear only in
// a demonstration, marked.

import Link from 'next/link';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { publicCatalogue } from '@/lib/frontdoor/catalogue';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { words } from '@/lib/public-sites/search';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public services' };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = siteMessages(await visitorLocale());
  const q = ((await searchParams).q ?? '').slice(0, 120);
  const want = words(q);
  const all = publicCatalogue();
  const list = want.length ? all.filter(s => { const w = words([s.name, s.description, s.owner, s.category, ...s.lifeEvents].join(' ')); return want.every(x => w.some(y => y.startsWith(x))); }) : all;
  const groups = [...new Set(list.map(s => s.category || t.servicesAll))].sort();
  return (
    <PublicDocument kicker={t.servicesTitle} title={t.servicesTitle} intro={t.servicesIntro}>
      <form role="search" method="get" action="/services" className="mb-6 flex flex-wrap items-end gap-3 rounded border border-slate-300 bg-white p-4">
        <label className="flex min-w-[14rem] flex-1 flex-col text-[14px]">{t.servicesQuery}
          <input name="q" type="search" defaultValue={q} maxLength={120} className="mt-1 rounded border border-slate-400 px-2 py-1.5" />
        </label>
        <button type="submit" className="rounded border border-slate-700 bg-slate-800 px-4 py-1.5 text-[14px] font-semibold text-white">{t.servicesFind}</button>
      </form>
      {list.length ? groups.map(g => (
        <section key={g} aria-labelledby={`g-${g}`} className="mb-6">
          <h2 id={`g-${g}`} className="mb-2 text-[17px] font-semibold text-slate-800">{g}</h2>
          <ul className="space-y-3">
            {list.filter(s => (s.category || t.servicesAll) === g).map(s => (
              <li key={s.id} className="rounded border border-slate-300 bg-white p-4">
                <p className="text-[16px] font-semibold"><Link href={`/services/${encodeURIComponent(s.id)}`} className="underline underline-offset-2">{s.name}</Link></p>
                <p className="mt-1 text-[14px] text-slate-700">{s.description}</p>
                <p className="mt-1 text-[13px] text-slate-700">{fill(t.servicesOwner, { owner: s.owner })} · <strong>{t.servicesStates[s.status] ?? s.statusLabel}</strong>{s.sample ? <> · <em>{t.servicesSample}</em></> : null}</p>
                {s.reasons.length ? <p className="mt-1 text-[13px] text-slate-700">{fill(t.servicesWhy, { reasons: s.reasons.join('; ') })}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )) : <p className="text-[14px]">{t.servicesNone}</p>}
    </PublicDocument>
  );
}
