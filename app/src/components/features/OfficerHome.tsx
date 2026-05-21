'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listWorkItemsRows } from '@/lib/db/repos/work-items';
import { listEscalationsRows, listDispatchesRows } from '@/lib/db/repos/memory';
import { listServiceRequestsRows, listAppealsRows } from '@/lib/db/repos/citizen';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkItemRow, EscalationRow, DispatchRow, ServiceRequestRow, AppealRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { useSubstrateAlerts } from '@/components/identity/useSubstrateAlerts';
import { WatchedRecords } from '@/components/features/WatchedRecords';
import { PostureBadge } from '@/components/identity/PostureBadge';
import { LiveActivityStrip } from '@/components/identity/LiveActivityStrip';

const priorityTone = (p: string) =>
  p === 'critical' || p === 'urgent' ? TONE.alert
  : p === 'priority' ? TONE.warn
  : TONE.link;

const ageMin = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);

/**
 * OfficerHome — personalised landing for a signed-in officer.
 *
 * Aggregates the five most pressing streams for the officer's charter:
 *   • alerts in scope (from useSubstrateAlerts)
 *   • assigned work items (assignee_id = officer.id, open)
 *   • inbound service requests (target = charter, open)
 *   • inbound appeals (originating = charter, open)
 *   • inbound dispatches (target = charter, recent)
 * Each tile links to the surface where the officer can act.
 *
 * All reads are RLS-scoped. Platform-tier roles see broader rollups
 * because their RLS opens wider — by design.
 */
export function OfficerHome() {
  const { actor, session, ready } = useIdentity();
  const { alerts } = useSubstrateAlerts();
  const [assigned, setAssigned] = React.useState<WorkItemRow[]>([]);
  const [requests, setRequests] = React.useState<ServiceRequestRow[]>([]);
  const [appeals, setAppeals] = React.useState<AppealRow[]>([]);
  const [dispatches, setDispatches] = React.useState<DispatchRow[]>([]);
  const [escalations, setEscalations] = React.useState<EscalationRow[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [wi, sr, ap, dsp, esc] = await Promise.all([
      listWorkItemsRows({ closed: false, limit: 80 }),
      listServiceRequestsRows({ openOnly: true, limit: 40 }),
      listAppealsRows({ openOnly: true, limit: 40 }),
      listDispatchesRows({ limit: 40 }),
      listEscalationsRows({ openOnly: true, limit: 40 }),
    ]);
    // Assigned = mine (officer.id matches). RLS keeps it scoped too.
    const myItems = actor?.kind === 'officer'
      ? wi.filter(w => w.assignee_id === actor.id || w.originating_charter_id === actor.charterId)
      : wi;
    setAssigned(myItems.slice(0, 10));
    setRequests(sr.slice(0, 10));
    setAppeals(ap.slice(0, 10));
    setDispatches(dsp.filter(d => !d.closed_at).slice(0, 10));
    setEscalations(esc.slice(0, 10));
  }, [available, actor?.id, actor?.kind, actor?.charterId]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'dispatches' as const },
      { table: 'escalations' as const },
    ], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Officer Home" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel title="Officer Home" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">Sign in as an officer to see your personalised landing.</p>
        <a href="/sign-in?from=/gov/home"
           className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">
          Sign in
        </a>
      </Panel>
    );
  }
  if (!actor || actor.kind !== 'officer') {
    return (
      <Panel title="Officer Home" meta="not an officer" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          This surface is for officers. Citizens use{' '}
          <a href="/wallet/substrate" className="font-mono text-link underline">/wallet/substrate</a>.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Officer Home</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            personal · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          {actor.charterId ? <PostureBadge charterId={actor.charterId} /> : null}
          <span className="font-mono text-[10px] text-ink-muted">
            {actor.name} · {actor.role ?? 'officer'} · {actor.charterId ?? '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="Alerts" value={String(alerts.length)} href="/gov/alerts" tone={alerts.length > 0 ? TONE.alert : TONE.ok} />
        <Tile label="My queue" value={String(assigned.length)} href="/gov/workbench" tone={priorityTone(assigned[0]?.priority ?? 'routine')} />
        <Tile label="Intake" value={String(requests.length + appeals.length)} href="/gov/intake" tone={requests.length + appeals.length > 0 ? TONE.warn : TONE.ok} />
        <Tile label="Open dispatches" value={String(dispatches.length)} href="/gov/dispatches" tone={dispatches.length > 0 ? TONE.warn : TONE.ok} />
        <Tile label="Open escalations" value={String(escalations.length)} href="/gov/escalations" tone={escalations.length > 0 ? TONE.alert : TONE.ok} />
      </div>

      <LiveActivityStrip />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="My work queue" meta={`${assigned.length}`} bodyClass="!p-0">
          {assigned.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">Nothing assigned in your scope.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {assigned.map(w => (
                <Link key={w.id} href="/gov/workbench" className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: priorityTone(w.priority) }}>
                      {w.priority}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{w.title}</span>
                    <span className="w-24 shrink-0 truncate text-right font-mono text-ink-soft">{w.current_stage}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Intake (requests + appeals)" meta={`${requests.length + appeals.length}`} bodyClass="!p-0">
          {requests.length + appeals.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No inbound citizen action in your scope.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {requests.map(r => (
                <Link key={'r' + r.id} href="/gov/intake" className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.link }}>req</span>
                    <span className="w-28 shrink-0 truncate font-mono text-link">{r.service}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{r.title ?? r.domain ?? '—'}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{ageMin(r.submitted_at)}m</span>
                  </div>
                </Link>
              ))}
              {appeals.map(a => (
                <Link key={'a' + a.id} href="/gov/intake" className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE.warn }}>app</span>
                    <span className="w-28 shrink-0 truncate font-mono text-link">{a.originating_charter_id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{a.ground}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{ageMin(a.filed_at)}m</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Dispatches in scope" meta={`${dispatches.length}`} bodyClass="!p-0">
          {dispatches.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No open dispatches in scope.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {dispatches.map(d => (
                <Link key={d.id} href="/gov/dispatches" className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: priorityTone(d.priority) }}>
                      {d.priority}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{d.detail ?? d.kind}</span>
                    <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: d.acknowledged_at ? TONE.warn : TONE.link }}>
                      {d.acknowledged_at ? 'acked' : 'open'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Escalations in scope" meta={`${escalations.length}`} bodyClass="!p-0">
          {escalations.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No open escalations in scope.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {escalations.map(e => (
                <Link key={e.id} href="/gov/escalations" className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: e.severity === 'national' || e.severity === 'major' ? TONE.alert : e.severity === 'minor' ? TONE.warn : TONE.link }}>
                      {e.severity}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">{e.reason}</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{ageMin(e.triggered_at)}m</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <WatchedRecords />
    </div>
  );
}

function Tile({ label, value, href, tone }: { label: string; value: string; href: string; tone?: string }) {
  return (
    <Link
      href={href}
      className="block rounded-[3px] border border-line bg-surface px-3 py-2 hover:bg-surface-2"
      style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}
    >
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: tone ?? 'rgb(var(--c-ink))' }}>{value}</div>
    </Link>
  );
}
