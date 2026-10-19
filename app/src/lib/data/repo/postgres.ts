// The postgres backend of the persistence port (architecture review R6;
// CIVICOS_STATE=postgres with DATABASE_URL). Per-record tables, migration
// 20261020000000_civicos_records.sql (./postgres-schema.ts).
//
// Write-through. The domain functions are synchronous, so memory stays the
// read model and every change made through the port is also put on a
// per-process write queue, in order:
//   1. enqueue (synchronous): the op is appended to a journal file
//      (CIVICOS_PG_JOURNAL_DIR, default <CIVICOS_STATE_DIR>/journal) when one
//      is configured, so a crash before the flush loses nothing;
//   2. flush (next tick): every queued op — a change and the audit entry that
//      records it are queued in the same tick — is written in one
//      transaction, with one outbox row per change, and a NOTIFY on
//      civicos_outbox (delivered on commit); a failed flush is retried, in
//      order, with backoff, and nothing is dropped;
//   3. the journal is emptied once the queue has drained.
// The audit chain is ordered by the database: an entry must chain from the
// one before (trigger). When another instance appended first, the flush
// fails as a whole, this instance takes the other entries into its chain,
// moves its own uncommitted entries up the chain (new sequence, previous
// hash and hash, changed in place) and tries again. What follows a durable
// entry — its CloudEvent and the periodic signed head — runs on the instance
// that holds the snapshot writer's lease, once the entry is final.
//
// Start: the schema is applied (idempotent, under an advisory lock), a
// journal left by a crash is replayed (idempotent), records still only in a
// restored snapshot are imported once, and the read model is loaded from the
// tables in one repeatable-read transaction together with the outbox
// position. Other instances' changes then arrive through the outbox
// (LISTEN civicos_outbox, and a poll every CIVICOS_PG_POLL_MS, default 2 s).
// Record numbers (FAC-, RUN-, SRC-, bnd-) come from blocks reserved in
// civicos.record_counter, so two instances never give the same number.

import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import type { Observation, TwinEntity, TwinRun, TwinSource } from '@/lib/twin/register';
import type { Facility } from '@/lib/data/facilities';
import type { BoundaryVersion } from '@/lib/data/boundaries';
import { auditHashV2 } from '@/lib/data/store/audit';
import { auditCommitted } from '@/lib/data/store/audit-committed';
import { log } from '@/lib/ops/log';
import { memoryAudit, memoryBoundaries, memoryFacilities, memoryTwin } from './memory';
import { RECORDS_SCHEMA } from './postgres-schema';
import type { Backend, BoundaryStore, FacilityStore } from './types';
import type { Lease, StateAdapter } from '@/lib/data/persist';

// The driver's query function, as far as this module uses it.
type Row = Record<string, unknown>;
export interface Sql {
  unsafe(query: string, params?: unknown[]): Promise<Row[]> & { simple?(): Promise<Row[]> };
  begin<T>(cb: (tx: Sql) => Promise<T>): Promise<T>;
  begin<T>(mode: string, cb: (tx: Sql) => Promise<T>): Promise<T>;
  listen?(channel: string, fn: (value: string) => void): Promise<{ unlisten(): Promise<void> }>;
  end?(opts?: { timeout?: number }): Promise<void>;
}

/** Connect with the `postgres` driver (loaded only in this mode). */
export async function connect(url: string, opts: { max?: number } = {}): Promise<Sql> {
  const { default: postgres } = await import('postgres');
  return postgres(url, { max: opts.max ?? 5, onnotice: () => undefined, idle_timeout: 60, connect_timeout: 10 }) as unknown as Sql;
}

const q = (sql: Sql, text: string, params: unknown[] = []): Promise<Row[]> => sql.unsafe(text, params);
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`;
const iso = (col: string) => `to_char(${col} at time zone 'UTC', ${ISO})`;

/** Apply the records schema (idempotent; one instance at a time). Returns whether PostGIS is in use. */
export async function ensureSchema(sql: Sql): Promise<{ postgis: boolean }> {
  // Applied once per version of the schema: re-running its DDL while other instances write would take their tables' locks.
  const version = createHash('sha256').update(RECORDS_SCHEMA).digest('hex');
  const applied = async (s: Sql) => (await q(s, `select to_regclass('civicos.records_schema') is not null as t`))[0]!.t
    && (await q(s, `select 1 from civicos.records_schema where version = $1`, [version])).length > 0;
  if (!(await applied(sql))) {
    await sql.begin(async tx => {
      await q(tx, `select pg_advisory_xact_lock(hashtext('civicos.records.schema'))`);
      if (await applied(tx)) return;
      const all = tx.unsafe(RECORDS_SCHEMA);
      await (all.simple ? all.simple() : all);
      await q(tx, `create table if not exists civicos.records_schema (version text primary key, applied_at timestamptz not null default now())`);
      await q(tx, `alter table civicos.records_schema enable row level security`);
      await q(tx, `insert into civicos.records_schema (version) values ($1) on conflict do nothing`, [version]);
    });
  }
  const ext = await q(sql, `select 1 from pg_extension where extname = 'postgis'`);
  return { postgis: ext.length > 0 };
}

// ── The read model, on a root object (globalThis in the server) ───────────
// Tests give an instance its own root to stand for a second server.
type Root = Record<string, unknown>;
interface TwinArchiveLike { observations: Record<string, Observation[]>; runs: TwinRun[]; moves: unknown[] }
const chainOf = (r: Root): AuditEntry[] => (((r.__civicos ??= {}) as { audit?: AuditEntry[] }).audit ??= []);
const twinOf = (r: Root): TwinDb => {
  const d = (r.__civicosTwin ??= { entities: {}, keys: [], sources: [], runs: [], observations: [], seq: 1, metrics: {} }) as TwinDb;
  d.entities ??= {}; d.keys ??= []; d.sources ??= []; d.runs ??= []; d.observations ??= []; d.metrics ??= {}; d.seq ??= 1;
  return d;
};
const archiveOf = (r: Root): TwinArchiveLike => {
  const a = (r.__civicosTwinArchive ??= { observations: {}, runs: [], moves: [] }) as TwinArchiveLike;
  a.observations ??= {}; a.runs ??= []; a.moves ??= [];
  return a;
};
const facilitiesOf = (r: Root): FacilityStore => {
  const d = (r.__civicosFacilities ??= { facilities: [], changes: [], imports: [], seq: 1 }) as FacilityStore;
  d.facilities ??= []; d.seq ??= 1;
  return d;
};
const boundariesOf = (r: Root): BoundaryStore => {
  const d = (r.__civicosBoundaries ??= { versions: [], seq: 1 }) as BoundaryStore;
  d.versions ??= []; d.seq ??= 1;
  return d;
};

/** The fields of each store kept in tables, not in the JSON snapshot (lib/data/persist.ts leaves them out of saves). */
export const RECORD_FIELDS: Record<string, string[]> = {
  __civicos: ['audit'],
  __civicosTwin: ['entities', 'keys', 'sources', 'runs', 'observations'],
  __civicosTwinArchive: ['observations', 'runs'],
  __civicosFacilities: ['facilities'],
  __civicosBoundaries: ['versions'],
};

// ── Ops ───────────────────────────────────────────────────────────────────
type Op =
  | { topic: 'audit'; data: AuditEntry }
  | { topic: 'twin.entity'; data: TwinEntity }
  | { topic: 'twin.key'; data: { entityId: string; system: string; key: string } }
  | { topic: 'twin.source'; data: TwinSource }
  | { topic: 'twin.run'; data: TwinRun }
  | { topic: 'twin.observations'; data: { runId: string; from: number; list: Observation[] } }
  | { topic: 'twin.supersede'; data: { runId: string; at: string } }
  | { topic: 'facility'; data: Facility }
  | { topic: 'boundary.version'; data: BoundaryVersion };

const recordId = (op: Op): string => {
  switch (op.topic) {
    case 'audit': return op.data.id;
    case 'twin.key': return `${op.data.system}:${op.data.key}`;
    case 'twin.observations': case 'twin.supersede': return op.data.runId;
    default: return op.data.id;
  }
};
/** What other instances are told (big lists are fetched from the tables, not carried). */
const payloadOf = (op: Op): unknown => {
  switch (op.topic) {
    case 'twin.observations': return { runId: op.data.runId, from: op.data.from, count: op.data.list.length };
    case 'boundary.version': return { id: op.data.id, state: op.data.state };
    default: return op.data;
  }
};

const day = (d: string) => `${d}T00:00:00Z`;
function bbox(geom: { coordinates: unknown }): [number, number, number, number] | null {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  const walk = (x: unknown): void => {
    if (Array.isArray(x) && typeof x[0] === 'number' && typeof x[1] === 'number') { a = Math.min(a, x[0]); b = Math.min(b, x[1]); c = Math.max(c, x[0]); d = Math.max(d, x[1]); return; }
    if (Array.isArray(x)) for (const y of x) walk(y);
  };
  walk(geom?.coordinates);
  return Number.isFinite(a) ? [a, b, c, d] : null;
}

/** Write one op (inside the flush transaction). */
async function writeOp(tx: Sql, op: Op, instance: string): Promise<void> {
  switch (op.topic) {
    case 'audit': {
      const e = op.data;
      await q(tx, `insert into civicos.audit_entry (seq, id, at, actor, action, resource, outcome, detail, prev_hash, hash, alg, instance)
                   values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) on conflict (id) do nothing`,
        [e.seq, e.id, e.at, e.actor, e.action, e.resource, e.outcome, e.detail ?? null, e.prevHash ?? null, e.hash, e.alg ?? null, instance]);
      return;
    }
    case 'twin.entity': {
      const e = op.data;
      await q(tx, `insert into civicos.twin_entity (id, uri, kind, name, code, parent, region, ord, lng, lat, doc) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text::jsonb)
                   on conflict (id) do update set uri = excluded.uri, kind = excluded.kind, name = excluded.name, code = excluded.code, parent = excluded.parent,
                     region = excluded.region, ord = excluded.ord, lng = excluded.lng, lat = excluded.lat, doc = excluded.doc, updated_at = now()`,
        [e.id, e.uri ?? null, e.kind, e.name, e.code ?? null, e.parent ?? null, e.region ?? null, e.order ?? null, e.location?.lng ?? null, e.location?.lat ?? null, JSON.stringify(e)]);
      return;
    }
    case 'twin.key':
      await q(tx, `insert into civicos.twin_key (system, key, entity_id) values ($1, $2, $3) on conflict (system, key) do nothing`, [op.data.system, op.data.key, op.data.entityId]);
      return;
    case 'twin.source':
      await q(tx, `insert into civicos.twin_source (id, doc) values ($1, $2::text::jsonb) on conflict (id) do update set doc = excluded.doc, updated_at = now()`, [op.data.id, JSON.stringify(op.data)]);
      return;
    case 'twin.run':
      await q(tx, `insert into civicos.twin_run (id, source_id, at, doc) values ($1, $2, $3::timestamptz, $4::text::jsonb) on conflict (id) do update set doc = excluded.doc, updated_at = now()`,
        [op.data.id, op.data.sourceId, op.data.at, JSON.stringify(op.data)]);
      return;
    case 'twin.observations': {
      const { runId, from, list } = op.data;
      for (let i = 0; i < list.length; i += 20_000) {
        const rows = list.slice(i, i + 20_000).map((o, k) => ({
          run_id: runId, ord: from + i + k, entity_id: o.entityId, metric: o.metric, value: String(o.value), unit: o.unit,
          valid_from: day(o.validFrom), valid_to: o.validTo ? day(o.validTo) : null, recorded_at: o.recordedAt, superseded_at: o.supersededAt ?? null,
          source_id: o.sourceId, quality: o.quality ?? null,
        }));
        await q(tx, `insert into civicos.twin_observation (run_id, ord, entity_id, metric, value, unit, valid, recorded_at, superseded_at, source_id, quality)
                     select x.run_id, x.ord, x.entity_id, x.metric, x.value::numeric, x.unit,
                            tstzrange(x.valid_from::timestamptz, x.valid_to::timestamptz, '[)'), x.recorded_at::timestamptz, x.superseded_at::timestamptz, x.source_id, x.quality
                     from jsonb_to_recordset($1::text::jsonb) as x(run_id text, ord int, entity_id text, metric text, value text, unit text, valid_from text, valid_to text,
                                                             recorded_at text, superseded_at text, source_id text, quality jsonb)
                     order by x.ord
                     on conflict (run_id, ord) do nothing`, [JSON.stringify(rows)]);
      }
      return;
    }
    case 'twin.supersede':
      await q(tx, `update civicos.twin_observation set superseded_at = $2::timestamptz where run_id = $1 and superseded_at is null`, [op.data.runId, op.data.at]);
      return;
    case 'facility': {
      const f = op.data;
      await q(tx, `insert into civicos.facility (id, national_id, owner_id, category, state, lng, lat, doc) values ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb)
                   on conflict (id) do update set national_id = excluded.national_id, owner_id = excluded.owner_id, category = excluded.category, state = excluded.state,
                     lng = excluded.lng, lat = excluded.lat, doc = excluded.doc, updated_at = now()`,
        [f.id, f.ids?.national ?? null, f.ownerId, f.category, f.state, f.location.lng, f.location.lat, JSON.stringify(f)]);
      return;
    }
    case 'boundary.version': {
      const v = op.data;
      const { units, ...rest } = v;
      await q(tx, `insert into civicos.boundary_version (id, iso3, level, n, state, valid_from, sha256, doc) values ($1, $2, $3, $4, $5, $6::date, $7, $8::text::jsonb)
                   on conflict (id) do update set state = excluded.state, doc = excluded.doc, updated_at = now()`,
        [v.id, v.iso3, v.level, v.n, v.state, v.validFrom, v.sha256, JSON.stringify({ ...rest, units: [] })]);
      const rows = units.map((u, ord) => { const b = bbox(u.geometry); return { version_id: v.id, ord, code: u.code, name: u.name, parent: u.parent ?? null, lng: u.lng, lat: u.lat, min_lng: b?.[0] ?? null, min_lat: b?.[1] ?? null, max_lng: b?.[2] ?? null, max_lat: b?.[3] ?? null, geometry: u.geometry, unit: u }; });
      if (rows.length) {
        await q(tx, `insert into civicos.boundary_unit (version_id, ord, code, name, parent, lng, lat, min_lng, min_lat, max_lng, max_lat, geometry, unit)
                     select x.version_id, x.ord, x.code, x.name, x.parent, x.lng, x.lat, x.min_lng, x.min_lat, x.max_lng, x.max_lat, x.geometry, x.unit
                     from jsonb_to_recordset($1::text::jsonb) as x(version_id text, ord int, code text, name text, parent text, lng float8, lat float8,
                                                             min_lng float8, min_lat float8, max_lng float8, max_lat float8, geometry jsonb, unit jsonb)
                     on conflict (version_id, ord) do nothing`, [JSON.stringify(rows)]);
      }
      return;
    }
  }
}

// ── Reading rows back ─────────────────────────────────────────────────────
const toEntry = (r: Row): AuditEntry => ({
  id: String(r.id), at: String(r.at), actor: String(r.actor), action: String(r.action), resource: String(r.resource), outcome: String(r.outcome),
  ...(r.detail != null ? { detail: String(r.detail) } : {}), seq: Number(r.seq), prevHash: r.prev_hash == null ? null : String(r.prev_hash), hash: String(r.hash),
  ...(r.alg != null ? { alg: String(r.alg) as AuditEntry['alg'] } : {}),
});
// bigint columns arrive as strings (the driver's default); a cast aliased to a column's own name would also
// change what ORDER BY sorts by, so ordered columns are selected as they are.
const AUDIT_COLS = `seq, id, at, actor, action, resource, outcome, detail, prev_hash, hash, alg`;
const OBS_COLS = `run_id, ord, entity_id, metric, value::text as value, unit,
  to_char(lower(valid) at time zone 'UTC', 'YYYY-MM-DD') as valid_from,
  case when upper_inf(valid) then null else to_char(upper(valid) at time zone 'UTC', 'YYYY-MM-DD') end as valid_to,
  ${iso('recorded_at')} as recorded_at, ${iso('superseded_at')} as superseded_at, source_id, quality`;
const toObservation = (r: Row): Observation => ({
  entityId: String(r.entity_id), metric: String(r.metric), value: Number(r.value), unit: String(r.unit), validFrom: String(r.valid_from),
  ...(r.valid_to != null ? { validTo: String(r.valid_to) } : {}), recordedAt: String(r.recorded_at),
  ...(r.quality != null ? { quality: r.quality as Observation['quality'] } : {}),
  sourceId: String(r.source_id), runId: String(r.run_id), ...(r.superseded_at != null ? { supersededAt: String(r.superseded_at) } : {}),
});
const doc = <T,>(r: Row): T => (typeof r.doc === 'string' ? JSON.parse(r.doc) : r.doc) as T;

async function loadVersions(sql: Sql, where = '', params: unknown[] = []): Promise<BoundaryVersion[]> {
  const vs = await q(sql, `select id, doc from civicos.boundary_version ${where} order by pos`, params);
  if (!vs.length) return [];
  const units = await q(sql, `select version_id, unit from civicos.boundary_unit where version_id = any($1::text[]) order by version_id, ord`, [vs.map(v => String(v.id))]);
  const by = new Map<string, BoundaryVersion['units']>();
  for (const u of units) (by.get(String(u.version_id)) ?? by.set(String(u.version_id), []).get(String(u.version_id))!).push((typeof u.unit === 'string' ? JSON.parse(u.unit) : u.unit) as BoundaryVersion['units'][number]);
  return vs.map(v => ({ ...doc<BoundaryVersion>(v), units: by.get(String(v.id)) ?? [] }));
}

/** The bitemporal as-of query in SQL (one DISTINCT ON): the same answer as stateAsOf() over the read model. */
export async function stateAsOfSql(sql: Sql, { asOf, knownAt, metric, entityId }: { asOf?: string; knownAt?: string; metric?: string; entityId?: string } = {}): Promise<Observation[]> {
  const t = asOf ? new Date(asOf) : new Date();
  const dayStart = day(t.toISOString().slice(0, 10));
  const at = (knownAt ? new Date(knownAt) : t).toISOString();
  const rows = await q(sql, `select distinct on (entity_id, metric) ${OBS_COLS}
    from civicos.twin_observation
    where recorded_at <= $1::timestamptz and lower(valid) <= $2::timestamptz
      and (superseded_at is null or superseded_at > $1::timestamptz)
      and (upper_inf(valid) or upper(valid) > $2::timestamptz)
      and ($3::text is null or metric = $3) and ($4::text is null or entity_id = $4)
    order by entity_id, metric, lower(valid) desc, recorded_at desc, id asc`, [at, dayStart, metric ?? null, entityId ?? null]);
  return rows.map(toObservation);
}

// ── The snapshot adapter for the stores not moved yet ─────────────────────
/** civicos.platform_state over the same connection: snapshots with versions and the single writer's lease (as migrations 20261017/20261019). */
export function postgresSnapshotAdapter(sql: Sql, conflict: (m: string) => Error): StateAdapter {
  return {
    name: 'postgres',
    async loadAll() {
      const out: Record<string, unknown> = {};
      for (const r of await q(sql, `select key, value from civicos.platform_state`)) out[String(r.key)] = String(r.value);
      return out;
    },
    async versions() {
      const out: Record<string, number> = {};
      for (const r of await q(sql, `select key, version::text as version from civicos.platform_state`)) out[String(r.key)] = Number(r.version) || 0;
      return out;
    },
    async save(key, json, fence) {
      return sql.begin(async tx => {
        if (fence) {
          const l = await q(tx, `select writer from civicos.platform_state_lease where id = 1 and expires_at > now() for update`);
          if (!l.length || l[0]!.writer !== fence.writer) throw conflict(`this server no longer holds the state lease (held by ${l[0]?.writer ?? 'nobody'})`);
        }
        const cur = await q(tx, `select version::text as version from civicos.platform_state where key = $1 for update`, [key]);
        const current = Number(cur[0]?.version ?? 0);
        if (fence && current !== fence.expected) throw conflict(`${key} was saved by another writer (version ${current}, this server expected ${fence.expected})`);
        await q(tx, `insert into civicos.platform_state (key, value, updated_at, version, writer) values ($1, $2, now(), $3, $4)
                     on conflict (key) do update set value = excluded.value, updated_at = now(), version = excluded.version, writer = excluded.writer`,
          [key, json, current + 1, fence?.writer ?? null]);
        return current + 1;
      });
    },
    async lease(writer, ttlMs): Promise<Lease> {
      const ttl = `${Math.ceil(ttlMs / 1000)} seconds`;
      const won = await q(sql, `insert into civicos.platform_state_lease (id, writer, acquired_at, renewed_at, expires_at) values (1, $1, now(), now(), now() + $2::interval)
        on conflict (id) do update set writer = excluded.writer, renewed_at = now(), expires_at = excluded.expires_at,
          acquired_at = case when civicos.platform_state_lease.writer = excluded.writer then civicos.platform_state_lease.acquired_at else now() end
        where civicos.platform_state_lease.writer = excluded.writer or civicos.platform_state_lease.expires_at < now()
        returning writer, ${iso('expires_at')} as expires_at`, [writer, ttl]);
      if (won.length) return { holder: writer, expiresAt: String(won[0]!.expires_at), acquired: true };
      const held = await q(sql, `select writer, ${iso('expires_at')} as expires_at from civicos.platform_state_lease where id = 1`);
      return { holder: String(held[0]?.writer ?? 'unknown'), expiresAt: String(held[0]?.expires_at ?? new Date().toISOString()), acquired: false };
    },
    async release(writer) {
      await q(sql, `delete from civicos.platform_state_lease where id = 1 and writer = $1`, [writer]);
    },
  };
}

// ── The backend ───────────────────────────────────────────────────────────
export interface RecordsStatus {
  adapter: 'postgres';
  postgis: boolean;
  instance: string;
  /** Changes written in memory and not yet committed. */
  queueDepth: number;
  flushes: number;
  lastFlushAt?: string;
  lastFlushMs?: number;
  /** Audit entries moved up the chain because another instance appended first. */
  rebased: number;
  /** Outbox rows applied from other instances, the last one's id, and how far behind its commit time this instance applied it (ms). */
  followed: number;
  outboxSeen: number;
  lagMs: number;
  lastPullAt?: string;
  journal?: string;
  error?: string;
}

export interface Records {
  backend: Backend;
  status(): RecordsStatus;
  /** Write everything queued; resolves when the queue is empty or after `timeoutMs`. */
  drain(timeoutMs?: number): Promise<boolean>;
  /** Apply other instances' changes now (the poll and LISTEN do this on their own). */
  pull(): Promise<number>;
  stateAsOf: (q?: Parameters<typeof stateAsOfSql>[1]) => Promise<Observation[]>;
  stop(): Promise<void>;
  sql: Sql;
}

export interface RecordsOptions {
  sql: Sql;
  instance: string;
  /** Whether this instance holds the snapshot writer's lease (runs what follows a durable audit entry). */
  isPrimary?: () => boolean;
  /** The read model's root (globalThis in the server). */
  root?: Root;
  journalDir?: string | null;
  pollMs?: number;
  /** Record numbers reserved per block. */
  blockSize?: { twin?: number; facility?: number; boundary?: number };
}

const UPSERTS = new Set(['twin.entity', 'twin.source', 'twin.run', 'facility', 'boundary.version']);
const isChainConflict = (e: unknown): boolean => {
  const err = e as { code?: string; constraint_name?: string; message?: string };
  return (err.code === '23505' && /audit_entry_pkey|audit_entry_hash_key/.test(`${err.constraint_name ?? ''} ${err.message ?? ''}`))
    || (err.code === '23514' && /does not chain|chains from nothing/.test(err.message ?? ''));
};

export async function startRecords(opts: RecordsOptions): Promise<Records> {
  const { sql, instance } = opts;
  const root: Root = opts.root ?? (globalThis as unknown as Root);
  const isPrimary = opts.isPrimary ?? (() => true);
  const { postgis } = await ensureSchema(sql);
  const status: RecordsStatus = { adapter: 'postgres', postgis, instance, queueDepth: 0, flushes: 0, rebased: 0, followed: 0, outboxSeen: 0, lagMs: 0 };

  // ── Journal ────────────────────────────────────────────────────────────
  const journal = opts.journalDir ? path.join(opts.journalDir, `journal-${os.hostname()}.jsonl`) : null;
  if (journal) { mkdirSync(path.dirname(journal), { recursive: true }); status.journal = journal; }

  // ── Queue ──────────────────────────────────────────────────────────────
  const queue: Op[] = [];
  const pendingAudit = new Set<AuditEntry>();
  const callbacks = new Map<AuditEntry, (e: AuditEntry) => void>();
  const lastWritten = new Map<string, string>();
  let committedSeq = 0;
  /** Raised whenever this instance's uncommitted entries move up the chain. */
  let rebaseEpoch = 0;
  /** Outbox ids not seen yet below the last one read (see pullOnce). */
  const gaps = new Map<number, number>();
  let scheduled = false, flushing: Promise<void> | null = null, retryMs = 0, stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const enqueue = (op: Op): void => {
    if (UPSERTS.has(op.topic)) {
      const k = `${op.topic}|${recordId(op)}`, text = JSON.stringify(op.data);
      if (lastWritten.get(k) === text) return;
      lastWritten.set(k, text);
    }
    if (journal) appendFileSync(journal, `${JSON.stringify(op)}\n`);
    queue.push(op);
    status.queueDepth = queue.length;
    schedule();
  };
  const schedule = (): void => {
    if (scheduled || stopped) return;
    scheduled = true;
    setImmediate(() => { scheduled = false; void flush(); });
  };

  /** Take entries other instances committed into the chain; this instance's uncommitted entries move up after them. */
  const integrate = (remote: AuditEntry[]): AuditEntry[] => {
    const fresh = remote.filter(e => e.seq > committedSeq).sort((a, b) => a.seq - b.seq);
    if (!fresh.length) return [];
    const chain = chainOf(root);
    const mine = chain.splice(chain.length - pendingAudit.size, pendingAudit.size);
    chain.push(...fresh);
    committedSeq = fresh[fresh.length - 1]!.seq;
    let prev = chain[chain.length - 1]!;
    for (const e of mine) {
      e.seq = prev.seq + 1; e.prevHash = prev.hash; e.hash = auditHashV2(e);
      chain.push(e); prev = e;
    }
    if (mine.length) { status.rebased += mine.length; rebaseEpoch++; }
    if (isPrimary()) for (const e of fresh) { try { auditCommitted(e); } catch (err) { log('warn', 'records.audit.follow', { message: (err as Error).message }); } }
    return fresh;
  };

  /** The entries other instances committed since this instance's head, from the table (the chain never has gaps). */
  const catchUpAudit = async (): Promise<AuditEntry[]> =>
    integrate((await q(sql, `select ${AUDIT_COLS} from civicos.audit_entry where seq > $1 order by seq`, [committedSeq])).map(toEntry));

  const writeBatch = async (batch: Op[]): Promise<void> => {
    await sql.begin(async tx => {
      for (const op of batch) await writeOp(tx, op, instance);
      const rows = batch.map(op => ({ instance, topic: op.topic, record_id: recordId(op), payload: payloadOf(op) }));
      const ids = await q(tx, `insert into civicos.outbox (instance, topic, record_id, payload)
                               select x.instance, x.topic, x.record_id, x.payload from jsonb_to_recordset($1::text::jsonb) as x(instance text, topic text, record_id text, payload jsonb)
                               returning id::text as id`, [JSON.stringify(rows)]);
      await q(tx, `select pg_notify('civicos_outbox', $1)`, [String(ids[ids.length - 1]?.id ?? '')]);
    });
  };

  const flushOnce = async (): Promise<void> => {
    while (queue.length && !stopped) {
      const batch = queue.slice();
      const t0 = Date.now(), epoch = rebaseEpoch;
      try {
        await writeBatch(batch);
      } catch (e) {
        if (isChainConflict(e)) {
          // Another instance appended first: take its entries, move ours up, try again.
          // (The outbox listener may already have taken them in while this write was in flight.)
          if ((await catchUpAudit()).length || rebaseEpoch !== epoch) continue;
          // Nothing newer to take in: the conflict is not a race this instance can resolve; keep the changes and retry.
        }
        status.error = `write failed (${batch.length} changes kept in order and retried): ${(e as Error).message}`;
        retryMs = Math.min(30_000, Math.max(500, retryMs * 2));
        log('error', 'records.flush', { message: (e as Error).message, queued: queue.length, retryMs });
        retryTimer = setTimeout(() => { retryTimer = undefined; void flush(); }, retryMs);
        retryTimer.unref?.();
        return;
      }
      queue.splice(0, batch.length);
      status.queueDepth = queue.length;
      status.flushes++; status.lastFlushAt = new Date().toISOString(); status.lastFlushMs = Date.now() - t0;
      status.error = undefined; retryMs = 0;
      const primary = isPrimary();
      for (const op of batch) {
        if (op.topic !== 'audit') continue;
        pendingAudit.delete(op.data);
        committedSeq = Math.max(committedSeq, op.data.seq);
        const cb = callbacks.get(op.data);
        callbacks.delete(op.data);
        if (cb && primary) { try { cb(op.data); } catch (err) { log('warn', 'records.audit.committed', { message: (err as Error).message }); } }
      }
    }
    if (!queue.length && journal && existsSync(journal)) writeFileSync(journal, '');
  };
  const flush = (): Promise<void> => {
    if (flushing) return flushing;
    flushing = flushOnce().finally(() => { flushing = null; if (queue.length && !retryTimer && !stopped) schedule(); });
    return flushing;
  };

  // ── Record numbers ─────────────────────────────────────────────────────
  const sizes = { twin: opts.blockSize?.twin ?? 200, facility: opts.blockSize?.facility ?? 2000, boundary: opts.blockSize?.boundary ?? 20 };
  const blocks = new Map<string, { next: number; end: number; refilling?: Promise<void>; spare?: { next: number; end: number } }>();
  const reserve = async (name: keyof typeof sizes, floor: number): Promise<{ next: number; end: number }> => {
    const size = sizes[name];
    const r = await q(sql, `insert into civicos.record_counter (name, next_value) values ($1, $2::bigint + $3::bigint)
      on conflict (name) do update set next_value = greatest(civicos.record_counter.next_value, $2::bigint) + $3::bigint
      returning (next_value - $3::bigint)::text as start`, [name, floor, size]);
    const start = Number(r[0]!.start);
    return { next: start, end: start + size };
  };
  const nextOf = (name: keyof typeof sizes) => (): number => {
    const b = blocks.get(name);
    if (!b) throw new Error('Record numbering has not started yet');
    if (b.next >= b.end && b.spare) { b.next = b.spare.next; b.end = b.spare.end; b.spare = undefined; }
    if (b.next >= b.end) throw new Error('Record numbers are being reserved; try again in a moment');
    const n = b.next++;
    if (!b.spare && !b.refilling && b.end - b.next < sizes[name] / 2) {
      b.refilling = reserve(name, 0).then(s => { b.spare = s; }).catch(e => { log('error', 'records.numbers', { message: (e as Error).message }); }).finally(() => { b.refilling = undefined; });
    }
    return n;
  };
  const maxNum = (ids: string[], re: RegExp): number => ids.reduce((m, id) => { const x = re.exec(id); return x ? Math.max(m, Number(x[1])) : m; }, 0);

  // ── The backend's repositories ─────────────────────────────────────────
  const backend: Backend = {
    name: 'postgres',
    audit(chain) {
      const m = memoryAudit(chain);
      return {
        ...m,
        append(entry, committed) {
          chain().push(entry);
          pendingAudit.add(entry);
          if (committed) callbacks.set(entry, committed);
          enqueue({ topic: 'audit', data: entry });
        },
      };
    },
    twin(state) {
      const m = memoryTwin(state);
      return {
        ...m,
        nextSeq: nextOf('twin'),
        putEntity(e) { m.putEntity(e); enqueue({ topic: 'twin.entity', data: e }); },
        putEntities(list) { m.putEntities(list); for (const e of list) enqueue({ topic: 'twin.entity', data: e }); },
        addKey(k) {
          const had = state().keys.length;
          m.addKey(k);
          if (state().keys.length > had) enqueue({ topic: 'twin.key', data: { entityId: k.entityId, system: k.system, key: k.key } });
        },
        addSource(s) { m.addSource(s); enqueue({ topic: 'twin.source', data: s }); },
        saveSource(s) { enqueue({ topic: 'twin.source', data: s }); },
        addRun(r) { m.addRun(r); enqueue({ topic: 'twin.run', data: r }); },
        saveRun(r) { enqueue({ topic: 'twin.run', data: r }); },
        addObservations(list) {
          m.addObservations(list);
          // An import adds its observations once; numbered within the run so a replay never adds them twice.
          const runId = list[0]?.runId;
          if (runId) enqueue({ topic: 'twin.observations', data: { runId, from: 0, list } });
        },
        supersedeRun(runId, at) { const n = m.supersedeRun(runId, at); enqueue({ topic: 'twin.supersede', data: { runId, at } }); return n; },
      };
    },
    facilities(store) {
      const m = memoryFacilities(store);
      return { ...m, nextSeq: nextOf('facility'), add(f) { m.add(f); enqueue({ topic: 'facility', data: f }); }, save(f) { enqueue({ topic: 'facility', data: f }); } };
    },
    boundaries(store) {
      const m = memoryBoundaries(store);
      return { ...m, nextSeq: nextOf('boundary'), add(v) { m.add(v); enqueue({ topic: 'boundary.version', data: v }); }, save(v) { enqueue({ topic: 'boundary.version', data: v }); } };
    },
  };

  // ── Start: replay, import, load ────────────────────────────────────────
  // 1. A journal left by a crash: replayed in order (idempotent); audit entries not yet in the chain go on its current head.
  if (journal && existsSync(journal)) {
    const ops = readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) as Op; } catch { return null; } }).filter((x): x is Op => !!x);
    if (ops.length) {
      await sql.begin(async tx => {
        await q(tx, `select pg_advisory_xact_lock(hashtext('civicos.records.audit'))`);
        for (const op of ops) {
          if (op.topic === 'audit') {
            const had = await q(tx, `select 1 from civicos.audit_entry where id = $1`, [op.data.id]);
            if (had.length) continue;
            const head = await q(tx, `select seq, hash from civicos.audit_entry order by seq desc limit 1`);
            const e = op.data;
            e.seq = Number(head[0]?.seq ?? 0) + 1; e.prevHash = head[0] ? String(head[0].hash) : null; if (e.alg === 'sha256-v2') e.hash = auditHashV2(e);
          }
          await writeOp(tx, op, instance);
        }
        await q(tx, `insert into civicos.outbox (instance, topic, record_id, payload) values ($1, 'journal.replay', null, $2::text::jsonb)`, [instance, JSON.stringify({ ops: ops.length })]);
      });
      log('info', 'records.journal.replay', { ops: ops.length });
    }
    writeFileSync(journal, '');
  }

  // 2. Records still only in a restored snapshot (an installation moving from file or supabase state) are imported once.
  const counts = (await q(sql, `select (select count(*) from civicos.audit_entry)::int as audit, (select count(*) from civicos.twin_entity)::int as entities,
      (select count(*) from civicos.twin_run)::int as runs, (select count(*) from civicos.facility)::int as facilities, (select count(*) from civicos.boundary_version)::int as versions`))[0]!;
  const imports: Op[] = [];
  const snapChain = chainOf(root);
  if (Number(counts.audit) === 0 && snapChain.length) imports.push(...snapChain.map(e => ({ topic: 'audit' as const, data: e })));
  const t = twinOf(root), arch = archiveOf(root);
  if (Number(counts.entities) === 0) {
    imports.push(...Object.values(t.entities).map(e => ({ topic: 'twin.entity' as const, data: e })));
    imports.push(...t.keys.map(k => ({ topic: 'twin.key' as const, data: k })));
  }
  if (Number(counts.runs) === 0) {
    imports.push(...t.sources.map(s => ({ topic: 'twin.source' as const, data: s })));
    const runs = [...arch.runs, ...[...t.runs].reverse()];
    imports.push(...runs.map(r => ({ topic: 'twin.run' as const, data: r })));
    const byRun = new Map<string, Observation[]>();
    for (const o of [...Object.values(arch.observations).flat(), ...t.observations]) (byRun.get(o.runId) ?? byRun.set(o.runId, []).get(o.runId)!).push(o);
    for (const [runId, list] of byRun) imports.push({ topic: 'twin.observations', data: { runId, from: 0, list } });
  }
  if (Number(counts.facilities) === 0) imports.push(...facilitiesOf(root).facilities.map(f => ({ topic: 'facility' as const, data: f })));
  if (Number(counts.versions) === 0) imports.push(...boundariesOf(root).versions.map(v => ({ topic: 'boundary.version' as const, data: v })));
  if (imports.length) {
    await writeBatch(imports);
    log('info', 'records.import', { records: imports.length });
  }

  // 3. The read model, from the tables, with the outbox position in the same snapshot.
  let outboxSeen = 0;
  await sql.begin('isolation level repeatable read', async tx => {
    outboxSeen = Number((await q(tx, `select coalesce(max(id), 0)::text as id from civicos.outbox`))[0]!.id);
    const chain = chainOf(root);
    chain.length = 0;
    chain.push(...(await q(tx, `select ${AUDIT_COLS} from civicos.audit_entry order by seq`)).map(toEntry));
    committedSeq = chain[chain.length - 1]?.seq ?? 0;
    const tw = twinOf(root);
    tw.entities = Object.fromEntries((await q(tx, `select doc from civicos.twin_entity order by pos`)).map(r => { const e = doc<TwinEntity>(r); return [e.id, e]; }));
    tw.keys = (await q(tx, `select system, key, entity_id from civicos.twin_key order by pos`)).map(r => ({ entityId: String(r.entity_id), system: String(r.system), key: String(r.key) }));
    tw.sources = (await q(tx, `select doc from civicos.twin_source order by pos`)).map(r => doc<TwinSource>(r));
    tw.runs = (await q(tx, `select doc from civicos.twin_run order by at desc, pos desc`)).map(r => doc<TwinRun>(r));
    tw.observations = (await q(tx, `select ${OBS_COLS} from civicos.twin_observation order by id`)).map(toObservation);
    // Everything is live again after a start; the working limits move the oldest to the archive on the next import.
    const a = archiveOf(root);
    a.observations = {}; a.runs = [];
    const fs = facilitiesOf(root);
    fs.facilities = (await q(tx, `select doc from civicos.facility order by pos`)).map(r => doc<Facility>(r));
    const bs = boundariesOf(root);
    bs.versions = await loadVersions(tx);
  });
  status.outboxSeen = outboxSeen;
  // Transactions still open while the read model loaded may have taken lower outbox ids: ask for those again.
  if (outboxSeen > 0) {
    const near = new Set((await q(sql, `select id::text as id from civicos.outbox where id > $1 and id <= $2`, [Math.max(0, outboxSeen - 1000), outboxSeen])).map(r => Number(r.id)));
    for (let id = Math.max(1, outboxSeen - 999); id <= outboxSeen; id++) if (!near.has(id)) gaps.set(id, Date.now());
  }
  delete (root as { __facilityGrid?: unknown }).__facilityGrid;

  // 4. Record numbers: blocks above every number already given (also those in a restored snapshot).
  const tw = twinOf(root), fs = facilitiesOf(root), bs = boundariesOf(root);
  const twinFloor = Math.max(tw.seq, maxNum([...tw.runs.map(r => r.id), ...tw.sources.map(s => s.id)], /^(?:RUN|SRC)-(\d+)$/) + 1);
  const facFloor = Math.max(fs.seq, maxNum(fs.facilities.map(f => f.id), /^FAC-(\d+)$/) + 1);
  const bndFloor = Math.max(bs.seq, maxNum(bs.versions.map(v => v.id), /^bnd-(\d+)$/) + 1);
  blocks.set('twin', await reserve('twin', twinFloor));
  blocks.set('facility', await reserve('facility', facFloor));
  blocks.set('boundary', await reserve('boundary', bndFloor));

  // ── Following other instances ──────────────────────────────────────────
  const applyRemote = async (r: Row): Promise<void> => {
    const topic = String(r.topic), p = (typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload) as Record<string, unknown>;
    const tw2 = twinOf(root);
    switch (topic) {
      case 'audit': await catchUpAudit(); return;
      case 'twin.entity': { const e = p as unknown as TwinEntity; tw2.entities[e.id] = e; return; }
      case 'twin.key': memoryTwin(() => tw2).addKey(p as unknown as { entityId: string; system: string; key: string }); return;
      case 'twin.source': { const s = p as unknown as TwinSource; const i = tw2.sources.findIndex(x => x.id === s.id); if (i < 0) tw2.sources.push(s); else tw2.sources[i] = s; return; }
      case 'twin.run': {
        const run = p as unknown as TwinRun;
        const i = tw2.runs.findIndex(x => x.id === run.id);
        if (i >= 0) { tw2.runs[i] = run; return; }
        const ar = archiveOf(root).runs, j = ar.findIndex(x => x.id === run.id);
        if (j >= 0) ar[j] = run; else tw2.runs.unshift(run);
        return;
      }
      case 'twin.observations': {
        const rows = await q(sql, `select ${OBS_COLS} from civicos.twin_observation where run_id = $1 and ord >= $2 and ord < $3 order by ord`, [p.runId, Number(p.from ?? 0), Number(p.from ?? 0) + Number(p.count ?? 0)]);
        tw2.observations.push(...rows.map(toObservation));
        return;
      }
      case 'twin.supersede': memoryTwin(() => tw2).supersedeRun(String(p.runId), String(p.at)); return;
      case 'facility': {
        const f = p as unknown as Facility, list = facilitiesOf(root).facilities;
        const i = list.findIndex(x => x.id === f.id);
        if (i < 0) list.push(f); else list[i] = f;
        delete (root as { __facilityGrid?: unknown }).__facilityGrid;
        return;
      }
      case 'boundary.version': {
        const [v] = await loadVersions(sql, 'where id = $1', [p.id]);
        if (!v) return;
        const list = boundariesOf(root).versions, i = list.findIndex(x => x.id === v.id);
        if (i < 0) list.push(v); else list[i] = v;
        return;
      }
    }
  };
  // Outbox ids are given at insert and transactions commit in any order, so an id
  // below one already read can still appear: such gaps are asked for again for a
  // minute (after that the id belonged to a transaction that rolled back).
  let pulling: Promise<number> | null = null;
  const pullOnce = async (): Promise<number> => {
    let applied = 0;
    const take = async (r: Row): Promise<void> => {
      if (r.instance !== instance && r.topic !== 'journal.replay') { await applyRemote(r); applied++; status.followed++; }
      status.lagMs = Math.max(0, Date.now() - Number(r.at_ms));
    };
    const COLS = `id, extract(epoch from at) * 1000 as at_ms, instance, topic, payload`;
    if (gaps.size) {
      for (const r of await q(sql, `select ${COLS} from civicos.outbox where id = any($1::bigint[]) order by id`, [[...gaps.keys()]])) { gaps.delete(Number(r.id)); await take(r); }
      for (const [id, since] of gaps) if (Date.now() - since > 60_000) gaps.delete(id);
    }
    for (;;) {
      const rows = await q(sql, `select ${COLS} from civicos.outbox where id > $1 order by id limit 500`, [status.outboxSeen]);
      for (const r of rows) {
        const id = Number(r.id);
        for (let missing = status.outboxSeen + 1; missing < id && gaps.size < 10_000; missing++) gaps.set(missing, Date.now());
        await take(r);
        status.outboxSeen = id;
      }
      if (rows.length < 500) break;
    }
    status.lastPullAt = new Date().toISOString();
    if (!applied) status.lagMs = 0;
    return applied;
  };
  const pull = (): Promise<number> => {
    if (pulling) return pulling;
    pulling = pullOnce().catch(e => { status.error = `following other instances failed: ${(e as Error).message}`; return 0; }).finally(() => { pulling = null; });
    return pulling;
  };
  const listener = sql.listen ? await sql.listen('civicos_outbox', () => { void pull(); }).catch(() => null) : null;
  const poll = setInterval(() => { void pull(); }, opts.pollMs ?? 2000);
  poll.unref?.();

  return {
    backend,
    sql,
    status: () => ({ ...status, queueDepth: queue.length }),
    async drain(timeoutMs = 10_000) {
      const until = Date.now() + timeoutMs;
      while (queue.length && Date.now() < until) {
        // While a failed write waits for its retry, wait with it rather than push.
        if (!retryTimer) await flush();
        if (queue.length) await new Promise(r => setTimeout(r, 50));
      }
      return queue.length === 0;
    },
    pull,
    stateAsOf: (query = {}) => stateAsOfSql(sql, query),
    async stop() {
      stopped = true;
      clearInterval(poll);
      if (retryTimer) clearTimeout(retryTimer);
      await flushing;
      await listener?.unlisten().catch(() => undefined);
    },
  };
}
