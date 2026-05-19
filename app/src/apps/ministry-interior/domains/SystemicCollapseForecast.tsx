'use client';

// Interior National Apex — Systemic Collapse Forecast. National
// instability trajectory: collapse probability, time-to-instability,
// propagation direction and constitutional impact.

import * as React from 'react';
import { digitalTwin } from '@/lib/gov/national-causality';

export function SystemicCollapseForecast({ id, now }: { id: string; now: number }) {
  void id;
  const t = digitalTwin(now);
  const c = t.collapse;
  const pCol = c.probabilityPct >= 60 ? 'rgb(var(--c-alert))' : c.probabilityPct >= 35 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  const impCol = c.constitutionalImpact === 'severe' ? 'rgb(var(--c-alert))' : c.constitutionalImpact === 'elevated' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[160px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Systemic collapse probability</div>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="relative h-2 flex-1 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${c.probabilityPct}%`, background: pCol }} /></div>
            <span className="text-[16px] font-semibold tabular-nums" style={{ color: pCol }}>{c.probabilityPct}%</span>
          </div>
        </div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Time to instability</div>
          <div className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: c.timeToInstabilityEpochs != null && c.timeToInstabilityEpochs <= 3 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>
            {c.timeToInstabilityEpochs == null ? 'no signal' : `~${c.timeToInstabilityEpochs} ep`}
          </div>
        </div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Constitutional impact</div>
          <div className="mt-0.5 text-[14px] font-semibold uppercase tracking-[0.1em]" style={{ color: impCol }}>{c.constitutionalImpact}</div>
        </div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">National continuity</div>
          <div className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">{t.continuity}</div>
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Propagation direction — dominant instability vectors</div>
        <div className="flex flex-wrap gap-1 border border-line p-2">
          {c.direction.length === 0 ? <span className="text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>no dominant propagation vector</span> :
            c.direction.map(d => (
              <span key={d} className="border px-1.5 py-px text-[10px]" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 40%,transparent)', color: 'rgb(var(--c-alert))' }}>{d}</span>
            ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Fracture points</div>
        <div className="border border-line">
          {t.shells.filter(s => s.fracture).length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No shell at fracture threshold.</p>
          ) : t.shells.filter(s => s.fracture).sort((a, b) => b.effectiveStrain - a.effectiveStrain).map(s => (
            <div key={s.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ background: 'rgb(var(--c-alert))' }} aria-hidden />
              <span className="w-44 shrink-0 truncate text-ink">{s.label}</span>
              <span className="min-w-0 flex-1 text-ink-muted">effective strain {s.effectiveStrain} · base {s.baseStrain} · inbound {s.inbound > 0 ? '+' : ''}{s.inbound}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Forecast merges temporal trajectories with cross-shell causality. Instability is identified BEFORE collapse so
        stabilization can interdict the propagation vector.
      </p>
    </div>
  );
}
