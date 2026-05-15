import * as React from 'react';
import { cn } from '@/lib/utils';
import { TabBar } from './TabBar';

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
  return (
    <div className={cn('phone', className)} role="region" aria-label="Civic Wallet">
      {header ? (
        <header className="px-4 py-3 border-b border-line bg-surface flex items-center justify-between gap-3">
          {header}
        </header>
      ) : null}
      <main className="p-4 overflow-y-auto">
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
