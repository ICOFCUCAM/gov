'use client';

// apps/ministry-energy — federated energy execution application. Grid
// stability emerges into national resilience. Cinematic sovereign command
// rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { energyOps, energyCommand } from '@/lib/gov/energy-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, ActorChainStrip } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#f0a13a';
const WF: Record<string, WorkKind> = { command: 'incident', generation: 'case', grid: 'incident', access: 'case', fuel: 'procurement', citizen: 'permit' };
const LABEL: Record<string, string> = { command: 'Energy Command', generation: 'Generation Network', grid: 'Transmission & Distribution', access: 'Electrification', fuel: 'Fuel & Reserves', citizen: 'Consumer Systems' };
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `en${i}` }));

export function MinistryEnergyApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const o = energyOps(id, ts);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Energy Command';
  const freqDev = Math.abs(o.gridFrequencyHz - 50);

  let kpis: K[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] } | null = null;
  let pTone: Tone = 'ok';

  if (d === 'command') {
    const C = energyCommand(id, ts);
    pTone = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    kpis = [
      { l: 'Posture Index', v: `${C.postureIndex}`, t: pTone }, { l: 'Command Posture', v: C.posture, t: pTone },
      { l: 'Critical Domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
      { l: 'Open Directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
      { l: 'Grid Frequency', v: `${o.gridFrequencyHz}Hz`, t: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
      { l: 'Reserve Margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
    ];
    bars = { title: 'Command domain status', meta: 'ranked · executable', rows: C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value })) };
  } else if (d === 'generation') {
    pTone = o.supplyGw >= o.demandGw ? 'ok' : 'alert';
    kpis = [
      { l: 'Supply', v: `${o.supplyGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' }, { l: 'Demand', v: `${o.demandGw}GW`, t: 'ok' },
      { l: 'Reserve Margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
      { l: 'Load Shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
    bars = { title: 'Generation mix', meta: 'source output', rows: o.generation.map(g => ({ label: g.source, pct: g.outputPct, tone: g.tone, tail: `${g.outputPct}%` })) };
  } else if (d === 'grid') {
    pTone = o.substations.faults > 24 ? 'alert' : o.substations.faults > 10 ? 'warn' : 'ok';
    kpis = [
      { l: 'Grid Frequency', v: `${o.gridFrequencyHz}Hz`, t: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
      { l: 'Substations', v: `${o.substations.online}/${o.substations.total}`, t: pTone },
      { l: 'Outage Min/Day', v: `${o.outageMinutesPerDay}`, t: o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok' },
      { l: 'Load Shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
    bars = { title: 'Grid & substations', meta: 'online · faults', rows: [{ label: 'Substations online', pct: (o.substations.online / o.substations.total) * 100, tone: o.substations.faults > 10 ? 'alert' : o.substations.faults ? 'warn' : 'ok', tail: `${o.substations.online}/${o.substations.total}` }] };
  } else if (d === 'fuel') {
    pTone = o.fuelReserveDays >= 30 ? 'ok' : o.fuelReserveDays >= 14 ? 'warn' : 'alert';
    kpis = [
      { l: 'Fuel Reserve', v: `${o.fuelReserveDays}d`, t: pTone },
      { l: 'Reserve Margin', v: `${o.reserveMarginPct}%`, t: o.reserveMarginPct >= 12 ? 'ok' : 'warn' },
      { l: 'Supply / Demand', v: `${o.supplyGw}/${o.demandGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
    ];
    bars = { title: 'Strategic reserves', meta: 'days cover', rows: [{ label: 'Fuel reserve', pct: Math.min(100, o.fuelReserveDays * 1.6), tone: pTone, tail: `${o.fuelReserveDays}d` }] };
  } else {
    pTone = o.electrificationPct >= 85 ? 'ok' : o.electrificationPct >= 65 ? 'warn' : 'alert';
    kpis = [
      { l: 'Electrification', v: `${o.electrificationPct}%`, t: pTone },
      { l: 'Outage Min/Day', v: `${o.outageMinutesPerDay}`, t: o.outageMinutesPerDay >= 60 ? 'alert' : o.outageMinutesPerDay >= 20 ? 'warn' : 'ok' },
      { l: 'Supply / Demand', v: `${o.supplyGw}/${o.demandGw}GW`, t: o.supplyGw >= o.demandGw ? 'ok' : 'alert' },
      { l: 'Load Shedding', v: o.loadShedding ? 'ACTIVE' : 'NONE', t: o.loadShedding ? 'alert' : 'ok' },
    ];
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#0c0905', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Energy · ${label}`} subtitle="Sovereign Energy Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      {bars ? <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} /> : null}
      <ActorChainStrip ministryKey="ENERGY" idKey={id} now={now} accent={ACC} recordPrefix="GRID" />
      <MinistryChainSection ministryKey="ENERGY" id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the energy workflow`} by="Grid Officer" role={role} withheld={withheld} />
    </div>
  );
}
