'use client';

// Treasury — Sovereign Reserve Workflows. FX & gold reserve draw-down
// with three required authorisations (Reserve Governor, Treasury Minister,
// Cabinet Fiscal Authority), release window and repatriation reconciliation.

import * as React from 'react';
import { reserveWorkflows, type ReserveWorkflow } from '@/lib/gov/fiscal-execution';

const STATUS_COL: Record<ReserveWorkflow['status'], string> = {
  'pending-authorisation': 'rgb(var(--c-warn))',
  'released': '#54d08f',
  'repatriating': '#5fb0ff',
  'reconciled': 'rgb(var(--c-ok))',
  'blocked': 'rgb(var(--c-alert))',
};

export function ReserveWorkflows({ id, now }: { id: string; now: number }) {
  void id;
  const flows = reserveWorkflows(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Sovereign reserve draw-downs require three independent authorisations — no single actor may release reserves alone.
      </div>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-20 shrink-0">Ref</span>
          <span className="w-40 shrink-0">Purpose</span>
          <span className="w-20 shrink-0">Bucket</span>
          <span className="w-20 shrink-0">Requested</span>
          <span className="w-44 shrink-0">Authorisations</span>
          <span className="w-24 shrink-0">Release/repat</span>
          <span className="min-w-0 flex-1">Status</span>
        </div>
        {flows.map(f => (
          <div key={f.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-20 shrink-0 tabular-nums text-ink-muted">{f.id}</span>
            <span className="w-40 shrink-0 truncate text-ink">{f.purpose}</span>
            <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.1em] text-ink-soft">{f.fxBucket}</span>
            <span className="w-20 shrink-0 tabular-nums text-ink">{f.requestedBn}Bn</span>
            <span className="flex w-44 shrink-0 gap-1">
              {f.authorisations.map(a => (
                <span key={a.authority} className="border px-1 text-[8px] uppercase tracking-[0.06em]"
                  style={{ borderColor: a.held ? 'color-mix(in srgb,rgb(var(--c-ok)) 45%,transparent)' : 'rgb(var(--c-alert))', color: a.held ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>
                  {a.held ? '✓' : '✗'} {a.authority.split(' ').pop()}
                </span>
              ))}
            </span>
            <span className="w-24 shrink-0 text-[9px] text-ink-muted">{f.releaseWindowHrs}h / {f.repatriationDays}d</span>
            <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: STATUS_COL[f.status] }}>{f.status}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Reserves are drawn under a constitutional gate — three signatures, an explicit release window and a
        repatriation deadline that must reconcile back to the Treasury single account.
      </p>
    </div>
  );
}
