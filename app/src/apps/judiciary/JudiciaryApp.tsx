'use client';

// apps/judiciary — federated judicial execution application. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { judicialState } from '@/lib/gov/judicial-engine';
import { evidenceRegistry, prisonCoordination, judicialOperations } from '@/lib/gov/judicial-operations';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#9b8cff';
const WF: Record<string, WorkKind> = {
  constitutional: 'judicial', supreme: 'judicial', appeals: 'judicial', trial: 'judicial',
  evidence: 'case', corrections: 'case', live: 'judicial', cases: 'judicial', operations: 'case',
};
const LABEL: Record<string, string> = {
  constitutional: 'Constitutional Court', supreme: 'Supreme Court', appeals: 'Appeals System',
  trial: 'Trial Court System', evidence: 'Evidence Registry', corrections: 'Prison Coordination',
  live: 'Judicial Intelligence', cases: 'Case Management', operations: 'Judicial Operations',
};
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `ju${i}` }));

export function JudiciaryApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const js = judicialState(ts);
  const d = WF[domain] ? domain : 'constitutional';
  const label = LABEL[d] ?? 'Constitutional Court';

  let kpis: K[] = [];
  const bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] }[] = [];
  let pTone: Tone = 'ok';

  if (d === 'constitutional') {
    const constReview = js.cases.filter(c => c.type === 'constitutional').length;
    pTone = js.signals.some(s => s.level === 'risk') ? 'alert' : 'warn';
    kpis = [
      { l: 'Constitutional Matters', v: `${js.constitutionalMatters}`, t: js.constitutionalMatters >= 6 ? 'alert' : 'warn' },
      { l: 'Pending Review', v: `${constReview}`, t: constReview ? 'warn' : 'ok' },
      { l: 'Apex Backlog', v: `${js.tiers[3]!.backlog}`, t: js.tiers[3]!.backlog > 60 ? 'alert' : 'warn' },
      { l: 'Apex Clearance', v: `${js.tiers[3]!.clearancePct}%`, t: js.tiers[3]!.clearancePct >= 75 ? 'ok' : 'warn' },
      { l: 'Sep. of Powers', v: js.signals.some(s => s.level === 'risk') ? 'STRESSED' : 'INTACT', t: js.signals.some(s => s.level === 'risk') ? 'alert' : 'ok' },
      { l: 'Mean Clearance', v: `${js.meanClearance}%`, t: js.meanClearance >= 75 ? 'ok' : 'warn' },
    ];
    bars.push({ title: 'Constitutional docket', meta: 'executive / legislative / emergency-power review', rows: js.cases.filter(c => c.type === 'constitutional').slice(0, 8).map(c => ({ label: c.matter, pct: c.progressPct, tone: (c.backlogged ? 'alert' : c.stage === 'Closed' ? 'ok' : 'warn') as Tone, tail: c.stage })) });
  } else if (d === 'supreme' || d === 'appeals' || d === 'trial' || d === 'cases' || d === 'live') {
    pTone = js.totalBacklog > 900 ? 'alert' : js.totalBacklog > 500 ? 'warn' : 'ok';
    kpis = [
      { l: 'Open Cases', v: `${js.openCases}`, t: 'ok' }, { l: 'Appeals', v: `${js.appeals}`, t: 'warn' },
      { l: 'Total Backlog', v: `${js.totalBacklog}`, t: pTone },
      { l: 'Mean Clearance', v: `${js.meanClearance}%`, t: js.meanClearance >= 80 ? 'ok' : 'warn' },
      { l: 'Worst Region', v: `${[...js.regional].sort((a, b) => a.clearancePct - b.clearancePct)[0]?.region ?? '—'}`, t: 'alert' },
      { l: 'Tiers', v: `${js.tiers.length}`, t: 'ok' },
    ];
    bars.push({ title: 'Court hierarchy · backlog propagation', meta: 'inflow → clearance → carried up', rows: js.tiers.map(tr => ({ label: tr.tier, pct: tr.clearancePct, tone: tr.tone, tail: `${tr.clearancePct}% · bk ${tr.backlog}` })) });
    bars.push({ title: 'Case pipeline', meta: 'filed → judgment → appeal', rows: js.cases.slice(0, 9).map(c => ({ label: c.matter, pct: c.progressPct, tone: (c.backlogged ? 'alert' : c.stage === 'Closed' ? 'ok' : 'warn') as Tone, tail: c.stage })) });
  } else if (d === 'evidence') {
    const ev = evidenceRegistry(id, ts); pTone = ev.tamperFlags ? 'alert' : 'ok';
    kpis = [
      { l: 'Items In Custody', v: ev.itemsCustody.toLocaleString(), t: 'ok' },
      { l: 'Chain Integrity', v: `${ev.chainIntegrityPct}%`, t: ev.chainIntegrityPct >= 99 ? 'ok' : 'alert' },
      { l: 'Tamper Flags', v: `${ev.tamperFlags}`, t: ev.tamperFlags ? 'alert' : 'ok' },
      { l: 'Cross-Agency Routes', v: `${ev.crossAgencyRoutes}`, t: 'ok' },
      { l: 'Pending Verification', v: ev.pendingVerification.toLocaleString(), t: ev.pendingVerification > 1000 ? 'warn' : 'ok' },
      { l: 'Registry', v: ev.tamperFlags ? 'COMPROMISED' : 'INTACT', t: ev.tamperFlags ? 'alert' : 'ok' },
    ];
  } else if (d === 'corrections') {
    const pc = prisonCoordination(id, ts); pTone = pc.occupancyPct >= 110 ? 'alert' : pc.occupancyPct >= 95 ? 'warn' : 'ok';
    kpis = [
      { l: 'Facilities', v: `${pc.facilities}`, t: 'ok' }, { l: 'Population', v: pc.population.toLocaleString(), t: 'ok' },
      { l: 'Capacity', v: pc.capacity.toLocaleString(), t: 'ok' }, { l: 'Occupancy', v: `${pc.occupancyPct}%`, t: pTone },
      { l: 'Transfers Pending', v: `${pc.transfersPending}`, t: pc.transfersPending > 500 ? 'warn' : 'ok' },
      { l: 'Rehabilitation Active', v: pc.rehabilitationActive.toLocaleString(), t: 'ok' },
    ];
  } else {
    const jo = judicialOperations(id, ts); pTone = jo.schedulingConflicts > 30 ? 'warn' : 'ok';
    kpis = [
      { l: 'Judges Assigned', v: `${jo.judgesAssigned}`, t: 'ok' }, { l: 'Courtrooms Active', v: `${jo.courtroomsActive}`, t: 'ok' },
      { l: 'Emergency Injunctions', v: `${jo.emergencyInjunctions}`, t: jo.emergencyInjunctions ? 'warn' : 'ok' },
      { l: 'Warrants Pending', v: jo.warrantsPending.toLocaleString(), t: jo.warrantsPending > 1500 ? 'alert' : 'warn' },
      { l: 'Scheduling Conflicts', v: `${jo.schedulingConflicts}`, t: jo.schedulingConflicts > 30 ? 'alert' : 'warn' },
      { l: 'Operations', v: jo.schedulingConflicts > 30 ? 'STRAINED' : 'NOMINAL', t: jo.schedulingConflicts > 30 ? 'warn' : 'ok' },
    ];
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#06050f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Judiciary · ${label}`} subtitle="Sovereign Judicial Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      {bars.map((b, i) => <BarPanel key={i} title={b.title} meta={b.meta} accent={ACC} live={i === 0} rows={b.rows} />)}
      <MinistryChainSection ministryKey="JUSTICE" id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`jud:${d}`} kind={WF[d] ?? 'judicial'} title={`${label} runtime — execute the judicial workflow`} by="Registrar" role={role} withheld={withheld} />
    </div>
  );
}
