'use client';

// Shared sovereign-pulse header strip. Renders a one-line governance
// status from the civilization organism, suitable for shell chrome.

import * as React from 'react';
import { governancePulse } from '@/lib/gov/governance-pulse';

export function SovereignHeaderPulse({ now, accent }: { now: number; accent?: string }) {
  const p = governancePulse(now);
  const col = p.health >= 70 ? 'rgb(var(--c-ok))' : p.health >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1 text-[9px] font-mono"
      style={{ borderTop: `1px solid color-mix(in srgb,${accent ?? col} 26%,transparent)`, background: 'rgba(0,0,0,0.18)' }}>
      <span className="uppercase tracking-[0.18em] text-ink-muted">Sovereign pulse</span>
      <span className="uppercase tracking-[0.12em]" style={{ color: col }}>{p.mode}</span>
      <span className="text-ink-muted">health <span className="font-semibold tabular-nums" style={{ color: col }}>{p.health}</span></span>
      <span className="text-ink-muted">weakest <span className="font-semibold text-ink">{p.dominantLabel}</span> ({p.dominantIndex})</span>
      <span className="ml-auto text-ink-muted">alerts {p.alerts} · warns {p.warns}</span>
    </div>
  );
}
