'use client';

// Transport domains — Mobility, Corridor, Maritime, Rail, Aviation surfaces.

import * as React from 'react';
import { transportNetworkBoard } from '@/lib/gov/transport-network';
import { CorridorFrame, CorridorKpi, CorridorRule, CorridorBar, CorridorCallout, TRANSPORT_DS } from '@/apps/ministry-transport/design-system/transport-ds';

export function MobilityPosture({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="mobility" code="MB-PST-02" title="Mobility Posture"
      subtitle="posture, throughput & bottlenecks"
      posture={board.command.posture}>
      <CorridorKpi items={[
        { label: 'National throughput', value: `${board.command.nationalThroughputKt.toFixed(0)} kt`, tone: 'info' },
        { label: 'Average load', value: `${board.command.averageLoadPct}%`, tone: board.command.averageLoadPct > 85 ? 'alert' : board.command.averageLoadPct > 70 ? 'warn' : 'ok' },
        { label: 'Bottlenecks', value: board.command.bottlenecks, tone: 'warn' },
        { label: 'Emergency corridors', value: board.command.emergencyCorridorsActive, tone: board.command.emergencyCorridorsActive > 0 ? 'alert' : 'ok' },
      ]} />
      <CorridorRule label="regional congestion" />
      {board.command.regionalCongestion.map(r => (
        <CorridorBar key={r.region}
          label={r.region}
          pct={r.congestionPct}
          tone={r.tone === 'alert' ? 'alert' : r.tone === 'warn' ? 'warn' : 'ok'} />
      ))}
    </CorridorFrame>
  );
}

export function NationalThroughput({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="mobility" code="MB-TPT-03" title="National Throughput"
      subtitle="per-corridor throughput contribution"
      posture={board.command.posture}>
      <CorridorKpi items={[
        { label: 'Corridors', value: board.command.corridors.length },
        { label: 'Total throughput', value: `${board.command.nationalThroughputKt.toFixed(0)} kt`, tone: 'info' },
        { label: 'Mean load', value: `${board.command.averageLoadPct}%`, tone: 'warn' },
        { label: 'Collapse stage', value: board.command.corridors.filter(c => c.congestion === 'collapse').length, tone: 'alert' },
      ]} />
      <CorridorRule label="corridor throughput" />
      {board.command.corridors.map(c => (
        <CorridorBar key={c.id}
          label={`${c.name} · ${c.mode}`}
          pct={c.loadPct}
          tone={c.tone === 'alert' ? 'alert' : c.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${c.throughputKt.toFixed(0)} kt`} />
      ))}
    </CorridorFrame>
  );
}

export function CorridorBoard({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="corridor" code="CR-COR-04" title="Corridor Board"
      subtitle="per-corridor load & stabilisation">
      <CorridorKpi items={[
        { label: 'Corridors', value: board.command.corridors.length },
        { label: 'Collapse / bottleneck', value: board.command.corridors.filter(c => c.congestion === 'collapse' || c.congestion === 'bottleneck').length, tone: 'alert' },
        { label: 'Rerouting', value: board.command.corridors.filter(c => c.stabilization === 'rerouting').length, tone: 'warn' },
        { label: 'Emergency-corridor mode', value: board.command.corridors.filter(c => c.stabilization === 'emergency-corridor').length, tone: 'alert' },
      ]} />
      <CorridorRule label="corridor register" />
      {board.command.corridors.map(c => (
        <div key={c.id} className="grid grid-cols-[160px_140px_80px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{c.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{c.name} · {c.mode}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{c.loadPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.congestion === 'collapse' ? TRANSPORT_DS.coral : c.congestion === 'bottleneck' ? TRANSPORT_DS.coral : c.congestion === 'heavy' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {c.congestion}</span>
          <span className="text-right" style={{ color: TRANSPORT_DS.harbour }}>{c.stabilization}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function RegionalCongestion({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="corridor" code="CR-CNG-05" title="Regional Congestion"
      subtitle="per-region congestion posture">
      <CorridorKpi items={[
        { label: 'Regions', value: board.command.regionalCongestion.length },
        { label: 'High congestion', value: board.command.regionalCongestion.filter(r => r.tone === 'alert').length, tone: 'alert' },
        { label: 'Mean congestion', value: `${Math.round(board.command.regionalCongestion.reduce((s, r) => s + r.congestionPct, 0) / Math.max(1, board.command.regionalCongestion.length))}%`, tone: 'warn' },
        { label: 'Peak region', value: board.command.regionalCongestion.reduce((p, r) => r.congestionPct > p.congestionPct ? r : p).region },
      ]} />
      <CorridorRule label="congestion by region" />
      {board.command.regionalCongestion.map(r => (
        <CorridorBar key={r.region}
          label={r.region}
          pct={r.congestionPct}
          tone={r.tone === 'alert' ? 'alert' : r.tone === 'warn' ? 'warn' : 'ok'} />
      ))}
    </CorridorFrame>
  );
}

export function EmergencyCorridors({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  const emergency = board.command.corridors.filter(c => c.stabilization === 'emergency-corridor' || c.stabilization === 'rerouting');
  return (
    <CorridorFrame archetype="corridor" code="CR-EMG-06" title="Emergency Corridors"
      subtitle="active emergency-corridor lanes">
      <CorridorKpi items={[
        { label: 'Emergency lanes', value: board.command.emergencyCorridorsActive, tone: board.command.emergencyCorridorsActive > 0 ? 'alert' : 'ok' },
        { label: 'Rerouting', value: emergency.filter(c => c.stabilization === 'rerouting').length, tone: 'warn' },
        { label: 'Stabilisation modes', value: 2 },
        { label: 'Mean load (emergency)', value: emergency.length === 0 ? '—' : `${Math.round(emergency.reduce((s, c) => s + c.loadPct, 0) / emergency.length)}%`, tone: 'warn' },
      ]} />
      <CorridorRule label="active emergency lanes" />
      {emergency.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: TRANSPORT_DS.mut }}>
          No emergency corridors active. National posture: nominal.
        </p>
      ) : emergency.map(c => (
        <CorridorBar key={c.id}
          label={`${c.name} · ${c.stabilization}`}
          pct={c.loadPct}
          tone={c.tone === 'alert' ? 'alert' : 'warn'}
          tail={c.mode} />
      ))}
    </CorridorFrame>
  );
}

export function PortNetwork({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="maritime" code="MR-PRT-07" title="Port Network"
      subtitle="per-port berth & customs">
      <CorridorKpi items={[
        { label: 'Ports tracked', value: board.ports.length },
        { label: 'High berth occupancy (>85%)', value: board.ports.filter(p => p.berthOccupancyPct > 85).length, tone: 'warn' },
        { label: 'Emergency diversion', value: board.ports.filter(p => p.emergencyDiversion).length, tone: 'alert' },
        { label: 'Mean berth load', value: `${Math.round(board.ports.reduce((s, p) => s + p.berthOccupancyPct, 0) / Math.max(1, board.ports.length))}%` },
      ]} />
      <CorridorRule label="port register" />
      {board.ports.map(p => (
        <div key={p.id} className="grid grid-cols-[140px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{p.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{p.name}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{p.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{p.berthOccupancyPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.emergencyDiversion ? TRANSPORT_DS.coral : p.maritimeRisk === 'security' || p.maritimeRisk === 'storm' ? TRANSPORT_DS.coral : p.maritimeRisk === 'advisory' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {p.maritimeRisk}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function MaritimeRisk({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="maritime" code="MR-RSK-08" title="Maritime Risk"
      subtitle="storm, security & diversion">
      <CorridorKpi items={[
        { label: 'Storm posture', value: board.ports.filter(p => p.maritimeRisk === 'storm').length, tone: 'alert' },
        { label: 'Security posture', value: board.ports.filter(p => p.maritimeRisk === 'security').length, tone: 'alert' },
        { label: 'Advisory', value: board.ports.filter(p => p.maritimeRisk === 'advisory').length, tone: 'warn' },
        { label: 'Calm', value: board.ports.filter(p => p.maritimeRisk === 'calm').length, tone: 'ok' },
      ]} />
      <CorridorCallout kicker="maritime doctrine" body="Storm-class postures trigger automatic diversion authority for harbour-masters. Security-class postures route through Defense liaison." />
    </CorridorFrame>
  );
}

export function RailNetwork({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="rail" code="RL-NET-09" title="Rail Network"
      subtitle="per-corridor schedule & freight">
      <CorridorKpi items={[
        { label: 'Corridors', value: board.rail.length },
        { label: 'Major disruption', value: board.rail.filter(r => r.disruption === 'major').length, tone: 'alert' },
        { label: 'Mean schedule sync', value: `${Math.round(board.rail.reduce((s, r) => s + r.syncPct, 0) / Math.max(1, board.rail.length))}%`, tone: 'ok' },
        { label: 'Freight (kt)', value: board.rail.reduce((s, r) => s + r.freightKt, 0).toFixed(0), tone: 'info' },
      ]} />
      <CorridorRule label="rail corridors" />
      {board.rail.map(r => (
        <CorridorBar key={r.id}
          label={r.route}
          pct={r.syncPct}
          tone={r.disruption === 'major' ? 'alert' : r.disruption === 'minor' ? 'warn' : 'ok'}
          tail={`${r.freightKt.toFixed(0)} kt`} />
      ))}
    </CorridorFrame>
  );
}

export function RailDisruption({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  const disrupted = board.rail.filter(r => r.disruption !== 'none');
  return (
    <CorridorFrame archetype="rail" code="RL-DSR-10" title="Rail Disruption"
      subtitle="active rail disruption ledger">
      <CorridorKpi items={[
        { label: 'Disrupted', value: disrupted.length, tone: disrupted.length > 0 ? 'warn' : 'ok' },
        { label: 'Major', value: disrupted.filter(r => r.disruption === 'major').length, tone: 'alert' },
        { label: 'Minor', value: disrupted.filter(r => r.disruption === 'minor').length, tone: 'warn' },
        { label: 'Maintenance windows', value: board.rail.reduce((s, r) => s + r.maintenanceWindowHrs, 0).toFixed(0) },
      ]} />
      <CorridorRule label="disruption register" />
      {disrupted.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: TRANSPORT_DS.mut }}>
          No rail disruption. National posture: nominal.
        </p>
      ) : disrupted.map(r => (
        <div key={r.id} className="grid grid-cols-[140px_1fr_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{r.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{r.route}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{r.maintenanceWindowHrs}h</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.disruption === 'major' ? TRANSPORT_DS.coral : TRANSPORT_DS.signal }}>● {r.disruption}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function AirHubs({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="aviation" code="AV-HUB-11" title="Air Hubs"
      subtitle="per-hub movements & cargo capacity">
      <CorridorKpi items={[
        { label: 'Hubs', value: board.aviation.length },
        { label: 'Severe weather', value: board.aviation.filter(h => h.weatherImpact === 'severe').length, tone: 'alert' },
        { label: 'Emergency corridor', value: board.aviation.filter(h => h.emergencyCorridor).length, tone: 'warn' },
        { label: 'Mean strain', value: `${Math.round(board.aviation.reduce((s, h) => s + h.airspaceStrain, 0) / Math.max(1, board.aviation.length))}/100`, tone: 'info' },
      ]} />
      <CorridorRule label="hub register" />
      {board.aviation.map(h => (
        <div key={h.id} className="grid grid-cols-[140px_180px_80px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{h.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{h.name}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{h.movementsPerHr}/h</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>cargo {h.cargoCapacityPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: h.weatherImpact === 'severe' ? TRANSPORT_DS.coral : h.weatherImpact === 'caution' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {h.weatherImpact}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function AirspaceStrain({ id, now }: { id: string; now: number }) {
  const board = transportNetworkBoard(now);
  void id;
  return (
    <CorridorFrame archetype="aviation" code="AV-STR-12" title="Airspace Strain"
      subtitle="airspace strain & weather impact">
      <CorridorKpi items={[
        { label: 'High strain (>70)', value: board.aviation.filter(h => h.airspaceStrain > 70).length, tone: 'alert' },
        { label: 'Emergency corridors', value: board.aviation.filter(h => h.emergencyCorridor).length, tone: 'warn' },
        { label: 'Severe weather hubs', value: board.aviation.filter(h => h.weatherImpact === 'severe').length, tone: 'alert' },
        { label: 'Movements (per hr total)', value: board.aviation.reduce((s, h) => s + h.movementsPerHr, 0) },
      ]} />
      <CorridorRule label="strain by hub" />
      {board.aviation.map(h => (
        <CorridorBar key={h.id}
          label={h.name}
          pct={h.airspaceStrain}
          tone={h.airspaceStrain > 70 ? 'alert' : h.airspaceStrain > 50 ? 'warn' : 'ok'}
          tail={`${h.movementsPerHr}/h`} />
      ))}
    </CorridorFrame>
  );
}
