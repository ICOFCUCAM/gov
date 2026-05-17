'use client';

// apps/customs — federated customs execution application. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { customsOps } from '@/lib/gov/agency-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#54d08f';
const WF: Record<string, WorkKind> = { clearance: 'permit', tariffs: 'procurement', inspection: 'case', revenue: 'procurement' };
const LABEL: Record<string, string> = { clearance: 'Clearance', tariffs: 'Tariffs & Duties', inspection: 'Inspection', revenue: 'Revenue' };

export function CustomsApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = customsOps(appId, ts);
  const d = WF[domain] ? domain : 'clearance';
  const label = LABEL[d] ?? 'Clearance';
  const raw: { l: string; v: string; t?: Tone }[] = d === 'tariffs' || d === 'revenue' ? [
    { l: 'Revenue Index', v: `${o.revenueIdx}`, t: o.revenueIdx >= 70 ? 'ok' : o.revenueIdx >= 55 ? 'warn' : 'alert' },
    { l: 'Declarations Today', v: o.declarationsToday.toLocaleString(), t: 'ok' },
    { l: 'Corridors Open', v: `${o.corridorsOpen}/${o.corridorsTotal}`, t: o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok' },
  ] : d === 'inspection' ? [
    { l: 'Inspection Rate', v: `${o.inspectionRatePct}%`, t: 'ok' },
    { l: 'Seizures', v: `${o.seizures}`, t: o.seizures > 20 ? 'alert' : o.seizures > 8 ? 'warn' : 'ok' },
    { l: 'Declarations Today', v: o.declarationsToday.toLocaleString(), t: 'ok' },
  ] : [
    { l: 'Declarations Today', v: o.declarationsToday.toLocaleString(), t: 'ok' },
    { l: 'Clearance Median', v: `${o.clearanceMedianHrs}h`, t: o.clearanceMedianHrs >= 36 ? 'alert' : o.clearanceMedianHrs >= 18 ? 'warn' : 'ok' },
    { l: 'Revenue Index', v: `${o.revenueIdx}`, t: o.revenueIdx >= 70 ? 'ok' : 'warn' },
    { l: 'Inspection Rate', v: `${o.inspectionRatePct}%`, t: 'ok' },
    { l: 'Seizures', v: `${o.seizures}`, t: o.seizures > 20 ? 'alert' : 'warn' },
    { l: 'Corridors Open', v: `${o.corridorsOpen}/${o.corridorsTotal}`, t: o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok' },
  ];
  const kpis = raw.map((m, i) => ({ l: m.l, v: m.v, t: (m.t ?? 'ok') as Tone, s: '', k: `cu${i}` }));
  const pTone: Tone = kpis.some(x => x.t === 'alert') ? 'alert' : kpis.some(x => x.t === 'warn') ? 'warn' : 'ok';

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Customs · ${label}`} subtitle="Sovereign Customs Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={kpis} />
      <BarPanel title="Trade-corridor throughput" meta="clearance · revenue · interdiction" accent={ACC} live rows={[
        { label: 'Corridor availability', pct: (o.corridorsOpen / o.corridorsTotal) * 100, tone: (o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok') as Tone, tail: `${o.corridorsOpen}/${o.corridorsTotal}` },
        { label: 'Revenue index', pct: o.revenueIdx, tone: (o.revenueIdx >= 70 ? 'ok' : 'warn') as Tone, tail: `${o.revenueIdx}` },
        { label: 'Clearance speed', pct: Math.max(0, 100 - o.clearanceMedianHrs * 1.5), tone: (o.clearanceMedianHrs >= 36 ? 'alert' : 'warn') as Tone, tail: `${o.clearanceMedianHrs}h` },
      ]} />
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'permit'} title={`${label} runtime — execute the customs workflow`} by="Customs Officer" role={role} withheld={withheld} />
    </div>
  );
}
