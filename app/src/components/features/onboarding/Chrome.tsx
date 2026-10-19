'use client';

import * as React from 'react';
import Link from 'next/link';
import { useClock, useNationBrand } from '@/components/features/cover/entry';
import { SkipLink } from '@/components/ui/SkipLink';
import { INSTITUTIONAL } from '@/lib/theme/tokens';

// Night palette shared with the cover: ink, champagne light and polished gold.
export const INK = '#04060a';
export const CHAMPAGNE = '#d9c398';
export const CHAMPAGNE_HI = '#f4e4bd';
export const GOLD = 'linear-gradient(180deg, #f4e4bd, #d9c398 55%, #b8955a)';
export const hair = (a: number) => `rgba(217,195,152,${a})`;

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** Page frame shared by the cover's follow-on surfaces (setup, welcome):
 *  the cover's night palette laid over a fine drafting grid, with an
 *  engraved header rail and a measured footer. */
export function OnboardingFrame({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const clock = useClock();
  const brand = useNationBrand();
  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-[#f3efe6] [color-scheme:dark] selection:bg-[#d9c398]/30" style={{ background: INK }}>
      <SkipLink style={{ background: INSTITUTIONAL.champagneHi, color: INSTITUTIONAL.ground }} />
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 sm:px-8">
        <header className="relative flex h-16 shrink-0 items-center gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3 no-underline">
            <span aria-hidden className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tracking-[0.08em]"
              style={{ borderColor: hair(0.55), color: CHAMPAGNE_HI, boxShadow: `inset 0 0 12px ${hair(0.14)}, 0 0 0 3px ${INK}, 0 0 0 4px ${hair(0.14)}` }}>
              {brand.configured ? <span className="absolute inset-[3px] rounded-full opacity-60" style={{ background: `radial-gradient(circle at 40% 35%, ${brand.accent}, transparent 75%)` }} /> : null}
              <span className="relative">{brand.seal}</span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-medium uppercase tracking-[0.3em] text-[#f3efe6] transition-colors group-hover:text-[#f4e4bd]">{brand.name}</span>
              <span className="hidden truncate text-[9px] uppercase tracking-[0.26em] text-night-muted sm:block">{brand.motto}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-5 whitespace-nowrap font-mono text-[10.5px] tracking-[0.12em] text-night-muted">
            {right}
            <span className="tabular-nums text-white/75" suppressHydrationWarning>{clock}</span>
          </div>
          <Rule className="absolute inset-x-0 bottom-0" />
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <footer className="relative mt-auto flex flex-col gap-2 py-6 font-mono text-[10px] uppercase tracking-[0.18em] text-night-faint sm:flex-row sm:justify-between">
          <Rule className="absolute inset-x-0 top-0" flip />
          <span>Humans govern · Institutions govern · Constitutions govern</span>
          <span>Every change is written to the audit chain</span>
        </footer>
      </div>
    </div>
  );
}

/** Drafting grid, compass arcs, warm civic light and film grain. Decorative. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 55% at 22% -5%, #111723 0%, ${INK} 70%)` }} />
      <div className="absolute inset-0"
        style={{
          backgroundImage: [
            `linear-gradient(${hair(0.055)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${hair(0.055)} 1px, transparent 1px)`,
            `linear-gradient(${hair(0.022)} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${hair(0.022)} 1px, transparent 1px)`,
          ].join(','),
          backgroundSize: '96px 96px, 96px 96px, 16px 16px, 16px 16px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 35% 25%, #000 25%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 35% 25%, #000 25%, transparent 85%)',
        }} />
      {/* Compass arcs, as on a surveyor's plan */}
      <svg viewBox="0 0 1000 1000" className="absolute -right-[260px] -top-[280px] hidden h-[980px] w-[980px] opacity-70 md:block">
        {[150, 230, 310, 390, 470].map((r, i) => (
          <circle key={r} cx="500" cy="500" r={r} fill="none" stroke={CHAMPAGNE} strokeOpacity={i === 2 ? 0.12 : 0.05} strokeDasharray={i === 2 ? '1 7' : undefined} />
        ))}
        {Array.from({ length: 72 }).map((_, i) => {
          const a = (i * 5 * Math.PI) / 180, r1 = i % 6 === 0 ? 452 : 462;
          const f = (v: number) => v.toFixed(2);
          return <line key={i} x1={f(500 + r1 * Math.cos(a))} y1={f(500 + r1 * Math.sin(a))} x2={f(500 + 470 * Math.cos(a))} y2={f(500 + 470 * Math.sin(a))} stroke={CHAMPAGNE} strokeOpacity="0.16" />;
        })}
        <line x1="0" y1="500" x2="1000" y2="500" stroke={CHAMPAGNE} strokeOpacity="0.05" />
        <line x1="500" y1="0" x2="500" y2="1000" stroke={CHAMPAGNE} strokeOpacity="0.05" />
      </svg>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 18% 0%, rgba(244,214,150,0.075), transparent 70%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 55%, rgba(2,3,6,0.7) 100%)' }} />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

/** Engraved hairline with fine graduations, like the edge of a scale rule. */
export function Rule({ className = '', flip = false, strong = false }: { className?: string; flip?: boolean; strong?: boolean }) {
  const a = strong ? 0.45 : 0.28;
  return (
    <div aria-hidden className={`pointer-events-none h-[7px] ${className}`}
      style={{
        backgroundImage: [
          `linear-gradient(90deg, transparent, ${hair(a)} 12%, ${hair(a)} 88%, transparent)`,
          `repeating-linear-gradient(90deg, ${hair(a * 0.9)} 0 1px, transparent 1px 64px)`,
          `repeating-linear-gradient(90deg, ${hair(a * 0.45)} 0 1px, transparent 1px 8px)`,
        ].join(','),
        backgroundSize: '100% 1px, 100% 7px, 100% 3px',
        backgroundPosition: flip ? 'top, top, top' : 'bottom, bottom, bottom',
        backgroundRepeat: 'no-repeat',
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }} />
  );
}

/** Registration marks at the four corners of a drafted panel. */
export function Corners({ size = 10, color = hair(0.6) }: { size?: number; color?: string }) {
  const s = { width: size, height: size, borderColor: color } as React.CSSProperties;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute -left-px -top-px border-l border-t" style={s} />
      <span className="absolute -right-px -top-px border-r border-t" style={s} />
      <span className="absolute -bottom-px -left-px border-b border-l" style={s} />
      <span className="absolute -bottom-px -right-px border-b border-r" style={s} />
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10.5px] uppercase tracking-[0.34em]" style={{ color: CHAMPAGNE }}>{children}</p>;
}

/** A numbered clause of the instrument: engraved number, title and scale rule. */
export function Section({ n, title, aside, children, className = '' }: { n: string; title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-12 first:mt-0 ${className}`}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <span className="font-mono text-[11px] tabular-nums tracking-[0.12em]" style={{ color: CHAMPAGNE }}>§ {n}</span>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#f3efe6]/85">{title}</h2>
        {aside ? <span className="ml-auto text-[12px] text-night-muted">{aside}</span> : null}
      </div>
      <Rule className="mt-2.5" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="group/field block">
      <span className="block font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/65 transition-colors group-focus-within/field:text-[#f4e4bd]">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[11.5px] leading-snug text-night-muted">{hint}</span> : null}
    </label>
  );
}

/** Inset field on dark glass: hairline frame, an engraved baseline, champagne on focus. */
export const inputCls =
  'w-full rounded-[2px] border border-[#d9c398]/[0.13] border-b-[#d9c398]/[0.4] bg-[#07090d] bg-[linear-gradient(180deg,rgba(255,248,230,0.015),rgba(255,248,230,0.04))] px-3.5 py-2.5 text-[14.5px] font-light text-[#f3efe6] shadow-[inset_0_1px_8px_rgba(0,0,0,0.45)] transition-[border-color,background-color,box-shadow] placeholder:text-night-faint hover:border-[#d9c398]/25 hover:border-b-[#d9c398]/55 focus:border-[#d9c398]/70 focus:border-b-[#f4e4bd] focus:bg-[#d9c398]/[0.05] focus:shadow-[inset_0_1px_8px_rgba(0,0,0,0.45),0_0_0_3px_rgba(217,195,152,0.10)] focus:outline-none [&>option]:bg-[#0c0f15] [&>option]:text-[#f3efe6]';

/** Refined select: the input frame with an engraved chevron. */
export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={`${inputCls} cursor-pointer appearance-none pr-10 ${className}`} />
      <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke={CHAMPAGNE} strokeWidth="1" />
      </svg>
    </span>
  );
}

/** Polished-gold primary and hairline secondary actions (as on the cover's sign-in). */
export const goldBtn =
  'inline-flex items-center justify-center gap-3 rounded-full px-6 py-3 text-[13.5px] font-medium tracking-[0.04em] text-[#17120a] transition-[filter,transform,opacity] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4e4bd]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04060a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:brightness-100';
export const goldStyle: React.CSSProperties = { background: GOLD, boxShadow: `0 10px 30px -12px ${CHAMPAGNE}99, inset 0 1px 0 rgba(255,255,255,0.6)` };
export const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c398]/30 px-5 py-3 text-[13.5px] tracking-[0.04em] text-[#f3efe6]/80 transition-colors hover:border-[#d9c398]/70 hover:text-[#f4e4bd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd] disabled:opacity-35';

/** Darken (amt < 0) or lighten (amt > 0) a #rrggbb colour. */
export function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const ch = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const [r, g, b] = [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** National insignia — a ringed medallion in polished gold, enamelled in the
 *  sovereign colour, with the monogram struck in relief. An optional
 *  inscription runs around the band. */
export function SealTile({ seal, accent, size = 56, inscription }: { seal: string; accent: string; size?: number; inscription?: string }) {
  const raw = React.useId();
  const id = `md${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  const text = inscription ? inscription.toUpperCase() : '';
  const banded = !!text && size >= 120;
  const enamelR = banded ? 68 : 82;
  const fit = banded ? Math.min(14, (Math.PI * 86 * 0.92) / Math.max(text.length * 1.06, 1)) : 0;
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" width={size} height={size} className="shrink-0"
      style={{ filter: `drop-shadow(0 ${size * 0.12}px ${size * 0.22}px rgba(0,0,0,0.75)) drop-shadow(0 0 ${size * 0.18}px ${accent}55)` }}>
      <defs>
        <linearGradient id={`${id}m`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#fff4cf" /><stop offset="0.18" stopColor="#d7b46a" /><stop offset="0.34" stopColor="#8a6424" />
          <stop offset="0.5" stopColor="#f2dc9e" /><stop offset="0.66" stopColor="#a67a32" /><stop offset="0.82" stopColor="#e9cf8a" /><stop offset="1" stopColor="#6e4c16" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0.9" y1="1" x2="0.1" y2="0">
          <stop offset="0" stopColor="#fff4cf" /><stop offset="0.3" stopColor="#b88d42" /><stop offset="0.55" stopColor="#5e4012" />
          <stop offset="0.8" stopColor="#d9bb74" /><stop offset="1" stopColor="#7a5418" />
        </linearGradient>
        <radialGradient id={`${id}e`} cx="40%" cy="32%" r="75%">
          <stop offset="0" stopColor={shade(accent, 0.28)} /><stop offset="0.5" stopColor={accent} /><stop offset="1" stopColor={shade(accent, -0.62)} />
        </radialGradient>
        <radialGradient id={`${id}b`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#1a1d24" /><stop offset="1" stopColor="#07080b" />
        </radialGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3cc" /><stop offset="0.55" stopColor="#e2c37c" /><stop offset="1" stopColor="#b48a3e" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <path id={`${id}t`} d="M -86 0 A 86 86 0 1 1 86 0 A 86 86 0 1 1 -86 0" />
      </defs>
      {/* Rim */}
      <circle r="99" fill={`url(#${id}m)`} />
      <circle r="93" fill={banded ? `url(#${id}b)` : `url(#${id}r)`} />
      {banded ? (
        <>
          <circle r="76" fill={`url(#${id}m)`} />
          <text fontSize={fit} letterSpacing={fit * 0.28} fill={`url(#${id}l)`} fontFamily="ui-sans-serif, system-ui" fontWeight={500} dominantBaseline="central">
            <textPath href={`#${id}t`} startOffset="25%" textAnchor="middle">{text}</textPath>
          </text>
          {/* Ornament under the band: a five-point star flanked by beads */}
          <path transform="translate(0 85) scale(0.9)" d="M0,-6 L1.76,-2.43 5.7,-1.85 2.85,0.93 3.53,4.85 0,3 -3.53,4.85 -2.85,0.93 -5.7,-1.85 -1.76,-2.43Z" fill={`url(#${id}l)`} />
          {[-1, 1].flatMap(sd => [14, 26, 38].map(d => {
            const a = ((90 + sd * d) * Math.PI) / 180;
            return <circle key={`${sd}${d}`} cx={(85 * Math.cos(a)).toFixed(2)} cy={(85 * Math.sin(a)).toFixed(2)} r={d === 14 ? 1.8 : 1.3} fill={`url(#${id}l)`} opacity={d === 38 ? 0.6 : 0.9} />;
          }))}
        </>
      ) : null}
      <circle r={enamelR + 4} fill={`url(#${id}r)`} />
      {/* Enamel field in the sovereign colour */}
      <circle r={enamelR} fill={`url(#${id}e)`} />
      <circle r={enamelR - 7} fill="none" stroke="#f4e4bd" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="0.8 4.2" />
      <circle r={enamelR} fill={`url(#${id}g)`} />
      {/* Monogram struck in gold */}
      <text y="2" textAnchor="middle" dominantBaseline="central" fill={`url(#${id}l)`}
        fontFamily="ui-sans-serif, system-ui" fontWeight={500} letterSpacing="2"
        fontSize={(banded ? 52 : 64) * (seal.length > 2 ? 0.78 : 1)}
        style={{ paintOrder: 'stroke' }} stroke="#3b2a0c" strokeOpacity="0.35" strokeWidth="1.2">{seal}</text>
    </svg>
  );
}
