'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  recordDispatchRow, acknowledgeDispatchRow, closeDispatchRow,
  listDispatchesRows,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { DispatchRow, Priority } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { WatchStar } from '@/components/identity/WatchStar';
import { getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { priorityTone, dispatchStatusTone } from '@/lib/tone';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

const KINDS = ['unit-deploy', 'medical-evac', 'inspection', 'investigation', 'relief'];
const PRIORITIES: Priority[] = ['routine', 'priority', 'urgent', 'critical'];

/**
 * Dispatch Board — operator surface for the dispatch lifecycle.
 *
 * Composer records a new dispatch via record_dispatch. The list reads
 * civicos.dispatches live (Realtime + RLS scope: only the issuing or
 * target charter sees a dispatch, plus platform-tier roles). Inline
 * acknowledge / close actions advance the status.
 */
export function DispatchBoard() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<DispatchRow[]>([]);
  const [priorityFilter, setPriorityFilter] = React.useState<'all'|'critical'|'urgent'|'priority'|'routine'>(
    () => getPref('dispatch.priority', ['all','critical','urgent','priority','routine'] as const, 'all'));
  React.useEffect(() => { setPref('dispatch.priority', priorityFilter); }, [priorityFilter]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkReport, setBulkReport] = React.useState<{ ok: number; failed: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [busyRef, setBusyRef] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      setItems(await listDispatchesRows({ limit: 50 }));
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'dispatches' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Dispatch Board"
      message="The persistent substrate is not configured. Set the public Supabase env vars to surface the dispatch lifecycle here." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Dispatch Board" badge="durable · realtime" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ record dispatch'}
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={loading}
          >
            {loading ? 'refreshing…' : 'refresh'}
          </button>
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['ref','issuer','target','kind','priority','status','detail','dispatched_at','acknowledged_at','closed_at'],
                items.map(d => [d.ref, d.issued_by_charter_id, d.target_charter_id ?? '', d.kind, d.priority, d.status, d.detail ?? '', d.dispatched_at, d.acknowledged_at ?? '', d.closed_at ?? '']),
              );
              downloadCsv('civicos-dispatches', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
        </div>
      </div>

      {composerOpen ? (
        <DispatchComposer
          defaultIssuer={actor?.charterId ?? 'platform'}
          onDone={() => { setComposerOpen(false); void refresh(); }}
        />
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">
            {selected.size} selected
          </span>
          <span className="text-ink-muted">·</span>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              let ok = 0, failed = 0;
              for (const d of items.filter(x => selected.has(x.ref) && x.status === 'dispatched')) {
                try { (await acknowledgeDispatchRow(d.ref)) ? ok++ : failed++; } catch { failed++; }
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
              for (const d of items.filter(x => selected.has(x.ref) && x.status !== 'closed')) {
                try { (await closeDispatchRow(d.ref)) ? ok++ : failed++; } catch { failed++; }
              }
              setBulkReport({ ok, failed }); setSelected(new Set()); setBulkBusy(false);
              await refresh();
            }}>
            bulk close
          </button>
          <button type="button"
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
            onClick={() => { setSelected(new Set()); setBulkReport(null); }}>
            clear
          </button>
          {bulkReport ? <span className="font-mono text-ink-muted">· last: {bulkReport.ok} ok / {bulkReport.failed} failed</span> : null}
        </div>
      ) : null}

      <FilterChips label="priority:"
        options={['all','critical','urgent','priority','routine'] as const}
        value={priorityFilter}
        onChange={setPriorityFilter} />

      <Panel title="Dispatches" meta={`${(priorityFilter === 'all' ? items : items.filter(d => d.priority === priorityFilter)).length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No dispatches visible at the current scope. Record one above
            to create the first entry — it will appear here live.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {(priorityFilter === 'all' ? items : items.filter(d => d.priority === priorityFilter)).map(d => (
              <div
                key={d.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <input type="checkbox" aria-label={`select ${d.ref}`}
                  checked={selected.has(d.ref)}
                  onChange={e => {
                    const next = new Set(selected);
                    if (e.currentTarget.checked) next.add(d.ref); else next.delete(d.ref);
                    setSelected(next);
                  }} />
                <WatchStar kind="dispatch" ref={d.ref} label={d.detail ?? d.kind} />
                <a href={`/gov/dispatches/${encodeURIComponent(d.ref)}`}
                   className="w-28 shrink-0 truncate font-mono text-ink-soft hover:text-link hover:underline">
                  {d.ref}
                </a>
                <span className="w-28 shrink-0 truncate font-mono text-link no-underline">{d.issued_by_charter_id}</span>
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{d.target_charter_id ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{d.detail ?? d.kind}</span>
                <span
                  className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: priorityTone(d.priority) }}
                >
                  {d.priority}
                </span>
                <span
                  className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: dispatchStatusTone(d.status) }}
                >
                  {d.status}
                </span>
                <div className="flex w-32 shrink-0 justify-end gap-1">
                  {d.status === 'dispatched' ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyRef === d.ref}
                      onClick={async () => {
                        setBusyRef(d.ref);
                        try { await acknowledgeDispatchRow(d.ref); }
                        finally { setBusyRef(null); }
                      }}
                    >
                      ack
                    </button>
                  ) : null}
                  {d.status !== 'closed' ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyRef === d.ref}
                      onClick={async () => {
                        setBusyRef(d.ref);
                        try { await closeDispatchRow(d.ref); }
                        finally { setBusyRef(null); }
                      }}
                    >
                      close
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Dispatches are RLS-scoped: only the issuing or target charter
        sees a row, plus platform-tier roles (NOC, cabinet, auditor,
        platform-admin). The substrate decides who sees what.
      </p>
    </div>
  );
}

function DispatchComposer({
  defaultIssuer, onDone,
}: { defaultIssuer: string; onDone: () => void }) {
  const [ref, setRef] = React.useState(() => `DSP-${Date.now()}`);
  const [issuer, setIssuer] = React.useState(defaultIssuer);
  const [target, setTarget] = React.useState('');
  const [kind, setKind] = React.useState('unit-deploy');
  const [priority, setPriority] = React.useState<Priority>('priority');
  const [detail, setDetail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.trim()) { setError('detail required'); return; }
    setBusy(true);
    setError(null);
    try {
      const me = resolvedActor();
      const row = await recordDispatchRow({
        ref: ref.trim(), issuedByCharterId: issuer.trim(),
        issuedByOfficerId: me?.kind === 'officer' ? me.id : null,
        kind, priority, detail: detail.trim(),
        targetCharterId: target.trim() || null,
      });
      if (!row) { setError('record_dispatch failed (check console)'); return; }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Ref</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={ref} onChange={e => setRef(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Issuer charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={issuer} onChange={e => setIssuer(e.currentTarget.value)} required />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Target charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={target} onChange={e => setTarget(e.currentTarget.value)}
                 placeholder="optional" />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Kind</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={kind} onChange={e => setKind(e.currentTarget.value)}>
            {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Priority</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={priority} onChange={e => setPriority(e.currentTarget.value as Priority)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Detail</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
               value={detail} onChange={e => setDetail(e.currentTarget.value)} required
               placeholder="e.g. Unit 14 → grid 4N" />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'recording…' : 'record dispatch'}
        </button>
      </div>
    </form>
  );
}
