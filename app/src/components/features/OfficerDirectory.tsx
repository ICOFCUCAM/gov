'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listOfficersRows } from '@/lib/db/repos/admin';
import { officerWorkload, type OfficerWorkloadEntry } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { OfficerRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

/** OfficerDirectory — read-only phone book grouped by charter.
 *  Non-admin counterpart to OfficerRegistry; everyone in the visible
 *  set is listed (RLS clips to the session's view). */
export function OfficerDirectory() {
  const { ready } = useIdentity();
  const [rows, setRows] = React.useState<OfficerRow[]>([]);
  const [load, setLoad] = React.useState<Record<string, OfficerWorkloadEntry>>({});
  const [q, setQ] = React.useState('');
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready) return;
    void listOfficersRows({ activeOnly: true, limit: 500 }).then(setRows);
    void officerWorkload().then(w => setLoad(
      Object.fromEntries(w.filter(e => e.assigneeId).map(e => [e.assigneeId as string, e])),
    ));
  }, [available, ready]);

  if (!available) {
    return <SubstrateNotConfigured title="Officer directory" />;
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
        <SurfaceHeading title="Officer directory" badge="read-only · by charter" />
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['id','name','email','role','charter_id','active','linked'],
                filtered.map(o => [o.id, o.name ?? '', o.email ?? '', o.role, o.charter_id ?? '', o.active, !!o.auth_user_id]),
              );
              downloadCsv('civicos-officers', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
          <input type="search"
                 value={q} onChange={e => setQ(e.currentTarget.value)}
                 placeholder="name, email, role, charter…"
                 className="w-64 rounded-[3px] border border-line bg-bg px-3 py-1 font-mono text-[11px]" />
        </div>
      </div>

      {Array.from(byCharter.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([charter, list]) => (
        <Panel key={charter} title={charter} meta={`${list.length}`} bodyClass="!p-0">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {[...list].sort((a, b) => (load[b.id]?.openItems ?? 0) - (load[a.id]?.openItems ?? 0)).map(o => (
              <Link key={o.id} href={`/gov/officers/${encodeURIComponent(o.id)}`}
                className="block bg-surface px-3 py-1.5 text-[10px] hover:bg-surface-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{o.name}</span>
                  <span className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: o.auth_user_id ? TONE.ok : TONE.warn }}>
                    {o.auth_user_id ? 'linked' : 'pending'}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-link">{o.role}</div>
                <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[9px] text-ink-muted">
                  <span className="truncate">{o.email ?? '—'}</span>
                  {load[o.id] ? (
                    <span className="shrink-0" style={{ color: load[o.id]!.highPriority > 0 ? TONE.alert : TONE.warn }}>
                      {load[o.id]!.openItems} open{load[o.id]!.highPriority > 0 ? ` · ${load[o.id]!.highPriority}!` : ''}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
