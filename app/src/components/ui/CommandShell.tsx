'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, ACCENT, PALETTE } from '@/components/features/SituationRoom';
import { ConsoleMark, PoweredBy } from '@/components/ui/ConsoleMark';
import { SignalTag } from '@/components/ui/SignalTag';
import { ReferenceNotice } from '@/components/ui/ReferenceNotice';
import { AccessibilityMenu } from '@/components/ui/AccessibilityMenu';
import { REFERENCE_MODEL, type SignalKind } from '@/lib/twin/signal';
import { CommandPalette, type CommandItem, type CommandSearchFn } from '@/components/ui/CommandPalette';
import { substrateSearch } from '@/lib/db/search';
import { ExecutiveMenu } from '@/components/ui/ExecutiveMenu';
import { deployableInstitutions } from '@/lib/institution/readiness';
import { constitutionFor } from '@/lib/gov/constitution';
import { nationalResilience } from '@/lib/gov/national-resilience';
import { subscribe as rtSubscribe, runtimeStats, version as rtVersion } from '@/lib/gov/runtime-store';
import { useFederationSync } from '@/apps/useFederationSync';
import { subscribe as orchSubscribe, orchestrationStats, version as orchVersion } from '@/services/orchestration-engine';
import type { SovereignProfile, NationalSnapshot, NationalCoordination, Ministry } from '@/lib/api/types';
import { useHydrated, useRenderNow } from '@/lib/clock/render-now';
import { usePathname } from 'next/navigation';
import { HEADER_LINKS, locate, navFor } from '@/lib/nav/console-nav';
import type { Scope } from '@/lib/auth/roles';
import { ConsoleTabs } from '@/components/ui/ConsoleTabs';
import { SkipLink } from '@/components/ui/SkipLink';
import { executivePosture } from '@/lib/gov/executive-posture';

// Adapter from substrate search hits → CommandPalette items.
const substrateSearchAsCommands: CommandSearchFn = async (query) => {
  const hits = await substrateSearch(query);
  return hits.slice(0, 24).map(h => ({
    id: `${h.kind}:${h.id}`,
    label: h.label,
    hint: `${h.ref} · ${h.detail}`,
    group: `Substrate · ${h.kind}`,
    href: h.href,
  }));
};

// The menu lives in lib/nav/console-nav.ts (plain language; earlier pages are tabs of its items).

// Layout effect in the browser (fits before paint); a no-op effect on the server.
const useClientLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/** Show as many header figures as fit: hide priority 3, then 2; priority 1 always stays. */
function fitTelemetry(el: HTMLElement) {
  const items = [...el.children] as HTMLElement[];
  for (const level of [3, 2, 1]) {
    for (const it of items) it.style.display = Number(it.dataset.p) > level ? 'none' : '';
    if (el.scrollWidth <= el.clientWidth + 1) return;
  }
}

/**
 * Shared sovereign command chrome — full-screen dark command environment
 * (top telemetry bar + grouped command rail + command palette) that
 * non-flagship gov surfaces mount into so the whole platform reads as
 * one coherent operating system.
 */
export function CommandShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [now, setNow] = React.useState(useRenderNow());
  const [navOpen, setNavOpen] = React.useState(false);
  // The signed-in official's role and institution: the menu shows what they can use (plan I2, lib/nav/console-nav.ts navFor()).
  const [scope, setScope] = React.useState<Scope | null>(null);
  React.useEffect(() => {
    fetch('/api/auth/official', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
      .then((j: { official?: { role?: Scope['role']; institution?: string } | null } | null) => { if (j?.official) setScope({ ...(j.official.role ? { role: j.official.role } : {}), ...(j.official.institution ? { institution: j.official.institution } : {}) }); })
      .catch(() => undefined);
  }, []);
  const NAV = navFor(scope);
  const hydrated = useHydrated();

  React.useEffect(() => {
    const load = async () => {
      const [s, n, c, m] = await Promise.all([
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.org.ministries().then(r => r.ministries).catch(() => []),
      ]);
      setSov(s); setNat(n); setCoord(c); setMins(m);
    };
    void load();
    const poll = setInterval(() => void load(), 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const t = nat?.totals;
  const incidents = nat?.crossMinistryIncidents ?? [];
  const crit = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  // What the header may say about the nation (lib/gov/executive-posture.ts):
  // recorded data only in production, marked samples in demo and training.
  const view = executivePosture(nat, coord);
  const level = view.risk.t === 'neutral' ? 'ok' : view.risk.t;
  const emergency = view.banner.show;
  const accent = emergency ? TONE.alert : ACCENT;
  const railCount: Record<string, number> = {
    sr: incidents.length, ops: t?.queuesBreaching ?? 0, cab: crit, aud: t?.auditIntact === false ? 1 : 0,
  };
  const pathname = usePathname() ?? '';
  const found = locate(pathname);
  // The tabs of this page's item as this official sees them (navigation filtered by permission).
  const here = found ? { ...found, item: NAV.flatMap(sec => sec.items).find(i => i.key === found.item.key) ?? found.item } : null;
  // Only an encrypted connection is called encrypted.
  const [secure, setSecure] = React.useState<boolean | null>(null);
  React.useEffect(() => { setSecure(window.location.protocol === 'https:'); }, []);

  const resilience = nationalResilience(mins, now / 4000);
  React.useSyncExternalStore(rtSubscribe, rtVersion, rtVersion);
  const liveRt = runtimeStats();
  useFederationSync(mins);
  React.useSyncExternalStore(orchSubscribe, orchVersion, orchVersion);
  const fedStats = orchestrationStats();

  // Each figure says where it comes from (lib/twin/signal.ts); samples and model outputs are marked.
  // p: priority. As many figures are shown as fit, lowest priority hidden first (fitTelemetry).
  const tele: { p: 1 | 2 | 3; l: string; v: string; t?: string; dot?: boolean; kind: SignalKind; src: string }[] = [
    { p: 3, l: 'Environment', v: nat?.environment ?? '—', t: 'ok', dot: true, kind: 'reported', src: 'Platform configuration' },
    view.generated.show
      ? { p: 2, l: 'Resilience', v: `${resilience.index} ${resilience.band}`, t: resilience.tone, kind: 'sample', src: `Resilience model over ${REFERENCE_MODEL.toLowerCase()}` }
      : { p: 2, l: 'Resilience', v: 'Not connected', t: 'neutral', kind: 'unavailable', src: view.generated.src },
    { p: 3, l: 'Practice queue', v: hydrated ? `${liveRt.open} open` : '—', t: 'ok', kind: 'reported', src: 'Practice queue in this browser only; not a government record' },
    { p: 3, l: 'Connected systems', v: hydrated ? `${fedStats.activated} of ${fedStats.registered}` : '—', t: 'ok', kind: 'reported', src: 'Registry of connected systems' },
    { p: 2, l: 'Institutions', v: String(t?.institutions ?? 0), kind: 'reported', src: 'Ministry registry (/api/org)' },
    { p: 1, l: 'Active incidents', v: view.incidents.v, t: view.incidents.t, kind: view.incidents.kind, src: view.incidents.src },
    { p: 2, l: 'Queues breaching', v: view.queues.v, t: view.queues.t, kind: view.queues.kind, src: view.queues.src },
    { p: 1, l: 'National risk', v: view.risk.v, t: view.risk.t, kind: view.risk.kind, src: view.risk.src },
    { p: 1, l: 'Audit integrity', v: t?.auditIntact === false ? 'Review' : 'Intact', t: t?.auditIntact === false ? 'alert' : 'ok', kind: 'observed', src: 'Verification of the audit chain' },
  ];
  const teleRef = React.useRef<HTMLDivElement>(null);
  const teleKey = tele.map(m => m.v).join('|');
  useClientLayoutEffect(() => {
    const el = teleRef.current;
    if (!el) return;
    const fit = () => fitTelemetry(el);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [teleKey]);
  const cmd: CommandItem[] = NAV.flatMap(sec => sec.items.flatMap(it => it.tabs.map(tb => ({
    id: tb.href + tb.label, group: sec.label,
    label: tb.label === it.label ? it.label : `${it.label} › ${tb.label}`,
    hint: tb.was && tb.was !== tb.label ? `formerly “${tb.was}”` : it.purpose, href: tb.href,
  }))));

  return (
    <div data-mode={emergency ? 'crisis' : 'normal'} className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]" style={{ ...PALETTE, ...(emergency ? { ['--accent' as string]: TONE.alert } : {}) }}>
      <SkipLink />
      <CommandPalette items={cmd} accent={accent} searchFn={substrateSearchAsCommands} />
      {emergency ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-1 text-2xs"
          style={{ backgroundColor: `color-mix(in srgb, ${TONE.alert} 16%, transparent)`, borderBottom: `1px solid ${TONE.alert}` }}>
          <span className="flex items-center gap-2 font-bold uppercase tracking-[0.2em]" style={{ color: TONE.alert }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            {view.banner.text}
            <SignalTag kind={view.banner.kind} source={view.banner.src} className="!text-[8px]" />
          </span>
          <Link href="/gov/coordination" className="focus-ring rounded-[3px] border px-2 py-0.5 uppercase tracking-widest" style={{ borderColor: TONE.alert, color: TONE.alert }}>Coordinate →</Link>
        </div>
      ) : null}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:gap-4 sm:px-4">
        <button type="button" aria-label="Toggle navigation" aria-expanded={navOpen}
          onClick={() => setNavOpen(o => !o)}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border border-line text-ink-soft lg:hidden">
          <span className="text-base leading-none">{navOpen ? '✕' : '☰'}</span>
        </button>
        <ConsoleMark crisis={emergency} official />
        <div ref={teleRef} className="ml-2 hidden min-w-0 flex-1 items-stretch overflow-hidden lg:flex">
          {tele.map(m => (
            <div key={m.l} data-p={m.p} className="shrink-0 whitespace-nowrap border-l border-line px-3 py-1 first:border-l-0">
              <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}<SignalTag kind={m.kind} source={m.src} className="!text-[7px] !leading-none" /></div>
              <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums" style={{ color: m.t ? TONE[m.t] : 'rgb(var(--c-ink))' }}>
                {m.dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[m.t ?? 'ok'] }} /> : null}
                {m.v}
              </div>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {HEADER_LINKS.map(h => (
            <Link key={h.href} href={h.href} className="focus-ring hidden h-8 items-center gap-1.5 rounded-[3px] border border-line px-2.5 text-xs text-ink-soft no-underline hover:bg-surface-2 hover:text-ink sm:flex">
              <span aria-hidden>⌕</span>{h.label}<kbd className="ms-1 hidden rounded-[2px] border border-line px-1 font-mono text-2xs text-ink-muted xl:inline">⌘K</kbd>
            </Link>
          ))}
          <AccessibilityMenu compact />
          <span className="hidden items-center gap-1.5 rounded-[3px] border px-2 py-1 text-2xs sm:flex"
            style={{ borderColor: emergency ? TONE.alert : 'rgb(var(--c-line))', color: emergency ? TONE.alert : 'rgb(var(--c-ink-soft))' }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[level] }} />
            {view.risk.v}
            <SignalTag kind={view.risk.kind} source={view.risk.src} className="!text-[7px]" />
          </span>
          <span className="relative grid h-7 w-7 place-items-center rounded-[3px] border border-line text-xs text-ink-soft" title={`${incidents.length} active incidents`}>
            ⌁
            {incidents.length ? <span className="absolute -right-1 -top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full px-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: TONE.alert }}>{incidents.length}</span> : null}
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-ink-muted sm:inline">{new Date(now).toLocaleTimeString()}</span>
          {secure ? <span className="hidden items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 text-2xs text-ink-soft min-[1440px]:flex"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TONE.ok }} /> Encrypted</span> : null}
          {/* On phones the official's menu sits at the top of the navigation drawer instead. */}
          <span className="hidden border-l border-line pl-3 sm:inline">
            <ExecutiveMenu accent={accent} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {navOpen ? <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden /> : null}
        <nav aria-label="Sovereign command"
          className={`${navOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-[240px] flex-col border-r border-line bg-bg lg:static lg:z-auto lg:flex lg:w-[212px]`}>
          <div className="space-y-2 border-b border-line px-3 py-2 sm:hidden">
            <ExecutiveMenu accent={accent} />
            {HEADER_LINKS.map(h => (
              <Link key={h.href} href={h.href} onClick={() => setNavOpen(false)} className="focus-ring flex h-9 items-center gap-1.5 rounded-[3px] border border-line px-2.5 text-compact text-ink-soft no-underline hover:bg-surface-2 hover:text-ink">
                <span aria-hidden>⌕</span>{h.label}
              </Link>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto py-1" onClick={() => setNavOpen(false)}>
            {NAV.map(grp => (
              <div key={grp.label} className="mb-1">
                <div className="px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{grp.label}</div>
                {grp.items.map(it => {
                  const on = here?.item.key === it.key || (!here && it.key === active);
                  const n = railCount[it.key] ?? 0;
                  return (
                    <Link key={it.key} href={it.href} aria-current={on ? 'page' : undefined}
                      className={`focus-ring flex items-center gap-2 border-l-2 px-3 py-1.5 no-underline transition-colors duration-150 ${
                        on ? 'bg-surface-2 font-medium' : 'border-transparent text-ink-soft hover:bg-surface-2/50 hover:text-ink'
                      }`}
                      style={on ? { borderLeftColor: accent } : undefined}>
                      <span aria-hidden className="relative grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-2xs ring-1 ring-line"
                        style={on ? { color: accent } : { color: 'rgb(var(--c-ink-soft))' }}>
                        {it.icon}
                        {n > 0 ? <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: n >= 4 ? TONE.alert : TONE.warn }} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-compact" style={on ? { color: accent } : undefined}>{it.label}</span>
                      {n > 0 ? <span className="shrink-0 rounded-[3px] px-1 text-2xs font-bold tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${n >= 4 ? TONE.alert : TONE.warn} 14%, transparent)`, color: n >= 4 ? TONE.alert : TONE.warn }}>{n}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
            {(() => {
              const dir = deployableInstitutions(mins);
              if (dir.length === 0) return null;
              return (
                <div className="mb-0.5">
                  <div className="px-3 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Ministries · {dir.length}</div>
                  {dir.map(({ ministry: m, readiness: r }) => {
                    const c = r.deployable ? TONE.ok : TONE.warn;
                    return (
                      <Link key={m.id} href={`/gov/ministry/${m.id}`}
                        className="focus-ring flex items-center gap-2 border-l-2 border-transparent px-3 py-1 text-ink-muted no-underline transition-colors duration-150 hover:bg-surface-2/50 hover:text-ink">
                        <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-2xs ring-1 ring-line" style={{ color: c }}>▣</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-compact">{m.name}</span>
                          <span className="block truncate text-2xs text-ink-muted">{r.deployable ? 'Ready to operate' : 'Setting up'} · {r.total}% ready</span>
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="border-t border-line px-3 py-2">
            <div className="mb-1.5 flex items-end gap-0.5" aria-hidden title="Operational pulse">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="flex-1 animate-breathe rounded-sm"
                  style={{ height: `${(4 + ((Math.sin(i * 1.7 + Math.floor(now / 1000)) + 1) / 2) * 12).toFixed(2)}px`, backgroundColor: TONE[level], animationDelay: `${i * 70}ms`, opacity: 0.55 }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
              <div className="text-ink-muted">Status</div><div className="truncate text-right font-mono" style={{ color: TONE[level] }} title={view.risk.src}>{view.risk.v}</div>
              <div className="text-ink-muted">Incidents</div><div className="text-right font-mono" style={{ color: incidents.length ? TONE.alert : TONE.ok }}>{incidents.length}</div>
              <div className="text-ink-muted">Environment</div><div className="truncate text-right text-ink-soft">{nat?.environment ?? '—'}</div>
              <div className="text-ink-muted">Connection</div><div className="text-right" style={{ color: secure === false ? TONE.warn : TONE.ok }}>{secure === null ? '—' : secure ? 'Encrypted' : 'Not encrypted'}</div>
              <PoweredBy />
            </div>
          </div>
        </nav>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-3 outline-none"
          style={{ backgroundImage: 'linear-gradient(rgba(55,199,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(55,199,212,0.02) 1px, transparent 1px)', backgroundSize: '36px 36px' }}>
          <ReferenceNotice />
          <ConsoleTabs here={here} branches={constitutionFor(sov?.stateForm ?? 'republic', sov?.constitution).branches.map(b => ({ label: b.name, href: `/gov/branch/${b.key}` }))} pathname={pathname} />
          {children}
        </main>
      </div>
    </div>
  );
}
