'use client';

// Interior Geopolitical Continuity — strategic autonomy, fragility and
// cross-border pressure propagation (aggregate, defensive, lawful).

import * as React from 'react';
import { geopoliticalBoard } from '@/lib/gov/geopolitical-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
const BAD = (v: number) => v >= 60 ? 'rgb(var(--c-alert))' : v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

export function GeopoliticalContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = geopoliticalBoard(now);
  const a = b.autonomy;
  const dims = [
    { l: 'External dependency risk', v: a.externalDependencyRisk, good: false },
    { l: 'Food security', v: a.foodSecurity, good: true },
    { l: 'Energy security', v: a.energySecurity, good: true },
    { l: 'Digital sovereignty', v: a.digitalSovereignty, good: true },
    { l: 'Infrastructure sovereignty', v: a.infrastructureSovereignty, good: true },
    { l: 'Critical-supply vulnerability', v: a.criticalSupplyVulnerability, good: false },
    { l: 'Technological dependence', v: a.technologicalDependence, good: false },
    { l: 'Strategic fragility', v: a.strategicFragility, good: false },
  ];
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${BAD(a.strategicFragility)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Geopolitical continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="text-ink-muted">strategic fragility <span className="font-semibold tabular-nums" style={{ color: BAD(a.strategicFragility) }}>{a.strategicFragility}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">defensive · internationally lawful · aggregate</span>
      </div>

      <div className="border border-line">
        {dims.map(d => (
          <div key={d.l} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-52 shrink-0 text-ink">{d.l}</span>
            <span className="relative h-2 min-w-0 flex-1 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${d.v}%`, background: d.good ? G(d.v) : BAD(d.v) }} /></span>
            <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: d.good ? G(d.v) : BAD(d.v) }}>{d.v}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Cross-border pressure propagation → institutional load (+{b.externalAmplification})</div>
        <div className="border border-line">
          {b.vectors.map((v, i) => {
            const col = v.magnitude >= 20 ? 'rgb(var(--c-alert))' : v.magnitude > 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
            return (
              <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-36 shrink-0 truncate text-ink">{v.from}</span>
                <span className="shrink-0" style={{ color: col }} aria-hidden>━━▶</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{v.chain}</span>
                <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: col }}>+{v.magnitude}</span>
              </div>
            );
          })}
        </div>
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
      ) : <p className="text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>No strategic-fragility warning — sovereign continuity within tolerance.</p>}
      <p className="text-[9px] text-ink-muted">Strategic intelligence is defensive & aggregate — the runtime preserves sovereign continuity within an interconnected world, it does not dominate other civilizations.</p>
    </div>
  );
}
