// The scheduled jobs' run history, idempotency, overlap guard, retries and
// failure alerts (lib/ops/cron-runs.ts, register 18.39).
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { cronRoute, beginRun, finishRun, cronOverview, resetCronRuns, runKeyOf, takeLease, releaseLease, HISTORY } from './cron-runs';
import { CRON_JOBS, RETRY_POLICY, cronJob, slotKey, slotOf, nextRunOf, intervalMinutes, backoffMs } from './cron-jobs';
import { resetComms, saveOfficial, outbox } from '@/lib/data/comms';
import { HOME_NATION } from '@/lib/data/updates';

const SECRET = 'cron-test-secret';
const app = join(__dirname, '..', '..', '..');
const call = (path: string, headers: Record<string, string> = {}) =>
  new Request(`http://x/api/cron/${path}`, { headers: { authorization: `Bearer ${SECRET}`, ...headers } });
const runsOf = (job: string) => cronOverview({ limit: 100 }).find(j => j.name === job)!;
const T0 = Date.parse('2026-10-20T12:00:20Z');

beforeEach(() => {
  process.env.CIVICOS_CRON_SECRET = SECRET;
  resetCronRuns();
  resetComms();
  saveOfficial(HOME_NATION, { name: 'Duty Operations Officer', email: 'ops@gov.example', channels: { email: true, sms: false }, subscriptions: { security: false, releases: false, incidents: true, eol: false }, by: 'test' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
});
afterEach(() => { vi.useRealTimers(); });
afterAll(() => { delete process.env.CIVICOS_CRON_SECRET; resetCronRuns(); resetComms(); });

/** The alerts raised about scheduled jobs (one subject each; every subscribed official gets a delivery). */
const cronAlerts = () => [...new Set(outbox(HOME_NATION, 500).filter(d => d.category === 'incidents' && d.ref?.startsWith('cron:')).map(d => d.subject))];

describe('the job list and its retry table', () => {
  it('has one retry policy per job, bounded and backing off', () => {
    expect(Object.keys(RETRY_POLICY).sort()).toEqual(CRON_JOBS.map(j => j.name).sort());
    for (const [name, p] of Object.entries(RETRY_POLICY)) {
      expect(p.attempts, name).toBeGreaterThanOrEqual(1);
      expect(p.attempts, name).toBeLessThanOrEqual(10);
      expect(p.backoffMinutes, name).toBeGreaterThanOrEqual(1);
      expect(p.leaseMinutes, name).toBeGreaterThanOrEqual(1);
    }
    const p = RETRY_POLICY['update-watchdog']!;
    expect([1, 2, 3, 4, 5, 9].map(n => backoffMs(p, n) / 60_000)).toEqual([1, 2, 4, 8, 16, 16]);
  });

  it('every cron route exports its handler through cronRoute() under its own name', () => {
    const dir = join(app, 'src', 'app', 'api', 'cron');
    for (const name of readdirSync(dir).filter(d => existsSync(join(dir, d, 'route.ts')))) {
      const src = readFileSync(join(dir, name, 'route.ts'), 'utf8');
      expect(src, name).toMatch(new RegExp(`export const (GET|POST) = cronRoute\\('${name}', runJob\\);`));
      expect(src, name).not.toMatch(/export (async )?function (GET|POST)\b/);
    }
  });

  it('knows each job\'s scheduled slot, next run and interval', () => {
    const at = new Date('2026-10-20T12:07:30Z');
    expect(slotKey(slotOf(cronJob('deliver-events'), at)!)).toBe('slot:2026-10-20T12:05Z');
    expect(nextRunOf(cronJob('deliver-events'), at)!.toISOString()).toBe('2026-10-20T12:10:00.000Z');
    expect(slotKey(slotOf(cronJob('backup'), at)!)).toBe('slot:2026-10-20T11:41Z');
    expect(intervalMinutes(cronJob('backup'), at)).toBe(60);
    expect(intervalMinutes(cronJob('update-watchdog'), at)).toBe(1);
  });

  it('takes the run key from the caller, from the scheduler\'s slot, or makes an ad-hoc one', () => {
    const job = cronJob('deliver-events');
    expect(runKeyOf(call('deliver-events', { 'x-civicos-run-key': 'slot:2026-10-20T12:05Z' }), job)).toMatchObject({ runKey: 'slot:2026-10-20T12:05Z', trigger: 'scheduler' });
    expect(runKeyOf(new Request('http://x/api/cron/deliver-events?runKey=retry-7'), job)).toMatchObject({ runKey: 'retry-7', trigger: 'manual' });
    expect(runKeyOf(call('deliver-events', { 'x-civicos-scheduler': 'pg_cron' }), job, Date.parse('2026-10-20T12:07:30Z'))).toEqual({ runKey: 'slot:2026-10-20T12:05Z', trigger: 'scheduler', scheduler: 'pg_cron' });
    expect(runKeyOf(call('deliver-events'), job)!.runKey).toMatch(/^adhoc:/);
    expect(runKeyOf(call('deliver-events', { 'x-civicos-run-key': 'drop table;' }), job)).toBeNull();
  });
});

describe('cronRoute', () => {
  it('records a run per execution: start, end, outcome, items, status', async () => {
    const GET = cronRoute('case-deadlines', async () => NextResponse.json({ ok: true, lapsed: 4 }));
    const res = await GET(call('case-deadlines'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lapsed: 4 });
    const run = runsOf('case-deadlines').lastRun!;
    expect(res.headers.get('x-civicos-cron-run')).toBe(run.id);
    expect(run).toMatchObject({ job: 'case-deadlines', outcome: 'ok', status: 200, items: 4, attempt: 1, trigger: 'manual' });
    expect(run.endedAt).toBeDefined();
    expect(runsOf('case-deadlines')).toMatchObject({ totals: { ok: 1, failed: 0 }, recent: true });
  });

  it('refuses a caller without the cron secret and records nothing', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const GET = cronRoute('retention', handler);
    expect((await GET(new Request('http://x/api/cron/retention'))).status).toBe(401);
    expect((await GET(new Request('http://x/api/cron/retention', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(runsOf('retention').runs).toEqual([]);
  });

  it('keeps the error text without personal data, and records a thrown job as failed', async () => {
    const GET = cronRoute('retention', async () => NextResponse.json({ error: 'mail to amina@example.org (+254 700 000 002) bounced' }, { status: 500 }));
    await GET(call('retention'));
    const run = runsOf('retention').lastRun!;
    expect(run).toMatchObject({ outcome: 'failed', status: 500 });
    expect(run.error).toBe('mail to [address] ([number]) bounced');
    const THROW = cronRoute('site-feeds', async () => { throw new Error('boom'); });
    const res = await THROW(call('site-feeds'));
    expect(res.status).toBe(500);
    expect(runsOf('site-feeds').lastRun).toMatchObject({ outcome: 'failed', error: 'boom' });
  });

  it('a second call with the same run key changes nothing and is recorded as skipped-duplicate', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const GET = cronRoute('twin-ingest', handler);
    const key = { 'x-civicos-run-key': 'slot:2026-10-20T12:07Z' };
    expect((await GET(call('twin-ingest', key))).status).toBe(200);
    const again = await GET(call('twin-ingest', key));
    expect(await again.json()).toMatchObject({ ok: true, skipped: 'duplicate', runKey: 'slot:2026-10-20T12:07Z' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(runsOf('twin-ingest').runs.map(r => r.outcome)).toEqual(['skipped-duplicate', 'ok']);
    // The scheduler's own slot works the same way: two calls in one slot run once.
    const sched = { 'x-civicos-scheduler': 'pg_cron' };
    await GET(call('twin-ingest', sched));
    await GET(call('twin-ingest', sched));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(runsOf('twin-ingest').runs[0]).toMatchObject({ outcome: 'skipped-duplicate', runKey: 'slot:2026-10-20T11:07Z', scheduler: 'pg_cron' });
  });

  it('refuses an overlapping run of the same job, and a duplicate of the running one', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const handler = vi.fn(async () => { await gate; return NextResponse.json({ ok: true }); });
    const GET = cronRoute('backup', handler);
    const first = GET(call('backup', { 'x-civicos-run-key': 'a' }));
    await Promise.resolve();
    const overlap = await GET(call('backup', { 'x-civicos-run-key': 'b' }));
    expect(overlap.status).toBe(409);
    const dup = await GET(call('backup', { 'x-civicos-run-key': 'a' }));
    expect(await dup.json()).toMatchObject({ skipped: 'duplicate' });
    expect(runsOf('backup').running).toBeDefined();
    release();
    expect((await first).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(runsOf('backup').runs.map(r => r.outcome)).toEqual(['skipped-duplicate', 'refused-overlap', 'ok']);
    expect(runsOf('backup').running).toBeUndefined();
  });

  it('treats a run that held the job past its lease as abandoned (failed), and runs the next', () => {
    const b = beginRun('audit-anchor', 'k1', { trigger: 'manual', now: T0 });
    expect(b.kind).toBe('run');
    expect(beginRun('audit-anchor', 'k2', { trigger: 'manual', now: T0 + 60_000 }).kind).toBe('overlap');
    const later = beginRun('audit-anchor', 'k3', { trigger: 'manual', now: T0 + RETRY_POLICY['audit-anchor']!.leaseMinutes * 60_000 + 1 });
    expect(later.kind).toBe('run');
    const runs = runsOf('audit-anchor').runs;
    expect(runs.find(r => r.runKey === 'k1')).toMatchObject({ outcome: 'failed', error: expect.stringMatching(/Did not finish/) });
    expect(runsOf('audit-anchor').retry?.failures).toBe(1);
  });

  it('retries a failed job at its next scheduled invocation after the backoff, never sooner, and alerts once after the last attempt', async () => {
    let fail = true;
    const handler = vi.fn(async () => (fail ? NextResponse.json({ error: 'database unreachable' }, { status: 500 }) : NextResponse.json({ ok: true })));
    const GET = cronRoute('update-watchdog', handler); // every minute; 5 attempts, backoff 1, 2, 4, 8 min
    const sched = { 'x-civicos-scheduler': 'pg_cron' };
    const at = (min: number) => vi.setSystemTime(T0 + min * 60_000);

    await GET(call('update-watchdog', sched)); // try 1 fails at 0
    expect(runsOf('update-watchdog').retry).toMatchObject({ failures: 1, nextAt: new Date(T0 + 60_000).toISOString() });
    // Same minute again: same slot, a retry inside the backoff is deferred, not run.
    at(0.5);
    const deferred = await GET(call('update-watchdog', sched));
    expect(await deferred.json()).toMatchObject({ deferred: true });
    expect(handler).toHaveBeenCalledTimes(1);
    const tries: [number, number][] = [[1, 2], [3, 3], [7, 4], [15, 5]];
    for (const [min, attempt] of tries) {
      at(min - 0.5); // before the backoff has passed: deferred
      await GET(call('update-watchdog', sched));
      at(min);
      await GET(call('update-watchdog', sched));
      expect(runsOf('update-watchdog').lastRun).toMatchObject({ outcome: 'failed', attempt });
    }
    expect(handler).toHaveBeenCalledTimes(5);
    expect(runsOf('update-watchdog')).toMatchObject({ retry: { failures: 5, exhausted: true }, totals: { failed: 5 } });
    expect(runsOf('update-watchdog').deferred).toBeGreaterThanOrEqual(5);
    await vi.waitFor(() => expect(cronAlerts()).toHaveLength(1));
    const a = cronAlerts()[0]!;
    expect(a).toMatch(/update-watchdog failed 5 times in a row/);
    expect(a).not.toContain('database unreachable'); // the alert names the job, never the error text

    // Exhausted: later invocations run on the schedule; a further failure does not alert again.
    at(16);
    await GET(call('update-watchdog', sched));
    expect(handler).toHaveBeenCalledTimes(6);
    await new Promise(r => setTimeout(r, 20));
    expect(cronAlerts()).toHaveLength(1);
    // The first success clears the streak and says so.
    fail = false;
    at(17);
    await GET(call('update-watchdog', sched));
    expect(runsOf('update-watchdog').retry).toBeUndefined();
    await vi.waitFor(() => expect(cronAlerts()).toHaveLength(2));
    expect(cronAlerts().some(d => /running again/.test(d))).toBe(true);
  });

  it('an operator\'s own call is not held back by the backoff', async () => {
    const handler = vi.fn(async () => NextResponse.json({ error: 'x' }, { status: 500 }));
    const GET = cronRoute('deliver-messages', handler);
    await GET(call('deliver-messages', { 'x-civicos-scheduler': 'self-host' }));
    await GET(call('deliver-messages'));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(runsOf('deliver-messages').lastRun).toMatchObject({ attempt: 2, trigger: 'manual' });
  });

  it('a substrate job without the substrate is not configured, not failed', async () => {
    const env = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const POST = cronRoute('sla', async () => NextResponse.json({ error: 'substrate not configured' }, { status: 503 }));
      const res = await POST(call('sla'));
      expect(res.status).toBe(503);
      expect(runsOf('sla')).toMatchObject({ lastRun: { outcome: 'not-configured' }, applies: false, totals: { ok: 0, failed: 0 } });
      expect(runsOf('sla').retry).toBeUndefined();
    } finally {
      if (env.url) process.env.NEXT_PUBLIC_SUPABASE_URL = env.url;
      if (env.key) process.env.SUPABASE_SERVICE_ROLE_KEY = env.key;
    }
  });

  it('marks a job that answered ok: false as flagged, still ok', async () => {
    const GET = cronRoute('deliver-messages', async () => NextResponse.json({ ok: false, attempted: 3, dead: 1 }));
    await GET(call('deliver-messages'));
    expect(runsOf('deliver-messages').lastRun).toMatchObject({ outcome: 'ok', flagged: true, items: 3 });
  });
});

describe('the run history store', () => {
  it('keeps a bounded history per job', () => {
    for (let i = 0; i < HISTORY + 15; i++) {
      const b = beginRun('retention', `k${i}`, { trigger: 'manual', now: T0 + i });
      if (b.kind === 'run') finishRun('retention', b.run.id, { outcome: 'ok', status: 200 }, T0 + i);
    }
    const o = runsOf('retention');
    expect(o.runs).toHaveLength(HISTORY);
    expect(o.runs[0]!.runKey).toBe(`k${HISTORY + 14}`);
    expect(o.totals.ok).toBe(HISTORY + 15);
  });

  it('reads a snapshot saved before fields were added, with their defaults', () => {
    const g = globalThis as unknown as { __civicosCronRuns?: unknown };
    g.__civicosCronRuns = { jobs: { backup: { runs: [{ id: 'CR-9', job: 'backup', runKey: 'old', trigger: 'scheduler', startedAt: '2026-10-20T11:41:00.000Z', endedAt: '2026-10-20T11:41:05.000Z', outcome: 'ok' }] } } };
    const o = runsOf('backup');
    expect(o).toMatchObject({ deferred: 0, totals: { ok: 0, failed: 0 }, lastRun: { id: 'CR-9' } });
    // New runs continue numbering, and the old run still counts as a duplicate key.
    const b = beginRun('backup', 'new', { trigger: 'manual', now: T0 });
    expect(b.kind === 'run' && b.run.id).toBe('CR-1');
    if (b.kind === 'run') finishRun('backup', b.run.id, { outcome: 'ok', status: 200 }, T0);
    expect(beginRun('backup', 'old', { trigger: 'manual', now: T0 }).kind).toBe('duplicate');
    expect((g.__civicosCronRuns as { seq: number }).seq).toBe(3);
    expect(runsOf('backup').totals.ok).toBe(1);
  });
});

describe('the shared lease (postgres) with a stand-in database', () => {
  // The same statements against an in-memory stand-in of civicos.cron_lease; the real table is exercised in cron-lease-postgres.integration.test.ts.
  it('runs, refuses an overlap, and treats a key that succeeded as a duplicate', async () => {
    const rows = new Map<string, { run_key: string; holder: string | null; until_ms: number; done_key: string | null }>();
    const sql = {
      async unsafe(text: string, p: unknown[] = []) {
        if (text.startsWith('insert')) {
          const [job, key, holder, until, now] = p as [string, string, string, number, number];
          const r = rows.get(job);
          if (!r) { rows.set(job, { run_key: key, holder, until_ms: until, done_key: null }); return [{ holder }]; }
          if ((r.holder === null || r.until_ms < now) && r.done_key !== key) { Object.assign(r, { run_key: key, holder, until_ms: until }); return [{ holder }]; }
          return [];
        }
        if (text.startsWith('select')) { const r = rows.get(p[0] as string); return r ? [r] : []; }
        const [job, holder, ok] = p as [string, string, boolean];
        const r = rows.get(job);
        if (r && r.holder === holder) Object.assign(r, { holder: null, until_ms: 0, done_key: ok ? r.run_key : r.done_key });
        return [];
      },
    };
    expect(await takeLease(sql, 'backup', 'k1', 'CR-1', T0 + 60_000, T0)).toBe('run');
    expect(await takeLease(sql, 'backup', 'k2', 'CR-2', T0 + 60_000, T0)).toBe('overlap');
    expect(await takeLease(sql, 'backup', 'k1', 'CR-3', T0 + 60_000, T0)).toBe('duplicate');
    await releaseLease(sql, 'backup', 'CR-1', true);
    expect(await takeLease(sql, 'backup', 'k1', 'CR-4', T0 + 60_000, T0)).toBe('duplicate');
    expect(await takeLease(sql, 'backup', 'k2', 'CR-5', T0 + 60_000, T0)).toBe('run');
  });
});
