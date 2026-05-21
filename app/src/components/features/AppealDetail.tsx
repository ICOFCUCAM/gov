'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { appealByRef, decideAppealRow } from '@/lib/db/repos/citizen';
import { workItemsByIds } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { AppealRow, WorkItemRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { WatchStar } from '@/components/identity/WatchStar';

export function AppealDetail({ ref: appealRef }: { ref: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<AppealRow | null>(null);
  const [linked, setLinked] = React.useState<WorkItemRow | null>(null);
  const [decision, setDecision] = React.useState('upheld');
  const [reasoning, setReasoning] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const r = await appealByRef(appealRef);
    setRow(r);
    if (r?.linked_work_item_id) {
      const items = await workItemsByIds([r.linked_work_item_id]);
      setLinked(items[0] ?? null);
    } else {
      setLinked(null);
    }
  }, [available, appealRef]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_items' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Appeal" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }
  if (!row) {
    return (
      <Panel title="Appeal" meta={appealRef} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No appeal with ref <span className="font-mono">{appealRef}</span> is
          visible at the current scope.{' '}
          <Link href="/gov/intake" className="text-link underline">Back to intake</Link>
        </p>
      </Panel>
    );
  }

  const canDecide = actor?.kind === 'officer' && !row.decided_at;
  const tone = row.decided_at ? TONE.ok : TONE.warn;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.ground}</h2>
          <WatchStar kind="appeal" ref={row.ref} label={row.ground} />
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
          <Field label="Originating charter" value={row.originating_charter_id} mono />
          <Field label="Decision ref" value={row.originating_decision_ref ?? '—'} mono />
          <Field label="Filed" value={new Date(row.filed_at).toLocaleString()} />
          {row.admitted_at ? <Field label="Admitted" value={new Date(row.admitted_at).toLocaleString()} /> : null}
          {row.heard_at ? <Field label="Heard" value={new Date(row.heard_at).toLocaleString()} /> : null}
          {row.decided_at ? <Field label="Decided" value={new Date(row.decided_at).toLocaleString()} /> : null}
          {row.published_at ? <Field label="Published" value={new Date(row.published_at).toLocaleString()} /> : null}
          {row.decision ? <Field label="Decision" value={row.decision} /> : null}
        </div>

        {row.reasoning ? (
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Reasoning</div>
            <p className="mt-1 text-[11px] text-ink">{row.reasoning}</p>
          </div>
        ) : null}

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

        {canDecide ? (
          <form
            className="grid grid-cols-[160px_1fr_auto] gap-2 rounded-[3px] border border-line bg-surface p-2"
            onSubmit={async e => {
              e.preventDefault();
              if (!reasoning.trim()) return;
              setBusy(true);
              try { await decideAppealRow(row.ref, decision, reasoning.trim(), true); await refresh(); }
              finally { setBusy(false); }
            }}>
            <select className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                    value={decision} onChange={e => setDecision(e.currentTarget.value)}>
              <option value="upheld">upheld</option>
              <option value="rejected">rejected</option>
              <option value="remanded">remanded</option>
            </select>
            <input className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                   placeholder="reasoning"
                   value={reasoning} onChange={e => setReasoning(e.currentTarget.value)} required />
            <button type="submit" disabled={busy}
                    className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
              {busy ? '…' : 'decide'}
            </button>
          </form>
        ) : null}
      </Panel>
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
