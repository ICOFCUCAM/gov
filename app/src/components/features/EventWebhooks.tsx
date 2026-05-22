'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';
import { FilterChips } from '@/components/ui/FilterChips';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import {
  listEventWebhooksRows, registerEventWebhookRow, setEventWebhookActiveRow,
  type EventWebhook,
} from '@/lib/db/repos/events';
import { ageMinutes } from '@/lib/format';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);
const CHANNELS = ['lifecycle', 'escalation', 'metric', 'runtime', 'constitutional'] as const;

/**
 * EventWebhooks — platform-tier surface to register outbound federation
 * webhooks and watch their delivery stats. Registration and listing go
 * straight through the SECURITY DEFINER RPCs (gated to platform-tier
 * inside the substrate); the secret is write-only and never read back.
 * The deliver-events cron does the actual HMAC-signed POSTing.
 */
export function EventWebhooks() {
  const { actor, ready } = useIdentity();
  const [hooks, setHooks] = React.useState<EventWebhook[]>([]);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try { setHooks(await listEventWebhooksRows()); }
    finally { setLoading(false); }
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  const isPlatform = !!actor && actor.kind === 'officer' && PLATFORM_ROLES.has(actor.role ?? '');

  if (!ready) return <p className="text-[11px] text-ink-muted">Resolving identity…</p>;

  if (!available) {
    return (
      <Panel title="Federation Webhooks" meta="not configured" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!isPlatform) {
    return (
      <Panel title="Federation Webhooks" meta="platform-tier only" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          Registering outbound webhooks requires a platform-tier role. You are{' '}
          <span className="font-mono">{actor ? actor.role ?? actor.kind : 'anonymous'}</span>.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Federation Webhooks" badge="outbound · HMAC-signed" />
        <button type="button" onClick={() => { void refresh(); }} disabled={loading}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
          {loading ? 'refreshing…' : 'refresh'}
        </button>
      </div>

      <p className="text-[10px] text-ink-muted">
        Each registered URL receives new federation events on its channel as
        an HTTP POST signed with <code className="font-mono">X-CivicOS-Signature: sha256=&lt;hmac&gt;</code>.
        The secret is write-only — it is never returned by the substrate.
        Delivery is at-least-once; consumers dedupe on <code className="font-mono">x-civicos-event-id</code>.
      </p>

      <RegisterForm onDone={refresh} />

      <Panel title="Registered webhooks" meta={`${hooks.length}`} bodyClass="!p-0">
        {hooks.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No webhooks registered.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {hooks.map(h => (
              <div key={h.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate font-mono text-link">{h.channel}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-ink">{h.url}</span>
                  <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: !h.active ? TONE.neutral : h.failures > 0 ? TONE.alert : TONE.ok }}>
                    {!h.active ? 'inactive' : h.failures > 0 ? `${h.failures} fail` : 'healthy'}
                  </span>
                  <button type="button"
                    onClick={async () => { await setEventWebhookActiveRow(h.id, !h.active); await refresh(); }}
                    className="focus-ring shrink-0 rounded-[3px] border border-line-soft px-1.5 py-0 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink">
                    {h.active ? 'pause' : 'resume'}
                  </button>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                  <span>delivered {h.deliveredCount}</span>
                  <span>· cursor @{h.cursorAtMs}</span>
                  {h.lastDeliveredAt ? <span>· last {ageMinutes(h.lastDeliveredAt)}m ago</span> : <span>· never delivered</span>}
                  {h.description ? <span>· {h.description}</span> : null}
                </div>
                {h.lastError ? <p className="mt-0.5 font-mono text-[9px]" style={{ color: TONE.alert }}>{h.lastError}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function RegisterForm({ onDone }: { onDone: () => Promise<void> }) {
  const [channel, setChannel] = React.useState<string>('constitutional');
  const [url, setUrl] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(false);
    if (!/^https?:\/\//.test(url.trim())) { setError('url must start with http(s)://'); return; }
    if (secret.trim().length < 8) { setError('secret must be at least 8 characters'); return; }
    setBusy(true);
    try {
      const id = await registerEventWebhookRow({
        channel, url: url.trim(), secret: secret.trim(),
        description: description.trim() || null,
      });
      if (!id) { setError('registration failed (insufficient privilege?)'); return; }
      setUrl(''); setSecret(''); setDescription(''); setOk(true);
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <FilterChips label="channel:" options={CHANNELS} value={channel as typeof CHANNELS[number]} onChange={setChannel} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Endpoint URL</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={url} onChange={e => setUrl(e.currentTarget.value)} placeholder="https://example.org/civicos-hook" required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Signing secret (write-only)</span>
          <input type="password" className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={secret} onChange={e => setSecret(e.currentTarget.value)} placeholder="≥ 8 chars" required />
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Description (optional)</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
          value={description} onChange={e => setDescription(e.currentTarget.value)} placeholder="who consumes this" />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      {ok ? <p className="text-[10px]" style={{ color: TONE.ok }}>registered</p> : null}
      <button type="submit" disabled={busy}
        className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
        {busy ? 'registering…' : 'register webhook'}
      </button>
    </form>
  );
}
