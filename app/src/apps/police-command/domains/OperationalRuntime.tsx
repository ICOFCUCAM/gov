'use client';

// Police domain — Operational Runtime. The live incident execution engine:
// command KPIs, AI command advisory, and the runtime workflow the Watch
// Commander drives (stage → assigned → en-route → on-scene → cleared).

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { KpiStrip, AdvisoryPanel } from '@/apps/_shared/Ops';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function OperationalRuntime({ id, now, accent, role, withheld }: {
  id: string; now: number; accent: string; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const respT: Tone = o.meanResponseMin >= 18 ? 'alert' : o.meanResponseMin >= 12 ? 'warn' : 'ok';
  const loadT: Tone = o.activeIncidents > 90 ? 'alert' : o.activeIncidents > 40 ? 'warn' : 'ok';
  const kpis = [
    { l: 'Active Incidents', v: `${o.activeIncidents}`, t: loadT },
    { l: 'Units Deployed', v: `${o.unitsDeployed}/${o.unitsTotal}`, t: 'ok' as Tone },
    { l: 'Mean Response', v: `${o.meanResponseMin}m`, t: respT },
    { l: 'Clearance Rate', v: `${o.clearanceRatePct}%`, t: o.clearanceRatePct >= 70 ? 'ok' : 'warn' as Tone },
    { l: 'Custody Occupancy', v: `${o.custodyOccupancyPct}%`, t: o.custodyOccupancyPct >= 110 ? 'alert' : o.custodyOccupancyPct >= 95 ? 'warn' : 'ok' as Tone },
  ].map((m, i) => ({ ...m, t: m.t as Tone, s: '', k: `or${i}` }));

  const severity = loadT === 'alert' ? 'critical' : respT !== 'ok' ? 'advisory' : 'nominal';
  const recommended = [
    loadT === 'alert'
      ? `Surge posture — ${o.activeIncidents} active incidents exceed steady-state; escalate to national coordination.`
      : `Incident volume within steady-state (${o.activeIncidents}); maintain rolling deployment.`,
    respT !== 'ok'
      ? `Mean response ${o.meanResponseMin}m above target — rebalance idle divisions toward demand regions.`
      : `Response time nominal (${o.meanResponseMin}m).`,
    o.custodyOccupancyPct >= 110
      ? `Custody at ${o.custodyOccupancyPct}% — initiate Justice corrections handoff to relieve pressure.`
      : `Custody capacity within tolerance (${o.custodyOccupancyPct}%).`,
  ];

  return (
    <div className="space-y-2">
      <KpiStrip ts={ts} accent={accent} items={kpis} />
      <AdvisoryPanel accent={accent} severity={severity} headline="Operational runtime command intelligence" recommended={recommended} />
      <RuntimeQueue
        scope={`${id}:operational-runtime`}
        kind="incident"
        title="Incident runtime — stage → assigned → en-route → on-scene → cleared"
        by="Watch Commander"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
