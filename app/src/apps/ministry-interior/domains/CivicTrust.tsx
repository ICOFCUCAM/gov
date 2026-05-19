'use client';

// Interior Civic Legitimacy — Civic Trust. Aggregate institutional trust
// by region (never per-citizen): trust, fairness, fatigue, cohesion and
// legitimacy fracture zones.

import * as React from 'react';
import { civicBoard } from '@/lib/gov/civic-legitimacy';

const T = (v: number) => v >= 65 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';

export function CivicTrust({ id, now }: { id: string; now: number }) {
  void id;
  const b = civicBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${T(b.trustIndex)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">National institutional trust</span>
        <span className="text-[16px] font-semibold tabular-nums" style={{ color: T(b.trustIndex) }}>{b.trustIndex}</span>
        <span className="text-ink-muted">fairness <span className="font-semibold text-ink tabular-nums">{b.fairnessContinuity}</span></span>
        <span className="text-ink-muted">civic fatigue <span className="font-semibold tabular-nums" style={{ color: b.civicFatigue >= 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{b.civicFatigue}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">aggregate · institutional · politically neutral</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-32 shrink-0">Trust</span>
          <span className="w-20 shrink-0">Fairness</span>
          <span className="w-20 shrink-0">Fatigue</span>
          <span className="w-20 shrink-0">Cohesion</span>
          <span className="min-w-0 flex-1">Status</span>
        </div>
        {b.regions.map(r => (
          <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{r.region}</span>
            <span className="flex w-32 shrink-0 items-center gap-1">
              <span className="relative h-2 w-20 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${r.trust}%`, background: T(r.trust) }} /></span>
              <span className="tabular-nums" style={{ color: T(r.trust) }}>{r.trust}</span>
            </span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: T(r.fairness) }}>{r.fairness}</span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: r.fatigue > 65 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{r.fatigue}</span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: T(r.cohesion) }}>{r.cohesion}</span>
            <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: r.fractureZone ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
              {r.fractureZone ? 'legitimacy fracture zone' : 'within legitimacy tolerance'}
            </span>
          </div>
        ))}
      </div>

      {b.warnings.length > 0 ? (
        <div className="border border-line">
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Legitimacy warnings</div>
          {b.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 border-t border-line/60 px-2 py-1 text-[10px]">
              <span className="w-44 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.severity === 'critical' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{w.kind}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{w.detail}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>No legitimacy fracture detected — civic confidence within constitutional tolerance.</p>}
      <p className="text-[9px] text-ink-muted">Trust is observed at institutional/regional aggregate only — never per-citizen, never ideological. Legitimacy is preserved through accountability, not coercion.</p>
    </div>
  );
}
