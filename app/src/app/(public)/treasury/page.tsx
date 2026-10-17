// Public — Ministry of Treasury & Finance homepage. Official public-facing
// sovereign-finance portal (light, institutional: warm white, navy, gold,
// emerald). Distinct from the dark operational command app. Server
// component: SSR-safe, deterministic, responsive, accessible. Imagery =
// gradient + inline classical-architecture motif (no external asset).
//
// The design is the Finance sector's own preset ("Finance — Treasury"); its
// content comes from the Treasury record (lib/public-sites/content/treasury.ts),
// its fiscal panels from the treasury engine. ?preset=finance-ledger or
// civic-standard shows the alternatives.

import Link from 'next/link';
import { publicTreasurySite } from '@/lib/gov/treasury-systems';
import { nationMessages, nationInsignia, nationLocale } from '@/lib/nation/registry';
import { locales } from '@/lib/i18n/config';
import { SampleChip, SourceChip, type PublicSiteShellProps, type PublicSiteLinkItem } from '@/apps/_shared/public/PublicSiteShell';
import { PublicSite, presetFor } from '@/apps/_shared/public/PublicSite';
import { siteProps } from '@/apps/_shared/public/site-props';
import { GatewayBar, SkipLink, PreviewBanner, SiteSchema, Fwd } from '@/apps/_shared/public/integration';
import { FontSizeControls } from '@/apps/_shared/public/controls';
import { effectiveContent } from '@/lib/public-sites/effective';
import { t as fill } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Treasury & Finance — Official Portal' };

const NAVY = '#16233d';
// Gold and green carry text, so they are the darkest shade of the brand colours that reads at 4.5:1 on white (WCAG AA).
const GOLD = '#8a6827';
const GOLD2 = '#c9a24a';
const GREEN = '#1a8152';
const INK = '#23303f';
const SOFT = '#5b6b78';
const LINE = '#e8e3d6';
const SERIF = 'Georgia, "Times New Roman", "Noto Naskh Arabic", ui-serif, serif';

const PILLAR_GLYPHS = ['⌘', '◴', '▤', '⊟', '⊡', '✦'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
// Design chrome of the Treasury preset (not institution content).
const UTILITY = [
  { label: 'Careers', href: '/treasury#about' }, { label: 'Publications', href: '/public' },
  { label: 'Transparency', href: '/public' }, { label: 'Contact', href: '/wallet/inbox' },
];
const KICKER = 'National Treasury Command';
const MOTTO = 'Sovereignty · Stability · Prosperity';

const THEME = {
  ink: NAVY, inkSoft: '#23303f', primary: GOLD, accent: GREEN,
  surface: '#faf8f1', surfaceMute: '#f3efe2', line: LINE,
  emergencyA: '#b23a3a', emergencyB: '#8f2c2c',
};
const ART = <div className="relative h-full w-full overflow-hidden rounded-2xl"><TreasuryBuilding /></div>;

const SEG_C = [GREEN, '#2bb377', GOLD2, GOLD, '#caa75a', '#cfd2cb'];

function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="none" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.5" />
      <line x1="24" y1="11" x2="24" y2="35" stroke={GOLD} strokeWidth="1.6" />
      <line x1="12" y1="16" x2="36" y2="16" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="24" cy="11" r="2.2" fill={GOLD} />
      <path d="M12 16 L8 25 Q12 28.5 16 25 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <path d="M36 16 L32 25 Q36 28.5 40 25 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <path d="M18 35 H30 L32 39 H16 Z" fill={GOLD} />
    </svg>
  );
}

// Bright photographic-style classical treasury building (gradient + SVG).
function TreasuryBuilding() {
  return (
    <div className="absolute inset-0" aria-hidden
      style={{ background: 'linear-gradient(120deg,#ffffff 0%,#fbfaf5 38%,#eaeef3 60%,#dfe7ef 100%)' }}>
      <svg viewBox="0 0 520 400" preserveAspectRatio="xMaxYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8e6f2" /><stop offset="1" stopColor="#eef3f7" />
          </linearGradient>
          <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f1e8" /><stop offset="1" stopColor="#d8d2c2" />
          </linearGradient>
        </defs>
        <rect x="180" width="340" height="400" fill="url(#sky)" />
        <rect x="220" y="300" width="300" height="100" fill="#cfd8c9" opacity="0.6" />
        {/* dome */}
        <ellipse cx="360" cy="120" rx="34" ry="40" fill="url(#stone)" />
        <rect x="356" y="74" width="8" height="16" fill={GOLD} opacity="0.7" />
        {/* pediment */}
        <polygon points="360,150 446,196 274,196" fill="url(#stone)" />
        <polygon points="360,158 432,196 288,196" fill="none" stroke="#c3bba6" strokeWidth="1.2" />
        {/* entablature */}
        <rect x="266" y="196" width="188" height="14" fill="url(#stone)" />
        {/* colonnade */}
        {[280, 300, 320, 340, 360, 380, 400, 420, 440].map(x => (
          <rect key={x} x={x} y="210" width="11" height="120" fill="url(#stone)" stroke="#cfc7b2" strokeWidth="0.6" />
        ))}
        {/* steps + base */}
        <rect x="262" y="330" width="200" height="10" fill="#e3ddcd" />
        <rect x="252" y="340" width="220" height="10" fill="#d7d0bd" />
        <rect x="242" y="350" width="240" height="14" fill="#cbc4b0" />
      </svg>
    </div>
  );
}

function BudgetDonut({ segments, total, size = 188 }: {
  segments: { label: string; amount: string; pct: number }[]; total: string; size?: number;
}) {
  const sum = segments.reduce((s, x) => s + x.pct, 0) || 1;
  const r = size / 2 - 16, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceae1" strokeWidth="20" />
        {segments.map((s, i) => {
          const frac = s.pct / sum;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={SEG_C[i % SEG_C.length]} strokeWidth="20"
              strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          acc += frac;
          return el;
        })}
        <circle cx={size / 2} cy={size / 2} r={r - 18} fill="#fff" />
        <text x="50%" y="46%" textAnchor="middle" fontSize="10" fill={SOFT}
          className="uppercase" style={{ letterSpacing: '0.14em' }}>Total Budget</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="21" fontWeight="700"
          fill={NAVY} style={{ fontFamily: SERIF }}>{total}</text>
      </svg>
      <div className="min-w-[210px] flex-1 space-y-2">
        {segments.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SEG_C[i % SEG_C.length] }} />
            <span style={{ color: INK }}>{s.label}</span>
            <span className="ms-auto font-semibold tabular-nums" style={{ color: NAVY }}>{s.amount}</span>
            <span className="w-9 text-end tabular-nums" style={{ color: SOFT }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicTreasuryHomepage({ searchParams }: { searchParams?: { preset?: string; preview?: string } }) {
  const preview = searchParams?.preview;
  const preset = presetFor('treasury', searchParams?.preset ?? (preview ? effectiveContent('treasury', preview).previewPreset ?? undefined : undefined));
  if (!preset.bespoke) return <PublicSite id="treasury" theme={THEME} preset={preset.id} preview={preview} illustration={ART} />;
  return <TreasuryPortal site={siteProps('treasury', { theme: THEME, illustration: ART, preview })} />;
}

const label = (i: PublicSiteLinkItem) => (typeof i === 'string' ? i : i.label);
const href = (i: PublicSiteLinkItem) => (typeof i === 'string' ? '/treasury' : i.href);

function TreasuryPortal({ site }: { site: PublicSiteShellProps }) {
  const s = publicTreasurySite(100); // deterministic, SSR-stable
  // Fixed site wording in the nation's language (lib/i18n `site`).
  const t = nationMessages().site;
  const language = locales.find(l => l.code === nationLocale())?.name ?? 'English';
  const inst = site.institution;
  const note = fill(t.sampleNote, { name: inst.name });
  const shortName = inst.name.replace(/^Ministry of /, '');
  const insignia = nationInsignia();
  const emblem = (size: number) => (insignia
    ? <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, border: `1.5px solid ${GOLD}`, color: GOLD, fontFamily: SERIF, fontSize: size * 0.34 }} title={insignia.name} aria-hidden>{insignia.seal}</span>
    : <Crest size={size} />);
  const [l1, l2] = site.hero.headlineLines ?? ['', ''];
  const [snapshot, budget, markets] = site.featured;
  const half = Math.ceil(site.shortcuts.length / 2);

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', color: INK }} lang={site.lang} dir={site.dir} data-site-root="">
      <SkipLink label={t.skipMain} />
      <PreviewBanner on={site.preview} />
      {/* 0. Official banner — the same on every public site. */}
      <section aria-label={fill(t.officialWebsite, { name: inst.name })} className="w-full text-[12px] text-white/85" style={{ background: NAVY }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2">
          <div className="flex items-center gap-4">
            <span>{fill(t.officialWebsite, { name: inst.name })}</span>
            <Link href="/government" className="hidden border-s border-white/20 ps-4 hover:text-white sm:inline">{t.allInstitutions}</Link>
            <Link href="/portal" className="hidden hover:text-white sm:inline">{t.citizenPortal}</Link>
            <Link href="/noc" className="hidden hover:text-white sm:inline">{t.liveBriefing}</Link>
          </div>
          <div className="flex items-center gap-4">
            <FontSizeControls up={t.fontUp} normal={t.fontNormal} down={t.fontDown} />
            <span>{language} ▾</span>
          </div>
        </div>
      </section>

      {/* 1. Header */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <Link href={inst.href} className="flex items-center gap-3">
            {emblem(44)}
            <div className="leading-tight">
              {shortName !== inst.name ? <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Ministry of</div> : null}
              <div className="text-[22px] font-bold leading-none tracking-tight" style={{ color: NAVY, fontFamily: SERIF }}>{shortName}</div>
              <div className="mt-1 text-[8.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>{inst.tagline}</div>
            </div>
          </Link>
          <nav className="ms-auto hidden items-center gap-6 text-[13px] font-medium lg:flex" style={{ color: SOFT }}>
            {UTILITY.map(l => <Link key={l.label} href={l.href} className="hover:text-slate-900">{l.label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2" style={{ borderColor: LINE, color: SOFT }}>
              <span aria-hidden>⌕</span>
              <input aria-label={t.search} placeholder={`${t.search}…`} className="w-28 bg-transparent outline-none placeholder:text-slate-500" />
            </label>
            <Link href="/gov/treasury" className="flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold text-white"
              style={{ background: NAVY }}>
              <span aria-hidden>🔒</span> ACCESS PORTAL
            </Link>
          </div>
        </div>
        {/* primary nav */}
        <div className="border-t" style={{ borderColor: LINE }}>
          <div className="mx-auto flex max-w-[1280px] items-center gap-8 overflow-x-auto px-6">
            {site.nav.map(n => (
              <Link key={n.label} href={n.href}
                className="relative shrink-0 whitespace-nowrap py-3 text-[12px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: n.active ? NAVY : SOFT }}>
                {n.label}
                {n.active ? <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ background: GOLD }} /> : null}
              </Link>
            ))}
            <span className="ms-auto text-[14px]" aria-hidden>⚑</span>
          </div>
        </div>
      </header>
      <GatewayBar gateway={site.gateway} name={inst.name} accent={GOLD} />
      <main id="main">
      <SiteSchema name={inst.name} description={inst.tagline} gateway={site.gateway} url={site.url} lang={site.lang} emergency={inst.emergencyButton?.label} />

      {/* 2. Hero */}
      <section className="relative overflow-hidden" style={{ borderBottom: `1px solid ${LINE}` }}>
        <TreasuryBuilding />
        <div className="relative mx-auto max-w-[1280px] px-6 py-16">
          <div className="max-w-xl">
            <div className="text-[12px] font-bold uppercase tracking-[0.28em]" style={{ color: GOLD }}>{KICKER}</div>
            <h1 className="mt-3 text-[40px] font-bold uppercase leading-[1.12]" style={{ color: NAVY, fontFamily: SERIF }}>
              {l1}<br />{l2}
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed" style={{ color: SOFT }}>{site.hero.subhead}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={site.hero.primaryCta.href ?? '/treasury#about'} className="flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white" style={{ background: NAVY }}>
                {site.hero.primaryCta.label} <span aria-hidden>{site.hero.primaryCta.icon}</span>
              </Link>
              <Link href={site.hero.secondaryCta.href ?? '/gov/treasury'} className="flex items-center gap-2 rounded-md border bg-white/80 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] backdrop-blur" style={{ borderColor: LINE, color: NAVY }}>
                {site.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10">
        {/* 2a. Citizen tasks */}
        <section id="services" className="scroll-mt-28">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY, fontFamily: SERIF }}>{t.iWantTo}</h2>
            <Link href="/wallet/services" className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>{t.viewServices}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {site.quickServices.map(q => (
              <Link key={q.title} href={q.href ?? '/wallet/services'} className="rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: LINE }}>
                <span className="grid h-8 w-8 place-items-center rounded text-[14px] text-white" style={{ background: q.color }} aria-hidden>{q.icon}</span>
                <div className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>{q.title}</div>
                <div className="text-[11px]" style={{ color: SOFT }}>{q.subtitle}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 2b. Pillars of sovereign finance */}
        <section id="programmes" className="scroll-mt-28">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY, fontFamily: SERIF }}>The Pillars of Sovereign Finance</h2>
            <span className="text-[11px]" style={{ color: SOFT }}>{site.initiatives.length} pillars · 29 surfaces · 1 citizen portal</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {site.initiatives.map((p, i) => (
              <Link key={p.title} href="/gov/treasury"
                className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: LINE }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded text-[16px] font-bold"
                    style={{ background: '#f6efde', color: GOLD }} aria-hidden>{PILLAR_GLYPHS[i % PILLAR_GLYPHS.length]}</span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Pillar {ROMAN[i] ?? i + 1}</div>
                    <div className="text-[14px] font-bold" style={{ color: NAVY, fontFamily: SERIF }}>{p.title}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: SOFT }}>{p.body}</p>
                <div className="mt-2 text-[11px] font-semibold" style={{ color: GREEN }}>Browse pillar <Fwd /></div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Three fiscal panels (treasury engine) */}
        <div id="statistics" className="grid scroll-mt-28 grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>{snapshot.title}</h2>
              <SampleChip label={t.sampleFigures} note={note} />
            </div>
            <div className="mt-3 space-y-2.5">
              {s.snapshot.map(r => (
                <div key={r.label} className="flex items-center gap-2 text-[12px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px]" style={{ background: '#f3efe2', color: GOLD }} aria-hidden>◆</span>
                  <span className="min-w-0 flex-1" style={{ color: SOFT }}>{r.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{r.value}</span>
                  {r.delta ? <span className="w-14 text-end font-semibold tabular-nums" style={{ color: GREEN }}>{r.delta}</span> : null}
                  {r.tag ? <span className="w-24 text-end text-[10px] font-bold uppercase tracking-wide" style={{ color: r.tag === 'SUSTAINABLE' || r.tag === 'ADEQUATE' || r.tag.includes('MONTHS') ? GREEN : GOLD }}>{r.tag}</span> : null}
                </div>
              ))}
            </div>
            <Link href={snapshot.href ?? '/gov/treasury'} className="mt-3 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              {snapshot.cta} <Fwd />
            </Link>
          </section>

          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>{budget.title}</h2>
              <SampleChip label={t.sampleFigures} note={note} />
            </div>
            <div className="mt-4">
              <BudgetDonut total={s.budget.total} segments={s.budget.segments} />
            </div>
            <Link href={budget.href ?? '/public'} className="mt-4 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              {budget.cta} <Fwd />
            </Link>
          </section>

          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>{markets.title}</h2>
              <SampleChip label={t.sampleFigures} note={note} />
            </div>
            <div className="mt-3 space-y-3">
              {s.indicators.map(r => (
                <div key={r.label} className="flex items-center justify-between gap-2 text-[12px]">
                  <span style={{ color: SOFT }}>{r.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{r.value}</span>
                    <span className="w-16 text-end text-[11px] tabular-nums" style={{ color: r.flat ? SOFT : GREEN }}>
                      {r.flat ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(2)}% ${r.delta > 0 ? '↑' : '↓'}`}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <Link href={markets.href ?? '/gov/treasury'} className="mt-3 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              {markets.cta} <Fwd />
            </Link>
          </section>
        </div>

        {/* 4. Latest updates + quick links */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <section id="news" className="scroll-mt-28 rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-bold uppercase tracking-[0.14em]" style={{ color: NAVY }}>Latest Updates</h2>
                {site.newsSample ? <SampleChip label={t.sampleNews} note={note} /> : site.newsFrom ? <SourceChip label={fill(t.fromSite, { host: site.newsFrom })} /> : null}
              </div>
              <Link href="/public" className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>{t.viewNews}</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {site.news.map(u => (
                <article key={u.title} className="flex flex-col rounded-md border p-3" style={{ borderColor: LINE }}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>{u.summary}</div>
                  {u.url
                    ? <a href={u.url} rel="noopener" className="mt-2 flex-1 text-[12.5px] font-semibold leading-snug hover:underline" style={{ color: NAVY }}>{u.title} ↗</a>
                    : <div className="mt-2 flex-1 text-[12.5px] font-semibold leading-snug" style={{ color: NAVY }}>{u.title}</div>}
                  {u.date ? <div className="mt-3 border-t pt-2 text-[9.5px] uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: SOFT }}>{u.date}</div> : null}
                </article>
              ))}
            </div>
          </section>

          <section id="contact" className="scroll-mt-28 rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <h2 className="mb-4 text-[14px] font-bold uppercase tracking-[0.14em]" style={{ color: NAVY }}>Quick Links</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {[site.shortcuts.slice(0, half), site.shortcuts.slice(half)].map((col, ci) => (
                <ul key={ci} className="space-y-1">
                  {col.map(l => (
                    <li key={l.title}>
                      <Link href={l.href ?? '/gov/treasury'} className="flex items-center justify-between gap-2 rounded px-2 py-2 text-[12px] hover:bg-[#faf8f1]" style={{ color: INK }}>
                        <span className="flex items-center gap-2"><span style={{ color: GOLD }} aria-hidden>▸</span>{l.title}</span>
                        <span style={{ color: GOLD }} aria-hidden><Fwd /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
            <Link href="/wallet/inbox" className="mt-4 block border-t pt-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>{t.contactUs}</Link>
          </section>
        </div>
      </div>

      </main>


      {/* 5. Footer */}
      <footer id="about" className="text-white/75" style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              {emblem(38)}
              <div className="leading-tight">
                <div className="text-[15px] font-bold uppercase text-white" style={{ fontFamily: SERIF }}>{inst.name}</div>
                <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: GOLD2 }}>{inst.about ?? inst.tagline}</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] font-semibold text-white">Follow Us</div>
            <div className="mt-2 flex gap-3 text-white/55">{['𝕏', 'in', '▶', '✉'].map(x => <span key={x} className="grid h-7 w-7 place-items-center rounded-full border border-white/15" aria-hidden>{x}</span>)}</div>
          </div>
          {site.footerSections.map(sec => (
            <div key={sec.heading}>
              <div className="text-[12px] font-semibold text-white">{sec.heading}</div>
              <ul className="mt-3 space-y-2 text-[12px] text-white/55">
                {sec.items.map(i => <li key={label(i)}><Link href={href(i)} className="hover:text-white">{label(i)}</Link></li>)}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[12px] font-semibold text-white">{site.newsletter.heading}</div>
            <p className="mt-2 text-[11px] text-white/55">{site.newsletter.body}</p>
            <div className="mt-3 flex">
              <input aria-label={t.email} placeholder={t.enterEmail} className="min-w-0 flex-1 rounded-s-md px-2 py-1.5 text-[12px] text-slate-800 outline-none" />
              <button className="rounded-e-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: GOLD }} aria-label={t.subscribe}><Fwd /></button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-white/55">
            <span>{site.legalLine}</span>
            <span className="font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD2 }}>{MOTTO}</span>
            <div className="flex gap-4">{site.legalLinks.map(l => <Link key={label(l)} href={href(l)} className="hover:text-white">{label(l)}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
