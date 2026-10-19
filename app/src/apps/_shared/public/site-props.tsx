// Turns a public-site content record (lib/public-sites) into PublicSiteShell
// props: fills the nation's placeholders, resolves links (a section of the
// same site or a platform route), marks sample and live content, and wears the
// nation's insignia once setup is complete. Integration settings bring in the
// ministry's existing website: its news (Link, Embed, Migrate) and the gateway.

import * as React from 'react';
import type { PublicSiteShellProps, PublicSiteTheme } from './PublicSiteShell';
import { accessibleTheme } from './design/contrast';
import { logoVersion } from '@/lib/public-sites/brand';
import { headers, cookies } from 'next/headers';
import { effectiveContent } from '@/lib/public-sites/effective';
import type { SiteContent, SiteLink } from '@/lib/public-sites/types';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { nationInsignia, nationLanguages, nationLocale } from '@/lib/nation/registry';

export interface SitePropsOptions {
  theme: PublicSiteTheme;
  illustration: React.ReactNode;
  /** Figures read from the platform's data, for {live.<key>} placeholders. */
  live?: Record<string, string>;
  /** The request's year, for {year}. */
  year?: number;
  /** A pending proposal to show instead of the published content (officials only). */
  preview?: string;
  /** The visitor's language and the page's origin (siteRequest()); the nation's language and no address without it. */
  request?: SiteRequest;
}

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Resolve a link: a section of this site becomes an anchor on its page. */
export function siteHref(id: string, to: SiteLink): string {
  if (to.startsWith('/')) return to;
  return to === 'home' ? `/${id}` : `/${id}#${to}`;
}

/** The cookie that holds a visitor's language choice on the public sites (set by /api/public-sites/language). */
export const SITE_LANG_COOKIE = 'civicos_site_lang';

/** What a public page reads from its request: the visitor's language and the page's origin. */
export interface SiteRequest {
  /** The visitor's language among the nation's official languages; the nation's main language otherwise. */
  locale: string;
  /** The page's origin (scheme and host) for absolute addresses; none outside a request. */
  origin?: string;
}

/** Read the visitor's language and the page's origin from the request (defaults outside one, e.g. in tests). */
export async function siteRequest(): Promise<SiteRequest> {
  let locale = nationLocale();
  let origin: string | undefined;
  try {
    const v = (await cookies()).get(SITE_LANG_COOKIE)?.value;
    if (v && nationLanguages().includes(v)) locale = v;
  } catch { /* outside a request */ }
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) origin = `${h.get('x-forwarded-proto') ?? (/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https')}://${host}`;
  } catch { /* outside a request */ }
  return { locale, origin };
}

/** The visitor's language among the nation's official languages; the nation's main language otherwise. */
export async function visitorLocale(): Promise<string> {
  return (await siteRequest()).locale;
}

export function siteProps(id: string, { theme: given, illustration, live = {}, year = new Date().getFullYear(), preview, request }: SitePropsOptions): PublicSiteShellProps {
  const { content: raw, settings, previewing, previewBrand, language } = effectiveContent(id, preview, request?.locale ?? nationLocale());
  // The ministry's own colours when it brought them (a previewed proposal's first), darkened where
  // needed so text in them stays readable (WCAG AA).
  const brand = previewBrand !== undefined ? previewBrand ?? undefined : settings.brand;
  const theme = accessibleTheme({ ...given, ...(brand?.primary ? { primary: brand.primary } : {}), ...(brand?.accent ? { accent: brand.accent } : {}) });
  const logo = brand?.logo
    ? { src: previewBrand?.logo ? `data:${brand.logo.type};base64,${brand.logo.data}` : `/api/public-sites/${id}/logo?v=${logoVersion(brand.logo.data)}`, alt: brand.logo.alt }
    : undefined;
  // Live figures first, so a live value is never mistaken for a sample.
  const liveAt = new Set(raw.statistics.flatMap((s, i) => (/\{live\.\w+\}/.test(s.value) ? [i] : [])));
  const withLive = JSON.parse(JSON.stringify(raw).replace(/\{live\.(\w+)\}/g, (_, k: string) => JSON.stringify(live[k] ?? '—').slice(1, -1))) as SiteContent;
  const c = fillDeep(withLive, siteTokens(year));
  const href = (to: SiteLink) => siteHref(id, to);
  const colour = (v: string) => (v === 'primary' ? theme.primary : v === 'accent' ? theme.accent : v);
  const insignia = nationInsignia();

  return {
    theme,
    url: request?.origin ? `${request.origin}/${id}` : undefined,
    institution: {
      name: c.institution.name,
      tagline: c.institution.tagline,
      role: c.institution.role,
      href: `/${id}`,
      crest: insignia
        ? <span className="text-[13px] tracking-wide" title={insignia.name}>{insignia.seal}</span>
        : c.institution.crest,
      ...(logo ? { logo } : {}),
      about: c.institution.about,
      emergencyButton: c.institution.emergencyButton,
    },
    nav: c.nav.map((n, i) => ({ label: n.label, href: href(n.to), active: i === 0 })),
    hero: {
      headline: <><span style={{ color: theme.ink }}>{c.hero.headline[0]}</span><br /><span style={{ color: theme.primary }}>{c.hero.headline[1]}</span></>,
      headlineLines: c.hero.headline,
      subhead: c.hero.subhead,
      primaryCta: { label: c.hero.primaryCta.label, icon: c.hero.primaryCta.icon, href: href(c.hero.primaryCta.to) },
      secondaryCta: { label: c.hero.secondaryCta.label, icon: c.hero.secondaryCta.icon, href: href(c.hero.secondaryCta.to) },
      illustration,
      ...(c.hero.sideNote ? { sideNote: { ...c.hero.sideNote, href: href(c.hero.sideNote.to) } } : {}),
    },
    alert: c.alert,
    quickServices: c.quickServices.map(q => ({ title: q.title, subtitle: q.subtitle, icon: q.icon, color: colour(q.color), href: href(q.to) })),
    featured: c.featured.map(f => ({ kicker: f.kicker, title: f.title, body: f.body, cta: f.cta, tone: f.tone, href: href(f.to) })) as PublicSiteShellProps['featured'],
    statistics: c.statistics.map((s, i) => ({ ...s, live: liveAt.has(i) })),
    statisticsSample: c.statisticsSource === 'sample',
    news: c.news,
    newsSample: c.newsSource === 'sample',
    ...(c.newsSource === 'feed' && settings.website ? { newsFrom: hostOf(settings.website) } : {}),
    ...(previewing ? { preview: true } : {}),
    locale: language.locale,
    languages: nationLanguages(),
    lang: language.lang,
    dir: language.dir,
    ...(settings.mode !== 'host' && settings.website ? { gateway: { mode: settings.mode, website: settings.website, host: hostOf(settings.website) } } : {}),
    initiatives: c.initiatives,
    locator: c.locator,
    shortcuts: c.shortcuts.map(s => ({ title: s.title, subtitle: s.subtitle, href: href(s.to) })),
    footerSections: c.footerSections.map(sec => ({ heading: sec.heading, items: sec.items.map(i => ({ label: i.label, href: href(i.to) })) })),
    newsletter: c.newsletter,
    legalLine: c.legalLine,
    legalLinks: c.legalLinks.map(l => ({ label: l.label, href: href(l.to) })),
  };
}
