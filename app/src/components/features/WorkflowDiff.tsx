'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkflowDefinitionsRows } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkflowDefinitionRow } from '@/lib/db/types';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

interface DiffEntry { kind: 'added' | 'removed' | 'changed'; path: string; lhs?: string; rhs?: string }

interface WorkflowMap { terminal: string[]; transitions: Record<string, Record<string, string>> }

function diff(lhs: WorkflowMap | null, rhs: WorkflowMap | null): DiffEntry[] {
  const out: DiffEntry[] = [];
  if (!lhs || !rhs) return out;
  // Terminal stages.
  const lTerm = new Set(lhs.terminal);
  const rTerm = new Set(rhs.terminal);
  for (const t of lTerm) if (!rTerm.has(t)) out.push({ kind: 'removed', path: `terminal[${t}]`, lhs: t });
  for (const t of rTerm) if (!lTerm.has(t)) out.push({ kind: 'added',   path: `terminal[${t}]`, rhs: t });
  // Stages.
  const stages = new Set([...Object.keys(lhs.transitions), ...Object.keys(rhs.transitions)]);
  for (const stage of stages) {
    const l = lhs.transitions[stage] ?? {};
    const r = rhs.transitions[stage] ?? {};
    if (Object.keys(l).length > 0 && Object.keys(r).length === 0) {
      out.push({ kind: 'removed', path: `stage[${stage}]`, lhs: Object.keys(l).join(',') });
      continue;
    }
    if (Object.keys(l).length === 0 && Object.keys(r).length > 0) {
      out.push({ kind: 'added', path: `stage[${stage}]`, rhs: Object.keys(r).join(',') });
      continue;
    }
    const actions = new Set([...Object.keys(l), ...Object.keys(r)]);
    for (const a of actions) {
      const lv = l[a], rv = r[a];
      if (lv && !rv) out.push({ kind: 'removed', path: `${stage}.${a}`, lhs: lv });
      else if (!lv && rv) out.push({ kind: 'added', path: `${stage}.${a}`, rhs: rv });
      else if (lv && rv && lv !== rv) out.push({ kind: 'changed', path: `${stage}.${a}`, lhs: lv, rhs: rv });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const tone = (k: DiffEntry['kind']) => k === 'added' ? TONE.ok : k === 'removed' ? TONE.alert : TONE.warn;
const sigil = (k: DiffEntry['kind']) => k === 'added' ? '+' : k === 'removed' ? '−' : '~';

/** WorkflowDiff — pick two synced workflow_definitions and compare
 *  their transition maps. Pure client-side diff; useful when
 *  authoring revisions or auditing changes. */
export function WorkflowDiff() {
  const [defs, setDefs] = React.useState<WorkflowDefinitionRow[]>([]);
  const [a, setA] = React.useState<string>('');
  const [b, setB] = React.useState<string>('');
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) return;
    void listWorkflowDefinitionsRows({ limit: 200 }).then(rows => {
      setDefs(rows);
      if (rows[0]) setA(rows[0].workflow_id);
      if (rows[1]) setB(rows[1].workflow_id);
    });
  }, [available]);

  if (!available) {
    return <SubstrateNotConfigured title="Workflow diff" />;
  }

  const lhs = defs.find(d => d.workflow_id === a);
  const rhs = defs.find(d => d.workflow_id === b);
  const lDef = lhs ? lhs.definition as unknown as WorkflowMap : null;
  const rDef = rhs ? rhs.definition as unknown as WorkflowMap : null;
  const entries = diff(lDef, rDef);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Workflow diff</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            structural diff
          </span>
        </div>
        <button type="button" onClick={() => { setA(b); setB(a); }}
          disabled={!a || !b}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
          swap A ↔ B
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['a','b'] as const).map(side => (
          <Panel key={side} title={side === 'a' ? 'A' : 'B'} meta={side === 'a' ? a : b} bodyClass="!p-3 text-[11px]">
            <select className="w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                    value={side === 'a' ? a : b}
                    onChange={e => side === 'a' ? setA(e.currentTarget.value) : setB(e.currentTarget.value)}>
              {defs.map(d => <option key={d.id} value={d.workflow_id}>{d.workflow_id} · {d.kind}</option>)}
            </select>
          </Panel>
        ))}
      </div>

      {entries.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {(['added','removed','changed'] as const).map(k => {
            const n = entries.filter(e => e.kind === k).length;
            const t = k === 'added' ? TONE.ok : k === 'removed' ? TONE.alert : TONE.warn;
            return (
              <div key={k} className="rounded-[3px] border border-line bg-surface px-3 py-2">
                <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{k}</div>
                <div className="font-mono text-[15px] tabular-nums" style={{ color: t }}>{n}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Panel title="Differences" meta={`${entries.length} change${entries.length === 1 ? '' : 's'}`} bodyClass="!p-0">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-[11px]" style={{ color: TONE.ok }}>
            Definitions are structurally identical.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
                <span className="w-6 shrink-0 text-center font-mono" style={{ color: tone(e.kind) }}>{sigil(e.kind)}</span>
                <span className="w-44 shrink-0 truncate font-mono text-ink">{e.path}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">
                  {e.lhs ?? '—'} {e.kind === 'changed' || e.kind === 'added' ? '→' : ''} {e.rhs ?? ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
