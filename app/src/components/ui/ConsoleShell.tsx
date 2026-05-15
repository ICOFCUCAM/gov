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
    <div
      className={cn(
        'sov flex h-screen flex-col overflow-hidden font-sans [height:100dvh]',
        className,
      )}
      style={{ ['--accent' as string]: '#1f5fad' }}
    >
      {topbar ? (
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-6 py-3">
          {topbar}
        </header>
      ) : null}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-line lg:grid-cols-[280px_1fr_400px]">
        {left ? (
          <aside
            aria-label="Queue"
            className="overflow-y-auto bg-bg p-4"
          >
            {left}
          </aside>
        ) : null}
        <section
          aria-label="Case in focus"
          className="overflow-y-auto bg-bg p-4 lg:p-6"
        >
          {center}
        </section>
        {right ? (
          <section
            aria-label="Copilot and decision"
            className="space-y-4 overflow-y-auto border-l border-line bg-surface p-4"
          >
            {right}
          </section>
        ) : null}
      </main>
    </div>
  );
}
