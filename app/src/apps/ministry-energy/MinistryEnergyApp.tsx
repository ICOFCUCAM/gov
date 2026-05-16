'use client';

// apps/ministry-energy — federated energy execution application.
// Grid stability emerges into national resilience & infrastructure state.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { energyOps } from '@/lib/gov/energy-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', generation: 'case', grid: 'case', access: 'permit', fuel: 'procurement', citizen: 'approval' };
const LABEL: Record<string, string> = { command: 'Energy Command', generation: 'Generation Network', grid: 'Transmission & Distribution', access: 'Electrification', fuel: 'Fuel & Reserves', citizen: 'Consumer Systems' };

export function MinistryEnergyApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = energyOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Energy Command';
  return (
    <div className="space-y-2">
      <StatGrid items={[
        { l: 'Grid frequency', v: `${o.gridFrequencyHz}Hz`, t: Math.abs(o.gridFrequencyHz - 50) <= 0.2 ? 'ok' : Math.abs(o.gridFrequencyHz - 50) <= 0.4 ? 'warn' : 'alert' },
        { l: 'Reserve margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
        { l: 'Demand / supply', v: `${o.demandGw}/${o.supplyGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
        { l: 'Electrification', v: `${o.electrificationPct}%`, t: o.electrificationPct >= 85 ? 'ok' : 'warn' },
        { l: 'Outage min/day', v: `${o.outageMinutesPerDay}`, t: o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok' },
        { l: 'Load shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
      ]} />
      <Panel title="Generation mix" meta="source output">
        <Bars rows={o.generation.map(g => ({ label: g.source, pct: g.outputPct, tone: g.tone, tail: `${g.outputPct}%` }))} />
      </Panel>
      <Panel title="Grid & reserves" meta="substations · fuel">
        <Bars rows={[
          { label: 'Substations online', pct: (o.substations.online / o.substations.total) * 100, tone: o.substations.faults > 10 ? 'alert' : o.substations.faults ? 'warn' : 'ok', tail: `${o.substations.online}/${o.substations.total}` },
          { label: 'Fuel reserve', pct: Math.min(100, o.fuelReserveDays * 1.6), tone: o.fuelReserveDays >= 30 ? 'ok' : o.fuelReserveDays >= 14 ? 'warn' : 'alert', tail: `${o.fuelReserveDays}d` },
        ]} />
      </Panel>
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the energy workflow`} by="Grid Officer" role={role} withheld={withheld} />
    </div>
  );
}
