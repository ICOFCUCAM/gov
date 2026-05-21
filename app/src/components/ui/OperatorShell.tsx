import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AccessibilityMenu } from './AccessibilityMenu';
import { IdentityBadge } from '@/components/identity/IdentityBadge';
import { ChainSentinel } from '@/components/identity/ChainSentinel';
import { OfflineBanner } from './OfflineBanner';

export type OperatorRole = 'officer' | 'ministry' | 'auditor' | 'admin';

interface NavItem {
  href: string;
  label: string;
}

const NAV: Record<OperatorRole, NavItem[]> = {
  officer: [
    { href: '/console', label: 'My queue' },
    { href: '/console?view=all', label: 'All cases' },
  ],
  ministry: [
    { href: '/ops', label: 'Operations centre' },
    { href: '/control', label: 'Service health' },
    { href: '/audit', label: 'Oversight' },
  ],
  auditor: [
    { href: '/audit', label: 'Audit trail' },
    { href: '/ops', label: 'Operations centre' },
  ],
  admin: [
    { href: '/ops', label: 'Operations centre' },
    { href: '/ministries', label: 'Institutions' },
    { href: '/platform', label: 'Platform operations' },
    { href: '/integrations', label: 'Interoperability' },
    { href: '/admin/onboarding', label: 'Onboarding' },
  ],
};

const ROLE_LABEL: Record<OperatorRole, string> = {
  officer: 'Officer',
  ministry: 'Ministry operator',
  auditor: 'Auditor',
  admin: 'Administrator',
};

export interface OperatorShellProps {
  role: OperatorRole;
  who: string; // signed-in person + scope, e.g. "K. Otieno · Social Protection, Kiambu"
  active?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Single operational shell for every non-citizen role. Calm, uncluttered,
 * role-scoped navigation. The role chip is always visible so an operator
 * never loses track of which authority they are acting under.
 */
export function OperatorShell({
  role,
  who,
  active,
  toolbar,
  children,
}: OperatorShellProps) {
  const nav = NAV[role];
  return (
    <div
      className="sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]"
      style={{ ['--accent' as string]: '#1f5fad' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="focus-ring flex items-center gap-2.5 no-underline">
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-[11px] font-bold tracking-tight text-white ring-1 ring-white/15"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              CO
            </span>
            <span className="text-sm font-semibold tracking-[0.16em] text-ink">CIVICOS</span>
          </Link>
          <span className="rounded-sm border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            {ROLE_LABEL[role]}
          </span>
          <span className="hidden rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft sm:inline">
            OFFICIAL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-ink-muted sm:inline">{who}</span>
          <ChainSentinel className="hidden md:inline-flex" />
          <IdentityBadge className="hidden md:flex" />
          <AccessibilityMenu />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Operator navigation"
          className="hidden w-56 shrink-0 flex-col border-r border-line bg-bg md:flex"
        >
          <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {ROLE_LABEL[role]}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {nav.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active === item.href ? 'page' : undefined}
                  className={cn(
                    'focus-ring block truncate border-l-2 px-3 py-2.5 text-sm no-underline transition-colors duration-150 ease-sov md:py-2',
                    active === item.href
                      ? 'border-l-[color:var(--accent)] bg-surface-2 font-semibold text-ink'
                      : 'border-transparent text-ink-muted hover:bg-surface-2/60 hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-3 py-3 text-[10px] uppercase tracking-widest text-ink-muted">
            Humans govern · AI assists
          </div>
        </nav>
        <main id="main" className="min-w-0 flex-1 overflow-y-auto bg-bg p-4 lg:p-6">
          {toolbar ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {toolbar}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
