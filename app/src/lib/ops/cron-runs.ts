// The scheduled jobs' run history, idempotency, overlap guard, retries and
// failure alerts (register 18.39). Every route under /api/cron/* exports its
// handler through cronRoute(name, handler); the jobs' own logic is unchanged.
//
// A run record per execution: job, run key, start, end, outcome (ok, failed,
// skipped-duplicate, refused-overlap, not-configured), the HTTP status, the
// items the job reports processing (RETRY_POLICY[job].items) and the error
// text, scrubbed of addresses and numbers (lib/messaging/privacy.ts) and cut
// to 300 characters. The last HISTORY runs of each job are kept.
//
// Run key: the caller's own (`X-CivicOS-Run-Key` header or `runKey` query), or,
// when a scheduler calls (`X-CivicOS-Scheduler`: pg_cron, self-host,
// kubernetes), the job's scheduled slot (`slot:2026-10-20T14:05Z`, the minute
// the schedule last fell on). A call with neither is an ad-hoc run with a key
// of its own. A second call with a key that already succeeded, or that is
// running now, changes nothing and is recorded as skipped-duplicate. A call
// while another run of the job holds it is refused (409, refused-overlap).
// With CIVICOS_STATE=postgres the hold is a row every instance shares
// (civicos.cron_lease, migration 20261027000000), so two serverless
// instances never run the same job at once; elsewhere it is this server's.
//
// Retries (lib/ops/cron-jobs.ts RETRY_POLICY): after a failure the job's next
// scheduled invocation retries it once its backoff has passed; a scheduled
// invocation that arrives sooner is deferred (counted, not run). After
// `attempts` failures in a row the officials subscribed to incidents in the
// Update Center are alerted once through alert() (lib/data/comms.ts: the
// nation's own email and SMS providers); the alert names the job and the
// count, never the error text. The first success after an alert says so.
// Nothing here sends operational data anywhere else.
//
// Store: __civicosCronRuns (durable, kept as it stands on a data restore:
// lib/backup/state.ts KEPT_ON_RESTORE).

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordsBackend } from '@/lib/data/persist';
import { scrub } from '@/lib/messaging/privacy';
import { logger } from '@/lib/ops/log';
import {
  CRON_JOBS, cronJob, slotOf, slotKey, nextRunOf, intervalMinutes, backoffMs, jobsHere, substrateConfigured,
  type CronJob, type RetryPolicy,
} from './cron-jobs';

export type CronOutcome = 'running' | 'ok' | 'failed' | 'skipped-duplicate' | 'refused-overlap' | 'not-configured';
export type CronTrigger = 'scheduler' | 'manual';

export interface CronRun {
  id: string;
  job: string;
  runKey: string;
  trigger: CronTrigger;
  /** Who called, as the scheduler named itself (pg_cron, self-host, kubernetes). */
  scheduler?: string;
  startedAt: string;
  endedAt?: string;
  outcome: CronOutcome;
  /** 1 for a first try; n for the n-th try after n-1 failures in a row. */
  attempt?: number;
  status?: number;
  items?: number;
  /** The job ran but answered `ok: false` (a finding it reports, such as undelivered messages). */
  flagged?: boolean;
  error?: string;
}
interface Lease { runId: string; runKey: string; startedAt: string; until: string }
export interface RetryState {
  /** When the first failure of this streak happened. */
  since: string;
  failures: number;
  /** The earliest a scheduled invocation retries. */
  nextAt: string;
  lastError?: string;
  /** Officials were alerted (once per streak). */
  alertedAt?: string;
}
type JobState = {
  runs: CronRun[];
  running?: Lease;
  retry?: RetryState;
  /** Scheduled invocations deferred while waiting for the backoff. */
  deferred: number;
  lastDeferredAt?: string;
  totals: { ok: number; failed: number };
};
type CronRunsDb = { jobs: Record<string, JobState>; seq: number };

/** Runs kept per job. */
export const HISTORY = 50;

const seed = (): CronRunsDb => ({ jobs: {}, seq: 1 });
const emptyJob = (): JobState => ({ runs: [], deferred: 0, totals: { ok: 0, failed: 0 } });
const g = globalThis as unknown as { __civicosCronRuns?: CronRunsDb };
function db(): CronRunsDb {
  return touch('__civicosCronRuns', g.__civicosCronRuns = withDefaults(g.__civicosCronRuns ??= seed(), seed(), { opaque: ['jobs'] }));
}
/** A job's state, with defaults for fields added after it was saved. */
function state(job: string): JobState {
  const d = db();
  return (d.jobs[job] = withDefaults(d.jobs[job], emptyJob()));
}
export function resetCronRuns(): void { g.__civicosCronRuns = undefined; }

const iso = (t: number) => new Date(t).toISOString();
const keep = (s: JobState, r: CronRun) => { s.runs.push(r); if (s.runs.length > HISTORY) s.runs.splice(0, s.runs.length - HISTORY); };
function newRun(job: string, runKey: string, trigger: CronTrigger, scheduler: string | undefined, now: number, outcome: CronOutcome): CronRun {
  const d = db();
  return { id: `CR-${d.seq++}`, job, runKey, trigger, ...(scheduler ? { scheduler } : {}), startedAt: iso(now), outcome };
}

// ── Starting a run ───────────────────────────────────────────────────────
export type Begin =
  | { kind: 'run'; run: CronRun }
  | { kind: 'duplicate' | 'overlap'; run: CronRun; holder?: string }
  | { kind: 'deferred'; retryAt: string };

/**
 * Decide whether this invocation runs (synchronous: two calls on one server
 * cannot both pass). The shared lease (postgres) is taken after this, in
 * cronRoute().
 */
export function beginRun(name: string, runKey: string, opts: { trigger: CronTrigger; scheduler?: string; now?: number }): Begin {
  const job = cronJob(name);
  const now = opts.now ?? Date.now();
  const s = state(name);
  const refuse = (kind: 'duplicate' | 'overlap', holder?: string): Begin => {
    const r = newRun(name, runKey, opts.trigger, opts.scheduler, now, kind === 'duplicate' ? 'skipped-duplicate' : 'refused-overlap');
    r.endedAt = r.startedAt;
    keep(s, r);
    return { kind, run: r, ...(holder ? { holder } : {}) };
  };
  if (s.running && Date.parse(s.running.until) <= now) abandon(name, job.retry, now);
  if (s.running) return s.running.runKey === runKey ? refuse('duplicate', s.running.runId) : refuse('overlap', s.running.runId);
  if (s.runs.some(r => r.runKey === runKey && r.outcome === 'ok')) return refuse('duplicate');
  // A scheduled invocation inside the backoff of a failure streak waits; an operator's call runs.
  if (opts.trigger === 'scheduler' && s.retry && s.retry.failures < job.retry.attempts && now < Date.parse(s.retry.nextAt)) {
    s.deferred += 1;
    s.lastDeferredAt = iso(now);
    return { kind: 'deferred', retryAt: s.retry.nextAt };
  }
  const run = newRun(name, runKey, opts.trigger, opts.scheduler, now, 'running');
  run.attempt = (s.retry?.failures ?? 0) + 1;
  keep(s, run);
  s.running = { runId: run.id, runKey, startedAt: run.startedAt, until: iso(now + job.retry.leaseMinutes * 60_000) };
  return { kind: 'run', run };
}

/** A run that held the job past its lease: the instance stopped or timed out. Counted as a failure. */
function abandon(name: string, p: RetryPolicy, now: number): void {
  const s = state(name);
  const lease = s.running!;
  s.running = undefined;
  const r = s.runs.find(x => x.id === lease.runId);
  if (r && r.outcome === 'running') settle(name, r, { outcome: 'failed', error: `Did not finish within ${p.leaseMinutes} min (the server stopped or timed out)` }, now);
}

// ── Ending a run ─────────────────────────────────────────────────────────
export interface RunResult { outcome: 'ok' | 'failed' | 'not-configured'; status?: number; items?: number; flagged?: boolean; error?: string }

/** Record how the run ended, update the retry state and alert when the attempts are used up. */
export function finishRun(name: string, runId: string, result: RunResult, now = Date.now()): CronRun | undefined {
  const s = state(name);
  if (s.running?.runId === runId) s.running = undefined;
  const r = s.runs.find(x => x.id === runId);
  if (!r || r.outcome !== 'running') return r;
  settle(name, r, result, now);
  return r;
}

function settle(name: string, r: CronRun, result: RunResult, now: number): void {
  const job = cronJob(name);
  const s = state(name);
  r.endedAt = iso(now);
  r.outcome = result.outcome;
  if (result.status !== undefined) r.status = result.status;
  if (result.items !== undefined) r.items = result.items;
  if (result.flagged) r.flagged = true;
  if (result.error) r.error = scrub(result.error);
  if (result.outcome === 'ok') {
    s.totals.ok += 1;
    const was = s.retry;
    s.retry = undefined;
    if (was?.alertedAt) raise(name, `Scheduled job ${name} is running again after ${was.failures} failed runs`);
    return;
  }
  if (result.outcome !== 'failed') return;
  s.totals.failed += 1;
  const failures = (s.retry?.failures ?? 0) + 1;
  s.retry = { since: s.retry?.since ?? r.startedAt, failures, nextAt: iso(now + backoffMs(job.retry, failures)), ...(r.error ? { lastError: r.error } : {}), ...(s.retry?.alertedAt ? { alertedAt: s.retry.alertedAt } : {}) };
  logger.warn('cron.run_failed', { job: name, runId: r.id, failures, attempts: job.retry.attempts, status: r.status });
  if (failures >= job.retry.attempts && !s.retry.alertedAt) {
    s.retry.alertedAt = iso(now);
    raise(name, `Scheduled job ${name} failed ${failures} times in a row; see Scheduled jobs (/gov/crons)`);
  }
}

/** The alert to the officials subscribed to incidents (the installed nation), through the platform's own outbox. */
function raise(job: string, subject: string): void {
  void (async () => {
    const [{ alert }, { HOME_NATION }] = await Promise.all([import('@/lib/data/comms'), import('@/lib/data/updates')]);
    alert(HOME_NATION, 'incidents', subject, `cron:${job}`);
  })().catch(e => logger.warn('cron.alert_failed', { job, message: (e as Error).message }));
}

// ── The shared lease (postgres) ──────────────────────────────────────────
type SqlLike = { unsafe(text: string, params?: unknown[]): Promise<Record<string, unknown>[]> };
const sqlOf = (): SqlLike | undefined => recordsBackend()?.sql as unknown as SqlLike | undefined;

/** Take the job's shared lease: 'run', or why not. */
export async function takeLease(sql: SqlLike, job: string, runKey: string, holder: string, untilMs: number, now = Date.now()): Promise<'run' | 'duplicate' | 'overlap'> {
  const got = await sql.unsafe(
    `insert into civicos.cron_lease as l (job, run_key, holder, until_ms) values ($1, $2, $3, $4::bigint)
     on conflict (job) do update set run_key = excluded.run_key, holder = excluded.holder, until_ms = excluded.until_ms
       where (l.holder is null or l.until_ms < $5::bigint) and l.done_key is distinct from excluded.run_key
     returning holder`,
    [job, runKey, holder, untilMs, now],
  );
  if (got.length) return 'run';
  const row = (await sql.unsafe(`select run_key, holder, done_key from civicos.cron_lease where job = $1`, [job]))[0];
  return row && (row.done_key === runKey || (row.holder && row.run_key === runKey)) ? 'duplicate' : 'overlap';
}

/** Free the lease; a success marks its key done. */
export async function releaseLease(sql: SqlLike, job: string, holder: string, ok: boolean): Promise<void> {
  await sql.unsafe(`update civicos.cron_lease set holder = null, until_ms = 0, done_key = case when $3::boolean then run_key else done_key end where job = $1 and holder = $2`, [job, holder, ok]);
}

// ── The route wrapper ────────────────────────────────────────────────────
const KEY = /^[A-Za-z0-9:._@-]{1,120}$/;
const SCHEDULER = /^[a-z0-9_-]{1,40}$/i;

/** The run key and trigger of a call; null when the caller's key is not acceptable. */
export function runKeyOf(req: Request, job: Pick<CronJob, 'schedule'>, now = Date.now()): { runKey: string; trigger: CronTrigger; scheduler?: string } | null {
  const url = new URL(req.url);
  const given = req.headers.get('x-civicos-run-key') ?? url.searchParams.get('runKey');
  const sched = req.headers.get('x-civicos-scheduler')?.trim();
  const scheduler = sched && SCHEDULER.test(sched) ? sched.toLowerCase() : undefined;
  if (given !== null) {
    if (!KEY.test(given)) return null;
    return { runKey: given, trigger: scheduler || given.startsWith('slot:') ? 'scheduler' : 'manual', ...(scheduler ? { scheduler } : {}) };
  }
  if (scheduler) {
    const slot = slotOf(job, new Date(now));
    if (slot) return { runKey: slotKey(slot), trigger: 'scheduler', scheduler };
  }
  return { runKey: `adhoc:${iso(now)}:${randomBytes(3).toString('hex')}`, trigger: 'manual' };
}

/** The count a job's answer reports under its items field (a number, or a list counted). */
function itemsOf(body: unknown, field: string | undefined): number | undefined {
  if (!field || !body || typeof body !== 'object') return undefined;
  const v = (body as Record<string, unknown>)[field];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.length;
  return undefined;
}

function errorOf(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as { error?: unknown; summary?: { error?: unknown } };
    if (typeof b.error === 'string') return b.error;
    if (typeof b.summary?.error === 'string') return b.summary.error;
  }
  return `HTTP ${status}`;
}

type Handler = (req: Request) => Response | Promise<Response>;

/**
 * A cron route's handler with its run recorded: checks the cron secret, decides
 * duplicate / overlap / deferred, runs the job, records the outcome. The job's
 * own answer is returned as it was, with `X-CivicOS-Cron-Run` naming the run.
 */
export function cronRoute(name: string, handler: Handler): (req: Request) => Promise<Response> {
  const job = cronJob(name); // throws at import when the job is not in scripts/cron-jobs.json
  return async (req: Request): Promise<Response> => {
    if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const now = Date.now();
    const key = runKeyOf(req, job, now);
    if (!key) return NextResponse.json({ error: 'runKey: letters, digits and : . _ @ - only, at most 120' }, { status: 400 });
    const b = beginRun(name, key.runKey, { trigger: key.trigger, scheduler: key.scheduler, now });
    if (b.kind === 'deferred') return NextResponse.json({ ok: true, deferred: true, job: name, retryAt: b.retryAt });
    if (b.kind !== 'run') return refusal(name, b.kind, b.run);
    const run = b.run;

    const sql = sqlOf();
    let leased = false;
    if (sql) {
      try {
        const got = await takeLease(sql, name, key.runKey, run.id, now + job.retry.leaseMinutes * 60_000, now);
        if (got !== 'run') {
          const s = state(name);
          if (s.running?.runId === run.id) s.running = undefined;
          run.outcome = got === 'duplicate' ? 'skipped-duplicate' : 'refused-overlap';
          run.attempt = undefined;
          run.endedAt = iso(Date.now());
          return refusal(name, got, run);
        }
        leased = true;
      } catch (e) { logger.warn('cron.lease_unavailable', { job: name, message: (e as Error).message }); }
    }

    let result: RunResult;
    let res: Response;
    try {
      res = await handler(req);
      const body = await res.clone().json().catch(() => undefined);
      if (res.status < 400) {
        result = { outcome: 'ok', status: res.status, items: itemsOf(body, job.retry.items), flagged: !!body && typeof body === 'object' && (body as { ok?: unknown }).ok === false };
      } else if (job.substrate && res.status === 503 && !substrateConfigured()) {
        result = { outcome: 'not-configured', status: res.status, error: 'The Supabase substrate is not configured; this job needs it' };
      } else {
        result = { outcome: 'failed', status: res.status, error: errorOf(body, res.status) };
      }
    } catch (e) {
      result = { outcome: 'failed', status: 500, error: (e as Error)?.message ?? String(e) };
      res = NextResponse.json({ error: `The job ${name} failed`, run: run.id }, { status: 500 });
    }
    finishRun(name, run.id, result);
    if (leased && sql) await releaseLease(sql, name, run.id, result.outcome === 'ok').catch(e => logger.warn('cron.lease_release_failed', { job: name, message: (e as Error).message }));
    try { res.headers.set('x-civicos-cron-run', run.id); } catch { /* immutable headers: the run is recorded anyway */ }
    return res;
  };
}

function refusal(name: string, kind: 'duplicate' | 'overlap', run: CronRun): Response {
  return kind === 'duplicate'
    ? NextResponse.json({ ok: true, skipped: 'duplicate', job: name, runKey: run.runKey, run: run.id })
    : NextResponse.json({ error: `${name} is already running`, job: name, run: run.id }, { status: 409 });
}

// ── Reading ──────────────────────────────────────────────────────────────
export interface JobOverview {
  name: string;
  schedule: string;
  method: CronJob['method'];
  substrate: boolean;
  /** Whether this installation runs it (substrate jobs need the substrate). */
  applies: boolean;
  intervalMinutes: number;
  retryPolicy: RetryPolicy;
  lastRun?: CronRun;
  lastOkAt?: string;
  nextExpectedAt?: string;
  running?: { runId: string; since: string };
  retry?: RetryState & { exhausted: boolean };
  deferred: number;
  totals: { ok: number; failed: number };
  /** Succeeded within twice its interval. */
  recent: boolean;
  runs: CronRun[];
}

/** Every job with its schedule, last run, retry state and recent history (newest first). */
export function cronOverview(opts: { now?: number; env?: Record<string, string | undefined>; limit?: number } = {}): JobOverview[] {
  const now = opts.now ?? Date.now();
  const here = new Set(jobsHere(opts.env ?? process.env).map(j => j.name));
  return CRON_JOBS.map(j => {
    const job = cronJob(j.name);
    const s = g.__civicosCronRuns?.jobs[j.name] ? state(j.name) : emptyJob();
    const done = s.runs.filter(r => r.outcome !== 'skipped-duplicate' && r.outcome !== 'refused-overlap');
    const lastOk = [...s.runs].reverse().find(r => r.outcome === 'ok');
    const interval = intervalMinutes(j, new Date(now));
    const next = s.retry && s.retry.failures < job.retry.attempts ? new Date(Math.max(Date.parse(s.retry.nextAt), nextRunOf(j, new Date(now))?.getTime() ?? 0)) : nextRunOf(j, new Date(now));
    return {
      name: j.name, schedule: j.schedule, method: j.method, substrate: j.substrate, applies: here.has(j.name),
      intervalMinutes: interval, retryPolicy: job.retry,
      ...(done.length ? { lastRun: done[done.length - 1] } : {}),
      ...(lastOk ? { lastOkAt: lastOk.endedAt ?? lastOk.startedAt } : {}),
      ...(next ? { nextExpectedAt: next.toISOString() } : {}),
      ...(s.running ? { running: { runId: s.running.runId, since: s.running.startedAt } } : {}),
      ...(s.retry ? { retry: { ...s.retry, exhausted: s.retry.failures >= job.retry.attempts } } : {}),
      deferred: s.deferred, totals: { ...s.totals },
      recent: !!lastOk && now - Date.parse(lastOk.endedAt ?? lastOk.startedAt) <= 2 * interval * 60_000,
      runs: [...s.runs].reverse().slice(0, opts.limit ?? 20),
    };
  });
}

/** For the onboarding hub: whether every job this installation runs has succeeded within twice its interval. */
export function scheduledJobsHealthy(env: Record<string, string | undefined> = process.env, now = Date.now()): { done: boolean; total: number; missing: string[] } {
  const jobs = cronOverview({ env, now }).filter(j => j.applies);
  const missing = jobs.filter(j => !j.recent).map(j => j.name);
  return { done: jobs.length > 0 && missing.length === 0, total: jobs.length, missing };
}
