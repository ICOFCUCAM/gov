'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { serviceRequestByRef, updateServiceRequestRow } from '@/lib/db/repos/citizen';
import { workItemsByIds } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { ServiceRequestRow, WorkItemRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { WatchStar } from '@/components/identity/WatchStar';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

export function ServiceRequestDetail({ ref: srRef }: { ref: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<ServiceRequestRow | null>(null);
  const [linked, setLinked] = React.useState<WorkItemRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const r = await serviceRequestByRef(srRef);
    setRow(r);
    if (r?.linked_work_item_id) {
      const items = await workItemsByIds([r.linked_work_item_id]);
      setLinked(items[0] ?? null);
    } else {
      setLinked(null);
    }
  }, [available, srRef]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
    ], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Service request" />;
  }
  if (!row) {
    return (
      <Panel title="Service request" meta={srRef} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No service request with ref <span className="font-mono">{srRef}</span> is
          visible at the current scope.{' '}
          <Link href="/gov/intake" className="text-link underline">Back to intake</Link>
        </p>
      </Panel>
    );
  }

  const canMutate = actor?.kind === 'officer';
  const tone = row.resolved_at ? TONE.ok : row.acknowledged_at ? TONE.warn : TONE.link;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.title ?? row.service}</h2>
          <WatchStar kind="service-request" ref={row.ref} label={row.title ?? row.service} />
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: tone, color: tone }}
          >
            {row.status}
          </span>
        </div>
        <Link href="/gov/intake" className="font-mono text-[10px] text-link underline">← intake</Link>
      </div>

      <Panel title="Metadata" meta={row.ref} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Ref" value={row.ref} mono />
          <Field label="Service" value={row.service} />
          <Field label="Domain" value={row.domain ?? '—'} />
          <Field label="Target charter" value={row.target_charter_id} mono />
          <Field label="Submitted" value={new Date(row.submitted_at).toLocaleString()} />
          {row.acknowledged_at ? <Field label="Acked" value={new Date(row.acknowledged_at).toLocaleString()} /> : null}
          {row.resolved_at ? <Field label="Resolved" value={new Date(row.resolved_at).toLocaleString()} /> : null}
          {row.satisfaction != null ? <Field label="Satisfaction" value={String(row.satisfaction)} /> : null}
        </div>

        {linked ? (
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Linked work item</div>
            <Link href={`/gov/items/${encodeURIComponent(linked.ref)}`}
              className="mt-0.5 inline-flex items-center gap-2 rounded-[3px] border border-line px-2 py-1 font-mono text-[11px] text-link hover:bg-surface-2">
              <span>{linked.ref}</span>
              <span className="text-ink-muted">·</span>
              <span style={{ color: linked.closed ? TONE.ok : TONE.link }}>{linked.current_stage}</span>
            </Link>
          </div>
        ) : null}

        {canMutate ? (
          <div className="flex flex-wrap gap-1">
            {!row.acknowledged_at ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await updateServiceRequestRow({ ref: row.ref, status: 'in-progress' }); await refresh(); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                ack
              </button>
            ) : null}
            {!row.resolved_at ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await updateServiceRequestRow({ ref: row.ref, status: 'resolved' }); await refresh(); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                resolve
              </button>
            ) : null}
            {!row.resolved_at ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await updateServiceRequestRow({ ref: row.ref, status: 'rejected' }); await refresh(); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                reject
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
