'use client';

// apps/ministry-energy — federated energy execution application.
// Grid stability emerges into national resilience & infrastructure state.
// Each nav domain renders its OWN focused subsystem surface.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { energyOps, energyCommand } from '@/lib/gov/energy-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', generation: 'case', grid: 'incident', access: 'case', fuel: 'procurement', citizen: 'permit' };
const LABEL: Record<string, string> = { command: 'Energy Command', generation: 'Generation Network', grid: 'Transmission & Distribution', access: 'Electrification', fuel: 'Fuel & Reserves', citizen: 'Consumer Systems' };
type Tone = 'ok' | 'warn' | 'alert';

export function MinistryEnergyApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = energyOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Energy Command';
  const freqDev = Math.abs(o.gridFrequencyHz - 50);

  let items: { l: string; v: string; t?: Tone }[];
  let panel: React.ReactNode = null;

  if (d === 'command') {
    const C = energyCommand(id, ts);
    const pt: Tone = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    items = [
      { l: 'Posture index', v: `${C.postureIndex}`, t: pt },
      { l: 'Command posture', v: C.posture, t: pt },
      { l: 'Critical domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
      { l: 'Open directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
      { l: 'Grid frequency', v: `${o.gridFrequencyHz}Hz`, t: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
      { l: 'Reserve margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
    ];
    panel = (
      <Panel title="Command directives" meta="ranked · executable">
        <Bars rows={C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value }))} />
      </Panel>
    );
  } else if (d === 'generation') {
    items = [
      { l: 'Supply', v: `${o.supplyGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
      { l: 'Demand', v: `${o.demandGw}GW`, t: 'ok' },
      { l: 'Reserve margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
      { l: 'Load shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
    panel = <Panel title="Generation mix" meta="source output"><Bars rows={o.generation.map(g => ({ label: g.source, pct: g.outputPct, tone: g.tone, tail: `${g.outputPct}%` }))} /></Panel>;
  } else if (d === 'grid') {
    items = [
      { l: 'Grid frequency', v: `${o.gridFrequencyHz}Hz`, t: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
      { l: 'Substations', v: `${o.substations.online}/${o.substations.total}`, t: o.substations.faults > 24 ? 'alert' : o.substations.faults > 10 ? 'warn' : 'ok' },
      { l: 'Outage min/day', v: `${o.outageMinutesPerDay}`, t: o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok' },
      { l: 'Load shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
    panel = <Panel title="Grid & substations" meta="online · faults"><Bars rows={[{ label: 'Substations online', pct: (o.substations.online / o.substations.total) * 100, tone: o.substations.faults > 10 ? 'alert' : o.substations.faults ? 'warn' : 'ok', tail: `${o.substations.online}/${o.substations.total}` }]} /></Panel>;
  } else if (d === 'fuel') {
    items = [
      { l: 'Fuel reserve', v: `${o.fuelReserveDays}d`, t: o.fuelReserveDays >= 30 ? 'ok' : o.fuelReserveDays >= 14 ? 'warn' : 'alert' },
      { l: 'Reserve margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : 'warn' },
      { l: 'Supply / demand', v: `${o.supplyGw}/${o.demandGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
    ];
    panel = <Panel title="Strategic reserves" meta="days cover"><Bars rows={[{ label: 'Fuel reserve', pct: Math.min(100, o.fuelReserveDays * 1.6), tone: o.fuelReserveDays >= 30 ? 'ok' : o.fuelReserveDays >= 14 ? 'warn' : 'alert', tail: `${o.fuelReserveDays}d` }]} /></Panel>;
  } else { // access / citizen
    items = [
      { l: 'Electrification', v: `${o.electrificationPct}%`, t: o.electrificationPct >= 85 ? 'ok' : o.electrificationPct >= 65 ? 'warn' : 'alert' },
      { l: 'Outage min/day', v: `${o.outageMinutesPerDay}`, t: o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok' },
      { l: 'Supply / demand', v: `${o.supplyGw}/${o.demandGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
      { l: 'Load shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[3px] border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label} subsystem
      </div>
      <StatGrid items={items} />
      {panel}
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the energy workflow`} by="Grid Officer" role={role} withheld={withheld} />
    </div>
  );
}
