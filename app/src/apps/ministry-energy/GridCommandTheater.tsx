'use client';

// Energy — National Grid Command Theater. Frequency stability, regional
// load distribution, blackout-prevention orchestration. Industrial,
// mechanical visual language: graphite/steel + electric amber + grid-blue.

import * as React from 'react';
import { energyGridBoard, type GridPosture, type Tone } from '@/lib/gov/energy-grid';

const POSTURE_COL: Record<GridPosture, string> = {
  stable: 'rgb(var(--c-ok))', engaged: '#f0a13a',
  strained: '#e0673a', critical: 'rgb(var(--c-alert))', 'blackout-watch': 'rgb(var(--c-alert))',
};
const TONE_COL: Record<Tone, string> = {
  ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: 'rgb(var(--c-alert))',
};

export function GridCommandTheater({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyGridBoard(now);
  const c = b.command;
  return (
    <div className="space-y-2 font-mono"
      style={{ background: 'linear-gradient(180deg, rgba(58,70,86,0.12) 0%, transparent 80%)' }}>
      {/* Industrial posture band */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${POSTURE_COL[c.posture]} 50%,transparent)`, background: 'rgba(0,0,0,0.42)' }}>
        <span className="text-[9px] uppercase tracking-[0.22em] text-ink-muted">National grid</span>
        <span className="text-[16px] font-bold uppercase tracking-[0.16em]" style={{ color: POSTURE_COL[c.posture] }}>{c.posture}</span>
        <span className="text-ink-muted">freq <span className="font-semibold tabular-nums" style={{ color: TONE_COL[c.frequencyTone] }}>{c.frequencyHz}Hz</span></span>
        <span className="text-ink-muted">demand <span className="font-semibold text-ink tabular-nums">{c.totalDemandGw}GW</span></span>
        <span className="text-ink-muted">supply <span className="font-semibold text-ink tabular-nums">{c.totalSupplyGw}GW</span></span>
        <span className="text-ink-muted">reserve margin <span className="font-semibold tabular-nums" style={{ color: c.reserveMarginPct < 6 ? 'rgb(var(--c-alert))' : c.reserveMarginPct < 12 ? '#f0a13a' : 'rgb(var(--c-ok))' }}>{c.reserveMarginPct}%</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">{b.systemStressBanner}</span>
      </div>

      {/* Blackout prevention meter */}
      <div className="border border-line bg-black/30 px-3 py-2">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Blackout prevention</span>
          <span className="relative h-3 flex-1 bg-surface-2">
            <span className="absolute inset-y-0 left-0" style={{ width: `${c.blackoutPreventionPct}%`, background: c.blackoutPreventionPct >= 70 ? 'rgb(var(--c-ok))' : c.blackoutPreventionPct >= 50 ? '#f0a13a' : 'rgb(var(--c-alert))' }} />
            <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: '50%' }} aria-hidden />
            <span className="absolute inset-y-0 w-px bg-white/30" style={{ left: '70%' }} aria-hidden />
          </span>
          <span className="font-semibold tabular-nums" style={{ color: c.blackoutPreventionPct >= 70 ? 'rgb(var(--c-ok))' : c.blackoutPreventionPct >= 50 ? '#f0a13a' : 'rgb(var(--c-alert))' }}>{c.blackoutPreventionPct}%</span>
        </div>
      </div>

      {/* Regional load distribution lattice */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Regional load distribution — sovereign power matrix</div>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {c.regions.map(r => {
            const balance = Math.max(-50, Math.min(50, r.reserveMarginPct));
            const col = r.loadShedRisk === 'imminent' ? 'rgb(var(--c-alert))' : r.loadShedRisk === 'monitor' ? '#f0a13a' : '#3aa8e0';
            return (
              <div key={r.region} className="px-2 py-1.5"
                style={{ background: `linear-gradient(180deg, color-mix(in srgb,${col} ${r.stressZone ? 28 : 10}%, #0a1018) 0%, #03070f 100%)` }}>
                <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">{r.region}</div>
                <div className="mt-1 flex items-end justify-between">
                  <span className="text-[15px] font-semibold tabular-nums text-ink">{r.demandGw}</span>
                  <span className="text-[8px] text-ink-muted">demand</span>
                </div>
                <div className="mt-0.5 flex items-end justify-between">
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: r.supplyGw >= r.demandGw ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{r.supplyGw}</span>
                  <span className="text-[8px] text-ink-muted">supply</span>
                </div>
                <div className="mt-1 h-1 w-full bg-surface-2">
                  <span className="block h-full" style={{ width: `${Math.min(100, Math.abs(balance) * 2)}%`, background: col }} />
                </div>
                <div className="mt-0.5 text-[8.5px] uppercase tracking-[0.1em]" style={{ color: col }}>{r.loadShedRisk}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Frequency drift beyond ±0.2Hz raises grid engagement; beyond ±0.4Hz raises alert. Regions are stress-zoned
        when reserve margin falls below 6%. Load-shed risk escalates monitor → imminent.
      </p>
    </div>
  );
}
