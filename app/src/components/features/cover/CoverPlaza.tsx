'use client';

import * as React from 'react';
import Link from 'next/link';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { worldFeatures } from '@/lib/geo/world';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, useClock, usePrefersReducedMotion, type EntryPath } from './entry';

const GOLD = '#e8c46b';
const GOLD_DEEP = '#a8792a';
const EMERALD = '#0c5a49';
const IVORY = '#f6eedb';

// Ground plane geometry (SVG units). The plaza centre sits under the seal.
const S = 2400, C = S / 2, ISLAND = 1180;
const RINGS = [{ r: 300, w: 36 }, { r: 560, w: 24 }, { r: 820, w: 20 }];

/** Deterministic 0..1 noise so the plaza is identical on server and client. */
function rnd(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/**
 * Cover · Plaza — the state as a civic plaza, drawn flat as a site plan at
 * golden hour. The national seal sits at the centre; avenues radiate from it, and
 * each way in (government, citizen, new institution) is a road you choose.
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

  return (
    <main className="relative h-[100dvh] min-h-[680px] overflow-hidden font-sans text-white [--gs:0.66] [--sy:47%] sm:[--gs:0.88] sm:[--sy:53%] lg:[--gs:1]"
>
      <Scenery />

      {/* Top rail */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-4 px-4 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-[#3b2a08]"
            style={{ background: `linear-gradient(145deg, #fff3c9, ${GOLD} 55%, ${GOLD_DEEP})` }}>CO</span>
          <span className="leading-tight drop-shadow">
            <span className="block text-[13px] font-bold tracking-[0.22em]">CIVICOS</span>
            <span className="hidden text-[9px] uppercase tracking-[0.2em] text-white/70 sm:block">Sovereign Operating System</span>
          </span>
        </span>
        <div className="ml-auto flex items-center gap-4 whitespace-nowrap font-mono text-[11px] text-white/85">
          <span className="hidden items-center gap-2 rounded-full bg-black/20 px-3 py-1 backdrop-blur-sm sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7ef0b8]" /> All systems operational
          </span>
          <span className="tabular-nums drop-shadow" suppressHydrationWarning>{clock}</span>
        </div>
      </header>

      {/* Title in the sky */}
      <div className="absolute inset-x-0 top-[76px] z-10 px-4 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.34em] text-white/80 drop-shadow">Sovereign digital public infrastructure</p>
        <h1 className="mx-auto mt-2 max-w-[26ch] text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.02em] [text-shadow:0_2px_18px_rgba(80,30,0,0.45)] sm:text-[2.6rem]">
          Every road leads to the state.
        </h1>
      </div>

      {/* The seal */}
      <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ top: 'var(--sy)', width: 'min(38vh, 72vw, 380px)', aspectRatio: '1' }}>
        <Seal />
      </div>

      {/* Roads in */}
      <nav aria-label="Choose your entrance" className="absolute inset-x-0 z-20 px-4"
        style={{ top: 'calc(var(--sy) + 264px * var(--gs) + 14px)' }}>
        <ul className="mx-auto flex max-w-[640px] flex-wrap justify-center gap-2.5">
          {ENTRY_PATHS.map((p, i) => {
            const on = open && p.k === path;
            return (
              <li key={p.k}>
                <button type="button" onClick={() => choose(p.k)}
                  className="group flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[14px] font-semibold backdrop-blur-md transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    borderColor: on ? GOLD : 'rgba(255,240,205,0.45)',
                    background: on ? 'rgba(12,90,73,0.85)' : 'rgba(18,32,28,0.45)',
                    boxShadow: on ? `0 0 0 3px ${GOLD}33, 0 10px 30px -10px rgba(0,0,0,0.6)` : '0 10px 30px -14px rgba(0,0,0,0.6)',
                  }}>
                  <span className="grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] text-[#3b2a08]" style={{ background: GOLD }}>{i + 1}</span>
                  {p.title}
                  <span aria-hidden className="text-white/60 transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign-in sheet */}
      {open && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/55 via-black/20 to-transparent p-3 sm:items-center sm:p-6"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={enter} aria-label={`Sign in — ${active.title}`}
            className="w-full max-w-[440px] animate-[plazaUp_.45s_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-[22px] border text-[#1d2a24] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
            style={{ borderColor: `${GOLD}88`, background: `linear-gradient(180deg, ${IVORY}, #efe3c6)` }}>
            <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: GOLD_DEEP }}>The {active.title.toLowerCase()} road</p>
                <h2 className="mt-1 text-[1.45rem] font-semibold tracking-[-0.02em]">{active.title === 'Citizen' ? 'Your services, your records' : active.title === 'Government' ? 'Enter the command of state' : 'Charter a new institution'}</h2>
                <p className="mt-1 text-[13.5px] text-[#5b6660]">{active.sub}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#5b6660] hover:bg-black/5">✕</button>
            </div>
            <div className="px-6 pb-6">
              {path === 'citizen' ? (
                <p className="rounded-[12px] bg-white/70 px-4 py-3 text-[13.5px] leading-relaxed text-[#3d4843] ring-1 ring-black/5">{CITIZEN_NOTE}</p>
              ) : (
                <>
                  <label htmlFor="plaza-email" className="sr-only">Work email</label>
                  <input id="plaza-email" type="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.currentTarget.value)}
                    placeholder="Work email · name@institution.gov"
                    className="w-full rounded-[12px] border border-black/10 bg-white px-4 py-3 text-[15px] placeholder:text-[#9aa29d] focus:outline-none focus:ring-4"
                    style={{ ['--tw-ring-color' as string]: `${EMERALD}26` }} />
                </>
              )}
              <button type="submit"
                className="mt-3 flex w-full items-center justify-between rounded-[12px] px-5 py-3.5 text-[15px] font-semibold text-[#fdf6e3] transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-4"
                style={{ background: `linear-gradient(180deg, #13785f, ${EMERALD})`, boxShadow: `inset 0 0 0 1px ${GOLD}66`, ['--tw-ring-color' as string]: `${GOLD}66` }}>
                {cta} <span aria-hidden>→</span>
              </button>
              <p className="mt-3 text-[12px] leading-relaxed text-[#6b746f]">{note}</p>
            </div>
          </form>
        </div>
      )}

      {/* Foot */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-10 text-[12px] text-white/75 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <nav aria-label="Public services" className="flex flex-wrap gap-x-4 gap-y-1">
          {PUBLIC_LINKS.map(l => <Link key={l.href} href={l.href} className="hover:text-white">{l.l}</Link>)}
        </nav>
        <span className="hidden font-mono text-[10.5px] text-white/60 sm:inline">Humans govern · Institutions govern · Constitutions govern · AI assists</span>
      </footer>

      <style>{'@keyframes plazaUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@keyframes plazaTwinkle{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.plaza-anim{animation:none!important}}'}</style>
    </main>
  );
}

/** Flat, top-down plan of the plaza centred on the seal. Decorative only. */
function Scenery() {
  return (
    <div aria-hidden className="absolute inset-0 bg-[#2c5232]">
      <div className="absolute left-1/2"
        style={{ top: 'var(--sy)', width: S, height: S, transform: 'translate(-50%, -50%) scale(var(--gs))', transformOrigin: '50% 50%' }}>
        <Ground />
      </div>
      {/* Golden-hour light: warm glow at the seal, sunlight from the upper left, soft vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% var(--sy), rgba(255,214,140,0.30), transparent 42%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,200,120,0.28) 0%, transparent 45%, rgba(20,40,60,0.25) 100%)', mixBlendMode: 'soft-light' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 75% at 50% var(--sy), transparent 50%, rgba(8,24,16,0.55) 100%)' }} />
      <div className="absolute inset-x-0 top-0 h-[230px] bg-gradient-to-b from-[#0d1f17]/75 via-[#0d1f17]/35 to-transparent" />
    </div>
  );
}

function Ground() {
  const g = React.useMemo(() => {
    const avenues = Array.from({ length: 8 }, (_, k) => ({ deg: k * 45, w: k % 2 === 0 ? 84 : 52 }));
    const trees: { x: number; y: number; r: number; t: number }[] = [];
    const bands: [number, number][] = [[338, 535], [588, 800], [846, 1120]];
    let n = 0;
    for (let k = 0; k < 8; k++) {
      for (const [r0, r1] of bands) {
        const count = Math.round((r1 - r0) / 14);
        for (let i = 0; i < count; i++) {
          n++;
          const r = r0 + rnd(n) * (r1 - r0);
          const margin = (Math.atan(52 / r) * 180) / Math.PI + 3;
          const span = 22.5 - margin;
          const a = ((k * 45 + 22.5 + (rnd(n + 0.5) * 2 - 1) * span) * Math.PI) / 180;
          trees.push({ x: C + r * Math.cos(a), y: C + r * Math.sin(a), r: 9 + rnd(n + 0.7) * 8, t: rnd(n + 0.9) });
        }
      }
    }
    const lamps: { x: number; y: number }[] = [];
    for (const av of avenues) {
      const a = (av.deg * Math.PI) / 180, nx = -Math.sin(a), ny = Math.cos(a);
      for (let d = 330; d < 1150; d += 52) {
        for (const s of [-1, 1]) {
          const off = s * (av.w / 2 - 5);
          lamps.push({ x: C + d * Math.cos(a) + off * nx, y: C + d * Math.sin(a) + off * ny });
        }
      }
    }
    return { avenues, trees, lamps };
  }, []);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <defs>
        <radialGradient id="plz-lawn" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#5e8a4d" /><stop offset="0.6" stopColor="#3e6b3d" /><stop offset="1" stopColor="#2c5232" />
        </radialGradient>
        <linearGradient id="plz-pool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#58c2c6" /><stop offset="1" stopColor="#2f8ea0" />
        </linearGradient>
        <filter id="plz-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3" /></filter>
        <clipPath id="plz-island"><circle cx={C} cy={C} r={ISLAND} /></clipPath>
      </defs>

      {/* Island and shore */}
      <circle cx={C} cy={C} r={ISLAND + 10} fill="#e9d6a6" />
      <circle cx={C} cy={C} r={ISLAND} fill="url(#plz-lawn)" />

      <g clipPath="url(#plz-island)">
        {/* Ring roads */}
        {RINGS.map(r => <circle key={r.r} cx={C} cy={C} r={r.r} fill="none" stroke="#eadcbe" strokeWidth={r.w} />)}
        {RINGS.map(r => <circle key={`e${r.r}`} cx={C} cy={C} r={r.r} fill="none" stroke="#c9b17e" strokeWidth={r.w + 2} strokeOpacity="0.35" strokeDasharray="1 0" style={{ mixBlendMode: 'multiply' }} />)}

        {/* Avenues radiating from the seal */}
        {g.avenues.map(av => (
          <g key={av.deg} transform={`rotate(${av.deg} ${C} ${C})`}>
            <rect x={C + 260} y={C - av.w / 2} width={ISLAND} height={av.w} fill="#f1e5c9" />
            <rect x={C + 260} y={C - av.w / 2} width={ISLAND} height={av.w} fill="none" stroke="#c9b17e" strokeWidth="2" />
            {av.w > 60 && (av.deg === 90 || av.deg === 270) ? (
              <>
                <rect x={C + 330} y={C - 34} width={ISLAND - 160} height={22} rx="3" fill="url(#plz-pool)" stroke="#e7f6f2" strokeWidth="2" />
                <rect x={C + 330} y={C + 12} width={ISLAND - 160} height={22} rx="3" fill="url(#plz-pool)" stroke="#e7f6f2" strokeWidth="2" />
                <rect x={C + 330} y={C - 6} width={ISLAND - 160} height={12} rx="6" fill="#2f6a3a" />
              </>
            ) : (
              <line x1={C + 280} y1={C} x2={C + ISLAND} y2={C} stroke="#d8c398" strokeWidth="2" strokeDasharray="14 12" />
            )}
          </g>
        ))}

        {/* Trees */}
        {g.trees.map((t, i) => (
          <g key={i}>
            <circle cx={t.x + 4} cy={t.y + 5} r={t.r} fill="#132a18" opacity="0.35" />
            <circle cx={t.x} cy={t.y} r={t.r} fill={t.t > 0.5 ? '#245a33' : '#2d6a3a'} />
            <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.5} fill="#4f8d4f" opacity="0.8" />
          </g>
        ))}

        {/* Lamps */}
        {g.lamps.map((l, i) => (
          <g key={i}>
            <circle cx={l.x} cy={l.y} r="7" fill="#ffd27a" opacity="0.45" filter="url(#plz-glow)" />
            <circle cx={l.x} cy={l.y} r="2.6" fill="#fff1c2" className="plaza-anim" style={{ animation: `plazaTwinkle ${2.4 + (i % 7) * 0.3}s ease-in-out infinite` }} />
          </g>
        ))}

        {/* Central plaza: moat, fountains, podium */}
        <circle cx={C} cy={C} r={262} fill="#efe3c6" stroke="#c9b17e" strokeWidth="3" />
        <circle cx={C} cy={C} r={242} fill="none" stroke="url(#plz-pool)" strokeWidth="34" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * 15 * Math.PI) / 180;
          return <circle key={i} cx={C + 242 * Math.cos(a)} cy={C + 242 * Math.sin(a)} r="5" fill="#ffffff" className="plaza-anim" style={{ animation: `plazaTwinkle ${1.6 + (i % 5) * 0.25}s ease-in-out infinite` }} />;
        })}
        <circle cx={C} cy={C} r={222} fill={IVORY} stroke={GOLD} strokeWidth="4" />
        <circle cx={C} cy={C} r={206} fill="none" stroke={GOLD_DEEP} strokeWidth="1.5" strokeOpacity="0.6" />

      </g>
    </svg>
  );
}

/** The national seal: a turning globe in gold on emerald, wreathed in laurel. */
function Seal() {
  const reduced = usePrefersReducedMotion();
  const land = React.useMemo(() => worldFeatures(), []);
  const grat = React.useMemo(() => geoGraticule10(), []);
  const [rot, setRot] = React.useState(-10);

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (t: number) => {
      acc += t - last; last = t;
      if (acc > 40) { setRot(r => r + acc * 0.006); acc = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const proj = geoOrthographic().scale(106).translate([0, 0]).rotate([rot, -14]).clipAngle(90);
  const gp = geoPath(proj);

  // Laurel: leaves along an arc on each side, meeting at the base.
  const leaves: { x: number; y: number; rot: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const deg = 102 + i * 10;
    const a = (deg * Math.PI) / 180;
    const rr = 126 + (i % 2 ? 9 : -6);
    for (const side of [1, -1]) {
      const ang = side === 1 ? a : Math.PI - a;
      leaves.push({ x: rr * Math.cos(ang), y: rr * Math.sin(ang), rot: (ang * 180) / Math.PI + 90 + side * (i % 2 ? -28 : 28) });
    }
  }
  const stars = Array.from({ length: 12 }, (_, i) => (i * 30 - 90) * (Math.PI / 180));

  return (
    <svg viewBox="-200 -200 400 400" className="h-full w-full" style={{ filter: 'drop-shadow(0 18px 40px rgba(60,30,0,0.55)) drop-shadow(0 0 30px rgba(255,210,120,0.35))' }}
      role="img" aria-label="CivicOS seal: a globe wreathed in laurel">
      <defs>
        <linearGradient id="seal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c9" /><stop offset="0.45" stopColor={GOLD} /><stop offset="1" stopColor={GOLD_DEEP} />
        </linearGradient>
        <radialGradient id="seal-ivory" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fffdf6" /><stop offset="1" stopColor="#eadcb9" />
        </radialGradient>
        <radialGradient id="seal-emerald" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#17806a" /><stop offset="0.7" stopColor={EMERALD} /><stop offset="1" stopColor="#063a2f" />
        </radialGradient>
        <path id="seal-ring-text" d="M0,0 m-171,0 a171,171 0 1,1 342,0 a171,171 0 1,1 -342,0" />
        <clipPath id="seal-globe"><circle r="106" /></clipPath>
      </defs>

      <circle r="198" fill="url(#seal-ivory)" stroke="url(#seal-gold)" strokeWidth="4" />
      <circle r="187" fill="none" stroke={GOLD_DEEP} strokeWidth="1" strokeOpacity="0.7" />
      <text fill={GOLD_DEEP} fontSize="12.5" fontWeight="700" letterSpacing="3">
        <textPath href="#seal-ring-text" textLength="1060" lengthAdjust="spacing">
          CIVICOS · SOVEREIGN OPERATING SYSTEM · HUMANS GOVERN · AI ASSISTS ·
        </textPath>
      </text>
      <circle r="158" fill="url(#seal-emerald)" stroke="url(#seal-gold)" strokeWidth="3.5" />
      {stars.map((a, i) => (
        <text key={i} x={146 * Math.cos(a)} y={146 * Math.sin(a) + 4} fill="url(#seal-gold)" fontSize="11" textAnchor="middle">★</text>
      ))}

      {/* Globe */}
      <g clipPath="url(#seal-globe)">
        <circle r="106" fill="#0a4d3e" />
        <path d={gp(grat) ?? ''} fill="none" stroke={GOLD} strokeOpacity="0.22" strokeWidth="0.7" />
        <path d={gp({ type: 'FeatureCollection', features: land } as never) ?? ''} fill="url(#seal-gold)" stroke="#7a5418" strokeWidth="0.35" />
        <circle r="106" fill="url(#seal-emerald)" opacity="0.18" />
      </g>
      <circle r="106" fill="none" stroke="url(#seal-gold)" strokeWidth="2.5" />

      {/* Laurel */}
      <path d="M -26 128 Q -90 110 -122 40 M 26 128 Q 90 110 122 40" fill="none" stroke="url(#seal-gold)" strokeWidth="2" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="12" ry="4.6" transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill="url(#seal-gold)" stroke="#7a5418" strokeWidth="0.4" />
      ))}
      <path d="M -30 140 L 0 126 L 30 140 M -16 150 L 0 132 L 16 150" fill="none" stroke="url(#seal-gold)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
