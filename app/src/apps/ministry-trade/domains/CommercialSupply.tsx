'use client';

// Trade domains — Commercial, Supply, Foreign & Crisis surfaces.

import * as React from 'react';
import { industrialContinuityBoard } from '@/lib/gov/industrial-continuity';
import { tradeOps } from '@/lib/gov/trade-systems';
import { CorridorFrame, CorridorKpi, CorridorRule, TradeBar, CorridorCallout, TRADE_DS } from '@/apps/ministry-trade/design-system/trade-ds';

export function IndustrialDistricts({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="commercial" code="CM-DST-11" title="Industrial Districts"
      subtitle="per-district continuity">
      <CorridorKpi items={[
        { label: 'Districts', value: board.districts.length },
        { label: 'Distressed', value: board.districts.filter(d => d.pressureClass === 'distressed').length, tone: 'alert' },
        { label: 'Pressured', value: board.districts.filter(d => d.pressureClass === 'pressured').length, tone: 'warn' },
        { label: 'Total enterprises (k)', value: board.districts.reduce((s, d) => s + d.enterprisesActiveK, 0).toFixed(1), tone: 'info' },
      ]} />
      <CorridorRule label="district register" />
      {board.districts.map(d => (
        <TradeBar key={d.id}
          label={`${d.district} · ${d.region}`}
          pct={d.smeContinuityIdx}
          tone={d.pressureClass === 'distressed' ? 'alert' : d.pressureClass === 'pressured' ? 'warn' : d.pressureClass === 'monitor' ? 'info' : 'ok'}
          tail={`${d.enterprisesActiveK.toFixed(1)}k SMEs`} />
      ))}
    </CorridorFrame>
  );
}

export function SmeContinuity({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  const o = tradeOps(id, now / 4000);
  return (
    <CorridorFrame archetype="commercial" code="CM-SME-12" title="SME Continuity"
      subtitle="small / medium enterprise index">
      <CorridorKpi items={[
        { label: 'Active businesses', value: `${o.businessRegistry.activeM.toFixed(1)} M`, tone: 'info' },
        { label: 'Mean SME continuity', value: `${Math.round(board.districts.reduce((s, d) => s + d.smeContinuityIdx, 0) / Math.max(1, board.districts.length))}/100`, tone: 'ok' },
        { label: 'Trade-balance idx', value: `${o.tradeBalanceIdx}/100`, tone: 'info' },
        { label: 'Distressed districts', value: board.districts.filter(d => d.pressureClass === 'distressed').length, tone: 'alert' },
      ]} />
      <CorridorCallout kicker="SME doctrine" body="Discriminatory market exclusion is constitutionally void. Cartel tolerance, predatory pricing and unequal credit access are reviewable." />
    </CorridorFrame>
  );
}

export function SupplyChains({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="supply" code="SC-CHN-13" title="Supply Chains"
      subtitle="per-chain visibility & flow">
      <CorridorKpi items={[
        { label: 'Chains tracked', value: board.supplyChains.length },
        { label: 'Fractured', value: board.supplyChains.filter(c => c.status === 'fractured').length, tone: 'alert' },
        { label: 'Choked', value: board.supplyChains.filter(c => c.status === 'choked').length, tone: 'alert' },
        { label: 'Mean visibility', value: `${Math.round(board.supplyChains.reduce((s, c) => s + c.visibilityIdx, 0) / Math.max(1, board.supplyChains.length))}/100`, tone: 'info' },
      ]} />
      <CorridorRule label="chain register" />
      {board.supplyChains.map(c => (
        <div key={c.id} className="grid grid-cols-[180px_180px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{c.chain}</span>
          <span style={{ color: TRADE_DS.mut }}>{c.upstreamSource}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{c.inboundDaysCover}d</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>{c.bottlenecks} btl</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.status === 'fractured' ? TRADE_DS.coral : c.status === 'choked' ? TRADE_DS.coral : c.status === 'thinning' ? TRADE_DS.orange : TRADE_DS.lime }}>● {c.status}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function InboundCover({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="supply" code="SC-INB-14" title="Inbound Cover"
      subtitle="inbound days of cover by chain">
      <CorridorKpi items={[
        { label: 'Chains tracked', value: board.supplyChains.length },
        { label: 'Below 7d cover', value: board.supplyChains.filter(c => c.inboundDaysCover < 7).length, tone: 'alert' },
        { label: 'Below 14d cover', value: board.supplyChains.filter(c => c.inboundDaysCover < 14).length, tone: 'warn' },
        { label: 'Mean cover', value: `${Math.round(board.supplyChains.reduce((s, c) => s + c.inboundDaysCover, 0) / Math.max(1, board.supplyChains.length))} d`, tone: 'info' },
      ]} />
      <CorridorRule label="inbound cover" />
      {board.supplyChains.map(c => (
        <TradeBar key={c.id}
          label={c.chain}
          pct={Math.min(100, c.inboundDaysCover * 5)}
          tone={c.inboundDaysCover > 14 ? 'ok' : c.inboundDaysCover > 7 ? 'warn' : 'alert'}
          tail={`${c.inboundDaysCover} d`} />
      ))}
    </CorridorFrame>
  );
}

export function BottleneckBoard({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="supply" code="SC-BTL-15" title="Bottleneck Board"
      subtitle="per-chain bottleneck count">
      <CorridorKpi items={[
        { label: 'Chains', value: board.supplyChains.length },
        { label: 'Total bottlenecks', value: board.supplyChains.reduce((s, c) => s + c.bottlenecks, 0), tone: 'warn' },
        { label: 'Chains with >5 bottlenecks', value: board.supplyChains.filter(c => c.bottlenecks > 5).length, tone: 'alert' },
        { label: 'Mean visibility', value: `${Math.round(board.supplyChains.reduce((s, c) => s + c.visibilityIdx, 0) / Math.max(1, board.supplyChains.length))}/100`, tone: 'info' },
      ]} />
      <CorridorRule label="bottleneck register" />
      {board.supplyChains.map(c => (
        <TradeBar key={c.id}
          label={c.chain}
          pct={c.visibilityIdx}
          tone={c.bottlenecks > 5 ? 'alert' : c.bottlenecks > 2 ? 'warn' : 'ok'}
          tail={`${c.bottlenecks} bottlenecks`} />
      ))}
    </CorridorFrame>
  );
}

export function TradeAgreements({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="foreign" code="FG-AGR-16" title="Trade Agreements"
      subtitle="bilateral / regional / sectoral">
      <CorridorKpi items={[
        { label: 'Agreements', value: board.foreign.agreements.length },
        { label: 'In force', value: board.foreign.agreements.filter(a => a.status === 'in-force').length, tone: 'ok' },
        { label: 'Under review', value: board.foreign.agreements.filter(a => a.status === 'under-review').length, tone: 'warn' },
        { label: 'Suspended / expired', value: board.foreign.agreements.filter(a => a.status === 'suspended' || a.status === 'expired').length, tone: 'alert' },
      ]} />
      <CorridorRule label="agreement register" />
      {board.foreign.agreements.map(a => (
        <div key={a.id} className="grid grid-cols-[160px_140px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{a.partner}</span>
          <span style={{ color: TRADE_DS.mut }}>{a.scope}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.ink }}>{a.yearsRemaining}y</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>idx {a.exportShareIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.status === 'suspended' || a.status === 'expired' ? TRADE_DS.coral : a.status === 'under-review' ? TRADE_DS.orange : TRADE_DS.lime }}>● {a.status}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function ExportDependencies({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="foreign" code="FG-DEP-17" title="Export Dependencies"
      subtitle="per-partner export concentration">
      <CorridorKpi items={[
        { label: 'Partners', value: board.foreign.exportDependencies.length },
        { label: 'Concentration risk', value: board.foreign.exportDependencies.filter(d => d.risk === 'concentration').length, tone: 'alert' },
        { label: 'Moderate risk', value: board.foreign.exportDependencies.filter(d => d.risk === 'moderate').length, tone: 'warn' },
        { label: 'Strategic alignment', value: `${board.foreign.strategicAlignmentIdx}/100`, tone: 'info' },
      ]} />
      <CorridorRule label="partner register" />
      {board.foreign.exportDependencies.map(d => (
        <TradeBar key={d.partner}
          label={d.partner}
          pct={Math.min(100, d.sharePct)}
          tone={d.risk === 'concentration' ? 'alert' : d.risk === 'moderate' ? 'warn' : 'ok'}
          tail={`${d.risk}`} />
      ))}
    </CorridorFrame>
  );
}

export function SanctionsExposure({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="foreign" code="FG-SAN-18" title="Sanctions Exposure"
      subtitle="sanctions exposure & alignment">
      <CorridorKpi items={[
        { label: 'Geopolitical pressure', value: `${board.foreign.geopoliticalPressureIdx}/100`, tone: 'warn' },
        { label: 'Sanctions exposure', value: `${board.foreign.sanctionsExposureIdx}/100`, tone: board.foreign.sanctionsExposureIdx > 60 ? 'alert' : 'warn' },
        { label: 'Strategic alignment', value: `${board.foreign.strategicAlignmentIdx}/100`, tone: 'info' },
        { label: 'Agreements at risk', value: board.foreign.agreements.filter(a => a.status === 'under-review' || a.status === 'suspended').length, tone: 'warn' },
      ]} />
      <CorridorCallout kicker="sanctions doctrine" body="Sanctions exposure is reviewed against §4 (Global Positioning). Arbitrary export bans without Cabinet review are constitutionally void." />
    </CorridorFrame>
  );
}

export function IndustrialIncidents({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  return (
    <CorridorFrame archetype="crisis" code="CR-INC-19" title="Industrial Incidents"
      subtitle="live incident ledger">
      <CorridorKpi items={[
        { label: 'Active incidents', value: board.incidents.length },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Critical severity', value: board.incidents.filter(i => i.severity === 'critical').length, tone: 'alert' },
        { label: 'Total output loss', value: `${board.incidents.reduce((s, i) => s + i.outputLossPct, 0).toFixed(0)}%`, tone: 'warn' },
      ]} />
      <CorridorRule label="incident ledger" />
      {board.incidents.map(i => (
        <div key={i.id} className="grid grid-cols-[110px_160px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRADE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRADE_DS.brass }}>{i.id}</span>
          <span style={{ color: TRADE_DS.ink }}>{i.kind}</span>
          <span style={{ color: TRADE_DS.mut }}>{i.origin}</span>
          <span className="text-right tabular-nums" style={{ color: TRADE_DS.mut }}>{i.outputLossPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' || i.severity === 'critical' ? TRADE_DS.coral : i.severity === 'elevated' ? TRADE_DS.orange : TRADE_DS.lime }}>● {i.recoveryPathway}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function RecoveryPathways({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  const pathways = ['emergency-mobilisation', 'alternative-routing', 'strategic-reserve-draw', 'partner-substitution'] as const;
  return (
    <CorridorFrame archetype="crisis" code="CR-REC-20" title="Recovery Pathways"
      subtitle="per-pathway active incidents">
      <CorridorKpi items={[
        { label: 'Active incidents', value: board.incidents.length },
        ...pathways.map(p => ({
          label: p,
          value: board.incidents.filter(i => i.recoveryPathway === p).length,
        })),
      ]} />
      <CorridorRule label="pathway register" />
      {pathways.map(p => {
        const incidents = board.incidents.filter(i => i.recoveryPathway === p);
        return (
          <TradeBar key={p}
            label={p}
            pct={Math.min(100, incidents.length * 25)}
            tone={incidents.length > 2 ? 'alert' : incidents.length > 0 ? 'warn' : 'ok'}
            tail={`${incidents.length} incident(s)`} />
        );
      })}
    </CorridorFrame>
  );
}

export function SabotageWatch({ id, now }: { id: string; now: number }) {
  const board = industrialContinuityBoard(now);
  void id;
  const sabotage = board.incidents.filter(i => i.kind === 'industrial-sabotage' || i.kind === 'supply-chain-fracture');
  return (
    <CorridorFrame archetype="crisis" code="CR-SBT-21" title="Sabotage Watch"
      subtitle="industrial sabotage & supply-chain fracture">
      <CorridorKpi items={[
        { label: 'Sabotage incidents', value: sabotage.length, tone: sabotage.length > 0 ? 'alert' : 'ok' },
        { label: 'National-severity', value: sabotage.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Output loss', value: `${sabotage.reduce((s, i) => s + i.outputLossPct, 0).toFixed(0)}%`, tone: 'warn' },
        { label: 'Critical recovery active', value: sabotage.filter(i => i.recoveryPathway === 'emergency-mobilisation').length, tone: 'warn' },
      ]} />
      <CorridorCallout kicker="sabotage doctrine" body="Industrial sabotage triggers automatic Police, Interior and Cabinet cascade. Concealment is constitutionally void." />
    </CorridorFrame>
  );
}
