'use client';

// Treasury rails + reserves + assurance + portal surfaces.

import * as React from 'react';
import { bankingRails, fiscalAssurance, citizenFinance, fiscalCommand } from '@/lib/gov/treasury-systems';
import { LedgerFrame, KpiStrip, BrassRule, TAccount, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { seed, wave } from '@/lib/telemetry';

export function PaymentsRail({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = bankingRails(id, ts);
  const channels = ['GovPay instant', 'Batch disbursement', 'Mobile money', 'Agent network', 'Card rail', 'USSD'];
  return (
    <LedgerFrame archetype="gauge" ref="RA-PAY-01" title="GovPay Rail" subtitle="instant credit transfer & batch disbursement">
      <KpiStrip items={[
        { label: 'Throughput / day (M)', value: Math.round(wave(`pay:t:${id}`, ts, 4, 64) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Channels online', value: `${r.channelsOnline}/${r.channelsTotal}`, tone: r.channelsOnline === r.channelsTotal ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Latency', value: `${r.settlementLatencyMin}m`, tone: r.settlementLatencyMin > 30 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Failed settlements', value: r.failedSettlements, tone: r.failedSettlements > 0 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
      ]} />
      <BrassRule label="channel utilisation" />
      <ul className="space-y-1">
        {channels.map(c => {
          const pct = Math.round(wave(`pay:c:${c}:${id}`, ts, 28, 96));
          const online = seed(`pay:on:${c}:${id}`) > 0.06;
          return (
            <li key={c} className="grid grid-cols-[1fr_140px_60px_60px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.parchment }}>{c}</span>
              <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
                <div className="h-full" style={{ width: `${pct}%`, background: online ? TREASURY_DS.brass : TREASURY_DS.deficit }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{pct}%</span>
              <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: online ? TREASURY_DS.surplus : TREASURY_DS.deficit }}>● {online ? 'live' : 'offline'}</span>
            </li>
          );
        })}
      </ul>
    </LedgerFrame>
  );
}

export function CBDCOperations({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <LedgerFrame archetype="gauge" ref="RA-CBD-02" title="CBDC Operations" subtitle="retail & wholesale CBDC issuance">
      <KpiStrip items={[
        { label: 'Circulation (Bn)', value: Math.round(wave(`cb:cr:${id}`, ts, 0.4, 48) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Retail wallets (M)', value: Math.round(wave(`cb:rw:${id}`, ts, 0.4, 24) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Wholesale settlements / day', value: Math.round(wave(`cb:ws:${id}`, ts, 1200, 48000)).toLocaleString(), tone: TREASURY_DS.brassDim },
        { label: 'Programmable contracts', value: Math.round(wave(`cb:pc:${id}`, ts, 8, 4800)), tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="privacy doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        CBDC tokens are programmable but bearer privacy is preserved for sub-threshold transactions. AML/CFT
        thresholds, structuring detection and sanctions screening run inside the AI Plane with mandated
        explainability.
      </p>
    </LedgerFrame>
  );
}

export function SettlementReconciliation({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = bankingRails(id, ts);
  return (
    <LedgerFrame archetype="audit" ref="RA-SET-03" title="Settlement Reconciliation" subtitle="bank settlement reconciliation">
      <KpiStrip items={[
        { label: 'Reconciled', value: `${r.reconciledPct}%`, tone: r.reconciledPct >= 99 ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Settlement latency', value: `${r.settlementLatencyMin}m`, tone: TREASURY_DS.brass },
        { label: 'Failed', value: r.failedSettlements, tone: r.failedSettlements > 0 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'TSA Bn', value: r.tsaBalanceBn, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="three-way match" />
      <TAccount title="End-of-day settlement"
        debit={[
          { label: 'Bank statement', value: `${r.tsaBalanceBn.toFixed(2)} Bn` },
          { label: 'CivicPay ledger', value: `${(r.tsaBalanceBn - r.failedSettlements * 0.005).toFixed(2)} Bn` },
        ]}
        credit={[
          { label: 'Ministry sub-ledgers', value: `${(r.tsaBalanceBn - r.failedSettlements * 0.01).toFixed(2)} Bn` },
          { label: 'Unsettled', value: `${(r.failedSettlements * 0.005).toFixed(2)} Bn` },
        ]} />
    </LedgerFrame>
  );
}

export function SovereignReserves({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = fiscalCommand(id, ts);
  const composition = [
    { label: 'USD-denominated', share: 42, billion: c.fxReservesBn * 0.42 },
    { label: 'EUR-denominated', share: 22, billion: c.fxReservesBn * 0.22 },
    { label: 'Gold (Bn equiv.)', share: 16, billion: c.fxReservesBn * 0.16 },
    { label: 'SDR & other', share: 10, billion: c.fxReservesBn * 0.10 },
    { label: 'Regional currencies', share: 10, billion: c.fxReservesBn * 0.10 },
  ];
  return (
    <LedgerFrame archetype="statement" ref="RS-FXR-02" title="Sovereign Reserves" subtitle="FX position by composition">
      <KpiStrip items={[
        { label: 'Total reserves (Bn)', value: c.fxReservesBn, tone: TREASURY_DS.brass },
        { label: 'Months of imports', value: Math.round(wave(`fx:mi:${id}`, ts, 3, 12) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Liquidity adequacy', value: `${Math.round(wave(`fx:la:${id}`, ts, 88, 142))}%`, tone: TREASURY_DS.surplus },
        { label: 'Hedged share', value: `${Math.round(wave(`fx:hd:${id}`, ts, 18, 64))}%`, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="composition" />
      <ul className="space-y-1">
        {composition.map(c2 => (
          <li key={c2.label} className="grid grid-cols-[1fr_140px_120px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span style={{ color: TREASURY_DS.parchment }}>{c2.label}</span>
            <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
              <div className="h-full" style={{ width: `${c2.share}%`, background: TREASURY_DS.brass }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{c2.billion.toFixed(1)} Bn · {c2.share}%</span>
          </li>
        ))}
      </ul>
    </LedgerFrame>
  );
}

export function PublicDebt({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const total = Math.round(wave(`pd:t:${id}`, ts, 80, 1240));
  const instruments = [
    { label: 'Treasury bonds 10y+', value: total * 0.42 },
    { label: 'Treasury notes 2-5y', value: total * 0.22 },
    { label: 'T-bills <1y', value: total * 0.14 },
    { label: 'Concessional external', value: total * 0.12 },
    { label: 'Commercial external', value: total * 0.06 },
    { label: 'Domestic retail', value: total * 0.04 },
  ];
  return (
    <LedgerFrame archetype="statement" ref="RS-DBT-03" title="Public Debt Portfolio" subtitle="sovereign debt instruments by maturity">
      <KpiStrip items={[
        { label: 'Outstanding (Bn)', value: total, tone: TREASURY_DS.brass },
        { label: 'Average maturity (y)', value: Math.round(wave(`pd:m:${id}`, ts, 4, 14) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Avg coupon', value: `${Math.round(wave(`pd:c:${id}`, ts, 4, 14) * 10) / 10}%`, tone: TREASURY_DS.brassDim },
        { label: 'Refinancing risk', value: Math.round(wave(`pd:r:${id}`, ts, 18, 78)), tone: TREASURY_DS.deficit },
      ]} />
      <BrassRule label="instrument composition" />
      <ul className="space-y-1">
        {instruments.map(i => (
          <li key={i.label} className="grid grid-cols-[1fr_180px_100px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span style={{ color: TREASURY_DS.parchment }}>{i.label}</span>
            <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
              <div className="h-full" style={{ width: `${(i.value / total) * 100}%`, background: TREASURY_DS.brass }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{i.value.toFixed(1)} Bn</span>
          </li>
        ))}
      </ul>
    </LedgerFrame>
  );
}

export function FiscalAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const a = fiscalAssurance(id, ts);
  return (
    <LedgerFrame archetype="audit" ref="AS-AUD-01" title="Fiscal Audit Trail" subtitle="hash-chained audit trail">
      <KpiStrip items={[
        { label: 'Chain intact', value: `${a.chainIntactPct}%`, tone: a.chainIntactPct >= 99.9 ? TREASURY_DS.surplus : TREASURY_DS.deficit },
        { label: 'Open findings', value: a.openFindings, tone: a.openFindings > 12 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Fraud signals', value: a.fraudSignals, tone: a.fraudSignals > 0 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'Regions monitored', value: a.regionalRisk.length, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="regional risk" />
      <ul className="space-y-1">
        {a.regionalRisk.map(r => (
          <li key={r.region} className="grid grid-cols-[1fr_140px_70px_80px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span style={{ color: TREASURY_DS.parchment }}>{r.region}</span>
            <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
              <div className="h-full" style={{ width: `${r.risk}%`, background: r.tone === 'alert' ? TREASURY_DS.deficit : r.tone === 'warn' ? TREASURY_DS.brass : TREASURY_DS.surplus }} />
            </div>
            <span className="text-right tabular-nums" style={{ color: r.tone === 'alert' ? TREASURY_DS.deficit : TREASURY_DS.brass }}>{r.risk}</span>
            <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: r.tone === 'alert' ? TREASURY_DS.deficit : r.tone === 'warn' ? TREASURY_DS.brass : TREASURY_DS.surplus }}>· {r.tone}</span>
          </li>
        ))}
      </ul>
    </LedgerFrame>
  );
}

export function AntiFraud({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const a = fiscalAssurance(id, ts);
  return (
    <LedgerFrame archetype="audit" ref="AS-FRD-02" title="Anti-Fraud Intelligence" subtitle="AI-driven detection with explainability">
      <KpiStrip items={[
        { label: 'Live signals', value: a.fraudSignals, tone: a.fraudSignals > 0 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'Q yield (Bn)', value: Math.round(wave(`af:y:${id}`, ts, 0.4, 12) * 10) / 10, tone: TREASURY_DS.brass },
        { label: 'Closed this Q', value: Math.floor(seed(`af:c:${id}`) * 480), tone: TREASURY_DS.surplus },
        { label: 'Model AUC', value: `${Math.round(wave(`af:m:${id}`, ts, 0.82, 0.96) * 100) / 100}`, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="explainability doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Every fraud flag the model raises is paired with a feature-attribution disclosure made available to the
        accused entity and the auditor. AI flags are advisory; enforcement is taken by human officers.
      </p>
    </LedgerFrame>
  );
}

export function TaxpayerPortal({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = citizenFinance(id, ts);
  return (
    <LedgerFrame archetype="portal" ref="PT-TXP-01" title="Taxpayer Portal" subtitle="citizen tax filing & refunds">
      <KpiStrip items={[
        { label: 'Portal uptime', value: `${c.portalUptime}%`, tone: c.portalUptime >= 99 ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Payments today (M)', value: c.paymentsTodayM, tone: TREASURY_DS.brass },
        { label: 'Refunds pending', value: c.refundsPending.toLocaleString(), tone: c.refundsPending > 8000 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Satisfaction', value: `${c.satisfactionPct}%`, tone: c.satisfactionPct >= 75 ? TREASURY_DS.surplus : TREASURY_DS.brass },
      ]} />
      <BrassRule label="citizen filing experience" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Salaried citizens receive a pre-filled return — one-click filing. Real-time refund processing where the
        return is straight-through. Wallet-integrated payment with installment plans for self-assessment.
      </p>
    </LedgerFrame>
  );
}

export function PublicBudgetDashboard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <LedgerFrame archetype="portal" ref="PT-PUB-02" title="Public Budget Dashboard" subtitle="public execution view (anonymised)">
      <KpiStrip items={[
        { label: 'Execution YTD', value: `${Math.round(wave(`pbd:e:${ts}`, ts, 48, 86))}%`, tone: TREASURY_DS.brass },
        { label: 'Programs visible', value: Math.round(wave(`pbd:p:${ts}`, ts, 180, 480)), tone: TREASURY_DS.brass },
        { label: 'Vendor-level disclosures', value: Math.round(wave(`pbd:v:${ts}`, ts, 1800, 24000)), tone: TREASURY_DS.brassDim },
        { label: 'Public lookups / day (K)', value: Math.round(wave(`pbd:l:${ts}`, ts, 12, 480)), tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="transparency doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Budget execution is published near-real-time, anonymised to vendor and program level. Every citizen and
        journalist has a sovereign right to inspect how public money is spent.
      </p>
    </LedgerFrame>
  );
}
