// Every other store as per-record documents (./documents.ts) against a real
// Postgres (16): skipped unless TEST_DATABASE_URL is set
// (scripts/test-postgres.sh). Its own test file, so its own globals. Instance A
// runs on this process's stores (the real modules: nation profile, support
// tickets …); instance B, and later restarts, on read models of their own, as
// a second server would.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { setSovereign, getSovereign } from '@/lib/data/store';
import { openTicket, ticketAction } from '@/lib/data/support';
import { nationLocale } from '@/lib/nation/registry';
import { useBackend, type Backend } from '.';
import { connect, startRecords, type Records, type Sql } from './postgres';
import { pathOf } from './documents';

const URL_ = process.env.TEST_DATABASE_URL;
type Root = Record<string, unknown>;
const G = globalThis as unknown as Root;
interface Ticket { id: string; title: string; priority: string; thread: { text: string }[] }
const support = (r: Root) => r.__civicosSupport as { tickets: Ticket[]; seq: number };
const sovereign = (r: Root) => (r.__civicos as { sovereign: { stateName: string; motto?: string; locale: string } }).sovereign;
const until = async (ok: () => boolean, ms = 5000) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await new Promise(r => setTimeout(r, 10)); return ok(); };

describe.skipIf(!URL_)('every other store as per-record documents (TEST_DATABASE_URL)', { timeout: 60_000 }, () => {
  let admin: Sql, dbUrl: string, dbName: string, prev: Backend;
  let rootB: Root = {};
  const opened: Records[] = [];
  const pools: Sql[] = [];
  const start = async (root: Root, extra: Partial<Parameters<typeof startRecords>[0]> = {}): Promise<Records> => {
    const sql = await connect(dbUrl, { max: 3 });
    pools.push(sql);
    const r = await startRecords({ sql, instance: `doc-${opened.length}-${Math.random().toString(16).slice(2, 6)}`, root, journalDir: null, pollMs: 60_000, docMs: 3_600_000, sweepMs: root === G ? 3_600_000 : 0, blockSize: { counter: 12 }, ...extra });
    opened.push(r);
    return r;
  };
  const docRow = async (sql: Sql, store: string, p: string) => (await sql.unsafe(`select doc, version::int as version, xmin::text as tx from civicos.record_doc where store = $1 and path = $2`, [store, p]))[0];

  beforeAll(async () => {
    admin = await connect(URL_!, { max: 1 });
    dbName = `civicos_docs_${process.pid}_${Date.now()}`;
    await admin.unsafe(`create database ${dbName}`);
    const u = new URL(URL_!); u.pathname = `/${dbName}`; dbUrl = u.toString();
  });
  afterAll(async () => {
    for (const r of opened) await r.stop();
    useBackend(prev ?? null);
    for (const s of pools) await s.end?.({ timeout: 2 });
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end?.({ timeout: 2 });
  });

  it('imports the live stores once, and writes each change in the same transaction as its audit entry', async () => {
    getSovereign(); // the store is live before the backend starts, as on a server restored from a snapshot
    const a = await start(G);
    prev = useBackend(a.backend);
    expect(a.ownsAll).toBe(true);
    expect(a.owns('__civicosUpdates')).toBe(true);
    const imported = await docRow(a.sql, '__civicos', pathOf([['k', 'sovereign'], ['k', 'stateName']]));
    expect(imported?.doc).toBe(getSovereign().stateName);

    // The nation profile: the store's own module, noted through its accessor; no sweep, no drain.
    const flushes = a.status().flushes;
    expect('error' in setSovereign({ stateName: 'Republic of Meridia', motto: 'Unity and service' }, 'Registrar')).toBe(false);
    expect(await until(() => a.status().flushes > flushes && a.status().queueDepth === 0)).toBe(true);
    const name = await docRow(a.sql, '__civicos', pathOf([['k', 'sovereign'], ['k', 'stateName']]));
    expect(name?.doc).toBe('Republic of Meridia');
    expect(name?.version).toBe(2);
    const audit = (await a.sql.unsafe(`select xmin::text as tx from civicos.audit_entry where action = 'sovereign.configure' order by seq desc limit 1`))[0];
    expect(audit?.tx).toBe(name?.tx);
    const outbox = await a.sql.unsafe(`select topic from civicos.outbox where xmin::text = $1`, [audit!.tx]);
    expect(outbox.map(r => r.topic)).toEqual(expect.arrayContaining(['audit', 'doc']));

    // An Update Center store first used after the start: imported with its first change.
    const t = openTicket('home', { priority: 'P3', title: 'Release notes missing', description: 'The notes for the last release are empty.', by: 'Registrar' });
    expect('error' in t).toBe(false);
    expect(await a.drain()).toBe(true);
    const id = (t as { id: string }).id;
    const row = await docRow(a.sql, '__civicosSupport', pathOf([['k', 'tickets'], ['i', id]]));
    expect((row?.doc as Ticket).title).toBe('Release notes missing');
    expect(a.status().documents).toMatchObject({ stores: expect.any(Number), rows: expect.any(Number) });
  });

  it('a second instance loads every store, follows the first and is followed, without either losing a change', async () => {
    const a = opened[0]!;
    rootB = {};
    const b = await start(rootB);
    expect(sovereign(rootB).stateName).toBe('Republic of Meridia');
    expect(support(rootB).tickets.map(x => x.id)).toEqual(support(G).tickets.map(x => x.id));

    // A changes the profile; B follows through the outbox.
    setSovereign({ motto: 'Service first' }, 'Registrar');
    expect(await a.drain()).toBe(true);
    await b.pull();
    expect(sovereign(rootB).motto).toBe('Service first');

    // B changes a ticket; A follows, and the nation registry follows the profile (onFollow).
    const tid = support(G).tickets.at(-1)!.id;
    support(rootB).tickets.find(x => x.id === tid)!.priority = 'P2';
    sovereign(rootB).stateName = 'Federal Republic of Meridia';
    sovereign(rootB).locale = 'fr';
    expect(await b.drain()).toBe(true);
    await a.pull();
    expect(support(G).tickets.find(x => x.id === tid)!.priority).toBe('P2');
    expect(getSovereign().stateName).toBe('Federal Republic of Meridia');
    expect(nationLocale()).toBe('fr');

    // Both change the same ticket before either writes: both changes are kept, on both.
    expect('error' in ticketAction('nation', 'home', tid, { action: 'reply', by: 'Registrar', text: 'Seen on the console too.' })).toBe(false);
    support(rootB).tickets.find(x => x.id === tid)!.title = 'Release notes missing (1.6)';
    await Promise.all([a.drain(), b.drain()]);
    await a.pull(); await b.pull();
    await Promise.all([a.drain(), b.drain()]);
    await a.pull(); await b.pull();
    for (const r of [G, rootB]) {
      const x = support(r).tickets.find(y => y.id === tid)!;
      expect(x.title).toBe('Release notes missing (1.6)');
      expect(x.thread.map(m => m.text)).toContain('Seen on the console too.');
    }
    expect(a.status().documents!.merged + b.status().documents!.merged).toBeGreaterThanOrEqual(1);
    const stored = await docRow(a.sql, '__civicosSupport', pathOf([['k', 'tickets'], ['i', tid]]));
    expect((stored?.doc as Ticket).title).toBe('Release notes missing (1.6)');
    expect((stored?.doc as Ticket).thread.map(m => m.text)).toContain('Seen on the console too.');

    // Record counters: each instance numbers from its own block (12 here), with the next one reserved ahead,
    // so ids never repeat across instances. A couple of numbers per request, as a server gives them.
    const fromA: number[] = [], fromB: number[] = [];
    for (let i = 0; i < 40; i++) {
      fromA.push(support(G).seq++); fromB.push(++support(rootB).seq);
      await new Promise(r => setTimeout(r, 10));
    }
    expect(new Set([...fromA, ...fromB]).size).toBe(80);
    expect(a.status().documents!.counterOverruns + b.status().documents!.counterOverruns).toBe(0);
    await Promise.all([a.drain(), b.drain()]);
    await a.pull(); await b.pull();
    expect(support(G).seq).toBeGreaterThan(Math.max(...fromA));
    expect(support(rootB).seq).toBeGreaterThanOrEqual(Math.max(...fromB)); // `++seq`: the field holds the last number given
  });

  it('a restarted instance reads the same stores back from the records alone', async () => {
    const a = opened[0]!;
    expect(await a.drain()).toBe(true);
    const rootC: Root = {};
    await start(rootC);
    expect(sovereign(rootC)).toEqual(JSON.parse(JSON.stringify(sovereign(G))));
    const strip = (r: Root) => support(r).tickets;
    expect(strip(rootC)).toEqual(JSON.parse(JSON.stringify(strip(G))));
  });

  it('removes records another instance removed, and keeps a record changed here over the removal', async () => {
    const a = opened[0]!, b = opened[1]!;
    // A removes a ticket; B follows.
    const gone = support(G).tickets[0]!.id;
    support(G).tickets.splice(0, 1);
    expect(await a.drain()).toBe(true);
    await b.pull();
    expect(support(rootB).tickets.map(x => x.id)).not.toContain(gone);
    expect(await docRow(a.sql, '__civicosSupport', pathOf([['k', 'tickets'], ['i', gone]]))).toBeUndefined();
    // B changes a ticket while A removes it: the change made later is kept, and both end with it.
    const kept = support(G).tickets[0]!.id;
    support(rootB).tickets.find(x => x.id === kept)!.priority = 'P1';
    support(G).tickets.splice(0, 1);
    expect(await a.drain()).toBe(true);
    await b.pull();
    expect(await b.drain()).toBe(true);
    await a.pull();
    expect(support(G).tickets.find(x => x.id === kept)?.priority).toBe('P1');
    expect(support(rootB).tickets.find(x => x.id === kept)?.priority).toBe('P1');
  });

  it('replays record changes journalled before a crash, only over the version they were made from', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'civicos-docjournal-'));
    const p = pathOf([['k', 'note']]);
    const line = (json: string, expected: number) => JSON.stringify({ topic: 'docs', data: [{ store: '__civicosJournalled', changes: [{ path: pathOf([]), kind: 'object', json: '{}', expected: 0 }, { path: p, kind: 'value', json, expected }] }] });
    writeFileSync(path.join(dir, `journal-${os.hostname()}.jsonl`), `${line('"first"', 0)}\n${line('"stale"', 7)}\n`);
    const rootD: Root = {};
    await start(rootD, { journalDir: dir });
    expect(rootD.__civicosJournalled).toEqual({ note: 'first' });
  });
});
