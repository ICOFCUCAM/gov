'use client';

// Interior Apex — Civilization Organism. Single-view synthesis of every
// continuity layer: the nation's sovereign-civilization health, master
// organism mode and aggregate safeguard count.

import * as React from 'react';
import { civilizationOrganism } from '@/lib/gov/civilization-organism';
import { organismTrend } from '@/lib/gov/organism-trend';

const TONE: Record<'ok' | 'warn' | 'alert', string> = {
  ok: 'rgb(var(--c-ok))', warn: 'rgb(var(--c-warn))', alert: 'rgb(var(--c-alert))',
};

export function CivilizationOrganism({ id, now }: { id: string; now: number }) {
  void id;
  const o = civilizationOrganism(now);
  const trend = organismTrend(now);
  const healthCol = o.nationalSovereignHealth >= 70 ? 'rgb(var(--c-ok))' : o.nationalSovereignHealth >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  const trendCol = trend.direction === 'improving' ? 'rgb(var(--c-ok))' : trend.direction === 'degrading' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))';
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${healthCol} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Sovereign organism mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{o.organismMode}</span>
        <span className="text-ink-muted">national sovereign health <span className="font-semibold tabular-nums" style={{ color: healthCol }}>{o.nationalSovereignHealth}</span></span>
        <span className="ml-auto flex items-center gap-2 text-[9px] text-ink-muted">
          <span>alerts {o.alerts} · warns {o.warns} · safeguard sets {o.safeguardSetCount} · prohibited {o.totalProhibitedCount}</span>
          <span className="flex h-3 items-end gap-px" aria-label="health trend">
            {trend.health.map((h, i) => (
              <span key={i} style={{ height: `${Math.max(2, Math.round((h / 100) * 12))}px`, width: '4px', background: trendCol, opacity: 0.5 + i / (trend.health.length * 2) }} />
            ))}
          </span>
          <span className="uppercase tracking-[0.1em]" style={{ color: trendCol }}>{trend.direction}{trend.slope >= 0 ? ' +' : ' '}{trend.slope}</span>
        </span>
      </div>

      <div className="border border-line bg-black/10 px-2 py-1 text-[10px] text-ink-muted">
        <span className="text-[9px] uppercase tracking-[0.16em] text-ink-soft mr-2">▌ Reinforcement priority</span>
        {o.priorityLayers.map((p, i) => (
          <span key={p.key} className="mr-2">
            {i + 1}. <span className="text-ink">{p.label}</span> <span className="tabular-nums">({p.index})</span>
          </span>
        ))}
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-44 shrink-0">Continuity layer</span>
          <span className="w-16 shrink-0">Index</span>
          <span className="min-w-0 flex-1">Layer health</span>
        </div>
        {o.layers.map(l => (
          <div key={l.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-44 shrink-0 truncate text-ink">{l.label}</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: TONE[l.tone] }}>{l.index}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${l.index}%`, background: TONE[l.tone] }} />
              </span>
              <span className="w-16 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]" style={{ color: TONE[l.tone] }}>{l.tone}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        The Interior OS is a federation of {o.layers.length} continuity engines protected by {o.safeguardSetCount}
        structural safeguard families forbidding {o.totalProhibitedCount} abusive practices in code.
      </p>
    </div>
  );
}
