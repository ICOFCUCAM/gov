import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AccessibilityMenu } from './AccessibilityMenu';
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
    <div className="min-h-screen bg-bg text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-2 focus:text-surface"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold no-underline text-ink">
            CivicOS
          </Link>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-soft">
            {ROLE_LABEL[role]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-muted sm:inline">{who}</span>
          <AccessibilityMenu />
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-0">
        <nav
          aria-label="Operator navigation"
          className="hidden w-52 shrink-0 border-r border-line p-3 md:block"
        >
          <ul className="space-y-1">
            {nav.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active === item.href ? 'page' : undefined}
                  className={cn(
                    'block rounded-sm px-3 py-2 text-sm no-underline',
                    active === item.href
                      ? 'bg-surface-2 font-semibold text-ink'
                      : 'text-ink-soft hover:bg-surface-2',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0 flex-1 p-4">
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
