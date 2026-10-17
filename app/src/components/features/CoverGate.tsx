'use client';

import * as React from 'react';
import Link from 'next/link';
import { ACCENT } from '@/components/features/SituationRoom';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, usePathKeys, useClock, useNationBrand, type EntryPath as Path } from './cover/entry';

type Layer = 'humans' | 'institutions' | 'constitution';

// The doctrine, drawn as the system's own architecture. Top to bottom.
const LAYERS: { k: Layer; name: string; verb: string; sub: string; hue: string }[] = [
  { k: 'humans', name: 'Humans', verb: 'govern', sub: 'Officers · citizens · consent', hue: '#62b6ff' },
  { k: 'institutions', name: 'Institutions', verb: 'govern', sub: 'Ministries · agencies · charters', hue: ACCENT },
  { k: 'constitution', name: 'Constitution', verb: 'governs', sub: 'Rights · powers · separation', hue: '#34d39c' },
];

// Each entry path lands in one layer of the stack.
const LAYER_OF: Record<Path, Layer> = { officer: 'institutions', citizen: 'humans', institution: 'constitution' };
const PATHS = ENTRY_PATHS.map(p => ({ ...p, layer: LAYER_OF[p.k] }));


/**
 * Cover gate — the first thing anyone meets. Shows the system's governing
 * architecture, takes an entry path, and hands off to the existing sign-in
 * surfaces (/sign-in, /login); never replaces them.
 */
export function CoverGate() {
  const { path, setPath, email, setEmail, live, enter, note, cta } = useCoverEntry();
  usePathKeys(setPath);
  const clock = useClock();
  const active = PATHS.find(p => p.k === path)!;
  const brand = useNationBrand();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060a12] font-sans text-[#e2e9f3]">
      {/* Engineering grid + horizon glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(55,199,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 35% 45%, #000 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 35% 45%, #000 30%, transparent 85%)',
        }} />
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 45% 40% at 30% 55%, rgba(55,199,212,0.10), transparent 70%)' }} />

      <div className="relative mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 sm:px-8">
        {/* Status rail */}
        <header className="flex h-16 items-center gap-4 border-b border-[#16202f]">
          <span className="flex items-center gap-2.5">
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[4px] text-[12px] font-bold ${brand.configured ? 'text-white ring-1 ring-white/15' : 'text-[#04121a]'}`}
              style={{ background: brand.configured ? brand.accent : ACCENT }}>{brand.seal}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-bold tracking-[0.2em] uppercase">{brand.name}</span>
              <span className="block truncate text-[9px] uppercase tracking-[0.18em] text-[#65748b]">{brand.motto}</span>
            </span>
          </span>
          <div className="ml-auto flex items-center gap-5 font-mono text-[11px] text-[#7d8ba0]">
            <span className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34d39c]" />
              All systems operational
            </span>
            <span className="hidden md:inline">ENV · {live === false ? 'PROTOTYPE' : 'PRODUCTION'}</span>
            <span className="tabular-nums text-[#c5d0df]" suppressHydrationWarning>{clock}</span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:py-12">
          {/* Architecture */}
          <section aria-labelledby="cover-title" className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
              {brand.configured ? 'Official government platform' : 'Sovereign digital public infrastructure'}
            </p>
            <h1 id="cover-title" className="mt-4 max-w-[16ch] text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.025em] sm:text-[3.4rem]">
              The operating system of the&nbsp;state.
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[#94a3b8]">
              Every decision rests on the layer beneath it. Constitutions bound institutions,
              and institutions serve the people.
            </p>
            <Stack activeLayer={active.layer} />
          </section>

          {/* Entry */}
          <section aria-label="Sign in" className="w-full lg:max-w-[460px] lg:justify-self-end">
            <form onSubmit={enter}
              className="rounded-[10px] border border-[#1a2536] bg-[#0b111c]/90 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur sm:p-7">
              <div className="flex items-baseline justify-between">
                <h2 className="min-w-0 truncate text-lg font-semibold">Enter {brand.name}</h2>
                <span className="hidden font-mono text-[10px] text-[#56647a] sm:inline">press 1 · 2 · 3</span>
              </div>

              <fieldset className="mt-5">
                <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">01 · Who are you</legend>
                <div className="mt-3 divide-y divide-[#16202f] overflow-hidden rounded-[8px] border border-[#16202f]">
                  {PATHS.map((p, i) => {
                    const on = p.k === path;
                    const hue = LAYERS.find(l => l.k === p.layer)!.hue;
                    return (
                      <label key={p.k}
                        className="relative flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors focus-within:bg-[#111a29] hover:bg-[#0f1725]"
                        style={{ background: on ? 'linear-gradient(90deg, rgba(55,199,212,0.10), transparent 80%)' : undefined }}>
                        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] transition-opacity" style={{ background: hue, opacity: on ? 1 : 0 }} />
                        <input type="radio" name="path" value={p.k} checked={on} onChange={() => setPath(p.k)} className="sr-only" />
                        <span className="font-mono text-[12px] tabular-nums" style={{ color: on ? hue : '#4a576b' }}>0{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[15px] font-semibold ${on ? 'text-white' : 'text-[#c5d0df]'}`}>{p.title}</span>
                          <span className="block text-[12.5px] leading-snug text-[#7d8ba0]">{p.sub}</span>
                        </span>
                        <span aria-hidden className="text-[15px] transition-transform" style={{ color: on ? hue : '#334055', transform: on ? 'translateX(0)' : 'translateX(-4px)' }}>→</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">02 · Verify</p>
                {path === 'citizen' ? (
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[#94a3b8]">
                    {CITIZEN_NOTE}
                  </p>
                ) : (
                  <>
                    <label htmlFor="cover-email" className="sr-only">Work email</label>
                    <input id="cover-email" type="email" autoComplete="email" value={email}
                      onChange={e => setEmail(e.currentTarget.value)}
                      placeholder="work email · name@institution.gov"
                      className="mt-3 w-full rounded-[6px] border border-[#1f2b3e] bg-[#070c15] px-3.5 py-3 font-mono text-[13.5px] text-[#e2e9f3] placeholder:text-[#4a576b] focus:border-[#37c7d4] focus:outline-none" />
                  </>
                )}
              </div>

              <button type="submit"
                className="group mt-5 flex w-full items-center justify-between rounded-[6px] px-4 py-3 text-[14px] font-semibold text-[#03141a] transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={{ background: ACCENT }}>
                {cta}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </button>

              <p className="mt-4 text-[12px] leading-relaxed text-[#65748b]">
                {note}
              </p>
            </form>

            <nav aria-label="Public services" className="mt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#56647a]">Open to everyone · no sign-in</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                {PUBLIC_LINKS.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="group flex items-center justify-between border-b border-[#131c2a] py-2 text-[13px] text-[#94a3b8] hover:text-white">
                      {l.l}<span aria-hidden className="text-[#3a4759] group-hover:text-[#37c7d4]">↗</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-[#16202f] py-5 font-mono text-[10.5px] text-[#4f5c70] sm:flex-row sm:justify-between">
          <span>Humans govern · Institutions govern · Constitutions govern</span>
          <span>Open standards · zero tracking · © {new Date().getFullYear()} {brand.name}{brand.configured ? ' · Powered by CivicOS' : ''}</span>
        </footer>
      </div>
    </main>
  );
}

/** Isometric governance stack. The chosen entry path lights the layer it lands in. */
function Stack({ activeLayer }: { activeLayer: Layer }) {
  const cx = 200, hw = 165, hd = 52, th = 10, gap = 78, top = 24;
  const n = LAYERS.length;
  return (
    <div className="mt-8 w-full max-w-[640px]">
      <svg viewBox="0 0 600 300" className="h-auto w-full" role="img"
        aria-label="Governance stack: Constitution governs, Institutions govern, Humans govern">
        <defs>
          {LAYERS.map(l => (
            <linearGradient key={l.k} id={`face-${l.k}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={l.hue} stopOpacity="0.30" />
              <stop offset="1" stopColor={l.hue} stopOpacity="0.06" />
            </linearGradient>
          ))}
        </defs>

        {/* Bottom-up so upper slabs sit over lower ones */}
        {[...LAYERS].reverse().map((l, ri) => {
          const i = n - 1 - ri;
          const y = top + i * gap;
          const on = l.k === activeLayer;
          const topFace = `${cx},${y} ${cx + hw},${y + hd} ${cx},${y + 2 * hd} ${cx - hw},${y + hd}`;
          const left = `${cx - hw},${y + hd} ${cx},${y + 2 * hd} ${cx},${y + 2 * hd + th} ${cx - hw},${y + hd + th}`;
          const right = `${cx + hw},${y + hd} ${cx},${y + 2 * hd} ${cx},${y + 2 * hd + th} ${cx + hw},${y + hd + th}`;
          const lx = cx + hw + 22;
          return (
            <g key={l.k} style={{ opacity: on ? 1 : 0.55, transition: 'opacity 300ms' }}>
              <polygon points={left} fill={l.hue} fillOpacity={on ? 0.35 : 0.18} />
              <polygon points={right} fill={l.hue} fillOpacity={on ? 0.22 : 0.1} />
              <polygon points={topFace} fill={`url(#face-${l.k})`}
                stroke={l.hue} strokeWidth={on ? 1.4 : 0.8}
                style={on ? { filter: `drop-shadow(0 0 10px ${l.hue}88)` } : undefined} />
              {/* node lattice on the face */}
              {[-0.5, 0, 0.5].flatMap(u => [-0.5, 0, 0.5].map(v => {
                const px = cx + (u - v) * hw * 0.55, py = y + hd + (u + v) * hd * 0.55;
                return <circle key={`${u}:${v}`} cx={px} cy={py} r={1.6} fill={l.hue} fillOpacity={0.7} />;
              }))}
              <line x1={cx + hw} y1={y + hd} x2={lx - 6} y2={y + hd} stroke={l.hue} strokeOpacity="0.5" strokeWidth="0.8" />
              <text x={lx} y={y + hd - 3} fill="#e2e9f3" fontSize="15" fontWeight="600">
                {l.name} <tspan fill={l.hue} fontWeight="500">{l.verb}</tspan>
              </text>
              <text x={lx} y={y + hd + 14} fill="#6b7a90" fontSize="10.5" fontFamily="ui-monospace, monospace">{l.sub}</text>
            </g>
          );
        })}

        {/* Signal flow — decisions rise from the constitutional base */}
        {[-70, 0, 70].map((dx, i) => {
          const x = cx + dx, y0 = top + (n - 1) * gap + hd + 6, y1 = top + hd;
          return (
            <g key={dx}>
              <line x1={x} y1={y0} x2={x} y2={y1} stroke={ACCENT} strokeOpacity="0.18" strokeDasharray="2 4" />
              <circle r="2.4" cx={x} cy={y0} opacity="0" fill={ACCENT} className="motion-reduce:hidden">
                <animateMotion dur={`${3.2 + i * 0.7}s`} repeatCount="indefinite" begin={`${i * 0.9}s`} path={`M${x},${y0} L${x},${y1}`} />
                <animate attributeName="opacity" values="0;1;1;0" dur={`${3.2 + i * 0.7}s`} repeatCount="indefinite" begin={`${i * 0.9}s`} />
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
