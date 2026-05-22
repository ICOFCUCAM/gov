'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  recordEscalationRow, acknowledgeEscalationRow, resolveEscalationRow,
  listEscalationsRows, escalationResponseStats, type EscalationResponseStat,
  escalationResponseTrend, type EscalationResponseTrendPoint,
} from '@/lib/db/repos/memory';
import { recentCascadeEvents, type PersistedEvent } from '@/lib/db/repos/events';
import { substrateAvailable } from '@/lib/db/client';
import type { EscalationRow, Severity } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';
import { WatchStar } from '@/components/identity/WatchStar';
import { getPref, getBoolPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { severityTone } from '@/lib/tone';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

const SEVERITIES: Severity[] = ['watch', 'minor', 'major', 'national'];

export function EscalationFloor() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<EscalationRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkReport, setBulkReport] = React.useState<{ ok: number; failed: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [openOnly, setOpenOnly] = React.useState(() => getBoolPref('escalation.openOnly', false));
  React.useEffect(() => { setPref('escalation.openOnly', openOnly); }, [openOnly]);
  const [severityFilter, setSeverityFilter] = React.useState<'all'|'national'|'major'|'minor'|'watch'>(
    () => getPref('escalation.severity', ['all','national','major','minor','watch'] as const, 'all'));
  React.useEffect(() => { setPref('escalation.severity', severityFilter); }, [severityFilter]);
  const available = substrateAvailable();

  const [responseStats, setResponseStats] = React.useState<EscalationResponseStat[]>([]);
  const [responseTrend, setResponseTrend] = React.useState<EscalationResponseTrendPoint[]>([]);
  const [cascades, setCascades] = React.useState<PersistedEvent[]>([]);

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      const [its, rs, rt, cas] = await Promise.all([
        listEscalationsRows({ limit: 50, openOnly }),
        escalationResponseStats({ days: 30 }),
        escalationResponseTrend({ weeks: 12 }),
        recentCascadeEvents(20),
      ]);
      setItems(its);
      setResponseStats(rs);
      setResponseTrend(rt);
      setCascades(cas);
    } finally {
      setLoading(false);
    }
  }, [available, openOnly]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'escalations' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Escalation Floor"
      message="The persistent substrate is not configured. Set the public Supabase env vars to surface escalations here." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Escalation Floor" badge="durable · realtime" />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.currentTarget.checked)} />
            open only
          </label>
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ record escalation'}
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={loading}
          >
            {loading ? 'refreshing…' : 'refresh'}
          </button>
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['id','severity','source','target','reason','triggered_by','triggered_at','acknowledged_at','resolved_at'],
                items.map(e => [e.id, e.severity, e.source_charter_id, e.target_charter_id ?? '', e.reason ?? '', e.triggered_by_actor ?? '', e.triggered_at, e.acknowledged_at ?? '', e.resolved_at ?? '']),
              );
              downloadCsv('civicos-escalations', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            csv
          </button>
        </div>
      </div>

      {composerOpen ? (
        <EscalationComposer
          defaultSource={actor?.charterId ?? 'platform'}
          onDone={() => { setComposerOpen(false); void refresh(); }}
        />
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-line bg-surface px-3 py-2 text-[10px]">
          <span className="font-mono uppercase tracking-wider text-ink-muted">{selected.size} selected</span>
          <span className="text-ink-muted">·</span>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              const me = resolvedActor();
              let ok = 0, failed = 0;
              for (const x of items.filter(i => selected.has(i.id) && !i.acknowledged_at)) {
                try { (await acknowledgeEscalationRow(x.id, me?.kind === 'officer' ? me.id : null)) ? ok++ : failed++; } catch { failed++; }
              }
              setBulkReport({ ok, failed }); setSelected(new Set()); setBulkBusy(false);
              await refresh();
            }}>
            bulk ack
          </button>
          <button type="button" disabled={bulkBusy}
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
            onClick={async () => {
              setBulkBusy(true);
              let ok = 0, failed = 0;
              for (const x of items.filter(i => selected.has(i.id) && !i.resolved_at)) {
                try { (await resolveEscalationRow(x.id)) ? ok++ : failed++; } catch { failed++; }
              }
              setBulkReport({ ok, failed }); setSelected(new Set()); setBulkBusy(false);
              await refresh();
            }}>
            bulk resolve
          </button>
          <button type="button"
            className="focus-ring rounded-[3px] border border-line bg-bg px-2 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2"
            onClick={() => { setSelected(new Set()); setBulkReport(null); }}>
            clear
          </button>
          {bulkReport ? <span className="font-mono text-ink-muted">· last: {bulkReport.ok} ok / {bulkReport.failed} failed</span> : null}
        </div>
      ) : null}

      <FilterChips label="severity:"
        options={['all','national','major','minor','watch'] as const}
        value={severityFilter}
        onChange={setSeverityFilter} />

      {responseStats.length > 0 ? (
        <Panel title="Response times (last 30 days)" meta={`${responseStats.length} charters`} bodyClass="!p-0">
          <div className="max-h-[240px] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-line px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span className="w-40 shrink-0">charter</span>
              <span className="w-12 shrink-0 text-right">total</span>
              <span className="w-12 shrink-0 text-right">open</span>
              <span className="w-20 shrink-0 text-right">mtta</span>
              <span className="w-20 shrink-0 text-right">mttr</span>
              <span className="w-20 shrink-0 text-right">oldest</span>
            </div>
            {responseStats.map(r => (
              <div key={r.charterId} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 font-mono text-[10px]">
                <span className="w-40 shrink-0 truncate text-link">{r.charterId}</span>
                <span className="w-12 shrink-0 text-right text-ink">{r.total}</span>
                <span className="w-12 shrink-0 text-right" style={{ color: r.open > 0 ? TONE.warn : TONE.ok }}>{r.open}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{r.medianAckMinutes == null ? '—' : `${r.medianAckMinutes}m`}</span>
                <span className="w-20 shrink-0 text-right text-ink">{r.medianResolveHours == null ? '—' : `${r.medianResolveHours}h`}</span>
                <span className="w-20 shrink-0 text-right text-ink-muted">{r.oldestOpenHours == null ? '—' : `${Math.round(r.oldestOpenHours)}h`}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {responseTrend.length > 0 ? (
        <Panel title="Response-time trend"
          meta={
            <button
              className="text-[9px] uppercase tracking-wider text-link hover:underline"
              onClick={() => downloadCsv('civicos-escalation-response-trend', buildCsv(
                ['week_start','resolved','median_ack_minutes','median_resolve_hours'],
                responseTrend.map(t => [t.weekStart, t.resolved, t.medianAckMinutes ?? '', t.medianResolveHours ?? '']),
              ))}>
              csv
            </button>
          }
          bodyClass="!p-0">
          {(() => {
            const maxMttr = Math.max(1, ...responseTrend.map(t => t.medianResolveHours ?? 0));
            return (
              <div className="space-y-1 px-3 py-2">
                {responseTrend.map(t => {
                  const pct = Math.round(((t.medianResolveHours ?? 0) / maxMttr) * 100);
                  return (
                    <div key={t.weekStart} className="flex items-center gap-2 font-mono text-[9.5px]">
                      <span className="w-20 shrink-0 text-ink-muted">{t.weekStart}</span>
                      <span className="w-10 shrink-0 text-right text-ink-muted">{t.resolved}×</span>
                      <div className="h-2.5 min-w-0 flex-1 rounded-[2px] bg-surface-2">
                        <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, backgroundColor: TONE.link }} />
                      </div>
                      <span className="w-16 shrink-0 text-right text-ink-muted">{t.medianAckMinutes == null ? '—' : `${t.medianAckMinutes}m`}</span>
                      <span className="w-14 shrink-0 text-right text-ink">{t.medianResolveHours == null ? '—' : `${t.medianResolveHours}h`}</span>
                    </div>
                  );
                })}
                <p className="pt-1 text-[8.5px] uppercase tracking-wider text-ink-muted">resolved-week · mtta (m) · mttr (h, bar)</p>
              </div>
            );
          })()}
        </Panel>
      ) : null}

      {cascades.length > 0 ? (
        <Panel title="Cross-ministry cascades" meta={`${cascades.length} · propagated`} bodyClass="!p-0">
          <div className="max-h-[240px] overflow-y-auto">
            {cascades.map(c => {
              const p = c.payload as { source_charter?: string; source_archetype?: string; target_archetype?: string; severity?: string; relation?: string; direction?: string };
              return (
                <div key={c.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <span className="w-16 shrink-0 text-[8.5px] font-bold uppercase tracking-wider" style={{ color: severityTone((p.severity ?? 'major') as Severity) }}>{p.severity}</span>
                  <span className="w-28 shrink-0 truncate font-mono text-link">{p.source_charter}</span>
                  <span className="shrink-0 text-ink-muted">→</span>
                  <span className="w-28 shrink-0 truncate font-mono text-ink">{c.target}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-muted">{p.relation}{p.direction ? ` · ${p.direction}` : ''}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <Panel title="Escalations" meta={`${(severityFilter === 'all' ? items : items.filter(e => e.severity === severityFilter)).length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No escalations visible at the current scope.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {(severityFilter === 'all' ? items : items.filter(e => e.severity === severityFilter)).map(e => (
              <div
                key={e.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <input type="checkbox" aria-label={`select ${e.id.slice(0,8)}`}
                  checked={selected.has(e.id)}
                  onChange={ev => {
                    const next = new Set(selected);
                    if (ev.currentTarget.checked) next.add(e.id); else next.delete(e.id);
                    setSelected(next);
                  }} />
                <WatchStar kind="escalation" ref={e.id} label={e.reason} />
                <span
                  className="w-20 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: severityTone(e.severity) }}
                >
                  {e.severity}
                </span>
                <span className="w-32 shrink-0 truncate font-mono text-link no-underline">{e.source_charter_id}</span>
                <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{e.target_charter_id ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{e.reason}</span>
                <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: e.resolved_at ? TONE.ok : e.acknowledged_at ? TONE.warn : TONE.alert }}>
                  {e.resolved_at ? 'resolved' : e.acknowledged_at ? 'acked' : 'open'}
                </span>
                <div className="flex w-28 shrink-0 justify-end gap-1">
                  {!e.acknowledged_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === e.id}
                      onClick={async () => {
                        setBusyId(e.id);
                        try {
                          const me = resolvedActor();
                          await acknowledgeEscalationRow(e.id, me?.kind === 'officer' ? me.id : null);
                        } finally { setBusyId(null); }
                      }}>
                      ack
                    </button>
                  ) : null}
                  {!e.resolved_at ? (
                    <button type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyId === e.id}
                      onClick={async () => {
                        setBusyId(e.id);
                        try { await resolveEscalationRow(e.id); }
                        finally { setBusyId(null); }
                      }}>
                      resolve
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Escalations are RLS-scoped to source/target charter and platform-tier roles.
      </p>
    </div>
  );
}

function EscalationComposer({
  defaultSource, onDone,
}: { defaultSource: string; onDone: () => void }) {
  const [source, setSource] = React.useState(defaultSource);
  const [target, setTarget] = React.useState('');
  const [severity, setSeverity] = React.useState<Severity>('minor');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('reason required'); return; }
    setBusy(true);
    setError(null);
    try {
      const me = resolvedActor();
      const row = await recordEscalationRow({
        sourceCharterId: source.trim(),
        targetCharterId: target.trim() || null,
        severity, reason: reason.trim(),
        triggeredByActor: me?.name ?? null,
      });
      if (!row) { setError('record_escalation failed'); return; }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Source charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={source} onChange={e => setSource(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Target charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={target} onChange={e => setTarget(e.currentTarget.value)} placeholder="optional" />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Severity</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={severity} onChange={e => setSeverity(e.currentTarget.value as Severity)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Reason</span>
        <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
               value={reason} onChange={e => setReason(e.currentTarget.value)} required
               placeholder="e.g. threshold breached" />
      </label>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'recording…' : 'record escalation'}
        </button>
      </div>
    </form>
  );
}
