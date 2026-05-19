'use client';

// apps/treasury — federated sovereign-fiscal execution application.
// National liquidity & resilience EMERGE from these operations. Cinematic
// sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import {
  fiscalCommand, revenueOps, budgetOps, procurementOps,
  bankingRails, citizenFinance, fiscalAssurance,
} from '@/lib/gov/treasury-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection, InstitutionChainStrip } from '@/apps/_shared/InstitutionChain';
import { facilities, actors, recordLineage, chainIntegrity } from '@/lib/gov/institution-chain';
import { pickIndex } from '@/lib/pick-index';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#54d08f';
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
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `tr${i}` }));

export function TreasuryApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId;
  const ts = now / 4000;
  const tEpoch = Math.max(0, Math.floor(ts));
  const tBranches = facilities('FINANCE', tEpoch);
  const tBranch = tBranches[pickIndex(id, tBranches.length, 7)] ?? tBranches[0]!;
  const tAssessor = actors('FINANCE', tBranch.id, tEpoch)[0]?.name ?? 'Revenue assessor';
  const tLineage = recordLineage(`FISC-${id}`, tAssessor, tBranch, 'FINANCE', tEpoch);
  const tInteg = chainIntegrity('FINANCE', tEpoch);
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Fiscal Command';

  let kpis: K[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] } = { title: '', meta: '', rows: [] };
  let pTone: Tone = 'ok';

  if (d === 'command' || d === 'debt' || d === 'forecast') {
    const fc = fiscalCommand(id, ts); const br = bankingRails(id, ts);
    pTone = fc.tone;
    kpis = [
      { l: 'Liquidity Runway', v: `${fc.liquidityDays}d`, t: fc.liquidityDays >= 30 ? 'ok' : fc.liquidityDays >= 14 ? 'warn' : 'alert' },
      { l: 'Debt / GDP', v: `${fc.debtToGdp}%`, t: fc.debtToGdp >= 65 ? 'alert' : fc.debtToGdp >= 50 ? 'warn' : 'ok' },
      { l: 'Primary Balance', v: `${fc.primaryBalancePct}%`, t: fc.primaryBalancePct < 0 ? 'warn' : 'ok' },
      { l: 'FX Reserves', v: `$${fc.fxReservesBn}B`, t: fc.fxReservesBn >= 30 ? 'ok' : 'warn' },
      { l: 'Macro Stability', v: `${fc.macroStability}`, t: fc.tone },
      { l: 'TSA Balance', v: `$${br.tsaBalanceBn}B`, t: br.tsaBalanceBn >= 12 ? 'ok' : 'warn' },
    ];
    bars = { title: 'National liquidity posture', meta: 'emergent → national resilience', rows: [
      { label: 'Macro stability', pct: fc.macroStability, tone: fc.tone, tail: `${fc.macroStability}` },
      { label: 'Reconciled settlement', pct: br.reconciledPct, tone: br.reconciledPct >= 98 ? 'ok' : 'warn', tail: `${br.reconciledPct}%` },
      { label: 'Channels online', pct: (br.channelsOnline / br.channelsTotal) * 100, tone: br.channelsOnline === br.channelsTotal ? 'ok' : 'alert', tail: `${br.channelsOnline}/${br.channelsTotal}` },
    ] };
  } else if (d === 'revenue') {
    const rv = revenueOps(id, ts);
    pTone = rv.collectionRatePct >= 85 ? 'ok' : 'warn';
    kpis = [
      { l: 'Collection Rate', v: `${rv.collectionRatePct}%`, t: rv.collectionRatePct >= 85 ? 'ok' : rv.collectionRatePct >= 72 ? 'warn' : 'alert' },
      { l: 'Customs Throughput', v: `${rv.customsThroughputPct}%`, t: rv.customsThroughputPct >= 80 ? 'ok' : 'warn' },
      { l: 'Taxpayers', v: `${rv.taxpayersM}M`, t: 'ok' },
      { l: 'Arrears', v: `$${rv.arrearsBn}B`, t: rv.arrearsBn >= 24 ? 'alert' : 'warn' },
      { l: 'Streams', v: `${rv.byStream.length}`, t: 'ok' },
      { l: 'Posture', v: rv.collectionRatePct >= 85 ? 'STRONG' : 'STRAINED', t: rv.collectionRatePct >= 85 ? 'ok' : 'warn' },
    ];
    bars = { title: 'Revenue streams', meta: 'taxation · customs · collection', rows: rv.byStream.map(s => ({ label: s.stream, pct: s.pct, tone: s.tone, tail: `${s.pct}` })) };
  } else if (d === 'budget' || d === 'allocation') {
    const bg = budgetOps(id, ts);
    pTone = bg.blockedAllocations ? 'alert' : 'ok';
    kpis = [
      { l: 'Budget Execution', v: `${bg.executionPct}%`, t: bg.executionPct >= 80 ? 'ok' : bg.executionPct >= 60 ? 'warn' : 'alert' },
      { l: 'Virements', v: `${bg.virements}`, t: 'warn' },
      { l: 'Blocked Allocations', v: `${bg.blockedAllocations}`, t: bg.blockedAllocations ? 'alert' : 'ok' },
      { l: 'Vote Heads', v: `${bg.byMinistry.length}`, t: 'ok' },
      { l: 'Mean Execution', v: `${Math.round(bg.byMinistry.reduce((s, m) => s + m.execPct, 0) / bg.byMinistry.length)}%`, t: 'ok' },
      { l: 'Posture', v: bg.blockedAllocations ? 'CONSTRAINED' : 'FLOWING', t: bg.blockedAllocations ? 'alert' : 'ok' },
    ];
    bars = { title: 'Inter-ministry allocation', meta: 'appropriation → spend', rows: bg.byMinistry.map(m => ({ label: m.ministry, pct: m.execPct, tone: m.tone, tail: `${m.execPct}%` })) };
  } else if (d === 'audit') {
    const fa = fiscalAssurance(id, ts);
    pTone = fa.fraudSignals ? 'alert' : 'ok';
    kpis = [
      { l: 'Audit Chain', v: `${fa.chainIntactPct}%`, t: fa.chainIntactPct >= 99.5 ? 'ok' : 'alert' },
      { l: 'Open Findings', v: `${fa.openFindings}`, t: fa.openFindings > 25 ? 'alert' : 'warn' },
      { l: 'Fraud Signals', v: `${fa.fraudSignals}`, t: fa.fraudSignals ? 'alert' : 'ok' },
      { l: 'Regions Monitored', v: `${fa.regionalRisk.length}`, t: 'ok' },
      { l: 'High-Risk Regions', v: `${fa.regionalRisk.filter(r => r.tone === 'alert').length}`, t: fa.regionalRisk.some(r => r.tone === 'alert') ? 'alert' : 'ok' },
      { l: 'Integrity', v: fa.fraudSignals ? 'FLAGGED' : 'CLEAN', t: fa.fraudSignals ? 'alert' : 'ok' },
    ];
    bars = { title: 'Regional fiscal risk', meta: 'anti-corruption surveillance', rows: fa.regionalRisk.map(r => ({ label: r.region, pct: r.risk, tone: r.tone, tail: `${r.risk}` })) };
  } else {
    const pc = procurementOps(id, ts); const cf = citizenFinance(id, ts);
    pTone = pc.flaggedContracts ? 'alert' : 'ok';
    kpis = [
      { l: 'Active Tenders', v: `${pc.activeTenders}`, t: 'ok' },
      { l: 'Procurement Integrity', v: `${pc.integrityPct}%`, t: pc.integrityPct >= 90 ? 'ok' : 'warn' },
      { l: 'Disbursement Latency', v: `${pc.disbursementLatencyDays}d`, t: pc.disbursementLatencyDays >= 28 ? 'alert' : pc.disbursementLatencyDays >= 14 ? 'warn' : 'ok' },
      { l: 'Flagged Contracts', v: `${pc.flaggedContracts}`, t: pc.flaggedContracts ? 'alert' : 'ok' },
      { l: 'Citizen Payments/Day', v: `${cf.paymentsTodayM}M`, t: 'ok' },
      { l: 'Refunds Pending', v: cf.refundsPending.toLocaleString(), t: cf.refundsPending > 3000 ? 'alert' : 'warn' },
    ];
    bars = { title: 'Procurement pipeline', meta: 'solicitation → disbursement', rows: pc.pipeline.map(s => ({ label: s.stage, pct: Math.min(100, s.count), tone: 'warn' as Tone, tail: `${s.count}` })) };
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Treasury · ${label}`} subtitle="Sovereign Fiscal Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'STRAINED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} />
      <InstitutionChainStrip accent={ACC} ministryKey="FINANCE" facility={tBranch}
        actorName={tAssessor} lineage={tLineage} integrity={tInteg} />
      <MinistryChainSection ministryKey="FINANCE" id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'procurement'} title={`${label} runtime — execute the fiscal workflow`} by="Treasury Officer" role={role} withheld={withheld} />
    </div>
  );
}
