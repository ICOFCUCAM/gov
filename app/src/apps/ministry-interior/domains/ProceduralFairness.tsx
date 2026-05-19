'use client';

// Interior Civic Legitimacy — Procedural Fairness. Whether processes are
// perceived fair, timely, unbiased and appealable: fairness continuity,
// regional imbalance and appeal integrity (aggregate only).

import * as React from 'react';
import { civicBoard } from '@/lib/gov/civic-legitimacy';

export function ProceduralFairness({ id, now }: { id: string; now: number }) {
  void id;
  const b = civicBoard(now);
  const fc = b.fairnessContinuity;
  const fcCol = fc >= 65 ? 'rgb(var(--c-ok))' : fc >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  const imbCol = b.regionalImbalance >= 16 ? 'rgb(var(--c-alert))' : b.regionalImbalance >= 9 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Fairness continuity</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: fcCol }}>{fc}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Regional imbalance</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: imbCol }}>{b.regionalImbalance}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Appeals meaningful</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: b.rights.appealsMeaningful >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{b.rights.appealsMeaningful}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Procedural legitimacy is part of constitutional stability.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-44 shrink-0">Perceived fairness</span>
          <span className="w-20 shrink-0">vs national</span>
          <span className="min-w-0 flex-1">Assessment</span>
        </div>
        {b.regions.map(r => {
          const delta = r.fairness - b.fairnessContinuity;
          return (
            <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-ink">{r.region}</span>
              <span className="flex w-44 shrink-0 items-center gap-1">
                <span className="relative h-2 w-32 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${r.fairness}%`, background: r.fairness >= 60 ? 'rgb(var(--c-ok))' : r.fairness >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }} /></span>
                <span className="tabular-nums text-ink-muted">{r.fairness}</span>
              </span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: delta < -8 ? 'rgb(var(--c-alert))' : delta < 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{delta >= 0 ? '+' : ''}{delta}</span>
              <span className="min-w-0 flex-1 text-[9px] text-ink-muted">{delta < -8 ? 'regional fairness imbalance — selective-acceleration risk' : 'consistent lawful processing'}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-ink-muted">
        Detects unequal processing, selective acceleration and regional fairness imbalance — without monitoring
        ideology, suppressing dissent, or scoring citizens. Fairness is measured at process level, in aggregate.
      </p>
    </div>
  );
}
