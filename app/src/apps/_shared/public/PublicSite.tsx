// A public institution website composed from a design preset
// (design/presets.ts) and the institution's content record (lib/public-sites,
// resolved by siteProps). The frame — official banner, header, legal footer —
// is shared by every preset; the blocks between them differ in order, variant,
// typography, shape and palette, so each ministry looks like itself.
// "Civic Standard" renders the original PublicSiteShell unchanged.

import * as React from 'react';
import Link from 'next/link';
import './design/fonts.css';
import { PublicSiteShell, SampleChip, SourceChip, type PublicSiteShellProps, type PublicSiteTheme, type PublicSiteLinkItem } from './PublicSiteShell';
import { GatewayBar, LanguageSwitch, SiteLogo, NewsletterForm, SkipLink, PreviewBanner, SiteSchema, Fwd } from './integration';
import { FontSizeControls } from './controls';
import { effectiveContent } from '@/lib/public-sites/effective';
import { getSiteSettings } from '@/lib/data/site-settings';
import { siteProps } from './site-props';
import { siteLocations } from './locator-data';
import { LocatorPanel } from './LocatorPanel';
import { PRESETS, DEFAULT_PRESET, presetsFor, type Preset, type PresetDesign, type BlockRef } from './design/presets';
import { nationLocale, siteMessages, nationEmergencyContacts } from '@/lib/nation/registry';
import { t as fill, type Messages } from '@/lib/i18n';

export interface PublicSiteProps {
  id: string;
  theme: PublicSiteTheme;
  illustration: React.ReactNode;
  live?: Record<string, string>;
  /** Sections particular to this site, shown after the composed blocks and before the footer. */
  extra?: React.ReactNode;
  /** A preset to show instead of the site's own (e.g. from ?preset= for comparing designs). Ignored if not allowed for the site. */
  preset?: string;
  /** A pending proposal to preview (?preview=, officials only). */
  preview?: string;
}

/** The preset a site uses: the requested one when the site may use it, else the one its ministry chose, else its default. */
export function presetFor(id: string, requested?: string): Preset {
  const allowed = presetsFor(id);
  const chosen = getSiteSettings(id).preset;
  return allowed.find(p => p.id === requested) ?? allowed.find(p => p.id === chosen) ?? PRESETS[DEFAULT_PRESET[id] ?? 'civic-standard'] ?? PRESETS['civic-standard']!;
}

export function PublicSite({ id, theme, illustration, live, preset, preview, extra }: PublicSiteProps) {
  const props = siteProps(id, { theme, illustration, live, preview });
  // The locator shows the institution's own published sites from the national facility register.
  const site = props.locator ? { ...props, locations: siteLocations(id, props.locator.tabs) } : props;
  const p = presetFor(id, preset ?? (preview ? effectiveContent(id, preview).previewPreset ?? undefined : undefined));
  // A bespoke design is drawn by the site's own page; here it falls back to Civic Standard.
  if (p.id === 'civic-standard' || p.bespoke) return <PublicSiteShell {...site} extra={extra} />;
  return <ComposedSite site={site} preset={p} extra={extra} />;
}

// ── Context shared by the blocks ──────────────────────────────────────────

interface Ctx {
  s: PublicSiteShellProps;
  th: PublicSiteTheme;
  d: PresetDesign;
  t: Messages['site'];
  /** Page background, card background and rule colour after the preset's palette treatment. */
  bg: string;
  card: string;
  rule: string;
}

const itemLabel = (i: PublicSiteLinkItem) => (typeof i === 'string' ? i : i.label);
const itemHref = (i: PublicSiteLinkItem, fallback: string) => (typeof i === 'string' ? fallback : i.href);

function heading(c: Ctx, size: number): React.CSSProperties {
  return {
    fontFamily: c.d.display, fontWeight: c.d.headingWeight, color: c.th.ink, fontSize: size, lineHeight: 1.15,
    textTransform: c.d.headingCase === 'upper' ? 'uppercase' : undefined,
    letterSpacing: c.d.headingCase === 'upper' ? '0.02em' : undefined,
  };
}

function Wrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1280px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

function Card({ c, children, className = '', id }: { c: Ctx; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`scroll-mt-28 border bg-white p-5 shadow-sm ${className}`} style={{ borderColor: c.rule, borderRadius: c.d.radius, background: c.card }}>
      {children}
    </div>
  );
}

function SectionHead({ c, title, chip, more, size = 22 }: { c: Ctx; title: string; chip?: React.ReactNode; more?: { label: string; href: string }; size?: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 style={heading(c, size)}>{title}</h2>
        {chip}
      </div>
      {more ? <Link href={more.href} className="text-[12px] font-semibold" style={{ color: c.th.primary }}>{more.label}</Link> : null}
    </div>
  );
}

function Btn({ c, href, primary, icon, label }: { c: Ctx; href?: string; primary?: boolean; icon: string; label: string }) {
  const cls = 'inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90';
  const style: React.CSSProperties = primary
    ? { background: c.th.primary, color: '#fff', borderRadius: c.d.radius }
    : { background: '#fff', color: c.th.ink, border: `1px solid ${c.rule}`, borderRadius: c.d.radius };
  const body = <><span aria-hidden>{icon}</span> {label}</>;
  return href ? <Link href={href} className={cls} style={style}>{body}</Link> : <button className={cls} style={style}>{body}</button>;
}

const sampleNote = (c: Ctx) => fill(c.t.sampleNote, { name: c.s.institution.name });
const figuresChip = (c: Ctx) => (c.s.statisticsSample && c.s.statistics.some(x => !x.live)
  ? <SampleChip label={c.s.statistics.some(x => x.live) ? c.t.includesSample : c.t.sampleFigures} note={sampleNote(c)} /> : null);
const newsChip = (c: Ctx) => (c.s.newsSample ? <SampleChip label={c.t.sampleNews} note={sampleNote(c)} />
  : c.s.newsFrom ? <SourceChip label={fill(c.t.fromSite, { host: c.s.newsFrom })} /> : null);
/** A news title, linked to the item on the ministry's website when it came from there. */
const newsTitle = (n: PublicSiteShellProps['news'][number], style: React.CSSProperties, className = '') => (n.url
  ? <a href={n.url} rel="noopener" className={`${className} hover:underline`} style={style}>{n.title} ↗</a>
  : <span className={className} style={style}>{n.title}</span>);
const glanceTitle = (c: Ctx) => fill(c.t.atGlance, { name: c.s.institution.name.replace('Ministry of ', '') });

/** The number in a label like "Emergency 999", for a tap-to-call link. */
const telOf = (label: string) => /(\+?\d[\d\s-]{1,14}\d|\d{2,})/.exec(label)?.[0]?.replace(/[\s-]/g, '');

// ── Frame (shared foundations) ────────────────────────────────────────────

function Frame({ c, children }: { c: Ctx; children: React.ReactNode }) {
  const { s, th, d, t } = c;
  const emergency = s.institution.emergencyButton;
  const tel = emergency ? telOf(emergency.label) : undefined;
  const crest = (size: number) => s.institution.logo ? <SiteLogo logo={s.institution.logo} size={size} /> : (
    <span className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: th.ink, fontSize: size * 0.36 }} aria-hidden>{s.institution.crest}</span>
  );
  const nav = (
    <nav className="hidden items-center gap-6 text-[14px] font-medium lg:flex" aria-label={s.institution.name}>
      {s.nav.map(n => (
        <Link key={n.label} href={n.href} className={n.active ? 'font-semibold' : 'hover:opacity-80'}
          style={{ color: n.active ? th.primary : '#475569', borderBottom: n.active ? `2px solid ${th.primary}` : '2px solid transparent', paddingBottom: 4 }}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
  const actions = (
    <div className="flex items-center gap-3">
      <Link href={`/search?site=${s.institution.href.slice(1)}`} aria-label={t.search} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"><span aria-hidden>⌕</span></Link>
      {emergency ? (
        tel
          ? <a href={`tel:${tel}`} className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white" style={{ background: `linear-gradient(90deg, ${th.emergencyA}, ${th.emergencyB})`, borderRadius: d.radius }}><span aria-hidden>{emergency.icon}</span> {emergency.label}</a>
          : <Link href="#contact" className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white" style={{ background: `linear-gradient(90deg, ${th.emergencyA}, ${th.emergencyB})`, borderRadius: d.radius }}><span aria-hidden>{emergency.icon}</span> {emergency.label}</Link>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen text-[#1a2332]" style={{ background: c.bg, fontFamily: d.body }} lang={s.lang} dir={s.dir} data-site-root="">
      <SkipLink label={t.skipMain} />
      <PreviewBanner on={s.preview} />
      {/* Official banner — the same on every public site. */}
      <section lang={s.locale} aria-label={fill(t.officialWebsite, { name: s.institution.name })} className="w-full text-[12px] text-white/85" style={{ background: `linear-gradient(90deg, ${th.ink}, ${th.inkSoft})` }}>
        <Wrap className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
          <div className="flex items-center gap-4">
            <span>{fill(t.officialWebsite, { name: s.institution.name })}</span>
            <Link href="/government" className="hidden border-s border-white/20 ps-4 hover:text-white sm:inline">{t.allInstitutions}</Link>
            <Link href="/portal" className="hidden hover:text-white sm:inline">{t.citizenPortal}</Link>
            <Link href="/noc" className="hidden hover:text-white sm:inline">{t.liveBriefing}</Link>
          </div>
          <div className="flex items-center gap-4">
            <FontSizeControls up={t.fontUp} normal={t.fontNormal} down={t.fontDown} />
            <LanguageSwitch current={s.locale ?? nationLocale()} languages={s.languages} path={s.institution.href} label={t.languageLabel} />
          </div>
        </Wrap>
      </section>

      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: c.rule }}>
        {d.header === 'masthead' ? (
          <>
            <Wrap className="flex flex-col items-center gap-2 pb-3 pt-5 text-center">
              {crest(56)}
              <div style={heading(c, 26)}>{s.institution.name}</div>
              <div className="text-[12px] tracking-wide text-slate-600">{s.institution.tagline}</div>
            </Wrap>
            <div className="border-t" style={{ borderColor: c.rule }}>
              <Wrap className="flex items-center justify-center gap-6 py-2.5">{nav}<div className="lg:absolute lg:end-6">{actions}</div></Wrap>
            </div>
          </>
        ) : (
          <Wrap className="flex items-center gap-6 py-3">
            <Link href={s.institution.href} className="flex items-center gap-3">
              {crest(44)}
              <span className="leading-tight">
                <span className="block" style={heading(c, 19)}>{s.institution.name}</span>
                <span className="block text-[11px] text-slate-600">{s.institution.tagline}</span>
              </span>
            </Link>
            <div className="mx-auto">{nav}</div>
            {actions}
          </Wrap>
        )}
        {/* Phones and tablets: the same menu as a scrollable row. */}
        <nav className="flex gap-5 overflow-x-auto border-t px-4 py-2 text-[13px] font-medium lg:hidden" style={{ borderColor: c.rule }} aria-label={`${s.institution.name} menu`}>
          {s.nav.map(n => (
            <Link key={n.label} href={n.href} className="shrink-0 whitespace-nowrap" style={{ color: n.active ? th.primary : '#475569', fontWeight: n.active ? 600 : 500 }}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <GatewayBar gateway={s.gateway} name={s.institution.name} accent={th.primary} locale={s.locale} />
      <SiteSchema name={s.institution.name} description={s.institution.tagline} gateway={s.gateway} url={s.url} lang={s.lang} emergency={s.institution.emergencyButton?.label} />

      <main id="main" className="flex flex-col" style={{ gap: d.gap, paddingBottom: d.gap }}>{children}</main>

      <footer id="about" className="scroll-mt-28 text-white/80" style={{ background: th.ink }}>
        <Wrap className="grid grid-cols-2 gap-8 py-12 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="text-[16px] font-bold text-white" style={{ fontFamily: d.display }}>{s.institution.name}</div>
            <p className="mt-2 text-[11px] text-white/60">{s.institution.about ?? `${s.institution.tagline}.`}</p>
          </div>
          {s.footerSections.map(sec => (
            <div key={sec.heading}>
              <div className="text-[13px] font-semibold text-white">{sec.heading}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-white/60">
                {sec.items.map(item => <li key={itemLabel(item)}><Link href={itemHref(item, s.institution.href)} className="hover:text-white">{itemLabel(item)}</Link></li>)}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[13px] font-semibold text-white">{s.newsletter.heading}</div>
            <p className="mt-1 text-[11px] text-white/60">{s.newsletter.body}</p>
            <NewsletterForm site={s.institution.href.slice(1)} note={t.subscribeNote} noteClassName="text-white/60">
              <input type="email" name="email" required autoComplete="email" placeholder={t.enterEmail} aria-label={t.email} className="min-w-0 flex-1 px-2 py-1.5 text-[12px] text-slate-800" style={{ borderStartStartRadius: d.radius, borderEndStartRadius: d.radius }} />
              <button type="submit" className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: th.primary, borderStartEndRadius: d.radius, borderEndEndRadius: d.radius }}>{t.subscribe}</button>
            </NewsletterForm>
          </div>
        </Wrap>
        <div className="border-t border-white/10">
          <Wrap className="flex flex-wrap items-center justify-between gap-3 py-4 text-[12px] text-white/60">
            <span>{s.legalLine}</span>
            <div className="flex flex-wrap gap-4">
              {s.legalLinks.map(l => <Link key={itemLabel(l)} href={itemHref(l, s.institution.href)} className="hover:text-white">{itemLabel(l)}</Link>)}
            </div>
          </Wrap>
        </div>
      </footer>
    </div>
  );
}

// ── Blocks ────────────────────────────────────────────────────────────────

function Hero({ c, variant }: { c: Ctx; variant: string }) {
  const { s, th } = c;
  const h = s.hero;
  const [l1, l2] = h.headlineLines ?? ['', ''];
  /** The two headline lines: ink and the site colour on light grounds, white and a light tint on dark ones. */
  const lines = (dark = false) => (h.headlineLines
    ? <><span style={{ color: dark ? '#fff' : th.ink }}>{l1}</span><br /><span style={{ color: dark ? th.surfaceMute : th.primary }}>{l2}</span></>
    : h.headline);
  const ctas = (
    <div className="mt-6 flex flex-wrap gap-3">
      <Btn c={c} primary href={h.primaryCta.href} icon={h.primaryCta.icon} label={h.primaryCta.label} />
      <Btn c={c} href={h.secondaryCta.href} icon={h.secondaryCta.icon} label={h.secondaryCta.label} />
    </div>
  );
  const note = h.sideNote ? (
    <div className="border bg-white p-5 shadow-sm" style={{ borderColor: c.rule, borderRadius: c.d.radius }}>
      <span className="grid h-10 w-10 place-items-center rounded-full text-[16px]" style={{ background: th.surfaceMute, color: th.primary }} aria-hidden>{h.sideNote.icon}</span>
      <div className="mt-3 text-[16px] font-bold" style={{ color: th.ink }}>{h.sideNote.title}</div>
      <p className="mt-1 text-[12px] text-slate-600">{h.sideNote.body}</p>
      {h.sideNote.href ? <Link href={h.sideNote.href} className="mt-3 inline-block text-[12px] font-semibold" style={{ color: th.primary }}>{h.sideNote.cta} <Fwd /></Link> : null}
    </div>
  ) : null;
  const title = (size: number, center = false) => (
    <h1 style={{ ...heading(c, size), textAlign: center ? 'center' : undefined }}>{lines()}</h1>
  );
  const sub = (center = false) => <p className={`mt-4 max-w-xl text-[16px] leading-relaxed text-slate-600 ${center ? 'mx-auto text-center' : ''}`}>{h.subhead}</p>;
  const art = (height: number) => <div className="w-full overflow-hidden shadow-xl" style={{ height, borderRadius: c.d.radius + 4 }}>{h.illustration}</div>;

  if (variant === 'response') {
    return (
      <section style={{ background: `linear-gradient(120deg, #fff, ${th.surfaceMute})` }}>
        <Wrap className="grid grid-cols-1 items-center gap-8 py-12 lg:grid-cols-[1.2fr_1fr]">
          <div>{title(52)}{sub()}{ctas}</div>
          <div className="grid grid-cols-1 gap-4">
            {art(200)}
            {h.sideNote ? (
              <div className="border-s-4 bg-white p-5 shadow-md" style={{ borderColor: th.emergencyA, borderRadius: c.d.radius }}>
                <div className="text-[22px] font-bold" style={{ ...heading(c, 24), color: th.emergencyB }}>{h.sideNote.title}</div>
                <p className="mt-1 text-[13px] text-slate-600">{h.sideNote.body}</p>
                {h.sideNote.href ? <Link href={h.sideNote.href} className="mt-2 inline-block text-[12px] font-semibold" style={{ color: th.emergencyA }}>{h.sideNote.cta} <Fwd /></Link> : null}
              </div>
            ) : null}
          </div>
        </Wrap>
      </section>
    );
  }
  if (variant === 'chamber') {
    return (
      <section style={{ background: th.ink }}>
        <Wrap className="grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 style={{ ...heading(c, 46), color: '#fff' }}>{lines(true)}</h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/75">{h.subhead}</p>
            {ctas}
            {note ? <div className="mt-8 max-w-md">{note}</div> : null}
          </div>
          <div className="relative">
            {art(260)}
            {s.alert ? (
              <div className="relative -mt-14 ms-6 me-6 border bg-white p-4 shadow-lg" style={{ borderColor: c.rule, borderRadius: c.d.radius }}>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: th.emergencyA }}><span aria-hidden>●</span> {s.alert.label}</div>
                <p className="mt-1 text-[13px] text-slate-700">{s.alert.text}</p>
              </div>
            ) : null}
          </div>
        </Wrap>
      </section>
    );
  }
  if (variant === 'statement') {
    return (
      <section style={{ background: `linear-gradient(180deg, #fff, ${c.bg})` }}>
        <Wrap className="flex flex-col items-center py-14 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: th.primary }}>{s.institution.tagline}</div>
          <div className="mt-4">{title(50, true)}</div>
          {sub(true)}
          <div className="flex justify-center">{ctas}</div>
          <div className="mt-10 w-full">{art(220)}</div>
          {note ? <div className="mt-6 w-full max-w-md text-start">{note}</div> : null}
        </Wrap>
      </section>
    );
  }
  if (variant === 'search') {
    return (
      <section style={{ background: `linear-gradient(115deg, #fff, ${th.surfaceMute})` }}>
        <Wrap className="grid grid-cols-1 items-start gap-8 py-12 lg:grid-cols-[1fr_1fr]">
          <div>
            {title(46)}{sub()}{ctas}
            {note ? <div className="mt-6 max-w-md">{note}</div> : null}
          </div>
          <div className="border bg-white shadow-lg" style={{ borderColor: c.rule, borderRadius: c.d.radius + 4 }}>
            <div className="h-28 overflow-hidden" style={{ borderRadius: `${c.d.radius + 4}px ${c.d.radius + 4}px 0 0` }}>{h.illustration}</div>
            <div className="p-5">
              <div style={heading(c, 20)}>{c.t.browseTopics}</div>
              <ul className="mt-3 divide-y" style={{ borderColor: c.rule }}>
                {s.nav.filter(n => !n.active).map(n => (
                  <li key={n.label} style={{ borderColor: c.rule }}>
                    <Link href={n.href} className="flex items-center justify-between gap-3 py-2.5 text-[15px] font-semibold hover:opacity-80" style={{ color: th.ink }}>
                      {n.label}<span style={{ color: th.primary }} aria-hidden><Fwd /></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/wallet/services" className="mt-3 inline-block text-[12px] font-semibold" style={{ color: th.primary }}>{c.t.viewServices}</Link>
            </div>
          </div>
        </Wrap>
      </section>
    );
  }
  if (variant === 'data') {
    const top = s.statistics.slice(0, 4);
    return (
      <section style={{ background: `linear-gradient(120deg, #fff, ${th.surfaceMute})` }}>
        <Wrap className="grid grid-cols-1 items-center gap-8 py-12 lg:grid-cols-[1.1fr_1fr]">
          <div>{title(46)}{sub()}{ctas}{note ? <div className="mt-6 max-w-md">{note}</div> : null}</div>
          <div className="border bg-white p-5 shadow-lg" style={{ borderColor: c.rule, borderRadius: c.d.radius + 2 }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-600">{glanceTitle(c)}</div>
              {figuresChip(c)}
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden" style={{ background: c.rule, borderRadius: c.d.radius }}>
              {top.map(x => (
                <div key={x.label} className="bg-white p-4">
                  <div className="text-[28px] font-semibold tabular-nums" style={{ color: th.ink, fontFamily: c.d.display }}>{x.value}</div>
                  <div className="text-[12px] font-medium text-slate-600">{x.label}</div>
                  <div className="text-[10px] text-slate-600">{x.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-24 overflow-hidden" style={{ borderRadius: c.d.radius }}>{h.illustration}</div>
          </div>
        </Wrap>
      </section>
    );
  }
  if (variant === 'editorial') {
    return (
      <section style={{ background: `linear-gradient(120deg, ${th.ink} 0%, ${th.inkSoft} 55%, ${th.primary} 130%)` }}>
        <Wrap className="grid grid-cols-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 style={{ ...heading(c, 50), color: '#fff' }}>{lines(true)}</h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/80">{h.subhead}</p>
            {ctas}
            {note ? <div className="mt-8 max-w-md">{note}</div> : null}
          </div>
          <div className="border-4 border-white/10 shadow-2xl" style={{ borderRadius: c.d.radius + 6 }}>{art(320)}</div>
        </Wrap>
      </section>
    );
  }
  // 'split' — the Civic Standard arrangement.
  return (
    <section style={{ background: `linear-gradient(110deg, #ffffff, ${th.surfaceMute} 55%, ${th.surfaceMute})` }}>
      <Wrap className="grid grid-cols-1 items-center gap-6 py-12 lg:grid-cols-[1.05fr_1fr_0.7fr]">
        <div>{title(44)}{sub()}{ctas}</div>
        {art(280)}
        {note}
      </Wrap>
    </section>
  );
}

function Alert({ c, variant }: { c: Ctx; variant: string }) {
  const a = c.s.alert;
  if (!a) return null;
  if (variant === 'band') {
    return (
      <div style={{ background: c.th.emergencyA }} className="text-white">
        <Wrap className="flex flex-col items-start gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold uppercase tracking-wide"><span aria-hidden>⚠</span> {a.label}</span>
          <span className="w-full min-w-0 text-[14px] sm:w-auto sm:flex-1">{a.text}</span>
          <Link href="#news" className="text-[12px] font-semibold underline underline-offset-2">{c.t.viewAlerts}</Link>
        </Wrap>
      </div>
    );
  }
  return (
    <Wrap>
      <div className="flex flex-col items-start gap-1.5 border px-4 py-3 sm:flex-row sm:items-center sm:gap-3" style={{ borderColor: '#f6c5c5', background: '#fdeeee', borderRadius: c.d.radius }}>
        <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold" style={{ color: '#c0232c' }}><span aria-hidden>⚠</span> {a.label}</span>
        <span className="w-full min-w-0 text-[13px] text-slate-700 sm:w-auto sm:flex-1">{a.text}</span>
        <Link href="#news" className="text-[12px] font-semibold" style={{ color: '#c0232c' }}>{c.t.viewAlerts}</Link>
      </div>
    </Wrap>
  );
}

function Services({ c, variant }: { c: Ctx; variant: string }) {
  const { s, th, d } = c;
  const head = <SectionHead c={c} title={c.t.iWantTo} more={{ label: c.t.viewServices, href: '/wallet/services' }} />;
  let body: React.ReactNode;
  if (variant === 'list') {
    body = (
      <div className="grid grid-cols-1 border-t md:grid-cols-2 md:gap-x-10" style={{ borderColor: c.rule }}>
        {s.quickServices.map(q => (
          <Link key={q.title} href={q.href ?? '/wallet/services'} className="flex items-center justify-between gap-4 border-b py-4 hover:opacity-80" style={{ borderColor: c.rule }}>
            <span className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: q.color }} aria-hidden />
              <span><span className="block text-[16px] font-semibold" style={{ color: th.ink }}>{q.title}</span><span className="block text-[12px] text-slate-600">{q.subtitle}</span></span>
            </span>
            <span className="text-[18px]" style={{ color: th.primary }} aria-hidden><Fwd /></span>
          </Link>
        ))}
      </div>
    );
  } else if (variant === 'cards') {
    body = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {s.quickServices.map(q => (
          <Link key={q.title} href={q.href ?? '/wallet/services'} className="group border bg-white p-6 shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: c.rule, borderRadius: d.radius }}>
            <span className="grid h-12 w-12 place-items-center text-[20px] text-white" style={{ background: q.color, borderRadius: Math.min(d.radius, 14) }} aria-hidden>{q.icon}</span>
            <div className="mt-4 text-[17px] font-semibold" style={{ color: th.ink }}>{q.title}</div>
            <div className="mt-1 text-[13px] text-slate-600">{q.subtitle}</div>
            <div className="mt-4 text-[12px] font-semibold" style={{ color: th.primary }}><Fwd /></div>
          </Link>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {s.quickServices.map(q => (
          <Link key={q.title} href={q.href ?? '/wallet/services'} className="block border bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: c.rule, borderRadius: d.radius }}>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[18px] text-white" style={{ background: q.color }} aria-hidden>{q.icon}</span>
            <div className="mt-2 text-[13px] font-semibold" style={{ color: th.ink }}>{q.title}</div>
            <div className="text-[11px] text-slate-600">{q.subtitle}</div>
          </Link>
        ))}
      </div>
    );
  }
  return <section id="services" className="scroll-mt-28"><Wrap>{head}{body}</Wrap></section>;
}

function Featured({ c, variant }: { c: Ctx; variant: string }) {
  const { s, th, d } = c;
  const card = (f: PublicSiteShellProps['featured'][number], big = false) => {
    const primary = f.tone === 'primary', amber = f.tone === 'amber';
    const style: React.CSSProperties = primary
      ? { background: `linear-gradient(135deg, ${th.primary}, ${th.accent})`, color: '#fff' }
      : amber ? { background: '#fdf6e3', border: '1px solid #f0e2bf' } : { background: c.card, border: `1px solid ${c.rule}` };
    return (
      <div key={f.title} className={`flex flex-col shadow-sm ${big ? 'p-8' : 'p-5'}`} style={{ ...style, borderRadius: d.radius }}>
        <div className="text-[11px] uppercase tracking-[0.14em]" style={primary ? { opacity: 0.8 } : { color: amber ? '#92600e' : th.inkSoft }}>{f.kicker}</div>
        <div className="mt-2" style={{ ...heading(c, big ? 30 : 19), color: primary ? '#fff' : amber ? '#92600e' : th.ink }}>{f.title}</div>
        <p className={`mt-2 flex-1 ${big ? 'text-[15px]' : 'text-[13px]'}`} style={{ color: primary ? 'rgba(255,255,255,0.9)' : '#475569' }}>{f.body}</p>
        {f.href ? <Link href={f.href} className="mt-4 text-[13px] font-semibold" style={{ color: primary ? '#fff' : amber ? '#92600e' : th.primary }}>{f.cta} <Fwd /></Link> : null}
      </div>
    );
  };
  const [a, b2, c3] = s.featured;
  return (
    <section><Wrap>
      {variant === 'spotlight'
        ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">{card(a, true)}<div className="grid grid-cols-1 gap-4">{card(b2)}{card(c3)}</div></div>
        : <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{card(a)}{card(b2)}{card(c3)}</div>}
    </Wrap></section>
  );
}

function Figures({ c, variant, inRow }: { c: Ctx; variant: string; inRow?: boolean }) {
  const { s, th } = c;
  if (s.statistics.length === 0) return null;
  // Live marker: dark green on light panels, light green on the dark band (both above 4.5:1).
  const live = (x: { live?: boolean }, onDark = false) => (x.live ? <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide" style={{ color: onDark ? '#6ee7b7' : '#0a6e4c' }}><span aria-hidden>●</span> {c.t.live}</div> : null);
  const more = { label: c.t.viewStats, href: '/public' };
  if (variant === 'band') {
    return (
      <section id="statistics" className="scroll-mt-28 py-10" style={{ background: th.ink }}>
        <Wrap>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><h2 style={{ ...heading(c, 22), color: '#fff' }}>{glanceTitle(c)}</h2>{figuresChip(c)}</div>
            <Link href={more.href} className="text-[12px] font-semibold text-white/80 hover:text-white">{more.label}</Link>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-7">
            {s.statistics.map(x => (
              <div key={x.label}>
                <div className="text-[30px] font-semibold tabular-nums text-white" style={{ fontFamily: c.d.display }}>{x.value}</div>
                <div className="text-[12px] text-white/80">{x.label}</div>
                <div className="text-[10px] text-white/50">{x.sub}</div>
                {live(x, true)}
              </div>
            ))}
          </div>
        </Wrap>
      </section>
    );
  }
  if (variant === 'ledger') {
    const table = (
      <Card c={c} id="statistics">
        <SectionHead c={c} title={glanceTitle(c)} chip={figuresChip(c)} more={more} size={19} />
        <table className="w-full text-[13px]">
          <tbody>
            {s.statistics.map(x => (
              <tr key={x.label} className="border-t" style={{ borderColor: c.rule }}>
                <td className="py-2.5 pe-3 text-slate-600">{x.label}<div className="text-[10px] text-slate-600">{x.sub}</div></td>
                <td className="py-2.5 text-end text-[17px] font-semibold tabular-nums" style={{ color: th.ink, fontFamily: c.d.display }}>{x.value}{live(x)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
    return inRow ? table : <section><Wrap>{table}</Wrap></section>;
  }
  return (
    <section id="statistics" className="scroll-mt-28"><Wrap>
      <SectionHead c={c} title={glanceTitle(c)} chip={figuresChip(c)} more={more} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {s.statistics.map(x => (
          <div key={x.label} className="border bg-white p-3 shadow-sm" style={{ borderColor: c.rule, borderRadius: c.d.radius }}>
            <div className="text-[20px] font-bold tabular-nums" style={{ color: th.ink, fontFamily: c.d.display }}>{x.value}</div>
            <div className="text-[11px] font-medium text-slate-600">{x.label}</div>
            <div className="text-[9px] text-slate-600">{x.sub}</div>
            {live(x)}
          </div>
        ))}
      </div>
    </Wrap></section>
  );
}

function News({ c, variant, inRow }: { c: Ctx; variant: string; inRow?: boolean }) {
  const { s, th } = c;
  const thumb = (size: string) => <div className={`${size} shrink-0`} style={{ background: `linear-gradient(135deg, ${th.surfaceMute}, ${th.primary})`, borderRadius: Math.min(c.d.radius, 10) }} aria-hidden />;
  let body: React.ReactNode;
  if (variant === 'lead' && s.news.length > 0) {
    const [first, ...rest] = s.news;
    body = (
      <div>
        <div className="flex flex-col gap-4 sm:flex-row">
          {thumb('h-32 w-full sm:w-48')}
          <div>
            <div style={heading(c, 20)}>{newsTitle(first!, {})}</div>
            <p className="mt-1 text-[13px] text-slate-600">{first!.summary}</p>
            {first!.date ? <div className="mt-1 text-[11px] text-slate-600">{first!.date}</div> : null}
          </div>
        </div>
        <ul className="mt-4 divide-y border-t" style={{ borderColor: c.rule }}>
          {rest.map(n => (
            <li key={n.title} className="py-3" style={{ borderColor: c.rule }}>
              <div className="text-[14px] font-semibold">{newsTitle(n, { color: th.ink })}</div>
              <div className="text-[12px] text-slate-600">{n.summary}</div>
              {n.date ? <div className="text-[11px] text-slate-600">{n.date}</div> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (variant === 'timeline') {
    body = (
      <ol className="relative ms-2 border-s-2 ps-5" style={{ borderColor: th.primary }}>
        {s.news.map(n => (
          <li key={n.title} className="relative pb-5 last:pb-0">
            <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: th.primary }} aria-hidden />
            <div className="text-[14px] font-semibold">{newsTitle(n, { color: th.ink })}</div>
            <div className="text-[12px] text-slate-600">{n.summary}</div>
            {n.date ? <div className="text-[11px] text-slate-600">{n.date}</div> : null}
          </li>
        ))}
      </ol>
    );
  } else {
    body = (
      <div className="space-y-3">
        {s.news.map(n => (
          <div key={n.title} className="flex gap-3">
            {thumb('h-14 w-16')}
            <div>
              <div className="text-[13px] font-semibold">{newsTitle(n, { color: th.ink })}</div>
              <div className="text-[11px] text-slate-600">{n.summary}</div>
              {n.date ? <div className="text-[10px] text-slate-600">{n.date}</div> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const card = (
    <Card c={c} id="news">
      <SectionHead c={c} title={c.t.latestNews} chip={newsChip(c)} size={19} />
      {body}
    </Card>
  );
  return inRow ? card : <section><Wrap>{card}</Wrap></section>;
}

function Programmes({ c, variant, inRow }: { c: Ctx; variant: string; inRow?: boolean }) {
  const { s, th, d } = c;
  if (variant === 'grid') {
    return (
      <section id="programmes" className="scroll-mt-28"><Wrap>
        <SectionHead c={c} title={c.t.ourInitiatives} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {s.initiatives.map(it => (
            <div key={it.title} className="border bg-white p-6 shadow-sm" style={{ borderColor: c.rule, borderRadius: d.radius, borderTop: `4px solid ${th.primary}` }}>
              <div style={heading(c, 18)}>{it.title}</div>
              <p className="mt-2 text-[13px] text-slate-600">{it.body}</p>
            </div>
          ))}
        </div>
      </Wrap></section>
    );
  }
  const card = (
    <Card c={c} id="programmes">
      <SectionHead c={c} title={c.t.ourInitiatives} size={19} />
      <div className="space-y-3">
        {s.initiatives.map(it => (
          <div key={it.title} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px]" style={{ background: th.surfaceMute, color: th.primary }} aria-hidden>✦</span>
            <div><div className="text-[13px] font-semibold" style={{ color: th.ink }}>{it.title}</div><div className="text-[12px] text-slate-600">{it.body}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
  return inRow ? card : <section><Wrap>{card}</Wrap></section>;
}

function Contact({ c, variant, inRow }: { c: Ctx; variant: string; inRow?: boolean }) {
  const { s, th, t } = c;
  const loc = s.locator;
  const card = (
    <Card c={c} id="contact">
      <SectionHead c={c} title={loc?.title ?? t.contact} size={19} />
      {loc ? (
        <>
          <LocatorPanel text={t.locator} data={s.locations} institution={s.institution.name} placeholder={loc.placeholder} tabs={loc.tabs} pinLabel={loc.pinLabel}
            theme={{ primary: th.primary, ink: th.ink, line: c.rule, surfaceMute: th.surfaceMute }} radius={c.d.radius} tabStyle={variant === 'panel' ? 'panel' : 'chips'} order="tabs-first" />
        </>
      ) : null}
      <p className="mt-3 text-[12px] text-slate-600">{t.contactText}</p>
      <Link href="/wallet/inbox" className="mt-3 block w-full py-2 text-center text-[12px] font-semibold text-white" style={{ background: th.primary, borderRadius: c.d.radius }}>{t.contactUs}</Link>
    </Card>
  );
  return inRow ? card : <section><Wrap>{card}</Wrap></section>;
}

function Shortcuts({ c, variant, inRow }: { c: Ctx; variant: string; inRow?: boolean }) {
  const { s, th } = c;
  const item = (x: PublicSiteShellProps['shortcuts'][number]) => (
    <Link key={x.title} href={x.href ?? s.institution.href} className="flex gap-3 hover:opacity-80">
      <span className="grid h-9 w-9 shrink-0 place-items-center text-[14px]" style={{ background: th.surfaceMute, color: th.primary, borderRadius: Math.min(c.d.radius, 8) }} aria-hidden>▣</span>
      <span><span className="block text-[13px] font-bold" style={{ color: th.ink }}>{x.title}</span><span className="block text-[11px] text-slate-600">{x.subtitle}</span></span>
    </Link>
  );
  if (variant === 'columns') {
    const card = <Card c={c}><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{s.shortcuts.map(item)}</div></Card>;
    return inRow ? card : <section><Wrap>{card}</Wrap></section>;
  }
  return (
    <section><Wrap>
      <div className="grid grid-cols-2 gap-4 border px-5 py-6 shadow-sm lg:grid-cols-4" style={{ borderColor: c.rule, background: th.surfaceMute, borderRadius: c.d.radius }}>
        {s.shortcuts.map(item)}
      </div>
    </Wrap></section>
  );
}

/** The nation's own emergency numbers (only those set in setup), as tap-to-call links. */
function EmergencyNumbers({ c }: { c: Ctx }) {
  const list = nationEmergencyContacts();
  if (list.length === 0) return null;
  const label: Record<string, string> = { general: 'Emergency', police: 'Police', fire: 'Fire', ambulance: 'Ambulance' };
  return (
    <section><Wrap>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.map(e => (
          <a key={e.kind} href={`tel:${e.number.replace(/[\s-]/g, '')}`} className="flex items-center justify-between border bg-white px-4 py-3 shadow-sm" style={{ borderColor: c.rule, borderRadius: c.d.radius }}>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{label[e.kind]}</span>
            <span className="text-[22px] font-bold tabular-nums" style={{ color: c.th.emergencyA, fontFamily: c.d.display }}>{e.number}</span>
          </a>
        ))}
      </div>
    </Wrap></section>
  );
}

function Block({ c, r, inRow }: { c: Ctx; r: BlockRef; inRow?: boolean }) {
  switch (r.block) {
    case 'hero': return <Hero c={c} variant={r.variant} />;
    case 'alert': return <Alert c={c} variant={r.variant} />;
    case 'services': return <Services c={c} variant={r.variant} />;
    case 'featured': return <Featured c={c} variant={r.variant} />;
    case 'figures': return <Figures c={c} variant={r.variant} inRow={inRow} />;
    case 'news': return <News c={c} variant={r.variant} inRow={inRow} />;
    case 'programmes': return <Programmes c={c} variant={r.variant} inRow={inRow} />;
    case 'contact': return <Contact c={c} variant={r.variant} inRow={inRow} />;
    case 'shortcuts': return <Shortcuts c={c} variant={r.variant} inRow={inRow} />;
    case 'emergencyNumbers': return <EmergencyNumbers c={c} />;
  }
}

function ComposedSite({ site, preset, extra }: { site: PublicSiteShellProps; preset: Preset; extra?: React.ReactNode }) {
  const sober = preset.design.palette === 'sober';
  const c: Ctx = {
    s: site, th: site.theme, d: preset.design, t: siteMessages(site.locale),
    bg: sober ? '#f6f5f1' : site.theme.surface,
    card: '#ffffff',
    rule: sober ? '#e2ded4' : site.theme.line,
  };
  return (
    <Frame c={c}>
      {preset.layout.map((row, i) => Array.isArray(row) ? (
        <section key={i}><Wrap>
          <div className={`grid grid-cols-1 gap-4 ${row.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {row.map(r => <Block key={r.block} c={c} r={r} inRow />)}
          </div>
        </Wrap></section>
      ) : <Block key={i} c={c} r={row} />)}
      {extra}
    </Frame>
  );
}
