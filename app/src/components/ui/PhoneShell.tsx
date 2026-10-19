import * as React from 'react';
import { cn } from '@/lib/utils';
import { TabBar } from './TabBar';
import { SkipLink } from './SkipLink';

import { nationTextDir } from '@/lib/nation/registry';
export interface PhoneShellProps {
  /** Header content (title / actions) */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Suppress the bottom tab bar when needed */
  hideTabBar?: boolean;
  /** Currently-active tab path (matched by TabBar) */
  activeTab?: string;
  className?: string;
}

/**
 * Phone-shaped container that frames citizen-facing surfaces on desktop,
 * and goes full-bleed on mobile (per Companion 152).
 */
export function PhoneShell({
  header,
  children,
  hideTabBar = false,
  activeTab,
  className,
}: PhoneShellProps) {
  // The page's one <main id="main"> (pages wrap the shell in a <div>, never another <main>), reached by the skip link.
  return (
    <div className={cn('phone', className)} role="region" aria-label="Civic Wallet" dir={nationTextDir()}>
      <SkipLink />
      {header ? (
        <header className="px-4 py-3 border-b border-line bg-surface flex items-center justify-between gap-3">
          {header}
        </header>
      ) : null}
      <main id="main" tabIndex={-1} className="p-4 overflow-y-auto outline-none">
        <div className="space-y-4">{children}</div>
      </main>
      {hideTabBar ? null : (
        <footer>
          <TabBar activeTab={activeTab} />
        </footer>
      )}
    </div>
  );
}
