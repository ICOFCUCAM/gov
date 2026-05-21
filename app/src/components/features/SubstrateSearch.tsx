'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable } from '@/lib/db/client';
import { substrateSearch, type SearchHit, type SearchHitKind } from '@/lib/db/search';
import { getPref, setPref } from '@/lib/prefs';

const kindTone: Record<SearchHitKind, string | undefined> = {
  'work-item': TONE.link,
  directive: TONE.warn,
  dispatch: TONE.warn,
  escalation: TONE.alert,
  'service-request': TONE.link,
  appeal: TONE.warn,
  institution: TONE.ok,
  officer: TONE.ok,
};

/**
 * SubstrateSearch — cross-table search across the lifecycle records.
 *
 * Single text box; fans out to civicos_work_items, civicos_directives,
 * civicos_dispatches, civicos_escalations, civicos_service_requests,
 * civicos_appeals, civicos_institutions, civicos_officers. Each row
 * links to the surface that owns the underlying record. RLS clips
 * what each viewer sees.
 */
export function SubstrateSearch() {
  const [q, setQ] = React.useState('');
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [kindFilter, setKindFilter] = React.useState<SearchHitKind | 'all'>(
    () => getPref<SearchHitKind | 'all'>('search.kind',
      ['all','work-item','directive','dispatch','escalation','service-request','appeal','institution','officer'] as const, 'all'));
  React.useEffect(() => { setPref('search.kind', kindFilter); }, [kindFilter]);
  const available = substrateAvailable();

  // Debounced search-on-change.
  React.useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const handle = setTimeout(async () => {
      setBusy(true);
      try { setHits(await substrateSearch(q.trim())); }
      finally { setBusy(false); }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  if (!available) {
    return (
      <Panel title="Search" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  const filtered = kindFilter === 'all' ? hits : hits.filter(h => h.kind === kindFilter);
  const tallies = hits.reduce<Record<SearchHitKind, number>>((acc, h) => {
    acc[h.kind] = (acc[h.kind] ?? 0) + 1; return acc;
  }, {
    'work-item': 0, directive: 0, dispatch: 0, escalation: 0,
    'service-request': 0, appeal: 0, institution: 0, officer: 0,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Search</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            cross-table · RLS-scoped
          </span>
          {busy ? <span className="text-[9px] uppercase tracking-wider text-ink-muted">searching…</span> : null}
        </div>
      </div>

      <input
        type="search"
        autoFocus
        placeholder="ref, title, charter, email, scope…"
        value={q}
        onChange={e => setQ(e.currentTarget.value)}
        className="w-full rounded-[3px] border border-line bg-bg px-3 py-2 font-mono text-[12px]"
      />

      {hits.length === 0 ? (
        q.trim() && !busy ? (
          <p className="text-[10px] text-ink-muted">No matches. RLS may be clipping results outside your scope.</p>
        ) : (
          <p className="text-[10px] text-ink-muted">
            Searches the lifecycle tables: work items, directives, dispatches,
            escalations, service requests, appeals, institutions, officers.
          </p>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1">
            {(['all','work-item','directive','dispatch','escalation','service-request','appeal','institution','officer'] as const).map(k => (
              <button key={k} type="button" onClick={() => setKindFilter(k)}
                className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
                style={{
                  borderColor: kindFilter === k ? TONE.link : 'rgb(var(--c-line))',
                  color: kindFilter === k ? TONE.link : 'rgb(var(--c-ink-muted))',
                }}>
                {k}{k !== 'all' ? ` · ${tallies[k]}` : ` · ${hits.length}`}
              </button>
            ))}
          </div>

          <Panel title="Matches" meta={`${filtered.length}`} bodyClass="!p-0">
            <div className="max-h-[560px] overflow-y-auto">
              {filtered.map(h => (
                <Link key={h.kind + ':' + h.id} href={h.href}
                  className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: kindTone[h.kind] }}>
                      {h.kind}
                    </span>
                    <span className="w-32 shrink-0 truncate font-mono text-link">{h.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{h.label}</span>
                    <span className="w-40 shrink-0 truncate text-right font-mono text-ink-soft">{h.detail}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
