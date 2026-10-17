'use client';

// apps/_shared/public/PublicSiteShell — themeable public-website
// scaffold for ministry / agency / chamber public portals. Every
// institution renders its own crest, palette, hero illustration and
// content; the shell handles the layout grammar and accessibility.
//
// Sections (top to bottom):
//   1. Utility bar      — official-website ribbon, accessibility, language
//   2. Header           — crest + name + nav + search + emergency CTA
//   3. Hero             — headline + subhead + dual CTA + illustration + side note
//   4. Alert banner     — optional national advisory strip
//   5. Quick services   — citizen-facing service shortcuts (6-card grid)
//   6. Featured row     — 3 themed feature cards (campaign / stats / advisory)
//   7. Statistics       — institution-level indicators (4-7 cells)
//   8. News + sections  — three columns: news, initiatives, locator
//   9. Shortcuts strip  — 4 secondary destinations
//  10. Footer           — explore / resources / about / newsletter
//  11. Legal            — copyright, policy links

import * as React from 'react';
import Link from 'next/link';
import { nationMessages, nationLocale } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
import { locales } from '@/lib/i18n/config';
import { GatewayBar, NewsletterForm, SkipLink, PreviewBanner, SiteSchema, Fwd, type SiteGateway } from './integration';
import { FontSizeControls } from './controls';

export interface PublicSiteTheme {
  ink: string;
  inkSoft: string;
  primary: string;
  accent: string;
  surface: string;
  surfaceMute: string;
  line: string;
  emergencyA: string;
  emergencyB: string;
}

export interface PublicSiteNavItem { label: string; href: string; active?: boolean }

export interface PublicSiteHero {
  headline: React.ReactNode;
  /** The headline's two lines as text, for designs that colour them themselves. */
  headlineLines?: [string, string];
  subhead: string;
  primaryCta: { label: string; icon: string; href?: string };
  secondaryCta: { label: string; icon: string; href?: string };
  illustration: React.ReactNode;
  sideNote?: { icon: string; title: string; body: string; cta: string; href?: string };
}

export interface PublicSiteAlert { label: string; text: string }
export interface PublicSiteQuickService { title: string; subtitle: string; color: string; icon: string; href?: string }
export interface PublicSiteFeaturedCard { kicker: string; title: string; body: string; cta: string; tone: 'primary' | 'subtle' | 'amber'; href?: string }
/** `live`: read from the platform's own data rather than typed in. */
export interface PublicSiteStat { value: string; label: string; sub: string; live?: boolean }
export interface PublicSiteNewsItem { title: string; date?: string; summary: string; /** On the ministry's existing website (feed news). */ url?: string }
export interface PublicSiteInitiative { title: string; body: string }
export interface PublicSiteLocator { title: string; placeholder: string; tabs: string[]; pinLabel: string; pinCoords: [number, number][] }
export interface PublicSiteShortcut { title: string; subtitle: string; href?: string }
export type PublicSiteLinkItem = string | { label: string; href: string };
export interface PublicSiteFooterSection { heading: string; items: PublicSiteLinkItem[] }

export interface PublicSiteShellProps {
  theme: PublicSiteTheme;
  institution: {
    name: string;
    tagline: string;
    role: 'Ministry' | 'Agency' | 'Chamber' | 'Branch';
    href: string;
    crest: React.ReactNode;
    /** A sentence about the institution (designs with their own footer use it). */
    about?: string;
    emergencyButton?: { label: string; icon: string } | null;
  };
  nav: PublicSiteNavItem[];
  hero: PublicSiteHero;
  alert?: PublicSiteAlert;
  quickServices: PublicSiteQuickService[];
  featured: [PublicSiteFeaturedCard, PublicSiteFeaturedCard, PublicSiteFeaturedCard];
  statistics: PublicSiteStat[];
  /** Figures that are not live are reference samples until the institution supplies its own. */
  statisticsSample?: boolean;
  news: PublicSiteNewsItem[];
  /** The announcements are reference samples until the institution publishes its own. */
  newsSample?: boolean;
  /** The host the news was taken from (the ministry's existing website), when it was. */
  newsFrom?: string;
  /** The ministry's existing website, when the site is its gateway (Link, Embed or Migrate mode). */
  gateway?: SiteGateway;
  /** Showing a pending proposal (officials only), not the published site. */
  preview?: boolean;
  /** The page's language and direction (right to left only once fully translated into such a language). */
  lang?: string;
  dir?: 'ltr' | 'rtl';
  initiatives: PublicSiteInitiative[];
  locator?: PublicSiteLocator;
  shortcuts: PublicSiteShortcut[];
  footerSections: PublicSiteFooterSection[];
  newsletter: { heading: string; body: string };
  legalLine: string;
  legalLinks: PublicSiteLinkItem[];
  /** A section of the site's own drawn after the standard blocks, inside the main content (Education's public-branch index). */
  extra?: React.ReactNode;
  /** The site's absolute address, for schema.org (from the request; absent outside one). */
  url?: string;
}

const itemLabel = (i: PublicSiteLinkItem) => (typeof i === 'string' ? i : i.label);
const itemHref = (i: PublicSiteLinkItem, fallback: string) => (typeof i === 'string' ? fallback : i.href);

/** A link when the action has a destination, otherwise the original button. */
function Action({ href, className, style, children }: { href?: string; className: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return href
    ? <Link href={href} className={className} style={style}>{children}</Link>
    : <button className={className} style={style}>{children}</button>;
}

export function PublicSiteShell({
  theme, extra, url, institution, nav, hero, alert, quickServices, featured, statistics, statisticsSample, news, newsSample, newsFrom, gateway, preview, lang, dir, initiatives,
  locator, shortcuts, footerSections, newsletter, legalLine, legalLinks,
}: PublicSiteShellProps) {
  // Fixed wording in the nation's language (lib/i18n `site`); each institution's own content is unchanged.
  const t = nationMessages().site;
  const language = locales.find(l => l.code === nationLocale())?.name ?? 'English';
  return (
    <div className="min-h-screen text-[#1a2332]" style={{ background: theme.surface }} lang={lang} dir={dir} data-site-root="">
      <SkipLink label={t.skipMain} />
      <PreviewBanner on={preview} />
      {/* 1. Utility ribbon */}
      <section aria-label={fill(t.officialWebsite, { name: institution.name })} className="w-full text-[12px] text-white/85"
        style={{ background: `linear-gradient(90deg, ${theme.ink}, ${theme.inkSoft})` }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2">
          <div className="flex items-center gap-4">
            <span>{fill(t.officialWebsite, { name: institution.name })}</span>
            <Link href="/government" className="hidden border-s border-white/20 ps-4 hover:text-white sm:inline">{t.allInstitutions}</Link>
            <Link href="/portal" className="hidden hover:text-white sm:inline">{t.citizenPortal}</Link>
            <Link href="/noc" className="hidden hover:text-white sm:inline">{t.liveBriefing}</Link>
          </div>
          <div className="flex items-center gap-4">
            <FontSizeControls up={t.fontUp} normal={t.fontNormal} down={t.fontDown} />
            <span className="hover:text-white">{language} ▾</span>
          </div>
        </div>
      </section>

      {/* 2. Header */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: theme.line }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold text-white"
              style={{ background: theme.ink }} aria-hidden>{institution.crest}</span>
            <div className="leading-tight">
              <div className="text-[18px] font-bold tracking-tight" style={{ color: theme.ink }}>{institution.name}</div>
              <div className="text-[11px] text-slate-600">{institution.tagline}</div>
            </div>
          </div>
          <nav className="mx-auto hidden items-center gap-7 text-[14px] font-medium text-slate-600 lg:flex">
            {nav.map(n => (
              <Link key={n.label} href={n.href}
                className={n.active ? 'relative font-semibold' : 'hover:text-slate-900'}
                style={n.active ? { color: theme.primary } : undefined}>
                {n.label}
                {n.active ? <span className="absolute -bottom-[15px] start-0 h-0.5 w-full" style={{ background: theme.primary }} /> : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={`/search?site=${institution.href.slice(1)}`} aria-label={t.search} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"><span aria-hidden>⌕</span></Link>
            {institution.emergencyButton ? (
              <button className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white"
                style={{ background: `linear-gradient(90deg, ${theme.emergencyA}, ${theme.emergencyB})` }}>
                <span aria-hidden>{institution.emergencyButton.icon}</span> {institution.emergencyButton.label}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <GatewayBar gateway={gateway} name={institution.name} accent={theme.primary} />
      <main id="main">
      <SiteSchema name={institution.name} description={institution.tagline} gateway={gateway} url={url} lang={lang} emergency={institution.emergencyButton?.label} />

      {/* 3. Hero */}
      <section style={{ background: `linear-gradient(110deg, #ffffff, ${theme.surfaceMute} 55%, ${theme.surfaceMute})` }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-6 px-6 py-12 lg:grid-cols-[1.05fr_1fr_0.7fr]">
          <div>
            <h1 className="text-[44px] font-extrabold leading-[1.08]">{hero.headline}</h1>
            <p className="mt-3 max-w-sm text-[15px] text-slate-600">{hero.subhead}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Action href={hero.primaryCta.href} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white"
                style={{ background: theme.primary }}>
                <span aria-hidden>{hero.primaryCta.icon}</span> {hero.primaryCta.label}
              </Action>
              <Action href={hero.secondaryCta.href} className="flex items-center gap-2 rounded-lg border bg-white px-5 py-2.5 text-[13px] font-semibold"
                style={{ borderColor: theme.line, color: theme.ink }}>
                <span aria-hidden>{hero.secondaryCta.icon}</span> {hero.secondaryCta.label}
              </Action>
            </div>
          </div>
          <div className="h-[280px] w-full rounded-2xl shadow-xl">{hero.illustration}</div>
          {hero.sideNote ? (
            <div className="rounded-2xl border bg-white p-5 shadow-lg" style={{ borderColor: theme.line }}>
              <span className="grid h-12 w-12 place-items-center rounded-full text-[18px]"
                style={{ background: theme.surfaceMute, color: theme.primary }} aria-hidden>{hero.sideNote.icon}</span>
              <div className="mt-3 text-[16px] font-bold leading-snug" style={{ color: theme.ink }}>{hero.sideNote.title}</div>
              <p className="mt-1 text-[12px] text-slate-600">{hero.sideNote.body}</p>
              {hero.sideNote.href
                ? <Link href={hero.sideNote.href} className="mt-3 inline-block text-[12px] font-semibold" style={{ color: theme.primary }}>{hero.sideNote.cta} <Fwd /></Link>
                : <span className="mt-3 inline-block text-[12px] font-semibold" style={{ color: theme.primary }}>{hero.sideNote.cta} <Fwd /></span>}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-10 px-6 py-8">
        {/* 4. Alert banner */}
        {alert ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: '#f6c5c5', background: '#fdeeee' }}>
            <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: '#c0232c' }}>
              <span aria-hidden>⚠</span> {alert.label}
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-slate-700">{alert.text}</span>
            <span className="text-[12px] font-semibold" style={{ color: '#c0232c' }}>{t.viewAlerts}</span>
          </div>
        ) : null}

        {/* 5. Quick services */}
        <section id="services" className="scroll-mt-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-bold" style={{ color: theme.ink }}>{t.iWantTo}</h2>
            <Link href="/wallet/services" className="text-[12px] font-semibold" style={{ color: theme.primary }}>{t.viewServices}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickServices.map(q => {
              const body = (
                <>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[18px] text-white"
                    style={{ background: q.color }} aria-hidden>{q.icon}</span>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: theme.ink }}>{q.title}</div>
                  <div className="text-[11px] text-slate-600">{q.subtitle}</div>
                </>
              );
              const cls = 'block rounded-xl border bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md';
              return q.href
                ? <Link key={q.title} href={q.href} className={cls} style={{ borderColor: theme.line }}>{body}</Link>
                : <div key={q.title} className={cls} style={{ borderColor: theme.line }}>{body}</div>;
            })}
          </div>
        </section>

        {/* 6. Featured row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {featured.map((f, i) => {
            const isPrimary = f.tone === 'primary';
            const isAmber = f.tone === 'amber';
            return (
              <div key={i} className={isPrimary ? 'rounded-2xl p-5 text-white shadow-md' : 'rounded-2xl border p-5 shadow-sm'}
                style={isPrimary
                  ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }
                  : isAmber
                    ? { borderColor: '#f0e2bf', background: '#fdf6e3' }
                    : { borderColor: theme.line, background: theme.surfaceMute }}>
                <div className="text-[11px] uppercase tracking-wide" style={isPrimary ? { opacity: 0.8 } : isAmber ? { color: '#92600e' } : { color: theme.inkSoft }}>{f.kicker}</div>
                <div className="mt-1 text-[18px] font-bold" style={isPrimary ? undefined : isAmber ? { color: '#92600e' } : { color: theme.ink }}>{f.title}</div>
                <p className={isPrimary ? 'mt-1 text-[12px] opacity-90' : isAmber ? 'mt-1 text-[12px] text-amber-800' : 'mt-1 text-[12px] text-slate-600'}>{f.body}</p>
                {React.createElement(f.href ? Link : 'span', {
                  ...(f.href ? { href: f.href } : {}),
                  className: isPrimary ? 'mt-3 inline-block rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur' : 'mt-3 inline-block text-[12px] font-semibold',
                  style: isPrimary ? undefined : isAmber ? { color: '#92600e' } : { color: theme.primary },
                } as React.ComponentProps<typeof Link>, <>{f.cta} <Fwd /></>)}
              </div>
            );
          })}
        </div>

        {/* 7. Statistics */}
        {statistics.length > 0 ? (
          <section id="statistics" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-bold" style={{ color: theme.ink }}>{fill(t.atGlance, { name: institution.name.replace('Ministry of ', '') })}</h2>
                {statisticsSample && statistics.some(s => !s.live) ? (
                  <SampleChip label={statistics.some(s => s.live) ? t.includesSample : t.sampleFigures}
                    note={fill(t.sampleNote, { name: institution.name })} />
                ) : null}
              </div>
              <Link href="/public" className="text-[12px] font-semibold" style={{ color: theme.primary }}>{t.viewStats}</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {statistics.map(s => (
                <div key={s.label} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: theme.line }}>
                  <span className="grid h-7 w-7 place-items-center rounded-lg text-[12px]"
                    style={{ background: theme.surfaceMute, color: theme.primary }} aria-hidden>◆</span>
                  <div className="mt-1.5 text-[18px] font-bold" style={{ color: theme.ink }}>{s.value}</div>
                  <div className="text-[11px] font-medium text-slate-600">{s.label}</div>
                  <div className="text-[9px] text-slate-600">{s.sub}</div>
                  {s.live ? <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#0a6e4c' }}><span aria-hidden>●</span> {t.live}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* 8. News + initiatives + locator */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div id="news" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: theme.line }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-bold" style={{ color: theme.ink }}>{t.latestNews}</h3>
                {newsSample ? <SampleChip label={t.sampleNews} note={fill(t.sampleNote, { name: institution.name })} /> : null}
                {newsFrom ? <SourceChip label={fill(t.fromSite, { host: newsFrom })} /> : null}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: theme.primary }}>{t.viewNews}</span>
            </div>
            <div className="space-y-3">
              {news.map(n => (
                <div key={n.title} className="flex gap-3">
                  <div className="h-14 w-16 shrink-0 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${theme.surfaceMute}, ${theme.primary})` }} aria-hidden />
                  <div>
                    {n.url
                      ? <a href={n.url} rel="noopener" className="text-[12px] font-semibold hover:underline" style={{ color: theme.ink }}>{n.title} ↗</a>
                      : <div className="text-[12px] font-semibold" style={{ color: theme.ink }}>{n.title}</div>}
                    <div className="text-[10px] text-slate-600">{n.summary}</div>
                    {n.date ? <div className="text-[9px] text-slate-600">{n.date}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div id="programmes" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: theme.line }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold" style={{ color: theme.ink }}>{t.ourInitiatives}</h3>
              <span className="text-[11px] font-semibold" style={{ color: theme.primary }}>{t.viewPrograms}</span>
            </div>
            <div className="space-y-3">
              {initiatives.map(it => (
                <div key={it.title} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px]"
                    style={{ background: theme.surfaceMute, color: theme.primary }} aria-hidden>✦</span>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: theme.ink }}>{it.title}</div>
                    <div className="text-[10px] text-slate-600">{it.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full rounded-md border py-1.5 text-[11px] font-semibold"
              style={{ borderColor: theme.primary, color: theme.primary }}>{t.allPrograms}</button>
          </div>
          {locator ? (
            <div id="contact" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: theme.line }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-bold" style={{ color: theme.ink }}>{locator.title}</h3>
                <span className="text-[11px] font-semibold" style={{ color: theme.primary }}>{t.viewMap}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] text-slate-600"
                style={{ borderColor: theme.line }}>
                <span>⌕</span> {locator.placeholder}
              </div>
              <div className="relative mt-2 h-36 overflow-hidden rounded-lg"
                style={{ background: `linear-gradient(135deg, ${theme.surfaceMute}, #c3d4e6)` }}
                role="img" aria-label={locator.title}>
                {locator.pinCoords.map(([x, y], i) => (
                  <span key={i} className="absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[8px] font-bold text-white"
                    style={{ left: `${x}%`, top: `${y}%`, background: theme.primary }}>{locator.pinLabel}</span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {locator.tabs.map((t, i) => (
                  <span key={t} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={i === 0 ? { background: theme.primary, color: '#fff' } : { border: `1px solid ${theme.line}`, color: '#475569' }}>{t}</span>
                ))}
              </div>
            </div>
          ) : (
            <div id="contact" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: theme.line }}>
              <div className="mb-3 text-[15px] font-bold" style={{ color: theme.ink }}>{t.contact}</div>
              <p className="text-[12px] text-slate-600">{t.contactText}</p>
              <button className="mt-3 w-full rounded-md py-1.5 text-[12px] font-semibold text-white"
                style={{ background: theme.primary }}>{t.contactUs}</button>
            </div>
          )}
        </div>

        {/* 9. Shortcuts */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border px-5 py-6 shadow-sm lg:grid-cols-4"
          style={{ borderColor: theme.line, background: theme.surfaceMute }}>
          {shortcuts.map(s => {
            const body = (
              <>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px]"
                  style={{ background: '#dbe8fb', color: theme.primary }} aria-hidden>▣</span>
                <div>
                  <div className="text-[12px] font-bold" style={{ color: theme.ink }}>{s.title}</div>
                  <div className="text-[10px] text-slate-600">{s.subtitle}</div>
                </div>
              </>
            );
            return s.href
              ? <Link key={s.title} href={s.href} className="flex gap-3 hover:opacity-80">{body}</Link>
              : <div key={s.title} className="flex gap-3">{body}</div>;
          })}
        </div>
      </div>

      {extra}
      </main>


      {/* 10. Footer */}
      <footer id="about" className="text-white/80" style={{ background: theme.ink }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-bold text-white">
              <span aria-hidden>◈</span> {institution.name}
            </div>
            <p className="mt-2 text-[11px] text-white/60">{institution.tagline}.</p>
            <div className="mt-3 flex gap-3 text-white/60">
              {['f', '𝕏', '▶', '◎', 'in'].map(x => <span key={x} aria-hidden>{x}</span>)}
            </div>
          </div>
          {footerSections.map(sec => (
            <div key={sec.heading}>
              <div className="text-[13px] font-semibold text-white">{sec.heading}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-white/60">
                {sec.items.map(item => (
                  <li key={itemLabel(item)}>
                    <Link href={itemHref(item, institution.href)} className="hover:text-white">{itemLabel(item)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[13px] font-semibold text-white">{newsletter.heading}</div>
            <p className="mt-1 text-[11px] text-white/60">{newsletter.body}</p>
            <NewsletterForm site={institution.href.slice(1)} note={t.subscribeNote} noteClassName="text-white/60">
              <input type="email" name="email" required autoComplete="email" placeholder={t.enterEmail} className="min-w-0 flex-1 rounded-s-md px-2 py-1.5 text-[12px] text-slate-800" aria-label={t.email} />
              <button type="submit" className="rounded-e-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: theme.primary }}>{t.subscribe}</button>
            </NewsletterForm>
          </div>
        </div>
        {/* 11. Legal */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[12px] text-white/60">
            <span>{legalLine}</span>
            <div className="flex gap-4">
              {legalLinks.map(l => <Link key={itemLabel(l)} href={itemHref(l, institution.href)} className="hover:text-white">{itemLabel(l)}</Link>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Marks reference content that the institution has not yet replaced with its own. */
export function SampleChip({ label, note }: { label: string; note: string }) {
  return (
    <span title={note} className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: '#e7c879', background: '#fdf6e3', color: '#92600e' }}>{label}</span>
  );
}

/** Marks content taken from the ministry's existing website. */
export function SourceChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ borderColor: '#bfd6f2', background: '#eef5fd', color: '#1f5fad' }}>{label}</span>
  );
}
