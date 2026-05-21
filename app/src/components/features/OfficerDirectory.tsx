'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listOfficersRows } from '@/lib/db/repos/admin';
import { substrateAvailable } from '@/lib/db/client';
import type { OfficerRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';

/** OfficerDirectory — read-only phone book grouped by charter.
 *  Non-admin counterpart to OfficerRegistry; everyone in the visible
 *  set is listed (RLS clips to the session's view). */
export function OfficerDirectory() {
  const { ready } = useIdentity();
  const [rows, setRows] = React.useState<OfficerRow[]>([]);
  const [q, setQ] = React.useState('');
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready) return;
    void listOfficersRows({ activeOnly: true, limit: 500 }).then(setRows);
  }, [available, ready]);

  if (!available) {
    return <Panel title="Officer directory" meta="not configured" bodyClass="!p-3"><p className="text-[10px] text-ink-muted">Substrate not configured.</p></Panel>;
  }

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter(o => `${o.name} ${o.email ?? ''} ${o.role} ${o.charter_id ?? ''}`.toLowerCase().includes(needle))
    : rows;

  const byCharter = new Map<string, OfficerRow[]>();
  for (const o of filtered) {
    const k = o.charter_id ?? '—';
    if (!byCharter.has(k)) byCharter.set(k, []);
    byCharter.get(k)!.push(o);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Officer directory</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            read-only · by charter
          </span>
        </div>
        <input type="search"
               value={q} onChange={e => setQ(e.currentTarget.value)}
               placeholder="name, email, role, charter…"
               className="w-64 rounded-[3px] border border-line bg-bg px-3 py-1 font-mono text-[11px]" />
      </div>

      {Array.from(byCharter.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([charter, list]) => (
        <Panel key={charter} title={charter} meta={`${list.length}`} bodyClass="!p-0">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {list.map(o => (
              <Link key={o.id} href={`/gov/officers/${encodeURIComponent(o.id)}`}
                className="block bg-surface px-3 py-1.5 text-[10px] hover:bg-surface-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{o.name}</span>
                  <span className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: o.auth_user_id ? TONE.ok : TONE.warn }}>
                    {o.auth_user_id ? 'linked' : 'pending'}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-link">{o.role}</div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-ink-muted">{o.email ?? '—'}</div>
              </Link>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
