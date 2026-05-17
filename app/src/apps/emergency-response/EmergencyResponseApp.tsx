'use client';

// apps/emergency-response — federated crisis-response execution app.
// Crisis severity & resource cover emerge into national emergency posture.

import * as React from 'react';
import { StatGrid, Bars, Panel, FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { emergencyOps } from '@/lib/gov/agency-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', dispatch: 'incident', resources: 'procurement', recovery: 'incident' };
const LABEL: Record<string, string> = { command: 'Crisis Command', dispatch: 'Dispatch', resources: 'Resource Coordination', recovery: 'Recovery Workflows' };

export function EmergencyResponseApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = emergencyOps(appId, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Crisis Command';
  type Tone = 'ok' | 'warn' | 'alert';
  const sevT: Tone = o.severity === 'national' || o.severity === 'major' ? 'alert' : o.severity === 'elevated' ? 'warn' : 'ok';
  const fieldDomain = d === 'command' || d === 'dispatch';
  const items: { l: string; v: string; t?: Tone }[] = d === 'resources' ? [
    { l: 'Resource cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : o.resourceCoverPct >= 50 ? 'warn' : 'alert' },
    { l: 'Shelters open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Responders available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
  ] : d === 'recovery' ? [
    { l: 'Population assisted', v: o.populationAssisted.toLocaleString(), t: 'ok' },
    { l: 'Shelters open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Resource cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : 'warn' },
    { l: 'Active crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : 'ok' },
  ] : d === 'dispatch' ? [
    { l: 'Responders available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
    { l: 'Mean mobilise', v: `${o.meanMobiliseMin}m`, t: o.meanMobiliseMin >= 25 ? 'alert' : o.meanMobiliseMin >= 14 ? 'warn' : 'ok' },
    { l: 'Active crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : o.activeCrises ? 'warn' : 'ok' },
    { l: 'Severity', v: o.severity, t: sevT },
  ] : [
    { l: 'Active crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : o.activeCrises ? 'warn' : 'ok' },
    { l: 'Severity', v: o.severity, t: sevT },
    { l: 'Responders available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
    { l: 'Mean mobilise', v: `${o.meanMobiliseMin}m`, t: o.meanMobiliseMin >= 25 ? 'alert' : 'warn' },
    { l: 'Shelters open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Resource cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : 'warn' },
  ];
  return (
    <div className="space-y-2">
      <div className="rounded-[3px] border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label} subsystem
      </div>
      <StatGrid items={items} />
      <Panel title="Regional crisis posture" meta="population assisted · shelters">
        <Bars rows={o.regional.map(r => ({ label: r.region, pct: r.status === 'crisis' ? 92 : r.status === 'watch' ? 58 : 26, tone: r.tone, tail: r.status }))} />
      </Panel>
      {fieldDomain ? (
        <>
          <FieldPanel instId={appId} archetype="INTERIOR" now={now} />
          <RuntimeQueue scope={`${appId}:field`} kind="field" title="Responder field deployment — stage → task → on-scene → cleared" by="Field Coordinator" role={role} withheld={withheld} />
        </>
      ) : null}
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the response workflow`} by="Crisis Coordinator" role={role} withheld={withheld} />
    </div>
  );
}
