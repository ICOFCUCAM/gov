'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recentEventsRows, publishEventRow, type PersistedEvent } from '@/lib/db/repos/events';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { FilterChips } from '@/components/ui/FilterChips';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

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
  const [composerOpen, setComposerOpen] = React.useState(false);
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
        <div className="flex items-center gap-2">
          {actor?.kind === 'officer' && actor.role !== null && PLATFORM_ROLES.has(actor.role) ? (
            <button type="button" onClick={() => setComposerOpen(o => !o)}
              className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
              {composerOpen ? 'cancel' : '+ publish event'}
            </button>
          ) : null}
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={showPayload} onChange={e => setShowPayload(e.currentTarget.checked)} />
            payload
          </label>
        </div>
      </div>

      <FilterChips label="type:" options={['all', ...types]} value={typeFilter} onChange={setTypeFilter} />
      <FilterChips label="channel:" options={['all', ...channels]} value={channelFilter} onChange={setChannelFilter} />

      {composerOpen ? (
        <FederationComposer defaultSource={actor?.charterId ?? 'platform'} onDone={async () => { await refresh(); setComposerOpen(false); }} />
      ) : null}

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

function FederationComposer({ defaultSource, onDone }: { defaultSource: string; onDone: () => Promise<void> }) {
  const [type, setType] = React.useState('runtime.transition');
  const [channel, setChannel] = React.useState('runtime');
  const [source, setSource] = React.useState(defaultSource);
  const [target, setTarget] = React.useState('');
  const [payload, setPayload] = React.useState('{}');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let parsed: Record<string, unknown> = {};
    if (payload.trim()) {
      try { parsed = JSON.parse(payload); }
      catch (err) { setError('invalid JSON: ' + (err instanceof Error ? err.message : String(err))); return; }
    }
    setBusy(true);
    try {
      const row = await publishEventRow(type.trim(), source.trim(), channel.trim(), parsed, target.trim() || null);
      if (!row) setError('publish_event failed');
      else await onDone();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={type} onChange={e => setType(e.currentTarget.value)} placeholder="type" required />
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={channel} onChange={e => setChannel(e.currentTarget.value)} placeholder="channel" required />
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={source} onChange={e => setSource(e.currentTarget.value)} placeholder="source" required />
        <input className="rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
               value={target} onChange={e => setTarget(e.currentTarget.value)} placeholder="target (optional)" />
      </div>
      <textarea className="h-24 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]"
                value={payload} onChange={e => setPayload(e.currentTarget.value)} spellCheck={false} placeholder='{ "reason": "…" }' />
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'publishing…' : 'publish'}
        </button>
      </div>
    </form>
  );
}
