'use client';

// Treasury ledger-tier surfaces — appropriation ledger, sub-ledger
// reconciliation, daily statement, expenditure control.

import * as React from 'react';
import { budgetOps, bankingRails } from '@/lib/gov/treasury-systems';
import { LedgerFrame, StatementColumn, TAccount, KpiStrip, BrassRule, TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';
import { wave } from '@/lib/telemetry';

export function AppropriationLedger({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const b = budgetOps(id, ts);
  const rows = b.byMinistry.map(m => ({
    label: m.ministry,
    appropriated: `${Math.round(wave(`app:${m.ministry}`, ts, 20, 280) * 10) / 10} Bn`,
    spent: `${Math.round(wave(`spt:${m.ministry}`, ts, 5, 240) * 10) / 10} Bn`,
    variance: Math.round(m.execPct - 75),
  }));
  return (
    <LedgerFrame archetype="ledger" ref="LD-APP-01" title="Appropriation Ledger" subtitle="budget vs spend by ministry" fiscalYear={String(new Date(now).getFullYear())}>
      <KpiStrip items={[
        { label: 'Execution', value: `${b.executionPct}%`, tone: b.executionPct >= 60 ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Virements', value: b.virements, tone: b.virements > 20 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Blocked allocations', value: b.blockedAllocations, tone: b.blockedAllocations ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'Vote heads', value: b.byMinistry.length, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="ministry execution statement" />
      <StatementColumn rows={rows} />
    </LedgerFrame>
  );
}

export function SubLedgerReconciliation({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const r = bankingRails(id, ts);
  return (
    <LedgerFrame archetype="audit" ref="LD-REC-02" title="Sub-Ledger Reconciliation" subtitle="three-way TSA ↔ rail ↔ ministry">
      <KpiStrip items={[
        { label: 'Reconciled', value: `${r.reconciledPct}%`, tone: r.reconciledPct >= 99 ? TREASURY_DS.surplus : r.reconciledPct >= 95 ? TREASURY_DS.brass : TREASURY_DS.deficit },
        { label: 'Failed settlements', value: r.failedSettlements, tone: r.failedSettlements > 0 ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'Channels online', value: `${r.channelsOnline}/${r.channelsTotal}`, tone: r.channelsOnline === r.channelsTotal ? TREASURY_DS.surplus : TREASURY_DS.brass },
        { label: 'Latency', value: `${r.settlementLatencyMin}m`, tone: r.settlementLatencyMin > 30 ? TREASURY_DS.deficit : TREASURY_DS.brass },
      ]} />
      <BrassRule label="three-way match" />
      <TAccount title="Daily reconciliation"
        debit={[
          { label: 'TSA bank statement', value: `${Math.round(r.tsaBalanceBn * 1000) / 1000} Bn` },
          { label: 'CivicPay ledger', value: `${Math.round(r.tsaBalanceBn * 1000 - r.failedSettlements * 0.01) / 1000} Bn` },
        ]}
        credit={[
          { label: 'Ministry sub-ledgers (sum)', value: `${Math.round(r.tsaBalanceBn * 1000 - r.failedSettlements * 0.02) / 1000} Bn` },
          { label: 'Pending settlement', value: `${r.failedSettlements * 0.01} Bn` },
        ]} />
      <BrassRule label="reconciliation doctrine" />
      <p className="text-[10.5px] italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>
        Every public ledger entry is hash-chained and replicated to the Audit Vault. Three-way reconciliation runs
        daily; deviations trigger automatic Fiscal Assurance investigation.
      </p>
    </LedgerFrame>
  );
}

export function DailyStatement({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const c = bankingRails(id, ts);
  const inflowsBn = Math.round(wave(`stmt:in:${id}`, ts, 8, 64) * 10) / 10;
  const outflowsBn = Math.round(wave(`stmt:out:${id}`, ts, 6, 60) * 10) / 10;
  const opening = c.tsaBalanceBn - inflowsBn + outflowsBn;
  return (
    <LedgerFrame archetype="statement" ref="LD-DST-03" title="Daily Fiscal Statement" subtitle="end-of-day position">
      <TAccount title={`Statement — ${new Date(now).toISOString().slice(0, 10)}`}
        debit={[
          { label: 'Opening balance', value: `${opening.toFixed(2)} Bn` },
          { label: 'Revenue inflows', value: `${inflowsBn.toFixed(2)} Bn` },
        ]}
        credit={[
          { label: 'Disbursement outflows', value: `${outflowsBn.toFixed(2)} Bn` },
          { label: 'Closing balance', value: `${c.tsaBalanceBn.toFixed(2)} Bn` },
        ]} />
    </LedgerFrame>
  );
}

export function ExpenditureControl({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  const b = budgetOps(id, ts);
  return (
    <LedgerFrame archetype="ledger" ref="LD-EXC-04" title="Expenditure Control" subtitle="encumbrance & release control">
      <KpiStrip items={[
        { label: 'Total execution', value: `${b.executionPct}%`, tone: TREASURY_DS.brass },
        { label: 'Virements (transfers)', value: b.virements, tone: b.virements > 20 ? TREASURY_DS.deficit : TREASURY_DS.brass },
        { label: 'Blocked allocations', value: b.blockedAllocations, tone: b.blockedAllocations ? TREASURY_DS.deficit : TREASURY_DS.surplus },
        { label: 'Vote heads', value: b.byMinistry.length, tone: TREASURY_DS.brass },
      ]} />
      <BrassRule label="encumbrance pipeline" />
      <div className="grid grid-cols-5 gap-3">
        {['envelope', 'committed', 'encumbered', 'released', 'spent'].map((stage, i) => {
          const pct = 100 - i * 12 - Math.round(wave(`enc:${stage}:${id}`, ts, 0, 8));
          return (
            <div key={stage} className="border px-3 py-3" style={{ borderColor: TREASURY_DS.ruleSoft, background: TREASURY_DS.vaultDeep }}>
              <div className="text-[8.5px] uppercase italic tracking-[0.22em]" style={{ color: TREASURY_DS.mut }}>{stage}</div>
              <div className="mt-1 tabular-nums text-[14px]" style={{ color: TREASURY_DS.brass, fontFamily: 'ui-monospace, monospace' }}>{pct}%</div>
              <div className="mt-2 h-1" style={{ background: TREASURY_DS.inkBlack }}>
                <div className="h-full" style={{ width: `${pct}%`, background: TREASURY_DS.brass }} />
              </div>
            </div>
          );
        })}
      </div>
    </LedgerFrame>
  );
}
