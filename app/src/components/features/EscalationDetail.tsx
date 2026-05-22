'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  escalationById, acknowledgeEscalationRow, resolveEscalationRow, linkEscalationResponseRow,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { EscalationRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { WatchStar } from '@/components/identity/WatchStar';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { severityTone } from '@/lib/tone';

export function EscalationDetail({ id }: { id: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<EscalationRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setRow(await escalationById(id));
  }, [available, id]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'escalations' as const, filter: `id=eq.${id}` },
    ], [id]),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Escalation" />;
  }
  if (!row) {
    return (
      <Panel title="Escalation" meta={id} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No escalation with id <span className="font-mono">{id}</span> is
          visible at the current scope.{' '}
          <Link href="/gov/escalations" className="text-link underline">Back to floor</Link>
        </p>
      </Panel>
    );
  }

  const status = row.resolved_at ? 'resolved' : row.acknowledged_at ? 'acked' : 'open';
  const statusTone = row.resolved_at ? TONE.ok : row.acknowledged_at ? TONE.warn : TONE.alert;
  const canMutate = actor?.kind === 'officer';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Escalation</h2>
          <WatchStar kind="escalation" ref={row.id} label={row.reason} />
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: severityTone(row.severity), color: severityTone(row.severity) }}
          >
            {row.severity}
          </span>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: statusTone, color: statusTone }}
          >
            {status}
          </span>
        </div>
        <Link href="/gov/escalations" className="font-mono text-[10px] text-link underline">← floor</Link>
      </div>

      <Panel title="Reason" meta={row.id.slice(0, 8)} bodyClass="!p-3 text-[11px] space-y-2">
        <p className="text-ink">{row.reason}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Source" value={row.source_charter_id} mono />
          <Field label="Target" value={row.target_charter_id ?? '—'} mono />
          <Field label="Triggered by" value={row.triggered_by_actor ?? '—'} />
          <Field label="Triggered at" value={new Date(row.triggered_at).toLocaleString()} />
          {row.acknowledged_at ? <Field label="Acked at" value={new Date(row.acknowledged_at).toLocaleString()} /> : null}
          {row.resolved_at ? <Field label="Resolved at" value={new Date(row.resolved_at).toLocaleString()} /> : null}
          {row.linked_work_item_id ? (
            <div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Linked work item</div>
              <Link href="/gov/workbench" className="mt-0.5 block truncate font-mono text-[11px] text-link underline">
                {row.linked_work_item_id}
              </Link>
            </div>
          ) : null}
          {row.linked_dispatch_id ? (
            <div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Linked dispatch</div>
              <Link href="/gov/dispatches" className="mt-0.5 block truncate font-mono text-[11px] text-link underline">
                {row.linked_dispatch_id}
              </Link>
            </div>
          ) : null}
        </div>

        {canMutate ? (
          <div className="flex flex-wrap gap-1">
            {!row.acknowledged_at ? (
              <button type="button" disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const me = resolvedActor();
                    await acknowledgeEscalationRow(row.id, me?.kind === 'officer' ? me.id : null);
                  } finally { setBusy(false); }
                }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                ack
              </button>
            ) : null}
            {!row.resolved_at ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await resolveEscalationRow(row.id); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                resolve
              </button>
            ) : null}
            <LinkResponseForm escalationId={row.id} busy={busy} setBusy={setBusy} onDone={refresh} />
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

function LinkResponseForm({
  escalationId, busy, setBusy, onDone,
}: { escalationId: string; busy: boolean; setBusy: (b: boolean) => void; onDone: () => Promise<void> }) {
  const [ref, setRef] = React.useState('');
  const [kind, setKind] = React.useState<'dispatch' | 'work_item'>('dispatch');
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (!ref.trim()) return;
        setBusy(true);
        try {
          await linkEscalationResponseRow(escalationId,
            kind === 'dispatch' ? { dispatchRef: ref.trim() } : { workItemRef: ref.trim() });
          setRef('');
          await onDone();
        } finally { setBusy(false); }
      }}
      className="flex items-center gap-1">
      <select value={kind} onChange={e => setKind(e.currentTarget.value as 'dispatch' | 'work_item')}
        className="rounded-[3px] border border-line-soft bg-bg px-1 py-1 text-[9px]">
        <option value="dispatch">dispatch</option>
        <option value="work_item">work item</option>
      </select>
      <input value={ref} onChange={e => setRef(e.currentTarget.value)} placeholder="ref to link"
        className="w-28 rounded-[3px] border border-line-soft bg-bg px-2 py-1 font-mono text-[9px]" />
      <button type="submit" disabled={busy || !ref.trim()}
        className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
        link
      </button>
    </form>
  );
}
