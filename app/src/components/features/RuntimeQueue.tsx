'use client';

import * as React from 'react';
import { TONE } from '@/components/features/SituationRoom';
import {
  seedWorkItems, applyAction, actionsFor, queueStats, workflowFor,
  type WorkKind, type WorkItem, type ActionKey,
} from '@/lib/gov/runtime-workflow';

const ACTION_LABEL: Record<ActionKey, string> = {
  advance: 'Advance', approve: 'Approve', reject: 'Reject', escalate: 'Escalate',
  assign: 'Assign', resolve: 'Resolve', return: 'Return',
};
const C = (v: string | undefined, fb: string) => v ?? fb;
const ACTION_TONE: Record<ActionKey, string> = {
  advance: C(TONE.link, 'rgb(var(--c-link))'), approve: C(TONE.ok, 'rgb(var(--c-ok))'),
  reject: C(TONE.alert, 'rgb(var(--c-alert))'), escalate: C(TONE.warn, 'rgb(var(--c-warn))'),
  assign: C(TONE.link, 'rgb(var(--c-link))'), resolve: C(TONE.ok, 'rgb(var(--c-ok))'),
  return: C(TONE.warn, 'rgb(var(--c-warn))'),
};
const prTone = (p: WorkItem['priority']) => (p === 'urgent' ? TONE.alert : p === 'priority' ? TONE.warn : 'rgb(var(--c-ink-muted))');

/**
 * Executable runtime queue: a real work-item state machine the operator
 * drives — select an item, take an action, watch the procedural
 * transition and audit trail. Surfaces become an operating system.
 */
export function RuntimeQueue({
  scope, kind, title, by = 'Operator', n = 14,
}: { scope: string; kind: WorkKind; title: string; by?: string; n?: number }) {
  const [items, setItems] = React.useState<WorkItem[]>(() => seedWorkItems(scope, kind, 0, n));
  const [sel, setSel] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('open');
  const wf = workflowFor(kind);
  const stats = queueStats(items);

  const act = (id: string, action: ActionKey) => {
    setItems(prev => prev.map(it => (it.id === id ? applyAction(it, action, by, Date.now()) : it)));
  };

  const shown = items.filter(it =>
    filter === 'all' ? true : filter === 'open' ? !it.closed : filter === 'closed' ? it.closed : it.stage === filter,
  );
  const current = items.find(it => it.id === sel) ?? null;

  return (
    <div className="rounded-[3px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</span>
        <div className="flex items-center gap-2 text-[9px] text-ink-muted">
          <span>{stats.open} open</span>
          <span style={{ color: TONE.alert }}>{stats.urgent} urgent</span>
          <span style={{ color: TONE.warn }}>{stats.breaching} SLA</span>
          <span style={{ color: TONE.ok }}>{stats.closed} closed</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-line-soft px-3 py-1.5">
        {['open', 'all', 'closed', ...wf.stages].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider transition-colors"
            style={{ borderColor: filter === f ? TONE.link : 'rgb(var(--c-line))', color: filter === f ? TONE.link : 'rgb(var(--c-ink-muted))' }}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="max-h-[300px] overflow-y-auto border-line-soft lg:border-r">
          {shown.length === 0 ? <p className="px-3 py-3 text-[10px] text-ink-muted">No items in this view.</p> : shown.map(it => (
            <button key={it.id} onClick={() => setSel(it.id)}
              className="focus-ring flex w-full items-center gap-2 border-b border-line-soft px-3 py-1.5 text-left last:border-0"
              style={{ backgroundColor: sel === it.id ? 'color-mix(in srgb, rgb(var(--c-link)) 8%, transparent)' : undefined }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: prTone(it.priority) }} />
              <span className="w-16 shrink-0 font-mono text-[9px] tabular-nums text-ink-muted">{it.id}</span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-ink-soft">{it.title}</span>
              <span className="shrink-0 text-[8.5px] uppercase tracking-wider" style={{ color: it.closed ? TONE.ok : TONE.warn }}>{it.stage}</span>
            </button>
          ))}
        </div>
        <div className="p-3">
          {!current ? (
            <p className="text-[10px] text-ink-muted">Select a work item to execute its workflow.</p>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-ink-muted">{current.id}</span>
                  <span className="text-[8.5px] uppercase tracking-wider" style={{ color: prTone(current.priority) }}>{current.priority}</span>
                </div>
                <div className="text-[12px] font-semibold text-ink">{current.title}</div>
                <div className="text-[9px] text-ink-muted">{wf.label} · assignee {current.assignee} · age {current.ageHrs}h</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-ink-muted">Stage</span>
                <span className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `color-mix(in srgb, ${current.closed ? TONE.ok : TONE.warn} 16%, transparent)`, color: current.closed ? TONE.ok : TONE.warn }}>{current.stage}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {actionsFor(current.kind, current.stage).length === 0 ? (
                  <span className="text-[9px] text-ink-muted">Terminal state — no further actions.</span>
                ) : actionsFor(current.kind, current.stage).map(a => (
                  <button key={a} onClick={() => act(current.id, a)}
                    className="focus-ring rounded-[3px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors hover:bg-surface-2/60"
                    style={{ borderColor: ACTION_TONE[a], color: ACTION_TONE[a] }}>
                    {ACTION_LABEL[a]} →
                  </button>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Audit trail</div>
                {current.history.length === 0 ? (
                  <p className="text-[9px] text-ink-muted">No transitions yet — drive this item through its workflow.</p>
                ) : (
                  <ol className="space-y-0.5">
                    {current.history.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[9px]">
                        <span className="font-mono tabular-nums text-ink-muted">{new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span className="text-ink-soft">{h.from} → {h.to}</span>
                        <span className="text-ink-muted">· {h.action} · {h.by}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
