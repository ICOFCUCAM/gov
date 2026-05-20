'use client';

// Treasury — Inter-Ministry Fiscal Execution. Three-hop transfer chains:
// Treasury → Ministry → Facility → Vendor, with per-hop SLA & status.

import * as React from 'react';
import { interMinistryTransfers, type InterMinistryTransfer } from '@/lib/gov/fiscal-execution';

const COL: Record<InterMinistryTransfer['hops'][number]['status'], string> = {
  pending: 'rgb(var(--c-warn))',
  cleared: 'rgb(var(--c-ok))',
  reconciled: 'rgb(var(--c-ok))',
  stalled: 'rgb(var(--c-alert))',
};

export function InterMinistryFiscal({ id, now }: { id: string; now: number }) {
  void id;
  const transfers = interMinistryTransfers(now);
  const stalled = transfers.filter(t => t.hops.some(h => h.status === 'stalled')).length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Live transfers</div><div className="text-[16px] font-semibold tabular-nums text-ink">{transfers.length}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Stalled chains</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: stalled ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{stalled}</div></div>
        <div className="min-w-[260px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Treasury → Ministry → Facility → Vendor — every hop on the chain accountable.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-24 shrink-0">Ref</span>
          <span className="w-32 shrink-0">Category</span>
          <span className="w-20 shrink-0">Amount</span>
          <span className="min-w-0 flex-1">Hops & SLAs</span>
          <span className="w-24 shrink-0">End-to-end</span>
        </div>
        {transfers.map(t => (
          <div key={t.id} className="border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{t.id}</span>
              <span className="w-32 shrink-0 truncate text-ink">{t.category}</span>
              <span className="w-20 shrink-0 tabular-nums text-ink">{t.amountM}M</span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[9px]">
                {t.hops.map((h, i) => (
                  <React.Fragment key={i}>
                    <span className="rounded-[2px] border px-1 py-0.5"
                      style={{ borderColor: `color-mix(in srgb,${COL[h.status]} 45%,transparent)`, color: COL[h.status] }}>
                      {h.from} → {h.to}
                      <span className="ml-1 text-ink-muted">{h.ageHrs}/{h.slaHrs}h</span>
                    </span>
                    {i < t.hops.length - 1 ? <span style={{ color: 'rgb(var(--c-line))' }}>▸</span> : null}
                  </React.Fragment>
                ))}
              </span>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: t.endToEndHrs >= 96 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{t.endToEndHrs}h</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        A vendor cannot be paid until upstream hops clear. Stalled hops surface here AND propagate to anti-corruption
        oversight — concealment is not an option.
      </p>
    </div>
  );
}
