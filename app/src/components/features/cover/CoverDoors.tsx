'use client';

import * as React from 'react';
import Link from 'next/link';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, type EntryPath } from './entry';

const DOORS: Record<EntryPath, { n: string; line: string; from: string; to: string; accent: string; art: 'rings' | 'field' | 'columns' }> = {
  officer: { n: 'I', line: 'Command the state', from: '#03211c', to: '#0c4a3d', accent: '#5fe0b8', art: 'rings' },
  citizen: { n: 'II', line: 'Your services, your records', from: '#071733', to: '#16397a', accent: '#8ab8ff', art: 'field' },
  institution: { n: 'III', line: 'Charter a new institution', from: '#1a0b26', to: '#47215f', accent: '#d7a6ff', art: 'columns' },
};

/**
 * Cover · Doors — three entrances to the state, side by side. Choosing one
 * opens it and reveals sign-in; the others fold to narrow spines.
 */
export function CoverDoors() {
  const { path, setPath, email, setEmail, enter, note, cta } = useCoverEntry();
  const [open, setOpen] = React.useState<EntryPath | null>(null);

  function choose(k: EntryPath) { setPath(k); setOpen(k); }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) { if (e.key === 'Escape') setOpen(null); return; }
      if (e.key === 'Escape') setOpen(null);
      const p = ENTRY_PATHS[Number(e.key) - 1];
      if (p) { e.preventDefault(); setPath(p.k); setOpen(p.k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPath]);

  return (
    <main className="flex min-h-screen flex-col bg-[#08080b] font-sans text-white lg:h-screen">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-8">
        <span className="flex items-center gap-3">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full border border-white/30 text-[11px] font-bold">CO</span>
          <span className="text-[13px] font-semibold tracking-[0.28em]">CIVICOS</span>
        </span>
        <span className="text-[12px] text-white/50">
          {open ? <button type="button" onClick={() => setOpen(null)} className="hover:text-white">← All entrances</button> : 'Choose your entrance'}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 px-1.5 pb-1.5 lg:min-h-0 lg:flex-row">
        {ENTRY_PATHS.map(p => {
          const d = DOORS[p.k];
          const isOpen = open === p.k;
          const folded = open !== null && !isOpen;
          return (
            <section key={p.k} aria-label={p.title}
              className="group relative overflow-hidden rounded-[18px] transition-[flex-grow,min-height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                flexGrow: isOpen ? 3.2 : folded ? 0.55 : 1,
                flexBasis: 0,
                minHeight: isOpen ? 560 : folded ? 88 : 220,
                background: `linear-gradient(160deg, ${d.from}, ${d.to})`,
              }}>
              <DoorArt kind={d.art} accent={d.accent} lit={isOpen} />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

              {!isOpen && (
                <button type="button" onClick={() => choose(p.k)}
                  className="absolute inset-0 z-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                  aria-label={`${p.title} — ${d.line}`} />
              )}

              <div className={`relative flex h-full flex-col justify-between p-6 sm:p-8 ${folded ? 'lg:p-5' : ''}`}>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[12px] tracking-[0.2em]" style={{ color: d.accent }}>{d.n}</span>
                  {!isOpen && <span aria-hidden className="text-[18px] text-white/40 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-white">→</span>}
                </div>

                <div className={folded ? 'lg:hidden' : ''}>
                  <p className="text-[12px] uppercase tracking-[0.24em] text-white/60">{p.title}</p>
                  <h2 className={`mt-2 font-semibold ${folded ? 'hidden' : ''} leading-[1.02] tracking-[-0.03em] transition-[font-size] duration-700 ${isOpen ? 'text-[2.6rem] sm:text-[3.6rem]' : 'text-[1.9rem] sm:text-[2.3rem]'}`}>{d.line}</h2>
                  {!isOpen && !folded && <p className="mt-3 max-w-[30ch] text-[14px] leading-relaxed text-white/60">{p.sub}</p>}

                  {isOpen && (
                    <form onSubmit={enter} className="mt-8 w-full max-w-[440px] animate-[fadeUp_.6s_ease-out_both]">
                      <p className="text-[15px] leading-relaxed text-white/70">{p.sub}</p>
                      {path === 'citizen' ? (
                        <p className="mt-5 rounded-[12px] bg-white/[0.07] px-4 py-3 text-[14px] leading-relaxed text-white/80 ring-1 ring-white/10">{CITIZEN_NOTE}</p>
                      ) : (
                        <>
                          <label htmlFor="door-email" className="sr-only">Work email</label>
                          <input id="door-email" type="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.currentTarget.value)}
                            placeholder="Work email"
                            className="mt-5 w-full rounded-[12px] bg-white/[0.08] px-4 py-3.5 text-[15px] text-white ring-1 ring-white/15 placeholder:text-white/40 focus:outline-none focus:ring-2"
                            style={{ ['--tw-ring-color' as string]: d.accent }} />
                        </>
                      )}
                      <button type="submit"
                        className="mt-3 flex w-full items-center justify-between rounded-[12px] px-5 py-3.5 text-[15px] font-semibold text-[#0b0b0e] transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        style={{ background: d.accent }}>
                        {cta} <span aria-hidden>→</span>
                      </button>
                      <p className="mt-3 text-[12px] leading-relaxed text-white/45">{note}</p>
                    </form>
                  )}
                </div>

                {folded && (
                  <p aria-hidden className="hidden text-[13px] font-semibold uppercase tracking-[0.3em] text-white/75 lg:block" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {p.title}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="flex shrink-0 flex-col gap-2 px-4 py-4 text-[12px] text-white/40 sm:px-8 lg:flex-row lg:justify-between">
        <nav aria-label="Public services" className="flex flex-wrap gap-x-5 gap-y-1">
          {PUBLIC_LINKS.map(l => <Link key={l.href} href={l.href} className="hover:text-white">{l.l}</Link>)}
        </nav>
        <span>Humans govern · Institutions govern · Constitutions govern · AI assists</span>
      </footer>
      <style>{'@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'}</style>
    </main>
  );
}

function DoorArt({ kind, accent, lit }: { kind: 'rings' | 'field' | 'columns'; accent: string; lit: boolean }) {
  const o = lit ? 0.5 : 0.28;
  return (
    <svg aria-hidden viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full transition-opacity duration-700 group-hover:opacity-100" style={{ opacity: lit ? 1 : 0.8 }}>
      {kind === 'rings' && Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx="330" cy="140" r={30 + i * 34} fill="none" stroke={accent} strokeOpacity={o * (1 - i / 16)} strokeWidth="0.8" />
      ))}
      {kind === 'field' && Array.from({ length: 22 }).flatMap((_, r) => Array.from({ length: 16 }).map((__, c) => {
        const x = 12 + c * 26, y = 12 + r * 27;
        const w = Math.sin(c * 0.55 + r * 0.32) * 0.5 + 0.5;
        return <circle key={`${r}:${c}`} cx={x} cy={y + w * 8} r={0.8 + w * 1.6} fill={accent} fillOpacity={o * (0.3 + w)} />;
      }))}
      {kind === 'columns' && (
        <g stroke={accent} strokeOpacity={o} fill="none" strokeWidth="0.8">
          {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={60 + i * 36} y1="170" x2={60 + i * 36} y2="560" />)}
          <path d="M40 170 L200 70 L360 170 Z" />
          <line x1="40" y1="182" x2="360" y2="182" />
          <line x1="30" y1="560" x2="370" y2="560" />
          <line x1="20" y1="576" x2="380" y2="576" />
        </g>
      )}
    </svg>
  );
}
