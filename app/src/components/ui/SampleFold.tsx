'use client';

// One panel's generated figures, shown the way the agency apps show theirs
// (apps/_shared/RegisterRecords.tsx SimulatedView), but per panel so a screen
// can keep its real records open beside them:
//   demo and training  the panel as it is, its marker saying Sample
//   production         folded under "Not connected", rendered only when opened
// The mode comes from the root layout (lib/ops/mode-context.tsx); outside the
// provider it is production, so nothing generated reads as the nation's.

import * as React from 'react';
import { SignalTag } from '@/components/ui/SignalTag';
import { useInstallationMode } from '@/lib/ops/mode-context';
import type { InstallationMode } from '@/lib/ops/mode';

/** The marker for a generated panel: Sample where samples are allowed, Not connected in production. */
export function SampleTag({ source, mode: given, className }: { source: string; mode?: InstallationMode; className?: string }) {
  const ctx = useInstallationMode();
  const mode = given ?? ctx;
  return mode === 'production'
    ? <SignalTag kind="unavailable" source={`Not connected to this nation's records. In a demonstration this shows: ${source}`} className={className} />
    : <SignalTag kind="sample" source={source} className={className} />;
}

/**
 * Generated content of one panel. `what` names it in the folded line
 * ("Regional figures"); `source` says where the figures come from.
 */
export function SampleFold({ what, source, mode: given, children, className = '' }: {
  what: string; source: string; mode?: InstallationMode; children?: React.ReactNode; className?: string;
}) {
  const ctx = useInstallationMode();
  const mode = given ?? ctx;
  const [open, setOpen] = React.useState(false);
  if (mode !== 'production') return <>{children}</>;
  return (
    <details data-sample-fold="" className={`rounded-[3px] border border-dashed border-line ${className}`} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="focus-ring flex cursor-pointer flex-wrap items-center gap-2 px-2 py-1.5 text-[11px] text-ink-soft">
        <SignalTag kind="unavailable" source={source} />
        {what}: not connected to this nation&apos;s records. Open to see them as a simulation.
      </summary>
      {open ? <div className="p-2">{children}</div> : null}
    </details>
  );
}
