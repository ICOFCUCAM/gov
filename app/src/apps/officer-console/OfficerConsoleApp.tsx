'use client';

// apps/officer-console — federated internal officer disposition app.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { officerConsole } from '@/lib/gov/citizen-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, InstitutionChainStrip } from '@/apps/_shared/InstitutionChain';
import { facilities, actors, recordLineage, chainIntegrity } from '@/lib/gov/institution-chain';
import { pickIndex } from '@/lib/pick-index';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#37c7d4';
const WF: Record<string, WorkKind> = { queue: 'case', decisions: 'approval', review: 'case' };
const LABEL: Record<string, string> = { queue: 'Work Queue', decisions: 'Decisions', review: 'Review' };

export function OfficerConsoleApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = officerConsole(appId, ts);
  // The officer serves the state THROUGH a station: enrolled there, every
  // case file held at the station, then rolled to Interior and national.
  const epoch = Math.max(0, Math.floor(ts));
  const stations = facilities('INTERIOR', epoch);
  const myStation = stations[pickIndex(appId, stations.length, 7)] ?? stations[0]!;
  const officerName = actors('INTERIOR', myStation.id, epoch)[0]?.name ?? 'Duty officer';
  const caseLineage = recordLineage(`CASE-${appId}`, officerName, myStation, 'INTERIOR', epoch);
  const intInteg = chainIntegrity('INTERIOR', epoch);
  const d = WF[domain] ? domain : 'queue';
  const label = LABEL[d] ?? 'Work Queue';
  const raw: { l: string; v: string; t?: Tone }[] = d === 'decisions' ? [
    { l: 'Decisions Queue', v: o.decisionsQueue.toLocaleString(), t: o.decisionsQueue > 2500 ? 'alert' : o.decisionsQueue > 1200 ? 'warn' : 'ok' },
    { l: 'Dispositions Today', v: o.dispositionsToday.toLocaleString(), t: 'ok' },
    { l: 'SLA Met', v: `${o.slaMetPct}%`, t: o.slaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Escalations Open', v: `${o.escalationsOpen}`, t: o.escalationsOpen > 30 ? 'alert' : o.escalationsOpen ? 'warn' : 'ok' },
  ] : d === 'review' ? [
    { l: 'Review Backlog', v: o.reviewBacklog.toLocaleString(), t: o.reviewBacklog > 3500 ? 'alert' : o.reviewBacklog > 1800 ? 'warn' : 'ok' },
    { l: 'SLA Met', v: `${o.slaMetPct}%`, t: o.slaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Escalations Open', v: `${o.escalationsOpen}`, t: o.escalationsOpen > 30 ? 'alert' : 'ok' },
  ] : [
    { l: 'Officers Online', v: `${o.officersOnline}`, t: 'ok' },
    { l: 'Decisions Queue', v: o.decisionsQueue.toLocaleString(), t: o.decisionsQueue > 2500 ? 'alert' : o.decisionsQueue > 1200 ? 'warn' : 'ok' },
    { l: 'Review Backlog', v: o.reviewBacklog.toLocaleString(), t: o.reviewBacklog > 3500 ? 'alert' : 'warn' },
    { l: 'SLA Met', v: `${o.slaMetPct}%`, t: o.slaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Dispositions Today', v: o.dispositionsToday.toLocaleString(), t: 'ok' },
    { l: 'Escalations Open', v: `${o.escalationsOpen}`, t: o.escalationsOpen > 30 ? 'alert' : o.escalationsOpen ? 'warn' : 'ok' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `oc${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Officer Console · ${label}`} subtitle="Sovereign Disposition Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <BarPanel title="Desk load" meta="disposition queues" accent={ACC} live
        rows={o.byDesk.map(x => ({ label: x.desk, pct: Math.min(100, x.queue / 14), tone: x.tone, tail: `${x.queue}` }))} />
      <InstitutionChainStrip accent={ACC} ministryKey="INTERIOR" facility={myStation}
        actorName={officerName} lineage={caseLineage} integrity={intInteg} />
      <MinistryChainSection ministryKey="INTERIOR" id={appId} now={now} accent={ACC} />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute officer dispositions`} by="Officer" role={role} withheld={withheld} />
    </div>
  );
}
