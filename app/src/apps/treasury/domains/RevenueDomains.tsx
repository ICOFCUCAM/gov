'use client';

// Treasury revenue surfaces — tax revenue, customs revenue, taxpayer
// registry, e-invoicing, risk-based audit.

import * as React from 'react';
import { revenueOps } from '@/lib/gov/treasury-systems';
import { LedgerFrame, KpiStrip, BrassRule, StatementColumn, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { seed, wave } from '@/lib/telemetry';

export function TaxRevenue({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = revenueOps(id, ts);
  const rows = r.byStream.map(s => ({
    label: s.stream,
    appropriated: `${Math.round(wave(`tr:bgt:${s.stream}`, ts, 4, 80) * 10) / 10} Bn`,
    spent: `${Math.round(wave(`tr:act:${s.stream}`, ts, 2, 76) * 10) / 10} Bn`,
    variance: Math.round(s.pct - 95),
  }));
  return (
    <LedgerFrame archetype="statement" ref="RV-TAX-01" title="Tax Revenue Collection" subtitle="live collection by stream" fiscalYear={String(new Date(now).getFullYear())}>
      <KpiStrip items={[
        { label: 'Collection rate', value: `${r.collectionRatePct}%`, tone: r.collectionRatePct >= 92 ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Taxpayers (M)', value: r.taxpayersM, tone: TREASURY_DS.brass },
        { label: 'Arrears (Bn)', value: r.arrearsBn, tone: TREASURY_DS.deficit },
        { label: 'Streams', value: r.byStream.length, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="collection statement" />
      <StatementColumn rows={rows} />
    </LedgerFrame>
  );
}

export function CustomsRevenue({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = revenueOps(id, ts);
  const streams = ['Import duty', 'Export duty', 'Excise (fuel)', 'Excise (alcohol)', 'Excise (tobacco)', 'Service tax'];
  return (
    <LedgerFrame archetype="statement" ref="RV-CUS-02" title="Customs Revenue" subtitle="duty collection at the border">
      <KpiStrip items={[
        { label: 'Customs throughput', value: `${r.customsThroughputPct}%`, tone: r.customsThroughputPct >= 85 ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Declarations / day', value: Math.round(wave(`cs:dec:${id}`, ts, 1200, 86000)).toLocaleString(), tone: TREASURY_DS.brass },
        { label: 'Hold rate', value: `${Math.round(wave(`cs:hold:${id}`, ts, 1, 14) * 10) / 10}%`, tone: TREASURY_DS.brass },
        { label: 'Seizure incidents', value: Math.floor(seed(`cs:sz:${id}`) * 18), tone: TREASURY_DS.deficit },
      ]} />
      <BrassRule label="duty by stream" />
      <ul className="space-y-1">
        {streams.map(s => {
          const v = Math.round(wave(`cs:${s}`, ts, 80, 90));
          return (
            <li key={s} className="grid grid-cols-[1fr_1fr_80px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.parchment }}>{s}</span>
              <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
                <div className="h-full" style={{ width: `${v}%`, background: TREASURY_DS.brass }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{v}%</span>
            </li>
          );
        })}
      </ul>
    </LedgerFrame>
  );
}

export function TaxpayerRegistry({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = revenueOps(id, ts);
  const cats = [
    { label: 'Citizens (PIT)', count: r.taxpayersM * 1000000, share: 78 },
    { label: 'Sole proprietors', count: Math.round(r.taxpayersM * 250000), share: 12 },
    { label: 'Companies (CIT)', count: Math.round(r.taxpayersM * 80000), share: 6 },
    { label: 'VAT registered', count: Math.round(r.taxpayersM * 60000), share: 4 },
  ];
  return (
    <LedgerFrame archetype="register" ref="RV-REG-03" title="Taxpayer Registry" subtitle="active taxpayers by category">
      <KpiStrip items={[
        { label: 'Total (M)', value: r.taxpayersM, tone: TREASURY_DS.brass },
        { label: 'New this Q', value: Math.round(wave(`tp:new:${id}`, ts, 1200, 48000)).toLocaleString(), tone: TREASURY_DS.surplus },
        { label: 'Dormant', value: Math.round(wave(`tp:dor:${id}`, ts, 8000, 240000)).toLocaleString(), tone: TREASURY_DS.deficit },
        { label: 'Compliance idx', value: Math.round(wave(`tp:cm:${id}`, ts, 58, 92)), tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="category composition" />
      <ul className="space-y-1.5">
        {cats.map(c => (
          <li key={c.label} className="grid grid-cols-[1fr_140px_70px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
            <span style={{ color: TREASURY_DS.parchment }}>{c.label}</span>
            <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{c.count.toLocaleString()}</span>
            <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brassDim }}>{c.share}%</span>
          </li>
        ))}
      </ul>
    </LedgerFrame>
  );
}

export function EInvoicing({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  return (
    <LedgerFrame archetype="register" ref="RV-EIN-04" title="e-Invoicing" subtitle="real-time invoice validation & VAT reconciliation">
      <KpiStrip items={[
        { label: 'Invoices /day', value: Math.round(wave(`ei:d:${id}`, ts, 240000, 4800000)).toLocaleString(), tone: TREASURY_DS.brass },
        { label: 'Validation pass', value: `${Math.round(wave(`ei:p:${id}`, ts, 92, 99.5) * 10) / 10}%`, tone: TREASURY_DS.surplus },
        { label: 'VAT mismatches', value: Math.floor(seed(`ei:m:${id}`) * 480), tone: TREASURY_DS.deficit },
        { label: 'Mean latency', value: `${Math.round(wave(`ei:lt:${id}`, ts, 80, 1200))}ms`, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="validation outcomes" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Every commercial invoice is validated against the seller&apos;s VAT registration, the buyer&apos;s account, and the
        line-item product codes in real time. Mismatches are routed to risk-based audit selection.
      </p>
    </LedgerFrame>
  );
}

export function RiskBasedAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const selections = ['Random sample', 'High-revenue stream', 'Sector anomaly', 'Cross-border flow', 'AI behavioural signal'];
  return (
    <LedgerFrame archetype="audit" ref="RV-AUD-05" title="Risk-Based Audit" subtitle="AI-driven audit selection with transparent criteria">
      <KpiStrip items={[
        { label: 'Audits open', value: Math.round(wave(`au:o:${id}`, ts, 240, 14800)).toLocaleString(), tone: TREASURY_DS.brass },
        { label: 'Yield this Q (Bn)', value: Math.round(wave(`au:y:${id}`, ts, 2, 48) * 10) / 10, tone: TREASURY_DS.surplus },
        { label: 'Hit rate', value: `${Math.round(wave(`au:h:${id}`, ts, 38, 82))}%`, tone: TREASURY_DS.brass },
        { label: 'Appeals filed', value: Math.floor(seed(`au:ap:${id}`) * 480), tone: TREASURY_DS.brassDim },
      ]} />
      <BrassRule label="selection criteria (explainable)" />
      <ul className="space-y-1.5">
        {selections.map(s => {
          const share = Math.round(wave(`au:sel:${s}`, ts, 10, 35));
          return (
            <li key={s} className="grid grid-cols-[1fr_140px_60px] items-center gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.parchment }}>{s}</span>
              <div className="h-1.5" style={{ background: TREASURY_DS.vaultDeep }}>
                <div className="h-full" style={{ width: `${share * 2.5}%`, background: TREASURY_DS.brass }} />
              </div>
              <span className="text-right tabular-nums" style={{ color: TREASURY_DS.brass }}>{share}%</span>
            </li>
          );
        })}
      </ul>
    </LedgerFrame>
  );
}
