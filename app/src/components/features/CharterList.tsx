'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listInstitutionsRows } from '@/lib/db/repos/institutions';
import { substrateAvailable } from '@/lib/db/client';
import type { InstitutionRow, InstitutionKind } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { PostureBadge } from '@/components/identity/PostureBadge';
import { getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const KINDS: (InstitutionKind | 'all')[] = ['all','ministry','branch','agency','platform','officer','citizen'];

/** CharterList — quick jump table for every visible charter, grouped
 *  by kind, each row routing to /gov/charter/[id]. Lighter than the
 *  registry's two-pane view; designed to be the answer to "where do
 *  I go for the X charter?" */
export function CharterList() {
  const { ready } = useIdentity();
  const [rows, setRows] = React.useState<InstitutionRow[]>([]);
  const [kind, setKind] = React.useState<InstitutionKind | 'all'>(
    () => getPref<InstitutionKind | 'all'>('charter.kind',
      ['all','ministry','branch','agency','platform','officer','citizen'] as const, 'all'));
  React.useEffect(() => { setPref('charter.kind', kind); }, [kind]);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready) return;
    void listInstitutionsRows({}).then(setRows);
  }, [available, ready]);

  if (!available) {
    return <SubstrateNotConfigured title="Charters" />;
  }

  const filtered = kind === 'all' ? rows : rows.filter(r => r.kind === kind);
  const byKind = new Map<InstitutionKind, InstitutionRow[]>();
  for (const r of filtered) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Charters</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            jump table
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const csv = ['charter_id,kind,domain,activated,label',
                ...filtered.map(i => `${i.charter_id},${i.kind},${i.domain},${i.activated},${(i.label ?? '').replace(/,/g,';')}`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `civicos-charters-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
          <span className="font-mono text-[10px] text-ink-muted">{filtered.length} visible</span>
        </div>
      </div>

      <FilterChips label="kind:" options={KINDS} value={kind} onChange={setKind} />

      {Array.from(byKind.entries()).map(([k, list]) => (
        <Panel key={k} title={k} meta={`${list.length}`} bodyClass="!p-0">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {list.map(i => (
              <Link key={i.id} href={`/gov/charter/${encodeURIComponent(i.charter_id)}`}
                className="block bg-surface px-3 py-2 hover:bg-surface-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-link">{i.charter_id}</span>
                  <div className="flex items-center gap-1">
                    <PostureBadge charterId={i.charter_id} />
                    <span className="text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: i.activated ? TONE.ok : TONE.warn }}>
                      {i.activated ? 'live' : 'idle'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 truncate text-[10px] text-ink">{i.label}</div>
                <div className="mt-0.5 truncate font-mono text-[9px] text-ink-muted">
                  domain {i.domain} · archetype {i.archetype_or_branch}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
