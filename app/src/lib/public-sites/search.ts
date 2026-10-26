// Search across the public sites' published content (/search).
//
// The index is each site's content as citizens see it: the nation's published
// content laid over the reference record, in the nation's language where it is
// translated, with the nation's facts filled in, and the existing website's
// news in Link, Embed and Migrate mode (effectiveContent). Nothing else is
// indexed, and nothing leaves the platform: no outside search service.
//
// Matching is plain and predictable: every word of the query must appear
// (accents and letter case ignored, word beginnings match), titles weigh more
// than descriptions. Results lead to the same places the site's own links do.

import { SITE_IDS } from './index';
import { effectiveContent } from './effective';
import { fillDeep, siteTokens } from './tokens';
import type { SiteContent, SiteLink } from './types';
import { siteHref } from '@/apps/_shared/public/site-props';
import { publicCatalogue } from '@/lib/frontdoor/catalogue';
import { siteMessages } from '@/lib/nation/registry';

export type SearchKind = 'service' | 'news' | 'programme' | 'figure' | 'page';

export interface SearchHit {
  siteId: string;
  siteName: string;
  kind: SearchKind;
  title: string;
  text?: string;
  href: string;
  /** Opens on the ministry's existing website (feed news). */
  external?: boolean;
  score: number;
}

interface Entry { kind: SearchKind; title: string; text?: string; href: string; external?: boolean }

/** Lower case, accents and tone marks removed, split into words (any script). */
export function words(s: string): string[] {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function entries(id: string, c: SiteContent): Entry[] {
  const href = (to: SiteLink) => siteHref(id, to);
  const out: Entry[] = [
    { kind: 'page', title: c.institution.name, text: [c.institution.tagline, c.institution.about, c.hero.subhead].filter(Boolean).join(' — '), href: href('home') },
    ...c.quickServices.map(q => ({ kind: 'service' as const, title: q.title, text: q.subtitle, href: href(q.to) })),
    ...c.featured.map(f => ({ kind: 'page' as const, title: f.title, text: f.body, href: href(f.to) })),
    ...c.news.map(n => (n.url
      ? { kind: 'news' as const, title: n.title, text: [n.date, n.summary].filter(Boolean).join(' — '), href: n.url, external: true }
      : { kind: 'news' as const, title: n.title, text: [n.date, n.summary].filter(Boolean).join(' — '), href: href('news') })),
    ...c.initiatives.map(i => ({ kind: 'programme' as const, title: i.title, text: i.body, href: href('programmes') })),
    ...c.statistics.filter(s => !/\{live\./.test(s.value)).map(s => ({ kind: 'figure' as const, title: s.label, text: [s.value, s.sub].filter(Boolean).join(' · '), href: href('statistics') })),
    ...c.shortcuts.map(s => ({ kind: 'service' as const, title: s.title, text: s.subtitle, href: href(s.to) })),
    ...c.nav.filter(n => n.to !== 'home').map(n => ({ kind: 'page' as const, title: n.label, href: href(n.to) })),
    ...c.footerSections.flatMap(f => f.items.map(i => ({ kind: 'page' as const, title: i.label, text: f.heading, href: href(i.to) }))),
  ];
  // The same title and destination once.
  const seen = new Set<string>();
  return out.filter(e => { const k = `${e.title}\u0000${e.href}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function score(query: string[], e: Entry): number {
  const title = words(e.title), text = words(e.text ?? '');
  let total = 0;
  for (const q of query) {
    const inTitle = title.some(w => w === q) ? 6 : title.some(w => w.startsWith(q)) ? 4 : 0;
    const inText = text.some(w => w === q) ? 2 : text.some(w => w.startsWith(q)) ? 1 : 0;
    if (!inTitle && !inText) return 0;
    total += inTitle + inText;
  }
  // People mostly search for something to do: services first, figures last.
  return total + ({ service: 3, page: 1, news: 1, programme: 1, figure: 0 } as const)[e.kind];
}

/** Search one site, or every public site when `site` is not given. At most `limit` results, best first. */
export function searchSites(q: string, { site, limit = 40, year = new Date().getFullYear(), locale }: { site?: string; limit?: number; year?: number; /** The visitor's language among the nation's. */ locale?: string } = {}): SearchHit[] {
  const query = [...new Set(words(q.slice(0, 200)))].filter(w => w.length > 1 || /\p{N}/u.test(w)).slice(0, 8);
  if (query.length === 0) return [];
  const ids = site && SITE_IDS.includes(site) ? [site] : SITE_IDS;
  const tokens = siteTokens(year);
  const hits: SearchHit[] = [];
  for (const id of ids) {
    const c = fillDeep(effectiveContent(id, undefined, locale).content, tokens);
    for (const e of entries(id, c)) {
      const s = score(query, e);
      if (s > 0) hits.push({ siteId: id, siteName: c.institution.name, ...e, score: s });
    }
  }
  // I13: the public service catalogue's published entries (lib/frontdoor/catalogue.ts publicCatalogue(): published only, status
  // computed), searched with every site: each leads to its own page under /services. Never an outside search service.
  if (!site || site === 'services') {
    for (const p of publicCatalogue()) {
      const e: Entry = { kind: 'service', title: p.name, text: [p.description, p.owner, p.statusLabel, ...p.lifeEvents, p.category].filter(Boolean).join(' — '), href: `/services/${encodeURIComponent(p.id)}` };
      const s = score(query, e);
      if (s > 0) hits.push({ siteId: 'services', siteName: siteMessages(locale).servicesTitle, ...e, score: s });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.siteName.localeCompare(b.siteName)).slice(0, limit);
}
