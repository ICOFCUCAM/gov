'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { useIdentity } from '@/components/identity/useIdentity';
import { listWatch, subscribeWatch, watchHref, type WatchEntry } from '@/lib/watchlist';

const kindTone: Record<WatchEntry['kind'], string | undefined> = {
  'work-item': TONE.link,
  directive: TONE.warn,
  dispatch: TONE.warn,
  escalation: TONE.alert,
  'service-request': TONE.link,
  appeal: TONE.warn,
};

/** Compact "Starred" panel for embedding in home dashboards. */
export function WatchedRecords({ limit = 6 }: { limit?: number }) {
  const { actor } = useIdentity();
  const [entries, setEntries] = React.useState<WatchEntry[]>([]);
  React.useEffect(() => {
    const refresh = () => setEntries(actor ? listWatch(actor.id).slice(0, limit) : []);
    refresh();
    return subscribeWatch(refresh);
  }, [actor, limit]);

  if (!actor) return null;

  // Tally by kind across the full watchlist, not just the displayed slice.
  const all = listWatch(actor.id);
  const tallies = all.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc;
  }, {});

  return (
    <Panel title="Starred" meta={`${all.length}`} bodyClass="!p-0">
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-[11px] text-ink-muted">
          Nothing starred. Click ☆ on any record detail page to add it here.
        </p>
      ) : (
        <div>
          {Object.keys(tallies).length > 1 ? (
            <div className="flex flex-wrap items-center gap-1 border-b border-line-soft px-3 py-1.5">
              {(Object.entries(tallies).sort(([, a], [, b]) => b - a)).map(([k, n]) => (
                <span key={k}
                  className="rounded-[3px] border border-line bg-bg px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider"
                  style={{ color: kindTone[k as WatchEntry['kind']] }}>
                  {k} · {n}
                </span>
              ))}
            </div>
          ) : null}
          {entries.map(e => (
            <Link key={e.kind + ':' + e.ref} href={watchHref(e)}
              className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: kindTone[e.kind] }}>
                  {e.kind}
                </span>
                <span className="w-32 shrink-0 truncate font-mono text-link">{e.ref}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{e.label}</span>
              </div>
            </Link>
          ))}
          <Link href="/gov/watchlist"
            className="block border-t border-line-soft px-3 py-1 text-center text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            view all
          </Link>
        </div>
      )}
    </Panel>
  );
}
