'use client';

// apps/police-command — federated police execution application.
// Civil stability, emergency posture and regional escalation EMERGE
// from these operations into national command.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { policeOps } from '@/lib/gov/agency-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = {
  incident: 'incident', dispatch: 'incident', patrol: 'case', investigations: 'case',
  evidence: 'case', intelligence: 'case', detention: 'case', border: 'incident',
};
const LABEL: Record<string, string> = {
  incident: 'Incident Command', dispatch: 'Dispatch Systems', patrol: 'Patrol Coordination',
  investigations: 'Investigations', evidence: 'Evidence Routing', intelligence: 'Intelligence Workflows',
  detention: 'Detention Workflows', border: 'Border Escalation',
};

export function PoliceCommandApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = policeOps(appId, ts);
  const d = WF[domain] ? domain : 'incident';
  const label = LABEL[d] ?? 'Incident Command';

  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Active incidents', v: `${o.activeIncidents}`, t: o.activeIncidents > 90 ? 'alert' : o.activeIncidents > 40 ? 'warn' : 'ok' },
        { l: 'Units deployed', v: `${o.unitsDeployed}/${o.unitsTotal}`, t: 'ok' },
        { l: 'Mean response', v: `${o.meanResponseMin}m`, t: o.meanResponseMin >= 18 ? 'alert' : o.meanResponseMin >= 12 ? 'warn' : 'ok' },
        { l: 'Clearance rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : 'warn' },
        { l: 'Open investigations', v: o.openInvestigations.toLocaleString(), t: 'warn' },
        { l: 'Custody occupancy', v: `${o.custodyOccupancyPct}%`, t: o.custodyOccupancyPct >= 110 ? 'alert' : o.custodyOccupancyPct >= 95 ? 'warn' : 'ok' },
      ]} />
      <Panel title="Regional patrol load" meta="civil-stability footprint → national escalation">
        <Bars rows={o.regional.map(r => ({ label: r.region, pct: r.load, tone: r.tone, tail: `${r.load}` }))} />
      </Panel>
      <Panel title="Patrol divisions" meta="deployment status">
        <Bars rows={o.patrols.map(p => ({ label: `${p.label} · ${p.region}`, pct: p.status === 'responding' ? 92 : p.status === 'patrolling' ? 55 : 25, tone: p.tone, tail: p.status }))} />
      </Panel>
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the policing workflow`} by="Watch Commander" role={role} withheld={withheld} />
    </div>
  );
}
