'use client';

// Interior Civilizational Continuity — Migration & Integration Continuity.
// Pluralistic, aggregate: integration pressure vs absorption capacity and
// inclusion continuity by region (no group prioritization).

import * as React from 'react';
import { civilizationalBoard } from '@/lib/gov/civilizational-identity';

export function MigrationIntegration({ id, now }: { id: string; now: number }) {
  void id;
  const b = civilizationalBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Pluralistic constitutional continuity — integration continuity preserved without coercive assimilation.
        Regional belonging imbalance <span className="font-semibold tabular-nums" style={{ color: b.regionalImbalance >= 16 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{b.regionalImbalance}</span>
      </div>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-28 shrink-0">Integration pressure</span>
          <span className="w-28 shrink-0">Absorption capacity</span>
          <span className="w-28 shrink-0">Inclusion continuity</span>
          <span className="min-w-0 flex-1">Fragmentation risk</span>
        </div>
        {b.integration.map(i => (
          <div key={i.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{i.region}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: i.integrationPressure > 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{i.integrationPressure}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: i.absorptionCapacity >= 60 ? 'rgb(var(--c-ok))' : i.absorptionCapacity >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }}>{i.absorptionCapacity}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: i.inclusionContinuity >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{i.inclusionContinuity}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 w-32 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${i.fragmentationRisk}%`, background: i.fragmentationRisk > 70 ? 'rgb(var(--c-alert))' : i.fragmentationRisk > 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} /></span>
              <span className="tabular-nums" style={{ color: i.fragmentationRisk > 70 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{i.fragmentationRisk}</span>
              {i.fragmentationRisk > 70 ? <span className="text-[8px] uppercase tracking-[0.1em]" style={{ color: 'rgb(var(--c-alert))' }}>· inclusion strain</span> : null}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Integration continuity measures whether institutions can lawfully include newcomers without fragmentation —
        never demographic engineering, never identity-based discrimination, never forced assimilation.
      </p>
    </div>
  );
}
