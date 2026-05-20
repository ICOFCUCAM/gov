'use client';

// Interior — Operational Timeline. Persistent incident memory across
// recent operational epochs — the ministry remembers historically.

import * as React from 'react';
import { operationalTimeline, eventStreamBoard } from '@/lib/gov/sovereign-events';

export function OperationalTimeline({ id, now }: { id: string; now: number }) {
  void id;
  const tl = operationalTimeline(now, 10);
  const b = eventStreamBoard(now);
  const peak = Math.max(1, ...tl.map(r => r.total));
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: 'color-mix(in srgb,#e0a23a 45%,transparent)', background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Operational memory</span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">{tl.length} epoch lookback</span>
        <span className="ml-auto text-[9px] text-ink-muted">
          peak {peak} · current critical {b.criticalCount} · national {b.nationalCount}
        </span>
      </div>

      <div className="border border-line bg-black/15 p-3">
        <div className="flex h-24 items-end gap-1">
          {tl.map(r => {
            const totalH = Math.max(2, Math.round((r.total / peak) * 92));
            const critH = Math.max(0, Math.round((r.critical / peak) * 92));
            return (
              <div key={r.epoch} className="relative flex-1" title={`epoch ${r.epoch} · total ${r.total} · critical ${r.critical}`}>
                <span className="absolute bottom-0 left-0 right-0" style={{ height: `${totalH}px`, background: 'color-mix(in srgb,#e0a23a 36%,transparent)' }} />
                <span className="absolute bottom-0 left-0 right-0" style={{ height: `${critH}px`, background: 'rgb(var(--c-alert))' }} />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-1 text-[7px] text-ink-muted">
          {tl.map(r => <span key={r.epoch} className="flex-1 text-center tabular-nums">E{r.epoch}</span>)}
        </div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-16 shrink-0">Epoch</span>
          <span className="w-20 shrink-0">Total</span>
          <span className="w-20 shrink-0">Critical</span>
          <span className="min-w-0 flex-1">Distribution</span>
        </div>
        {[...tl].reverse().map(r => (
          <div key={r.epoch} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">E{r.epoch}</span>
            <span className="w-20 shrink-0 tabular-nums text-ink">{r.total}</span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: r.critical ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{r.critical}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${(r.total / peak) * 100}%`, background: '#e0a23a' }} />
                <span className="absolute inset-y-0 left-0" style={{ width: `${(r.critical / peak) * 100}%`, background: 'rgb(var(--c-alert))' }} />
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        The ministry remembers — incident lineage persists across epochs. Amber represents total incident volume;
        red marks the critical / national-tier subset.
      </p>
    </div>
  );
}
