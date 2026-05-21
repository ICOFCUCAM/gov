'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE } from '@/components/features/SituationRoom';
import { recentEventsRows, type PersistedEvent } from '@/lib/db/repos/events';
import { useRealtimeRefresh } from './useRealtimeRefresh';

/** ConstitutionalStrip — recent constitutional-channel signals.
 *  Compact horizontal strip suitable for embedding on home dashboards.
 *  Renders nothing when no constitutional signals have been recorded. */
export function ConstitutionalStrip({ limit = 4, className = '' }: { limit?: number; className?: string }) {
  const [events, setEvents] = React.useState<PersistedEvent[]>([]);

  const refresh = React.useCallback(async () => {
    setEvents(await recentEventsRows({ channel: 'constitutional', limit }));
  }, [limit]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'federation_events' as const, filter: 'channel=eq.constitutional' }], []),
    refresh,
  );

  if (events.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[10px] ${className}`}
      style={{ borderColor: TONE.warn }}>
      <span className="font-mono uppercase tracking-wider" style={{ color: TONE.warn }}>§ constitutional ·</span>
      {events.map(e => (
        <Link key={e.id} href={`/gov/federation/${e.id}`}
          className="inline-flex items-center gap-1 rounded-[3px] border border-line bg-bg px-1.5 py-0.5 font-mono text-[9px] hover:bg-surface-2">
          <span style={{ color: TONE.warn }}>{e.type.replace(/^constitutional\./, '')}</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-soft">{e.source}</span>
        </Link>
      ))}
      <Link href="/gov/constitutional"
        className="ml-auto text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
        view all
      </Link>
    </div>
  );
}
