'use client';

// Interior Temporal Intelligence — Seasonal Congestion Forecast. Forward
// utilisation trajectories per agency with future pressure shadows and
// collapse windows; active sovereign seasonal cycles.

import * as React from 'react';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';

function Spark({ series, peak }: { series: number[]; peak: number }) {
  return (
    <span className="flex h-5 items-end gap-px">
      {series.map((v, i) => {
        const h = Math.max(2, Math.round((v / Math.max(100, peak)) * 20));
        const col = v >= 130 ? 'rgb(var(--c-alert))' : v >= 100 ? '#e0673a' : v >= 80 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
        return <span key={i} style={{ height: `${h}px`, width: '4px', background: col, opacity: i === 0 ? 1 : 0.55 + i / (series.length * 2) }} />;
      })}
    </span>
  );
}

export function TemporalForecast({ id, now }: { id: string; now: number }) {
  void id;
  const b = temporalBoard(now);
  const ranked = [...b.trajectories].sort((x, y) => (x.collapseEta ?? 99) - (y.collapseEta ?? 99) || y.peakUtil - x.peakUtil);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line bg-black/30 px-3 py-1.5 text-[10px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Active seasonal cycles</span>
        {b.active.length === 0 ? <span className="text-ink-muted">none — baseline window</span> :
          b.active.map(s => (
            <span key={s.season.key} className="rounded-[2px] border border-line px-1.5 py-px text-[9px] uppercase tracking-[0.08em]"
              style={{ color: s.intensity >= 0.85 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>
              {s.season.label} · {Math.round(s.intensity * 100)}%
            </span>
          ))}
        <span className="ml-auto text-[9px] text-ink-muted">horizon +{b.trajectories[0]!.util.length - 1} epochs</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-36 shrink-0">Agency</span>
          <span className="w-32 shrink-0">Utilisation trajectory</span>
          <span className="w-16 shrink-0">Now</span>
          <span className="w-16 shrink-0">Peak</span>
          <span className="w-28 shrink-0">Collapse window</span>
          <span className="min-w-0 flex-1">Backlog → / corruption →</span>
        </div>
        {ranked.map(t => (
          <div key={t.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-36 shrink-0 truncate text-ink">{t.label}</span>
            <span className="w-32 shrink-0"><Spark series={t.util} peak={t.peakUtil} /></span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{t.util[0]}%</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: t.peakUtil >= 130 ? 'rgb(var(--c-alert))' : t.peakUtil >= 100 ? '#e0673a' : 'rgb(var(--c-ok))' }}>{t.peakUtil}%</span>
            <span className="w-28 shrink-0 text-[9px]" style={{ color: t.collapseEta == null ? 'rgb(var(--c-ok))' : t.collapseEta <= 3 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>
              {t.collapseEta == null ? 'no collapse in window' : `${t.collapseKind} in ~${t.collapseEta}ep`}
            </span>
            <span className="min-w-0 flex-1 truncate text-ink-muted tabular-nums">
              bl {t.backlog[0]}→{t.backlog[t.backlog.length - 1]} · cr {t.corruption[0]}→{t.corruption[t.corruption.length - 1]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Bars fade into the future (left = now). Seasonal cycles compound onto growth velocity — the ministry forecasts
        saturation before it occurs rather than reacting after.
      </p>
    </div>
  );
}
