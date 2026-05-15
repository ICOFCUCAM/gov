'use client';

import * as React from 'react';
import { TONE, Spark, seed } from '@/components/features/SituationRoom';

export interface Telem { l: string; v: string; sub?: string; t?: string; spark?: boolean }

/**
 * Shared sovereign telemetry strip — the compact command tile row used
 * across every operational surface (uppercase micro-label, mono value,
 * tone colour, optional live sparkline). One density language.
 */
export function TelemetryStrip({ items, cols = 6 }: { items: Telem[]; cols?: number }) {
  const col = cols === 5 ? 'xl:grid-cols-5' : cols === 8 ? 'xl:grid-cols-8' : cols === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-6';
  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${col}`}>
      {items.map(m => (
        <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
          <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
          <div className="font-mono text-xl leading-tight tabular-nums" style={{ color: m.t ? TONE[m.t] : 'rgb(var(--c-ink))' }}>{m.v}</div>
          {m.spark
            ? <div className="-mt-0.5 opacity-80"><Spark pts={Array.from({ length: 14 }).map((_, i) => 35 + seed(`ts:${m.l}:${i}`) * 55)} tone={m.t ?? 'ok'} /></div>
            : <div className="truncate text-[10px] text-ink-muted">{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** Consistent command-surface heading: title · LIVE · meta. */
export function CommandHeading({ title, sub, live = true, right }: { title: string; sub?: string; live?: boolean; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{title}</h1>
          {live ? (
            <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
            </span>
          ) : null}
        </div>
        {sub ? <p className="text-[11px] text-ink-muted">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}
