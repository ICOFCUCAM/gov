'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listEscalationsRows, listDispatchesRows } from '@/lib/db/repos/memory';
import { listWorkItemsRows } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { EscalationRow, DispatchRow, WorkItemRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { ageMinutes } from '@/lib/format';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const severityTone = (s: string) =>
  s === 'national' || s === 'major' ? TONE.alert
  : s === 'minor' ? TONE.warn
  : TONE.link;

const priorityTone = (p: string) =>
  p === 'critical' || p === 'urgent' ? TONE.alert
  : p === 'priority' ? TONE.warn
  : TONE.link;


/**
 * LiveWall — composite operational picture for the NOC.
 *
 * Three columns, all live (Realtime) and all RLS-scoped:
 *   – Open escalations (severity-sorted)
 *   – Active dispatches (priority-sorted, recent first)
 *   – Open persistent work items (priority + age)
 *
 * This is the demo that proves the substrate drives a real wall view.
 * The page does no client-side joining or aggregation — each column is
 * a query against a single table, and the substrate's RLS shapes what
 * a viewer at this terminal is entitled to see.
 */
export function LiveWall() {
  const { actor, session, ready } = useIdentity();
  const [escalations, setEscalations] = React.useState<EscalationRow[]>([]);
  const [dispatches, setDispatches]   = React.useState<DispatchRow[]>([]);
  const [workItems, setWorkItems]     = React.useState<WorkItemRow[]>([]);
  const [now, setNow] = React.useState(() => Date.now());
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [e, d, w] = await Promise.all([
      listEscalationsRows({ openOnly: true, limit: 50 }),
      listDispatchesRows({ limit: 50 }),
      listWorkItemsRows({ closed: false, limit: 50 }),
    ]);
    setEscalations(e);
    setDispatches(d);
    setWorkItems(w);
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'escalations' as const },
      { table: 'dispatches'  as const },
      { table: 'work_items'  as const },
    ], []),
    refresh,
  );

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!available) {
    return <SubstrateNotConfigured title="Live Wall" />;
  }

  const scopeLabel = (() => {
    if (!ready) return 'resolving…';
    if (!session) return 'anonymous';
    if (!actor) return 'authenticated · unlinked';
    const platform = actor.kind === 'officer' && actor.role &&
      ['platform-admin','noc-officer','cabinet-officer','auditor'].includes(actor.role);
    return platform
      ? `${actor.name} · ${actor.role} · platform-tier`
      : `${actor.name} · ${actor.role ?? actor.kind} · ${actor.charterId ?? '—'}`;
  })();

  // Sort escalations: national → major → minor → watch.
  const sevOrder: Record<string, number> = { national: 0, major: 1, minor: 2, watch: 3 };
  const escSorted = [...escalations].sort((a, b) =>
    (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  // Sort dispatches: open first, then priority, then recency.
  const prOrder: Record<string, number> = { critical: 0, urgent: 1, priority: 2, routine: 3 };
  const dspSorted = [...dispatches].sort((a, b) => {
    const ac = a.closed_at ? 1 : 0;
    const bc = b.closed_at ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const ap = prOrder[a.priority] ?? 9;
    const bp = prOrder[b.priority] ?? 9;
    if (ap !== bp) return ap - bp;
    return new Date(b.dispatched_at).getTime() - new Date(a.dispatched_at).getTime();
  });

  // Sort work items: priority, then oldest first (longest open).
  const wiSorted = [...workItems].sort((a, b) => {
    const ap = prOrder[a.priority] ?? 9;
    const bp = prOrder[b.priority] ?? 9;
    if (ap !== bp) return ap - bp;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Live Wall</h1>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            durable · realtime · RLS-scoped
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">
            {new Date(now).toLocaleTimeString()}
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-muted">scope: {scopeLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* ── Open escalations ── */}
        <Panel
          title="Escalations"
          meta={`${escSorted.length} open`}
          bodyClass="!p-0"
        >
          {escSorted.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No open escalations in scope.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {escSorted.map(e => (
                <div key={e.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: severityTone(e.severity) }}
                    >
                      {e.severity}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{e.reason}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">
                      {ageMinutes(e.triggered_at)}m
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    <span>{e.source_charter_id}</span>
                    {e.target_charter_id ? <span>→ {e.target_charter_id}</span> : null}
                    {e.acknowledged_at ? (
                      <span style={{ color: TONE.warn }}>· acked</span>
                    ) : (
                      <span style={{ color: TONE.alert }}>· awaiting ack</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Dispatches ── */}
        <Panel
          title="Dispatches"
          meta={`${dspSorted.length}`}
          bodyClass="!p-0"
        >
          {dspSorted.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No dispatches in scope.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {dspSorted.map(d => (
                <div key={d.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: priorityTone(d.priority) }}
                    >
                      {d.priority}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{d.detail ?? d.kind}</span>
                    <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: d.closed_at ? TONE.ok : d.acknowledged_at ? TONE.warn : TONE.link }}>
                      {d.closed_at ? 'closed' : d.acknowledged_at ? 'acked' : 'open'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    <span>{d.issued_by_charter_id}</span>
                    {d.target_charter_id ? <span>→ {d.target_charter_id}</span> : null}
                    <span className="ml-auto">{ageMinutes(d.dispatched_at)}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Work items ── */}
        <Panel
          title="Work items"
          meta={`${wiSorted.length} open`}
          bodyClass="!p-0"
        >
          {wiSorted.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No open work items in scope.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              {wiSorted.map(w => (
                <div key={w.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                      style={{ color: priorityTone(w.priority) }}
                    >
                      {w.priority}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{w.title}</span>
                    <span className="w-20 shrink-0 truncate text-right text-ink-soft">{w.current_stage}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                    <span>{w.scope}</span>
                    <span className="ml-auto">{ageMinutes(w.created_at)}m old</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="text-[10px] text-ink-muted">
        Three queries against three tables; no client-side joining. The
        substrate's RLS determines what flows in for the current scope —
        platform-tier sees national; charter officers see their own;
        citizens see only records linked to them.
      </p>
    </div>
  );
}
