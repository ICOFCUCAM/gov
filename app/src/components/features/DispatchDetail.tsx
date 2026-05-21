'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  dispatchByRef, acknowledgeDispatchRow, closeDispatchRow,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { DispatchRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

const statusTone = (s: string) =>
  s === 'closed' ? TONE.ok
  : s === 'acknowledged' ? TONE.link
  : s === 'dispatched' ? TONE.warn
  : TONE.neutral;

const priorityTone = (p: string) =>
  p === 'critical' || p === 'urgent' ? TONE.alert
  : p === 'priority' ? TONE.warn
  : TONE.link;

export function DispatchDetail({ ref: dispatchRef }: { ref: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<DispatchRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setRow(await dispatchByRef(dispatchRef));
  }, [available, dispatchRef]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'dispatches' as const, filter: `ref=eq.${dispatchRef}` },
    ], [dispatchRef]),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Dispatch" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }
  if (!row) {
    return (
      <Panel title="Dispatch" meta={dispatchRef} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No dispatch with ref <span className="font-mono">{dispatchRef}</span> is
          visible at the current scope.{' '}
          <Link href="/gov/dispatches" className="text-link underline">Back to board</Link>
        </p>
      </Panel>
    );
  }

  const canMutate = actor?.kind === 'officer';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.detail ?? row.kind}</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: priorityTone(row.priority), color: priorityTone(row.priority) }}
          >
            {row.priority}
          </span>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: statusTone(row.status), color: statusTone(row.status) }}
          >
            {row.status}
          </span>
        </div>
        <Link href="/gov/dispatches" className="font-mono text-[10px] text-link underline">← board</Link>
      </div>

      <Panel title="Metadata" meta={row.ref} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Ref" value={row.ref} mono />
          <Field label="Kind" value={row.kind} />
          <Field label="Issuer" value={row.issued_by_charter_id} mono />
          <Field label="Target charter" value={row.target_charter_id ?? '—'} mono />
          <Field label="Dispatched" value={new Date(row.dispatched_at).toLocaleString()} />
          {row.acknowledged_at ? <Field label="Acked" value={new Date(row.acknowledged_at).toLocaleString()} /> : null}
          {row.on_scene_at ? <Field label="On scene" value={new Date(row.on_scene_at).toLocaleString()} /> : null}
          {row.closed_at ? <Field label="Closed" value={new Date(row.closed_at).toLocaleString()} /> : null}
        </div>

        {canMutate ? (
          <div className="flex flex-wrap gap-1">
            {row.status === 'dispatched' ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await acknowledgeDispatchRow(row.ref); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                ack
              </button>
            ) : null}
            {row.status !== 'closed' ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await closeDispatchRow(row.ref); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                close
              </button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {row.payload && Object.keys(row.payload).length > 0 ? (
        <Panel title="Payload" meta="jsonb" bodyClass="!p-3 text-[10px]">
          <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono">{JSON.stringify(row.payload, null, 2)}</pre>
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
