'use client';

import * as React from 'react';
import Link from 'next/link';
import { ACCENT } from '@/components/features/SituationRoom';
import { useClock, useNationBrand } from '@/components/features/cover/entry';

/** Page frame shared by the cover's follow-on surfaces (setup, welcome):
 *  the same engineering grid, glow and status rail as the cover. */
export function OnboardingFrame({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const clock = useClock();
  const brand = useNationBrand();
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060a12] font-sans text-[#e2e9f3]">
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(55,199,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 40% 35%, #000 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 40% 35%, #000 30%, transparent 85%)',
        }} />
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 45% 40% at 30% 30%, rgba(55,199,212,0.08), transparent 70%)' }} />

      <div className="relative mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 sm:px-8">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[#16202f]">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-[4px] text-[12px] font-bold ${brand.configured ? 'text-white ring-1 ring-white/15' : 'text-[#04121a]'}`} style={{ background: brand.configured ? brand.accent : ACCENT }}>{brand.seal}</span>
            <span className="leading-tight">
              <span className="block truncate text-[13px] font-bold uppercase tracking-[0.2em] text-[#e2e9f3]">{brand.name}</span>
              <span className="hidden truncate text-[9px] uppercase tracking-[0.18em] text-[#65748b] sm:block">{brand.motto}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-5 whitespace-nowrap font-mono text-[11px] text-[#7d8ba0]">
            {right}
            <span className="tabular-nums text-[#c5d0df]" suppressHydrationWarning>{clock}</span>
          </div>
        </header>
        {children}
        <footer className="mt-auto flex flex-col gap-2 border-t border-[#16202f] py-5 font-mono text-[10.5px] text-[#4f5c70] sm:flex-row sm:justify-between">
          <span>Humans govern · Institutions govern · Constitutions govern</span>
          <span>Every change is written to the audit chain</span>
        </footer>
      </div>
    </main>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: ACCENT }}>{children}</p>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#65748b]">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-[12px] text-[#56647a]">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  'w-full rounded-[6px] border border-[#1f2b3e] bg-[#070c15] px-3.5 py-2.5 text-[14px] text-[#e2e9f3] placeholder:text-[#4a576b] focus:border-[#37c7d4] focus:outline-none';

/** National insignia tile — monogram on the sovereign accent. */
export function SealTile({ seal, accent, size = 56 }: { seal: string; accent: string; size?: number }) {
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-[8px] font-bold tracking-wide text-white ring-1 ring-white/15"
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(145deg, ${accent}, ${accent}cc)`, boxShadow: `0 10px 30px -10px ${accent}` }}>
      {seal}
    </span>
  );
}
