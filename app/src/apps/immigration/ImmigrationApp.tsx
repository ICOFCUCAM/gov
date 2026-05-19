'use client';

// apps/immigration — federated immigration execution application.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { immigrationOps } from '@/lib/gov/agency-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, InstitutionChainStrip, actorChain } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#37c7d4';
const WF: Record<string, WorkKind> = { border: 'incident', permits: 'permit', registry: 'case', enforcement: 'incident' };
const LABEL: Record<string, string> = { border: 'Border Control', permits: 'Visas & Permits', registry: 'Resident Registry', enforcement: 'Enforcement' };

export function ImmigrationApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = immigrationOps(appId, ts);
  const d = WF[domain] ? domain : 'border';
  const label = LABEL[d] ?? 'Border Control';
  const raw: { l: string; v: string; t?: Tone }[] = d === 'permits' ? [
    { l: 'Visa Backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : o.visaBacklog > 2500 ? 'warn' : 'ok' },
    { l: 'Visa SLA Met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Crossings Today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
  ] : d === 'registry' ? [
    { l: 'Residents Registered', v: `${o.residentsRegisteredM}M`, t: 'ok' },
    { l: 'Visa SLA Met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Visa Backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'ok' },
  ] : d === 'enforcement' ? [
    { l: 'Flagged Entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : o.flaggedEntries > 40 ? 'warn' : 'ok' },
    { l: 'Borders Open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
    { l: 'Crossings Today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
  ] : [
    { l: 'Borders Open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
    { l: 'Crossings Today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
    { l: 'Visa Backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'warn' },
    { l: 'Visa SLA Met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Residents', v: `${o.residentsRegisteredM}M`, t: 'ok' },
    { l: 'Flagged Entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : 'warn' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `im${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Immigration · ${label}`} subtitle="Sovereign Border Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <BarPanel title="Border posture" meta="entry control · enforcement" accent={ACC} live rows={[
        { label: 'Border availability', pct: (o.bordersOpen / o.bordersTotal) * 100, tone: (o.bordersOpen < o.bordersTotal ? 'warn' : 'ok') as Tone, tail: `${o.bordersOpen}/${o.bordersTotal}` },
        { label: 'Visa SLA', pct: o.visaSlaMetPct, tone: (o.visaSlaMetPct >= 80 ? 'ok' : 'warn') as Tone, tail: `${o.visaSlaMetPct}%` },
        { label: 'Flagged-entry pressure', pct: Math.min(100, o.flaggedEntries / 1.6), tone: (o.flaggedEntries > 90 ? 'alert' : 'warn') as Tone, tail: `${o.flaggedEntries}` },
      ]} />
      {(() => { const ch = actorChain('INTERIOR', appId, now, 'CASE'); return (
        <InstitutionChainStrip accent={ACC} ministryKey="INTERIOR" facility={ch.facility}
          actorName={ch.actorName} lineage={ch.lineage} integrity={ch.integrity} />
      ); })()}
      <MinistryChainSection ministryKey="INTERIOR" id={appId} now={now} accent={ACC} />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the border workflow`} by="Border Officer" role={role} withheld={withheld} />
    </div>
  );
}
