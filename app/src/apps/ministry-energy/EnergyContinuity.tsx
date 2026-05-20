'use client';

// Energy — Emergency Response + Forecasting + Cross-Ministry Cascade.
// Active energy incidents propagate to Health, Transport, Telecom,
// Treasury, Interior and National Coordination.

import * as React from 'react';
import { energyGridBoard, type EnergyIncident } from '@/lib/gov/energy-grid';

const SEV_COL: Record<EnergyIncident['severity'], string> = {
  advisory: '#f0a13a', elevated: '#e0673a', critical: 'rgb(var(--c-alert))', national: 'rgb(var(--c-alert))',
};

export function EnergyContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyGridBoard(now);
  const f = b.forecast;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/35">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Cascading-failure risk</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.cascadingFailureRisk >= 60 ? 'rgb(var(--c-alert))' : '#f0a13a' }}>{f.cascadingFailureRisk}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Fuel geopolitical risk</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.fuelGeopoliticalRisk >= 50 ? 'rgb(var(--c-alert))' : '#f0a13a' }}>{f.fuelGeopoliticalRisk}</div></div>
        <div className="min-w-[180px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Blackout ETA</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.blackoutEtaHrs ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{f.blackoutEtaHrs ? `~${f.blackoutEtaHrs}h` : 'no signal'}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Energy failures cascade across ministries — civilian continuity protected by default.</div></div>
      </div>

      {/* 24h demand/supply forecast */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ 24-hour demand vs supply forecast (4h steps)</div>
        <div className="border border-line bg-black/15 p-2">
          <div className="flex h-20 items-end gap-1">
            {f.horizonHrs.map((_, i) => {
              const d = f.demandGw[i]!, s = f.supplyGw[i]!;
              const peak = Math.max(...f.demandGw, ...f.supplyGw);
              const dH = Math.max(2, Math.round((d / peak) * 72));
              const sH = Math.max(2, Math.round((s / peak) * 72));
              return (
                <div key={i} className="flex flex-1 items-end gap-px">
                  <span className="block flex-1" style={{ height: `${dH}px`, background: '#f0a13a' }} title={`demand ${d}GW`} />
                  <span className="block flex-1" style={{ height: `${sH}px`, background: '#3aa8e0' }} title={`supply ${s}GW`} />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 text-[7px] text-ink-muted">
            {f.horizonHrs.map(h => <span key={h} className="flex-1 text-center tabular-nums">+{h}h</span>)}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[8.5px] text-ink-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-3" style={{ background: '#f0a13a' }} /> demand</span>
            <span className="flex items-center gap-1"><span className="h-2 w-3" style={{ background: '#3aa8e0' }} /> supply</span>
            <span className="ml-auto">weather stress {f.weatherStress.join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Ministries currently engaged by energy events</div>
          <div className="flex flex-wrap gap-1 border border-line p-2">
            {b.ministriesEngaged.map(m => (
              <span key={m.ministry} className="rounded-[2px] border px-1.5 py-px text-[10px]"
                style={{ borderColor: 'color-mix(in srgb,#3aa8e0 45%,transparent)', color: '#3aa8e0' }}>
                {m.ministry} · {m.engaged}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Critical incidents with full cascade */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Energy emergencies — full inter-ministry cascade</div>
        <div className="space-y-2">
          {b.incidents.slice(0, 5).map(i => (
            <div key={i.id} className="border border-line">
              <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[10px]">
                <span className="font-mono tabular-nums text-ink-muted">{i.id}</span>
                <span className="font-semibold text-ink">{i.kind}</span>
                <span className="text-ink-muted">· {i.region}</span>
                {i.mobilePowerDeployed ? <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: '#3aa8e0' }}>mobile power deployed</span> : null}
                <span className="ml-auto text-[9px] uppercase tracking-[0.08em]" style={{ color: SEV_COL[i.severity] }}>{i.severity}</span>
                <span className="text-[9px] uppercase tracking-[0.08em] text-ink-muted">· {i.status}</span>
              </div>
              <div className="border-t border-line/60">
                <div className="flex items-center gap-2 border-b border-line/60 bg-black/15 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  <span className="w-44 shrink-0">Ministry</span>
                  <span className="min-w-0 flex-1">Effect</span>
                  <span className="w-16 shrink-0">Delay</span>
                  <span className="w-20 shrink-0 text-right">Status</span>
                </div>
                {i.ministryCascade.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 border-b border-line/40 px-2 py-1 text-[10px] last:border-0">
                    <span className="w-44 shrink-0 truncate text-ink">{c.ministry}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{c.effect}</span>
                    <span className="w-16 shrink-0 tabular-nums text-ink-muted">+{c.delayHrs}h</span>
                    <span className="w-20 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                      style={{ color: c.status === 'cleared' ? 'rgb(var(--c-ok))' : c.status === 'engaged' ? '#f0a13a' : 'rgb(var(--c-warn))' }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Frequency collapse, transformer fault, fuel shortage, corridor overload, infrastructure sabotage and
        disaster power-loss each carry their own propagation chain — hospitals, transport, telecom, treasury,
        interior and the cabinet move in lock-step.
      </p>
    </div>
  );
}
