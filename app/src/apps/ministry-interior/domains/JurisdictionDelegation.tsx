'use client';

// Interior Procedural Execution — Jurisdiction Transfer & Delegated
// Authority. Inter-jurisdiction processing preserving audit lineage,
// deadlines and authority boundaries; plus time-limited, logged,
// jurisdiction-bound delegation of institutional authority.

import * as React from 'react';
import { proceduralLedger, proceduralBoard } from '@/lib/gov/procedural-execution';

export function JurisdictionDelegation({ id, now }: { id: string; now: number }) {
  void id;
  const files = proceduralLedger(now);
  const b = proceduralBoard(now);
  const transfers = files.filter(f => f.transferred).slice(0, 28);
  const delegations = files.filter(f => f.delegation).slice(0, 24);

  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        {b.jurisdictionCounts.map(j => (
          <div key={j.jurisdiction} className="min-w-[110px] flex-1 px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">{j.jurisdiction}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{j.count}</div>
          </div>
        ))}
        <div className="min-w-[110px] flex-1 px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Transfers</div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: '#45c0c8' }}>{b.transfers}</div>
        </div>
        <div className="min-w-[110px] flex-1 px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Delegations</div>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: '#d8a23a' }}>{b.delegations}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Jurisdiction transfers — lineage preserved</div>
          <div className="border border-line">
            {transfers.length === 0 ? <p className="px-2 py-2 text-[10px] text-ink-muted">No active transfers.</p> :
              transfers.map(f => (
                <div key={f.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                  <span className="w-16 shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
                  <span className="w-28 shrink-0 truncate text-ink">{f.office}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{f.lineage.map(l => l.jurisdiction).join(' → ')}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: f.remainingHrs < 0 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{f.remainingHrs}h</span>
                </div>
              ))}
          </div>
        </div>
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Delegated authority — time-limited & logged</div>
          <div className="border border-line">
            {delegations.length === 0 ? <p className="px-2 py-2 text-[10px] text-ink-muted">No active delegations.</p> :
              delegations.map(f => {
                const d = f.delegation!;
                return (
                  <div key={f.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                    <span className="w-16 shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      <span className="text-ink-muted">{d.fromOfficer}</span> → <span className="text-ink">{d.actingOfficer}</span>
                    </span>
                    <span className="w-20 shrink-0 truncate text-ink-soft">{d.jurisdiction}</span>
                    <span className="w-20 shrink-0 text-right tabular-nums" style={{ color: d.expiresInHrs <= 8 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>exp {d.expiresInHrs}h</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Transfers preserve audit lineage, constitutional state, processing deadlines and authority boundaries.
        All delegation is temporary, jurisdiction-bound and auditable — no permanent informal authority.
      </p>
    </div>
  );
}
