'use client';

// Communications domains — Command, Infrastructure & Cloud surfaces.

import * as React from 'react';
import { communicationsBoard } from '@/lib/gov/communications-continuity';
import { TopologyFrame, TopologyKpi, TopologyRule, NodeBar, TopologyCallout, COMMS_DS } from '@/apps/communications/design-system/communications-ds';

export function ConnectivityPosture({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="command" code="CM-PST-02" title="Connectivity Posture"
      subtitle="national uptime, signal integrity & sovereign autonomy"
      posture={board.command.posture}>
      <TopologyKpi items={[
        { label: 'National uptime', value: `${board.command.nationalUptimePct}%`, tone: board.command.nationalUptimePct > 99 ? 'ok' : 'warn' },
        { label: 'Signal integrity', value: `${board.command.signalIntegrityIdx}/100`, tone: 'info' },
        { label: 'Routing resilience', value: `${board.command.routingResilienceIdx}/100`, tone: 'ok' },
        { label: 'Sovereign autonomy', value: `${board.command.sovereignAutonomyIdx}/100`, tone: 'ok' },
      ]} />
      <TopologyCallout kicker="constitutional autonomy" body="Sovereign-cloud share, fiber-route diversity and routing resilience are tracked together. Arbitrary network shutdown is constitutionally void." />
    </TopologyFrame>
  );
}

export function RegionalConnectivity({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="command" code="CM-RGN-03" title="Regional Connectivity"
      subtitle="per-region uptime & coverage">
      <TopologyKpi items={[
        { label: 'Regions', value: board.command.regions.length },
        { label: 'Fractured', value: board.command.regions.filter(r => r.classification === 'fractured').length, tone: 'alert' },
        { label: 'Mean broadband', value: `${Math.round(board.command.regions.reduce((s, r) => s + r.broadbandPenetrationPct, 0) / Math.max(1, board.command.regions.length))}%`, tone: 'ok' },
        { label: 'Emergency channels', value: board.command.emergencyChannelsActive, tone: 'info' },
      ]} />
      <TopologyRule label="regional posture" />
      {board.command.regions.map(r => (
        <NodeBar key={r.region}
          label={r.region}
          pct={r.broadbandPenetrationPct}
          tone={r.classification === 'fractured' ? 'alert' : r.classification === 'degraded' ? 'warn' : r.classification === 'observant' ? 'info' : 'ok'}
          tail={`${r.mobileCoveragePct}% mobile · ${r.averageLatencyMs}ms`} />
      ))}
    </TopologyFrame>
  );
}

export function NetworkAssets({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="infrastructure" code="IF-AST-04" title="Network Asset Register"
      subtitle="all-network register">
      <TopologyKpi items={[
        { label: 'Assets tracked', value: board.networkAssets.length },
        { label: 'Offline', value: board.networkAssets.filter(a => a.status === 'offline').length, tone: 'alert' },
        { label: 'Degraded', value: board.networkAssets.filter(a => a.status === 'degraded').length, tone: 'warn' },
        { label: 'Overdue maintenance', value: board.networkAssets.filter(a => a.maintenanceWindow === 'overdue').length, tone: 'warn' },
      ]} />
      <TopologyRule label="asset register" />
      {board.networkAssets.map(a => (
        <div key={a.id} className="grid grid-cols-[120px_140px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{a.id}</span>
          <span style={{ color: COMMS_DS.ink }}>{a.kind}</span>
          <span style={{ color: COMMS_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{a.uptimePct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.status === 'offline' ? COMMS_DS.coral : a.status === 'degraded' ? COMMS_DS.amber : a.status === 'maintenance' ? COMMS_DS.electric : COMMS_DS.lime }}>● {a.status}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

function assetFleet(kinds: string[], code: string, title: string, subtitle: string) {
  return function AssetFleet({ id, now }: { id: string; now: number }) {
    const board = communicationsBoard(now);
    void id;
    const filtered = board.networkAssets.filter(a => kinds.includes(a.kind));
    return (
      <TopologyFrame archetype="infrastructure" code={code} title={title} subtitle={subtitle}>
        <TopologyKpi items={[
          { label: 'Assets', value: filtered.length },
          { label: 'Mean uptime', value: `${Math.round(filtered.reduce((s, a) => s + a.uptimePct, 0) / Math.max(1, filtered.length))}%`, tone: 'ok' },
          { label: 'Degraded / offline', value: filtered.filter(a => a.status === 'degraded' || a.status === 'offline').length, tone: 'warn' },
          { label: 'Mean utilisation', value: `${Math.round(filtered.reduce((s, a) => s + a.utilisationPct, 0) / Math.max(1, filtered.length))}%`, tone: 'info' },
        ]} />
        <TopologyRule label="asset register" />
        {filtered.length === 0 ? (
          <p className="text-[10.5px] italic" style={{ color: COMMS_DS.mut }}>No assets of this class.</p>
        ) : filtered.map(a => (
          <NodeBar key={a.id}
            label={`${a.id} · ${a.region}`}
            pct={a.uptimePct}
            tone={a.status === 'offline' ? 'alert' : a.status === 'degraded' ? 'warn' : 'ok'}
            tail={`util ${a.utilisationPct}%`} />
        ))}
      </TopologyFrame>
    );
  };
}

export const FiberTrunks      = assetFleet(['fiber-trunk'],        'IF-FBR-05', 'Fiber Trunks',       'long-haul fiber trunk fleet');
export const MobileTowers     = assetFleet(['mobile-tower'],       'IF-MBL-06', 'Mobile Tower Fleet', 'national tower fleet');
export const SubmarineCables  = assetFleet(['submarine-cable'],    'IF-SUB-07', 'Submarine Cables',   'international cable landings');

export function SovereignCloud({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="cloud" code="CL-SVR-08" title="Sovereign Cloud"
      subtitle="national cloud capacity">
      <TopologyKpi items={[
        { label: 'Data centres', value: board.dataCenters.length },
        { label: 'Mean rack utilisation', value: `${Math.round(board.dataCenters.reduce((s, d) => s + d.rackUtilisationPct, 0) / Math.max(1, board.dataCenters.length))}%`, tone: 'info' },
        { label: 'Mean failover-readiness', value: `${Math.round(board.dataCenters.reduce((s, d) => s + d.failoverReadinessIdx, 0) / Math.max(1, board.dataCenters.length))}/100`, tone: 'ok' },
        { label: 'Mean green-power share', value: `${Math.round(board.dataCenters.reduce((s, d) => s + d.greenPowerSharePct, 0) / Math.max(1, board.dataCenters.length))}%`, tone: 'ok' },
      ]} />
      <TopologyCallout kicker="sovereign cloud doctrine" body="Sovereign data, citizen records and government workloads run on sovereign-cloud infrastructure with N+1 or better redundancy." />
    </TopologyFrame>
  );
}

export function DataCenters({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="cloud" code="CL-DTC-09" title="Data Centers"
      subtitle="per-facility capacity & redundancy">
      <TopologyKpi items={[
        { label: 'Facilities', value: board.dataCenters.length },
        { label: '2N or better redundancy', value: board.dataCenters.filter(d => d.redundancy === '2N' || d.redundancy === '2N+1').length, tone: 'ok' },
        { label: 'Degraded', value: board.dataCenters.filter(d => d.status === 'degraded').length, tone: 'alert' },
        { label: 'Pressured', value: board.dataCenters.filter(d => d.status === 'pressured').length, tone: 'warn' },
      ]} />
      <TopologyRule label="facility register" />
      {board.dataCenters.map(d => (
        <div key={d.facility} className="grid grid-cols-[180px_140px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: COMMS_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: COMMS_DS.electric }}>{d.facility}</span>
          <span style={{ color: COMMS_DS.mut }}>{d.region}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.ink }}>{d.redundancy}</span>
          <span className="text-right tabular-nums" style={{ color: COMMS_DS.mut }}>{d.rackUtilisationPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: d.status === 'degraded' ? COMMS_DS.coral : d.status === 'pressured' ? COMMS_DS.amber : d.status === 'monitored' ? COMMS_DS.electric : COMMS_DS.lime }}>● {d.status}</span>
        </div>
      ))}
    </TopologyFrame>
  );
}

export function RoutingHealth({ id, now }: { id: string; now: number }) {
  const board = communicationsBoard(now);
  void id;
  return (
    <TopologyFrame archetype="cloud" code="CL-RTG-10" title="Routing Health"
      subtitle="BGP, DNS, CDN & cross-border routing">
      <TopologyKpi items={[
        { label: 'Metrics tracked', value: board.routing.length },
        { label: 'Degraded', value: board.routing.filter(r => r.classification === 'degraded').length, tone: 'alert' },
        { label: 'Engaged', value: board.routing.filter(r => r.classification === 'engaged').length, tone: 'warn' },
        { label: 'Stable', value: board.routing.filter(r => r.classification === 'stable').length, tone: 'ok' },
      ]} />
      <TopologyRule label="routing metrics" />
      {board.routing.map(r => (
        <NodeBar key={r.metric}
          label={r.metric}
          pct={r.scoreIdx}
          tone={r.classification === 'degraded' ? 'alert' : r.classification === 'engaged' ? 'warn' : r.classification === 'watch' ? 'info' : 'ok'}
          tail={`${r.anomaliesActive} anomalies`} />
      ))}
    </TopologyFrame>
  );
}
