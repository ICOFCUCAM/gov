// Public — search across the public institution websites (lib/public-sites/search.ts).
// Every site's search button opens this page for its own site; anyone can
// widen it to all public sites. A plain form: works without JavaScript.

import Link from 'next/link';
import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { searchSites, type SearchKind } from '@/lib/public-sites/search';
import { SITE_IDS, siteContent } from '@/lib/public-sites';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { publishedOverride } from '@/lib/data/site-editorial';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search', robots: { index: false } };

const INK = '#0b1a2c';

export default function SearchPage({ searchParams }: { searchParams?: { q?: string; site?: string } }) {
  const locale = visitorLocale();
  const t = siteMessages(locale);
  const q = (searchParams?.q ?? '').slice(0, 200);
  const site = searchParams?.site && SITE_IDS.includes(searchParams.site) ? searchParams.site : undefined;
  const tokens = siteTokens(new Date().getFullYear());
  const names = SITE_IDS
    .map(id => ({ id, name: fillDeep(siteContent(id, publishedOverride(id)).institution.name, tokens) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const siteName = names.find(n => n.id === site)?.name;
  const hits = q.trim() ? searchSites(q, { site, locale }) : [];
  const kind: Record<SearchKind, string> = { service: t.kindService, news: t.kindNews, programme: t.kindProgramme, figure: t.kindFigure, page: t.kindPage };

  return (
    <PublicDocument kicker={siteName ?? t.searchAllTitle} title={siteName ? fill(t.searchTitle, { name: siteName }) : t.searchAllTitle} intro={t.searchIntro}>
      <form role="search" action="/search" method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] sm:items-end">
        <label className="block">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t.searchFor}</span>
          <input name="q" type="search" defaultValue={q} enterKeyHint="search" maxLength={200}
            className="mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2.5 text-[15px] text-slate-900" />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{t.searchIn}</span>
          <select name="site" defaultValue={site ?? ''} className="mt-1 block w-full rounded-md border border-slate-400 bg-white px-3 py-2.5 text-[14px] text-slate-900">
            <option value="">{t.searchAll}</option>
            {names.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-md px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: INK }}>{t.search}</button>
      </form>

      {q.trim() ? (
        <section aria-labelledby="results-title">
          <h2 id="results-title" className="text-[15px] font-semibold text-slate-700">
            {hits.length === 0 ? fill(t.searchNone, { q }) : hits.length === 1 ? fill(t.searchOneResult, { q }) : fill(t.searchResults, { q, count: String(hits.length) })}
          </h2>
          {hits.length === 0 && site ? (
            <p className="mt-2 text-[14px]"><Link href={`/search?q=${encodeURIComponent(q)}`} className="font-semibold underline underline-offset-2" style={{ color: INK }}>{t.searchAll}</Link></p>
          ) : null}
          <ol className="mt-4 space-y-3">
            {hits.map(h => (
              <li key={`${h.siteId}|${h.kind}|${h.title}|${h.href}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-600">
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 font-semibold uppercase tracking-wide">{kind[h.kind]}</span>
                  {site ? null : <span>{h.siteName}</span>}
                  {h.external ? <span>· {fill(t.fromSite, { host: new URL(h.href).hostname.replace(/^www\./, '') })}</span> : null}
                </div>
                {h.external
                  ? <a href={h.href} rel="noopener" className="mt-1 block text-[16px] font-semibold underline-offset-2 hover:underline" style={{ color: INK }}>{h.title} ↗</a>
                  : <Link href={h.href} className="mt-1 block text-[16px] font-semibold underline-offset-2 hover:underline" style={{ color: INK }}>{h.title}</Link>}
                {h.text ? <p className="mt-0.5 text-[13.5px] text-slate-700">{h.text}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </PublicDocument>
  );
}
