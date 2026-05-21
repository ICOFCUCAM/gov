'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkflowDefinitionsRows } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkflowDefinitionRow, WorkKind } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';

const KINDS: (WorkKind | 'all')[] = [
  'all', 'approval', 'case', 'procurement', 'encounter',
  'bill', 'judicial', 'incident', 'permit', 'field', 'lab',
];

interface WorkflowDef {
  terminal: string[];
  transitions: Record<string, Record<string, string>>;
}

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

/**
 * WorkflowCatalogue — every synced workflow_definition visualized.
 *
 * Left: list filtered by kind. Right: the selected workflow's
 * transition graph rendered as a stage-by-stage table. Terminal
 * stages are marked. Read-only today; the substrate has
 * sync_workflow_definition for upserts so an editor surface can
 * follow when needed.
 */
export function WorkflowCatalogue() {
  const { ready } = useIdentity();
  const [items, setItems] = React.useState<WorkflowDefinitionRow[]>([]);
  const [kindFilter, setKindFilter] = React.useState<WorkKind | 'all'>('all');
  const [active, setActive] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const opts: Parameters<typeof listWorkflowDefinitionsRows>[0] = { limit: 100 };
    if (kindFilter !== 'all') opts.kind = kindFilter;
    const rows = await listWorkflowDefinitionsRows(opts);
    setItems(rows);
    if (!active && rows.length > 0) setActive(rows[0]!.workflow_id);
  }, [available, kindFilter, active]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  if (!available) {
    return (
      <Panel title="Workflow Catalogue" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  const activeRow = items.find(i => i.workflow_id === active) ?? null;
  const def = activeRow ? activeRow.definition as unknown as WorkflowDef : null;
  const stages = def ? Object.keys(def.transitions) : [];
  const isTerminal = (s: string) => !!def?.terminal.includes(s);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Workflow Catalogue</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            substrate-authoritative
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">kind:</span>
        {KINDS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k as WorkKind | 'all')}
            className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider transition-colors"
            style={{
              borderColor: kindFilter === k ? TONE.link : 'rgb(var(--c-line))',
              color: kindFilter === k ? TONE.link : 'rgb(var(--c-ink-muted))',
            }}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <Panel title="Workflows" meta={`${items.length}`} bodyClass="!p-0">
          {items.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No workflow definitions in scope.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {items.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setActive(w.workflow_id)}
                  className="block w-full border-b border-line-soft px-3 py-1.5 text-left last:border-0 hover:bg-surface-2"
                  style={{ backgroundColor: w.workflow_id === active ? 'rgba(55,199,212,0.04)' : undefined }}
                >
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
                      {w.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-link">{w.workflow_id}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-ink">{w.title}</div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {activeRow && def ? (
          <Panel
            title={activeRow.title}
            meta={`${activeRow.workflow_id} · ${stages.length} stages`}
            bodyClass="!p-0"
          >
            <div className="border-b border-line-soft px-3 py-2 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Workflow ID" value={activeRow.workflow_id} mono />
                <Field label="Kind" value={activeRow.kind} />
                <Field label="Institution" value={activeRow.institution_charter_id} mono />
                <Field label="Archetype" value={activeRow.archetype ?? '—'} mono />
                {activeRow.blueprint_citation ? (
                  <Field label="Citation" value={activeRow.blueprint_citation} />
                ) : null}
                {activeRow.emits && activeRow.emits.length > 0 ? (
                  <Field label="Emits" value={activeRow.emits.join(', ')} mono />
                ) : null}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {stages.map(stage => {
                const tr = def.transitions[stage] ?? {};
                const actions = Object.keys(tr);
                return (
                  <div key={stage} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 shrink-0">{isTerminal(stage) ? '◼' : '◻'}</span>
                      <span className="min-w-0 flex-1 font-mono text-ink">{stage}</span>
                      {isTerminal(stage) ? (
                        <span className="text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.ok }}>terminal</span>
                      ) : null}
                    </div>
                    {actions.length > 0 ? (
                      <div className="ml-5 mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {actions.map(a => (
                          <div key={a} className="flex items-center gap-1 rounded-[3px] border border-line bg-surface px-2 py-0.5 font-mono text-[9px]">
                            <span style={{ color: actionTone(a) }}>{a}</span>
                            <span className="text-ink-muted">→</span>
                            <span className="text-ink">{tr[a]}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : (
          <Panel title="Selected workflow" meta="" bodyClass="!p-3">
            <p className="text-[11px] text-ink-muted">Select a workflow.</p>
          </Panel>
        )}
      </div>

      <p className="text-[10px] text-ink-muted">
        Each row reads <span className="font-mono">civicos.workflow_definitions</span>.
        These are the substrate-authoritative transition rules —
        <span className="font-mono"> transition_work_item</span> validates
        every action against the definition shown here before mutating
        the work-item state.
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
