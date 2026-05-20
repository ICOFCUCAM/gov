'use client';

// Energy — Generation Operations + Strategic Reserves. Per-source plant
// status, production forecasts, maintenance cadence; strategic fuel /
// battery reserves with days-cover & geopolitical exposure.

import * as React from 'react';
import { energyGridBoard, type Tone } from '@/lib/gov/energy-grid';

const TONE_COL: Record<Tone, string> = { ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: 'rgb(var(--c-alert))' };

export function GenerationReserves({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyGridBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Generation operations — per-source plant status</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-20 shrink-0">Source</span>
            <span className="w-20 shrink-0">Capacity</span>
            <span className="w-20 shrink-0">Output</span>
            <span className="min-w-0 flex-1">Output utilisation</span>
            <span className="w-20 shrink-0">Forecast</span>
            <span className="w-20 shrink-0">Fuel conv.</span>
            <span className="w-24 shrink-0 text-right">Maintenance</span>
          </div>
          {b.generation.map(g => (
            <div key={g.source} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-20 shrink-0 text-ink">{g.source}</span>
              <span className="w-20 shrink-0 tabular-nums text-ink-muted">{g.capacityGw}GW</span>
              <span className="w-20 shrink-0 tabular-nums text-ink">{g.outputGw}GW</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${g.outputPct}%`, background: TONE_COL[g.tone] }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: TONE_COL[g.tone] }}>{g.outputPct}%</span>
              </span>
              <span className="w-20 shrink-0 tabular-nums text-ink-muted">{g.forecastGw}GW</span>
              <span className="w-20 shrink-0 tabular-nums" style={{ color: g.fuelConversionPct >= 88 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{g.fuelConversionPct}%</span>
              <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                style={{ color: g.maintenance === 'unscheduled' ? 'rgb(var(--c-alert))' : g.maintenance === 'scheduled' ? '#f0a13a' : 'rgb(var(--c-ok))' }}>
                {g.maintenance}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Strategic energy reserves — sovereign continuity</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-32 shrink-0">Bucket</span>
            <span className="w-24 shrink-0">Days cover</span>
            <span className="min-w-0 flex-1">Capacity fill</span>
            <span className="w-24 shrink-0">Survivability</span>
            <span className="w-28 shrink-0">Geopolitical risk</span>
            <span className="w-24 shrink-0 text-right">Emergency release</span>
          </div>
          {b.reserves.map(r => (
            <div key={r.bucket} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 text-ink">{r.bucket}</span>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: r.daysCover >= 30 ? 'rgb(var(--c-ok))' : r.daysCover >= 14 ? '#f0a13a' : 'rgb(var(--c-alert))' }}>{r.daysCover}d</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${r.capacityFillPct}%`, background: '#3aa8e0' }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-ink-muted">{r.capacityFillPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{r.survivabilityDays}d</span>
              <span className="w-28 shrink-0">
                <span className="relative inline-block h-2 w-20 bg-surface-2 align-middle">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${r.geopoliticalExposure}%`, background: r.geopoliticalExposure >= 60 ? 'rgb(var(--c-alert))' : '#f0a13a' }} />
                </span>
                <span className="ml-1 text-[9px] tabular-nums" style={{ color: r.geopoliticalExposure >= 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{r.geopoliticalExposure}</span>
              </span>
              <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                style={{ color: r.emergencyReleaseEligible ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>
                {r.emergencyReleaseEligible ? 'eligible' : 'restricted'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Reserve releases require eligibility (capacity ≥ 45%) and follow the lawful emergency-allocation chain.
        Geopolitical exposure reduces survivability days regardless of nominal cover.
      </p>
    </div>
  );
}
