// The on-screen marker for a figure that is not observed (lib/twin/signal.ts):
// a short word — Sample, Modelled, Not connected — with the source on hover
// and for screen readers. Observed and reported figures carry no marker.

import * as React from 'react';
import { SIGNAL_LABEL, needsMarker, type SignalKind } from '@/lib/twin/signal';

export function SignalTag({ kind, source, className = '' }: { kind?: SignalKind; source?: string; className?: string }) {
  if (!kind || !needsMarker(kind)) return null;
  return (
    <span title={source} className={`shrink-0 rounded-[2px] border border-dashed border-current px-1 text-[8px] font-semibold uppercase leading-[1.4] tracking-[0.08em] text-ink-muted ${className}`}>
      {SIGNAL_LABEL[kind]}
      {source ? <span className="sr-only">: {source}</span> : null}
    </span>
  );
}
