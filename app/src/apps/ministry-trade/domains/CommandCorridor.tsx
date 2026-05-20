'use client';

// Trade domains — Command, Corridor & Strategic surfaces.

import * as React from 'react';
import { industrialContinuityBoard } from '@/lib/gov/industrial-continuity';
import { CorridorFrame, CorridorKpi, CorridorRule, TradeBar, CorridorCallout, TRADE_DS } from '@/apps/ministry-trade/design-system/trade-ds';

export function IndustrialPosture({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="command" code="CM-PST-02" title="Industrial Posture"
      subtitle="output continuity & resilience"
      posture={board.command.posture}>
      <CorridorKpi items={[
        { label: 'Output continuity', value: `${board.command.outputContinuityIdx}/100`, tone: 'ok' },
        { label: 'Manufacturing capacity', value: `${board.command.manufacturingCapacityPct}%`, tone: 'info' },
        { label: 'Network utilisation', value: `${board.command.factoryNetworkUtilisationPct}%`, tone: 'warn' },
        { label: 'Resilience posture', value: `${board.command.resiliencePostureIdx}/100`, tone: 'ok' },
      ]} />
      <CorridorCallout kicker="continuity doctrine" body="Strategic prioritisation routes critical output to sovereign needs first. Concealment of supply-chain vulnerability is constitutionally void." />
    </CorridorFrame>
  );
}

export function FactoryClusters({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="command" code="CM-CLU-03" title="Factory Clusters"
      subtitle="per-cluster utilisation & status">
      <CorridorKpi items={[
        { label: 'Clusters', value: board.command.clusters.length },
        { label: 'Halted', value: board.command.clusters.filter(c => c.status === 'halted').length, tone: 'alert' },
        { label: 'Derated', value: board.command.clusters.filter(c => c.status === 'derated').length, tone: 'warn' },
        { label: 'Priority', value: board.command.clusters.filter(c => c.status === 'priority').length, tone: 'info' },
      ]} />
      <CorridorRule label="cluster register" />
      {board.command.clusters.map(c => (
        <div key={c.id} className="grid grid-cols-[200px_140px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{c.cluster}</span>
          <span style={{ color: TRADE_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{c.utilisationPct}%</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>{c.shiftsRunning} shifts</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.status === 'halted' ? TRADE_DS.coral : c.status === 'derated' ? TRADE_DS.orange : c.status === 'priority' ? TRADE_DS.steel : TRADE_DS.lime }}>● {c.status}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function CorridorBoard({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="corridor" code="CR-COR-05" title="Corridor Board"
      subtitle="per-corridor throughput & clearance">
      <CorridorKpi items={[
        { label: 'Corridors', value: board.corridors.length },
        { label: 'Closed', value: board.corridors.filter(c => c.status === 'closed').length, tone: 'alert' },
        { label: 'Congested / restricted', value: board.corridors.filter(c => c.status === 'congested' || c.status === 'restricted').length, tone: 'warn' },
        { label: 'Open', value: board.corridors.filter(c => c.status === 'open').length, tone: 'ok' },
      ]} />
      <CorridorRule label="corridor register" />
      {board.corridors.map(c => (
        <div key={c.id} className="grid grid-cols-[200px_140px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{c.corridor}</span>
          <span style={{ color: TRADE_DS.mut }}>{c.partner} · {c.mode}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{c.throughputIdx}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>{c.clearanceDays}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.status === 'closed' ? TRADE_DS.coral : c.status === 'congested' || c.status === 'restricted' ? TRADE_DS.orange : TRADE_DS.lime }}>● {c.status}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function TariffPressure({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="corridor" code="CR-TAR-06" title="Tariff Pressure"
      subtitle="per-corridor tariff & clearance pressure">
      <CorridorKpi items={[
        { label: 'Corridors monitored', value: board.corridors.length },
        { label: 'High tariff (>15%)', value: board.corridors.filter(c => c.tariffPressurePct > 15).length, tone: 'warn' },
        { label: 'Long clearance (>10d)', value: board.corridors.filter(c => c.clearanceDays > 10).length, tone: 'warn' },
        { label: 'Mean tariff', value: `${Math.round(board.corridors.reduce((s, c) => s + c.tariffPressurePct, 0) / Math.max(1, board.corridors.length))}%`, tone: 'info' },
      ]} />
      <CorridorRule label="tariff load" />
      {board.corridors.map(c => (
        <TradeBar key={c.id}
          label={c.corridor}
          pct={c.tariffPressurePct}
          tone={c.tariffPressurePct > 25 ? 'alert' : c.tariffPressurePct > 12 ? 'warn' : 'ok'}
          tail={`${c.clearanceDays}d clearance`} />
      ))}
    </CorridorFrame>
  );
}

export function StrategicIndustries({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="strategic" code="ST-IND-07" title="Strategic Industries"
      subtitle="sovereign / critical / standard">
      <CorridorKpi items={[
        { label: 'Industries', value: board.strategicIndustries.length },
        { label: 'Sovereign-priority', value: board.strategicIndustries.filter(s => s.allocationPriority === 'sovereign').length, tone: 'info' },
        { label: 'Critical risk', value: board.strategicIndustries.filter(s => s.riskClass === 'critical').length, tone: 'alert' },
        { label: 'Rerouting', value: board.strategicIndustries.filter(s => s.rerouteActive).length, tone: 'warn' },
      ]} />
      <CorridorRule label="industry register" />
      {board.strategicIndustries.map(s => (
        <TradeBar key={s.id}
          label={s.industry}
          pct={s.domesticOutputPct}
          tone={s.riskClass === 'rationed' || s.riskClass === 'critical' ? 'alert' : s.riskClass === 'pressured' ? 'warn' : 'ok'}
          tail={`${s.reserveDays}d reserve · ${s.allocationPriority}`} />
      ))}
    </CorridorFrame>
  );
}

export function StrategicReserves({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="strategic" code="ST-RES-08" title="Strategic Reserves"
      subtitle="days of cover by strategic industry">
      <CorridorKpi items={[
        { label: 'Industries reserved', value: board.strategicIndustries.length },
        { label: 'Below 14d cover', value: board.strategicIndustries.filter(s => s.reserveDays < 14).length, tone: 'alert' },
        { label: 'Above 30d cover', value: board.strategicIndustries.filter(s => s.reserveDays > 30).length, tone: 'ok' },
        { label: 'Median cover', value: `${board.strategicIndustries[Math.floor(board.strategicIndustries.length / 2)]?.reserveDays ?? 0} d`, tone: 'info' },
      ]} />
      <CorridorRule label="reserve cover" />
      {board.strategicIndustries.map(s => (
        <TradeBar key={s.id}
          label={s.industry}
          pct={Math.min(100, s.reserveDays * 2)}
          tone={s.reserveDays > 30 ? 'ok' : s.reserveDays > 14 ? 'warn' : 'alert'}
          tail={`${s.reserveDays} d`} />
      ))}
      <CorridorCallout kicker="strategic doctrine" body="Strategic reserves protect civilian-priority production. Extraction without Cabinet authorisation is constitutionally void." />
    </CorridorFrame>
  );
}

export function PriorityAllocation({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="strategic" code="ST-PRA-09" title="Priority Allocation"
      subtitle="sovereign / critical / standard allocation classes">
      <CorridorKpi items={[
        { label: 'Sovereign', value: board.strategicIndustries.filter(s => s.allocationPriority === 'sovereign').length, tone: 'info' },
        { label: 'Critical', value: board.strategicIndustries.filter(s => s.allocationPriority === 'critical').length, tone: 'warn' },
        { label: 'Standard', value: board.strategicIndustries.filter(s => s.allocationPriority === 'standard').length, tone: 'mute' },
        { label: 'Rerouting active', value: board.strategicIndustries.filter(s => s.rerouteActive).length, tone: 'warn' },
      ]} />
      <CorridorRule label="allocation breakdown" />
      {['sovereign', 'critical', 'standard'].map(p => {
        const industries = board.strategicIndustries.filter(s => s.allocationPriority === p);
        return (
          <div key={p} className="grid grid-cols-[140px_1fr_60px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: TRADE_DS.brass }}>{p}</span>
            <span style={{ color: TRADE_DS.mut }}>{industries.map(i => i.industry).join(' · ')}</span>
            <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{industries.length}</span>
          </div>
        );
      })}
    </CorridorFrame>
  );
}
