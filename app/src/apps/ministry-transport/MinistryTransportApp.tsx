'use client';

// apps/ministry-transport — federated transport execution application.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { transportOps } from '@/lib/gov/transport-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', aviation: 'case', maritime: 'case', rail: 'case', road: 'case', logistics: 'procurement', citizen: 'permit' };
const LABEL: Record<string, string> = { command: 'Transport Command', aviation: 'Aviation Systems', maritime: 'Maritime Systems', rail: 'Rail Systems', road: 'Road Systems', logistics: 'Logistics & Fleet', citizen: 'Mobility Services' };

export function MinistryTransportApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = transportOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Transport Command';
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Network availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : o.networkAvailabilityPct >= 68 ? 'warn' : 'alert' },
        { l: 'Safety index', v: `${o.safetyIndex}`, t: o.safetyIndex >= 80 ? 'ok' : 'warn' },
        { l: 'Fleet available', v: `${o.fleet.available}/${o.fleet.vehicles}`, t: o.fleet.available < o.fleet.vehicles * 0.6 ? 'alert' : 'ok' },
        { l: 'Maint. backlog', v: `${o.fleet.maintenanceBacklog}`, t: o.fleet.maintenanceBacklog > 200 ? 'alert' : 'warn' },
        { l: 'Vehicles registered', v: `${o.registry.vehiclesM}M`, t: 'ok' },
        { l: 'Registry backlog', v: o.registry.backlog.toLocaleString(), t: o.registry.backlog > 3000 ? 'warn' : 'ok' },
      ]} />
      <Panel title="Modal operations" meta="aviation · maritime · rail · road">
        <Bars rows={o.modes.map(m => ({ label: m.mode, pct: m.throughputPct, tone: m.tone, tail: `${m.throughputPct}% · ${m.incidents}i` }))} />
      </Panel>
      <Panel title="Corridor flow" meta="logistics load · throughput">
        <Bars rows={o.corridors.map(c => ({ label: c.corridor, pct: c.loadPct, tone: c.tone, tail: `${c.throughputKt}kt` }))} />
      </Panel>
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the transport workflow`} by="Transport Officer" role={role} withheld={withheld} />
    </div>
  );
}
