'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkflowDefinitionsRows, syncWorkflowDefinitionRow } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkflowDefinitionRow, WorkKind, ActionKey } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { downloadJson } from '@/lib/csv-download';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);
const WORK_KINDS: WorkKind[] = ['approval','case','procurement','encounter','bill','judicial','incident','permit','field','lab'];

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
  const { ready, actor } = useIdentity();
  const [items, setItems] = React.useState<WorkflowDefinitionRow[]>([]);
  const [kindFilter, setKindFilter] = React.useState<WorkKind | 'all'>(
    () => getPref<WorkKind | 'all'>('workflow.kind',
      ['all','approval','case','procurement','encounter','bill','judicial','incident','permit','field','lab'] as const, 'all'));
  React.useEffect(() => { setPref('workflow.kind', kindFilter); }, [kindFilter]);
  const [active, setActive] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [importNote, setImportNote] = React.useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [q, setQ] = React.useState('');
  const available = substrateAvailable();
  const isPlatform = actor?.kind === 'officer' && actor.role !== null && PLATFORM_ROLES.has(actor.role);

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
    return <SubstrateNotConfigured title="Workflow Catalogue" />;
  }

  const activeRow = items.find(i => i.workflow_id === active) ?? null;
  const def = activeRow ? activeRow.definition as unknown as WorkflowDef : null;
  const stages = def ? Object.keys(def.transitions) : [];
  const isTerminal = (s: string) => !!def?.terminal.includes(s);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Workflow Catalogue" badge="substrate-authoritative" />
        <div className="flex items-center gap-2">
          <a href="/gov/workflows/simulator"
             className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            simulator
          </a>
          <a href="/gov/workflows/diff"
             className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            diff
          </a>
          {isPlatform ? (
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              import json
            </button>
          ) : null}
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (!file) return;
              try {
                const text = await file.text();
                const payload = JSON.parse(text);
                if (!payload.workflow_id || !payload.definition) throw new Error('missing workflow_id or definition');
                const row = await syncWorkflowDefinitionRow({
                  workflowId: payload.workflow_id,
                  institutionCharterId: payload.institution_charter_id ?? 'platform',
                  archetype: payload.archetype ?? null,
                  title: payload.title ?? payload.workflow_id,
                  kind: (payload.kind ?? 'approval') as WorkKind,
                  definition: payload.definition,
                  description: payload.description ?? null,
                  blueprintCitation: payload.blueprint_citation ?? null,
                  stepCount: payload.step_count ?? null,
                  emits: payload.emits ?? [],
                });
                setImportNote(row ? `imported ${row.workflow_id}` : 'import failed');
                if (row) {
                  setActive(row.workflow_id);
                  setItems(await listWorkflowDefinitionsRows({ limit: 100 }));
                }
              } catch (err) {
                setImportNote('import error: ' + (err instanceof Error ? err.message : String(err)));
              }
            }}
          />
          {isPlatform ? (
            <button
              type="button"
              onClick={() => setEditing(e => !e)}
              className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              {editing ? 'cancel new' : '+ new workflow'}
            </button>
          ) : null}
        </div>
      </div>

      {importNote ? (
        <p className="rounded-[3px] border border-line bg-surface px-2 py-1 text-[10px] text-ink-muted">{importNote}</p>
      ) : null}

      {editing && isPlatform ? (
        <WorkflowEditor
          onDone={async (saved) => {
            const opts: Parameters<typeof listWorkflowDefinitionsRows>[0] = { limit: 100 };
            if (kindFilter !== 'all') opts.kind = kindFilter;
            const rows = await listWorkflowDefinitionsRows(opts);
            setItems(rows);
            if (saved) setActive(saved);
            setEditing(false);
          }}
        />
      ) : null}

      <FilterChips label="kind:" options={KINDS} value={kindFilter} onChange={setKindFilter} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
        <Panel title="Workflows" meta={`${items.length}`} bodyClass="!p-0">
          <div className="border-b border-line-soft px-3 py-1.5">
            <input type="search" value={q} onChange={e => setQ(e.currentTarget.value)}
              placeholder="search id / title / kind…"
              className="w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]" />
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No workflow definitions in scope.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              {items.filter(w => {
                const n = q.trim().toLowerCase();
                return n === '' || `${w.workflow_id} ${w.title} ${w.kind} ${w.institution_charter_id}`.toLowerCase().includes(n);
              }).map(w => (
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
            <div className="flex items-center justify-end gap-2 border-b border-line-soft px-3 py-1.5">
              <button type="button"
                onClick={() => {
                  downloadJson(`civicos-workflow-${activeRow.workflow_id}`, {
                    workflow_id: activeRow.workflow_id,
                    institution_charter_id: activeRow.institution_charter_id,
                    archetype: activeRow.archetype,
                    title: activeRow.title,
                    kind: activeRow.kind,
                    description: activeRow.description,
                    blueprint_citation: activeRow.blueprint_citation,
                    step_count: activeRow.step_count,
                    emits: activeRow.emits,
                    definition: activeRow.definition,
                  }, { dated: false });
                }}
                className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
                download json
              </button>
            </div>
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

/**
 * WorkflowEditor — platform-tier admin composer for workflow definitions.
 *
 * The substrate's sync_workflow_definition RPC accepts a jsonb
 * definition shaped as { terminal: string[], transitions:
 * { [stage]: { [action]: nextStage } } }. The editor surfaces that
 * shape directly: a JSON textarea pre-seeded with a minimal template,
 * validated for shape before submission.
 */
function WorkflowEditor({ onDone }: { onDone: (savedWorkflowId: string | null) => void | Promise<void> }) {
  const [workflowId, setWorkflowId] = React.useState('approval.v2');
  const [institutionCharterId, setInstitutionCharterId] = React.useState('platform');
  const [archetype, setArchetype] = React.useState('GENERIC');
  const [title, setTitle] = React.useState('');
  const [kind, setKind] = React.useState<WorkKind>('approval');
  const [defJson, setDefJson] = React.useState<string>(() => JSON.stringify({
    terminal: ['Closed', 'Rejected'],
    transitions: {
      Submitted:      { advance: 'Triaged' },
      Triaged:        { advance: 'Under review', escalate: 'Decision' },
      'Under review': { approve: 'Decision', reject: 'Rejected', return: 'Triaged' },
      Decision:       { resolve: 'Closed' },
    },
  }, null, 2));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function parseAndValidate(): { terminal: string[]; transitions: Record<string, Record<string, string>> } | null {
    try {
      const parsed = JSON.parse(defJson);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('definition must be an object');
      if (!Array.isArray(parsed.terminal)) throw new Error('terminal must be an array of strings');
      if (typeof parsed.transitions !== 'object' || parsed.transitions === null) throw new Error('transitions required');
      // Spot-check transitions shape: { [stage]: { [action]: string } }.
      for (const [stage, tr] of Object.entries(parsed.transitions)) {
        if (typeof tr !== 'object' || tr === null) throw new Error(`transitions.${stage} must be an object`);
        for (const [action, next] of Object.entries(tr as Record<string, unknown>)) {
          if (typeof next !== 'string') throw new Error(`transitions.${stage}.${action} must point to a stage string`);
          if (!['advance','approve','reject','escalate','assign','resolve','return','sign'].includes(action)) {
            throw new Error(`unknown action '${action}' on stage ${stage}`);
          }
        }
      }
      return parsed;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!workflowId.trim() || !title.trim()) { setError('workflow id and title required'); return; }
    const definition = parseAndValidate();
    if (!definition) return;
    setBusy(true);
    try {
      const row = await syncWorkflowDefinitionRow({
        workflowId: workflowId.trim(),
        institutionCharterId: institutionCharterId.trim(),
        archetype: archetype.trim() || null,
        title: title.trim(),
        kind,
        definition: definition as { terminal: string[]; transitions: Record<string, Partial<Record<ActionKey, string>>> },
        stepCount: Object.keys(definition.transitions).length,
      });
      if (!row) { setError('sync_workflow_definition failed'); return; }
      await onDone(row.workflow_id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Workflow ID</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={workflowId} onChange={e => setWorkflowId(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Institution</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={institutionCharterId} onChange={e => setInstitutionCharterId(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Archetype</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={archetype} onChange={e => setArchetype(e.currentTarget.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Title</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                 value={title} onChange={e => setTitle(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Kind</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={kind} onChange={e => setKind(e.currentTarget.value as WorkKind)}>
            {WORK_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Definition (JSON)</span>
        <textarea
          className="mt-1 h-64 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[10px]"
          value={defJson}
          spellCheck={false}
          onChange={e => setDefJson(e.currentTarget.value)}
        />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => parseAndValidate() && setError('OK — shape valid')}
          className="focus-ring rounded-[3px] border border-line px-2 py-1 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          validate
        </button>
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'syncing…' : 'sync workflow'}
        </button>
      </div>
      <p className="text-[10px] text-ink-muted">
        Calls <span className="font-mono">civicos.sync_workflow_definition</span> (idempotent on workflow_id).
        The substrate validates shape and refuses if <span className="font-mono">transitions</span> is missing.
      </p>
    </form>
  );
}
