'use client';

// apps/ministry-transport — federated transport execution application.
// Each nav domain renders its OWN focused subsystem surface.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { transportOps, transportCommand } from '@/lib/gov/transport-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', aviation: 'case', maritime: 'case', rail: 'case', road: 'case', logistics: 'procurement', citizen: 'permit' };
const LABEL: Record<string, string> = { command: 'Transport Command', aviation: 'Aviation Systems', maritime: 'Maritime Systems', rail: 'Rail Systems', road: 'Road Systems', logistics: 'Logistics & Fleet', citizen: 'Mobility Services' };
type Tone = 'ok' | 'warn' | 'alert';

export function MinistryTransportApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = transportOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Transport Command';

  let items: { l: string; v: string; t?: Tone }[];
  let panel: React.ReactNode = null;

  if (d === 'command') {
    const C = transportCommand(id, ts);
    const pt: Tone = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    items = [
      { l: 'Posture index', v: `${C.postureIndex}`, t: pt },
      { l: 'Command posture', v: C.posture, t: pt },
      { l: 'Critical domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
      { l: 'Open directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
      { l: 'Network availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
      { l: 'Safety index', v: `${o.safetyIndex}`, t: o.safetyIndex >= 80 ? 'ok' : 'warn' },
    ];
    panel = <Panel title="Command domain status" meta="emergent"><Bars rows={C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value }))} /></Panel>;
  } else if (d === 'aviation' || d === 'maritime' || d === 'rail' || d === 'road') {
    const md = o.modes.find(x => x.mode.toLowerCase() === d) ?? o.modes[0]!;
    items = [
      { l: `${md.mode} throughput`, v: `${md.throughputPct}%`, t: md.tone },
      { l: 'Delays', v: `${md.delaysMin}m`, t: md.delaysMin >= 50 ? 'alert' : md.delaysMin >= 25 ? 'warn' : 'ok' },
      { l: 'Incidents', v: `${md.incidents}`, t: md.incidents >= 6 ? 'alert' : md.incidents ? 'warn' : 'ok' },
      { l: 'Network availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
      { l: 'Safety index', v: `${o.safetyIndex}`, t: o.safetyIndex >= 80 ? 'ok' : 'warn' },
    ];
    panel = <Panel title={`${md.mode} corridor flow`} meta="load · throughput"><Bars rows={o.corridors.map(c => ({ label: c.corridor, pct: c.loadPct, tone: c.tone, tail: `${c.throughputKt}kt` }))} /></Panel>;
  } else if (d === 'logistics') {
    items = [
      { l: 'Fleet available', v: `${o.fleet.available}/${o.fleet.vehicles}`, t: o.fleet.available < o.fleet.vehicles * 0.6 ? 'alert' : 'ok' },
      { l: 'Maint. backlog', v: `${o.fleet.maintenanceBacklog}`, t: o.fleet.maintenanceBacklog > 200 ? 'alert' : o.fleet.maintenanceBacklog > 90 ? 'warn' : 'ok' },
      { l: 'Network availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
    ];
    panel = <Panel title="Corridor flow" meta="logistics load · throughput"><Bars rows={o.corridors.map(c => ({ label: c.corridor, pct: c.loadPct, tone: c.tone, tail: `${c.throughputKt}kt` }))} /></Panel>;
  } else { // citizen
    items = [
      { l: 'Vehicles registered', v: `${o.registry.vehiclesM}M`, t: 'ok' },
      { l: 'Licences issued today', v: o.registry.licencesIssuedToday.toLocaleString(), t: 'ok' },
      { l: 'Registry backlog', v: o.registry.backlog.toLocaleString(), t: o.registry.backlog > 3000 ? 'alert' : o.registry.backlog > 1500 ? 'warn' : 'ok' },
      { l: 'Network availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
    ];
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[3px] border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label} subsystem
      </div>
      <StatGrid items={items} />
      {panel}
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the transport workflow`} by="Transport Officer" role={role} withheld={withheld} />
    </div>
  );
}
