'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { useIdentity } from '@/components/identity/useIdentity';
import {
  listWatch, subscribeWatch, toggleWatch, watchHref, type WatchEntry,
} from '@/lib/watchlist';
import { buildCsv, downloadCsv } from '@/lib/csv-download';

const kindTone: Record<WatchEntry['kind'], string | undefined> = {
  'work-item': TONE.link,
  directive: TONE.warn,
  dispatch: TONE.warn,
  escalation: TONE.alert,
  'service-request': TONE.link,
  appeal: TONE.warn,
};

/** /gov/watchlist — everything starred for the signed-in actor on this
 *  device. Per-device by design; survives reload, doesn't cross devices. */
export function Watchlist() {
  const { actor, session } = useIdentity();
  const [entries, setEntries] = React.useState<WatchEntry[]>([]);

  const refresh = React.useCallback(() => {
    setEntries(actor ? listWatch(actor.id) : []);
  }, [actor]);

  React.useEffect(() => { refresh(); return subscribeWatch(refresh); }, [refresh]);

  if (!session) {
    return (
      <Panel title="Watchlist" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">Sign in to use the per-device watchlist.</p>
        <a href="/sign-in?from=/gov/watchlist"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Watchlist</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            per-device · this identity
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={entries.length === 0}
            onClick={() => {
              const csv = buildCsv(
                ['kind','ref','label','added_at'],
                entries.map(e => [e.kind, e.ref, e.label ?? '', new Date(e.addedAt).toISOString()]),
              );
              downloadCsv('civicos-watchlist', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            csv
          </button>
          <span className="font-mono text-[10px] text-ink-muted">{entries.length} starred</span>
        </div>
      </div>

      <Panel title="Starred records" meta={`${entries.length}`} bodyClass="!p-0">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            Nothing starred yet. Click the ☆ on any record detail page
            (work item, directive, dispatch, escalation, service request,
            appeal) and it lands here for quick access on this device.
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {entries.map(e => (
              <div key={e.kind + ':' + e.ref}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <span className="w-24 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: kindTone[e.kind] }}>
                  {e.kind}
                </span>
                <Link href={watchHref(e)}
                  className="w-32 shrink-0 truncate font-mono text-link hover:underline">
                  {e.ref}
                </Link>
                <span className="min-w-0 flex-1 truncate text-ink">{e.label}</span>
                <span className="w-20 shrink-0 text-right font-mono tabular-nums text-ink-muted">
                  {new Date(e.addedAt).toLocaleDateString()}
                </span>
                <button type="button"
                  className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink"
                  onClick={() => actor && toggleWatch(actor.id, e)}>
                  unstar
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
