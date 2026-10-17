// Turns a public-site content record (lib/public-sites) into PublicSiteShell
// props: fills the nation's placeholders, resolves links (a section of the
// same site or a platform route), marks sample and live content, and wears the
// nation's insignia once setup is complete.

import * as React from 'react';
import type { PublicSiteShellProps, PublicSiteTheme } from './PublicSiteShell';
import { siteContent } from '@/lib/public-sites';
import type { SiteContent, SiteLink } from '@/lib/public-sites/types';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { nationInsignia } from '@/lib/nation/registry';

export interface SitePropsOptions {
  theme: PublicSiteTheme;
  illustration: React.ReactNode;
  /** Figures read from the platform's data, for {live.<key>} placeholders. */
  live?: Record<string, string>;
  /** The request's year, for {year}. */
  year?: number;
}

/** Resolve a link: a section of this site becomes an anchor on its page. */
export function siteHref(id: string, to: SiteLink): string {
  if (to.startsWith('/')) return to;
  return to === 'home' ? `/${id}` : `/${id}#${to}`;
}

export function siteProps(id: string, { theme, illustration, live = {}, year = new Date().getFullYear() }: SitePropsOptions): PublicSiteShellProps {
  const raw = siteContent(id);
  // Live figures first, so a live value is never mistaken for a sample.
  const liveAt = new Set(raw.statistics.flatMap((s, i) => (/\{live\.\w+\}/.test(s.value) ? [i] : [])));
  const withLive = JSON.parse(JSON.stringify(raw).replace(/\{live\.(\w+)\}/g, (_, k: string) => JSON.stringify(live[k] ?? '—').slice(1, -1))) as SiteContent;
  const c = fillDeep(withLive, siteTokens(year));
  const href = (to: SiteLink) => siteHref(id, to);
  const colour = (v: string) => (v === 'primary' ? theme.primary : v === 'accent' ? theme.accent : v);
  const insignia = nationInsignia();

  return {
    theme,
    institution: {
      name: c.institution.name,
      tagline: c.institution.tagline,
      role: c.institution.role,
      href: `/${id}`,
      crest: insignia
        ? <span className="text-[13px] tracking-wide" title={insignia.name}>{insignia.seal}</span>
        : c.institution.crest,
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
    initiatives: c.initiatives,
    locator: c.locator,
    shortcuts: c.shortcuts.map(s => ({ title: s.title, subtitle: s.subtitle, href: href(s.to) })),
    footerSections: c.footerSections.map(sec => ({ heading: sec.heading, items: sec.items.map(i => ({ label: i.label, href: href(i.to) })) })),
    newsletter: c.newsletter,
    legalLine: c.legalLine,
    legalLinks: c.legalLinks.map(l => ({ label: l.label, href: href(l.to) })),
  };
}
