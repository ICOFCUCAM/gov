'use client';

// Interior Territorial Continuity — Urbanization & Infrastructure
// Evolution + disaster adaptation readiness.

import * as React from 'react';
import { territorialBoard } from '@/lib/gov/territorial-continuity';

function Track({ series }: { series: number[] }) {
  return (
    <span className="flex h-4 items-end gap-px">
      {series.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(2, Math.round((v / 100) * 16))}px`, width: '8px', background: '#e0673a', opacity: 0.45 + i / (series.length * 1.6) }} />
      ))}
    </span>
  );
}

export function UrbanizationEvolution({ id, now }: { id: string; now: number }) {
  void id;
  const b = territorialBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Territorial transformation — generational trajectories</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-44 shrink-0">Current</span>
            <span className="w-32 shrink-0">Trajectory</span>
            <span className="w-24 shrink-0">Now → horizon</span>
            <span className="min-w-0 flex-1">Pressure</span>
          </div>
          {b.urbanization.map(u => {
            const a = u.trajectory[0]!, z = u.trajectory[u.trajectory.length - 1]!;
            return (
              <div key={u.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
                <span className="w-44 shrink-0 truncate text-ink">{u.label}</span>
                <span className="w-32 shrink-0"><Track series={u.trajectory} /></span>
                <span className="w-24 shrink-0 tabular-nums text-ink-muted">{a} → <span style={{ color: z > a ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{z}</span></span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{u.pressure}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Disaster adaptation readiness</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-32 shrink-0">Region</span>
            <span className="w-20 shrink-0">Recurrence</span>
            <span className="w-20 shrink-0">Readiness</span>
            <span className="w-24 shrink-0">Recovery</span>
            <span className="min-w-0 flex-1">Status</span>
          </div>
          {b.disaster.map(d => (
            <div key={d.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-ink">{d.region}</span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: d.recurrence > 70 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{d.recurrence}</span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: d.readiness >= 60 ? 'rgb(var(--c-ok))' : d.readiness >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }}>{d.readiness}</span>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: d.recoveryDurability >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{d.recoveryDurability}</span>
              <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: d.repeatedCollapse ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{d.repeatedCollapse ? 'repeated-collapse territory' : 'adaptive'}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Future infrastructure mismatch and territorial inequality are forecast before fragmentation — adaptation is
        mobilized early, never through forced displacement or territorial discrimination.
      </p>
    </div>
  );
}
