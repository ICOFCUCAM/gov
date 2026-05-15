'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AccessibilityMenu } from './AccessibilityMenu';
import { OfflineBanner } from './OfflineBanner';
import { api } from '@/lib/api/client';
import { resolveIdentity, shellStrings } from '@/lib/sovereign-identity';
import type {
  CabinetOverview,
  NationalSnapshot,
  NationalCoordination,
  SovereignProfile,
} from '@/lib/api/types';

const STATE_FORM_LABEL: Record<string, string> = {
  republic: 'Republic',
  federation: 'Federation',
  monarchy: 'Monarchy',
  'city-state': 'City-state',
  union: 'Union',
  parliamentary: 'Parliamentary state',
};

const TONE_HEX: Record<string, string> = {
  alert: 'rgb(var(--c-alert))',
  warn: 'rgb(var(--c-warn))',
  ok: 'rgb(var(--c-ok))',
  neutral: 'rgb(var(--c-ink-muted))',
};

interface NavItem {
  href: string;
  label: string;
}

/**
 * National Shell — a full-screen, persistent sovereign command environment.
 * Fixed command rail · global command header · active alert strip ·
 * scrollable operational canvas · persistent live event ticker. Dark
 * sovereign palette is scoped via `.sov`, so citizen/public/admin surfaces
 * keep the light institutional theme. Global-state neutral: all state
 * language comes from the sovereign profile, never hardcoded.
 */
export function AppShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [cab, setCab] = React.useState<CabinetOverview | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [now, setNow] = React.useState(() => Date.now());

  // Mobile command drawer: close on route change + Escape.
  React.useEffect(() => {
    setNavOpen(false);
  }, [active]);
  React.useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const load = React.useCallback(async () => {
    try {
      const [s, c, n, co] = await Promise.all([
        api.sovereign.get(),
        api.cabinet.overview(),
        api.cabinet.national(),
        api.cabinet.coordination().catch(() => null),
      ]);
      setSov(s.sovereign);
      setCab(c);
      setNat(n);
      setCoord(co);
    } catch {
      /* shell still renders; rail degrades to core workspaces */
    }
  }, []);

  React.useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 20_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const stateGroup: NavItem[] = [
    { href: '/gov', label: 'Cabinet' },
    { href: '/gov/coordination', label: 'National coordination' },
    { href: '/ops', label: 'Operations centre' },
    { href: '/audit', label: 'Oversight' },
  ];
  const institutions: NavItem[] = (cab?.institutions ?? [])
    .filter(i => i.status === 'active')
    .map(i => ({ href: `/gov/ministry/${i.id}`, label: i.name }));
  const platformGroup: NavItem[] = [
    { href: '/ministries', label: 'Institutions admin' },
    { href: '/platform', label: 'Platform operations' },
    { href: '/integrations', label: 'Interoperability' },
  ];

  const alerts = cab?.totals.activeIncidents ?? 0;
  const identity = sov ? resolveIdentity(sov) : null;
  const accent = identity?.accent ?? '#1f5fad';
  const t = shellStrings(sov?.locale ?? 'en');
  const clock = new Date(now);

  const ticker =
    coord?.timeline.slice(0, 12) ??
    nat?.crossMinistryIncidents.slice(0, 8).map(c => ({
      tone: 'alert' as const,
      title: `${c.ministry}: ${c.label}`,
      detail: c.authority,
    })) ??
    [];

  function railLink(it: NavItem) {
    const on = active === it.href;
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? 'page' : undefined}
        onClick={() => setNavOpen(false)}
        className={cn(
          'focus-ring block truncate border-l-2 px-3 py-2.5 text-sm no-underline transition-colors duration-150 ease-sov md:py-1.5',
          on
            ? 'border-l-[color:var(--accent)] bg-surface-2 font-medium text-ink'
            : 'border-transparent text-ink-muted hover:bg-surface-2/60 hover:text-ink',
        )}
      >
        {it.label}
      </Link>
    );
  }

  const railBody = (
    <>
      <Link
        href="/gov"
        onClick={() => setNavOpen(false)}
        className="focus-ring flex items-center gap-2.5 border-b border-line px-3 py-3 no-underline"
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-xs font-bold tracking-tight text-white ring-1 ring-white/15"
          style={{ backgroundColor: accent }}
        >
          {identity ? identity.seal : 'SS'}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-ink">
            {sov ? sov.stateName : 'Sovereign State'}
          </span>
          <span className="block truncate text-[11px] text-ink-muted">
            {identity?.motto || 'CivicOS · sovereign operations'}
          </span>
        </span>
      </Link>
      <div className="flex-1 space-y-5 overflow-y-auto py-4">
        <div>
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {t.state}
          </div>
          {stateGroup.map(railLink)}
        </div>
        <div>
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {t.institutions}
          </div>
          {institutions.length === 0 ? (
            <Link
              href="/ministries"
              onClick={() => setNavOpen(false)}
              className="focus-ring block px-3 py-2.5 text-sm text-ink-muted no-underline hover:text-ink md:py-1.5"
            >
              {t.compose}
            </Link>
          ) : (
            institutions.map(railLink)
          )}
        </div>
        <div>
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {t.platform}
          </div>
          {platformGroup.map(railLink)}
        </div>
      </div>
      <div className="border-t border-line px-3 py-3 text-[10px] uppercase tracking-widest text-ink-muted">
        Humans govern · AI assists
      </div>
    </>
  );

  return (
    <div
      className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      dir={identity?.dir ?? 'ltr'}
      style={{ ['--accent' as string]: accent }}
    >
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
      >
        Skip to workspace
      </a>
      <OfflineBanner />

      {/* Mobile command drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          navOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!navOpen}
      >
        <div
          onClick={() => setNavOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/60 transition-opacity duration-200 ease-sov',
            navOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <nav
          aria-label="Sovereign navigation"
          className={cn(
            'absolute inset-y-0 start-0 flex w-72 max-w-[82%] flex-col border-e border-line bg-bg shadow-elev-3 transition-transform duration-300 ease-sov',
            navOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          )}
        >
          {railBody}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Persistent command rail */}
        <nav
          aria-label="Sovereign navigation"
          className="hidden w-60 shrink-0 flex-col border-r border-line bg-bg md:flex"
        >
          {railBody}
        </nav>

        {/* Workspace column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Global command header */}
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={navOpen}
                className="focus-ring -ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-sm text-ink-soft hover:bg-surface-2 md:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none">
                  <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <span
                className="hidden rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft sm:inline"
                style={{ borderColor: 'rgb(var(--c-line))' }}
              >
                {nat ? nat.classification : 'OFFICIAL'}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {sov ? sov.stateName : 'Sovereign State'}
                </div>
                <div className="truncate text-xs text-ink-muted">
                  {sov ? STATE_FORM_LABEL[sov.stateForm] ?? sov.stateForm : '—'}
                  {sov ? ` · ${sov.executiveTitle} · ${sov.legislatureName}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-xs tabular-nums text-ink-muted lg:inline">
                {clock.toLocaleTimeString()}
              </span>
              <div className="relative hidden md:block">
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="w-48 rounded-sm border border-line bg-bg px-2 py-1 text-sm text-ink placeholder:text-ink-muted"
                />
                {q && institutions.filter(i => i.label.toLowerCase().includes(q.toLowerCase())).length > 0 ? (
                  <div className="absolute right-0 z-40 mt-1 w-64 rounded-sm border border-line bg-surface shadow-xl">
                    {institutions
                      .filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
                      .slice(0, 8)
                      .map(i => (
                        <Link
                          key={i.href}
                          href={i.href}
                          onClick={() => setQ('')}
                          className="block px-3 py-1.5 text-sm text-ink no-underline hover:bg-surface-2"
                        >
                          {i.label}
                        </Link>
                      ))}
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen(o => !o)}
                  className={cn(
                    'rounded-sm border px-2 py-0.5 text-xs',
                    alerts > 0
                      ? 'border-alert/60 bg-alert/15 text-alert'
                      : 'border-line bg-surface-2 text-ink-soft',
                  )}
                  title="Active institutional incidents"
                >
                  {t.activeIncidents(alerts)}
                </button>
                {notifOpen ? (
                  <div
                    role="dialog"
                    aria-label="Notification centre"
                    className="absolute right-0 z-40 mt-2 w-80 rounded-md border border-line bg-surface p-3 shadow-xl"
                  >
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Cross-ministry incidents
                    </div>
                    {nat && nat.crossMinistryIncidents.length > 0 ? (
                      <ul className="space-y-2">
                        {nat.crossMinistryIncidents.slice(0, 6).map((c, i) => (
                          <li key={i} className="text-sm">
                            <Link
                              href={`/gov/ministry/${c.ministryId}`}
                              onClick={() => setNotifOpen(false)}
                              className="text-ink no-underline"
                            >
                              <span className="font-medium">{c.label}</span>
                              <div className="text-xs text-ink-muted">
                                {c.ministry} · {c.severity.toUpperCase()} · {c.authority}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-muted">No active incidents.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <span className="hidden rounded-sm border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-soft sm:inline">
                {nat ? nat.environment : 'Production'} · {sov?.currency ?? 'USD'}
              </span>
              <AccessibilityMenu />
            </div>
          </header>

          {/* Active alert strip */}
          {alerts > 0 && nat && nat.crossMinistryIncidents.length > 0 ? (
            <div className="flex shrink-0 items-center gap-3 overflow-hidden border-b border-alert/40 bg-alert/10 px-4 py-1 text-xs">
              <span className="shrink-0 font-semibold uppercase tracking-widest text-alert">
                ⚠ {alerts} active
              </span>
              <div className="flex min-w-0 flex-1 gap-6 overflow-hidden">
                {nat.crossMinistryIncidents.slice(0, 4).map((c, i) => (
                  <Link
                    key={i}
                    href={`/gov/ministry/${c.ministryId}`}
                    className="truncate text-ink-soft no-underline hover:text-ink"
                  >
                    <span className="font-medium">{c.ministry}</span>: {c.label} ·{' '}
                    {c.severity.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Operational canvas (only this scrolls) */}
          <main id="workspace" className="min-w-0 flex-1 overflow-y-auto bg-bg p-4 lg:p-6">
            {children}
          </main>

          {/* Persistent live event ticker */}
          <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-1.5">
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ok" />
              {coord ? `Live · T${coord.tick}` : 'Live'}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
              {ticker.length === 0 ? (
                <span className="text-xs text-ink-muted">National operations nominal — no recent events.</span>
              ) : (
                ticker.map((ev, i) => (
                  <span key={i} className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: TONE_HEX[ev.tone] ?? TONE_HEX.neutral }}
                    />
                    <span className="truncate">{ev.title}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
