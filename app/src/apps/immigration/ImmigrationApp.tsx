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
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Borders open', v: `${o.bordersOpen}/${o.bordersTotal}`, t: o.bordersOpen < o.bordersTotal ? 'warn' : 'ok' },
        { l: 'Crossings today', v: o.crossingsToday.toLocaleString(), t: 'ok' },
        { l: 'Visa backlog', v: o.visaBacklog.toLocaleString(), t: o.visaBacklog > 5000 ? 'alert' : 'warn' },
        { l: 'Visa SLA met', v: `${o.visaSlaMetPct}%`, t: o.visaSlaMetPct >= 80 ? 'ok' : 'warn' },
        { l: 'Residents', v: `${o.residentsRegisteredM}M`, t: 'ok' },
        { l: 'Flagged entries', v: `${o.flaggedEntries}`, t: o.flaggedEntries > 90 ? 'alert' : 'warn' },
      ]} />
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
