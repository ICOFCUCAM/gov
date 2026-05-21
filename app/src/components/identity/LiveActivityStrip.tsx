'use client';

import * as React from 'react';
import Link from 'next/link';
import { recentEventsRows, type PersistedEvent } from '@/lib/db/repos/events';
import { useRealtimeRefresh } from './useRealtimeRefresh';

/** Compact strip showing the most recent federation events. Drop-in
 *  anywhere a sense of liveness is wanted. SSR-safe; refreshes on
 *  Realtime federation_events. */
export function LiveActivityStrip({ limit = 5, className = '' }: { limit?: number; className?: string }) {
  const [events, setEvents] = React.useState<PersistedEvent[]>([]);

  const refresh = React.useCallback(async () => {
    setEvents(await recentEventsRows({ limit }));
  }, [limit]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'federation_events' as const }], []),
    refresh,
  );

  if (events.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-1.5 text-[10px] ${className}`}>
      <span className="font-mono uppercase tracking-wider text-ink-muted">live ·</span>
      {events.map(e => (
        <Link key={e.id} href={`/gov/federation/${e.id}`}
          className="inline-flex items-center gap-1 rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-ink-soft hover:text-link hover:bg-surface-2"
          title={`${e.source}${e.target ? ' → ' + e.target : ''} · ${new Date(e.at).toLocaleString()}`}>
          <span>{e.type}</span>
        </Link>
      ))}
    </div>
  );
}
