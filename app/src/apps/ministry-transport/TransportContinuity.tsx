'use client';

// Transport — Emergency Response + Forecasting + Cross-ministry Cascade.
// Active transport incidents propagate to Health, Treasury, Interior,
// Energy, Trade & Industry, Emergency Operations and National Coordination.

import * as React from 'react';
import { transportNetworkBoard, type TransportIncident } from '@/lib/gov/transport-network';

const SEV_COL: Record<TransportIncident['severity'], string> = {
  advisory: '#f0a13a', elevated: '#e0673a', critical: 'rgb(var(--c-alert))', national: 'rgb(var(--c-alert))',
};

export function TransportContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportNetworkBoard(now);
  const f = b.forecast;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/35">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Cascading-disruption risk</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.cascadingDisruptionRisk >= 60 ? 'rgb(var(--c-alert))' : '#f0a13a' }}>{f.cascadingDisruptionRisk}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Economic mobility</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.economicMobilityIdx >= 70 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{f.economicMobilityIdx}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Crisis routing readiness</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.crisisRoutingReadiness >= 70 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{f.crisisRoutingReadiness}</div></div>
        <div className="min-w-[170px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Route-collapse ETA</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: f.routeCollapseEtaHrs ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{f.routeCollapseEtaHrs ? `~${f.routeCollapseEtaHrs}h` : 'no signal'}</div></div>
        <div className="min-w-[200px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Transport disruptions cascade nationally — humanitarian routes protected.</div></div>
      </div>

      {/* Congestion / weather forecast */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ 24-hour congestion vs weather forecast (4h steps)</div>
        <div className="border border-line bg-black/15 p-2">
          <div className="flex h-20 items-end gap-1">
            {f.horizonHrs.map((_, i) => {
              const c = f.congestionPct[i]!, w = f.weatherImpact[i]!;
              const cH = Math.max(2, Math.round((c / 100) * 72));
              const wH = Math.max(2, Math.round((w / 100) * 72));
              return (
                <div key={i} className="flex flex-1 items-end gap-px">
                  <span className="block flex-1" style={{ height: `${cH}px`, background: c >= 90 ? '#e0673a' : c >= 70 ? '#f0a13a' : '#3aa8e0' }} title={`congestion ${c}%`} />
                  <span className="block flex-1" style={{ height: `${wH}px`, background: '#9ca6b3' }} title={`weather impact ${w}`} />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 text-[7px] text-ink-muted">
            {f.horizonHrs.map(h => <span key={h} className="flex-1 text-center tabular-nums">+{h}h</span>)}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[8.5px] text-ink-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-3" style={{ background: '#3aa8e0' }} /> congestion</span>
            <span className="flex items-center gap-1"><span className="h-2 w-3" style={{ background: '#9ca6b3' }} /> weather impact</span>
          </div>
        </div>
      </div>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Ministries engaged by transport events</div>
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

      {/* Critical incidents with cascade */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Transport emergencies — full inter-ministry cascade</div>
        <div className="space-y-2">
          {b.incidents.slice(0, 5).map(i => (
            <div key={i.id} className="border border-line">
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[10px]">
                <span className="font-mono tabular-nums text-ink-muted">{i.id}</span>
                <span className="font-semibold text-ink">{i.kind}</span>
                <span className="text-ink-muted">· {i.region}</span>
                {i.evacuationActive ? <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: 'rgb(var(--c-alert))' }}>evacuating</span> : null}
                {i.rescueDispatched ? <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: '#f0a13a' }}>rescue dispatched</span> : null}
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
        Bridge collapse, port closure, rail derailment, aviation grounding, fuel-convoy attack and disaster-route
        collapse each carry their own propagation chain — health, treasury, interior, energy, trade & industry,
        emergency operations and the cabinet move in lock-step.
      </p>
    </div>
  );
}
