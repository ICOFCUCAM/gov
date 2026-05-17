'use client';

// apps/immigration — federated immigration execution application.
// Border posture & residency emerge into national civil-stability.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { immigrationOps } from '@/lib/gov/agency-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { border: 'incident', permits: 'permit', registry: 'case', enforcement: 'incident' };
const LABEL: Record<string, string> = { border: 'Border Control', permits: 'Visas & Permits', registry: 'Resident Registry', enforcement: 'Enforcement' };

export function ImmigrationApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = immigrationOps(appId, ts);
  const d = WF[domain] ? domain : 'border';
  const label = LABEL[d] ?? 'Border Control';
  type Tone = 'ok' | 'warn' | 'alert';
  const items: { l: string; v: string; t?: Tone }[] = d === 'permits' ? [
    { l: 'Visa backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : o.visaBacklog > 2500 ? 'warn' : 'ok' },
    { l: 'Visa SLA met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Crossings today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
  ] : d === 'registry' ? [
    { l: 'Residents registered', v: `${o.residentsRegisteredM}M`, t: 'ok' },
    { l: 'Visa SLA met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Visa backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'ok' },
  ] : d === 'enforcement' ? [
    { l: 'Flagged entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : o.flaggedEntries > 40 ? 'warn' : 'ok' },
    { l: 'Borders open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
    { l: 'Crossings today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
  ] : [
    { l: 'Borders open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
    { l: 'Crossings today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
    { l: 'Visa backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'warn' },
    { l: 'Visa SLA met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
    { l: 'Residents', v: `${o.residentsRegisteredM}M`, t: 'ok' },
    { l: 'Flagged entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : 'warn' },
  ];
  return (
    <div className="space-y-2">
      <div className="rounded-[3px] border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label} subsystem
      </div>
      <StatGrid items={items} />
      <Panel title="Border posture" meta="entry control · enforcement">
        <Bars rows={[
          { label: 'Border availability', pct: (o.bordersOpen / o.bordersTotal) * 100, tone: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok', tail: `${o.bordersOpen}/${o.bordersTotal}` },
          { label: 'Visa SLA', pct: o.visaSlaMetPct, tone: o.visaSlaMetPct >= 80 ? 'ok' : 'warn', tail: `${o.visaSlaMetPct}%` },
          { label: 'Flagged-entry pressure', pct: Math.min(100, o.flaggedEntries / 1.6), tone: o.flaggedEntries > 90 ? 'alert' : 'warn', tail: `${o.flaggedEntries}` },
        ]} />
      </Panel>
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the border workflow`} by="Border Officer" role={role} withheld={withheld} />
    </div>
  );
}
