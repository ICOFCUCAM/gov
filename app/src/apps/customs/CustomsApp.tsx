'use client';

// apps/customs — federated customs execution application.
// Trade-corridor throughput & revenue emerge into national fiscal state.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { customsOps } from '@/lib/gov/agency-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { clearance: 'permit', tariffs: 'procurement', inspection: 'case', revenue: 'procurement' };
const LABEL: Record<string, string> = { clearance: 'Clearance', tariffs: 'Tariffs & Duties', inspection: 'Inspection', revenue: 'Revenue' };

export function CustomsApp({ appId, domain, now, role, withheld }: {
  appId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const o = customsOps(appId, ts);
  const d = WF[domain] ? domain : 'clearance';
  const label = LABEL[d] ?? 'Clearance';
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Declarations today', v: o.declarationsToday.toLocaleString(), t: 'ok' },
        { l: 'Clearance median', v: `${o.clearanceMedianHrs}h`, t: o.clearanceMedianHrs >= 36 ? 'alert' : o.clearanceMedianHrs >= 18 ? 'warn' : 'ok' },
        { l: 'Revenue index', v: `${o.revenueIdx}`, t: o.revenueIdx >= 70 ? 'ok' : 'warn' },
        { l: 'Inspection rate', v: `${o.inspectionRatePct}%`, t: 'ok' },
        { l: 'Seizures', v: `${o.seizures}`, t: o.seizures > 20 ? 'alert' : 'warn' },
        { l: 'Corridors open', v: `${o.corridorsOpen}/${o.corridorsTotal}`, t: o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok' },
      ]} />
      <Panel title="Trade-corridor throughput" meta="clearance · revenue · interdiction">
        <Bars rows={[
          { label: 'Corridor availability', pct: (o.corridorsOpen / o.corridorsTotal) * 100, tone: o.corridorsOpen < o.corridorsTotal ? 'warn' : 'ok', tail: `${o.corridorsOpen}/${o.corridorsTotal}` },
          { label: 'Revenue index', pct: o.revenueIdx, tone: o.revenueIdx >= 70 ? 'ok' : 'warn', tail: `${o.revenueIdx}` },
          { label: 'Clearance speed', pct: Math.max(0, 100 - o.clearanceMedianHrs * 1.5), tone: o.clearanceMedianHrs >= 36 ? 'alert' : 'warn', tail: `${o.clearanceMedianHrs}h` },
        ]} />
      </Panel>
      <RuntimeQueue scope={`${appId}:${d}`} kind={WF[d] ?? 'permit'} title={`${label} runtime — execute the customs workflow`} by="Customs Officer" role={role} withheld={withheld} />
    </div>
  );
}
