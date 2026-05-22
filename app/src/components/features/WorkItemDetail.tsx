'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  workItemRow, workItemStepsRows, listWorkflowDefinitionsRows,
  transitionWorkItemRow, claimWorkItemRow,
} from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkItemRow, WorkItemStepRow, ActionKey } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { transitionSignature } from '@/lib/db/signatures';
import { WatchStar } from '@/components/identity/WatchStar';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

interface WorkflowMap { terminal: string[]; transitions: Record<string, Record<string, string>> }

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

const SIGNATURE_ACTIONS = new Set<ActionKey>(['approve', 'reject', 'resolve']);

/**
 * WorkItemDetail — single-record drill-in for /gov/items/[ref].
 *
 * Shows everything the substrate knows about a work item: metadata,
 * available transition actions, full step trail with signatures,
 * linkage. Actions are taken in-place by an officer with permission
 * — the substrate's transition contract validates against the synced
 * workflow definition and returns a typed rejection if invalid.
 *
 * Same Realtime / RLS / signing model as OfficerWorkbench, but
 * focused on one item rather than a queue.
 */
export function WorkItemDetail({ ref: itemRef }: { ref: string }) {
  const { actor, ready } = useIdentity();
  const [item, setItem] = React.useState<WorkItemRow | null>(null);
  const [steps, setSteps] = React.useState<WorkItemStepRow[]>([]);
  const [def, setDef] = React.useState<WorkflowMap | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const w = await workItemRow(itemRef);
    setItem(w);
    if (w) {
      const [ss, defs] = await Promise.all([
        workItemStepsRows(itemRef, 100),
        listWorkflowDefinitionsRows({ limit: 100 }),
      ]);
      setSteps(ss);
      const found = defs.find(d => d.workflow_id === w.workflow_id);
      setDef(found ? (found.definition as unknown as WorkflowMap) : null);
    }
  }, [available, itemRef]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const, filter: `ref=eq.${itemRef}` },
      { table: 'work_item_steps' as const },
    ], [itemRef]),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Work item" />;
  }

  if (!item) {
    return (
      <Panel title="Work item" meta={itemRef} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No work item with ref <span className="font-mono">{itemRef}</span> is
          visible at the current scope. It may not exist, or RLS may be
          clipping it.{' '}
          <Link href="/gov/workbench" className="text-link underline">Back to workbench</Link>
        </p>
      </Panel>
    );
  }

  const availableActions = def
    ? Object.entries(def.transitions[item.current_stage] ?? {}) as [ActionKey, string][]
    : [];

  async function take(action: ActionKey) {
    if (!item) return;
    const me = resolvedActor();
    const actorId = me?.kind === 'officer' ? me.id : null;
    const wantsSig = SIGNATURE_ACTIONS.has(action) && actorId != null;
    setBusy(true); setError(null);
    try {
      const sig = wantsSig
        ? await transitionSignature({ actorId, scope: item.scope, ref: item.ref, action })
        : null;
      const result = await transitionWorkItemRow({
        ref: item.ref, action,
        actorName: me?.name ?? 'officer',
        actorId, actorRole: me?.role ?? null,
        detail: `${item.current_stage} → action ${action}`,
        requiresSignature: !!sig,
        signatureHash: sig?.hash ?? null,
        signedAt: sig ? new Date(sig.at).toISOString() : null,
      });
      if (result && !result.ok) setError(`${result.reason}: ${result.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    if (!item) return;
    setBusy(true); setError(null);
    try {
      const updated = await claimWorkItemRow(item.ref);
      if (!updated) setError('claim failed — you must be a linked officer and the item must be open');
      else await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{item.title}</h2>
          <WatchStar kind="work-item" ref={item.ref} label={item.title} />
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            work item · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/gov/audit?scope=${encodeURIComponent(item.scope)}`}
            className="font-mono text-[10px] text-link underline">audit ↗</Link>
          <Link href="/gov/workbench" className="font-mono text-[10px] text-link underline">← workbench</Link>
        </div>
      </div>

      <Panel title="Metadata" meta={item.ref} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Stage" value={item.current_stage} />
          <Field label="Priority" value={item.priority} />
          <Field label="Closed" value={item.closed ? 'yes' : 'no'} />
          <Field label="Workflow" value={item.workflow_id} mono />
          <Field label="Kind" value={item.kind} />
          <Field label="Scope" value={item.scope} mono />
          <Field label="Originating" value={item.originating_charter_id ?? '—'} mono />
          <Field label="Assignee" value={item.assignee_name ?? '—'} />
          <Field label="Created" value={new Date(item.created_at).toLocaleString()} />
        </div>

        {!item.closed && actor?.kind === 'officer' && item.assignee_id !== actor.id ? (
          <button type="button" onClick={() => { void claim(); }} disabled={busy}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
            {item.assignee_id ? 'assign to me' : 'claim'}
          </button>
        ) : null}

        {item.closed ? (
          <p className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]" style={{ color: TONE.ok }}>
            Item closed{item.closed_at ? ` at ${new Date(item.closed_at).toLocaleString()}` : ''}.
          </p>
        ) : availableActions.length === 0 ? (
          <p className="text-[10px] text-ink-muted">No actions available from this stage in the synced workflow.</p>
        ) : actor?.kind !== 'officer' ? (
          <p className="text-[10px] text-ink-muted">Sign in as an officer to take action on this item.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {availableActions.map(([a, next]) => (
              <button
                key={a}
                type="button"
                disabled={busy}
                onClick={() => { void take(a); }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider hover:bg-surface-2 disabled:opacity-50"
                style={{ color: actionTone(a) }}
              >
                <span>{a}</span>
                <span className="ml-1 text-ink-muted">→ {next}</span>
                {SIGNATURE_ACTIONS.has(a) ? <span className="ml-1 text-ink-muted">⎈</span> : null}
              </button>
            ))}
          </div>
        )}
        {error ? (
          <p className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]" style={{ color: TONE.alert }}>
            {error}
          </p>
        ) : null}
      </Panel>

      <Panel title="Step trail" meta={`${steps.length}`} bodyClass="!p-0">
        {steps.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No steps recorded.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {steps.map(s => (
              <div key={s.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                  <span className="w-20 shrink-0 truncate font-mono" style={{ color: actionTone(s.action) }}>{s.action}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{s.from_stage ?? '—'} → {s.to_stage}</span>
                  <span className="w-32 shrink-0 truncate text-right text-ink-muted">{s.actor_name}</span>
                  <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">
                    {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {s.signature_hash ? (
                  <div className="mt-0.5 font-mono text-[9px] text-ink-muted">
                    {s.signature_hash.length === 8 ? 'digest' : 'ECDSA'} · {s.signature_hash.slice(0, 24)}{s.signature_hash.length > 24 ? '…' : ''}
                  </div>
                ) : null}
                {s.detail ? (
                  <div className="mt-0.5 text-[9.5px] text-ink-soft">{s.detail}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {typeof item.meta?.serviceRequestRef === 'string' ? (
        <Panel title="Linked service request" meta={String(item.meta.serviceRequestRef)} bodyClass="!p-3 text-[11px]">
          <Link href={`/gov/intake/request/${encodeURIComponent(String(item.meta.serviceRequestRef))}`}
                className="inline-flex items-center gap-2 rounded-[3px] border border-line px-2 py-1 font-mono text-link hover:bg-surface-2">
            <span>{String(item.meta.serviceRequestRef)}</span>
            <span className="text-ink-muted">→</span>
            <span className="text-ink">open</span>
          </Link>
          <p className="mt-2 text-[10px] text-ink-muted">
            This work item was opened by the citizen→work-item bridge when
            the corresponding service request was submitted.
          </p>
        </Panel>
      ) : null}

      {item.meta && Object.keys(item.meta).length > 0 ? (
        <Panel title="Meta" meta="payload" bodyClass="!p-3 text-[10px]">
          <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono">{JSON.stringify(item.meta, null, 2)}</pre>
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
