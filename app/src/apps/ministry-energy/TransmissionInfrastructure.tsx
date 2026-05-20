'use client';

// Energy — Transmission & Infrastructure. National transmission corridors,
// transformer health, faults, repair dispatch; industrial continuity rail.

import * as React from 'react';
import { energyGridBoard, type Tone } from '@/lib/gov/energy-grid';

const TONE_COL: Record<Tone, string> = { ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: 'rgb(var(--c-alert))' };

export function TransmissionInfrastructure({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyGridBoard(now);
  const overloaded = b.corridors.filter(c => c.utilPct > 100).length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/35">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Corridors monitored</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.corridors.length}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Overloaded</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: overloaded ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{overloaded}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Repairs dispatched</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: '#f0a13a' }}>{b.corridors.filter(c => c.repairDispatched).length}</div></div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Civilian continuity prioritised — emergency rerouting protects critical loads.</div></div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ National transmission corridors</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-32 shrink-0">Corridor</span>
            <span className="w-20 shrink-0">Capacity</span>
            <span className="min-w-0 flex-1">Load / utilisation</span>
            <span className="w-28 shrink-0">Transformer</span>
            <span className="w-16 shrink-0">Faults</span>
            <span className="w-20 shrink-0 text-right">Repair</span>
          </div>
          {b.corridors.map(c => (
            <div key={c.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-[9px] text-ink">{c.from} → {c.to}</span>
              <span className="w-20 shrink-0 tabular-nums text-ink-muted">{c.capacityGw}GW</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, c.utilPct * 0.7)}%`, background: TONE_COL[c.tone] }} />
                  <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: '70%' }} aria-hidden />
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums" style={{ color: TONE_COL[c.tone] }}>{c.utilPct}%</span>
              </span>
              <span className="w-28 shrink-0">
                <span className="relative inline-block h-2 w-16 bg-surface-2 align-middle">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${c.transformerHealth}%`, background: c.transformerHealth >= 75 ? 'rgb(var(--c-ok))' : c.transformerHealth >= 55 ? '#f0a13a' : 'rgb(var(--c-alert))' }} />
                </span>
                <span className="ml-1 text-[9px] tabular-nums" style={{ color: c.transformerHealth >= 75 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{c.transformerHealth}</span>
              </span>
              <span className="w-16 shrink-0 tabular-nums" style={{ color: c.faults ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{c.faults}</span>
              <span className="w-20 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]" style={{ color: c.repairDispatched ? '#3aa8e0' : 'rgb(var(--c-ok))' }}>
                {c.repairDispatched ? 'dispatched' : 'nominal'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Industrial energy continuity</div>
        <div className="border border-line">
          {b.industry.map(s => (
            <div key={s.sector} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 text-ink">{s.sector}</span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{s.consumptionGw}GW</span>
              <span className="w-32 shrink-0">
                <span className="relative inline-block h-2 w-24 bg-surface-2 align-middle">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${s.continuityPct}%`, background: s.continuityPct >= 90 ? 'rgb(var(--c-ok))' : s.continuityPct >= 70 ? '#f0a13a' : 'rgb(var(--c-alert))' }} />
                </span>
                <span className="ml-1 text-[9px] tabular-nums" style={{ color: s.continuityPct >= 90 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{s.continuityPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{s.protectedAllocationGw}GW protected</span>
              <span className="min-w-0 flex-1 text-right text-[9px] uppercase tracking-[0.08em]"
                style={{ color: s.emergencyAllocation ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
                {s.emergencyAllocation ? 'emergency allocation active' : 'nominal allocation'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Corridor utilisation beyond 100% triggers automatic repair dispatch + downstream rerouting. Industrial
        sectors below 70% continuity engage protected-allocation procedures.
      </p>
    </div>
  );
}
