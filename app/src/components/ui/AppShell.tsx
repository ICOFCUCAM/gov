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

interface NavItem {
  href: string;
  label: string;
}

/**
 * National Shell — the sovereign operating environment. A persistent command
 * rail + command bar + workspace pane. Institution workspaces are dynamic
 * (from the configured ministries), so the same shell serves a republic, a
 * federation, a monarchy, or a city-state without code changes. Global-state
 * neutral by construction: all state language comes from the sovereign
 * profile, never hardcoded.
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
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    void (async () => {
      try {
        const [s, c, n] = await Promise.all([
          api.sovereign.get(),
          api.cabinet.overview(),
          api.cabinet.national(),
        ]);
        setSov(s.sovereign);
        setCab(c);
        setNat(n);
      } catch {
        /* shell still renders; rail degrades to core workspaces */
      }
    })();
  }, []);

  const stateGroup: NavItem[] = [
    { href: '/gov', label: 'Cabinet' },
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
  const t = shellStrings(sov?.locale ?? 'en');

  function railLink(it: NavItem) {
    const on = active === it.href;
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? 'page' : undefined}
        className={cn(
          'block truncate rounded-sm px-3 py-1.5 text-sm no-underline',
          on
            ? 'bg-[#1f2630] text-white font-medium'
            : 'text-[#c7cdd6] hover:bg-[#1a2029]',
        )}
      >
        {it.label}
      </Link>
    );
  }

  return (
    <div
      className="min-h-screen bg-bg text-ink"
      dir={identity?.dir ?? 'ltr'}
      style={identity ? ({ ['--accent' as string]: identity.accent }) : undefined}
    >
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
      >
        Skip to workspace
      </a>
      <OfflineBanner />
      <div className="flex">
        {/* Command rail */}
        <nav
          aria-label="Sovereign navigation"
          className="hidden w-60 shrink-0 flex-col bg-[#0f141b] px-3 py-4 md:flex md:min-h-screen"
        >
          <Link href="/gov" className="flex items-center gap-2.5 px-2 text-white no-underline">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-xs font-bold tracking-tight text-white ring-1 ring-white/20"
              style={{ backgroundColor: identity?.accent ?? '#1f2630' }}
            >
              {identity ? identity.seal : 'SS'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">
                {sov ? sov.stateName : 'Sovereign State'}
              </span>
              <span className="block truncate text-[11px] text-[#8b95a3]">
                {identity?.motto || 'CivicOS · sovereign operations'}
              </span>
            </span>
          </Link>
          <div className="mt-5 space-y-5 overflow-y-auto">
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                {t.state}
              </div>
              {stateGroup.map(railLink)}
            </div>
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                {t.institutions}
              </div>
              {institutions.length === 0 ? (
                <Link
                  href="/ministries"
                  className="block px-3 py-1.5 text-sm text-[#8b95a3] no-underline hover:text-white"
                >
                  {t.compose}
                </Link>
              ) : (
                institutions.map(railLink)
              )}
            </div>
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                {t.platform}
              </div>
              {platformGroup.map(railLink)}
            </div>
          </div>
          <div className="mt-auto px-3 pt-4 text-[10px] text-[#5b636e]">
            Humans govern · AI assists
          </div>
        </nav>

        {/* Workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden rounded-sm border border-[#9aa1ab] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft sm:inline">
                {nat ? nat.classification : 'OFFICIAL'}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {sov ? sov.stateName : 'Sovereign State'}
                </div>
                <div className="truncate text-xs text-ink-muted">
                  {sov ? STATE_FORM_LABEL[sov.stateForm] ?? sov.stateForm : '—'}
                  {sov ? ` · ${sov.executiveTitle} · ${sov.legislatureName}` : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Global institution search */}
              <div className="relative hidden md:block">
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="w-48 rounded-sm border border-line bg-surface px-2 py-1 text-sm"
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
                          className="block px-3 py-1.5 text-sm no-underline text-ink hover:bg-surface-2"
                        >
                          {i.label}
                        </Link>
                      ))}
                  </div>
                ) : null}
              </div>
              {/* Notification centre */}
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen(o => !o)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    alerts > 0 ? 'bg-[#f7e3e1] text-alert' : 'bg-surface-2 text-ink-soft',
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
                              className="no-underline text-ink"
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
              <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-soft sm:inline">
                {nat ? nat.environment : 'Production'} · {sov?.currency ?? 'USD'}
              </span>
              <AccessibilityMenu />
            </div>
          </header>
          <main id="workspace" className="min-w-0 flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
