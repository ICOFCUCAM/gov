'use client';

// Interior Apex — Continuity Matrix. Single one-screen view of every
// continuity engine's mode + the organism master mode.

import * as React from 'react';
import { continuityMatrix } from '@/lib/gov/continuity-matrix';

export function ContinuityMatrix({ id, now }: { id: string; now: number }) {
  void id;
  const m = continuityMatrix(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-2 text-[11px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted mr-2">Master organism mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{m.organismMode}</span>
      </div>
      <div className="border border-line">
        {m.layers.map(row => (
          <div key={row.layer} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-52 shrink-0 truncate text-ink">{row.layer}</span>
            <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.1em] text-ink-soft">{row.mode}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Every continuity engine declares one mode; the organism mode is their constitutional synthesis. Modes evolve
        deterministically with the operational epoch.
      </p>
    </div>
  );
}
