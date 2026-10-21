// A request's durable writes are committed when the request finishes (./settle.ts,
// wiring audit §13, register 18.37), against a real Postgres (16): skipped
// unless TEST_DATABASE_URL is set (scripts/test-postgres.sh). Instance A runs on
// this process's stores, behind the route wrapper the build applies; instance B
// on a read model of its own, as another serverless instance would. Neither has a
// poll running or LISTEN (as behind a transaction pooler): B sees A's change only
// by pulling, which the wrapper does before a request when B is stale.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setSovereign } from '@/lib/data/store';
import { installRequestSettle } from '@/lib/data/persist';
import { useBackend, type Backend } from '.';
import { connect, startRecords, type Records, type Sql } from './postgres';
import { pathOf } from './documents';
import { durableRoute, installSettle } from './settle';
import { touch } from './track';

const URL_ = process.env.TEST_DATABASE_URL;
type Root = Record<string, unknown>;
const G = globalThis as unknown as Root;
const sovereign = (r: Root) => (r.__civicos as { sovereign: { stateName: string; motto?: string } }).sovereign;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe.skipIf(!URL_)('a request finishes its durable writes (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, probe: Sql, dbUrl: string, dbName: string, prev: Backend;
  let a: Records, b: Records;
  const rootB: Root = {};
  const pools: Sql[] = [];
  const opened: Records[] = [];
  // Timers that would write or follow on their own are pushed out of the test's reach: only the request path does it.
  const start = async (root: Root): Promise<Records> => {
    const sql = await connect(dbUrl, { max: 3 });
    pools.push(sql);
    (sql as { listen?: unknown }).listen = undefined; // a transaction pooler: no LISTEN
    const r = await startRecords({ sql, instance: `settle-${opened.length}-${Math.random().toString(16).slice(2, 6)}`, root, journalDir: null, pollMs: 3_600_000, docMs: 3_600_000, sweepMs: 3_600_000 });
    opened.push(r);
    return r;
  };
  const docRow = async (store: string, p: string) => (await probe.unsafe(`select doc from civicos.record_doc where store = $1 and path = $2`, [store, p]))[0]?.doc;

  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_settle_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`; dbUrl = u.toString();
    probe = await connect(dbUrl, { max: 1 });
    a = await start(G);
    prev = useBackend(a.backend);
    b = await start(rootB);
    expect(b.listening).toBe(false);
    (G as { __persistRecords?: Records }).__persistRecords = a;
    expect(installRequestSettle({ CIVICOS_READ_FRESH_MS: '50', CIVICOS_READ_FRESH_TIMEOUT_MS: '2000' })).toBe(true);
  });
  afterAll(async () => {
    installSettle(undefined);
    (G as { __persistRecords?: Records }).__persistRecords = undefined;
    for (const r of opened) await r.stop();
    useBackend(prev ?? null);
    for (const s of [...pools, probe]) await s?.end?.({ timeout: 2 });
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  it('an audited change is committed, audit entry and record together, when the changing request resolves', async () => {
    const before = Number((await probe.unsafe(`select count(*)::int as n from civicos.audit_entry where action = 'sovereign.configure'`))[0]!.n);
    const post = durableRoute('POST', async (req: Request) => {
      const body = await req.json() as { stateName: string };
      const r = setSovereign({ stateName: body.stateName }, 'Registrar');
      return Response.json(r);
    });
    const res = await post(new Request('http://x/api/sovereign', { method: 'POST', body: JSON.stringify({ stateName: 'Republic of Settle' }) }));
    expect(res.status).toBe(200);
    // Read at once from another connection: already committed, nothing waited for.
    expect(Number((await probe.unsafe(`select count(*)::int as n from civicos.audit_entry where action = 'sovereign.configure'`))[0]!.n)).toBe(before + 1);
    expect(await docRow('__civicos', pathOf([['k', 'sovereign'], ['k', 'stateName']]))).toBe('Republic of Settle');
    expect(a.status().queueDepth).toBe(0);
  });

  it('a change made without an audit entry is committed too (no 1 s timer needed)', async () => {
    const store = () => touch('__civicosSettleProbe', (G.__civicosSettleProbe ??= { notes: {} as Record<string, string> }) as { notes: Record<string, string> });
    const patch = durableRoute('PATCH', () => { store().notes.first = 'written with the request'; return new Response(null, { status: 204 }); });
    await patch();
    expect(await docRow('__civicosSettleProbe', pathOf([['k', 'notes'], ['k', 'first']]))).toBe('written with the request');

    // The same change without the wrapper waits for the timer (an hour here): this is what was lost on a frozen function.
    store().notes.second = 'left in memory';
    await sleep(300);
    expect(await docRow('__civicosSettleProbe', pathOf([['k', 'notes'], ['k', 'second']]))).toBeUndefined();
    expect(a.pending()).toBe(true);
    expect(await a.settle(5000)).toBe(true);
    expect(await docRow('__civicosSettleProbe', pathOf([['k', 'notes'], ['k', 'second']]))).toBe('left in memory');
  });

  it('a stale instance pulls before it answers, so a read sent right after the change sees it', async () => {
    const post = durableRoute('POST', () => Response.json(setSovereign({ motto: 'Read what was written' }, 'Registrar')));
    await post();
    expect(sovereign(rootB).motto).not.toBe('Read what was written'); // B follows only by pulling

    // B serves the next read: the wrapper's hooks run against B as this server's records.
    (G as { __persistRecords?: Records }).__persistRecords = b;
    try {
      await sleep(60); // older than CIVICOS_READ_FRESH_MS
      const get = durableRoute('GET', () => Response.json({ motto: sovereign(rootB).motto }));
      expect(await (await get()).json()).toEqual({ motto: 'Read what was written' });
      // Fresh within the window: no second pull.
      const pulled = b.status().lastPullAt;
      await get();
      expect(b.status().lastPullAt).toBe(pulled);
    } finally {
      (G as { __persistRecords?: Records }).__persistRecords = a;
    }
  });

  it('a commit that cannot finish in time returns after the timeout, keeps the change queued and writes it once it can', async () => {
    const real = a.sql.begin.bind(a.sql);
    let fail = true;
    (a.sql as { begin: unknown }).begin = (async (...args: Parameters<typeof real>) => { if (fail) throw new Error('database away'); return real(...args); }) as typeof real;
    try {
      setSovereign({ motto: 'Kept through an outage' }, 'Registrar');
      const t0 = Date.now();
      expect(await a.settle(700)).toBe(false);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(650);
      expect(a.status().queueDepth).toBeGreaterThan(0);
      fail = false;
      expect(await a.settle(35_000)).toBe(true);
      expect(await docRow('__civicos', pathOf([['k', 'sovereign'], ['k', 'motto']]))).toBe('Kept through an outage');
    } finally {
      (a.sql as { begin: unknown }).begin = real;
    }
  });
});
