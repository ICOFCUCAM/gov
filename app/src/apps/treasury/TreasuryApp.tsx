'use client';

// apps/treasury — federated sovereign-fiscal execution application.
// National liquidity & resilience EMERGE from these operations (the
// state-fabric & resilience engines consume treasuryInstability).

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps,
  bankingRails, citizenFinance, fiscalAssurance,
} from '@/lib/gov/treasury-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = {
  command: 'incident', budget: 'procurement', revenue: 'approval', procurement: 'procurement',
  rails: 'procurement', citizen: 'approval', audit: 'case', allocation: 'procurement',
  debt: 'procurement', forecast: 'case',
};
const LABEL: Record<string, string> = {
  command: 'Fiscal Command', budget: 'National Budget Engine', revenue: 'Sovereign Revenue',
  procurement: 'Procurement', rails: 'Sovereign Payments Rail', citizen: 'Citizen Finance',
  audit: 'Anti-Corruption Audit', allocation: 'Inter-Ministry Allocation', debt: 'Debt & Reserves',
  forecast: 'Fiscal Forecasting',
};

export function TreasuryApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId;
  const ts = now / 4000;
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Fiscal Command';

  let body: React.ReactNode;
  if (d === 'command' || d === 'debt' || d === 'forecast') {
    const fc = fiscalCommand(id, ts);
    const br = bankingRails(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Liquidity runway', v: `${fc.liquidityDays}d`, t: fc.liquidityDays >= 30 ? 'ok' : fc.liquidityDays >= 14 ? 'warn' : 'alert' },
          { l: 'Debt / GDP', v: `${fc.debtToGdp}%`, t: fc.debtToGdp >= 65 ? 'alert' : fc.debtToGdp >= 50 ? 'warn' : 'ok' },
          { l: 'Primary balance', v: `${fc.primaryBalancePct}%`, t: fc.primaryBalancePct < 0 ? 'warn' : 'ok' },
          { l: 'FX reserves', v: `$${fc.fxReservesBn}B`, t: fc.fxReservesBn >= 30 ? 'ok' : 'warn' },
          { l: 'Macro stability', v: `${fc.macroStability}`, t: fc.tone },
          { l: 'TSA balance', v: `$${br.tsaBalanceBn}B`, t: br.tsaBalanceBn >= 12 ? 'ok' : 'warn' },
        ]} />
        <Panel title="National liquidity posture" meta="emergent → national resilience">
          <Bars rows={[
            { label: 'Macro stability', pct: fc.macroStability, tone: fc.tone, tail: `${fc.macroStability}` },
            { label: 'Reconciled settlement', pct: br.reconciledPct, tone: br.reconciledPct >= 98 ? 'ok' : 'warn', tail: `${br.reconciledPct}%` },
            { label: 'Channels online', pct: (br.channelsOnline / br.channelsTotal) * 100, tone: br.channelsOnline === br.channelsTotal ? 'ok' : 'alert', tail: `${br.channelsOnline}/${br.channelsTotal}` },
          ]} />
        </Panel>
      </>
    );
  } else if (d === 'revenue') {
    const rv = revenueOps(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Collection rate', v: `${rv.collectionRatePct}%`, t: rv.collectionRatePct >= 85 ? 'ok' : rv.collectionRatePct >= 72 ? 'warn' : 'alert' },
          { l: 'Customs throughput', v: `${rv.customsThroughputPct}%`, t: rv.customsThroughputPct >= 80 ? 'ok' : 'warn' },
          { l: 'Taxpayers', v: `${rv.taxpayersM}M`, t: 'ok' },
          { l: 'Arrears', v: `$${rv.arrearsBn}B`, t: rv.arrearsBn >= 24 ? 'alert' : 'warn' },
          { l: 'Streams', v: `${rv.byStream.length}`, t: 'ok' },
          { l: 'Posture', v: rv.collectionRatePct >= 85 ? 'STRONG' : 'STRAINED', t: rv.collectionRatePct >= 85 ? 'ok' : 'warn' },
        ]} />
        <Panel title="Revenue streams" meta="taxation · customs · collection">
          <Bars rows={rv.byStream.map(s => ({ label: s.stream, pct: s.pct, tone: s.tone, tail: `${s.pct}` }))} />
        </Panel>
      </>
    );
  } else if (d === 'budget' || d === 'allocation') {
    const bg = budgetOps(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Budget execution', v: `${bg.executionPct}%`, t: bg.executionPct >= 80 ? 'ok' : bg.executionPct >= 60 ? 'warn' : 'alert' },
          { l: 'Virements', v: `${bg.virements}`, t: 'warn' },
          { l: 'Blocked allocations', v: `${bg.blockedAllocations}`, t: bg.blockedAllocations ? 'alert' : 'ok' },
          { l: 'Vote heads', v: `${bg.byMinistry.length}`, t: 'ok' },
          { l: 'Mean execution', v: `${Math.round(bg.byMinistry.reduce((s, m) => s + m.execPct, 0) / bg.byMinistry.length)}%`, t: 'ok' },
          { l: 'Posture', v: bg.blockedAllocations ? 'CONSTRAINED' : 'FLOWING', t: bg.blockedAllocations ? 'alert' : 'ok' },
        ]} />
        <Panel title="Inter-ministry allocation" meta="appropriation → spend">
          <Bars rows={bg.byMinistry.map(m => ({ label: m.ministry, pct: m.execPct, tone: m.tone, tail: `${m.execPct}%` }))} />
        </Panel>
      </>
    );
  } else if (d === 'audit') {
    const fa = fiscalAssurance(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Audit chain', v: `${fa.chainIntactPct}%`, t: fa.chainIntactPct >= 99.5 ? 'ok' : 'alert' },
          { l: 'Open findings', v: `${fa.openFindings}`, t: fa.openFindings > 25 ? 'alert' : 'warn' },
          { l: 'Fraud signals', v: `${fa.fraudSignals}`, t: fa.fraudSignals ? 'alert' : 'ok' },
          { l: 'Regions monitored', v: `${fa.regionalRisk.length}`, t: 'ok' },
          { l: 'High-risk regions', v: `${fa.regionalRisk.filter(r => r.tone === 'alert').length}`, t: fa.regionalRisk.some(r => r.tone === 'alert') ? 'alert' : 'ok' },
          { l: 'Integrity posture', v: fa.fraudSignals ? 'FLAGGED' : 'CLEAN', t: fa.fraudSignals ? 'alert' : 'ok' },
        ]} />
        <Panel title="Regional fiscal risk" meta="anti-corruption surveillance">
          <Bars rows={fa.regionalRisk.map(r => ({ label: r.region, pct: r.risk, tone: r.tone, tail: `${r.risk}` }))} />
        </Panel>
      </>
    );
  } else { // procurement / rails / citizen
    const pc = procurementOps(id, ts);
    const cf = citizenFinance(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Active tenders', v: `${pc.activeTenders}`, t: 'ok' },
          { l: 'Procurement integrity', v: `${pc.integrityPct}%`, t: pc.integrityPct >= 90 ? 'ok' : 'warn' },
          { l: 'Disbursement latency', v: `${pc.disbursementLatencyDays}d`, t: pc.disbursementLatencyDays >= 28 ? 'alert' : pc.disbursementLatencyDays >= 14 ? 'warn' : 'ok' },
          { l: 'Flagged contracts', v: `${pc.flaggedContracts}`, t: pc.flaggedContracts ? 'alert' : 'ok' },
          { l: 'Citizen payments/day', v: `${cf.paymentsTodayM}M`, t: 'ok' },
          { l: 'Refunds pending', v: cf.refundsPending.toLocaleString(), t: cf.refundsPending > 3000 ? 'alert' : 'warn' },
        ]} />
        <Panel title="Procurement pipeline" meta="solicitation → disbursement">
          <Bars rows={pc.pipeline.map(s => ({ label: s.stage, pct: Math.min(100, s.count), tone: 'warn', tail: `${s.count}` }))} />
        </Panel>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {body}
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'procurement'} title={`${label} runtime — execute the fiscal workflow`} by="Treasury Officer" role={role} withheld={withheld} />
    </div>
  );
}
