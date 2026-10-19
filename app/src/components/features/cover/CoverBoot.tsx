'use client';

import * as React from 'react';
import Link from 'next/link';
import { ENTRY_PATHS, PUBLIC_LINKS, CITIZEN_NOTE, useCoverEntry, useNationBrand, usePathKeys, useClock, usePrefersReducedMotion } from './entry';

const SIGNAL = '#8affc1';
const STEP_MS = 280;
const BOOT_KEY = 'civicos.cover.booted';

/**
 * Cover · Boot — the platform starts like an operating system: a kernel log
 * verifies the constitutional root, mounts institutions, applies the data
 * advise-only, then resolves into a monochrome sign-in console.
 */
export function CoverBoot() {
  const entry = useCoverEntry();
  const brand = useNationBrand();
  const { path, setPath, email, setEmail, live, enter, note, cta } = entry;
  usePathKeys(setPath);
  const clock = useClock();
  const reduced = usePrefersReducedMotion();

  const lines = React.useMemo(() => [
    { m: 'CivicOS sovereign kernel v2.1.0', s: 'init' },
    { m: 'Verifying constitutional root', s: 'verified' },
    { m: 'Mounting institution registry', s: 'mounted' },
    { m: 'Checking separation of powers', s: 'intact' },
    { m: 'Attaching append-only audit chain', s: 'attached' },
    { m: 'Applying data-protection policy', s: 'enforced' },
    { m: 'Identity substrate', s: live === false ? 'prototype' : 'connected' },
    { m: 'Opening secure session channel', s: 'ready' },
  ], [live]);

  const [shown, setShown] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const stamps = React.useRef<string[]>([]);

  React.useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(BOOT_KEY) === '1'; } catch { /* storage blocked */ }
    if (seen || reduced) { finish(); return; }
    const t0 = performance.now();
    let i = 0;
    const id = setInterval(() => {
      stamps.current[i] = ((performance.now() - t0) / 1000).toFixed(4).padStart(9, ' ');
      i += 1;
      setShown(i);
      if (i >= 8) { clearInterval(id); setTimeout(finish, 520); }
    }, STEP_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  function finish() {
    setShown(8);
    setReady(true);
    try { sessionStorage.setItem(BOOT_KEY, '1'); } catch { /* storage blocked */ }
  }

  React.useEffect(() => {
    if (ready) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready]);

  const progress = ready ? 100 : Math.round((shown / 8) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black font-sans text-white">
      {/* Vignette + horizon line */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 30% 70%, rgba(255,255,255,0.045), transparent 70%)' }} />

      <div className="relative mx-auto flex min-h-screen max-w-[1360px] flex-col px-4 sm:px-10">
        <header className="flex h-16 items-center justify-between font-mono text-[11px] text-white/45">
          <span className="flex items-center gap-3">
            <span aria-hidden className="grid h-6 w-6 place-items-center border border-white/60 text-[9px] font-bold text-white">{brand.seal}</span>
            <span className="truncate uppercase tracking-[0.3em] text-white/80">{brand.name}</span>
          </span>
          <span className="flex items-center gap-5">
            <span className="hidden sm:inline">session · unauthenticated</span>
            <span className="tabular-nums text-white/70" suppressHydrationWarning>{clock}</span>
          </span>
        </header>

        <div className="grid flex-1 gap-10 pb-6 pt-4 lg:grid-cols-[1fr_440px] lg:items-end lg:gap-16 lg:pb-14">
          {/* Kernel log → wordmark */}
          <section className="flex min-w-0 flex-col justify-between gap-10 lg:self-stretch">
            <ol aria-label="System start-up log"
              className={`font-mono text-[11.5px] leading-[1.9] transition-opacity duration-700 sm:text-[12.5px] ${ready ? 'opacity-40' : 'opacity-100'}`}>
              {lines.slice(0, shown).map((l, i) => (
                <li key={l.m} className="flex gap-3 whitespace-pre">
                  <span className="text-white/35">[{stamps.current[i] ?? '   0.0000'}]</span>
                  <span className="min-w-0 truncate text-white/85">{l.m}</span>
                  <span className="hidden flex-1 overflow-hidden text-white/15 sm:block">{'·'.repeat(80)}</span>
                  <span style={{ color: SIGNAL }}>{l.s}</span>
                </li>
              ))}
              {!ready && <li aria-hidden className="h-[1.9em] w-2 animate-pulse" style={{ background: SIGNAL }} />}
            </ol>

            <div className={`transition-all duration-[900ms] ease-out ${ready ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Sovereign operating system</p>
              <h1 className="mt-3 bg-gradient-to-b from-white to-white/55 bg-clip-text text-[clamp(4rem,13vw,10.5rem)] font-semibold leading-[0.88] tracking-[-0.055em] text-transparent">
                CivicOS
              </h1>
              <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-white/55">
                One verified system beneath every ministry, officer and citizen.
                Constitution-bound. Audited by default. People decide.
              </p>
            </div>
          </section>

          {/* Login console */}
          <section aria-label="Sign in"
            className={`transition-all delay-200 duration-[900ms] ease-out ${ready ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}>
            <form onSubmit={enter} className="border border-white/15 bg-white/[0.025] backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] text-white/45">
                <span>login</span>
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: SIGNAL }} />secure channel</span>
              </div>

              <fieldset className="px-5 pt-5">
                <legend className="sr-only">Who are you</legend>
                <div className="grid grid-cols-3 border border-white/10 font-mono text-[11px]">
                  {ENTRY_PATHS.map((p, i) => {
                    const on = p.k === path;
                    return (
                      <label key={p.k}
                        className={`cursor-pointer border-l border-white/10 px-2 py-2.5 text-center transition-colors first:border-l-0 focus-within:outline focus-within:outline-1 focus-within:outline-white ${on ? 'bg-white text-black' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                        <input type="radio" name="path" value={p.k} checked={on} onChange={() => setPath(p.k)} className="sr-only" />
                        <span className={on ? 'text-black/45' : 'text-white/30'}>{i + 1} </span>{p.k === 'institution' ? 'institution' : p.title.toLowerCase()}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 min-h-[2.6em] text-[13px] leading-snug text-white/50">{ENTRY_PATHS.find(p => p.k === path)!.sub}</p>
              </fieldset>

              <div className="px-5 pt-2">
                {path === 'citizen' ? (
                  <p className="border-l-2 py-1 pl-3 text-[13px] leading-relaxed text-white/70" style={{ borderColor: SIGNAL }}>{CITIZEN_NOTE}</p>
                ) : (
                  <label className="flex items-center gap-3 border-b border-white/25 pb-2 focus-within:border-white">
                    <span aria-hidden className="font-mono text-[14px]" style={{ color: SIGNAL }}>&gt;</span>
                    <span className="sr-only">Work email</span>
                    <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.currentTarget.value)}
                      placeholder="name@institution.gov"
                      className="w-full bg-transparent font-mono text-[14px] text-white placeholder:text-white/25 focus:outline-none" />
                  </label>
                )}
              </div>

              <div className="p-5">
                <button type="submit"
                  className="group flex w-full items-center justify-between bg-white px-4 py-3.5 text-[14px] font-semibold text-black transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black">
                  {cta}
                  <span aria-hidden className="font-mono text-[12px] text-black/50 transition-transform group-hover:translate-x-0.5">⏎</span>
                </button>
                <p className="mt-3 text-[11.5px] leading-relaxed text-white/35">{note}</p>
              </div>
            </form>

            <nav aria-label="Public services" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px]">
              {PUBLIC_LINKS.map(l => (
                <Link key={l.href} href={l.href} className="text-white/40 underline-offset-4 hover:text-white hover:underline">{l.l.toLowerCase()}</Link>
              ))}
            </nav>
          </section>
        </div>

        {/* Boot progress */}
        <div className="relative">
          <div className="h-px w-full bg-white/10" />
          <div aria-hidden className="absolute left-0 top-0 h-px transition-[width] duration-300" style={{ width: `${progress}%`, background: ready ? 'rgba(255,255,255,0.5)' : SIGNAL }} />
        </div>
        <footer className="flex flex-col gap-1 py-4 font-mono text-[10.5px] text-white/30 sm:flex-row sm:justify-between">
          <span>humans govern · institutions govern · constitutions govern</span>
          {!ready
            ? <button type="button" onClick={finish} className="text-left text-white/60 hover:text-white">skip ⏎</button>
            : <span>env · {live === false ? 'prototype' : 'production'} · zero tracking</span>}
        </footer>
      </div>
    </main>
  );
}
