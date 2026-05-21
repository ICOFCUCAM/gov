'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recentEventsRows, type PersistedEvent } from '@/lib/db/repos/events';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

const channelTone = (c: string) =>
  c === 'escalation' ? TONE.alert
  : c === 'metric' ? TONE.warn
  : c === 'constitutional' ? TONE.link
  : c === 'lifecycle' ? TONE.ok
  : TONE.neutral;

/**
 * FederationStream — the inter-institutional event log, live.
 *
 * federation_events is the platform's broadcast fabric: app.registered,
 * institution.escalation, runtime.transition, constitutional.signal,
 * etc. The substrate publishes every entry on supabase_realtime, so
 * subscribers see traffic land at the wire's natural latency.
 *
 * Two filter dimensions (type, channel) and a payload-detail toggle.
 * RLS is broad on federation_events by design — operational fabric is
 * visible to every authenticated session.
 */
export function FederationStream() {
  const { actor, session, ready } = useIdentity();
  const [events, setEvents] = React.useState<PersistedEvent[]>([]);
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [channelFilter, setChannelFilter] = React.useState<string>('all');
  const [showPayload, setShowPayload] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const rows = await recentEventsRows({
      type: typeFilter === 'all' ? undefined : typeFilter,
      channel: channelFilter === 'all' ? undefined : channelFilter,
      limit: 100,
    });
    setEvents(rows);
  }, [available, typeFilter, channelFilter]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'federation_events' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Federation Stream" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  const types = Array.from(new Set(events.map(e => e.type))).sort();
  const channels = Array.from(new Set(events.map(e => e.channel))).sort();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Federation Stream</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            inter-institutional · realtime
          </span>
        </div>
        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
          <input type="checkbox" checked={showPayload} onChange={e => setShowPayload(e.currentTarget.checked)} />
          payload
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">type:</span>
        {['all', ...types].map(t => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)}
            className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
            style={{
              borderColor: typeFilter === t ? TONE.link : 'rgb(var(--c-line))',
              color: typeFilter === t ? TONE.link : 'rgb(var(--c-ink-muted))',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">channel:</span>
        {['all', ...channels].map(c => (
          <button key={c} type="button" onClick={() => setChannelFilter(c)}
            className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
            style={{
              borderColor: channelFilter === c ? TONE.link : 'rgb(var(--c-line))',
              color: channelFilter === c ? TONE.link : 'rgb(var(--c-ink-muted))',
            }}>
            {c}
          </button>
        ))}
      </div>

      <Panel title="Events" meta={`${events.length}`} bodyClass="!p-0">
        {events.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No federation events match the filter.</p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {events.map(e => (
              <div key={e.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center gap-2">
                  <a href={`/gov/federation/${e.id}`}
                     className="w-16 shrink-0 font-mono tabular-nums text-ink-muted hover:text-link hover:underline">
                    {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </a>
                  <span
                    className="w-24 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: channelTone(e.channel) }}
                  >
                    {e.channel}
                  </span>
                  <span className="w-44 shrink-0 truncate font-mono text-ink">{e.type}</span>
                  <span className="w-32 shrink-0 truncate font-mono text-link">{e.source}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">
                    {e.target ? `→ ${e.target}` : ''}
                  </span>
                </div>
                {showPayload && Object.keys(e.payload).length > 0 ? (
                  <pre className="mt-0.5 overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[9px] text-ink-muted">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Reads <span className="font-mono">civicos.federation_events</span> live.
        Every publish — from any service in any session — appears here at
        Realtime latency.
      </p>
    </div>
  );
}
