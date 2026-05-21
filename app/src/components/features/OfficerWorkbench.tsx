'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  listWorkItemsRows, listWorkflowDefinitionsRows,
  transitionWorkItemRow, workItemStepsRows,
} from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkItemRow, WorkItemStepRow, WorkflowDefinitionRow, ActionKey } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { transitionSignature } from '@/lib/db/signatures';
import { WatchStar } from '@/components/identity/WatchStar';
import { getBoolPref, setPref } from '@/lib/prefs';

interface WorkflowMap { terminal: string[]; transitions: Record<string, Record<string, string>> }

const priorityTone = (p: string) =>
  p === 'critical' || p === 'urgent' ? TONE.alert
  : p === 'priority' ? TONE.warn
  : TONE.link;

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

const SIGNATURE_ACTIONS = new Set<ActionKey>(['approve', 'reject', 'resolve']);

/**
 * OfficerWorkbench — execute the workflow on persistent work items.
 *
 * Lists open work_items in the officer's charter, with the workflow
 * definition's available actions inline per row. Clicking an action
 * calls transition_work_item — the substrate validates, signs (when
 * approve/reject/resolve), and emits the Realtime event that
 * refreshes this list and any other open surface.
 *
 * Selecting a row opens the step trail panel on the right with the
 * full audit history.
 */
export function OfficerWorkbench() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<WorkItemRow[]>([]);
  const [defs, setDefs] = React.useState<Map<string, WorkflowMap>>(new Map());
  const [active, setActive] = React.useState<string | null>(null);
  const [steps, setSteps] = React.useState<WorkItemStepRow[]>([]);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [openOnly, setOpenOnly] = React.useState(() => getBoolPref('workbench.openOnly', true));
  React.useEffect(() => { setPref('workbench.openOnly', openOnly); }, [openOnly]);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkReport, setBulkReport] = React.useState<{ ok: number; failed: number } | null>(null);
  const available = substrateAvailable();

  const refreshItems = React.useCallback(async () => {
    if (!available) return;
    const rows = await listWorkItemsRows({ closed: openOnly ? false : undefined, limit: 50 });
    setItems(rows);
    if (active && !rows.some(r => r.ref === active)) setActive(null);
  }, [available, openOnly, active]);

  const refreshDefs = React.useCallback(async () => {
    if (!available) return;
    const ws = await listWorkflowDefinitionsRows({ limit: 50 });
    const m = new Map<string, WorkflowMap>();
    for (const w of ws) m.set(w.workflow_id, w.definition as unknown as WorkflowMap);
    setDefs(m);
  }, [available]);

  React.useEffect(() => { if (ready) { void refreshItems(); void refreshDefs(); } },
    [ready, actor?.id, session?.user.id, refreshItems, refreshDefs]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'work_item_steps' as const },
    ], []),
    refreshItems,
  );

  React.useEffect(() => {
    if (!active) { setSteps([]); return; }
    void workItemStepsRows(active, 30).then(setSteps);
  }, [active, items]);

  if (!available) {
    return (
      <Panel title="Officer Workbench" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel title="Officer Workbench" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">
          Sign in as an officer to execute on persistent work items.
        </p>
        <a href="/sign-in?from=/gov/workbench"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }
  if (!actor || actor.kind !== 'officer') {
    return (
      <Panel title="Officer Workbench" meta="not an officer" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          This surface is for officers. Citizens use{' '}
          <span className="font-mono">/wallet/substrate</span>.
        </p>
      </Panel>
    );
  }

  const activeItem = items.find(i => i.ref === active) ?? null;
  const activeDef = activeItem ? defs.get(activeItem.workflow_id) ?? null : null;
  const availableActions = activeItem && activeDef
    ? Object.entries(activeDef.transitions[activeItem.current_stage] ?? {}) as [ActionKey, string][]
    : [];

  async function runBulk(action: ActionKey) {
    if (selected.size === 0) return;
    const targets = items.filter(w => selected.has(w.ref) && !w.closed);
    setBulkBusy(true);
    setBulkReport(null);
    let ok = 0, failed = 0;
    const me = resolvedActor();
    const actorId = me?.kind === 'officer' ? me.id : null;
    const wantsSig = SIGNATURE_ACTIONS.has(action) && actorId != null;
    try {
      for (const w of targets) {
        // Skip when the action isn't valid for this stage in the synced
        // definition — saves a substrate round-trip per misfit.
        const def = defs.get(w.workflow_id);
        if (!def || !def.transitions[w.current_stage]?.[action]) {
          failed += 1;
          continue;
        }
        const sig = wantsSig
          ? await transitionSignature({ actorId, scope: w.scope, ref: w.ref, action })
          : null;
        const result = await transitionWorkItemRow({
          ref: w.ref, action,
          actorName: me?.name ?? 'officer',
          actorId, actorRole: me?.role ?? null,
          detail: `bulk: ${w.current_stage} → ${action}`,
          requiresSignature: !!sig,
          signatureHash: sig?.hash ?? null,
          signedAt: sig ? new Date(sig.at).toISOString() : null,
        });
        if (result && result.ok) ok += 1; else failed += 1;
      }
    } finally {
      setBulkReport({ ok, failed });
      setSelected(new Set());
      setBulkBusy(false);
    }
  }

  async function take(action: ActionKey) {
    if (!activeItem) return;
    const me = resolvedActor();
    const actorId = me?.kind === 'officer' ? me.id : null;
    const wantsSig = SIGNATURE_ACTIONS.has(action) && actorId != null;
    setBusyAction(action);
    setLastError(null);
    try {
      const sig = wantsSig
        ? await transitionSignature({
            actorId,
            scope: activeItem.scope,
            ref: activeItem.ref,
            action,
          })
        : null;
      const result = await transitionWorkItemRow({
        ref: activeItem.ref, action,
        actorName: me?.name ?? 'officer',
        actorId,
        actorRole: me?.role ?? null,
        detail: `${activeItem.current_stage} → action ${action}`,
        requiresSignature: !!sig,
        signatureHash: sig?.hash ?? null,
        signedAt: sig ? new Date(sig.at).toISOString() : null,
      });
      if (result && !result.ok) {
        setLastError(`${result.reason}: ${result.message}`);
      }
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Officer Workbench</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            execute · sign · advance
          </span>
        </div>
        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
          <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.currentTarget.checked)} />
          open only
        </label>
      </div>

      <p className="font-mono text-[10px] text-ink-muted">
        scope: {actor.name} · {actor.role ?? 'officer'} · {actor.charterId ?? '—'}
      </p>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">
            {selected.size} selected
          </span>
          <span className="text-ink-muted">·</span>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => { await runBulk('advance'); }}>
            bulk advance
          </button>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => { await runBulk('resolve'); }}>
            bulk resolve
          </button>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={() => { setSelected(new Set()); setBulkReport(null); }}>
            clear
          </button>
          {bulkReport ? (
            <span className="font-mono text-ink-muted">
              · last: {bulkReport.ok} ok / {bulkReport.failed} failed
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_420px]">
        <Panel title="Work items" meta={`${items.length}`} bodyClass="!p-0">
          {items.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No work items visible at the current scope.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {items.map(w => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 hover:bg-surface-2"
                  style={{ backgroundColor: w.ref === active ? 'rgba(55,199,212,0.05)' : undefined }}
                >
                  <input
                    type="checkbox"
                    className="shrink-0"
                    aria-label={`select ${w.ref}`}
                    checked={selected.has(w.ref)}
                    onChange={e => {
                      const next = new Set(selected);
                      if (e.currentTarget.checked) next.add(w.ref); else next.delete(w.ref);
                      setSelected(next);
                    }}
                  />
                  <WatchStar kind="work-item" ref={w.ref} label={w.title} />
                  <button
                    type="button"
                    onClick={() => setActive(w.ref)}
                    className="block min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 text-[10px]">
                      <span
                        className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                        style={{ color: priorityTone(w.priority) }}
                      >
                        {w.priority}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{w.title}</span>
                      <span className="w-28 shrink-0 truncate text-right font-mono text-ink-soft">{w.current_stage}</span>
                      {w.closed ? (
                        <span className="w-14 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.ok }}>closed</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[9px] text-ink-muted">
                      {w.ref} · {w.scope}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          {activeItem ? (
            <Panel title={activeItem.title} meta={activeItem.ref} bodyClass="!p-3 text-[11px] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Workflow" value={activeItem.workflow_id} mono />
                <Field label="Stage" value={activeItem.current_stage} />
                <Field label="Scope" value={activeItem.scope} mono />
                <Field label="Originating" value={activeItem.originating_charter_id ?? '—'} mono />
                <Field label="Assignee" value={activeItem.assignee_name ?? '—'} />
                <Field label="Priority" value={activeItem.priority} />
              </div>

              {activeItem.closed ? (
                <p className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]" style={{ color: TONE.ok }}>
                  Item closed{activeItem.closed_at ? ` at ${new Date(activeItem.closed_at).toLocaleString()}` : ''}.
                </p>
              ) : availableActions.length === 0 ? (
                <p className="text-[10px] text-ink-muted">No actions available from this stage in the synced workflow.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {availableActions.map(([a, next]) => (
                    <button
                      key={a}
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => { void take(a); }}
                      className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider hover:bg-surface-2 disabled:opacity-50"
                      style={{ color: actionTone(a) }}
                    >
                      <span>{a}</span>
                      <span className="ml-1 text-ink-muted">→ {next}</span>
                      {SIGNATURE_ACTIONS.has(a) ? (
                        <span className="ml-1 text-ink-muted">⎈</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
              {lastError ? (
                <p className="rounded-[3px] border border-line bg-bg px-2 py-1 text-[10px]" style={{ color: TONE.alert }}>
                  {lastError}
                </p>
              ) : null}
            </Panel>
          ) : (
            <Panel title="Selected item" meta="" bodyClass="!p-3">
              <p className="text-[11px] text-ink-muted">Select a work item to take action.</p>
            </Panel>
          )}

          <Panel title="Step trail" meta={`${steps.length}`} bodyClass="!p-0">
            {steps.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-ink-muted">
                {activeItem ? 'No steps yet.' : 'Select a work item to see its history.'}
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {steps.map(s => (
                  <div key={s.id} className="border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                      <span className="w-20 shrink-0 truncate font-mono" style={{ color: actionTone(s.action) }}>{s.action}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-soft">{s.from_stage ?? '—'} → {s.to_stage}</span>
                      <span className="w-32 shrink-0 truncate text-right text-ink-muted">{s.actor_name}</span>
                    </div>
                    {s.signature_hash ? (
                      <div className="mt-0.5 font-mono text-[9px] text-ink-muted">
                        {s.signature_hash.length === 8 ? 'digest' : 'ECDSA'} ·{' '}
                        {s.signature_hash.slice(0, 24)}{s.signature_hash.length > 24 ? '…' : ''}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-[10px] text-ink-muted">
        Actions advance the work item through its stored workflow definition.
        Approve / reject / resolve trigger a WebCrypto ECDSA signature (⎈) when
        you have a registered key; transitions are validated against the
        definition server-side and recorded in the audit trail.
      </p>
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
