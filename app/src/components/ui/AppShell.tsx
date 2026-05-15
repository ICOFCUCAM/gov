'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AccessibilityMenu } from './AccessibilityMenu';
import { OfflineBanner } from './OfflineBanner';
import { api } from '@/lib/api/client';
import type { CabinetOverview, SovereignProfile } from '@/lib/api/types';

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

  React.useEffect(() => {
    void (async () => {
      try {
        const [s, c] = await Promise.all([
          api.sovereign.get(),
          api.cabinet.overview(),
        ]);
        setSov(s.sovereign);
        setCab(c);
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
    <div className="min-h-screen bg-bg text-ink">
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
          <Link href="/gov" className="px-2 text-white no-underline">
            <div className="text-sm font-semibold tracking-tight">CivicOS</div>
            <div className="truncate text-xs text-[#8b95a3]">
              {sov ? sov.stateName : 'Sovereign State'}
            </div>
          </Link>
          <div className="mt-5 space-y-5 overflow-y-auto">
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                State
              </div>
              {stateGroup.map(railLink)}
            </div>
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                Institutions
              </div>
              {institutions.length === 0 ? (
                <Link
                  href="/ministries"
                  className="block px-3 py-1.5 text-sm text-[#8b95a3] no-underline hover:text-white"
                >
                  + Compose an institution
                </Link>
              ) : (
                institutions.map(railLink)
              )}
            </div>
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[#6c7682]">
                Platform
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
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {sov ? sov.stateName : 'Sovereign State'}
              </div>
              <div className="truncate text-xs text-ink-muted">
                {sov ? STATE_FORM_LABEL[sov.stateForm] ?? sov.stateForm : '—'}
                {sov ? ` · ${sov.executiveTitle} · ${sov.legislatureName}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  alerts > 0
                    ? 'bg-[#f7e3e1] text-alert'
                    : 'bg-surface-2 text-ink-soft',
                )}
                title="Active institutional incidents"
              >
                {alerts} active incident{alerts === 1 ? '' : 's'}
              </span>
              <span className="hidden rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-soft sm:inline">
                {sov?.currency ?? 'USD'}
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
