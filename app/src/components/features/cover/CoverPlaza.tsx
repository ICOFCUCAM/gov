'use client';

import * as React from 'react';
import Link from 'next/link';
import { geoAzimuthalEquidistant, geoPath } from 'd3-geo';
import { worldFeatures } from '@/lib/geo/world';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, useClock, useNationBrand, type EntryPath, type NationBrand } from './entry';

// Night palette: ink, champagne light and polished gold.
const INK = '#04060a';
const CHAMPAGNE = '#d9c398';
const CHAMPAGNE_HI = '#f4e4bd';
const GOLD_DEEP = '#7a5418';

// Ground plan geometry (SVG units). The plan is sized from the seal radius (--sr) so the
// seal's outer band always sits just inside the podium rims, at every screen size.
const GROUND_PER_SR = 14.02; // ground box width in seal radii
const S = 2400, C = S / 2, EXTENT = 1180;
const RINGS = [{ r: 300, w: 30 }, { r: 560, w: 20 }, { r: 820, w: 16 }];
const AVENUES = Array.from({ length: 8 }, (_, k) => ({ deg: k * 45, w: k % 2 === 0 ? 70 : 44 }));

/** Deterministic 0..1 noise so the plan is identical on server and client. */
function rnd(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/**
 * Cover · Plaza — the capital at night, seen from above. The national seal
 * stands at the centre in polished gold and enamel; avenues of light radiate
 * from it to every edge, and each way in is a road you choose.
 */
export function CoverPlaza() {
  const { path, setPath, email, setEmail, enter, note, cta } = useCoverEntry();
  const clock = useClock();
  const [open, setOpen] = React.useState(false);

  const choose = React.useCallback((k: EntryPath) => { setPath(k); setOpen(true); }, [setPath]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = ENTRY_PATHS[Number(e.key) - 1];
      if (p) { e.preventDefault(); choose(p.k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose]);

  const active = ENTRY_PATHS.find(p => p.k === path)!;
  const brand = useNationBrand();

  return (
    <main className="relative h-[100dvh] min-h-[680px] overflow-hidden font-sans text-[#f3efe6] [--sy:47%] sm:[--sy:53%]"
      style={{ background: INK, ['--sr' as string]: 'min(19vh, 36vw, 190px)' }}>
      <Scenery />

      {/* Top rail */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-4 px-4 sm:px-8">
        <span className="flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tracking-[0.08em]"
            style={{ borderColor: `${CHAMPAGNE}88`, color: CHAMPAGNE_HI, boxShadow: `inset 0 0 12px ${CHAMPAGNE}22` }}>{brand.seal}</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[12px] font-medium uppercase tracking-[0.3em]">{brand.name}</span>
            <span className="hidden truncate text-[9px] uppercase tracking-[0.26em] text-white/45 sm:block">{brand.motto}</span>
          </span>
        </span>
        <div className="ml-auto flex items-center gap-5 whitespace-nowrap font-mono text-[10.5px] tracking-[0.08em] text-white/55">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9be7c4] shadow-[0_0_8px_#9be7c4]" /> ALL SYSTEMS OPERATIONAL
          </span>
          <span className="tabular-nums text-white/75" suppressHydrationWarning>{clock}</span>
        </div>
      </header>

      {/* Title */}
      <div className="absolute inset-x-0 top-[78px] z-10 px-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.42em]" style={{ color: CHAMPAGNE }}>{brand.configured ? brand.platform : 'Sovereign digital public infrastructure'}</p>
        <h1 className="mx-auto mt-3 max-w-[26ch] text-[1.85rem] font-light leading-[1.08] tracking-[-0.03em] sm:text-[2.9rem]">
          Every road leads to <span className="bg-clip-text font-normal text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>the state.</span>
        </h1>
      </div>

      {/* The seal */}
      <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ top: 'var(--sy)', width: 'calc(var(--sr) * 2.5)', aspectRatio: '1' }}>
        <Seal brand={brand} />
      </div>

      {/* Roads in */}
      <nav aria-label="Choose your entrance" className="absolute inset-x-0 z-20 px-4"
        style={{ top: 'calc(var(--sy) + var(--sr) * 1.52 + 14px)' }}>
        <ul className="mx-auto flex max-w-[680px] flex-wrap justify-center gap-2.5">
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

      {/* Foot */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-12 text-[12px] text-white/55 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <nav aria-label="Public services" className="flex flex-wrap gap-x-5 gap-y-1">
          {PUBLIC_LINKS.map(l => <Link key={l.href} href={l.href} className="transition-colors hover:text-[#f4e4bd]">{l.l}</Link>)}
        </nav>
        <span className="hidden font-mono text-[10px] tracking-[0.12em] text-white/35 sm:inline">{brand.configured ? `© ${new Date().getFullYear()} ${brand.name.toUpperCase()} · POWERED BY CIVICOS` : 'HUMANS GOVERN · INSTITUTIONS GOVERN · CONSTITUTIONS GOVERN'}</span>
      </footer>

      <style>{`
        @keyframes plazaUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes plazaPulse{0%,100%{opacity:.35}50%{opacity:1}}
        @keyframes plazaTrail{to{stroke-dashoffset:-640}}
        @keyframes plazaGlint{0%,62%{transform:translateX(-140%) rotate(18deg)}100%{transform:translateX(140%) rotate(18deg)}}
        @media (prefers-reduced-motion:reduce){.plaza-anim{animation:none!important}}
      `}</style>
    </main>
  );
}

/** The capital at night, drawn as a plan centred on the seal. Decorative only. */
function Scenery() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 60% at 50% var(--sy), #0d1420 0%, ${INK} 75%)` }} />
      <div className="absolute left-1/2"
        style={{ top: 'var(--sy)', width: `calc(var(--sr) * ${GROUND_PER_SR})`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
        <Ground />
      </div>
      {/* Warm civic glow at the centre, deep vignette, title shade, film grain */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% var(--sy), rgba(244,214,150,0.16), transparent 34%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 70% at 50% var(--sy), transparent 40%, rgba(2,3,6,0.85) 100%)' }} />
      <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

function Ground() {
  const g = React.useMemo(() => {
    // City lights: warm points in the blocks between avenues and ring roads.
    const lights: { x: number; y: number; r: number; o: number; warm: boolean }[] = [];
    for (let i = 0; i < 2600; i++) {
      const r = 290 + Math.sqrt(rnd(i)) * 900;
      const a = rnd(i + 0.31) * Math.PI * 2;
      const deg = ((a * 180) / Math.PI) % 45;
      const off = Math.min(deg, 45 - deg) * (Math.PI / 180) * r; // px from nearest avenue centre
      if (off < 46) continue;
      if (r < 280 || RINGS.some(ring => Math.abs(r - ring.r) < ring.w)) continue;
      const near = Math.max(0, 1 - (r - 290) / 900);
      lights.push({ x: C + r * Math.cos(a), y: C + r * Math.sin(a), r: 0.7 + rnd(i + 0.7) * 1.4, o: 0.25 + rnd(i + 0.9) * 0.6 * (0.5 + near), warm: rnd(i + 0.5) > 0.22 });
    }
    return { lights };
  }, []);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="block h-full w-full">
      <defs>
        <filter id="plz-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="plz-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter>
        <linearGradient id="plz-pool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0d2a33" /><stop offset="0.5" stopColor="#16404a" /><stop offset="1" stopColor="#0a1f27" />
        </linearGradient>
        <radialGradient id="plz-obsidian" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#141a24" /><stop offset="1" stopColor="#06080d" />
        </radialGradient>
      </defs>

      {/* Engraved survey rings — the plan's fine texture */}
      {Array.from({ length: 28 }).map((_, i) => (
        <circle key={i} cx={C} cy={C} r={290 + i * 32} fill="none" stroke={CHAMPAGNE} strokeOpacity={0.035} strokeWidth="1" />
      ))}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i * 7.5 * Math.PI) / 180;
        return <line key={i} x1={C + 280 * Math.cos(a)} y1={C + 280 * Math.sin(a)} x2={C + EXTENT * Math.cos(a)} y2={C + EXTENT * Math.sin(a)} stroke={CHAMPAGNE} strokeOpacity="0.03" />;
      })}

      {/* City lights */}
      {g.lights.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.warm ? '#ffd9a0' : '#cfe3ff'} opacity={l.o} />
      ))}

      {/* Ring roads: bloom + twin hairlines */}
      {RINGS.map(r => (
        <g key={r.r}>
          <circle cx={C} cy={C} r={r.r} fill="none" stroke="#f0cf8e" strokeOpacity="0.16" strokeWidth={r.w} filter="url(#plz-bloom)" />
          <circle cx={C} cy={C} r={r.r - r.w / 2} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.55" strokeWidth="1" />
          <circle cx={C} cy={C} r={r.r + r.w / 2} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.55" strokeWidth="1" />
          <circle cx={C} cy={C} r={r.r} fill="none" stroke={CHAMPAGNE_HI} strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="1 9" />
        </g>
      ))}

      {/* Avenues of light radiating from the seal */}
      {AVENUES.map((av, k) => {
        const main = av.deg === 90 || av.deg === 270;
        return (
          <g key={av.deg} transform={`rotate(${av.deg} ${C} ${C})`}>
            <rect x={C + 262} y={C - av.w / 2} width={EXTENT} height={av.w} fill="#f0cf8e" opacity="0.07" filter="url(#plz-bloom)" />
            <line x1={C + 262} y1={C - av.w / 2} x2={C + EXTENT + 262} y2={C - av.w / 2} stroke={CHAMPAGNE} strokeOpacity="0.6" />
            <line x1={C + 262} y1={C + av.w / 2} x2={C + EXTENT + 262} y2={C + av.w / 2} stroke={CHAMPAGNE} strokeOpacity="0.6" />
            {main ? (
              <>
                <rect x={C + 300} y={C - 28} width={EXTENT - 120} height={18} fill="url(#plz-pool)" stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.8" />
                <rect x={C + 300} y={C + 10} width={EXTENT - 120} height={18} fill="url(#plz-pool)" stroke={CHAMPAGNE} strokeOpacity="0.45" strokeWidth="0.8" />
                <line x1={C + 300} y1={C - 19} x2={C + EXTENT + 180} y2={C - 19} stroke="#9fd6e0" strokeOpacity="0.25" strokeDasharray="40 30" />
                <line x1={C + 300} y1={C + 19} x2={C + EXTENT + 180} y2={C + 19} stroke="#9fd6e0" strokeOpacity="0.25" strokeDasharray="40 30" />
              </>
            ) : (
              <line x1={C + 270} y1={C} x2={C + EXTENT + 262} y2={C} stroke={CHAMPAGNE} strokeOpacity="0.28" strokeDasharray="10 14" />
            )}
            {/* Light trails moving along the avenue */}
            {[-1, 1].map(side => (
              <line key={side} x1={C + 270} y1={C + side * (av.w / 2 - 8)} x2={C + EXTENT + 262} y2={C + side * (av.w / 2 - 8)}
                stroke={side > 0 ? '#ffe1a6' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 78" strokeOpacity="0.9"
                className="plaza-anim" style={{ animation: `plazaTrail ${9 + (k % 3) * 2}s linear infinite`, animationDirection: side > 0 ? 'normal' : 'reverse' }} />
            ))}
          </g>
        );
      })}

      {/* Central plaza: obsidian podium, dark-glass moat, gold rims */}
      <circle cx={C} cy={C} r={268} fill="url(#plz-obsidian)" />
      <circle cx={C} cy={C} r={268} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.7" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={262} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.25" strokeWidth="1" />
      <circle cx={C} cy={C} r={MOAT_R} fill="none" stroke="#08161b" strokeWidth="24" />
      <circle cx={C} cy={C} r={MOAT_R} fill="none" stroke="#6fb8c6" strokeOpacity="0.12" strokeWidth="24" filter="url(#plz-soft)" />
      <circle cx={C} cy={C} r={MOAT_R - 12} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.4" strokeWidth="0.8" />
      <circle cx={C} cy={C} r={MOAT_R + 12} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.4" strokeWidth="0.8" />
      {Array.from({ length: 36 }).map((_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        return <circle key={i} cx={C + MOAT_R * Math.cos(a)} cy={C + MOAT_R * Math.sin(a)} r="1.8" fill="#eaf8ff" className="plaza-anim" style={{ animation: `plazaPulse ${2 + (i % 6) * 0.35}s ease-in-out infinite` }} />;
      })}
      <circle cx={C} cy={C} r={226} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.8" strokeWidth="1.2" />
      <circle cx={C} cy={C} r={220} fill="none" stroke={CHAMPAGNE} strokeOpacity="0.3" strokeWidth="1" />
    </svg>
  );
}

const MOAT_R = 244;

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

/**
 * The national seal: polished gold rim, black enamel band engraved with the
 * nation's name across the top and its motto across the bottom, and a
 * UN-emblem world map in gold on emerald, wreathed in laurel.
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
      leaves.push({ x: rr * Math.cos(ang), y: rr * Math.sin(ang), rot: (ang * 180) / Math.PI + 90 + side * (i % 2 ? -26 : 26) });
    }
  }

  return (
    <div className="relative h-full w-full">
      <svg viewBox="-250 -250 500 500" className="h-full w-full"
        style={{ filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.85)) drop-shadow(0 0 40px rgba(240,205,140,0.18))' }}
        role="img" aria-label={`Seal of ${brand.configured ? `${brand.name}${brand.motto ? ` — ${brand.motto}` : ''}` : 'CivicOS'}: Sovereign Digital Institution, ${brand.platform}`}>
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

        {/* Dark outer ring carrying the nation's name and motto */}
        <circle r="249" fill="url(#seal-obsidian)" />
        <circle r="248" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.75" strokeWidth="1.4" />
        <circle r="243" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.25" strokeWidth="0.8" />
        <circle r="205" fill="none" stroke={CHAMPAGNE} strokeOpacity="0.25" strokeWidth="0.8" />
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

        {/* Bevelled metal rim and black enamel band */}
        <circle r="199" fill="url(#seal-metal)" />
        <circle r="194" fill="url(#seal-metal-r)" />
        <circle r="191" fill="url(#seal-band)" />
        <circle r="190.5" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />

        {/* Inscriptions — name above, motto below, once each */}
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

        {/* Inner rim and emerald field */}
        <circle r="150" fill="url(#seal-metal)" />
        <circle r="146" fill="url(#seal-metal-r)" />
        <circle r="143" fill="url(#seal-enamel)" />
        <g opacity="0.14">
          {Array.from({ length: 24 }).map((_, i) => (
            <ellipse key={i} rx="140" ry="58" fill="none" stroke="#e9cf8a" strokeWidth="0.35" transform={`rotate(${i * 7.5})`} />
          ))}
        </g>

        {/* UN-emblem map: polar projection, concentric parallels and meridians */}
        <g clipPath="url(#seal-map)">
          <circle r={MAP_R} fill="#03241d" />
          <path d={landPath} fill="url(#seal-leaf)" fillOpacity="0.95" stroke="#fff0c4" strokeOpacity="0.5" strokeWidth="0.3" />
        </g>
        <g fill="none" stroke="#f2dc9e" strokeOpacity="0.55" strokeWidth="0.7">
          {[1, 2, 3, 4].map(k => <circle key={k} r={(MAP_R * k) / 5} />)}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return <line key={i} x1="0" y1="0" x2={MAP_R * Math.cos(a)} y2={MAP_R * Math.sin(a)} />;
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

      {/* Light glint sweeping across the metal */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full mix-blend-screen">
        <div className="plaza-anim absolute -inset-y-1/4 left-0 w-1/3"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,246,220,0.28), transparent)', animation: 'plazaGlint 7s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
