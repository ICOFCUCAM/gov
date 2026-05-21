'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recentEventsRows, publishEventRow, type PersistedEvent } from '@/lib/db/repos/events';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

const KIND_OPTIONS = [
  'sovereignty-breach', 'separation-violation', 'amendment-proposed',
  'constitutional-review', 'judicial-supremacy', 'cabinet-overreach',
];

/**
 * ConstitutionalDesk — emit and observe events on the 'constitutional'
 * federation channel. These are the highest-tier signals the substrate
 * carries: things constitutional bodies and the apex of the executive
 * need to register without losing forever.
 *
 * Issue path is gated UI-side to platform-tier officers; the substrate's
 * publish_event RPC is open to anyone authenticated, so the gating is
 * advisory — strict server-side gating could be added later via a
 * dedicated record_constitutional_signal RPC.
 */
export function ConstitutionalDesk() {
  const { actor, ready } = useIdentity();
  const [events, setEvents] = React.useState<PersistedEvent[]>([]);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const available = substrateAvailable();
  const isPlatform = actor?.kind === 'officer' && actor.role !== null && PLATFORM_ROLES.has(actor.role);

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setEvents(await recentEventsRows({ channel: 'constitutional', limit: 100 }));
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'federation_events' as const, filter: 'channel=eq.constitutional' }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Constitutional desk" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Constitutional desk</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            channel · constitutional
          </span>
        </div>
        {isPlatform ? (
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ register signal'}
          </button>
        ) : null}
      </div>

      {composerOpen && isPlatform ? (
        <ConstitutionalComposer
          defaultSource={actor?.charterId ?? 'platform'}
          onDone={async () => { await refresh(); setComposerOpen(false); }}
        />
      ) : null}

      <Panel title="Signals on the constitutional channel" meta={`${events.length}`} bodyClass="!p-0">
        {events.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No constitutional signals registered yet.
            {isPlatform ? ' Use the composer to register one.' : ' Only platform-tier officers can register.'}
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {events.map(e => (
              <div key={e.id} className="border-b border-line-soft px-3 py-2 last:border-0 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                    {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-44 shrink-0 truncate font-mono text-link">{e.type}</span>
                  <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{e.source}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {e.target ? `→ ${e.target}` : ''}
                  </span>
                </div>
                {e.payload && Object.keys(e.payload).length > 0 ? (
                  <pre className="mt-1 overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[9px] text-ink-muted">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Signals here are <span className="font-mono">federation_events</span> on
        channel <span className="font-mono">constitutional</span>. They appear in{' '}
        <Link href="/gov/federation" className="text-link underline">/gov/federation</Link>{' '}
        and contribute to the operational record without going through any
        operational state machine. Reserved for events that warrant durable
        record at the constitutional tier.
      </p>
    </div>
  );
}

function ConstitutionalComposer({
  defaultSource, onDone,
}: { defaultSource: string; onDone: () => Promise<void> }) {
  const [source, setSource] = React.useState(defaultSource);
  const [target, setTarget] = React.useState('');
  const [type, setType] = React.useState(KIND_OPTIONS[0]!);
  const [detail, setDetail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.trim()) { setError('detail required'); return; }
    setBusy(true); setError(null);
    try {
      const me = resolvedActor();
      const row = await publishEventRow(
        `constitutional.${type}`, source.trim(), 'constitutional',
        { detail: detail.trim(), by: me?.name ?? null, role: me?.role ?? null },
        target.trim() || null,
      );
      if (!row) { setError('publish_event failed'); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Source</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={source} onChange={e => setSource(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Target (optional)</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={target} onChange={e => setTarget(e.currentTarget.value)} />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Kind</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={type} onChange={e => setType(e.currentTarget.value)}>
            {KIND_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Detail</span>
        <textarea className="mt-1 h-24 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={detail} onChange={e => setDetail(e.currentTarget.value)} required />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'registering…' : 'register signal'}
        </button>
      </div>
    </form>
  );
}
