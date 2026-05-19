'use client';

// apps/ministry-transport — federated transport execution application.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { transportOps, transportCommand } from '@/lib/gov/transport-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, InstitutionChainStrip, actorChain } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#37c7d4';
const WF: Record<string, WorkKind> = { command: 'incident', aviation: 'case', maritime: 'case', rail: 'case', road: 'case', logistics: 'procurement', citizen: 'permit' };
const LABEL: Record<string, string> = { command: 'Transport Command', aviation: 'Aviation Systems', maritime: 'Maritime Systems', rail: 'Rail Systems', road: 'Road Systems', logistics: 'Logistics & Fleet', citizen: 'Mobility Services' };
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `tp${i}` }));

export function MinistryTransportApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = transportOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Transport Command';

  let kpis: K[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] } | null = null;
  let pTone: Tone = 'ok';

  if (d === 'command') {
    const C = transportCommand(id, ts);
    pTone = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    kpis = [
      { l: 'Posture Index', v: `${C.postureIndex}`, t: pTone }, { l: 'Command Posture', v: C.posture, t: pTone },
      { l: 'Critical Domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
      { l: 'Open Directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
      { l: 'Network Availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
      { l: 'Safety Index', v: `${o.safetyIndex}`, t: o.safetyIndex >= 80 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Command domain status', meta: 'emergent', rows: C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value })) };
  } else if (d === 'aviation' || d === 'maritime' || d === 'rail' || d === 'road') {
    const md = o.modes.find(x => x.mode.toLowerCase() === d) ?? o.modes[0]!;
    pTone = md.tone;
    kpis = [
      { l: `${md.mode} Throughput`, v: `${md.throughputPct}%`, t: md.tone },
      { l: 'Delays', v: `${md.delaysMin}m`, t: md.delaysMin >= 50 ? 'alert' : md.delaysMin >= 25 ? 'warn' : 'ok' },
      { l: 'Incidents', v: `${md.incidents}`, t: md.incidents >= 6 ? 'alert' : md.incidents ? 'warn' : 'ok' },
      { l: 'Network Availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
      { l: 'Safety Index', v: `${o.safetyIndex}`, t: o.safetyIndex >= 80 ? 'ok' : 'warn' },
    ];
    bars = { title: `${md.mode} corridor flow`, meta: 'load · throughput', rows: o.corridors.map(c => ({ label: c.corridor, pct: c.loadPct, tone: c.tone, tail: `${c.throughputKt}kt` })) };
  } else if (d === 'logistics') {
    pTone = o.fleet.maintenanceBacklog > 200 ? 'alert' : o.fleet.maintenanceBacklog > 90 ? 'warn' : 'ok';
    kpis = [
      { l: 'Fleet Available', v: `${o.fleet.available}/${o.fleet.vehicles}`, t: o.fleet.available < o.fleet.vehicles * 0.6 ? 'alert' : 'ok' },
      { l: 'Maint. Backlog', v: `${o.fleet.maintenanceBacklog}`, t: pTone },
      { l: 'Network Availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Corridor flow', meta: 'logistics load · throughput', rows: o.corridors.map(c => ({ label: c.corridor, pct: c.loadPct, tone: c.tone, tail: `${c.throughputKt}kt` })) };
  } else {
    pTone = o.registry.backlog > 3000 ? 'alert' : o.registry.backlog > 1500 ? 'warn' : 'ok';
    kpis = [
      { l: 'Vehicles Registered', v: `${o.registry.vehiclesM}M`, t: 'ok' },
      { l: 'Licences Issued Today', v: o.registry.licencesIssuedToday.toLocaleString(), t: 'ok' },
      { l: 'Registry Backlog', v: o.registry.backlog.toLocaleString(), t: pTone },
      { l: 'Network Availability', v: `${o.networkAvailabilityPct}%`, t: o.networkAvailabilityPct >= 85 ? 'ok' : 'warn' },
    ];
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Transport · ${label}`} subtitle="Sovereign Transport Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      {bars ? <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} /> : null}
      {(() => { const ch = actorChain('TRANSPORT', id, now, 'MOV'); return (
        <InstitutionChainStrip accent={ACC} ministryKey="TRANSPORT" facility={ch.facility}
          actorName={ch.actorName} lineage={ch.lineage} integrity={ch.integrity} />
      ); })()}
      <MinistryChainSection ministryKey="TRANSPORT" id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the transport workflow`} by="Transport Officer" role={role} withheld={withheld} />
    </div>
  );
}
