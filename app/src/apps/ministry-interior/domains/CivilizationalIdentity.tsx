'use client';

// Interior Civilizational Continuity — Constitutional Civic Identity.
// Aggregate, region-level cultural resilience & constitutional civic
// belonging (never ethnic / religious / ideological classification).

import * as React from 'react';
import { civilizationalBoard } from '@/lib/gov/civilizational-identity';

const R = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';

export function CivilizationalIdentity({ id, now }: { id: string; now: number }) {
  void id;
  const b = civilizationalBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${R(b.meanResilience)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Civilizational identity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="text-ink-muted">cultural resilience <span className="font-semibold text-ink tabular-nums">{b.meanResilience}</span></span>
        <span className="text-ink-muted">civic belonging <span className="font-semibold tabular-nums" style={{ color: R(b.civicBelongingIndex) }}>{b.civicBelongingIndex}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">pluralistic · aggregate · politically neutral</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-36 shrink-0">Cultural resilience</span>
          <span className="w-16 shrink-0">Lang</span>
          <span className="w-16 shrink-0">Heritage</span>
          <span className="w-16 shrink-0">Intergen</span>
          <span className="w-20 shrink-0">Belonging</span>
          <span className="min-w-0 flex-1">Status</span>
        </div>
        {b.regions.map(r => (
          <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{r.region}</span>
            <span className="flex w-36 shrink-0 items-center gap-1">
              <span className="relative h-2 w-24 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${r.culturalResilience}%`, background: R(r.culturalResilience) }} /></span>
              <span className="tabular-nums" style={{ color: R(r.culturalResilience) }}>{r.culturalResilience}</span>
            </span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{r.languageContinuity}</span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{r.heritageIntegrity}</span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{r.intergenerationalTransfer}</span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: R(r.civicBelonging) }}>{r.civicBelonging}</span>
            <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: r.fragmentationZone ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{r.fragmentationZone ? 'cohesion-fracture zone' : 'cohesive'}</span>
          </div>
        ))}
      </div>
      {b.warnings.length > 0 ? (
        <div className="border border-line">
          {b.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-48 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.severity === 'critical' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{w.kind}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{w.detail}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>No cohesion fracture — pluralistic constitutional continuity within tolerance.</p>}
      <p className="text-[9px] text-ink-muted">Continuity of meaning is observed at region/aggregate level only — no ethnic, religious, ideological or political-identity classification.</p>
    </div>
  );
}
