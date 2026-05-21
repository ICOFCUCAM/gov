'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkflowDefinitionsRows } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkflowDefinitionRow, ActionKey } from '@/lib/db/types';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';

interface WorkflowMap { terminal: string[]; transitions: Record<string, Record<string, string>> }

interface SimulationStep {
  seq: number;
  from: string | null;
  to: string;
  action: ActionKey | '(open)';
  terminal: boolean;
}

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

/**
 * WorkflowSimulator — dry-run a transition path against a synced
 * workflow definition. Pure client-side; reads workflow_definitions
 * via the existing public view and walks the transitions map in JS,
 * showing the operator exactly what the substrate would accept.
 *
 * Useful when authoring or debugging a definition before publishing.
 * No writes; no side effects.
 */
export function WorkflowSimulator() {
  const [defs, setDefs] = React.useState<WorkflowDefinitionRow[]>([]);
  const [workflowId, setWorkflowId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('wf') ?? '';
  });
  const [trace, setTrace] = React.useState<SimulationStep[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) return;
    void listWorkflowDefinitionsRows({ limit: 100 }).then(rows => {
      setDefs(rows);
      // Honour the URL-supplied workflowId if it matches a synced
      // definition; otherwise fall back to the first one.
      setWorkflowId(prev => {
        if (prev && rows.some(r => r.workflow_id === prev)) return prev;
        return rows[0]?.workflow_id ?? '';
      });
    });
  }, [available]);

  const def = React.useMemo<WorkflowMap | null>(() => {
    const found = defs.find(d => d.workflow_id === workflowId);
    return found ? (found.definition as unknown as WorkflowMap) : null;
  }, [defs, workflowId]);

  const stages = def ? Object.keys(def.transitions) : [];
  const initialStage = stages[0] ?? '';

  // Sync selection into the URL so the page is shareable.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !workflowId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('wf') !== workflowId) {
      url.searchParams.set('wf', workflowId);
      window.history.replaceState(null, '', url.toString());
    }
  }, [workflowId]);

  // Reset trace when workflow changes.
  React.useEffect(() => {
    if (!def) { setTrace([]); return; }
    setTrace([{ seq: 1, from: null, to: initialStage, action: '(open)', terminal: def.terminal.includes(initialStage) }]);
    setError(null);
  }, [def, initialStage]);

  const current = trace[trace.length - 1]?.to ?? initialStage;
  const availableActions = def && current
    ? Object.entries(def.transitions[current] ?? {}) as [ActionKey, string][]
    : [];
  const closed = !!def && def.terminal.includes(current);

  function take(action: ActionKey) {
    if (!def || closed) return;
    const next = def.transitions[current]?.[action];
    if (!next) { setError(`invalid: ${action} from ${current}`); return; }
    setError(null);
    setTrace(t => [...t, {
      seq: t.length + 1, from: current, to: next, action,
      terminal: def.terminal.includes(next),
    }]);
  }

  function reset() {
    if (!def) return;
    setTrace([{ seq: 1, from: null, to: initialStage, action: '(open)', terminal: def.terminal.includes(initialStage) }]);
    setError(null);
  }

  if (!available) {
    return <SubstrateNotConfigured title="Workflow simulator" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Workflow simulator</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            dry-run · no writes
          </span>
        </div>
        <button type="button"
          onClick={reset}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
          reset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[260px_1fr]">
        <Panel title="Workflow" meta={`${defs.length}`} bodyClass="!p-3 text-[11px]">
          <select className="w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={workflowId} onChange={e => setWorkflowId(e.currentTarget.value)}>
            {defs.map(d => <option key={d.id} value={d.workflow_id}>{d.workflow_id} · {d.kind}</option>)}
          </select>
          {def ? (
            <p className="mt-2 text-[10px] text-ink-muted">
              {stages.length} stages, {def.terminal.length} terminal.
              Initial stage: <span className="font-mono text-ink">{initialStage}</span>.
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-ink-muted">No workflow selected.</p>
          )}
        </Panel>

        <Panel title="Available actions" meta={`from ${current}`} bodyClass="!p-3 text-[11px]">
          {closed ? (
            <p className="text-[10px]" style={{ color: TONE.ok }}>
              Terminal state reached: <span className="font-mono">{current}</span>.
            </p>
          ) : availableActions.length === 0 ? (
            <p className="text-[10px] text-ink-muted">No actions defined from this stage.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {availableActions.map(([a, next]) => (
                <button key={a} type="button" onClick={() => take(a)}
                  className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider hover:bg-surface-2"
                  style={{ color: actionTone(a) }}>
                  <span>{a}</span>
                  <span className="ml-1 text-ink-muted">→ {next}</span>
                </button>
              ))}
            </div>
          )}
          {error ? (
            <p className="mt-2 text-[10px]" style={{ color: TONE.alert }}>{error}</p>
          ) : null}
        </Panel>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={trace.length === 0}
          onClick={() => {
            const csv = buildCsv(
              ['seq','action','from','to','terminal'],
              trace.map(s => [s.seq, s.action, s.from ?? '', s.to, s.terminal]),
            );
            downloadCsv(`civicos-sim-${workflowId || 'trace'}`, csv);
          }}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
          trace csv
        </button>
      </div>

      <Panel title="Simulated trace" meta={`${trace.length} steps`} bodyClass="!p-0">
        {trace.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">Select a workflow.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {trace.map(s => (
              <div key={s.seq} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                <span className="w-20 shrink-0 truncate font-mono" style={{ color: actionTone(String(s.action)) }}>{s.action}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{s.from ?? '—'} → <span className="text-ink">{s.to}</span></span>
                {s.terminal ? (
                  <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.ok }}>terminal</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        This view never writes to the substrate. It walks the same transition
        map the <span className="font-mono">civicos.transition_work_item</span>
        contract validates against, so any path the simulator accepts is one
        the substrate will accept.
      </p>
    </div>
  );
}
