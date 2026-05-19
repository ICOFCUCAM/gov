'use client';

// Interior Territorial Continuity — per-region ecological strain,
// survivability, water scarcity and continuity vulnerability zones.

import * as React from 'react';
import { territorialBoard } from '@/lib/gov/territorial-continuity';

const S = (v: number) => v >= 65 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';

export function TerritorialContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = territorialBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${S(b.meanSurvivability)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Ecological continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="text-ink-muted">mean strain <span className="font-semibold text-ink tabular-nums">{b.meanStrain}</span></span>
        <span className="text-ink-muted">survivability <span className="font-semibold tabular-nums" style={{ color: S(b.meanSurvivability) }}>{b.meanSurvivability}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">vulnerability zones {b.vulnerabilityZones}/{b.regions.length}</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-36 shrink-0">Ecological strain</span>
          <span className="w-16 shrink-0">Drought</span>
          <span className="w-14 shrink-0">Flood</span>
          <span className="w-16 shrink-0">Water</span>
          <span className="w-16 shrink-0">Scarcity</span>
          <span className="min-w-0 flex-1">Survivability / status</span>
        </div>
        {b.regions.map(r => (
          <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{r.region}</span>
            <span className="flex w-36 shrink-0 items-center gap-1">
              <span className="relative h-2 w-24 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, r.ecologicalStrain)}%`, background: r.ecologicalStrain >= 70 ? 'rgb(var(--c-alert))' : r.ecologicalStrain >= 50 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} /></span>
              <span className="tabular-nums text-ink-muted">{r.ecologicalStrain}</span>
            </span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{r.drought}</span>
            <span className="w-14 shrink-0 tabular-nums text-ink-muted">{r.flooding}</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: S(r.waterAvailability) }}>{r.waterAvailability}</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: r.scarcityIndex > 70 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{r.scarcityIndex}</span>
            <span className="min-w-0 flex-1 flex items-center gap-2">
              <span className="tabular-nums" style={{ color: S(r.survivability) }}>{r.survivability}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: r.vulnerabilityZone ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{r.vulnerabilityZone ? 'vulnerability zone' : 'within tolerance'}</span>
            </span>
          </div>
        ))}
      </div>
      {b.warnings.length > 0 ? (
        <div className="border border-line">
          {b.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-52 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.severity === 'critical' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{w.kind}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{w.detail}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>No territorial vulnerability zone — ecological continuity within constitutional tolerance.</p>}
      <p className="text-[9px] text-ink-muted">Territorial continuity is observed at region/aggregate level only — equitable, non-coercive, no demographic engineering.</p>
    </div>
  );
}
