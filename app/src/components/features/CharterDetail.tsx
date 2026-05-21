'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listInstitutionsRows, listFacilitiesRows, type FacilityRowLite } from '@/lib/db/repos/institutions';
import { listWorkItemsRows } from '@/lib/db/repos/work-items';
import { listDispatchesRows, listEscalationsRows, listPostureHistoryRows, listDirectivesRows } from '@/lib/db/repos/memory';
import { recentAuditEntriesRows } from '@/lib/db/repos/audit';
import { listOfficersRows } from '@/lib/db/repos/admin';
import { substrateAvailable } from '@/lib/db/client';
import type {
  InstitutionRow, WorkItemRow, DispatchRow, EscalationRow,
  PostureHistoryRow, DirectiveRow, OfficerRow,
} from '@/lib/db/types';
import type { AuditEntry } from '@/lib/db/repos/audit';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { PostureTimeline } from '@/components/features/PostureTimeline';

/**
 * CharterDetail — everything visible about a single charter on one page.
 * Reads scoped to the charter id: institution metadata + facilities +
 * open work items + open dispatches + open escalations + recent
 * directives + posture timeline + recent audit entries whose scope
 * starts with the charter id. RLS scopes what each viewer sees;
 * platform-tier sees full picture; charter officers see their own.
 */
export function CharterDetail({ charterId }: { charterId: string }) {
  const { ready } = useIdentity();
  const [inst, setInst] = React.useState<InstitutionRow | null>(null);
  const [facilities, setFacilities] = React.useState<FacilityRowLite[]>([]);
  const [workItems, setWorkItems] = React.useState<WorkItemRow[]>([]);
  const [dispatches, setDispatches] = React.useState<DispatchRow[]>([]);
  const [escalations, setEscalations] = React.useState<EscalationRow[]>([]);
  const [directives, setDirectives] = React.useState<DirectiveRow[]>([]);
  const [posture, setPosture] = React.useState<PostureHistoryRow[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [officers, setOfficers] = React.useState<OfficerRow[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [allInst, fac, wi, dsp, esc, dir, post, aud, off] = await Promise.all([
      listInstitutionsRows({}),
      listFacilitiesRows({ charter: charterId, limit: 50 }),
      listWorkItemsRows({ closed: false, limit: 50 }),
      listDispatchesRows({ issuer: charterId, limit: 30 }),
      listEscalationsRows({ source: charterId, limit: 30 }),
      listDirectivesRows({ issuer: charterId, limit: 30 }),
      listPostureHistoryRows({ charter: charterId, limit: 50 }),
      recentAuditEntriesRows(80),
      listOfficersRows({ charter: charterId, activeOnly: true, limit: 80 }),
    ]);
    setInst(allInst.find(i => i.charter_id === charterId) ?? null);
    setFacilities(fac);
    setWorkItems(wi.filter(w => w.originating_charter_id === charterId || w.scope === charterId || w.scope.startsWith(charterId + ':')));
    setDispatches(dsp);
    setEscalations(esc);
    setDirectives(dir);
    setPosture(post);
    setAudit(aud.filter(a => a.scope === charterId || a.scope.startsWith(charterId + ':')));
    setOfficers(off);
  }, [available, charterId]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'dispatches' as const },
      { table: 'escalations' as const },
      { table: 'directives' as const },
      { table: 'posture_history' as const },
      { table: 'audit_entries' as const },
    ], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Charter" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">Substrate not configured.</p>
      </Panel>
    );
  }
  if (!inst) {
    return (
      <Panel title="Charter" meta={charterId} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No institution with charter id <span className="font-mono">{charterId}</span>.{' '}
          <Link href="/gov/registry" className="text-link underline">Back to registry</Link>
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{inst.label}</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: inst.activated ? TONE.ok : TONE.warn, color: inst.activated ? TONE.ok : TONE.warn }}>
            {inst.activated ? 'activated' : 'idle'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-ink-muted">
          {inst.kind} · {inst.charter_id} · domain {inst.domain}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="Open work" value={String(workItems.length)} href="/gov/workbench" tone={workItems.length > 0 ? TONE.warn : TONE.ok} />
        <Tile label="Open dispatches" value={String(dispatches.filter(d => !d.closed_at).length)} href="/gov/dispatches" tone={TONE.link} />
        <Tile label="Open escalations" value={String(escalations.filter(e => !e.resolved_at).length)} href="/gov/escalations" tone={escalations.some(e => !e.resolved_at) ? TONE.alert : TONE.ok} />
        <Tile label="Directives" value={String(directives.length)} href="/gov/directives" tone={TONE.link} />
        <Tile label="Audit entries" value={String(audit.length)} href="/gov/audit" tone={TONE.link} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="Open work items" meta={`${workItems.length}`} bodyClass="!p-0">
          {workItems.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">None.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {workItems.map(w => (
                <Link key={w.id} href={`/gov/items/${encodeURIComponent(w.ref)}`}
                  className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: w.priority === 'critical' || w.priority === 'urgent' ? TONE.alert : w.priority === 'priority' ? TONE.warn : TONE.link }}>
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

        <Panel title="Recent directives" meta={`${directives.length}`} bodyClass="!p-0">
          {directives.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">None.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto">
              {directives.map(d => (
                <Link key={d.id} href={`/gov/directives/${encodeURIComponent(d.ref)}`}
                  className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 truncate font-mono text-link">{d.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                    <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: d.status === 'effective' ? TONE.ok : d.status === 'rescinded' ? TONE.alert : TONE.link }}>
                      {d.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {posture.length > 0 ? (
        <Panel title="Posture trajectory" meta={`${posture.length} snapshots`} bodyClass="!p-3">
          <PostureTimeline rows={posture} />
        </Panel>
      ) : null}

      <Panel title="Recent audit entries" meta={`${audit.length}`} bodyClass="!p-0">
        {audit.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No audit entries in scope.</p>
        ) : (
          <div className="max-h-[280px] overflow-y-auto">
            {audit.slice(0, 30).map(a => (
              <Link key={a.hash} href={`/gov/audit?scope=${encodeURIComponent(a.scope)}`}
                className="block border-b border-line-soft px-3 py-1 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate font-mono text-link">{a.scope}</span>
                  <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{a.seq}</span>
                  <span className="w-16 shrink-0 truncate font-mono text-ink">{a.action}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{a.subject}</span>
                  <span className="w-24 shrink-0 truncate text-right text-ink-muted">{a.actor}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Officers" meta={`${officers.length}`} bodyClass="!p-0">
        {officers.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No officers registered to this charter.</p>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {officers.map(o => (
              <Link key={o.id} href={`/gov/officers/${encodeURIComponent(o.id)}`}
                className="block border-b border-line-soft px-3 py-1 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-ink">{o.name}</span>
                  <span className="w-24 shrink-0 truncate font-mono text-link">{o.role}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">{o.email ?? '—'}</span>
                  <span className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: o.auth_user_id ? TONE.ok : TONE.warn }}>
                    {o.auth_user_id ? 'linked' : 'pending'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Facilities" meta={`${facilities.length}`} bodyClass="!p-0">
        {facilities.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No facilities registered.</p>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {facilities.map(f => (
              <div key={f.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
                <span className="w-20 shrink-0 truncate font-mono text-ink-soft">{f.code}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                <span className="w-24 shrink-0 truncate font-mono text-ink-soft">{f.region ?? '—'}</span>
                <span className="w-20 shrink-0 truncate text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: f.operational_status === 'operational' ? TONE.ok : TONE.warn }}>
                  {f.operational_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Tile({ label, value, href, tone }: { label: string; value: string; href: string; tone?: string }) {
  return (
    <Link href={href}
      className="block rounded-[3px] border border-line bg-surface px-3 py-2 hover:bg-surface-2"
      style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: tone ?? 'rgb(var(--c-ink))' }}>{value}</div>
    </Link>
  );
}
