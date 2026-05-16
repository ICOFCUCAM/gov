'use client';

// apps/judiciary — federated judicial execution application.
// Eight operational domains, each an execution surface (live judicial
// state + an executable case/constitutional workflow runtime).

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { judicialState } from '@/lib/gov/judicial-engine';
import { evidenceRegistry, prisonCoordination, judicialOperations } from '@/lib/gov/judicial-operations';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = {
  constitutional: 'judicial', supreme: 'judicial', appeals: 'judicial', trial: 'judicial',
  evidence: 'case', corrections: 'case', live: 'judicial', cases: 'judicial', operations: 'case',
};
const LABEL: Record<string, string> = {
  constitutional: 'Constitutional Court', supreme: 'Supreme Court', appeals: 'Appeals System',
  trial: 'Trial Court System', evidence: 'Evidence Registry', corrections: 'Prison Coordination',
  live: 'Judicial Intelligence', cases: 'Case Management', operations: 'Judicial Operations',
};

export function JudiciaryApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId;
  const ts = now / 4000;
  const js = judicialState(ts);
  const d = WF[domain] ? domain : 'constitutional';
  const label = LABEL[d] ?? 'Constitutional Court';

  let body: React.ReactNode;
  if (d === 'constitutional') {
    const constReview = js.cases.filter(c => c.type === 'constitutional').length;
    body = (
      <>
        <StatGrid items={[
          { l: 'Constitutional matters', v: `${js.constitutionalMatters}`, t: js.constitutionalMatters >= 6 ? 'alert' : 'warn' },
          { l: 'Pending review', v: `${constReview}`, t: constReview ? 'warn' : 'ok' },
          { l: 'Apex backlog', v: `${js.tiers[3]!.backlog}`, t: js.tiers[3]!.backlog > 60 ? 'alert' : 'warn' },
          { l: 'Apex clearance', v: `${js.tiers[3]!.clearancePct}%`, t: js.tiers[3]!.clearancePct >= 75 ? 'ok' : 'warn' },
          { l: 'Separation-of-powers', v: js.signals.some(s => s.level === 'risk') ? 'STRESSED' : 'INTACT', t: js.signals.some(s => s.level === 'risk') ? 'alert' : 'ok' },
          { l: 'Mean clearance', v: `${js.meanClearance}%`, t: js.meanClearance >= 75 ? 'ok' : 'warn' },
        ]} />
        <Panel title="Constitutional docket" meta="executive / legislative / emergency-power review">
          <Bars rows={js.cases.filter(c => c.type === 'constitutional').slice(0, 8).map(c => ({ label: c.matter, pct: c.progressPct, tone: c.backlogged ? 'alert' : c.stage === 'Closed' ? 'ok' : 'warn', tail: c.stage }))} />
        </Panel>
      </>
    );
  } else if (d === 'supreme' || d === 'appeals' || d === 'trial' || d === 'cases' || d === 'live') {
    body = (
      <>
        <StatGrid items={[
          { l: 'Open cases', v: `${js.openCases}`, t: 'ok' },
          { l: 'Appeals', v: `${js.appeals}`, t: 'warn' },
          { l: 'Total backlog', v: `${js.totalBacklog}`, t: js.totalBacklog > 900 ? 'alert' : js.totalBacklog > 500 ? 'warn' : 'ok' },
          { l: 'Mean clearance', v: `${js.meanClearance}%`, t: js.meanClearance >= 80 ? 'ok' : 'warn' },
          { l: 'Worst region', v: `${[...js.regional].sort((a, b) => a.clearancePct - b.clearancePct)[0]?.region ?? '—'}`, t: 'alert' },
          { l: 'Tiers', v: `${js.tiers.length}`, t: 'ok' },
        ]} />
        <Panel title="Court hierarchy · backlog propagation" meta="inflow → clearance → carried up">
          <Bars rows={js.tiers.map(tr => ({ label: tr.tier, pct: tr.clearancePct, tone: tr.tone, tail: `${tr.clearancePct}% · bk ${tr.backlog}` }))} />
        </Panel>
        <Panel title="Case pipeline" meta="filed → judgment → appeal">
          <Bars rows={js.cases.slice(0, 9).map(c => ({ label: c.matter, pct: c.progressPct, tone: c.backlogged ? 'alert' : c.stage === 'Closed' ? 'ok' : 'warn', tail: c.stage }))} />
        </Panel>
      </>
    );
  } else if (d === 'evidence') {
    const ev = evidenceRegistry(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Items in custody', v: ev.itemsCustody.toLocaleString(), t: 'ok' },
          { l: 'Chain integrity', v: `${ev.chainIntegrityPct}%`, t: ev.chainIntegrityPct >= 99 ? 'ok' : 'alert' },
          { l: 'Tamper flags', v: `${ev.tamperFlags}`, t: ev.tamperFlags ? 'alert' : 'ok' },
          { l: 'Cross-agency routes', v: `${ev.crossAgencyRoutes}`, t: 'ok' },
          { l: 'Pending verification', v: ev.pendingVerification.toLocaleString(), t: ev.pendingVerification > 1000 ? 'warn' : 'ok' },
          { l: 'Registry posture', v: ev.tamperFlags ? 'COMPROMISED' : 'INTACT', t: ev.tamperFlags ? 'alert' : 'ok' },
        ]} />
      </>
    );
  } else if (d === 'corrections') {
    const pc = prisonCoordination(id, ts);
    body = (
      <StatGrid items={[
        { l: 'Facilities', v: `${pc.facilities}`, t: 'ok' },
        { l: 'Population', v: pc.population.toLocaleString(), t: 'ok' },
        { l: 'Capacity', v: pc.capacity.toLocaleString(), t: 'ok' },
        { l: 'Occupancy', v: `${pc.occupancyPct}%`, t: pc.occupancyPct >= 110 ? 'alert' : pc.occupancyPct >= 95 ? 'warn' : 'ok' },
        { l: 'Transfers pending', v: `${pc.transfersPending}`, t: pc.transfersPending > 500 ? 'warn' : 'ok' },
        { l: 'Rehabilitation active', v: pc.rehabilitationActive.toLocaleString(), t: 'ok' },
      ]} />
    );
  } else { // operations
    const jo = judicialOperations(id, ts);
    body = (
      <StatGrid items={[
        { l: 'Judges assigned', v: `${jo.judgesAssigned}`, t: 'ok' },
        { l: 'Courtrooms active', v: `${jo.courtroomsActive}`, t: 'ok' },
        { l: 'Emergency injunctions', v: `${jo.emergencyInjunctions}`, t: jo.emergencyInjunctions ? 'warn' : 'ok' },
        { l: 'Warrants pending', v: jo.warrantsPending.toLocaleString(), t: jo.warrantsPending > 1500 ? 'alert' : 'warn' },
        { l: 'Scheduling conflicts', v: `${jo.schedulingConflicts}`, t: jo.schedulingConflicts > 30 ? 'alert' : 'warn' },
        { l: 'Operations posture', v: jo.schedulingConflicts > 30 ? 'STRAINED' : 'NOMINAL', t: jo.schedulingConflicts > 30 ? 'warn' : 'ok' },
      ]} />
    );
  }

  return (
    <div className="space-y-2">
      {body}
      <RuntimeQueue scope={`jud:${d}`} kind={WF[d] ?? 'judicial'} title={`${label} runtime — execute the judicial workflow`} by="Registrar" role={role} withheld={withheld} />
    </div>
  );
}
