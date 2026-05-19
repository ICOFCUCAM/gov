'use client';

// Interior Generational Continuity — Constitutional Resilience. Forecasts
// constitutional durability over decades: emergency-power normalization,
// oversight & judicial erosion, concentration drift and the long-term
// authoritarian-drift / democratic-erosion trajectory.

import * as React from 'react';
import { generationalBoard } from '@/lib/gov/generational-intelligence';

function Track({ series, good }: { series: number[]; good: boolean }) {
  return (
    <span className="flex h-4 items-end gap-px">
      {series.map((v, i) => {
        const ok = good ? v >= 60 : v < 45;
        const col = ok ? 'rgb(var(--c-ok))' : (good ? (v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))') : (v < 65 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))'));
        return <span key={i} style={{ height: `${Math.max(2, Math.round((v / 100) * 16))}px`, width: '8px', background: col, opacity: 0.5 + i / (series.length * 2) }} />;
      })}
    </span>
  );
}

export function ConstitutionalResilience({ id, now }: { id: string; now: number }) {
  void id;
  const b = generationalBoard(now);
  const d = b.durability;
  const col = (v: number) => v >= 65 ? 'rgb(var(--c-alert))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  const rows = [
    { l: 'Emergency normalization', s: d.map(x => x.emergencyNormalization), good: false },
    { l: 'Oversight strength', s: d.map(x => x.oversightStrength), good: true },
    { l: 'Judicial independence', s: d.map(x => x.judicialIndependence), good: true },
    { l: 'Separation resilience', s: d.map(x => x.separationResilience), good: true },
    { l: 'Concentration drift', s: d.map(x => x.concentrationDrift), good: false },
    { l: 'Authoritarian-drift risk', s: d.map(x => x.authoritarianDriftRisk), good: false },
  ];
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${col(b.driftRiskHorizon)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Authoritarian-drift trajectory</span>
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: col(b.driftRiskNow) }}>{b.driftRiskNow}</span>
        <span className="text-ink-muted" aria-hidden>→</span>
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: col(b.driftRiskHorizon) }}>{b.driftRiskHorizon}</span>
        <span className="ml-auto text-[9px] text-ink-muted">civilization mode · {b.mode}</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-44 shrink-0">Constitutional metric</span>
          <span className="w-40 shrink-0">Generational track</span>
          <span className="w-24 shrink-0">Now → horizon</span>
          <span className="min-w-0 flex-1">Assessment</span>
        </div>
        {rows.map(r => {
          const a = r.s[0]!, z = r.s[r.s.length - 1]!;
          const worsening = r.good ? z < a : z > a;
          return (
            <div key={r.l} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="w-44 shrink-0 text-ink">{r.l}</span>
              <span className="w-40 shrink-0"><Track series={r.s} good={r.good} /></span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{a} → {z}</span>
              <span className="min-w-0 flex-1 text-[9px]" style={{ color: worsening ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
                {worsening ? (r.good ? 'eroding across generations' : 'normalizing across generations') : 'durable across the horizon'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border border-line p-2 text-[10px]">
        <span className="text-ink-muted">Corruption normalization across eras: </span>
        <span className="tabular-nums text-ink">{b.corruption.normalization.join(' → ')}</span>
        <span className="text-ink-muted"> · mutation {b.corruption.mutation} · recovery likelihood </span>
        <span className="font-semibold" style={{ color: b.corruption.recoveryLikelihoodPct >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{b.corruption.recoveryLikelihoodPct}%</span>
      </div>
      <p className="text-[9px] text-ink-muted">
        The runtime identifies long-term authoritarian drift, democratic erosion and concentration pressure before
        they entrench — constitutional continuity is preserved deliberately, across generations.
      </p>
    </div>
  );
}
