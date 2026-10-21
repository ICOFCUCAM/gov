// Durable platform state (register 1.1). Every server store keeps its data on
// globalThis under a key starting with "__civicos" (the nation profile and
// ministries in store.ts, the Update Center, site settings, editorial,
// subscriptions …). This module saves those stores and restores them when the
// server starts, so a restart no longer loses the nation's configuration,
// audit chain, decisions or published content.
//
// How: at start (src/instrumentation.ts, before any request) every saved store
// is put back on globalThis, so each module's `g.__civicosX ??= seed()` picks
// it up instead of seeding. Then every few seconds, and on shutdown, each store
// whose contents changed is written back.
//
// Where (CIVICOS_STATE):
//   file      JSON files in CIVICOS_STATE_DIR (default ./.civicos-state), written
//             atomically — for a nation's own servers, including air-gapped ones
//   supabase  the nation's substrate: civicos.platform_state (service role only)
//   postgres  the nation's own Postgres (DATABASE_URL): the audit chain, the
//             twin's entities, keys, sources, runs and observations, the
//             facility register and the boundary versions as per-record tables,
//             and every other store (nation profile, ministries, officials,
//             Update Center, public sites, scenarios, metrics, event outbox,
//             signed heads …) as per-record documents (civicos.record_doc,
//             lib/data/repo/documents.ts), all written through on every change
//             (lib/data/repo/postgres.ts); civicos.platform_state snapshots
//             are only read, to import an installation moving from file or
//             supabase state
//   unset     memory only, as before (development and demonstrations)
//
// One writer: one running server owns the state. Before it restores anything
// it takes the writer's lease (file: an exclusive lock file with writer id,
// pid, host and a heartbeat; supabase: the lease row of migration
// civicos_platform_state_fencing), renews it on every save and gives it up on
// shutdown. Every snapshot carries a version; a save names the version it last
// read or wrote, and the store refuses it when another writer has saved since,
// so a second instance can never overwrite newer state. A server that cannot
// get the lease is a standby: it serves what it restored, saves nothing,
// refuses changes (the middleware asks GET /api/auth/official) and reports
// itself not ready (/api/health?ready). A writer that loses its lease or meets
// a newer version stops saving rather than overwrite. Changes from the last
// few seconds before a crash can still be lost. Status: persistenceStatus(),
// shown in /api/health. Recorded in docs/INTEGRATION_REGISTER.md 1.1.
//
// With CIVICOS_STATE=postgres nothing is single-writer: every store is in the
// record tables, any instance takes any change (a server without the lease is
// a follower, not a standby), changes are durable when committed, and every
// instance follows the others through the outbox. The lease then only names
// the instance that runs what follows a durable audit entry (CloudEvents,
// signed heads); a follower takes it over when its holder stops renewing it.
// (RECORD_ROUTES is what a standby takes when the documents are turned off.)

import { promises as fs, readFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { withSpan } from '@/lib/ops/trace';
import { encode, decode } from '@/lib/data/encode';
import { useBackend } from '@/lib/data/repo';
import type { Records, RecordsStatus } from '@/lib/data/repo/postgres';
import { installSettle } from '@/lib/data/repo/settle';
import { log } from '@/lib/ops/log';

/** Who holds the writer's lease, and whether the caller now does. */
export interface Lease { holder: string; expiresAt: string; acquired: boolean }
/** A versioned save: the writer, and the version of the key it last read or wrote (0: none). */
export interface SaveFence { writer: string; expected: number }

export interface StateAdapter {
  name: 'file' | 'supabase' | 'postgres' | 'memory';
  loadAll(): Promise<Record<string, unknown>>;
  /** Save one store. With a fence, refuses (StateConflictError) when the stored version is not `expected`; returns the new version. */
  save(key: string, json: string, fence?: SaveFence): Promise<number | void>;
  /** The stored version of every key (absent: 0). */
  versions?(): Promise<Record<string, number>>;
  /** Take or renew the writer's lease for `ttlMs`. */
  lease?(writer: string, ttlMs: number): Promise<Lease>;
  /** Give the lease up (only when `writer` holds it). */
  release?(writer: string): Promise<void>;
  /** The same, synchronously, for the process 'exit' event (where nothing asynchronous runs). */
  releaseSync?(writer: string): void;
  /** Remove a store's saved snapshot (a data restore to a time before the store existed). */
  remove?(key: string): Promise<void>;
}

/** Another writer saved since this one read, or this one no longer holds the lease: nothing was written. */
export class StateConflictError extends Error {
  constructor(message: string) { super(message); this.name = 'StateConflictError'; }
}
/** The store has no fencing yet (the substrate migration is not applied). */
export class FencingUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'FencingUnavailableError'; }
}

/** Snapshot format; bump when the envelope changes. */
export const SNAPSHOT_FORMAT = 1;
const KEY = /^__civicos[A-Za-z0-9_]*$/;

// ── Serialisation that keeps Maps, Sets and Dates (lib/data/encode.ts) ─────
export { encode, decode };

// ── Adapters ──────────────────────────────────────────────────────────────
const LOCK = '.writer.lock';
interface LockRecord { writer: string; pid: number; host: string; procStart?: number; acquiredAt: string; renewedAt: string; expiresAt: string }
/** When this process started (ms, rounded): tells an earlier life of the same pid (a container restart) from this one. */
const PROC_START = Math.round((Date.now() - process.uptime() * 1000) / 1000) * 1000;

function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
}

async function writeAtomic(file: string, text: string): Promise<void> {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`);
  await fs.writeFile(tmp, text, 'utf8');
  await fs.rename(tmp, file);
}

export function fileAdapter(dir: string): StateAdapter {
  const lockFile = path.join(dir, LOCK);
  const versionFile = (key: string) => path.join(dir, `${key}.version`);
  const readVersion = async (key: string): Promise<number> => {
    try { return Number((JSON.parse(await fs.readFile(versionFile(key), 'utf8')) as { version?: number }).version) || 0; } catch { return 0; }
  };
  const readLock = async (): Promise<LockRecord | null> => {
    try { return JSON.parse(await fs.readFile(lockFile, 'utf8')) as LockRecord; } catch { return null; }
  };
  return {
    name: 'file',
    async loadAll() {
      const out: Record<string, unknown> = {};
      const names = await fs.readdir(dir).catch(() => [] as string[]);
      for (const n of names) {
        const key = n.replace(/\.json$/, '');
        if (!n.endsWith('.json') || !KEY.test(key)) continue;
        out[key] = await fs.readFile(path.join(dir, n), 'utf8');
      }
      return out;
    },
    async versions() {
      const out: Record<string, number> = {};
      const names = await fs.readdir(dir).catch(() => [] as string[]);
      for (const n of names) {
        const key = n.replace(/\.version$/, '');
        if (n.endsWith('.version') && KEY.test(key)) out[key] = await readVersion(key);
      }
      return out;
    },
    async save(key, json, fence) {
      await fs.mkdir(dir, { recursive: true });
      if (fence) {
        const lock = await readLock();
        if (!lock || lock.writer !== fence.writer) throw new StateConflictError(`this server no longer holds the state lease (held by ${lock?.writer ?? 'nobody'})`);
      }
      const current = await readVersion(key);
      if (fence && current !== fence.expected) throw new StateConflictError(`${key} was saved by another writer (version ${current}, this server expected ${fence.expected})`);
      await writeAtomic(path.join(dir, `${key}.json`), json);
      const next = current + 1;
      await writeAtomic(versionFile(key), JSON.stringify({ version: next, writer: fence?.writer ?? null, at: new Date().toISOString() }));
      return next;
    },
    async lease(writer, ttlMs) {
      await fs.mkdir(dir, { recursive: true });
      const now = new Date();
      const record = (acquiredAt = now.toISOString()): LockRecord => ({
        writer, pid: process.pid, host: os.hostname(), procStart: PROC_START, acquiredAt, renewedAt: now.toISOString(), expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      });
      // The first writer creates the lock exclusively (O_EXCL), so two servers starting together cannot both win.
      try {
        const h = await fs.open(lockFile, 'wx');
        const r = record();
        try { await h.writeFile(JSON.stringify(r), 'utf8'); } finally { await h.close(); }
        return { holder: writer, expiresAt: r.expiresAt, acquired: true };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      }
      const held = await readLock();
      const stale = !held
        || Date.parse(held.expiresAt) < now.getTime()
        // On the same host: a holder whose process has gone, or an earlier life of this process id (a container restart).
        || (held.host === os.hostname() && held.writer !== writer && (held.pid === process.pid ? held.procStart !== PROC_START : !pidAlive(held.pid)));
      if (held && held.writer !== writer && !stale) return { holder: held.writer, expiresAt: held.expiresAt, acquired: false };
      const r = record(held?.writer === writer ? held.acquiredAt : undefined);
      await writeAtomic(lockFile, JSON.stringify(r));
      // Taking over a stale lock can race another server doing the same: whoever's record is in the file holds it.
      const after = await readLock();
      return after?.writer === writer
        ? { holder: writer, expiresAt: r.expiresAt, acquired: true }
        : { holder: after?.writer ?? 'unknown', expiresAt: after?.expiresAt ?? r.expiresAt, acquired: false };
    },
    async release(writer) {
      const held = await readLock();
      if (held?.writer === writer) await fs.unlink(lockFile).catch(() => undefined);
    },
    async remove(key) {
      if (!KEY.test(key)) return;
      await fs.unlink(path.join(dir, `${key}.json`)).catch(() => undefined);
    },
    releaseSync(writer) {
      try {
        if ((JSON.parse(readFileSync(lockFile, 'utf8')) as LockRecord).writer === writer) unlinkSync(lockFile);
      } catch { /* no lock, or not ours */ }
    },
  };
}

/** The nation's substrate (Supabase). Uses the service-role RPCs from migrations civicos_platform_state and civicos_platform_state_fencing. */
export async function supabaseAdapter(): Promise<StateAdapter | null> {
  const { serverClient } = await import('@/lib/db/client');
  const db = serverClient();
  if (!db) return null;
  const missing = (m: string) => /could not find|does not exist|schema cache|PGRST202/i.test(m);
  return {
    name: 'supabase',
    async loadAll() {
      const { data, error } = await db.rpc('civicos_platform_state_all' as never);
      if (error) throw new Error(`civicos_platform_state_all: ${error.message}`);
      const out: Record<string, unknown> = {};
      for (const row of (data ?? []) as { key: string; value: string }[]) if (KEY.test(row.key)) out[row.key] = row.value;
      return out;
    },
    async versions() {
      const { data, error } = await db.rpc('civicos_platform_state_versions' as never);
      if (error) throw missing(error.message) ? new FencingUnavailableError(error.message) : new Error(`civicos_platform_state_versions: ${error.message}`);
      const out: Record<string, number> = {};
      for (const row of (data ?? []) as { key: string; version: number | string }[]) if (KEY.test(row.key)) out[row.key] = Number(row.version) || 0;
      return out;
    },
    async save(key, json, fence) {
      if (!fence) {
        const { error } = await db.rpc('civicos_platform_state_put' as never, { p_key: key, p_value: json } as never);
        if (error) throw new Error(`civicos_platform_state_put: ${error.message}`);
        return;
      }
      const { data, error } = await db.rpc('civicos_platform_state_put_versioned' as never,
        { p_key: key, p_value: json, p_writer: fence.writer, p_expected: fence.expected } as never);
      if (error) {
        if (/another writer|does not hold the state lease/i.test(error.message)) throw new StateConflictError(error.message);
        throw new Error(`civicos_platform_state_put_versioned: ${error.message}`);
      }
      return Number(data) || fence.expected + 1;
    },
    async lease(writer, ttlMs) {
      const { data, error } = await db.rpc('civicos_platform_state_lease' as never, { p_writer: writer, p_ttl_seconds: Math.ceil(ttlMs / 1000) } as never);
      if (error) throw missing(error.message) ? new FencingUnavailableError(error.message) : new Error(`civicos_platform_state_lease: ${error.message}`);
      const row = (Array.isArray(data) ? data[0] : data) as { holder: string; expires_at: string; acquired: boolean } | null;
      if (!row) throw new Error('civicos_platform_state_lease returned nothing');
      return { holder: row.holder, expiresAt: row.expires_at, acquired: !!row.acquired };
    },
    async release(writer) {
      await db.rpc('civicos_platform_state_release' as never, { p_writer: writer } as never);
    },
  };
}

// ── Restore and save ──────────────────────────────────────────────────────
/**
 * writer: holds the lease and saves (in memory mode there is nothing to fence).
 * standby: another server holds the lease; this one saves nothing and refuses changes.
 * stopped: it held the lease but lost it, or another writer saved over its versions; it stopped saving.
 */
export type WriterRole = 'writer' | 'standby' | 'stopped';
export interface PersistenceStatus {
  adapter: StateAdapter['name']; restored: string[]; lastSaved?: string; saves: number; error?: string; startedAt: string;
  /** This server's writer id (host, pid and a random part; new on every start). */
  writer?: string;
  role?: WriterRole;
  /** How a second instance is kept from overwriting: lease and versions, or none (memory, or the substrate migration not applied). */
  fencing?: 'lease+version' | 'none';
  /** The lease as last seen: who holds it and until when. */
  lease?: { holder: string; expiresAt: string };
  /** What this server's role means now, when it is not a problem (a follower in postgres mode). */
  note?: string;
  /** Save ticks skipped because nothing was audited since the last save (review D2). */
  skipped?: number;
  /** CIVICOS_STATE=postgres: the per-record tables (queue depth, outbox lag, PostGIS). */
  records?: RecordsStatus;
  /** A data restore is being applied here (lib/data/backups.ts): changes are refused until it ends. */
  restoring?: boolean;
  /** Another instance restored the state from a backup: this server must restart before it takes changes. */
  restartRequired?: string;
}
type Status = PersistenceStatus;
const g = globalThis as unknown as Record<string, unknown> & {
  __persistStatus?: Status; __persistLast?: Map<string, string>; __persistVersions?: Map<string, number>; __persistChanges?: number; __persistSeen?: number;
  __persistLastSweep?: number; __persistRecords?: Records; __persistExcluded?: Map<string, string[]>;
  /** What a data restore needs to reach: the adapter, the save loop, and how the per-record backend was started. */
  __persistAdapter?: StateAdapter; __persistSave?: () => Promise<void>; __persistRecordsOpts?: import('@/lib/data/repo/postgres').RecordsOptions;
};

/**
 * Changes that touch only the per-record registers (CIVICOS_STATE=postgres):
 * facility actions, boundary versions, twin crosswalk keys and import
 * withdrawals. Any instance takes them, a standby too. Everything else
 * changes a snapshot store and needs the single writer.
 */
export const RECORD_ROUTES: RegExp[] = [/^\/api\/boundaries(\/[^/]+)?$/, /^\/api\/facilities\/[^/]+$/, /^\/api\/twin\/keys$/, /^\/api\/twin\/runs\/[^/]+\/withdraw$/];

/** The header the middleware names a change's path in when it asks GET /api/auth/official whether this server takes it. */
export const CHANGE_PATH_HEADER = 'x-civicos-change-path';

/** Leave these fields of these stores out of every snapshot (they live in tables). */
export function keepOutOfSnapshot(fields: Record<string, string[]>): void {
  const m = (g.__persistExcluded ??= new Map());
  for (const [k, v] of Object.entries(fields)) m.set(k, v);
}
/** A store as its snapshot holds it: without the fields kept in tables. */
function snapshotOf(key: string): unknown {
  const v = g[key], drop = g.__persistExcluded?.get(key);
  if (!drop || !v || typeof v !== 'object') return v;
  const out: Record<string, unknown> = { ...(v as Record<string, unknown>) };
  for (const f of drop) delete out[f];
  return out;
}

/**
 * Note that the state changed. The audit chain calls it for every audited
 * change (lib/data/store.ts appendAudit), so the save loop can skip encoding
 * every store when nothing was audited since the last save (review D2). A
 * change that is not audited is still saved by the full sweep, at the latest
 * CIVICOS_STATE_SWEEP_MS later (default 60 s).
 */
export function markChanged(): void { g.__persistChanges = (g.__persistChanges ?? 0) + 1; }

/** Whether the loop may skip this tick: nothing audited since the last save and the last full sweep is recent. */
export function quietSince(now: number, sweepMs: number): boolean {
  return (g.__persistChanges ?? 0) === (g.__persistSeen ?? -1) && now - (g.__persistLastSweep ?? 0) < sweepMs;
}

/** The stores currently on globalThis. */
export function liveKeys(): string[] {
  return Object.keys(globalThis).filter(k => KEY.test(k) && g[k] !== undefined);
}

/** Put saved stores back on globalThis. Only keys not already live are restored (a store that started fresh is never overwritten). */
export function restore(saved: Record<string, unknown>): string[] {
  const restored: string[] = [];
  for (const [key, raw] of Object.entries(saved)) {
    if (!KEY.test(key) || g[key] !== undefined) continue;
    try {
      const env = decode(String(raw)) as { v?: number; data?: unknown };
      if (env?.v !== SNAPSHOT_FORMAT) continue;
      g[key] = env.data;
      restored.push(key);
    } catch { /* an unreadable snapshot is skipped; the store seeds as new */ }
  }
  return restored;
}

/**
 * Write every store whose contents changed since the last save. Returns the
 * keys written. With a writer id, each save names the version this server last
 * read or wrote; a StateConflictError stops the flush and nothing is overwritten.
 */
export async function flush(adapter: StateAdapter, now = new Date(), writer?: string): Promise<string[]> {
  g.__persistSeen = g.__persistChanges ?? 0;
  g.__persistLastSweep = now.getTime();
  const last = (g.__persistLast ??= new Map());
  const versions = (g.__persistVersions ??= new Map());
  const written: string[] = [];
  for (const key of liveKeys()) {
    // CIVICOS_STATE=postgres: a store kept as per-record documents has no snapshot.
    if (g.__persistRecords?.owns?.(key)) continue;
    const data = encode(snapshotOf(key));
    if (last.get(key) === data) continue;
    const json = JSON.stringify({ v: SNAPSHOT_FORMAT, at: now.toISOString(), ...(writer ? { writer } : {}), data: JSON.parse(data) });
    const v = await withSpan('state.save', { 'civicos.store': key, 'civicos.adapter': adapter.name, 'civicos.bytes': json.length }, () => adapter.save(key, json, writer ? { writer, expected: versions.get(key) ?? 0 } : undefined));
    if (typeof v === 'number') versions.set(key, v);
    last.set(key, data);
    written.push(key);
  }
  if (g.__persistStatus) { g.__persistStatus.saves += written.length ? 1 : 0; if (written.length) g.__persistStatus.lastSaved = now.toISOString(); }
  return written;
}

export function persistenceStatus(): Status {
  const s = g.__persistStatus ?? { adapter: 'memory', restored: [], saves: 0, startedAt: new Date(0).toISOString() };
  return g.__persistRecords ? { ...s, records: g.__persistRecords.status() } : s;
}

/**
 * Whether this server may accept changes: false on a standby, or on a writer
 * that stopped saving (its changes would be lost). With CIVICOS_STATE=postgres
 * and the change's path given, a change that touches only the per-record
 * registers (RECORD_ROUTES) is accepted on any instance.
 */
export function stateWritable(pathname?: string): boolean {
  // A data restore in progress here, or applied by another instance (restart first): no change is taken.
  if (g.__persistStatus?.restoring || g.__persistStatus?.restartRequired) return false;
  const r = g.__persistStatus?.role;
  if (r !== 'standby' && r !== 'stopped') return true;
  // Every store in the record tables (the default in postgres mode): any instance takes any change.
  if (g.__persistRecords?.ownsAll) return true;
  return !!g.__persistRecords && !!pathname && RECORD_ROUTES.some(re => re.test(pathname));
}

/** The per-record backend when CIVICOS_STATE=postgres started it. */
export const recordsBackend = (): Records | undefined => g.__persistRecords;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** A serverless host (Vercel, or CIVICOS_SERVERLESS=on): no timer runs between requests. */
export const serverless = (env: Record<string, string | undefined> = process.env): boolean =>
  !!env.VERCEL || /^(on|1|true)$/i.test(env.CIVICOS_SERVERLESS ?? '');

/**
 * Every request finishes its durable writes (lib/data/repo/settle.ts, wiring
 * audit §13): a changing request's changes are committed before its response,
 * a request on an instance that follows others only by the poll pulls first
 * when its last pull is older than CIVICOS_READ_FRESH_MS (default 250; 0 off,
 * waiting at most CIVICOS_READ_FRESH_TIMEOUT_MS, default 300), and on a
 * serverless host the snapshot of file/supabase modes is saved with the
 * request instead of by the 5 s timer. CIVICOS_SETTLE=off turns it off;
 * CIVICOS_SETTLE_TIMEOUT_MS (default 5000) bounds the wait for a commit.
 */
export function installRequestSettle(env: Record<string, string | undefined> = process.env): boolean {
  if (/^off$/i.test(env.CIVICOS_SETTLE ?? '')) { installSettle(undefined); return false; }
  const onServerless = serverless(env);
  if (!g.__persistRecords && !(onServerless && g.__persistAdapter)) { installSettle(undefined); return false; }
  const settleMs = Number(env.CIVICOS_SETTLE_TIMEOUT_MS) || 5000;
  const freshMs = env.CIVICOS_READ_FRESH_MS !== undefined ? Math.max(0, Number(env.CIVICOS_READ_FRESH_MS) || 0) : 250;
  const freshWait = Number(env.CIVICOS_READ_FRESH_TIMEOUT_MS) || 300;
  // A snapshot save is needed with the request only where the save loop's timer does not run (and the records do not hold every store).
  const snapshots = () => onServerless && !!g.__persistSave && !g.__persistRecords?.ownsAll;
  installSettle({
    async before() {
      const r = g.__persistRecords;
      // With LISTEN other instances' commits arrive as they happen; behind a transaction pooler only the poll brings them.
      if (r && freshMs > 0 && !r.listening) await r.freshen(freshMs, freshWait);
    },
    async settle() {
      const r = g.__persistRecords;
      const ok = r ? await r.settle(settleMs) : true;
      if (!ok) log('warn', 'records.settle.timeout', { timeoutMs: settleMs, queued: r?.status().queueDepth, message: r?.status().error });
      if (snapshots()) await g.__persistSave!();
      return ok;
    },
    pending: () => onServerless && (!!g.__persistRecords?.pending() || (snapshots() && (g.__persistChanges ?? 0) !== (g.__persistSeen ?? -1))),
  });
  return true;
}

// ── Data restore (lib/data/backups.ts) ────────────────────────────────────
/** Mark a data restore as running (changes refused) or ended. */
export function setRestoring(on: boolean): void {
  const s = (g.__persistStatus ??= { adapter: 'memory', restored: [], saves: 0, startedAt: new Date().toISOString() });
  s.restoring = on || undefined;
}
/** This server must restart before it takes changes (another instance restored the state). */
export function requireRestart(why: string): void {
  const s = (g.__persistStatus ??= { adapter: 'memory', restored: [], saves: 0, startedAt: new Date().toISOString() });
  s.restartRequired = why;
  s.error = why;
}
/** Write every changed store now (file and supabase modes); nothing to do in memory or postgres mode. */
export async function saveNow(): Promise<void> {
  if (g.__persistSave) await g.__persistSave();
}
/** Drop a store: from memory, from what was last saved, and from the adapter's saved snapshots. */
export async function forgetStore(key: string): Promise<void> {
  if (!KEY.test(key)) return;
  delete g[key];
  g.__persistLast?.delete(key);
  await g.__persistAdapter?.remove?.(key).catch(() => undefined);
}
/**
 * CIVICOS_STATE=postgres, after a data restore rewrote the tables: stop the
 * per-record backend, let `clear` empty the read model, and start it again
 * the way the server started it, so the read model is loaded from the
 * restored tables.
 */
export async function reloadRecords(clear: () => void): Promise<void> {
  const opts = g.__persistRecordsOpts, old = g.__persistRecords;
  if (!opts || !old) throw new Error('The per-record backend is not running');
  await old.stop();
  clear();
  const pg = await import('@/lib/data/repo/postgres');
  const records = await pg.startRecords(opts);
  useBackend(records.backend);
  g.__persistRecords = records;
}

/**
 * Start from the environment (called once by src/instrumentation.ts).
 * CIVICOS_STATE_LEASE_TTL_MS (default 30 s): how long the lease lasts without
 * a heartbeat. CIVICOS_STATE_LEASE_WAIT_MS (default the TTL plus 5 s): how long
 * a starting server waits for an earlier holder's lease to run out (a writer
 * that crashed) before it becomes a standby.
 */
export async function startFromEnv(env = process.env): Promise<Status> {
  const mode = (env.CIVICOS_STATE ?? '').toLowerCase();
  const stateDir = env.CIVICOS_STATE_DIR || path.join(process.cwd(), '.civicos-state');
  // postgres: per-record tables for the ported registers, snapshots for the rest, over one connection pool.
  let pg: typeof import('@/lib/data/repo/postgres') | undefined;
  let sql: import('@/lib/data/repo/postgres').Sql | undefined;
  let pgError: string | undefined;
  if (mode === 'postgres') {
    if (!env.DATABASE_URL) pgError = 'CIVICOS_STATE=postgres but DATABASE_URL is not set; keeping state in memory';
    else {
      // A database starting up or a pooler at its limit can refuse one connection: try three times.
      for (let attempt = 1; attempt <= 3 && !sql; attempt++) {
        try { pg = await import('@/lib/data/repo/postgres'); sql = await pg.connect(env.DATABASE_URL, { max: Number(env.CIVICOS_PG_POOL) || 5 }); await pg.ensureSchema(sql); pgError = undefined; }
        catch (e) {
          pgError = `CIVICOS_STATE=postgres: could not connect or apply the schema (${attempt} attempt${attempt > 1 ? 's' : ''}): ${(e as Error).message}; this server refuses changes`;
          await (sql as { end?: (o: { timeout: number }) => Promise<void> } | undefined)?.end?.({ timeout: 1 }).catch(() => undefined);
          sql = undefined;
          if (attempt < 3) await sleep(attempt * 1000);
        }
      }
    }
  }
  const adapter = mode === 'file' ? fileAdapter(stateDir)
    : mode === 'supabase' ? await supabaseAdapter()
    : pg && sql ? pg.postgresSnapshotAdapter(sql, m => new StateConflictError(m))
    : null;
  const writer = `${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  const status: Status = { adapter: adapter?.name ?? 'memory', restored: [], saves: 0, startedAt: new Date().toISOString(), writer, role: 'writer', fencing: 'none' };
  g.__persistStatus = status;
  g.__persistAdapter = adapter ?? undefined;
  if (!adapter) {
    if (mode === 'supabase') status.error = 'CIVICOS_STATE=supabase but the substrate is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY); this server refuses changes';
    if (pgError) status.error = pgError;
    // Durable state was asked for and is not there: take no change that would live only in this
    // server's memory and be lost (a hosted platform runs many short-lived servers).
    if (mode === 'postgres' || mode === 'supabase') status.role = 'stopped';
    return status;
  }
  const ttl = Number(env.CIVICOS_STATE_LEASE_TTL_MS) || 30_000;
  const wait = env.CIVICOS_STATE_LEASE_WAIT_MS !== undefined ? Number(env.CIVICOS_STATE_LEASE_WAIT_MS) || 0 : ttl + 5_000;
  const interval = Number(env.CIVICOS_STATE_INTERVAL_MS) || 5000;
  const sweep = Number(env.CIVICOS_STATE_SWEEP_MS) || 60_000;
  const unfenced = (e: Error) => `writer fencing unavailable (apply migration civicos_platform_state_fencing): ${e.message}`;

  // 1. The writer's lease first, so the writer restores the latest saves.
  let fenced = !!adapter.lease;
  if (adapter.lease) {
    try {
      let lease = await adapter.lease(writer, ttl);
      for (const until = Date.now() + wait; !lease.acquired && Date.now() < until;) {
        await sleep(Math.min(2000, Math.max(100, ttl / 3)));
        lease = await adapter.lease(writer, ttl);
      }
      status.lease = { holder: lease.holder, expiresAt: lease.expiresAt };
      if (!lease.acquired) {
        status.role = 'standby';
        status.error = `standby: another server (${lease.holder}) holds the state writer's lease until ${lease.expiresAt}; this one saves nothing and refuses changes. Restart it to take over once that server has stopped.`;
      }
    } catch (e) {
      if (e instanceof FencingUnavailableError) { fenced = false; status.error = unfenced(e); }
      else { status.role = 'standby'; status.error = `could not take the state writer's lease: ${(e as Error).message}`; }
    }
  }

  // 2. Restore, with the version of each store as it was read.
  try {
    status.restored = restore(await adapter.loadAll());
    if (fenced && adapter.versions) {
      const versions = (g.__persistVersions ??= new Map());
      for (const [k, v] of Object.entries(await adapter.versions())) versions.set(k, v);
    }
  } catch (e) {
    if (e instanceof FencingUnavailableError) { fenced = false; status.error = unfenced(e); }
    else status.error = `restore failed: ${(e as Error).message}`;
  }
  status.fencing = fenced ? 'lease+version' : 'none';

  // 3. postgres: the per-record registers, on writer and standby alike (lib/data/repo/postgres.ts).
  let records: Records | undefined;
  if (pg && sql) {
    try {
      const opts: import('@/lib/data/repo/postgres').RecordsOptions = {
        sql, instance: writer, isPrimary: () => status.role === 'writer',
        journalDir: env.CIVICOS_PG_JOURNAL_DIR || path.join(stateDir, 'journal'),
        pollMs: Number(env.CIVICOS_PG_POLL_MS) || 2000,
        // Every other store as per-record documents unless turned off (then they keep single-writer snapshots, as before).
        documents: (env.CIVICOS_PG_DOCUMENTS ?? '').toLowerCase() !== 'off',
        docMs: Number(env.CIVICOS_PG_DOC_MS) || 1000,
        sweepMs: Number(env.CIVICOS_PG_SWEEP_MS) || 30_000,
      };
      records = await pg.startRecords(opts);
      g.__persistRecordsOpts = opts;
      useBackend(records.backend);
      keepOutOfSnapshot(pg.RECORD_FIELDS);
      g.__persistRecords = records;
    } catch (e) {
      status.role = 'standby';
      status.error = `the per-record tables could not be started: ${(e as Error).message}; this server refuses changes`;
    }
  }
  // Requests finish their own writes (postgres, or any saved mode on a serverless host); the save loop is read when called.
  installRequestSettle(env);

  // Baseline: what was just restored needs no immediate write.
  const last = (g.__persistLast ??= new Map());
  for (const k of status.restored) last.set(k, encode(snapshotOf(k)));
  // Every store in the record tables (postgres mode): the lease no longer guards the state, only which
  // instance runs what follows a durable audit entry (CloudEvents, signed heads). A follower takes every
  // change, and takes the lease over when its holder stops renewing it.
  const follower = (holder: string, until: string) => `follower: ${holder} holds the writer's lease until ${until}; this server takes every change (every store is per record in the database) and takes the lease over when it runs out`;
  const allRecords = !!records?.ownsAll;
  if (status.role === 'standby' && allRecords && status.error?.startsWith('standby:') && status.lease) status.error = undefined;
  if (status.role === 'standby' && !allRecords) {
    if (records && status.error?.startsWith('standby:')) status.error = status.error.replace('saves nothing and refuses changes', 'saves no snapshot and takes only changes to the per-record registers (RECORD_ROUTES)');
    // A standby still takes record changes: write them out before it stops.
    if (records) for (const sig of ['SIGTERM', 'SIGINT'] as const) process.once(sig, () => { void records!.drain(5000).finally(() => process.exit(0)); });
    return status;
  }
  if (status.role === 'standby' && status.lease) status.note = follower(status.lease.holder, status.lease.expiresAt);

  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = (why: string) => { status.role = 'stopped'; status.error = why; if (timer) clearInterval(timer); };
  const save = async (): Promise<void> => {
    if (status.role === 'stopped' || (status.role === 'standby' && !allRecords) || status.restartRequired) return;
    try {
      if (fenced && adapter.lease) {
        const lease = await adapter.lease(writer, ttl);
        status.lease = { holder: lease.holder, expiresAt: lease.expiresAt };
        if (allRecords && status.error?.startsWith('could not take the state writer')) status.error = undefined;
        if (!lease.acquired) {
          if (allRecords) { status.role = 'standby'; status.note = follower(lease.holder, lease.expiresAt); return; }
          return stop(`stopped: the state writer's lease passed to ${lease.holder}; changes made here since the last save were not saved. Restart this server.`);
        }
        if (status.role === 'standby') { status.role = 'writer'; status.note = undefined; }
      }
      // Nothing audited since the last save and a full sweep recently: no store is encoded this tick.
      if (quietSince(Date.now(), sweep)) { status.skipped = (status.skipped ?? 0) + 1; return; }
      await flush(adapter, new Date(), fenced ? writer : undefined);
      if (status.error?.startsWith('save failed')) status.error = undefined;
    } catch (e) {
      if (e instanceof StateConflictError) return stop(`stopped: ${e.message}; nothing was overwritten. Restart this server.`);
      status.error = `save failed: ${(e as Error).message}`;
    }
  };
  g.__persistSave = save;
  timer = setInterval(() => { void save(); }, interval);
  timer.unref?.();
  // Next.js's own signal handler may end the process before the asynchronous
  // save below finishes; a file lease is still given up as the process exits
  // (a substrate lease runs out after its TTL, and the next server waits for it).
  process.once('exit', () => { if (status.role === 'writer' && fenced) adapter.releaseSync?.(writer); });
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sig, () => {
      void (records ? (g.__persistRecords ?? records).drain(5000) : Promise.resolve(true)).then(save).finally(async () => {
        if (status.role === 'writer' && fenced) await adapter.release?.(writer).catch(() => undefined);
        process.exit(0);
      });
    });
  }
  return status;
}
