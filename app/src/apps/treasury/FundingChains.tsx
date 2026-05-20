'use client';

// Treasury — Executable Funding Chains. Stateful per-request workflow:
// request → review → approval → release → disbursement → reconciliation,
// with the live approver chain and SLA pressure exposed per file.

import * as React from 'react';
import { fundingChains, type FundingChain } from '@/lib/gov/fiscal-execution';

const STAGES = ['request', 'review', 'approval', 'release', 'disbursement', 'reconciliation'] as const;

const STATUS_COL: Record<FundingChain['status'], string> = {
  'in-flight': 'rgb(var(--c-warn))',
  'held': '#8a7df0',
  'rejected': 'rgb(var(--c-alert))',
  'released': 'rgb(var(--c-ok))',
  'reconciled': 'rgb(var(--c-ok))',
};

export function FundingChains({ id, now }: { id: string; now: number }) {
  void id;
  const chains = fundingChains(now);
  const counts = {
    inflight: chains.filter(c => c.status === 'in-flight').length,
    held: chains.filter(c => c.status === 'held').length,
    rejected: chains.filter(c => c.status === 'rejected').length,
    released: chains.filter(c => c.status === 'released' || c.status === 'reconciled').length,
  };
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">In-flight</div><div className="text-[16px] font-semibold tabular-nums text-ink">{counts.inflight}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Held</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: '#8a7df0' }}>{counts.held}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Rejected</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: counts.rejected ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{counts.rejected}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Released / reconciled</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: 'rgb(var(--c-ok))' }}>{counts.released}</div></div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Workflow</div><div className="text-[10px] text-ink-soft">request → review → approval → release → disbursement → reconciliation</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-24 shrink-0">File</span>
          <span className="w-28 shrink-0">Ministry</span>
          <span className="w-24 shrink-0">Category</span>
          <span className="w-20 shrink-0">Amount</span>
          <span className="min-w-0 flex-1">Stage rail</span>
          <span className="w-20 shrink-0">SLA</span>
          <span className="w-20 shrink-0">Status</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {chains.map(c => {
            const cur = STAGES.indexOf(c.stage);
            return (
              <div key={c.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-24 shrink-0 truncate tabular-nums text-ink-muted">{c.id}</span>
                <span className="w-28 shrink-0 truncate text-ink">{c.ministry}</span>
                <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em] text-ink-soft">{c.category}</span>
                <span className="w-20 shrink-0 tabular-nums text-ink">{c.amountM}M</span>
                <span className="flex min-w-0 flex-1 items-center gap-px">
                  {STAGES.map((_, i) => (
                    <span key={i} className="h-2 min-w-0 flex-1"
                      style={{
                        background: i < cur ? STATUS_COL[c.status] : i === cur ? STATUS_COL[c.status] : 'rgb(var(--c-line))',
                        opacity: i <= cur ? 1 : 0.35,
                      }}
                      title={STAGES[i]} />
                  ))}
                </span>
                <span className="w-20 shrink-0 tabular-nums" style={{ color: c.ageHrs > c.slaHrs ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{c.ageHrs}/{c.slaHrs}h</span>
                <span className="w-20 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: STATUS_COL[c.status] }}>{c.status}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Every approver is recorded on the chain — a release cannot occur without all prior signatories. SLA pressure
        is visible in-line so stalls cannot be hidden.
      </p>
    </div>
  );
}
