'use client';

import * as React from 'react';
import Link from 'next/link';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { worldFeatures } from '@/lib/geo/world';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, usePathKeys, usePrefersReducedMotion } from './entry';

const INK = '#0c1424';
const COBALT = '#2348d8';
const STONE = '#f3f1ec';

const PILLARS = [
  { t: 'Constitution-bound', d: 'Every decision is checked against the powers that permit it.' },
  { t: 'Audited by default', d: 'An append-only chain records who did what, and why.' },
  { t: 'Citizen-owned data', d: 'People see who viewed their records — and can leave with them.' },
  { t: 'Open standards', d: 'Federates with any institution. Zero third-party tracking.' },
];

/**
 * Cover · Atlas — a light, editorial cover: the nation in its world on a
 * slowly turning globe, with sign-in placed above the fold.
 */
export function CoverAtlas() {
  const { path, setPath, email, setEmail, enter, note, cta } = useCoverEntry();
  usePathKeys(setPath);
  const idx = ENTRY_PATHS.findIndex(p => p.k === path);

  return (
    <main className="min-h-screen font-sans" style={{ background: STONE, color: INK }}>
      <header className="mx-auto flex h-[72px] max-w-[1280px] items-center gap-8 px-4 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[9px] text-[12px] font-bold text-white" style={{ background: INK }}>CO</span>
          <span className="text-[15px] font-semibold tracking-tight">CivicOS</span>
        </span>
        <nav aria-label="Primary" className="hidden items-center gap-6 text-[13.5px] text-[#4a5568] md:flex">
          <Link href="/government" className="hover:text-black">Government</Link>
          <Link href="/portal" className="hover:text-black">Citizens</Link>
          <Link href="/wallet/documents" className="hover:text-black">Verify</Link>
          <Link href="/developers" className="hover:text-black">Developers</Link>
        </nav>
        <span className="ml-auto hidden items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[12px] text-[#4a5568] sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1f9d6b]" /> All systems operational
        </span>
      </header>

      <section className="mx-auto grid max-w-[1280px] items-center gap-6 px-4 pb-8 pt-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-4 lg:pt-10">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-medium text-[#4a5568]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COBALT }} /> Sovereign digital public infrastructure
          </p>
          <h1 className="mt-5 max-w-[13ch] text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[4.1rem]">
            A nation, running on one trusted&nbsp;system.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-[#4a5568]">
            Ministries, officers and citizens on a single platform — bound by the constitution,
            audited end to end, with AI that advises and never decides.
          </p>

          <form onSubmit={enter}
            className="mt-8 w-full max-w-[480px] rounded-[20px] border border-black/[0.06] bg-white p-2 shadow-[0_1px_2px_rgba(12,20,36,0.06),0_24px_48px_-24px_rgba(12,20,36,0.25)]">
            <fieldset className="relative grid grid-cols-3 rounded-[14px] bg-[#f1f2f5] p-1">
              <legend className="sr-only">Who are you</legend>
              <span aria-hidden className="absolute bottom-1 top-1 rounded-[11px] bg-white shadow-[0_1px_3px_rgba(12,20,36,0.12)] transition-transform duration-300 ease-out"
                style={{ width: 'calc((100% - 8px) / 3)', left: 4, transform: `translateX(${idx * 100}%)` }} />
              {ENTRY_PATHS.map(p => (
                <label key={p.k} className={`relative z-10 cursor-pointer rounded-[11px] py-2.5 text-center text-[13.5px] font-medium transition-colors focus-within:ring-2 focus-within:ring-[#2348d8]/40 ${p.k === path ? 'text-black' : 'text-[#6b7280] hover:text-black'}`}>
                  <input type="radio" name="path" value={p.k} checked={p.k === path} onChange={() => setPath(p.k)} className="sr-only" />
                  {p.title}
                </label>
              ))}
            </fieldset>
            <div className="px-4 pb-4 pt-4">
              <p className="text-[13px] text-[#6b7280]">{ENTRY_PATHS[idx]!.sub}</p>
              {path === 'citizen' ? (
                <p className="mt-3 rounded-[12px] bg-[#f6f7f9] px-4 py-3 text-[13.5px] leading-relaxed text-[#374151]">{CITIZEN_NOTE}</p>
              ) : (
                <>
                  <label htmlFor="atlas-email" className="sr-only">Work email</label>
                  <input id="atlas-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.currentTarget.value)}
                    placeholder="Work email"
                    className="mt-3 w-full rounded-[12px] border border-black/10 bg-white px-4 py-3 text-[15px] placeholder:text-[#9ca3af] focus:border-[#2348d8] focus:outline-none focus:ring-4 focus:ring-[#2348d8]/10" />
                </>
              )}
              <button type="submit"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-3 text-[15px] font-semibold text-white transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2348d8]/30"
                style={{ background: COBALT }}>
                {cta} <span aria-hidden>→</span>
              </button>
              <p className="mt-3 text-[12px] leading-relaxed text-[#8a93a3]">{note}</p>
            </div>
          </form>
        </div>

        <div className="relative -mx-4 sm:mx-0">
          <Globe />
        </div>
      </section>

      <section aria-label="Principles" className="mx-auto grid max-w-[1280px] gap-x-8 gap-y-6 px-4 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {PILLARS.map((p, i) => (
          <div key={p.t} className="border-t border-black/15 pt-4">
            <p className="font-mono text-[11px] text-[#8a93a3]">0{i + 1}</p>
            <h2 className="mt-2 text-[16px] font-semibold tracking-tight">{p.t}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5568]">{p.d}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto flex max-w-[1280px] flex-col gap-4 border-t border-black/10 px-4 py-8 text-[13px] text-[#6b7280] sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Public services" className="flex flex-wrap gap-x-5 gap-y-2">
          {PUBLIC_LINKS.map(l => <Link key={l.href} href={l.href} className="hover:text-black">{l.l}</Link>)}
        </nav>
        <span>Humans govern · Institutions govern · Constitutions govern · AI assists</span>
      </footer>
    </main>
  );
}

// Federation links drawn as great-circle arcs (lon, lat).
const NODES: [number, number][] = [[-0.19, 5.6], [3.38, 6.52], [36.82, -1.29], [28.05, -26.2], [-17.45, 14.7], [31.24, 30.04], [7.49, 9.06], [2.35, 48.86], [-77.04, 38.9], [103.82, 1.35]];
const ARCS: [number, number][] = [[0, 1], [1, 6], [6, 2], [2, 3], [0, 4], [6, 5], [5, 7], [4, 8], [2, 9]];

function Globe() {
  const reduced = usePrefersReducedMotion();
  const size = 640;
  const land = React.useMemo(() => worldFeatures(), []);
  const grat = React.useMemo(() => geoGraticule10(), []);
  const [rot, setRot] = React.useState(-12);

  React.useEffect(() => {
    if (reduced) return;
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (t: number) => {
      acc += t - last; last = t;
      if (acc > 33) { setRot(r => r + acc * 0.004); acc = 0; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const proj = geoOrthographic().scale(size * 0.44).translate([size / 2, size / 2]).rotate([rot, -14]).clipAngle(90);
  const gp = geoPath(proj);
  const back = geoOrthographic().scale(size * 0.44).translate([size / 2, size / 2]).rotate([rot, -14]).clipAngle(180);
  const visible = (c: [number, number]) => { const p = proj(c); return p && gp({ type: 'Point', coordinates: c }) ? p : null; };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block h-auto w-full max-w-[640px]" role="img" aria-label="A turning globe showing federated institutions linked across the world">
      <defs>
        <radialGradient id="atlas-sea" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#eceef3" />
          <stop offset="1" stopColor="#dcdfe7" />
        </radialGradient>
        <radialGradient id="atlas-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0.82" stopColor={COBALT} stopOpacity="0.10" />
          <stop offset="1" stopColor={COBALT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size * 0.5} fill="url(#atlas-halo)" />
      <path d={gp({ type: 'Sphere' }) ?? ''} fill="url(#atlas-sea)" stroke="rgba(12,20,36,0.12)" />
      {/* far side, ghosted */}
      <path d={geoPath(back)({ type: 'FeatureCollection', features: land } as never) ?? ''} fill="none" stroke="rgba(12,20,36,0.05)" strokeWidth="0.5" />
      <path d={gp(grat) ?? ''} fill="none" stroke="rgba(12,20,36,0.07)" strokeWidth="0.6" />
      {land.map((f, i) => (
        <path key={i} d={gp(f as never) ?? ''} fill="#c9cfdb" stroke="#f3f1ec" strokeWidth="0.6" />
      ))}
      {ARCS.map(([a, b], i) => {
        const d = gp({ type: 'LineString', coordinates: [NODES[a]!, NODES[b]!] });
        return d ? <path key={i} d={d} fill="none" stroke={COBALT} strokeWidth="1.3" strokeOpacity="0.75" strokeDasharray="3 4" /> : null;
      })}
      {NODES.map((c, i) => {
        const p = visible(c);
        return p ? (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="7" fill={COBALT} fillOpacity="0.12" />
            <circle cx={p[0]} cy={p[1]} r="2.8" fill={COBALT} stroke="#fff" strokeWidth="1.2" />
          </g>
        ) : null;
      })}
    </svg>
  );
}
