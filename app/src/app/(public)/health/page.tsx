// Public — Ministry of Health homepage. Official public-facing national
// healthcare portal (light, institutional, navy/blue/green). Distinct from
// the dark operational app. Server component: SSR-safe, deterministic,
// fully responsive, accessible. Imagery = clinical gradient placeholders.
//
// The design is the Health sector's own preset ("Care — Ministry Portal");
// its content comes from the Health record (lib/public-sites/content/health.ts).
// ?preset=care-finder or civic-standard shows the alternatives.

import Link from 'next/link';
import { publicHealthSite } from '@/lib/gov/health-operations';
import { siteMessages, nationLocale } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';
import { SampleChip, SourceChip, type PublicSiteShellProps, type PublicSiteLinkItem } from '@/apps/_shared/public/PublicSiteShell';
import { PublicSite, presetFor } from '@/apps/_shared/public/PublicSite';
import { siteProps, siteRequest } from '@/apps/_shared/public/site-props';
import { GatewayBar, LanguageSwitch, SiteLogo, NewsletterForm, SkipLink, PreviewBanner, SiteSchema, Fwd } from '@/apps/_shared/public/integration';
import { FontSizeControls } from '@/apps/_shared/public/controls';
import { siteLocations } from '@/apps/_shared/public/locator-data';
import { LocatorPanel } from '@/apps/_shared/public/LocatorPanel';
import { effectiveContent } from '@/lib/public-sites/effective';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Health — Official Portal' };

const NAVY = '#0b1f3a';
const BLUE = '#1f5fad';
const GREEN = '#0c8159'; // readable at 4.5:1 on white (WCAG AA)
const LINE = '#e5e7eb';

const THEME = {
  ink: NAVY, inkSoft: '#10325c', primary: BLUE, accent: GREEN,
  surface: '#f4f6f9', surfaceMute: '#eef4fb', line: LINE,
  emergencyA: '#d62b34', emergencyB: '#b81f27',
};
const ART = (
  <div className="h-full w-full rounded-2xl" role="img" aria-label="A healthy family — father, mother, son and daughter — outdoors"
    style={{ background: 'linear-gradient(135deg,#9fc1e8,#1f5fad 70%)', boxShadow: '0 20px 50px rgba(11,31,58,0.22)' }} />
);
// Sample surveillance counts shown in the Health design's surveillance card.
const SURVEILLANCE = [['New Cases', '248'], ['Active Cases', '1,286'], ['Recovered', '98,523'], ['Deaths', '1,235']];

const label = (i: PublicSiteLinkItem) => (typeof i === 'string' ? i : i.label);
const href = (i: PublicSiteLinkItem) => (typeof i === 'string' ? '/health' : i.href);

export default async function PublicHealthHomepage(props: { searchParams?: Promise<{ preset?: string; preview?: string }> }) {
  const searchParams = await props.searchParams;
  const s = publicHealthSite(100); // deterministic, SSR-stable
  const live = {
    healthAlert: s.emergencyBanner.active ? s.emergencyBanner.text : 'No national health emergency is in effect. Follow the advisories from your regional health authority.',
  };
  const preview = searchParams?.preview;
  const preset = presetFor('health', searchParams?.preset ?? (preview ? effectiveContent('health', preview).previewPreset ?? undefined : undefined));
  if (!preset.bespoke) return <PublicSite id="health" request={await siteRequest()} theme={THEME} preset={preset.id} preview={preview} live={live} illustration={ART} />;
  return <HealthPortal site={siteProps('health', { theme: THEME, illustration: ART, live, preview, request: await siteRequest() })} />;
}

function HealthPortal({ site }: { site: PublicSiteShellProps }) {
  // Fixed site wording in the visitor's language among the nation's (lib/i18n `site`).
  const t = siteMessages(site.locale);
  const { institution: inst, hero, alert, quickServices, featured, statistics, news, initiatives, locator, shortcuts, footerSections, newsletter } = site;
  const [l1, l2] = hero.headlineLines ?? ['', ''];
  const note = fill(t.sampleNote, { name: inst.name });
  const [campaign, surveillance, advisory] = featured;

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1a2332]" lang={site.lang} dir={site.dir} data-site-root="">
      <SkipLink label={t.skipMain} />
      <PreviewBanner on={site.preview} />
      {/* 1. Top utility bar */}
      <section lang={site.locale} aria-label={fill(t.officialWebsite, { name: inst.name })} className="w-full text-[12px] text-white/85" style={{ background: `linear-gradient(90deg,${NAVY},#10325c)` }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2">
          <div className="flex items-center gap-4">
            <span>{fill(t.officialWebsite, { name: inst.name })}</span>
            <Link href="/government" className="hidden border-s border-white/20 ps-4 hover:text-white sm:inline">{t.allInstitutions}</Link>
            <Link href="/portal" className="hidden hover:text-white sm:inline">{t.citizenPortal}</Link>
            <Link href="/noc" className="hidden hover:text-white sm:inline">{t.liveBriefing}</Link>
          </div>
          <div className="flex items-center gap-4">
            <FontSizeControls up={t.fontUp} normal={t.fontNormal} down={t.fontDown} />
            <LanguageSwitch current={site.locale ?? nationLocale()} languages={site.languages} path={site.institution.href} label={t.languageLabel} />
          </div>
        </div>
      </section>

      {/* 2. Header / navbar */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-3">
          <Link href={inst.href} className="flex items-center gap-3">
            {inst.logo ? <SiteLogo logo={inst.logo} size={44} /> : <span className="grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold text-white" style={{ background: NAVY }} aria-hidden>{inst.crest}</span>}
            <div className="leading-tight">
              <div className="text-[18px] font-bold tracking-tight" style={{ color: NAVY }}>{inst.name}</div>
              <div className="text-[11px] text-slate-600">{inst.tagline}</div>
            </div>
          </Link>
          <nav className="mx-auto hidden items-center gap-7 text-[14px] font-medium text-slate-600 lg:flex">
            {site.nav.map(n => (
              <Link key={n.label} href={n.href} className={n.active ? 'relative font-semibold' : 'hover:text-slate-900'} style={n.active ? { color: BLUE } : undefined}>
                {n.label}{n.active ? <span className="absolute -bottom-[15px] start-0 h-0.5 w-full" style={{ background: BLUE }} /> : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href={`/search?site=${inst.href.slice(1)}`} aria-label={t.search} className="grid h-8 w-8 place-items-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"><span aria-hidden>⌕</span></Link>
            {inst.emergencyButton ? (
              <Link href="#contact" className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(90deg,#d62b34,#b81f27)' }}>
                <span aria-hidden>{inst.emergencyButton.icon}</span> {inst.emergencyButton.label}
              </Link>
            ) : null}
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t px-4 py-2 text-[13px] font-medium lg:hidden" style={{ borderColor: LINE }} aria-label={`${inst.name} menu`}>
          {site.nav.map(n => <Link key={n.label} href={n.href} className="shrink-0 whitespace-nowrap" style={{ color: n.active ? BLUE : '#475569' }}>{n.label}</Link>)}
        </nav>
      </header>
      <GatewayBar gateway={site.gateway} name={inst.name} accent={BLUE} locale={site.locale} />
      <main id="main">
      <SiteSchema name={inst.name} description={inst.tagline} gateway={site.gateway} url={site.url} lang={site.lang} emergency={inst.emergencyButton?.label} />

      {/* 3. Hero */}
      <section style={{ background: 'linear-gradient(110deg,#ffffff,#eef3fa 55%,#e3edf7)' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-6 px-6 py-12 lg:grid-cols-[1.05fr_1fr_0.7fr]">
          <div>
            <h1 className="text-[44px] font-extrabold leading-[1.08]">
              <span style={{ color: NAVY }}>{l1}</span><br />
              <span style={{ color: GREEN }}>{l2}</span>
            </h1>
            <p className="mt-3 max-w-sm text-[15px] text-slate-600">{hero.subhead}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={hero.primaryCta.href ?? '#services'} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white" style={{ background: BLUE }}><span aria-hidden>{hero.primaryCta.icon}</span> {hero.primaryCta.label}</Link>
              <Link href={hero.secondaryCta.href ?? '#contact'} className="flex items-center gap-2 rounded-lg border bg-white px-5 py-2.5 text-[13px] font-semibold" style={{ borderColor: LINE, color: NAVY }}><span aria-hidden>{hero.secondaryCta.icon}</span> {hero.secondaryCta.label}</Link>
            </div>
          </div>
          <div className="h-[280px] w-full">{hero.illustration}</div>
          {hero.sideNote ? (
            <div className="rounded-2xl border bg-white p-5 shadow-lg" style={{ borderColor: LINE }}>
              <span className="grid h-12 w-12 place-items-center rounded-full text-[18px]" style={{ background: '#fdecec', color: '#c0232c' }} aria-hidden>{hero.sideNote.icon}</span>
              <div className="mt-3 text-[16px] font-bold leading-snug" style={{ color: NAVY }}>{hero.sideNote.title}</div>
              <p className="mt-1 text-[12px] text-slate-600">{hero.sideNote.body}</p>
              <Link href={hero.sideNote.href ?? '#programmes'} className="mt-3 inline-block text-[12px] font-semibold" style={{ color: BLUE }}>{hero.sideNote.cta} <Fwd /></Link>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-10 px-6 py-8">
        {/* 4. Health alert banner (live from the health-operations engine) */}
        {alert ? (
          <div className="flex flex-col items-start gap-1.5 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-3" style={{ borderColor: '#f6c5c5', background: '#fdeeee' }}>
            <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold" style={{ color: '#c0232c' }}><span aria-hidden>⚠</span> {alert.label}</span>
            <span className="w-full min-w-0 text-[13px] text-slate-700 sm:w-auto sm:flex-1">{alert.text}</span>
            <Link href="#news" className="text-[12px] font-semibold" style={{ color: '#c0232c' }}>{t.viewAlerts}</Link>
          </div>
        ) : null}

        {/* 5. Citizen quick services */}
        <section id="services" className="scroll-mt-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY }}>{t.iWantTo}</h2>
            <Link href="/health/laboratory" className="text-[12px] font-semibold" style={{ color: BLUE }}>{t.viewServices}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickServices.map(q => (
              <Link key={q.title} href={q.href ?? '/wallet/services'} className="block rounded-xl border bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: LINE }}>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[18px] text-white" style={{ background: q.color }} aria-hidden>{q.icon}</span>
                <div className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>{q.title}</div>
                <div className="text-[11px] text-slate-600">{q.subtitle}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 6. Featured cards: campaign, surveillance, seasonal advisory */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: `linear-gradient(135deg,${GREEN},#0b6e8c)` }}>
            <div className="text-[11px] uppercase tracking-wide opacity-80">{campaign.kicker}</div>
            <div className="mt-1 text-[18px] font-bold">{campaign.title}</div>
            <p className="mt-1 text-[12px] opacity-90">{campaign.body}</p>
            <Link href={campaign.href ?? '#services'} className="mt-3 inline-block rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">{campaign.cta} <Fwd /></Link>
          </div>
          <div className="rounded-2xl border bg-[#eef4fb] p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[15px] font-bold" style={{ color: NAVY }}>{surveillance.title}</div>
              <SampleChip label={t.sampleFigures} note={note} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {SURVEILLANCE.map(([l, n]) => (
                <div key={l}><div className="text-[16px] font-bold" style={{ color: NAVY }}>{n}</div><div className="text-[9px] text-slate-600">{l}</div></div>
              ))}
            </div>
            <Link href={surveillance.href ?? '/public'} className="mt-3 inline-block text-[12px] font-semibold" style={{ color: BLUE }}>{surveillance.cta} <Fwd /></Link>
          </div>
          <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#f0e2bf', background: '#fdf6e3' }}>
            <div className="text-[11px] uppercase tracking-wide text-amber-700">{advisory.kicker}</div>
            <div className="mt-1 text-[18px] font-bold" style={{ color: '#92600e' }}>{advisory.title}</div>
            <p className="mt-1 text-[12px] text-amber-800">{advisory.body}</p>
            <Link href={advisory.href ?? '#news'} className="mt-3 inline-block text-[12px] font-semibold" style={{ color: '#92600e' }}>{advisory.cta} <Fwd /></Link>
          </div>
        </div>

        {/* 7. Health at a glance */}
        <section id="statistics" className="scroll-mt-24">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold" style={{ color: NAVY }}>{fill(t.atGlance, { name: inst.name.replace('Ministry of ', '') })}</h2>
              {site.statisticsSample ? <SampleChip label={t.sampleFigures} note={note} /> : null}
            </div>
            <Link href="/public" className="text-[12px] font-semibold" style={{ color: BLUE }}>{t.viewStats}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {statistics.map(x => (
              <div key={x.label} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: LINE }}>
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[12px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>◆</span>
                <div className="mt-1.5 text-[18px] font-bold" style={{ color: NAVY }}>{x.value}</div>
                <div className="text-[11px] font-medium text-slate-600">{x.label}</div>
                <div className="text-[9px] text-slate-600">{x.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. News + initiatives + facilities */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div id="news" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>{t.latestNews}</h3>{site.newsSample ? <SampleChip label={t.sampleNews} note={note} /> : site.newsFrom ? <SourceChip label={fill(t.fromSite, { host: site.newsFrom })} /> : null}</div><span className="text-[11px] font-semibold" style={{ color: BLUE }}>{t.viewNews}</span></div>
            <div className="space-y-3">
              {news.map(n => (
                <div key={n.title} className="flex gap-3">
                  <div className="h-14 w-16 shrink-0 rounded-lg" style={{ background: 'linear-gradient(135deg,#cfe0f3,#1f5fad)' }} aria-hidden />
                  <div>{n.url ? <a href={n.url} rel="noopener" className="text-[12px] font-semibold hover:underline" style={{ color: NAVY }}>{n.title} ↗</a> : <div className="text-[12px] font-semibold" style={{ color: NAVY }}>{n.title}</div>}<div className="text-[10px] text-slate-600">{n.summary}</div>{n.date ? <div className="text-[9px] text-slate-600">{n.date}</div> : null}</div>
                </div>
              ))}
            </div>
          </div>
          <div id="programmes" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>{t.ourInitiatives}</h3><span className="text-[11px] font-semibold" style={{ color: BLUE }}>{t.viewPrograms}</span></div>
            <div className="space-y-3">
              {initiatives.map(i => (
                <div key={i.title} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>✚</span>
                  <div><div className="text-[12px] font-semibold" style={{ color: NAVY }}>{i.title}</div><div className="text-[10px] text-slate-600">{i.body}</div></div>
                </div>
              ))}
            </div>
            <button type="button" disabled title={t.notAvailable} className="mt-3 w-full cursor-not-allowed rounded-md border py-1.5 text-[11px] font-semibold opacity-70" style={{ borderColor: BLUE, color: BLUE }}>{t.allPrograms}<span className="sr-only"> ({t.notAvailable})</span></button>
          </div>
          <div id="contact" className="scroll-mt-24 rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>{locator?.title ?? t.contact}</h3><span className="text-[11px] font-semibold" style={{ color: BLUE }}>{t.viewMap}</span></div>
            {locator ? (
              <>
                <LocatorPanel text={t.locator} data={siteLocations('health', locator.tabs)} institution={inst.name} placeholder={locator.placeholder} tabs={locator.tabs} pinLabel={locator.pinLabel}
                  theme={{ primary: BLUE, ink: NAVY, line: LINE, surfaceMute: THEME.surfaceMute }} radius={8} tabStyle="chips" order="map-first" />
              </>
            ) : <p className="text-[12px] text-slate-600">{t.contactText}</p>}
          </div>
        </div>

        {/* 9. Service shortcut strip */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border bg-[#eef4fb] px-5 py-6 shadow-sm lg:grid-cols-4" style={{ borderColor: LINE }}>
          {shortcuts.map(x => (
            <Link key={x.title} href={x.href ?? '/health'} className="flex gap-3 hover:opacity-80">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px]" style={{ background: '#dbe8fb', color: BLUE }} aria-hidden>▣</span>
              <div><div className="text-[12px] font-bold" style={{ color: NAVY }}>{x.title}</div><div className="text-[10px] text-slate-600">{x.subtitle}</div></div>
            </Link>
          ))}
        </div>
      </div>

      </main>

      {/* 10. Large footer */}

      <footer id="about" className="text-white/80" style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-bold text-white"><span aria-hidden>{inst.crest}</span> {inst.name}</div>
            <p className="mt-2 text-[11px] text-white/60">{inst.about ?? inst.tagline}</p>
            <div className="mt-3 flex gap-3 text-white/60">{['f', '𝕏', '▶', '◎', 'in'].map(x => <span key={x} aria-hidden>{x}</span>)}</div>
          </div>
          {footerSections.map(sec => (
            <div key={sec.heading}>
              <div className="text-[13px] font-semibold text-white">{sec.heading}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-white/60">{sec.items.map(i => <li key={label(i)}><Link href={href(i)} className="hover:text-white">{label(i)}</Link></li>)}</ul>
            </div>
          ))}
          <div>
            <div className="text-[13px] font-semibold text-white">{newsletter.heading}</div>
            <p className="mt-1 text-[11px] text-white/60">{newsletter.body}</p>
            <NewsletterForm site={inst.href.slice(1)} note={t.subscribeNote} noteClassName="text-white/60">
              <input type="email" name="email" required autoComplete="email" placeholder={t.enterEmail} aria-label={t.email} className="min-w-0 flex-1 rounded-s-md px-2 py-1.5 text-[12px] text-slate-800" />
              <button type="submit" className="rounded-e-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: BLUE }}>{t.subscribe}</button>
            </NewsletterForm>
          </div>
        </div>
        {/* 11. Bottom legal */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[12px] text-white/60">
            <span>{site.legalLine}</span>
            <div className="flex gap-4">{site.legalLinks.map(l => <Link key={label(l)} href={href(l)} className="hover:text-white">{label(l)}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
