'use client';

// apps/emergency-response — federated crisis-response execution app.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { FieldPanel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { emergencyOps } from '@/lib/gov/agency-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, InstitutionChainStrip, actorChain } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#ff5d5d';
const WF: Record<string, WorkKind> = { command: 'incident', dispatch: 'incident', resources: 'procurement', recovery: 'incident' };
const LABEL: Record<string, string> = { command: 'Crisis Command', dispatch: 'Dispatch', resources: 'Resource Coordination', recovery: 'Recovery Workflows' };

export function EmergencyResponseApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = emergencyOps(appId, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Crisis Command';
  const sevT: Tone = o.severity === 'national' || o.severity === 'major' ? 'alert' : o.severity === 'elevated' ? 'warn' : 'ok';
  const fieldDomain = d === 'command' || d === 'dispatch';
  const raw: { l: string; v: string; t?: Tone }[] = d === 'resources' ? [
    { l: 'Resource Cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : o.resourceCoverPct >= 50 ? 'warn' : 'alert' },
    { l: 'Shelters Open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Responders Available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
  ] : d === 'recovery' ? [
    { l: 'Population Assisted', v: o.populationAssisted.toLocaleString(), t: 'ok' },
    { l: 'Shelters Open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Resource Cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : 'warn' },
    { l: 'Active Crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : 'ok' },
  ] : d === 'dispatch' ? [
    { l: 'Responders Available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
    { l: 'Mean Mobilise', v: `${o.meanMobiliseMin}m`, t: o.meanMobiliseMin >= 25 ? 'alert' : o.meanMobiliseMin >= 14 ? 'warn' : 'ok' },
    { l: 'Active Crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : o.activeCrises ? 'warn' : 'ok' },
    { l: 'Severity', v: o.severity, t: sevT },
  ] : [
    { l: 'Active Crises', v: `${o.activeCrises}`, t: o.activeCrises >= 4 ? 'alert' : o.activeCrises ? 'warn' : 'ok' },
    { l: 'Severity', v: o.severity, t: sevT },
    { l: 'Responders Available', v: `${o.respondersAvailable}/${o.responders}`, t: 'ok' },
    { l: 'Mean Mobilise', v: `${o.meanMobiliseMin}m`, t: o.meanMobiliseMin >= 25 ? 'alert' : 'warn' },
    { l: 'Shelters Open', v: `${o.sheltersOpen}`, t: o.sheltersOpen ? 'warn' : 'ok' },
    { l: 'Resource Cover', v: `${o.resourceCoverPct}%`, t: o.resourceCoverPct >= 70 ? 'ok' : 'warn' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `er${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#0c0406', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Emergency · ${label}`} subtitle="Sovereign Crisis Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ELEVATED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <BarPanel title="Regional crisis posture" meta="population assisted · shelters" accent={ACC} live
        rows={o.regional.map(r => ({ label: r.region, pct: r.status === 'crisis' ? 92 : r.status === 'watch' ? 58 : 26, tone: r.tone, tail: r.status }))} />
      {fieldDomain ? (
        <>
          <FieldPanel instId={appId} archetype="INTERIOR" now={now} />
          {(() => { const ch = actorChain('INTERIOR', appId, now, 'INC'); return (
            <InstitutionChainStrip accent={ACC} ministryKey="INTERIOR" facility={ch.facility}
              actorName={ch.actorName} lineage={ch.lineage} integrity={ch.integrity} />
          ); })()}
          <MinistryChainSection ministryKey="INTERIOR" id={appId} now={now} accent={ACC} />
          <RuntimeQueue scope={`${appId}:field`} kind="field" title="Responder field deployment — stage → task → on-scene → cleared" by="Field Coordinator" role={role} withheld={withheld} />
        </>
      ) : null}
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'incident'} title={`${label} runtime — execute the response workflow`} by="Crisis Coordinator" role={role} withheld={withheld} />
    </div>
  );
}
