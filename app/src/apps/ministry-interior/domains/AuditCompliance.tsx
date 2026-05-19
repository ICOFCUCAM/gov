'use client';

// Interior infrastructure domain — Audit & Compliance. Tamper-evident
// chain integrity across the sovereign audit ledger, plus the Interior
// instance's own recent audit trail. Source data is the shared ledger.

import * as React from 'react';
import { auditStats, auditTrail, verifyChain, subscribe, version } from '@/services/audit-ledger';

export function AuditCompliance({ id, now }: { id: string; now: number }) {
  const scope = `${id}:interior`;
  const v = React.useSyncExternalStore(subscribe, version, version);
  const stats = React.useMemo(() => auditStats(), [v]);
  const chain = React.useMemo(() => verifyChain(scope), [scope, v]);
  const trail = React.useMemo(() => auditTrail(scope, 8), [scope, v]);
  void now;

  const tiles: { l: string; val: string; ok: boolean }[] = [
    { l: 'Ledger integrity', val: stats.intact ? 'INTACT' : 'BROKEN', ok: stats.intact },
    { l: 'Audited scopes', val: `${stats.scopes}`, ok: true },
    { l: 'Total entries', val: stats.entries.toLocaleString(), ok: true },
    { l: 'Interior chain', val: chain.intact ? `OK · ${chain.entries}` : `BROKEN @${chain.brokenAt}`, ok: chain.intact },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(t => (
          <div key={t.l} className="rounded-[3px] border border-line bg-surface p-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-muted">{t.l}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums"
              style={{ color: t.ok ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{t.val}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[3px] border border-line bg-surface">
        <div className="border-b border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          Recent audit trail · {scope}
        </div>
        {trail.length === 0 ? (
          <p className="px-2 py-2 text-[11px] text-ink-muted">No ledger entries recorded for this Interior instance yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {trail.map(e => (
              <li key={e.seq} className="flex items-center gap-2 px-2 py-1 text-[11px]">
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">#{e.seq}</span>
                <span className="font-medium text-ink">{e.action}</span>
                <span className="truncate text-ink-muted">{e.subject}</span>
                <span className="ml-auto shrink-0 text-[10px] text-ink-muted">{e.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
