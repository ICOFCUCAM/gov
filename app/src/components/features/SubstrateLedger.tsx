'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkItemsRows, substrateAvailable } from '@/lib/db/repos/work-items';
import type { WorkItemRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';

const priorityTone = (p: string) =>
  p === 'critical' || p === 'urgent' ? TONE.alert
  : p === 'priority' ? TONE.warn
  : TONE.link;

/**
 * Substrate Ledger — pairs with OperationsLedger.
 *
 * The in-memory ledger shows transitions executed in this session.
 * This panel shows the DURABLE record — civicos.work_items, scoped by
 * the substrate's RLS policies. Anonymous viewers see nothing (correct);
 * an officer sees their charter's queue; platform-tier roles see everything.
 *
 * Auto-refreshes on identity changes (sign-in / sign-out / claim) so the
 * scope flips visibly when an officer signs in.
 */
export function SubstrateLedger() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<WorkItemRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      const rows = await listWorkItemsRows({ limit: 50 });
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [available]);

  // Refresh on identity change (and on first mount once identity is ready).
  React.useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, actor?.id, session?.user.id, refresh]);

  // Live updates via Realtime — any INSERT/UPDATE on civicos.work_items
  // the current session can see re-triggers the fetch. RLS scopes which
  // changes flow through; the client doesn't filter.
  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'work_item_steps' as const },
    ], []),
    refresh,
  );

  // Wall clock tick (display only).
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!available) {
    return (
      <Panel title="Substrate Ledger" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">
          The persistent substrate is not configured for this environment.
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          to surface live persistent state here.
        </p>
      </Panel>
    );
  }

  const scopeLabel = (() => {
    if (!ready) return 'resolving…';
    if (!session) return 'anonymous (sign in to scope)';
    if (!actor) return 'authenticated · profile unlinked';
    if (actor.kind === 'citizen') return `citizen · ${actor.name}`;
    const platform = actor.role && ['platform-admin','noc-officer','cabinet-officer','auditor'].includes(actor.role);
    return platform
      ? `${actor.name} · ${actor.role} · platform-tier (cross-charter)`
      : `${actor.name} · ${actor.role ?? 'officer'} · charter ${actor.charterId ?? '—'}`;
  })();

  const open = items.filter(i => !i.closed);
  const closed = items.filter(i => i.closed);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Substrate Ledger</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            durable · RLS-scoped
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">
            {new Date(now).toLocaleTimeString()}
          </span>
        </div>
        <button
          type="button"
          onClick={() => { void refresh(); }}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          disabled={loading}
        >
          {loading ? 'refreshing…' : 'refresh'}
        </button>
      </div>

      <p className="text-[10px] text-ink-muted">
        Scope: <span className="font-mono text-ink">{scopeLabel}</span>
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Visible items" value={String(items.length)} />
        <Tile label="Open" value={String(open.length)} />
        <Tile label="Closed" value={String(closed.length)} />
      </div>

      <Panel title="Persistent work items" meta={`${items.length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No persistent items visible at the current scope.
            {!session ? ' Sign in to see records scoped to your role.' :
             !actor ? ' Claim a profile to surface your records.' : ''}
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{item.ref}</span>
                <span className="w-32 shrink-0 truncate font-mono text-link no-underline">{item.scope}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{item.title}</span>
                <span className="w-24 shrink-0 truncate text-right text-ink-soft">{item.current_stage}</span>
                <span
                  className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: priorityTone(item.priority) }}
                >
                  {item.priority}
                </span>
                <span
                  className="w-12 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: item.closed ? TONE.ok : TONE.link }}
                >
                  {item.closed ? 'closed' : 'open'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        This list reads <span className="font-mono text-ink">civicos.work_items</span> live.
        Rows are filtered by the substrate's row-level security: officers see their charter,
        platform-tier roles (NOC / auditor / cabinet / platform-admin) see everything,
        citizens see records linked to them.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[3px] border border-line bg-surface px-3 py-2"
      style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}
    >
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums text-ink">{value}</div>
    </div>
  );
}
