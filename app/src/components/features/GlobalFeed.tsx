'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable } from '@/lib/db/client';
import { listWorkItemsRows } from '@/lib/db/repos/work-items';
import {
  listDirectivesRows, listDispatchesRows, listEscalationsRows,
} from '@/lib/db/repos/memory';
import { recentEventsRows } from '@/lib/db/repos/events';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';

interface FeedItem {
  id: string;
  kind: 'work-item' | 'directive' | 'dispatch' | 'escalation' | 'federation';
  href: string;
  title: string;
  detail: string;
  at: number;
  tone: string | undefined;
}

const KIND_TONE: Record<FeedItem['kind'], string | undefined> = {
  'work-item': TONE.link,
  directive: TONE.warn,
  dispatch: TONE.warn,
  escalation: TONE.alert,
  federation: TONE.neutral,
};

/** GlobalFeed — single unified stream merging the lifecycle tables +
 *  federation events into one chronological feed. Each row links to
 *  its surface; kinds tally up top. RLS shapes what flows in. */
export function GlobalFeed() {
  const { ready } = useIdentity();
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [kindFilter, setKindFilter] = React.useState<FeedItem['kind'] | 'all'>(
    () => getPref<FeedItem['kind'] | 'all'>('global.kind', ['all','work-item','directive','dispatch','escalation','federation'] as const, 'all'));
  React.useEffect(() => { setPref('global.kind', kindFilter); }, [kindFilter]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [wi, dr, ds, es, fe] = await Promise.all([
      listWorkItemsRows({ limit: 30 }),
      listDirectivesRows({ limit: 30 }),
      listDispatchesRows({ limit: 30 }),
      listEscalationsRows({ limit: 30 }),
      recentEventsRows({ limit: 30 }),
    ]);
    const merged: FeedItem[] = [
      ...wi.map(w => ({ id: 'wi:' + w.id, kind: 'work-item' as const,
        href: `/gov/items/${encodeURIComponent(w.ref)}`,
        title: w.title, detail: `${w.scope} · ${w.current_stage}`,
        at: new Date(w.updated_at).getTime(), tone: KIND_TONE['work-item'] })),
      ...dr.map(d => ({ id: 'dr:' + d.id, kind: 'directive' as const,
        href: `/gov/directives/${encodeURIComponent(d.ref)}`,
        title: d.title, detail: `${d.issued_by_charter_id} · ${d.status}`,
        at: new Date(d.updated_at).getTime(), tone: KIND_TONE['directive'] })),
      ...ds.map(d => ({ id: 'ds:' + d.id, kind: 'dispatch' as const,
        href: `/gov/dispatches/${encodeURIComponent(d.ref)}`,
        title: d.detail ?? d.kind,
        detail: `${d.issued_by_charter_id}${d.target_charter_id ? ' → ' + d.target_charter_id : ''}`,
        at: new Date(d.dispatched_at).getTime(), tone: KIND_TONE['dispatch'] })),
      ...es.map(e => ({ id: 'es:' + e.id, kind: 'escalation' as const,
        href: `/gov/escalations/${e.id}`,
        title: e.reason, detail: `${e.severity} · ${e.source_charter_id}`,
        at: new Date(e.triggered_at).getTime(), tone: KIND_TONE['escalation'] })),
      ...fe.map(e => ({ id: 'fe:' + e.id, kind: 'federation' as const,
        href: `/gov/federation/${e.id}`,
        title: e.type, detail: `${e.source}${e.target ? ' → ' + e.target : ''} · ${e.channel}`,
        at: e.at, tone: KIND_TONE['federation'] })),
    ];
    merged.sort((a, b) => b.at - a.at);
    setItems(merged.slice(0, 120));
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'directives' as const },
      { table: 'dispatches' as const },
      { table: 'escalations' as const },
      { table: 'federation_events' as const },
    ], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Global feed" />;
  }

  const tallies = items.reduce<Record<FeedItem['kind'], number>>((acc, i) => {
    acc[i.kind] = (acc[i.kind] ?? 0) + 1; return acc;
  }, { 'work-item': 0, directive: 0, dispatch: 0, escalation: 0, federation: 0 });
  const filtered = kindFilter === 'all' ? items : items.filter(i => i.kind === kindFilter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Global feed</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            unified · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['at','kind','title','detail'],
                items.map(i => [new Date(i.at).toISOString(), i.kind, i.title ?? '', i.detail ?? '']),
              );
              downloadCsv('civicos-global', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
          <span className="font-mono text-[10px] text-ink-muted">{items.length} entries</span>
        </div>
      </div>

      <FilterChips
        options={['all','work-item','directive','dispatch','escalation','federation'] as const}
        value={kindFilter}
        onChange={setKindFilter}
        format={k => `${k}${k !== 'all' ? ` · ${tallies[k]}` : ` · ${items.length}`}`} />

      <Panel title="Recent across the substrate" meta={`${filtered.length}`} bodyClass="!p-0">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">Nothing in scope.</p>
        ) : (
          <div className="max-h-[640px] overflow-y-auto">
            {filtered.map(it => (
              <Link key={it.id} href={it.href}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                    {new Date(it.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-20 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: it.tone }}>
                    {it.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink">{it.title}</span>
                  <span className="w-40 shrink-0 truncate text-right font-mono text-ink-soft">{it.detail}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
