import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ConsoleShellProps {
  topbar?: React.ReactNode;
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/**
 * Three-pane officer console (Companion 153).
 * Collapses on narrow viewports.
 */
export function ConsoleShell({
  topbar,
  left,
  center,
  right,
  className,
}: ConsoleShellProps) {
  return (
    <div className={cn('min-h-screen bg-bg', className)}>
      {topbar ? (
        <header className="px-6 py-3 border-b border-line bg-surface flex items-center justify-between gap-4">
          {topbar}
        </header>
      ) : null}
      <main className="grid grid-cols-1 lg:grid-cols-[260px_1fr_380px] gap-4 p-4">
        {left ? <aside aria-label="Queue">{left}</aside> : null}
        <section aria-label="Case in focus">{center}</section>
        {right ? <section aria-label="Copilot and decision" className="space-y-4">{right}</section> : null}
      </main>
    </div>
  );
}
