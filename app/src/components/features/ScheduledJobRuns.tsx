'use client';

// Each scheduled job's run history as the platform recorded it (register
// 18.39; lib/ops/cron-runs.ts, read through /api/platform/scheduled-jobs):
// schedule, last run and outcome, next expected run, failures in a row and the
// retry state, and the recent runs. Observed: every row is a run the platform
// itself recorded.

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import type { JobOverview, CronRun } from '@/lib/ops/cron-runs';

interface Payload { at: string; jobs: JobOverview[]; healthy: { done: boolean; total: number; missing: string[] }; scheduler: string | null }

const OUTCOME_TONE: Record<string, string> = {
  ok: 'ok', failed: 'alert', running: 'neutral', 'skipped-duplicate': 'neutral', 'refused-overlap': 'warn', 'not-configured': 'neutral',
};
const OUTCOME_WORD: Record<string, string> = {
  ok: 'ok', failed: 'failed', running: 'running', 'skipped-duplicate': 'duplicate, skipped', 'refused-overlap': 'overlap, refused', 'not-configured': 'not configured',
};
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');
const ms = (r: CronRun) => (r.endedAt ? `${Math.max(0, Date.parse(r.endedAt) - Date.parse(r.startedAt))} ms` : '');

function stateOf(j: JobOverview): { word: string; tone: string } {
  if (!j.applies) return { word: 'needs substrate', tone: 'neutral' };
  if (j.running) return { word: 'running', tone: 'neutral' };
  if (j.retry?.exhausted) return { word: 'failing', tone: 'alert' };
  if (j.retry) return { word: 'retrying', tone: 'warn' };
  if (!j.lastRun) return { word: 'never ran', tone: 'warn' };
  return j.recent ? { word: 'on time', tone: 'ok' } : { word: 'late', tone: 'warn' };
}

export function ScheduledJobRuns() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const r = await fetch('/api/platform/scheduled-jobs', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json() as Payload);
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);

  const meta = data ? `${data.jobs.filter(j => j.applies && j.recent).length}/${data.healthy.total} on time` : '…';
  return (
    <Panel title="Run history (recorded by the platform)" meta={meta} bodyClass="!p-0" signal="observed">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-1.5 text-[10px] text-ink-muted">
        <span>Every call of /api/cron/* is recorded: outcome, items, error. Retries wait for the job&apos;s backoff; officials subscribed to incidents are alerted after the last attempt.</span>
        <button type="button" onClick={() => { void refresh(); }}
          className="focus-ring ms-auto rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
          refresh runs
        </button>
      </div>
      {error && <p className="px-3 py-2 text-[10px]" style={{ color: TONE.alert }}>Run history could not be read: {error}</p>}
      {data?.scheduler && <p className="px-3 py-2 text-[10px] text-ink-muted">{data.scheduler}</p>}
      {data?.jobs.map(j => {
        const st = stateOf(j);
        const last = j.lastRun;
        return (
          <div key={j.name} className="border-b border-line-soft px-3 py-2 text-[10px] last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-36 shrink-0 truncate font-mono text-link">{j.name}</span>
              <span className="w-24 shrink-0 font-mono text-ink-muted">{j.schedule}</span>
              <span className="min-w-0 flex-1 truncate text-ink">
                {last ? <>last {when(last.startedAt)} · <span style={{ color: TONE[OUTCOME_TONE[last.outcome] ?? 'neutral'] }}>{OUTCOME_WORD[last.outcome] ?? last.outcome}</span>{last.items !== undefined ? ` · ${last.items} items` : ''}</> : 'no run recorded'}
              </span>
              <span className="w-24 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider" style={{ color: TONE[st.tone] }}>{st.word}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[9px] text-ink-muted">
              <span>every {j.intervalMinutes}m</span>
              <span>· next expected {when(j.nextExpectedAt)}</span>
              <span>· last ok {when(j.lastOkAt)}</span>
              <span>· {j.totals.ok} ok / {j.totals.failed} failed</span>
              {j.retry && <span style={{ color: TONE[j.retry.exhausted ? 'alert' : 'warn'] }}>· {j.retry.failures} of {j.retryPolicy.attempts} attempts failed{j.retry.exhausted ? (j.retry.alertedAt ? `, officials alerted ${when(j.retry.alertedAt)}` : '') : `, retry from ${when(j.retry.nextAt)}`}</span>}
              {j.deferred > 0 && <span>· {j.deferred} deferred for backoff</span>}
              {last?.error && <span className="truncate" style={{ color: TONE.alert }}>· {last.error}</span>}
              {j.runs.length > 0 && (
                <button type="button" onClick={() => setOpen(open === j.name ? null : j.name)} aria-expanded={open === j.name}
                  className="focus-ring ms-auto rounded-[3px] border border-line px-1.5 text-[9px] uppercase tracking-wider hover:text-ink">
                  {open === j.name ? 'hide runs' : `${j.runs.length} runs`}
                </button>
              )}
            </div>
            {open === j.name && (
              <table className="mt-1 w-full font-mono text-[9px] text-ink-muted">
                <thead><tr className="text-start"><th className="text-start font-normal">run</th><th className="text-start font-normal">key</th><th className="text-start font-normal">started</th><th className="text-start font-normal">took</th><th className="text-start font-normal">outcome</th><th className="text-start font-normal">items</th><th className="text-start font-normal">error</th></tr></thead>
                <tbody>
                  {j.runs.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}{r.attempt && r.attempt > 1 ? ` (try ${r.attempt})` : ''}</td>
                      <td className="max-w-[10rem] truncate">{r.runKey}</td>
                      <td>{when(r.startedAt)}</td>
                      <td>{ms(r)}</td>
                      <td style={{ color: TONE[OUTCOME_TONE[r.outcome] ?? 'neutral'] }}>{OUTCOME_WORD[r.outcome] ?? r.outcome}{r.status ? ` ${r.status}` : ''}{r.flagged ? ' · reported a problem' : ''}</td>
                      <td>{r.items ?? ''}</td>
                      <td className="max-w-[14rem] truncate">{r.error ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </Panel>
  );
}
