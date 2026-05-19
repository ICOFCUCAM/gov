'use client';

// apps/police-command — federated police execution application. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { policeOps } from '@/lib/gov/agency-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#5fa8ff';
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
  const respT: Tone = o.meanResponseMin >= 18 ? 'alert' : o.meanResponseMin >= 12 ? 'warn' : 'ok';
  const isInv = d === 'investigations' || d === 'evidence';
  const isIntel = d === 'intelligence';
  const fieldDomain = d === 'incident' || d === 'dispatch' || d === 'patrol';

  const raw: { l: string; v: string; t?: Tone }[] = isInv ? [
    { l: 'Open Investigations', v: o.openInvestigations.toLocaleString(), t: o.openInvestigations > 4000 ? 'alert' : 'warn' },
    { l: 'Clearance Rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : o.clearanceRatePct >= 55 ? 'warn' : 'alert' },
    { l: 'Custody Occupancy', v: `${o.custodyOccupancyPct}%`, t: o.custodyOccupancyPct >= 110 ? 'alert' : o.custodyOccupancyPct >= 95 ? 'warn' : 'ok' },
    { l: 'Active Incidents', v: `${o.activeIncidents}`, t: o.activeIncidents > 90 ? 'alert' : 'ok' },
  ] : isIntel ? [
    { l: 'Active Incidents', v: `${o.activeIncidents}`, t: o.activeIncidents > 90 ? 'alert' : o.activeIncidents > 40 ? 'warn' : 'ok' },
    { l: 'Clearance Rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : 'warn' },
    { l: 'Regions Tracked', v: `${o.regional.length}`, t: 'ok' },
  ] : [
    { l: 'Active Incidents', v: `${o.activeIncidents}`, t: o.activeIncidents > 90 ? 'alert' : o.activeIncidents > 40 ? 'warn' : 'ok' },
    { l: 'Units Deployed', v: `${o.unitsDeployed}/${o.unitsTotal}`, t: 'ok' },
    { l: 'Mean Response', v: `${o.meanResponseMin}m`, t: respT },
    { l: 'Clearance Rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : 'warn' },
    { l: 'Open Investigations', v: o.openInvestigations.toLocaleString(), t: 'warn' },
    { l: 'Custody Occupancy', v: `${o.custodyOccupancyPct}%`, t: o.custodyOccupancyPct >= 110 ? 'alert' : o.custodyOccupancyPct >= 95 ? 'warn' : 'ok' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `pc${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Police · ${label}`} subtitle="Sovereign Civil-Stability Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <BarPanel title="Regional patrol load" meta="civil-stability footprint → national escalation" accent={ACC} live
        rows={o.regional.map(r => ({ label: r.region, pct: r.load, tone: r.tone, tail: `${r.load}` }))} />
      {!isInv && !isIntel ? (
        <BarPanel title="Patrol divisions" meta="deployment status" accent={ACC}
          rows={o.patrols.map(p => ({ label: `${p.label} · ${p.region}`, pct: p.status === 'responding' ? 92 : p.status === 'patrolling' ? 55 : 25, tone: p.tone, tail: p.status }))} />
      ) : null}
      {fieldDomain ? (
        <>
          <FieldPanel instId={appId} archetype="INTERIOR" now={now} />
          <MinistryChainSection ministryKey="INTERIOR" id={appId} now={now} accent={ACC} />
          <RuntimeQueue scope={`${appId}:field`} kind="field" title="Field deployment runtime — stage → task → en-route → on-scene → cleared" by="Field Coordinator" role={role} withheld={withheld} />
        </>
      ) : null}
      <ActorChainStrip ministryKey="INTERIOR" idKey={appId} now={now} accent={ACC} recordPrefix="CASE" />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the policing workflow`} by="Watch Commander" role={role} withheld={withheld} />
    </div>
  );
}
