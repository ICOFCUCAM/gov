'use client';

import * as React from 'react';
import Link from 'next/link';
import { geoAzimuthalEquidistant, geoPath } from 'd3-geo';
import { worldFeatures } from '@/lib/geo/world';
import { api } from '@/lib/api/client';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, useClock, useNationBrand, usePrefersReducedMotion, type EntryPath, type NationBrand } from './entry';
import { BOOT_DONE, PULSE_LEN, T, bootCss, spin } from './plazaBoot';

// Night palette: ink, champagne light and polished gold.
const INK = '#04060a';
const CHAMPAGNE = '#d9c398';
const CHAMPAGNE_HI = '#f4e4bd';

// Line hierarchy for the plan, as on an architectural drawing:
// primary (structure), secondary (engraving), tertiary (survey / graduations).
const L1 = { stroke: CHAMPAGNE, strokeOpacity: 0.72, strokeWidth: 1.2 };
const L2 = { stroke: CHAMPAGNE, strokeOpacity: 0.4, strokeWidth: 0.8 };
const L3 = { stroke: CHAMPAGNE, strokeOpacity: 0.16, strokeWidth: 0.6 };

// Ground plan geometry (SVG units). The plan is sized from the seal radius (--sr) so the
// seal's outer band always sits just inside the podium rims, at every screen size.
const GROUND_PER_SR = 14.02; // ground box width in seal radii
const S = 2400, C = S / 2, EXTENT = 1180;
const R_ONE = 318, R_TWO = 560, R_THREE = 820;
const RINGS = [{ r: R_ONE, w: 28 }, { r: R_TWO, w: 20 }, { r: R_THREE, w: 16 }];
const AVENUES = Array.from({ length: 8 }, (_, k) => ({ deg: k * 45, w: k % 2 === 0 ? 70 : 44 }));
const MOAT_R = 252;

/** Plan units → percentage of the ground box. */
const pct = (v: number) => `${(v / S) * 100}%`;

/** Deterministic 0..1 noise so the plan is identical on server and client. */
function rnd(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return Math.round((x - Math.floor(x)) * 1e4) / 1e4; }
/** Round a trig-derived coordinate so server and client render identical attributes. */
const q = (n: number) => Math.round(n * 100) / 100;

/** One path of radial graduations: `n` ticks between radii r0 and r1, skipping every `skip`-th. */
function ticks(n: number, r0: number, r1: number, skip = 0, phase = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    if (skip && i % skip === 0) continue;
    const a = ((i / n) * 360 + phase - 90) * (Math.PI / 180);
    const c = Math.cos(a), s = Math.sin(a);
    d += `M${(r0 * c).toFixed(2)},${(r0 * s).toFixed(2)}L${(r1 * c).toFixed(2)},${(r1 * s).toFixed(2)}`;
  }
  return d;
}

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const CSS = bootCss(RINGS.map(r => r.r));

/**
 * Cover · Plaza — the capital at night, seen from above. The national seal
 * stands at the centre in polished gold and enamel; avenues of light radiate
 * from it to every edge, and each way in is a road you choose.
 *
 * Opening: the whole state comes online as one system (see ./plazaBoot):
 * the seal is lit by a single sweep, the empty rings spin down and lock like a
 * chronograph, and one synchronized pulse energises every conduit.
 */
export function CoverPlaza() {
  const { path, setPath, email, setEmail, enter, note, cta } = useCoverEntry();
  const clock = useClock();
  const [open, setOpen] = React.useState(false);
  const doneRef = React.useRef(false);
  const [done, setDone] = React.useState(false);
  const finish = React.useCallback(() => setDone(true), []);

  const choose = React.useCallback((k: EntryPath) => { setPath(k); setOpen(true); }, [setPath]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!doneRef.current && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); finish(); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = ENTRY_PATHS[Number(e.key) - 1];
      if (p) { e.preventDefault(); finish(); choose(p.k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, finish]);

  const active = ENTRY_PATHS.find(p => p.k === path)!;
  const brand = useNationBrand();

  // Boot: plays on every open (CSS, from first paint); any click or Enter/Space/Esc skips it.
  const reduced = usePrefersReducedMotion();
  React.useEffect(() => {
    if (reduced) { setDone(true); return; }
    const t = setTimeout(() => setDone(true), BOOT_DONE);
    return () => clearTimeout(t);
  }, [reduced]);
  const booting = !done;
  doneRef.current = done;

  // Live facts for the start-up checks (public reads; absent data shows neutrally).
  const [facts, setFacts] = React.useState<{ institutions?: number; audit?: { ok: boolean; checked: number } }>({});
  React.useEffect(() => {
    api.org.ministries().then(m => setFacts(f => ({ ...f, institutions: m.ministries.filter(x => x.status === 'active').length }))).catch(() => {});
    api.audit.verify().then(a => setFacts(f => ({ ...f, audit: { ok: a.ok, checked: a.checked } }))).catch(() => {});
  }, []);
  const checks: { t: string; warn?: boolean }[] = [
    { t: brand.configured ? 'Constitutional profile verified' : 'Constitutional root verified' },
    { t: facts.institutions != null ? `${facts.institutions} institutions online` : 'Institution registry online' },
    facts.audit
      ? (facts.audit.ok ? { t: `Audit chain intact · ${facts.audit.checked} records` } : { t: 'Audit chain needs attention', warn: true })
      : { t: 'Audit chain · checking' },
    { t: 'Session ready' },
  ];
  const notices = checks.filter(c => c.warn).length;

  return (
    <main className={`relative h-[100dvh] min-h-[680px] overflow-hidden font-sans text-[#f3efe6] [--sy:47%] sm:[--sy:53%] ${done ? 'pz-done' : 'pz-run'}`}
      style={{ background: INK, ['--sr' as string]: 'min(19vh, 36vw, 190px)' }}
      onClickCapture={() => { if (booting) finish(); }}>
      <noscript><style>{'.plaza-boot,.pz-b{animation:none!important;opacity:1!important;transform:none!important;clip-path:none!important;-webkit-mask-image:none!important;mask-image:none!important}.pz-readout,.pz-status-boot,.pz-seal-dark,.pz-seal-hand,.plaza-skip{display:none!important}'}</style></noscript>
      <Scenery />

      {/* Top rail */}
      <header className="pz-b pz-head plaza-boot absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-4 px-4 sm:px-8">
        <span className="flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tracking-[0.08em]"
            style={{ borderColor: `${CHAMPAGNE}88`, color: CHAMPAGNE_HI, boxShadow: `inset 0 0 12px ${CHAMPAGNE}22` }}>{brand.seal}</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[12px] font-medium uppercase tracking-[0.3em]">{brand.name}</span>
            <span className="hidden truncate text-[9px] uppercase tracking-[0.26em] text-white/45 sm:block">{brand.motto}</span>
          </span>
        </span>
        <div className="ml-auto flex items-center gap-5 whitespace-nowrap font-mono text-[10.5px] tracking-[0.08em] text-white/55">
          <span className="hidden sm:grid" style={{ gridTemplateAreas: '"s"' }}>
            <span aria-hidden className="pz-b pz-status-boot flex items-center justify-end gap-2" style={{ gridArea: 's' }}>
              <i className="h-1.5 w-1.5 rounded-full bg-[#f1c27b] shadow-[0_0_8px_#f1c27b]" /> SYSTEM START
            </span>
            <span className="pz-b pz-status-ok flex items-center justify-end gap-2" style={{ gridArea: 's' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#9be7c4] shadow-[0_0_8px_#9be7c4]" /> ALL SYSTEMS OPERATIONAL
            </span>
          </span>
          <span className="tabular-nums text-white/75" suppressHydrationWarning>{clock}</span>
        </div>
      </header>

      {/* Title */}
      <div className="pz-b pz-title plaza-boot absolute inset-x-0 top-[78px] z-10 px-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.42em]" style={{ color: CHAMPAGNE }}>{brand.configured ? brand.platform : 'Sovereign digital public infrastructure'}</p>
        <h1 className="mx-auto mt-3 max-w-[26ch] text-[1.85rem] font-light leading-[1.08] tracking-[-0.03em] sm:text-[2.9rem]">
          Every road leads to <span className="bg-clip-text font-normal text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>the state.</span>
        </h1>
      </div>

      {/* Survey instruments: north point and scale bar (wide screens) */}
      <Instruments />

      {/* The seal */}
      <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ top: 'var(--sy)', width: 'calc(var(--sr) * 2.5)', aspectRatio: '1' }}>
        <Seal brand={brand} />
      </div>

      {/* Roads in */}
      <nav aria-label="Choose your entrance" className="absolute inset-x-0 z-20 px-4"
        style={{ top: 'calc(var(--sy) + var(--sr) * 1.52 + 14px)' }}>
        {/* Start-up readout: one instrument line that steps through the live checks */}
        <div role="status" aria-label="System start-up" style={{ background: 'radial-gradient(closest-side, rgba(4,6,10,0.9), rgba(4,6,10,0.65) 70%, transparent)' }}
          className="pz-b pz-readout pointer-events-none absolute inset-x-0 -top-3 mx-auto w-[min(380px,calc(100%-1rem))] px-5 py-3 font-mono text-[10.5px] tracking-[0.06em] [text-shadow:0_1px_10px_#000,0_0_2px_#000]">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em]" style={{ color: CHAMPAGNE }}>
            <span>System start</span><span className="text-white/40">State grid</span>
          </div>
          <div className="relative mt-2 h-px bg-white/[0.12]">
            <div className="pz-b pz-prog absolute inset-0 origin-left" style={{ background: `linear-gradient(90deg, ${CHAMPAGNE}55, ${CHAMPAGNE_HI})`, boxShadow: `0 0 6px ${CHAMPAGNE}` }} />
            {[0, 25, 50, 75, 100].map(x => <span key={x} aria-hidden className="absolute -top-[2px] h-[5px] w-px bg-white/30" style={{ left: `${x}%` }} />)}
          </div>
          <div className="mt-2 h-[18px] overflow-hidden">
            <ol className="pz-b pz-tick">
              {checks.map((c, i) => (
                <li key={i} className="flex h-[18px] items-center justify-between gap-3" style={{ color: c.warn ? '#f1b36b' : 'rgba(243,239,230,0.78)' }}>
                  <span className="flex min-w-0 items-center gap-2.5"><span style={{ color: c.warn ? '#f1b36b' : CHAMPAGNE }}>{c.warn ? '!' : '✓'}</span><span className="truncate">{c.t}</span></span>
                  <span className="tabular-nums text-white/35">{String(i + 1).padStart(2, '0')}/{String(checks.length).padStart(2, '0')}</span>
                </li>
              ))}
              <li className="flex h-[18px] items-center justify-center gap-2.5 uppercase tracking-[0.24em]" style={{ color: notices ? '#f1b36b' : '#bfe9d3' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: notices ? '#f1b36b' : '#9be7c4', boxShadow: `0 0 8px ${notices ? '#f1b36b' : '#9be7c4'}` }} />
                {notices ? `Online · ${notices} notice${notices > 1 ? 's' : ''}` : 'All systems online'}
              </li>
            </ol>
          </div>
        </div>
        <ul className="pz-b pz-roads plaza-boot mx-auto flex max-w-[680px] flex-wrap justify-center gap-2.5" aria-hidden={booting}
          style={{ pointerEvents: booting ? 'none' : 'auto' }}>
          {ENTRY_PATHS.map((p, i) => {
            const on = open && p.k === path;
            return (
              <li key={p.k}>
                <button type="button" onClick={() => choose(p.k)}
                  className="group flex items-center gap-3 rounded-full border px-5 py-2.5 text-[13.5px] font-medium tracking-[0.01em] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
                  style={{
                    borderColor: on ? CHAMPAGNE : 'rgba(217,195,152,0.32)',
                    background: on ? 'rgba(217,195,152,0.14)' : 'rgba(8,11,17,0.55)',
                    boxShadow: on ? `0 0 24px -6px ${CHAMPAGNE}88` : '0 12px 30px -16px rgba(0,0,0,0.9)',
                  }}>
                  <span className="grid h-5 w-5 place-items-center rounded-full border font-mono text-[9.5px]" style={{ borderColor: `${CHAMPAGNE}88`, color: CHAMPAGNE_HI }}>{i + 1}</span>
                  {p.title}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" style={{ color: CHAMPAGNE }}>→</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign-in sheet */}
      {open && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={enter} aria-label={`Sign in — ${active.title}`}
            className="relative w-full max-w-[440px] animate-[plazaUp_.5s_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-[20px] border backdrop-blur-2xl"
            style={{ borderColor: 'rgba(217,195,152,0.35)', background: 'linear-gradient(180deg, rgba(20,22,28,0.92), rgba(9,11,16,0.94))', boxShadow: '0 50px 100px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,240,210,0.08)' }}>
            <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${CHAMPAGNE}, transparent)` }} />
            <div className="flex items-start justify-between gap-4 px-7 pb-3 pt-7">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: CHAMPAGNE }}>The {active.title.toLowerCase()} road</p>
                <h2 className="mt-2 text-[1.5rem] font-light tracking-[-0.02em]">{active.title === 'Citizen' ? 'Your services, your records' : active.title === 'Government' ? 'Enter the command of state' : 'Charter a new institution'}</h2>
                <p className="mt-1 text-[13.5px] text-white/55">{active.sub}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/5 hover:text-white">✕</button>
            </div>
            <div className="px-7 pb-7">
              {path === 'citizen' ? (
                <p className="mt-2 border-l py-1 pl-4 text-[13.5px] leading-relaxed text-white/75" style={{ borderColor: CHAMPAGNE }}>{CITIZEN_NOTE}</p>
              ) : (
                <>
                  <label htmlFor="plaza-email" className="sr-only">Work email</label>
                  <input id="plaza-email" type="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.currentTarget.value)}
                    placeholder="Work email"
                    className="mt-2 w-full border-b bg-transparent px-0 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                    style={{ borderColor: 'rgba(217,195,152,0.4)' }} />
                </>
              )}
              <button type="submit"
                className="mt-6 flex w-full items-center justify-between rounded-full px-6 py-3.5 text-[14px] font-medium tracking-[0.02em] text-[#17120a] transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e4bd]/60 active:scale-[0.99]"
                style={{ background: `linear-gradient(180deg, ${CHAMPAGNE_HI}, ${CHAMPAGNE} 55%, #b8955a)`, boxShadow: `0 10px 30px -10px ${CHAMPAGNE}88, inset 0 1px 0 rgba(255,255,255,0.6)` }}>
                {cta} <span aria-hidden>→</span>
              </button>
              <p className="mt-4 text-[11.5px] leading-relaxed text-white/40">{note}</p>
            </div>
          </form>
        </div>
      )}

      {booting ? (
        <button type="button" onClick={finish}
          className="plaza-skip absolute bottom-5 right-4 z-40 font-mono text-[10.5px] tracking-[0.14em] text-white/45 hover:text-white sm:right-8">
          SKIP INTRO ⏎
        </button>
      ) : null}

      {/* Foot */}
      <footer className="pz-b pz-foot plaza-boot absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-12 text-[12px] text-white/55 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <nav aria-label="Public services" className="flex flex-wrap gap-x-5 gap-y-1">
          {PUBLIC_LINKS.map(l => <Link key={l.href} href={l.href} className="transition-colors hover:text-[#f4e4bd]">{l.l}</Link>)}
        </nav>
        <span className="hidden font-mono text-[10px] tracking-[0.12em] text-white/35 sm:inline">{brand.configured ? `© ${new Date().getFullYear()} ${brand.name.toUpperCase()} · POWERED BY CIVICOS` : 'HUMANS GOVERN · INSTITUTIONS GOVERN · CONSTITUTIONS GOVERN'}</span>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </main>
  );
}

/** North point and measured scale bar, as on a site plan. Wide screens only. */
function Instruments() {
  return (
    <div aria-hidden className="pz-b pz-instr plaza-boot pointer-events-none absolute left-8 z-10 hidden -translate-y-1/2 lg:block" style={{ top: 'var(--sy)' }}>
      <svg width="170" height="150" viewBox="0 0 170 150" fill="none" className="block">
        {/* North point */}
        <circle cx="22" cy="40" r="17" {...L2} />
        <circle cx="22" cy="40" r="13.5" {...L3} />
        <path transform="translate(22 40)" d={ticks(36, 15, 17)} stroke={CHAMPAGNE} strokeOpacity="0.35" strokeWidth="0.5" />
        <path d="M22,24 L26,40 L22,37 Z" fill={CHAMPAGNE_HI} fillOpacity="0.85" />
        <path d="M22,24 L18,40 L22,37 Z" fill={CHAMPAGNE} fillOpacity="0.3" />
        <path d="M22,56 L25,40 L22,43 L19,40 Z" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.4" strokeWidth="0.6" />
        <text x="22" y="15" textAnchor="middle" fontSize="9" letterSpacing="1" fill={CHAMPAGNE_HI} fontFamily="ui-monospace, monospace">N</text>
        {/* Scale bar: alternating filled segments, metres */}
        <g transform="translate(4 92)">
          {[0, 1, 2, 3].map(i => (
            <rect key={i} x={i * 24} y="0" width="24" height="4" fill={i % 2 ? 'none' : CHAMPAGNE} fillOpacity="0.55" stroke={CHAMPAGNE} strokeOpacity="0.6" strokeWidth="0.6" />
          ))}
          {[0, 2, 4].map(i => <line key={i} x1={i * 24} y1="-3" x2={i * 24} y2="4" stroke={CHAMPAGNE} strokeOpacity="0.6" strokeWidth="0.6" />)}
          {[0, 250, 500].map((m, i) => (
            <text key={m} x={i * 48} y="16" textAnchor="middle" fontSize="7.5" fill={CHAMPAGNE} fillOpacity="0.6" fontFamily="ui-monospace, monospace">{m}</text>
          ))}
          <text x="0" y="34" fontSize="7" letterSpacing="1.6" fill={CHAMPAGNE} fillOpacity="0.45" fontFamily="ui-monospace, monospace">PLAN · CAPITAL · 1:5000</text>
        </g>
      </svg>
    </div>
  );
}

/** The capital at night, drawn as a plan centred on the seal. Decorative only. */
function Scenery() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 60% at 50% var(--sy), #0d1420 0%, ${INK} 75%)` }} />
      <div className="absolute left-1/2"
        style={{ top: 'var(--sy)', width: `calc(var(--sr) * ${GROUND_PER_SR})`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
        {/* Drawn architecture: present from the first frame, brought up to full light */}
        <div className="pz-b pz-base plaza-boot absolute inset-0"><PlanBase /></div>
        {/* Energised layer: city lights and road glow, revealed by the light front */}
        <div className="pz-b pz-lit plaza-boot absolute inset-0"><PlanLights /></div>
        <Conduits />
        <Bezels />
        <Fountains />
        <IndexMarks />
      </div>
      {/* Warm civic glow at the centre, deep vignette, title shade, film grain */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% var(--sy), rgba(244,214,150,0.16), transparent 34%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 70% at 50% var(--sy), transparent 40%, rgba(2,3,6,0.85) 100%)' }} />
      <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

/** The plan's drawn structure: survey grid, engraved rings, roads, pools and podium. */
function PlanBase() {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-full w-full">
      <defs>
        <pattern id="plz-grid" width="80" height="80" patternUnits="userSpaceOnUse" x={C} y={C}>
          <path d="M80,0 L0,0 L0,80" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.05" strokeWidth="0.5" />
        </pattern>
        <pattern id="plz-grid-major" width="400" height="400" patternUnits="userSpaceOnUse" x={C} y={C}>
          <path d="M400,0 L0,0 L0,400" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.07" strokeWidth="0.7" />
          <path d="M-7,0 L7,0 M0,-7 L0,7" stroke={CHAMPAGNE} strokeOpacity="0.35" strokeWidth="0.8" />
        </pattern>
        <radialGradient id="plz-grid-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0.2" stopColor="#fff" stopOpacity="0" /><stop offset="0.32" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.6" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="plz-grid-mask"><rect width={S} height={S} fill="url(#plz-grid-fade)" /></mask>
        <linearGradient id="plz-pool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d2a33" /><stop offset="0.5" stopColor="#16404a" /><stop offset="1" stopColor="#0a1f27" />
        </linearGradient>
        <radialGradient id="plz-obsidian" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#141a24" /><stop offset="1" stopColor="#06080d" />
        </radialGradient>
        <filter id="plz-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>

      {/* Fine architectural survey grid with registration crosses */}
      <g mask="url(#plz-grid-mask)">
        <rect width={S} height={S} fill="url(#plz-grid)" />
        <rect width={S} height={S} fill="url(#plz-grid-major)" />
      </g>

      {/* Engraved survey rings — every fourth one stronger — and radial survey lines */}
      {Array.from({ length: 28 }).map((_, i) => (
        <circle key={i} cx={C} cy={C} r={290 + i * 32} fill="none" stroke={CHAMPAGNE} strokeOpacity={i % 4 === 0 ? 0.07 : 0.03} strokeWidth={i % 4 === 0 ? 0.8 : 0.6} />
      ))}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i * 7.5 * Math.PI) / 180;
        return <line key={i} x1={q(C + 340 * Math.cos(a))} y1={q(C + 340 * Math.sin(a))} x2={q(C + EXTENT * Math.cos(a))} y2={q(C + EXTENT * Math.sin(a))} stroke={CHAMPAGNE} strokeOpacity="0.03" strokeWidth="0.6" />;
      })}

      {/* Outer measured circle: degree graduations, as on a theodolite limb */}
      <g transform={`translate(${C} ${C})`} fill="none">
        <circle r={1060} {...L3} />
        <circle r={1072} {...L3} />
        <path d={ticks(360, 1060, 1066, 5)} stroke={CHAMPAGNE} strokeOpacity="0.14" strokeWidth="0.6" />
        <path d={ticks(72, 1056, 1072, 2)} stroke={CHAMPAGNE} strokeOpacity="0.26" strokeWidth="0.8" />
        <path d={ticks(36, 1048, 1072)} stroke={CHAMPAGNE} strokeOpacity="0.4" strokeWidth="1" />
      </g>

      {/* Ring roads: twin primary hairlines, engraved outer lines */}
      {RINGS.map(r => (
        <g key={r.r} fill="none">
          <circle cx={C} cy={C} r={r.r - r.w / 2} stroke={CHAMPAGNE} strokeOpacity="0.55" strokeWidth="1" />
          <circle cx={C} cy={C} r={r.r + r.w / 2} stroke={CHAMPAGNE} strokeOpacity="0.55" strokeWidth="1" />
          <circle cx={C} cy={C} r={r.r - r.w / 2 - 4} {...L3} />
          <circle cx={C} cy={C} r={r.r + r.w / 2 + 4} {...L3} />
        </g>
      ))}

      {/* Avenues: engraved double edges; ceremonial axes carry reflecting pools */}
      {AVENUES.map(av => {
        const main = av.deg === 90 || av.deg === 270;
        return (
          <g key={av.deg} transform={`rotate(${av.deg} ${C} ${C})`}>
            {[-1, 1].map(side => (
              <g key={side}>
                <line x1={C + 268} y1={C + side * av.w / 2} x2={C + EXTENT + 262} y2={C + side * av.w / 2} stroke={CHAMPAGNE} strokeOpacity="0.6" strokeWidth="1" />
                <line x1={C + 296} y1={C + side * (av.w / 2 + 4)} x2={C + EXTENT + 262} y2={C + side * (av.w / 2 + 4)} {...L3} />
              </g>
            ))}
            {main ? (
              <>
                <rect x={C + 340} y={C - 28} width={EXTENT - 160} height={18} fill="url(#plz-pool)" stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.8" />
                <rect x={C + 340} y={C + 10} width={EXTENT - 160} height={18} fill="url(#plz-pool)" stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.8" />
                <line x1={C + 340} y1={C - 19} x2={C + EXTENT + 180} y2={C - 19} stroke="#9fd6e0" strokeOpacity="0.22" strokeWidth="0.6" />
                <line x1={C + 340} y1={C + 19} x2={C + EXTENT + 180} y2={C + 19} stroke="#9fd6e0" strokeOpacity="0.22" strokeWidth="0.6" />
              </>
            ) : (
              <line x1={C + 296} y1={C} x2={C + EXTENT + 262} y2={C} stroke={CHAMPAGNE} strokeOpacity="0.2" strokeWidth="0.6" />
            )}
          </g>
        );
      })}

      {/* Central plaza: obsidian podium, dark-glass moat, gold rims */}
      <circle cx={C} cy={C} r={268} fill="url(#plz-obsidian)" />
      <circle cx={C} cy={C} r={268} fill="none" {...L1} />
      <circle cx={C} cy={C} r={264.5} fill="none" {...L3} />
      <circle cx={C} cy={C} r={MOAT_R} fill="none" stroke="#08161b" strokeWidth="18" />
      <circle cx={C} cy={C} r={MOAT_R} fill="none" stroke="#6fb8c6" strokeOpacity="0.12" strokeWidth="18" filter="url(#plz-soft)" />
      <circle cx={C} cy={C} r={MOAT_R - 9} fill="none" {...L2} />
      <circle cx={C} cy={C} r={MOAT_R + 9} fill="none" {...L2} />
      <circle cx={C} cy={C} r={226} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.8" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={220} fill="none" {...L2} />
      {/* Theodolite bezel seat: engraved double hairline */}
      <circle cx={C} cy={C} r={294} fill="none" {...L2} />
      <circle cx={C} cy={C} r={297} fill="none" {...L3} />
    </svg>
  );
}

/** City lights and the glow of the roads — the energised part of the plan. */
function PlanLights() {
  const lights = React.useMemo(() => {
    // Warm points in the blocks between avenues and ring roads.
    const out: { x: number; y: number; r: number; o: number; warm: boolean }[] = [];
    for (let i = 0; i < 2600; i++) {
      const r = 290 + Math.sqrt(rnd(i)) * 900;
      const a = rnd(i + 0.31) * Math.PI * 2;
      const deg = ((a * 180) / Math.PI) % 45;
      const off = Math.min(deg, 45 - deg) * (Math.PI / 180) * r; // px from nearest avenue centre
      if (off < 46) continue;
      if (r < 345 || RINGS.some(ring => Math.abs(r - ring.r) < ring.w)) continue;
      const near = Math.max(0, 1 - (r - 290) / 900);
      out.push({ x: q(C + r * Math.cos(a)), y: q(C + r * Math.sin(a)), r: q(0.7 + rnd(i + 0.7) * 1.4), o: q(0.25 + rnd(i + 0.9) * 0.6 * (0.5 + near)), warm: rnd(i + 0.5) > 0.22 });
    }
    return out;
  }, []);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-full w-full">
      <defs>
        <filter id="plz-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {lights.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.warm ? '#ffd9a0' : '#cfe3ff'} opacity={l.o} />
      ))}
      {RINGS.map(r => (
        <circle key={r.r} cx={C} cy={C} r={r.r} fill="none" stroke="#f0cf8e" strokeOpacity="0.16" strokeWidth={r.w} filter="url(#plz-bloom)" />
      ))}
      {AVENUES.map(av => {
        const main = av.deg === 90 || av.deg === 270;
        return (
          <g key={av.deg} transform={`rotate(${av.deg} ${C} ${C})`}>
            <rect x={C + 268} y={C - av.w / 2} width={EXTENT} height={av.w} fill="#f0cf8e" opacity="0.07" filter="url(#plz-bloom)" />
            {/* Lamp standards at a regular interval along each avenue */}
            {Array.from({ length: 24 }).map((_, j) => {
              const x = C + 360 + j * 48;
              return main
                ? [-1, 1].map(s => <circle key={`${j}${s}`} cx={x} cy={C + s * (av.w / 2 - 4)} r="1.3" fill="#ffe1a6" opacity="0.75" />)
                : <circle key={j} cx={x} cy={C} r="1.2" fill="#ffe1a6" opacity="0.7" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Conduit pulses: one luminous pulse down every avenue at once, on a steady
 * cadence, and each ring road answering as the pulse crosses it. HTML layers
 * animated on transform/opacity only, so the plan itself never repaints.
 */
function Conduits() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {RINGS.map((r, i) => (
        <div key={r.r} className={`pz-flash${i} absolute rounded-full`}
          style={{ left: pct(C - r.r), top: pct(C - r.r), width: pct(2 * r.r), height: pct(2 * r.r), border: `1px solid ${CHAMPAGNE_HI}b3`, boxShadow: `0 0 18px ${CHAMPAGNE}88, inset 0 0 18px ${CHAMPAGNE}55`, opacity: 0 }} />
      ))}
      {AVENUES.map(av => {
        const h = av.w > 50 ? 3 : 2.4;
        return (
          <div key={av.deg} className="absolute" style={{ left: '50%', top: `calc(50% - ${pct(h / 2)})`, width: pct(PULSE_LEN), height: pct(h), transformOrigin: `0 50%`, transform: `rotate(${av.deg}deg)` }}>
            <div className="pz-pulse h-full w-full rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${CHAMPAGNE}55 45%, ${CHAMPAGNE_HI} 88%, #fff)`, boxShadow: `0 0 8px 1px ${CHAMPAGNE}66`, opacity: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

/** An empty ring that spins down and locks to rest during boot. Rings with words never use this. */
function Ring({ r, from, lockAt, delay = 0, children }: { r: number; from: number; lockAt: number; delay?: number; children: React.ReactNode }) {
  const R = r + 6, s = spin(from, lockAt, delay);
  return (
    <div className="absolute" style={{ left: pct(C - R), top: pct(C - R), width: pct(2 * R), height: pct(2 * R) }}>
      <div className="pz-b pz-spin plaza-boot h-full w-full"
        style={{ ['--r0' as string]: `${s.from}deg`, ['--r1' as string]: `${s.from > 0 ? -0.5 : 0.5}deg`, animationDuration: `${s.ms}ms`, animationDelay: `${s.delay}ms` }}>
        <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="block h-full w-full overflow-visible" fill="none">{children}</svg>
      </div>
    </div>
  );
}

/** The plan's rotating instruments: chapter ring, theodolite bezel, ring-road tracks. Locks inside-out. */
function Bezels() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Chapter ring on the podium, just outside the seal */}
      <Ring r={240} from={-240} lockAt={2550}>
        <path d={ticks(120, 235, 239, 5)} stroke={CHAMPAGNE} strokeOpacity="0.32" strokeWidth="0.6" />
        <path d={ticks(24, 232, 239, 2)} stroke={CHAMPAGNE} strokeOpacity="0.6" strokeWidth="0.9" />
        <path d={ticks(12, 229, 239)} stroke={CHAMPAGNE_HI} strokeOpacity="0.85" strokeWidth="1.3" />
      </Ring>
      {/* Theodolite bezel between podium and first ring road */}
      <Ring r={292} from={150} lockAt={2750} delay={80}>
        <path d={ticks(360, 287, 292, 5)} stroke={CHAMPAGNE} strokeOpacity="0.28" strokeWidth="0.5" />
        <path d={ticks(72, 284, 292, 2)} stroke={CHAMPAGNE} strokeOpacity="0.5" strokeWidth="0.7" />
        <path d={ticks(36, 280, 292)} stroke={CHAMPAGNE} strokeOpacity="0.78" strokeWidth="0.9" />
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} transform={`rotate(${i * 45}) translate(0 -275)`} d="M0,-2.6 L2.6,0 L0,2.6 L-2.6,0 Z" fill={CHAMPAGNE_HI} fillOpacity={i % 2 ? 0.55 : 0.95} />
        ))}
      </Ring>
      {/* Lamp track along each ring road's centre line */}
      <Ring r={R_ONE} from={-70} lockAt={2900} delay={150}>
        <circle r={R_ONE} stroke={CHAMPAGNE_HI} strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.01 11.1" />
      </Ring>
      <Ring r={R_TWO + 30} from={42} lockAt={2900} delay={200}>
        <circle r={R_TWO} stroke={CHAMPAGNE_HI} strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.01 12.2" />
        <path d={ticks(180, R_TWO + 16, R_TWO + 22, 5)} stroke={CHAMPAGNE} strokeOpacity="0.22" strokeWidth="0.6" />
        <path d={ticks(36, R_TWO + 16, R_TWO + 28)} stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.9" />
      </Ring>
      <Ring r={R_THREE} from={-28} lockAt={2900} delay={250}>
        <circle r={R_THREE} stroke={CHAMPAGNE_HI} strokeOpacity="0.5" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.01 13.4" />
      </Ring>
    </div>
  );
}

/** Fixed index marks the bezels align to — they light when every ring has locked. */
function IndexMarks() {
  const R = 600;
  return (
    <div className="pz-b pz-index plaza-boot pointer-events-none absolute" style={{ left: pct(C - R), top: pct(C - R), width: pct(2 * R), height: pct(2 * R) }}>
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="block h-full w-full">
        {[0, 90, 180, 270].map(d => (
          <g key={d} transform={`rotate(${d})`}>
            {/* Lubber marks pointing in at the theodolite bezel and ring two */}
            <path d="M0,-293 L-3.4,-302 L3.4,-302 Z" fill={CHAMPAGNE_HI} />
            <path d="M0,-589 L-4,-599 L4,-599 Z" fill={CHAMPAGNE_HI} fillOpacity="0.8" />
            <line x1="0" y1="-226" x2="0" y2="-229" stroke={CHAMPAGNE_HI} strokeWidth="1.4" />
          </g>
        ))}
        {[45, 135, 225, 315].map(d => (
          <line key={d} transform={`rotate(${d})`} x1="0" y1="-294" x2="0" y2="-300" stroke={CHAMPAGNE} strokeOpacity="0.7" strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}

/** Fountain jets around the moat, in their own small layer. */
function Fountains() {
  const R = 262;
  return (
    <div className="pz-b pz-base plaza-boot pointer-events-none absolute" style={{ left: pct(C - R), top: pct(C - R), width: pct(2 * R), height: pct(2 * R) }}>
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="block h-full w-full">
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i * 10 * Math.PI) / 180;
          return <circle key={i} cx={q(MOAT_R * Math.cos(a))} cy={q(MOAT_R * Math.sin(a))} r="1.8" fill="#eaf8ff" className="plaza-anim" style={{ animation: `plazaPulse ${2 + (i % 6) * 0.35}s ease-in-out infinite` }} />;
        })}
      </svg>
    </div>
  );
}

/** Font size that lets an inscription fit its half of the ring, capped large. */
function inscriptionSize(text: string, radius: number, share = 0.8, max = 23) {
  const arc = Math.PI * radius * share; // leave room for the side marks
  return Math.max(10, Math.min(max, arc / (Math.max(text.length, 1) * 0.84)));
}

// UN-emblem projection: the world seen from above the North Pole, out to 60°S.
const MAP_R = 100;
const MAP_REACH = 150; // degrees from the pole
const unProjection = () =>
  geoAzimuthalEquidistant().rotate([0, -90]).scale(MAP_R / ((MAP_REACH * Math.PI) / 180)).translate([0, 0]).clipAngle(MAP_REACH);

/** A rotating, wordless layer of the seal (guilloché, minute track). */
function SealDial({ from, lockAt, children }: { from: number; lockAt: number; children: React.ReactNode }) {
  const s = spin(from, lockAt);
  return (
    <div className="pz-b pz-spin plaza-boot absolute inset-0"
      style={{ ['--r0' as string]: `${s.from}deg`, ['--r1' as string]: `${s.from > 0 ? -0.6 : 0.6}deg`, animationDuration: `${s.ms}ms`, animationDelay: `${s.delay}ms` }}>
      <svg viewBox="-250 -250 500 500" className="h-full w-full" fill="none">{children}</svg>
    </div>
  );
}

/**
 * The national seal: polished gold rim, black enamel band engraved with the
 * nation's name across the top and its motto across the bottom, and a
 * UN-emblem world map in gold on emerald, wreathed in laurel.
 *
 * The seal never assembles or moves: it is present from the first frame and
 * lit by one sweep. Only its wordless dials (guilloché, minute track) rotate.
 */
function Seal({ brand }: { brand: NationBrand }) {
  const land = React.useMemo(() => worldFeatures(), []);
  const gp = React.useMemo(() => geoPath(unProjection()), []);
  const landPath = React.useMemo(() => gp({ type: 'FeatureCollection', features: land } as never) ?? '', [gp, land]);

  // The enamel band names what this is; the nation's own name and motto sit in
  // the dark outer ring directly around it, name above and motto below.
  const top = 'SOVEREIGN DIGITAL INSTITUTION';
  const outerTop = brand.configured ? brand.name.toUpperCase() : '';
  const outerBottom = brand.configured ? brand.motto.toUpperCase() : '';
  const OUT_TOP_R = 219, OUT_BOTTOM_R = 236;
  const outerSize = Math.min(
    outerTop ? inscriptionSize(outerTop, OUT_TOP_R, 0.78, 27) : 27,
    outerBottom ? inscriptionSize(outerBottom, OUT_BOTTOM_R, 0.78, 27) : 27,
  );
  const bottom = brand.platform.toUpperCase();
  const TOP_R = 162, BOTTOM_R = 181;
  const topSize = Math.min(inscriptionSize(top, TOP_R), inscriptionSize(bottom, BOTTOM_R));
  const bottomSize = topSize;

  // Laurel wreath around the map, meeting at the base.
  const leaves: { x: number; y: number; rot: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const deg = 106 + i * 11;
    const a = (deg * Math.PI) / 180;
    const rr = 124 + (i % 2 ? 7 : -5);
    for (const side of [1, -1]) {
      const ang = side === 1 ? a : Math.PI - a;
      leaves.push({ x: q(rr * Math.cos(ang)), y: q(rr * Math.sin(ang)), rot: q((ang * 180) / Math.PI + 90 + side * (i % 2 ? -26 : 26)) });
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Body: outer ring, metal rims, enamel band and field */}
      <svg viewBox="-250 -250 500 500" className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.85)) drop-shadow(0 0 40px rgba(240,205,140,0.18))' }} aria-hidden>
        <defs>
          {/* Polished metal: many stops imitate a brushed, light-catching surface */}
          <linearGradient id="seal-metal" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#fff4cf" /><stop offset="0.18" stopColor="#d7b46a" /><stop offset="0.34" stopColor="#8a6424" />
            <stop offset="0.5" stopColor="#f2dc9e" /><stop offset="0.66" stopColor="#a67a32" /><stop offset="0.82" stopColor="#e9cf8a" /><stop offset="1" stopColor="#6e4c16" />
          </linearGradient>
          <linearGradient id="seal-metal-r" x1="0.9" y1="1" x2="0.1" y2="0">
            <stop offset="0" stopColor="#fff4cf" /><stop offset="0.3" stopColor="#b88d42" /><stop offset="0.55" stopColor="#5e4012" />
            <stop offset="0.8" stopColor="#d9bb74" /><stop offset="1" stopColor="#7a5418" />
          </linearGradient>
          <linearGradient id="seal-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff0c4" /><stop offset="0.5" stopColor="#c9a24f" /><stop offset="1" stopColor="#6e4c16" />
          </linearGradient>
          <linearGradient id="seal-letter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3cc" /><stop offset="0.55" stopColor="#e2c37c" /><stop offset="1" stopColor="#b48a3e" />
          </linearGradient>
          <radialGradient id="seal-band" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#1a1d24" /><stop offset="1" stopColor="#07080b" />
          </radialGradient>
          <radialGradient id="seal-enamel" cx="42%" cy="34%" r="72%">
            <stop offset="0" stopColor="#0f6b56" /><stop offset="0.55" stopColor="#063d31" /><stop offset="1" stopColor="#021a15" />
          </radialGradient>
          {/* Top arc runs left→right over the top; bottom arc left→right under the bottom, so both read upright */}
          <path id="seal-arc-top" d={`M ${-TOP_R},0 A ${TOP_R},${TOP_R} 0 0,1 ${TOP_R},0`} />
          <path id="seal-arc-bottom" d={`M ${-BOTTOM_R},0 A ${BOTTOM_R},${BOTTOM_R} 0 0,0 ${BOTTOM_R},0`} />
          <clipPath id="seal-map"><circle r={MAP_R} /></clipPath>
          <radialGradient id="seal-obsidian" cx="50%" cy="38%" r="62%">
            <stop offset="0.75" stopColor="#151922" /><stop offset="1" stopColor="#06080c" />
          </radialGradient>
          <path id="seal-out-top" d={`M ${-OUT_TOP_R},0 A ${OUT_TOP_R},${OUT_TOP_R} 0 0,1 ${OUT_TOP_R},0`} />
          <path id="seal-out-bottom" d={`M ${-OUT_BOTTOM_R},0 A ${OUT_BOTTOM_R},${OUT_BOTTOM_R} 0 0,0 ${OUT_BOTTOM_R},0`} />
        </defs>

        {/* Dark outer ring that carries the nation's name and motto */}
        <circle r="249" fill="url(#seal-obsidian)" />
        <circle r="248" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.75" strokeWidth="1.4" />
        <circle r="245.5" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.18" strokeWidth="0.5" />
        <circle r="243" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.3" strokeWidth="0.8" />
        <circle r="205" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.3" strokeWidth="0.8" />

        {/* Bevelled metal rim and black enamel band */}
        <circle r="199" fill="url(#seal-metal)" />
        <circle r="194" fill="url(#seal-metal-r)" />
        <circle r="191" fill="url(#seal-band)" />
        <circle r="190.5" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />

        {/* Inner rim and emerald field */}
        <circle r="150" fill="url(#seal-metal)" />
        <circle r="146" fill="url(#seal-metal-r)" />
        <circle r="143" fill="url(#seal-enamel)" />
      </svg>

      {/* Wordless dials: they turn during start-up and lock; the lettered rings never move */}
      <SealDial from={180} lockAt={2300}>
        <g opacity="0.14">
          {Array.from({ length: 24 }).map((_, i) => (
            <ellipse key={i} rx="140" ry="58" stroke="#e9cf8a" strokeWidth="0.35" transform={`rotate(${i * 7.5})`} />
          ))}
        </g>
      </SealDial>
      <SealDial from={-210} lockAt={2400}>
        <path d={ticks(120, 200.8, 203.6, 5)} stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.5" />
        <path d={ticks(24, 200.4, 204.4, 2)} stroke={CHAMPAGNE_HI} strokeOpacity="0.7" strokeWidth="0.8" />
        <path d={ticks(12, 200, 205)} stroke={CHAMPAGNE_HI} strokeOpacity="0.95" strokeWidth="1.2" />
      </SealDial>

      {/* Inscriptions, emblem and laurel — fixed and upright at all times */}
      <svg viewBox="-250 -250 500 500" className="absolute inset-0 h-full w-full"
        role="img" aria-label={`Seal of ${brand.configured ? `${brand.name}${brand.motto ? ` — ${brand.motto}` : ''}` : 'CivicOS'}: Sovereign Digital Institution, ${brand.platform}`}>
        {outerTop ? (
          <text fill={CHAMPAGNE_HI} fontSize={outerSize} fontWeight="700" letterSpacing={outerSize * 0.16} textAnchor="middle"
            style={{ paintOrder: 'stroke', stroke: '#05070b', strokeWidth: 1 }}>
            <textPath href="#seal-out-top" startOffset="50%">{outerTop}</textPath>
          </text>
        ) : null}
        {outerBottom ? (
          <text fill={CHAMPAGNE_HI} fontSize={outerSize} fontWeight="700" letterSpacing={outerSize * 0.16} textAnchor="middle"
            style={{ paintOrder: 'stroke', stroke: '#05070b', strokeWidth: 1 }}>
            <textPath href="#seal-out-bottom" startOffset="50%">{outerBottom}</textPath>
          </text>
        ) : null}
        {outerTop ? [-1, 1].map(side => (
          <path key={side} transform={`translate(${side * 226} 0) rotate(45) scale(1.1)`} d="M-4,-4 L4,-4 L4,4 L-4,4 Z" fill={CHAMPAGNE} opacity="0.8" />
        )) : null}

        <text fill="url(#seal-letter)" fontSize={topSize} fontWeight="700" letterSpacing={topSize * 0.12} textAnchor="middle"
          style={{ paintOrder: 'stroke', stroke: '#2a1c06', strokeWidth: 0.6 }}>
          <textPath href="#seal-arc-top" startOffset="50%">{top}</textPath>
        </text>
        {bottom ? (
          <text fill="url(#seal-letter)" fontSize={bottomSize} fontWeight="700" letterSpacing={bottomSize * 0.12} textAnchor="middle"
            style={{ paintOrder: 'stroke', stroke: '#2a1c06', strokeWidth: 0.6 }}>
            <textPath href="#seal-arc-bottom" startOffset="50%">{bottom}</textPath>
          </text>
        ) : null}
        {[-1, 1].map(side => (
          <path key={side} transform={`translate(${side * 171} 0) scale(1.5)`}
            d="M0,-5 L1.2,-1.4 L5,-1.4 L1.9,0.9 L3,4.6 L0,2.4 L-3,4.6 L-1.9,0.9 L-5,-1.4 L-1.2,-1.4 Z" fill="url(#seal-leaf)" />
        ))}

        {/* UN-emblem map: polar projection, concentric parallels and meridians */}
        <g clipPath="url(#seal-map)">
          <circle r={MAP_R} fill="#03241d" />
          <path d={landPath} fill="url(#seal-leaf)" fillOpacity="0.95" stroke="#fff0c4" strokeOpacity="0.5" strokeWidth="0.3" />
        </g>
        <g fill="none" stroke="#f2dc9e" strokeOpacity="0.55" strokeWidth="0.7">
          {[1, 2, 3, 4].map(k => <circle key={k} r={(MAP_R * k) / 5} />)}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return <line key={i} x1="0" y1="0" x2={q(MAP_R * Math.cos(a))} y2={q(MAP_R * Math.sin(a))} />;
          })}
        </g>
        <circle r={MAP_R + 1.5} fill="none" stroke="url(#seal-metal)" strokeWidth="3" />

        {/* Laurel */}
        <path d="M -22 128 Q -88 108 -120 40 M 22 128 Q 88 108 120 40" fill="none" stroke="url(#seal-metal)" strokeWidth="1.6" />
        {leaves.map((l, i) => (
          <g key={i} transform={`rotate(${l.rot} ${l.x} ${l.y})`}>
            <ellipse cx={l.x} cy={l.y} rx="12" ry="4.4" fill="url(#seal-leaf)" stroke="#5e4012" strokeWidth="0.35" />
            <line x1={l.x - 10} y1={l.y} x2={l.x + 10} y2={l.y} stroke="#6e4c16" strokeOpacity="0.6" strokeWidth="0.4" />
          </g>
        ))}
        <path d="M -26 138 L 0 125 L 26 138" fill="none" stroke="url(#seal-metal)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>

      {/* Start-up: the unlit seal, revealed by one clockwise sweep of the hand */}
      <div aria-hidden className="pz-b pz-seal-dark pointer-events-none absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle closest-side, rgba(3,5,8,0.84) 98.5%, transparent 100%)' }} />
      <div aria-hidden className="pz-b pz-seal-hand pointer-events-none absolute inset-0 mix-blend-screen">
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg 300deg, rgba(240,205,140,0.10) 356deg, rgba(255,236,190,0.22) 359.5deg, transparent 360deg)' }} />
        <div className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2"
          style={{ background: `linear-gradient(0deg, transparent, ${CHAMPAGNE_HI} 40%, #fff)`, boxShadow: `0 0 6px ${CHAMPAGNE_HI}` }} />
      </div>

      {/* Light glint sweeping across the metal: first as the seal comes to full light, then at rest */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full mix-blend-screen">
        <div className="plaza-anim absolute -inset-y-1/4 left-0 w-1/3"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,246,220,0.2), transparent)', transform: 'translateX(-140%) rotate(18deg)', animation: `plazaGlint 8s ease-in-out ${T.sealSweep.at + T.sealSweep.ms - 250}ms infinite both` }} />
      </div>
    </div>
  );
}
