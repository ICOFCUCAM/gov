'use client';

// Transport domains — Logistics, Infrastructure & Emergency surfaces.

import * as React from 'react';
import { transportNetworkBoard } from '@/lib/gov/transport-network';
import { transportExtendedBoard } from '@/lib/gov/transport-extended';
import { CorridorFrame, CorridorKpi, CorridorRule, CorridorBar, CorridorCallout, TRANSPORT_DS } from '@/apps/ministry-transport/design-system/transport-ds';

export function CargoLanes({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="logistics" code="LG-LNE-14" title="Cargo Lanes"
      subtitle="per-lane cargo class & continuity">
      <CorridorKpi items={[
        { label: 'Lanes', value: board.logistics.length },
        { label: 'Mean continuity', value: `${Math.round(board.logistics.reduce((s, l) => s + l.continuityPct, 0) / Math.max(1, board.logistics.length))}%`, tone: 'ok' },
        { label: 'Critical cargo (food/med/fuel)', value: board.logistics.filter(l => l.cargoClass === 'food' || l.cargoClass === 'medical' || l.cargoClass === 'fuel').length, tone: 'info' },
        { label: 'Strategic-reserve lanes', value: board.logistics.filter(l => l.cargoClass === 'strategic-reserve').length, tone: 'info' },
      ]} />
      <CorridorRule label="lane continuity" />
      {board.logistics.map(l => (
        <CorridorBar key={l.id}
          label={`${l.lane} · ${l.cargoClass}`}
          pct={l.continuityPct}
          tone={l.continuityPct > 88 ? 'ok' : l.continuityPct > 70 ? 'warn' : 'alert'}
          tail={`${l.warehouseCoverDays}d cover`} />
      ))}
    </CorridorFrame>
  );
}

export function WarehouseCover({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="logistics" code="LG-WHC-15" title="Warehouse Cover"
      subtitle="cargo cover days by lane">
      <CorridorKpi items={[
        { label: 'Lanes', value: board.logistics.length },
        { label: 'Below 7-day cover', value: board.logistics.filter(l => l.warehouseCoverDays < 7).length, tone: 'alert' },
        { label: 'Below 14-day cover', value: board.logistics.filter(l => l.warehouseCoverDays < 14).length, tone: 'warn' },
        { label: 'Mean cover days', value: `${Math.round(board.logistics.reduce((s, l) => s + l.warehouseCoverDays, 0) / Math.max(1, board.logistics.length))} d`, tone: 'info' },
      ]} />
      <CorridorRule label="cover days by lane" />
      {board.logistics.map(l => (
        <CorridorBar key={l.id}
          label={`${l.lane} · ${l.cargoClass}`}
          pct={Math.min(100, l.warehouseCoverDays * 4)}
          tone={l.warehouseCoverDays > 14 ? 'ok' : l.warehouseCoverDays > 7 ? 'warn' : 'alert'}
          tail={`${l.warehouseCoverDays} d`} />
      ))}
    </CorridorFrame>
  );
}

export function InfrastructureAssets({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="infrastructure" code="IF-AST-16" title="Infrastructure Assets"
      subtitle="national infrastructure asset register">
      <CorridorKpi items={[
        { label: 'Assets', value: board.infrastructure.length },
        { label: 'Low integrity (<60)', value: board.infrastructure.filter(a => a.integrityPct < 60).length, tone: 'alert' },
        { label: 'Repair dispatched', value: board.infrastructure.filter(a => a.repairDispatched).length, tone: 'warn' },
        { label: 'Construction coordinated', value: board.infrastructure.filter(a => a.constructionCoordinated).length, tone: 'info' },
      ]} />
      <CorridorRule label="asset register" />
      {board.infrastructure.map(a => (
        <CorridorBar key={a.id}
          label={`${a.asset} · ${a.type}`}
          pct={a.integrityPct}
          tone={a.integrityPct > 80 ? 'ok' : a.integrityPct > 60 ? 'warn' : 'alert'}
          tail={a.repairDispatched ? 'repair dispatched' : a.constructionCoordinated ? 'construction' : '—'} />
      ))}
    </CorridorFrame>
  );
}

export function BridgeTunnelHealth({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  const bt = board.infrastructure.filter(a => a.type === 'Bridge' || a.type === 'Tunnel');
  return (
    <CorridorFrame archetype="infrastructure" code="IF-BTH-17" title="Bridge & Tunnel Health"
      subtitle="critical-infrastructure integrity">
      <CorridorKpi items={[
        { label: 'Bridges & tunnels', value: bt.length },
        { label: 'Mean integrity', value: `${Math.round(bt.reduce((s, a) => s + a.integrityPct, 0) / Math.max(1, bt.length))}/100`, tone: 'ok' },
        { label: 'Below 60 integrity', value: bt.filter(a => a.integrityPct < 60).length, tone: 'alert' },
        { label: 'Repair dispatched', value: bt.filter(a => a.repairDispatched).length, tone: 'warn' },
      ]} />
      <CorridorRule label="bridges & tunnels" />
      {bt.map(a => (
        <CorridorBar key={a.id}
          label={`${a.asset} · ${a.type}`}
          pct={a.integrityPct}
          tone={a.integrityPct > 80 ? 'ok' : a.integrityPct > 60 ? 'warn' : 'alert'}
          tail={a.repairDispatched ? 'repair' : '—'} />
      ))}
      <CorridorCallout kicker="condition-based maintenance" body="Bridges or tunnels below 60% integrity require mandatory inspection and load restriction. Concealment of infrastructure failure is constitutionally prohibited." />
    </CorridorFrame>
  );
}

export function InfrastructureFailures({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="emergency" code="EM-FAI-19" title="Infrastructure Failures"
      subtitle="live failure ledger">
      <CorridorKpi items={[
        { label: 'Active failures', value: ext.emergency.failures.length, tone: ext.emergency.failures.length > 0 ? 'warn' : 'ok' },
        { label: 'In restoration', value: ext.emergency.failures.filter(f => f.phase === 'repair-dispatch' || f.phase === 'partial-reopen' || f.phase === 'restored').length, tone: 'info' },
        { label: 'Mean ETA (h)', value: ext.emergency.failures.length === 0 ? '—' : `${Math.round(ext.emergency.failures.reduce((s, f) => s + f.estimatedRestorationHrs, 0) / ext.emergency.failures.length)}` },
        { label: 'Population disrupted (k)', value: ext.emergency.failures.reduce((s, f) => s + f.populationDisruptedK, 0).toFixed(0), tone: 'warn' },
      ]} />
      <CorridorRule label="failure ledger" />
      {ext.emergency.failures.map(f => (
        <div key={f.id} className="grid grid-cols-[110px_140px_140px_100px_140px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{f.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{f.mode} · {f.cause}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{f.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{f.populationDisruptedK.toFixed(0)}k aff</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: f.phase === 'restored' ? TRANSPORT_DS.rail : f.phase === 'partial-reopen' || f.phase === 'detour-routing' ? TRANSPORT_DS.signal : TRANSPORT_DS.coral }}>● {f.phase}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function RepairCrews({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="emergency" code="EM-CRW-20" title="Repair Crews"
      subtitle="crew deployment & status">
      <CorridorKpi items={[
        { label: 'Crews', value: ext.emergency.repairCrews.length },
        { label: 'Members deployed', value: ext.emergency.repairCrews.reduce((s, c) => s + c.crewSize, 0), tone: 'info' },
        { label: 'Vehicles active', value: ext.emergency.repairCrews.reduce((s, c) => s + c.vehiclesDeployed, 0) },
        { label: 'Mean restoration', value: `${ext.emergency.meanRestorationHrs} h`, tone: 'warn' },
      ]} />
      <CorridorRule label="crews" />
      {ext.emergency.repairCrews.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_140px_140px_80px_140px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{c.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{c.mode}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{c.crewSize}</span>
          <span className="text-right" style={{ color: TRANSPORT_DS.harbour }}>→ {c.enRouteTo}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function EvacuationCorridors({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="emergency" code="EM-EVC-21" title="Evacuation Corridors"
      subtitle="active evacuation corridors">
      <CorridorKpi items={[
        { label: 'Active corridors', value: ext.emergency.evacuationCorridors.length, tone: ext.emergency.evacuationCorridors.length > 0 ? 'alert' : 'ok' },
        { label: 'Closed', value: ext.emergency.evacuationCorridors.filter(c => c.status === 'closed').length, tone: 'alert' },
        { label: 'Capacity (veh/h)', value: ext.emergency.evacuationCorridors.reduce((s, c) => s + c.capacityVehiclesHr, 0).toLocaleString() },
        { label: 'Mean utilisation', value: ext.emergency.evacuationCorridors.length === 0 ? '—' : `${Math.round(ext.emergency.evacuationCorridors.reduce((s, c) => s + c.utilisationPct, 0) / ext.emergency.evacuationCorridors.length)}%`, tone: 'warn' },
      ]} />
      <CorridorRule label="evacuation lanes" />
      {ext.emergency.evacuationCorridors.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: TRANSPORT_DS.mut }}>
          No active evacuation corridors. National posture: nominal.
        </p>
      ) : ext.emergency.evacuationCorridors.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{c.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{c.origin} → {c.destination}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{c.utilisationPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.status === 'closed' ? TRANSPORT_DS.coral : c.status === 'capacity-pressured' ? TRANSPORT_DS.coral : c.status === 'priority-lanes-open' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {c.status}</span>
        </div>
      ))}
      <CorridorCallout kicker="constitutional priority" body="Evacuation corridors carry constitutional priority over commercial freight. Denial of evacuation priority is constitutionally void." />
    </CorridorFrame>
  );
}
