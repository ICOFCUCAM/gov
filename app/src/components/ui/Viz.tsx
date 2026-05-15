import * as React from 'react';
import { cn } from '@/lib/utils';
import type { OpsTone } from '@/lib/api/types';

/**
 * Domain visualisation primitives — dense, neutral, dependency-free
 * (div-based, low-bandwidth safe, no chart library). Built for sovereign
 * command surfaces, not marketing pages.
 */

/** Compact period bar series (trend at a glance). */
export function Sparkbars({
  points,
  goodWhenUp,
  label,
  unit,
  current,
  mean,
}: {
  points: number[];
  goodWhenUp: boolean;
  label: string;
  unit: string;
  current: number;
  mean: number;
}) {
  const max = Math.max(...points, 1);
  const up = current >= mean;
  const good = goodWhenUp ? up : !up;
  return (
    <div className="rounded-sm border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
        <span
          className={cn(
            'font-serif text-lg tabular-nums',
            good ? 'text-ok' : 'text-alert',
          )}
        >
          {current}
          {unit}
        </span>
      </div>
      <div className="mt-2 flex h-10 items-end gap-0.5" aria-hidden>
        {points.map((p, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-[1px]',
              i === points.length - 1
                ? good
                  ? 'bg-ok'
                  : 'bg-alert'
                : 'bg-[#cdd3dd]',
            )}
            style={{ height: `${Math.max(6, (p / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 text-[11px] text-ink-muted tabular-nums">
        mean {mean}
        {unit} · last 12 periods
      </div>
    </div>
  );
}

/** Regional status heat-strip — one cell per region, tone-coded. */
export function HeatStrip({
  cells,
}: {
  cells: { label: string; tone: OpsTone; value?: string }[];
}) {
  const bg: Record<OpsTone, string> = {
    ok: 'bg-[#dceee4] text-ok',
    warn: 'bg-[#fbf2dd] text-[#6a4d00]',
    alert: 'bg-[#f7e3e1] text-alert',
    neutral: 'bg-surface-2 text-ink-soft',
  };
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
      {cells.map(c => (
        <div
          key={c.label}
          className={cn('rounded-sm px-2 py-2 text-center', bg[c.tone])}
          title={`${c.label}${c.value ? ` · ${c.value}` : ''}`}
        >
          <div className="truncate text-xs font-medium">{c.label}</div>
          {c.value ? <div className="text-sm tabular-nums">{c.value}</div> : null}
        </div>
      ))}
    </div>
  );
}

/** Value-vs-baseline gauge row. */
export function GaugeRow({
  label,
  value,
  baseline,
  unit,
  goodWhenUp,
}: {
  label: string;
  value: number;
  baseline: number;
  unit: string;
  goodWhenUp: boolean;
}) {
  const max = Math.max(value, baseline, 1);
  const good = goodWhenUp ? value >= baseline : value <= baseline;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-ink-muted">
          {value}
          {unit} · baseline {baseline}
          {unit}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full', good ? 'bg-ok' : 'bg-alert')}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
