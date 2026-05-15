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

const TONE_RGB: Record<OpsTone, string> = {
  ok: '34,124,77',
  warn: '154,110,0',
  alert: '178,46,40',
  neutral: '90,99,110',
};

/**
 * Geo-neutral region matrix — a choropleth-style operational map without a
 * geographic projection (sovereign-neutral: works for any country's regions,
 * states, emirates or districts). Intensity-shaded tiles, tone-coded, with
 * optional selection for drill-through.
 */
export function RegionMatrix({
  cells,
  selected,
  onSelect,
}: {
  cells: { label: string; tone: OpsTone; intensity: number; value?: string }[];
  selected?: string;
  onSelect?: (label: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {cells.map(c => {
          const a = 0.16 + 0.66 * Math.max(0, Math.min(1, c.intensity / 100));
          const on = selected === c.label;
          const Tag = onSelect ? 'button' : 'div';
          return (
            <Tag
              key={c.label}
              {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(c.label) } : {})}
              title={`${c.label}${c.value ? ` · ${c.value}` : ''} · ${c.tone}`}
              className={cn(
                'flex aspect-[4/3] flex-col justify-between rounded-sm border p-2 text-left',
                on ? 'border-ink ring-1 ring-ink' : 'border-line',
                onSelect && 'hover:border-ink',
              )}
              style={{ backgroundColor: `rgba(${TONE_RGB[c.tone]},${a})` }}
            >
              <span className="truncate text-[11px] font-medium text-ink">{c.label}</span>
              {c.value ? (
                <span className="font-serif text-lg tabular-nums text-ink">{c.value}</span>
              ) : null}
            </Tag>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
        {(['ok', 'warn', 'alert'] as OpsTone[]).map(t => (
          <span key={t} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[1px]"
              style={{ backgroundColor: `rgba(${TONE_RGB[t]},0.7)` }}
            />
            {t === 'ok' ? 'stable' : t === 'warn' ? 'strained' : 'critical'}
          </span>
        ))}
        <span className="ml-auto">tile shade ∝ load intensity</span>
      </div>
    </div>
  );
}

/** SLA compliance monitor — per-stream bar against a target threshold. */
export function SLAMonitor({
  rows,
}: {
  rows: { label: string; compliancePct: number; target: number }[];
}) {
  return (
    <div className="space-y-2">
      {rows.map(r => {
        const met = r.compliancePct >= r.target;
        return (
          <div key={r.label}>
            <div className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span
                className={cn(
                  'tabular-nums',
                  met ? 'text-ok' : 'text-alert',
                )}
              >
                {r.compliancePct}% · target {r.target}%
              </span>
            </div>
            <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn('h-full', met ? 'bg-ok' : 'bg-alert')}
                style={{ width: `${Math.max(0, Math.min(100, r.compliancePct))}%` }}
              />
              <div
                className="absolute top-0 h-full w-px bg-ink"
                style={{ left: `${Math.max(0, Math.min(100, r.target))}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Proportional flow distribution — a single stacked bar showing where
 * operational load (or budget execution) sits across segments, with a
 * legend. Treasury-flow / load-concentration view.
 */
export function FlowBars({
  segments,
}: {
  segments: { label: string; value: number; tone?: OpsTone }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-sm border border-line">
        {segments.map(s => (
          <div
            key={s.label}
            title={`${s.label} · ${s.value} (${Math.round((s.value / total) * 100)}%)`}
            style={{
              width: `${(s.value / total) * 100}%`,
              backgroundColor: `rgba(${TONE_RGB[s.tone ?? 'neutral']},0.62)`,
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]"
                style={{ backgroundColor: `rgba(${TONE_RGB[s.tone ?? 'neutral']},0.62)` }}
              />
              <span className="truncate text-ink-muted">{s.label}</span>
            </span>
            <span className="tabular-nums">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
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
