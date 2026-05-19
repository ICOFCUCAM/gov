'use client';

// Interior Geopolitical Continuity — Migration & Humanitarian Continuity.
// Lawful, equitable, aggregate: pressure vs humanitarian capacity, border
// continuity and support continuity (no discriminatory classification).

import * as React from 'react';
import { geopoliticalBoard } from '@/lib/gov/geopolitical-continuity';

export function MigrationHumanitarian({ id, now }: { id: string; now: number }) {
  void id;
  const b = geopoliticalBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Constitutional humanitarian continuity — lawful & equitable. No ethnic targeting, discriminatory
        classification or coercive demographic engineering.
      </div>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-24 shrink-0">Pressure</span>
          <span className="w-28 shrink-0">Humanitarian cap.</span>
          <span className="w-24 shrink-0">Absorption</span>
          <span className="w-24 shrink-0">Border cont.</span>
          <span className="min-w-0 flex-1">Displacement vs support</span>
        </div>
        {b.migration.map(m => (
          <div key={m.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{m.region}</span>
            <span className="w-24 shrink-0 tabular-nums" style={{ color: m.migrationPressure > 55 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{m.migrationPressure}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: m.humanitarianCapacity >= 60 ? 'rgb(var(--c-ok))' : m.humanitarianCapacity >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }}>{m.humanitarianCapacity}</span>
            <span className="w-24 shrink-0 tabular-nums" style={{ color: m.absorptionResilience >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{m.absorptionResilience}</span>
            <span className="w-24 shrink-0 tabular-nums" style={{ color: m.borderContinuity >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{m.borderContinuity}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 w-32 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${m.displacementStress}%`, background: m.displacementStress > 70 ? 'rgb(var(--c-alert))' : m.displacementStress > 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} /></span>
              <span className="tabular-nums text-ink-muted">{m.displacementStress}</span>
              <span className="text-[8px] text-ink-muted">/ support {m.supportContinuity}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Tracks whether institutions can lawfully sustain humanitarian continuity under migration pressure —
        focused only on constitutional governance resilience, never on border profiling or demographic engineering.
      </p>
    </div>
  );
}
