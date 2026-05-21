'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  recordEscalationRow, acknowledgeEscalationRow, resolveEscalationRow,
  listEscalationsRows,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { EscalationRow, Severity } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { WatchStar } from '@/components/identity/WatchStar';

const severityTone = (s: string) =>
  s === 'national' ? TONE.alert
  : s === 'major'  ? TONE.alert
  : s === 'minor'  ? TONE.warn
  : TONE.link;

const SEVERITIES: Severity[] = ['watch', 'minor', 'major', 'national'];

export function EscalationFloor() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<EscalationRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkReport, setBulkReport] = React.useState<{ ok: number; failed: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [openOnly, setOpenOnly] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      setItems(await listEscalationsRows({ limit: 50, openOnly }));
    } finally {
      setLoading(false);
    }
  }, [available, openOnly]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'escalations' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Escalation Floor" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">
          The persistent substrate is not configured. Set the public
          Supabase env vars to surface escalations here.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Escalation Floor</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            durable · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.currentTarget.checked)} />
            open only
          </label>
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ record escalation'}
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={loading}
          >
            {loading ? 'refreshing…' : 'refresh'}
          </button>
        </div>
      </div>

      {composerOpen ? (
        <EscalationComposer
          defaultSource={actor?.charterId ?? 'platform'}
          onDone={() => { setComposerOpen(false); void refresh(); }}
        />
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">{selected.size} selected</span>
          <span className="text-ink-muted">·</span>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              const me = resolvedActor();
              let ok = 0, failed = 0;
              for (const x of items.filter(i => selected.has(i.id) && !i.acknowledged_at)) {
                try { (await acknowledgeEscalationRow(x.id, me?.kind === 'officer' ? me.id : null)) ? ok++ : failed++; } catch { failed++; }
              }
              setBulkReport({ ok, failed }); setSelected(new Set()); setBulkBusy(false);
              await refresh();
            }}>
            bulk ack
          </button>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              let ok = 0, failed = 0;
              for (const x of items.filter(i => selected.has(i.id) && !i.resolved_at)) {
                try { (await resolveEscalationRow(x.id)) ? ok++ : failed++; } catch { failed++; }
              }
              setBulkReport({ ok, failed }); setSelected(new Set()); setBulkBusy(false);
              await refresh();
            }}>
            bulk resolve
          </button>
          <button type="button"
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
            onClick={() => { setSelected(new Set()); setBulkReport(null); }}>
            clear
          </button>
          {bulkReport ? <span className="font-mono text-ink-muted">· last: {bulkReport.ok} ok / {bulkReport.failed} failed</span> : null}
        </div>
      ) : null}

      <Panel title="Escalations" meta={`${items.length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No escalations visible at the current scope.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {items.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <input type="checkbox" aria-label={`select ${e.id.slice(0,8)}`}
                  checked={selected.has(e.id)}
                  onChange={ev => {
                    const next = new Set(selected);
                    if (ev.currentTarget.checked) next.add(e.id); else next.delete(e.id);
                    setSelected(next);
                  }} />
                <WatchStar kind="escalation" ref={e.id} label={e.reason} />
                <span
                  className="w-20 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: severityTone(e.severity) }}
                >
                  {e.severity}
                </span>
                <span className="w-32 shrink-0 truncate font-mono text-link no-underline">{e.source_charter_id}</span>
                <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{e.target_charter_id ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{e.reason}</span>
                <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: e.resolved_at ? TONE.ok : e.acknowledged_at ? TONE.warn : TONE.alert }}>
                  {e.resolved_at ? 'resolved' : e.acknowledged_at ? 'acked' : 'open'}
                </span>
                <div className="flex w-28 shrink-0 justify-end gap-1">
                  {!e.acknowledged_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === e.id}
                      onClick={async () => {
                        setBusyId(e.id);
                        try {
                          const me = resolvedActor();
                          await acknowledgeEscalationRow(e.id, me?.kind === 'officer' ? me.id : null);
                        } finally { setBusyId(null); }
                      }}>
                      ack
                    </button>
                  ) : null}
                  {!e.resolved_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === e.id}
                      onClick={async () => {
                        setBusyId(e.id);
                        try { await resolveEscalationRow(e.id); }
                        finally { setBusyId(null); }
                      }}>
                      resolve
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Escalations are RLS-scoped to source/target charter and platform-tier roles.
      </p>
    </div>
  );
}

function EscalationComposer({
  defaultSource, onDone,
}: { defaultSource: string; onDone: () => void }) {
  const [source, setSource] = React.useState(defaultSource);
  const [target, setTarget] = React.useState('');
  const [severity, setSeverity] = React.useState<Severity>('minor');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('reason required'); return; }
    setBusy(true);
    setError(null);
    try {
      const me = resolvedActor();
      const row = await recordEscalationRow({
        sourceCharterId: source.trim(),
        targetCharterId: target.trim() || null,
        severity, reason: reason.trim(),
        triggeredByActor: me?.name ?? null,
      });
      if (!row) { setError('record_escalation failed'); return; }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Source charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={source} onChange={e => setSource(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Target charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={target} onChange={e => setTarget(e.currentTarget.value)} placeholder="optional" />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Severity</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={severity} onChange={e => setSeverity(e.currentTarget.value as Severity)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Reason</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
               value={reason} onChange={e => setReason(e.currentTarget.value)} required
               placeholder="e.g. threshold breached" />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'recording…' : 'record escalation'}
        </button>
      </div>
    </form>
  );
}
