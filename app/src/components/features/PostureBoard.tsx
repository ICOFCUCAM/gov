'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recordPostureRow, listPostureHistoryRows, postureStats, type PostureStat, postureTrend, type PostureTrendPoint } from '@/lib/db/repos/memory';
import { PostureTimeline } from '@/components/features/PostureTimeline';
import { substrateAvailable } from '@/lib/db/client';
import type { PostureHistoryRow, Posture } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { getStringPref, getPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

const POSTURES: Posture[] = ['steady', 'elevated', 'crisis', 'national-emergency', 'recovery'];

const postureTone = (p: string) =>
  p === 'national-emergency' || p === 'crisis' ? TONE.alert
  : p === 'elevated' ? TONE.warn
  : p === 'recovery' ? TONE.link
  : TONE.ok;

/**
 * PostureBoard — institutional posture history, live.
 *
 * Composer calls record_posture (insert into posture_history, which is
 * append-only by convention — every snapshot is a row, never updated).
 * The list reads civicos.posture_history live (Realtime) and groups by
 * charter so you can see the trajectory of each institution's posture
 * over time.
 */
export function PostureBoard() {
  const { actor, session, ready } = useIdentity();
  const [rows, setRows] = React.useState<PostureHistoryRow[]>([]);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [charterFilter, setCharterFilter] = React.useState<string>(() => getStringPref('posture.charter', 'all'));
  React.useEffect(() => { setPref('posture.charter', charterFilter); }, [charterFilter]);
  const [sortBy, setSortBy] = React.useState<'stress' | 'readiness' | 'charter'>(
    () => getPref<'stress' | 'readiness' | 'charter'>('posture.sort', ['stress','readiness','charter'] as const, 'stress'));
  React.useEffect(() => { setPref('posture.sort', sortBy); }, [sortBy]);
  const available = substrateAvailable();

  const [stats, setStats] = React.useState<Record<string, PostureStat>>({});

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const [hist, st] = await Promise.all([
      listPostureHistoryRows({ limit: 100 }),
      postureStats({ days: 30 }),
    ]);
    setRows(hist);
    setStats(Object.fromEntries(st.map(s => [s.charterId, s])));
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, actor?.id, session?.user.id, refresh]);

  const [trend, setTrend] = React.useState<PostureTrendPoint[]>([]);
  React.useEffect(() => {
    if (!available || !ready) return;
    const cid = charterFilter === 'all' ? undefined : charterFilter;
    void postureTrend({ charterId: cid, weeks: 12 }).then(setTrend);
  }, [available, ready, charterFilter]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'posture_history' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Posture Board" />;
  }

  const charters = Array.from(new Set(rows.map(r => r.charter_id))).sort();
  const filtered = charterFilter === 'all' ? rows : rows.filter(r => r.charter_id === charterFilter);

  // Latest snapshot per charter, for the summary strip.
  const latestByCharter = new Map<string, PostureHistoryRow>();
  for (const r of rows) {
    if (!latestByCharter.has(r.charter_id)) latestByCharter.set(r.charter_id, r);
  }
  const latest = Array.from(latestByCharter.values());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Posture Board" badge="append-only · realtime" />
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const csv = buildCsv(
                ['charter_id','posture','readiness','stress','snapshot_at'],
                latest.map(r => [r.charter_id, r.posture, r.readiness ?? '', r.stress ?? '', r.snapshot_at]),
              );
              downloadCsv('civicos-posture', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
            download csv
          </button>
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ snapshot posture'}
          </button>
        </div>
      </div>

      {composerOpen ? (
        <PostureComposer
          defaultCharter={actor?.charterId ?? 'platform'}
          onDone={async () => { await refresh(); setComposerOpen(false); }}
        />
      ) : null}

      {(() => {
        const crises = latest.filter(r => r.posture === 'crisis' || r.posture === 'national-emergency');
        return crises.length > 0 ? (
          <div className="rounded-[3px] border px-3 py-2 text-[11px] animate-pulse"
            style={{ borderColor: TONE.alert, color: TONE.alert }}>
            ⚠ {crises.length} charter{crises.length === 1 ? '' : 's'} at crisis or national-emergency:{' '}
            <span className="font-mono">{crises.map(c => c.charter_id).join(', ')}</span>
          </div>
        ) : null;
      })()}

      <Panel title="Latest per charter" meta={`${latest.length}`} bodyClass="!p-0">
        {latest.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No posture snapshots in scope.</p>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {latest.map(r => (
              <div key={r.charter_id} className="bg-surface px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono text-[10px] text-link">{r.charter_id}</span>
                  <span
                    className="text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: postureTone(r.posture) }}
                  >
                    {r.posture}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                  <span className="text-ink-muted">readiness</span>
                  <span className="text-right font-mono tabular-nums text-ink">{r.readiness ?? '—'}</span>
                  <span className="text-ink-muted">stress</span>
                  <span className="text-right font-mono tabular-nums text-ink">{r.stress ?? '—'}</span>
                </div>
                <div className="mt-1 font-mono text-[9px] text-ink-muted">
                  {new Date(r.snapshot_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {latest.length > 0 ? (
        <Panel title="Comparative stress" meta={`${latest.length} charters · sort ${sortBy}`} bodyClass="!p-3">
          <div className="mb-2">
            <FilterChips options={['stress','readiness','charter'] as const} value={sortBy} onChange={setSortBy}
              format={k => `sort ${k}`} />
          </div>
          <div className="space-y-1">
            {[...latest].sort((a, b) =>
              sortBy === 'stress' ? (b.stress ?? 0) - (a.stress ?? 0)
              : sortBy === 'readiness' ? (b.readiness ?? 0) - (a.readiness ?? 0)
              : a.charter_id.localeCompare(b.charter_id)
            ).slice(0, 12).map(r => {
              const s = Math.max(0, Math.min(100, r.stress ?? 0));
              return (
                <div key={'cs:' + r.charter_id} className="flex items-center gap-2 text-[10px]">
                  <span className="w-40 shrink-0 truncate font-mono text-link">{r.charter_id}</span>
                  <div className="h-2 min-w-0 flex-1 rounded-[2px] bg-bg">
                    <div className="h-full rounded-[2px]" style={{
                      width: `${s}%`,
                      backgroundColor: s >= 80 ? TONE.alert : s >= 50 ? TONE.warn : TONE.ok,
                    }} />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink">{s}</span>
                  <span className="w-20 shrink-0 text-right font-mono tabular-nums text-[9px] text-ink-muted">
                    {stats[r.charter_id]?.avgStress != null ? `avg ${stats[r.charter_id]!.avgStress}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <FilterChips label="filter:" options={['all', ...charters]} value={charterFilter} onChange={setCharterFilter} />

      {charterFilter !== 'all' && filtered.length > 0 ? (
        <Panel title={`Timeline · ${charterFilter}`} meta="readiness vs stress" bodyClass="!p-3">
          <PostureTimeline rows={filtered} />
        </Panel>
      ) : null}

      {trend.length > 0 ? (
        <Panel title={`Stress trend · ${charterFilter}`}
          meta={
            <button
              className="text-[9px] uppercase tracking-wider text-link hover:underline"
              onClick={() => downloadCsv('civicos-posture-trend', buildCsv(
                ['week_start','snapshots','avg_readiness','avg_stress','max_stress'],
                trend.map(t => [t.weekStart, t.snapshots, t.avgReadiness ?? '', t.avgStress ?? '', t.maxStress ?? '']),
              ))}>
              csv
            </button>
          }
          bodyClass="!p-3">
          <div className="space-y-1">
            {trend.map(t => {
              const s = Math.max(0, Math.min(100, t.avgStress ?? 0));
              return (
                <div key={t.weekStart} className="flex items-center gap-2 font-mono text-[9.5px]">
                  <span className="w-20 shrink-0 text-ink-muted">{t.weekStart}</span>
                  <span className="w-8 shrink-0 text-right text-ink-muted">{t.snapshots}×</span>
                  <div className="h-2 min-w-0 flex-1 rounded-[2px] bg-bg">
                    <div className="h-full rounded-[2px]" style={{
                      width: `${s}%`,
                      backgroundColor: s >= 80 ? TONE.alert : s >= 50 ? TONE.warn : TONE.ok,
                    }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-ink">avg {t.avgStress ?? '—'}</span>
                  <span className="w-16 shrink-0 text-right text-ink-muted">pk {t.maxStress ?? '—'}</span>
                </div>
              );
            })}
            <p className="pt-1 text-[8.5px] uppercase tracking-wider text-ink-muted">snapshot-week · avg stress (bar) · peak stress</p>
          </div>
        </Panel>
      ) : null}

      <Panel title="Snapshots" meta={`${filtered.length}`} bodyClass="!p-0">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No snapshots match the filter.</p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {filtered.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <span className="w-44 shrink-0 truncate font-mono text-link no-underline">{r.charter_id}</span>
                <span
                  className="w-32 shrink-0 text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: postureTone(r.posture) }}
                >
                  {r.posture}
                </span>
                <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink">
                  rd {r.readiness ?? '—'}
                </span>
                <span className="w-24 shrink-0 text-right font-mono tabular-nums text-ink">
                  st {r.stress ?? '—'}
                </span>
                <span className="min-w-0 flex-1 text-right font-mono text-[9px] text-ink-muted">
                  {new Date(r.snapshot_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function PostureComposer({
  defaultCharter, onDone,
}: { defaultCharter: string; onDone: () => Promise<void> }) {
  const [charter, setCharter] = React.useState(defaultCharter);
  const [posture, setPosture] = React.useState<Posture>('steady');
  const [readiness, setReadiness] = React.useState('');
  const [stress, setStress] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const row = await recordPostureRow({
        charterId: charter.trim(),
        posture,
        readiness: readiness ? Number(readiness) : null,
        stress: stress ? Number(stress) : null,
      });
      if (!row) { setError('record_posture failed'); return; }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Charter</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 value={charter} onChange={e => setCharter(e.currentTarget.value)} required />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Posture</span>
          <select className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
                  value={posture} onChange={e => setPosture(e.currentTarget.value as Posture)}>
            {POSTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Readiness (0–100)</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 inputMode="numeric"
                 value={readiness} onChange={e => setReadiness(e.currentTarget.value)} />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Stress (0–100)</span>
          <input className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
                 inputMode="numeric"
                 value={stress} onChange={e => setStress(e.currentTarget.value)} />
        </label>
      </div>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
          {busy ? 'snapshotting…' : 'snapshot posture'}
        </button>
      </div>
    </form>
  );
}
