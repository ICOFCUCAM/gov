'use client';

// Transport — Multi-modal Operations. Ports / Rail / Aviation in one
// industrial operational view.

import * as React from 'react';
import { transportNetworkBoard, type Tone, type PortState, type AirHub, type RailCorridor } from '@/lib/gov/transport-network';

const TONE_COL: Record<Tone, string> = { ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: '#e0673a' };
const MARIT_COL: Record<PortState['maritimeRisk'], string> = {
  calm: 'rgb(var(--c-ok))', advisory: '#3aa8e0', storm: '#f0a13a', security: 'rgb(var(--c-alert))',
};
const WX_COL: Record<AirHub['weatherImpact'], string> = {
  clear: 'rgb(var(--c-ok))', caution: '#f0a13a', severe: 'rgb(var(--c-alert))',
};
const RDIS_COL: Record<RailCorridor['disruption'], string> = {
  none: 'rgb(var(--c-ok))', minor: '#f0a13a', major: 'rgb(var(--c-alert))',
};

export function MultiModalOperations({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportNetworkBoard(now);
  return (
    <div className="space-y-2 font-mono">
      {/* Ports & Maritime */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Ports & maritime operations</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-44 shrink-0">Port</span>
            <span className="w-20 shrink-0">Region</span>
            <span className="min-w-0 flex-1">Berth occupancy</span>
            <span className="w-24 shrink-0">Containers</span>
            <span className="w-24 shrink-0">Customs</span>
            <span className="w-28 shrink-0 text-right">Maritime risk</span>
          </div>
          {b.ports.map(p => (
            <div key={p.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-44 shrink-0 truncate text-ink">{p.name}</span>
              <span className="w-20 shrink-0 text-ink-soft">{p.region}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${p.berthOccupancyPct}%`, background: p.berthOccupancyPct > 88 ? '#e0673a' : p.berthOccupancyPct > 70 ? '#f0a13a' : '#3aa8e0' }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-ink-muted">{p.berthOccupancyPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{p.containersInYard.toLocaleString()}</span>
              <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em]" style={{ color: TONE_COL[p.customsCoordination] }}>{p.customsCoordination}</span>
              <span className="w-28 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]" style={{ color: MARIT_COL[p.maritimeRisk] }}>
                {p.maritimeRisk}{p.emergencyDiversion ? ' · diverting' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rail & Transit */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Rail & transit synchronisation</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-44 shrink-0">Route</span>
            <span className="min-w-0 flex-1">Schedule synchronisation</span>
            <span className="w-24 shrink-0">Freight</span>
            <span className="w-24 shrink-0">Maintenance</span>
            <span className="w-24 shrink-0 text-right">Disruption</span>
          </div>
          {b.rail.map(r => (
            <div key={r.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-44 shrink-0 truncate text-ink">{r.route}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${r.syncPct}%`, background: r.syncPct >= 88 ? 'rgb(var(--c-ok))' : r.syncPct >= 72 ? '#f0a13a' : '#e0673a' }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: r.syncPct >= 88 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{r.syncPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{r.freightKt}kt</span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">window {r.maintenanceWindowHrs}h</span>
              <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]" style={{ color: RDIS_COL[r.disruption] }}>{r.disruption}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Aviation */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Aviation & airspace operations</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-44 shrink-0">Hub</span>
            <span className="w-24 shrink-0">Movements</span>
            <span className="min-w-0 flex-1">Airspace strain</span>
            <span className="w-24 shrink-0">Cargo capacity</span>
            <span className="w-24 shrink-0">Weather</span>
            <span className="w-24 shrink-0 text-right">Corridor</span>
          </div>
          {b.aviation.map(h => (
            <div key={h.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-44 shrink-0 truncate text-ink">{h.name}</span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{h.movementsPerHr}/hr</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${h.airspaceStrain}%`, background: h.airspaceStrain >= 80 ? '#e0673a' : h.airspaceStrain >= 60 ? '#f0a13a' : '#3aa8e0' }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: h.airspaceStrain >= 80 ? '#e0673a' : '#f0a13a' }}>{h.airspaceStrain}</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{h.cargoCapacityPct}%</span>
              <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em]" style={{ color: WX_COL[h.weatherImpact] }}>{h.weatherImpact}</span>
              <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]" style={{ color: h.emergencyCorridor ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
                {h.emergencyCorridor ? 'emergency' : 'nominal'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Modes operate in coordination — a closed port reroutes freight onto rail, a grounded airspace activates
        critical-supply road corridors. Civilian continuity is preserved end-to-end.
      </p>
    </div>
  );
}
