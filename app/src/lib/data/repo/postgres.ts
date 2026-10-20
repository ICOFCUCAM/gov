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
//
// Every other store (the nation profile and ministries, officials, the Update
// Center, public sites, scenarios, metric definitions, the event outbox,
// signed heads …) is kept as per-record documents in civicos.record_doc
// (./documents.ts, migration 20261021000000_civicos_record_docs.sql). Stores
// note their use through ./track.ts; each flush compares the stores used since
// the last one (every store on a slower sweep, CIVICOS_PG_SWEEP_MS) and writes
// the records that changed in the same transaction as the queued changes and
// audit entries, each against the version it was read at, with an outbox row
// per record. A record another instance changed meanwhile is merged three ways
// (merge3). Other instances apply the outbox rows to their stores in place,
// merging any change of theirs not yet written. A store's own counters (`seq`,
// `requestSeq` …) number from reserved blocks too (`doc:<store>.<field>`).
// With every store here, any instance takes any change (lib/data/persist.ts).

import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import type { Observation, TwinEntity, TwinRun, TwinSource } from '@/lib/twin/register';
import type { Facility } from '@/lib/data/facilities';
import type { BoundaryVersion } from '@/lib/data/boundaries';
import type { Parcel } from '@/lib/data/parcels';
import { auditHashV2 } from '@/lib/data/store/audit';
import { auditCommitted } from '@/lib/data/store/audit-committed';
import { log } from '@/lib/ops/log';
import { memoryAudit, memoryBoundaries, memoryFacilities, memoryParcels, memoryTwin } from './memory';
import { RECORDS_SCHEMA, DOCS_SCHEMA, PARCELS_SCHEMA, LIMITS_SCHEMA } from './postgres-schema';
import { applyRow, build, counterFields, decompose, diff, isCounterPath, mergeAt, normalise, removeAt, replaceInPlace, rowAt, segsOf, type Change, type DocRow, type Kind, type Known } from './documents';
import { followed, listenForUse } from './track';
import type { Backend, BoundaryStore, FacilityStore, ParcelStore } from './types';
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

/**
 * Whether the database is reached through a transaction-mode pooler
 * (Supabase/Supavisor or PgBouncer on port 6543, or CIVICOS_PG_POOLER=transaction):
 * many short-lived servers share its connections, but a connection is theirs
 * only for one transaction, so no prepared statements and no LISTEN.
 */
export function transactionPooler(url: string, env: Record<string, string | undefined> = process.env): boolean {
  const mode = (env.CIVICOS_PG_POOLER ?? '').toLowerCase();
  if (mode === 'transaction') return true;
  if (mode === 'session' || mode === 'direct') return false;
  try { return new URL(url).port === '6543'; } catch { return false; }
}

/** Connect with the `postgres` driver (loaded only in this mode). */
export async function connect(url: string, opts: { max?: number } = {}): Promise<Sql> {
  const { default: postgres } = await import('postgres');
  if (!transactionPooler(url)) return postgres(url, { max: opts.max ?? 5, onnotice: () => undefined, idle_timeout: 60, connect_timeout: 10 }) as unknown as Sql;
  // Behind a transaction pooler: unnamed statements, short idle connections, and no LISTEN
  // (other instances' changes are then followed by the poll in startRecords).
  const db = postgres(url, { max: opts.max ?? 5, onnotice: () => undefined, idle_timeout: 20, connect_timeout: 10, prepare: false }) as unknown as Sql;
  return { unsafe: db.unsafe.bind(db), begin: db.begin.bind(db) as Sql['begin'], ...(db.end ? { end: db.end.bind(db) } : {}) };
}

const q = (sql: Sql, text: string, params: unknown[] = []): Promise<Row[]> => sql.unsafe(text, params);
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`;
const iso = (col: string) => `to_char(${col} at time zone 'UTC', ${ISO})`;

/** Apply the records schema (idempotent; one instance at a time). Returns whether PostGIS is in use. */
export async function ensureSchema(sql: Sql): Promise<{ postgis: boolean }> {
  // Applied once per version of the schema: re-running its DDL while other instances write would take their tables' locks.
  const version = createHash('sha256').update(RECORDS_SCHEMA).update(DOCS_SCHEMA).update(PARCELS_SCHEMA).update(LIMITS_SCHEMA).digest('hex');
  const applied = async (s: Sql) => (await q(s, `select to_regclass('civicos.records_schema') is not null as t`))[0]!.t
    && (await q(s, `select 1 from civicos.records_schema where version = $1`, [version])).length > 0;
  if (!(await applied(sql))) {
    await sql.begin(async tx => {
      await q(tx, `select pg_advisory_xact_lock(hashtext('civicos.records.schema'))`);
      if (await applied(tx)) return;
      for (const schema of [RECORDS_SCHEMA, DOCS_SCHEMA, PARCELS_SCHEMA, LIMITS_SCHEMA]) {
        const all = tx.unsafe(schema);
        await (all.simple ? all.simple() : all);
      }
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
const parcelsOf = (r: Root): ParcelStore => {
  const d = (r.__civicosParcels ??= { parcels: [], changes: [], imports: [], seq: 1 }) as ParcelStore;
  d.parcels ??= []; d.seq ??= 1;
  return d;
};

/** The fields of each store kept in tables, not in the JSON snapshot (lib/data/persist.ts leaves them out of saves). */
export const RECORD_FIELDS: Record<string, string[]> = {
  __civicos: ['audit'],
  __civicosTwin: ['entities', 'keys', 'sources', 'runs', 'observations'],
  __civicosTwinArchive: ['observations', 'runs'],
  __civicosFacilities: ['facilities'],
  __civicosBoundaries: ['versions'],
  __civicosParcels: ['parcels'],
};

// ── Ops ───────────────────────────────────────────────────────────────────
export type Op =
  | { topic: 'audit'; data: AuditEntry }
  | { topic: 'twin.entity'; data: TwinEntity }
  | { topic: 'twin.key'; data: { entityId: string; system: string; key: string } }
  | { topic: 'twin.source'; data: TwinSource }
  | { topic: 'twin.run'; data: TwinRun }
  | { topic: 'twin.observations'; data: { runId: string; from: number; list: Observation[] } }
  | { topic: 'twin.supersede'; data: { runId: string; at: string } }
  | { topic: 'facility'; data: Facility }
  | { topic: 'boundary.version'; data: BoundaryVersion }
  | { topic: 'parcel'; data: Parcel };

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
    // A parcel's rights are personal data: the outbox says which parcel changed, the others read it from civicos.parcel.
    case 'parcel': return { id: op.data.id, state: op.data.state };
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

// ── Batched writes (go-live review L-6) ──────────────────────────────────
/** Rows per statement when a run of same-topic ops is written together. */
export const WRITE_BATCH_ROWS = 1000;

type Batched = Exclude<Op['topic'], 'twin.observations' | 'twin.supersede' | 'boundary.version'>;
interface BatchSpec<T> {
  /** Upserts keep only the last change per key within a statement (Postgres refuses to update one row twice in one statement). */
  key?: (d: T) => string;
  row: (d: T) => Record<string, unknown>;
  sql: string;
}
const spec = <T,>(s: BatchSpec<T>) => s as BatchSpec<unknown>;
const recordset = (cols: string) => `from jsonb_to_recordset($1::text::jsonb) as x(i int, ${cols}) order by x.i`;
const BATCH: Record<Batched, BatchSpec<unknown>> = {
  // In seq order, in one statement: the chain trigger sees each entry the statement inserted before it.
  audit: spec<AuditEntry>({
    row: e => ({ seq: e.seq, id: e.id, at: e.at, actor: e.actor, action: e.action, resource: e.resource, outcome: e.outcome, detail: e.detail ?? null, prev_hash: e.prevHash ?? null, hash: e.hash, alg: e.alg ?? null }),
    sql: `insert into civicos.audit_entry (seq, id, at, actor, action, resource, outcome, detail, prev_hash, hash, alg, instance)
          select x.seq, x.id, x.at, x.actor, x.action, x.resource, x.outcome, x.detail, x.prev_hash, x.hash, x.alg, $2
          from jsonb_to_recordset($1::text::jsonb) as x(i int, seq bigint, id text, at text, actor text, action text, resource text, outcome text, detail text, prev_hash text, hash text, alg text)
          order by x.seq, x.i
          on conflict (id) do nothing`,
  }),
  'twin.entity': spec<TwinEntity>({
    key: e => e.id,
    row: e => ({ id: e.id, uri: e.uri ?? null, kind: e.kind, name: e.name, code: e.code ?? null, parent: e.parent ?? null, region: e.region ?? null, ord: e.order ?? null, lng: e.location?.lng ?? null, lat: e.location?.lat ?? null, doc: e }),
    sql: `insert into civicos.twin_entity (id, uri, kind, name, code, parent, region, ord, lng, lat, doc)
          select x.id, x.uri, x.kind, x.name, x.code, x.parent, x.region, x.ord, x.lng, x.lat, x.doc
          ${recordset('id text, uri text, kind text, name text, code text, parent text, region boolean, ord integer, lng float8, lat float8, doc jsonb')}
          on conflict (id) do update set uri = excluded.uri, kind = excluded.kind, name = excluded.name, code = excluded.code, parent = excluded.parent,
            region = excluded.region, ord = excluded.ord, lng = excluded.lng, lat = excluded.lat, doc = excluded.doc, updated_at = now()`,
  }),
  'twin.key': spec<{ entityId: string; system: string; key: string }>({
    row: k => ({ system: k.system, key: k.key, entity_id: k.entityId }),
    sql: `insert into civicos.twin_key (system, key, entity_id) select x.system, x.key, x.entity_id
          ${recordset('system text, key text, entity_id text')}
          on conflict (system, key) do nothing`,
  }),
  'twin.source': spec<TwinSource>({
    key: s => s.id,
    row: s => ({ id: s.id, doc: s }),
    sql: `insert into civicos.twin_source (id, doc) select x.id, x.doc ${recordset('id text, doc jsonb')}
          on conflict (id) do update set doc = excluded.doc, updated_at = now()`,
  }),
  'twin.run': spec<TwinRun>({
    key: r => r.id,
    row: r => ({ id: r.id, source_id: r.sourceId, at: r.at, doc: r }),
    sql: `insert into civicos.twin_run (id, source_id, at, doc) select x.id, x.source_id, x.at::timestamptz, x.doc ${recordset('id text, source_id text, at text, doc jsonb')}
          on conflict (id) do update set doc = excluded.doc, updated_at = now()`,
  }),
  facility: spec<Facility>({
    key: f => f.id,
    row: f => ({ id: f.id, national_id: f.ids?.national ?? null, owner_id: f.ownerId, category: f.category, state: f.state, lng: f.location.lng, lat: f.location.lat, doc: f }),
    sql: `insert into civicos.facility (id, national_id, owner_id, category, state, lng, lat, doc)
          select x.id, x.national_id, x.owner_id, x.category, x.state, x.lng, x.lat, x.doc
          ${recordset('id text, national_id text, owner_id text, category text, state text, lng float8, lat float8, doc jsonb')}
          on conflict (id) do update set national_id = excluded.national_id, owner_id = excluded.owner_id, category = excluded.category, state = excluded.state,
            lng = excluded.lng, lat = excluded.lat, doc = excluded.doc, updated_at = now()`,
  }),
  parcel: spec<Parcel>({
    key: p => p.id,
    row: p => ({ id: p.id, parcel_id: p.parcelId, state: p.state, land_use: p.landUse, region_code: p.place.regionCode ?? null, district_code: p.place.districtCode ?? null, area_m2: p.areaM2,
      min_lng: p.bbox[0], min_lat: p.bbox[1], max_lng: p.bbox[2], max_lat: p.bbox[3], geometry: p.geometry, doc: p }),
    sql: `insert into civicos.parcel (id, parcel_id, state, land_use, region_code, district_code, area_m2, min_lng, min_lat, max_lng, max_lat, geometry, doc)
          select x.id, x.parcel_id, x.state, x.land_use, x.region_code, x.district_code, x.area_m2, x.min_lng, x.min_lat, x.max_lng, x.max_lat, x.geometry, x.doc
          ${recordset('id text, parcel_id text, state text, land_use text, region_code text, district_code text, area_m2 float8, min_lng float8, min_lat float8, max_lng float8, max_lat float8, geometry jsonb, doc jsonb')}
          on conflict (id) do update set parcel_id = excluded.parcel_id, state = excluded.state, land_use = excluded.land_use, region_code = excluded.region_code,
            district_code = excluded.district_code, area_m2 = excluded.area_m2, min_lng = excluded.min_lng, min_lat = excluded.min_lat, max_lng = excluded.max_lng,
            max_lat = excluded.max_lat, geometry = excluded.geometry, doc = excluded.doc, updated_at = now()`,
  }),
};
const isBatched = (t: Op['topic']): t is Batched => t in BATCH;

/**
 * Write the queued ops in order (inside the flush transaction). Each run of
 * consecutive ops on the same topic goes out as one multi-row statement per
 * WRITE_BATCH_ROWS rows (jsonb_to_recordset, as observations already were),
 * not one round trip per record: a parcel load of 50,000 rows and its audit
 * entries is a few dozen statements. Order between topics is kept.
 */
export async function writeOps(tx: Sql, ops: Op[], instance: string): Promise<void> {
  for (let i = 0; i < ops.length;) {
    const topic = ops[i]!.topic;
    if (!isBatched(topic)) { await writeOp(tx, ops[i]!, instance); i++; continue; }
    let j = i;
    while (j < ops.length && ops[j]!.topic === topic) j++;
    const s = BATCH[topic];
    for (let k = i; k < j; k += WRITE_BATCH_ROWS) {
      const rows: Record<string, unknown>[] = [];
      const at = new Map<string, number>();
      for (const op of ops.slice(k, Math.min(j, k + WRITE_BATCH_ROWS))) {
        const row = { i: rows.length, ...s.row(op.data) };
        const id = s.key?.(op.data);
        // A record changed twice in one flush: its latest state, at the place it was first written.
        if (id !== undefined && at.has(id)) { rows[at.get(id)!] = { ...row, i: at.get(id)! }; continue; }
        if (id !== undefined) at.set(id, rows.length);
        rows.push(row);
      }
      await q(tx, s.sql, topic === 'audit' ? [JSON.stringify(rows), instance] : [JSON.stringify(rows)]);
    }
    i = j;
  }
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
    case 'parcel': {
      const p = op.data;
      await q(tx, `insert into civicos.parcel (id, parcel_id, state, land_use, region_code, district_code, area_m2, min_lng, min_lat, max_lng, max_lat, geometry, doc)
                   values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text::jsonb, $13::text::jsonb)
                   on conflict (id) do update set parcel_id = excluded.parcel_id, state = excluded.state, land_use = excluded.land_use, region_code = excluded.region_code,
                     district_code = excluded.district_code, area_m2 = excluded.area_m2, min_lng = excluded.min_lng, min_lat = excluded.min_lat, max_lng = excluded.max_lng,
                     max_lat = excluded.max_lat, geometry = excluded.geometry, doc = excluded.doc, updated_at = now()`,
        [p.id, p.parcelId, p.state, p.landUse, p.place.regionCode ?? null, p.place.districtCode ?? null, p.areaM2, p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3], JSON.stringify(p.geometry), JSON.stringify(p)]);
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

// ── Per-record documents (./documents.ts) ─────────────────────────────────
/** Records up to this size travel in the outbox row; larger ones are read from the table. */
const INLINE_DOC = 16_384;

/**
 * Write the changed records of every store (inside the flush transaction).
 * Each write names the version it was changed from; a record another
 * instance changed since is locked, merged three ways (mergeAt) and written
 * over it. Removals win.
 */
async function writeDocs(tx: Sql, docs: DocBatch[], instance: string): Promise<{ results: Map<string, DocResult>; merged: number; conflicts: number }> {
  const results = new Map<string, DocResult>();
  let merged = 0, conflicts = 0;
  const ups: { store: string; path: string; kind: Kind; doc: string; expected: number; base?: string }[] = [];
  const dels: { store: string; path: string }[] = [];
  for (const d of docs) for (const c of d.changes) {
    if (c.json === null) dels.push({ store: d.store, path: c.path });
    else ups.push({ store: d.store, path: c.path, kind: c.kind, doc: c.json, expected: c.expected, ...(c.base !== undefined ? { base: c.base } : {}) });
  }
  for (let i = 0; i < ups.length; i += 2000) {
    const chunk = ups.slice(i, i + 2000);
    const done = await q(tx, `insert into civicos.record_doc (store, path, kind, doc, version, instance)
        select x.store, x.path, x.kind, x.doc::jsonb, x.expected + 1, $2
        from jsonb_to_recordset($1::text::jsonb) as x(store text, path text, kind text, doc text, expected bigint)
        on conflict (store, path) do update set kind = excluded.kind, doc = excluded.doc, version = excluded.version, instance = excluded.instance, updated_at = now()
          where civicos.record_doc.version = excluded.version - 1
        returning store, path, version::text as version`, [JSON.stringify(chunk.map(({ base: _b, ...c }) => c)), instance]);
    for (const r of done) results.set(docKey(String(r.store), String(r.path)), { version: Number(r.version) });
    for (const c of chunk) {
      if (results.has(docKey(c.store, c.path))) continue;
      // Another instance changed this record since this one read it: both changes are kept.
      const cur = (await q(tx, `select kind, doc::text as doc, version::text as version from civicos.record_doc where store = $1 and path = $2 for update`, [c.store, c.path]))[0];
      if (!cur) {
        const r = await q(tx, `insert into civicos.record_doc (store, path, kind, doc, version, instance) values ($1, $2, $3, $4::text::jsonb, 1, $5)
                               on conflict (store, path) do update set kind = excluded.kind, doc = excluded.doc, version = civicos.record_doc.version + 1, instance = excluded.instance, updated_at = now()
                               returning version::text as version`, [c.store, c.path, c.kind, c.doc, instance]);
        results.set(docKey(c.store, c.path), { version: Number(r[0]!.version) });
        continue;
      }
      const theirs = normalise({ kind: String(cur.kind) as Kind, json: String(cur.doc) });
      let row: DocRow = { kind: c.kind, json: c.doc };
      if (theirs.kind === c.kind && (c.kind === 'value' || c.kind === 'list')) {
        const m = mergeAt(segsOf(c.path), c.base !== undefined ? JSON.parse(c.base) : undefined, JSON.parse(c.doc), JSON.parse(theirs.json));
        row = { kind: c.kind, json: JSON.stringify(m.value) };
        conflicts += m.conflicts;
      } else if (theirs.kind !== c.kind) conflicts++;
      merged++;
      const r = await q(tx, `update civicos.record_doc set kind = $3, doc = $4::text::jsonb, version = version + 1, instance = $5, updated_at = now()
                             where store = $1 and path = $2 returning version::text as version`, [c.store, c.path, row.kind, row.json, instance]);
      results.set(docKey(c.store, c.path), { version: Number(r[0]!.version), ...(row.json !== c.doc || row.kind !== c.kind ? { merged: row } : {}) });
    }
  }
  for (let i = 0; i < dels.length; i += 5000) {
    await q(tx, `delete from civicos.record_doc d using jsonb_to_recordset($1::text::jsonb) as x(store text, path text)
                 where d.store = x.store and d.path = x.path`, [JSON.stringify(dels.slice(i, i + 5000))]);
  }
  return { results, merged, conflicts };
}

/** The outbox rows (as JSON text) telling other instances which records changed. */
function docOutboxRows(docs: DocBatch[], results: Map<string, DocResult>, instance: string): string[] {
  const out: string[] = [];
  for (const d of docs) for (const c of d.changes) {
    const head = `"store":${JSON.stringify(d.store)},"path":${JSON.stringify(c.path)}`;
    let payload: string;
    if (c.json === null) payload = `{${head},"deleted":true}`;
    else {
      const res = results.get(docKey(d.store, c.path));
      const row = res?.merged ?? { kind: c.kind, json: c.json };
      payload = `{${head},"kind":${JSON.stringify(row.kind)}${res ? `,"version":${res.version}` : ''}${res && row.json.length <= INLINE_DOC ? `,"doc":${row.json}` : ''}}`;
    }
    out.push(`{"instance":${JSON.stringify(instance)},"topic":"doc","record_id":${JSON.stringify(d.store + c.path)},"payload":${payload}}`);
  }
  return out;
}

/** Replay journalled record changes (after a crash): each only where the table still holds the version it was changed from. */
async function replayDocs(tx: Sql, docs: DocBatch[], instance: string): Promise<Map<string, DocResult>> {
  const results = new Map<string, DocResult>();
  for (const d of docs) for (const c of d.changes) {
    if (c.json === null) {
      const gone = await q(tx, `delete from civicos.record_doc where store = $1 and path = $2 and version = $3 returning 1 as x`, [d.store, c.path, c.expected]);
      if (gone.length) results.set(docKey(d.store, c.path), { version: 0 });
      continue;
    }
    const r = c.expected === 0
      ? await q(tx, `insert into civicos.record_doc (store, path, kind, doc, version, instance) values ($1, $2, $3, $4::text::jsonb, 1, $5)
                     on conflict (store, path) do nothing returning version::text as version`, [d.store, c.path, c.kind, c.json, instance])
      : await q(tx, `update civicos.record_doc set kind = $3, doc = $4::text::jsonb, version = version + 1, instance = $5, updated_at = now()
                     where store = $1 and path = $2 and version = $6 returning version::text as version`, [d.store, c.path, c.kind, c.json, instance, c.expected]);
    if (r[0]) results.set(docKey(d.store, c.path), { version: Number(r[0].version) });
  }
  return results;
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
  /** The per-record documents of every other store (civicos.record_doc). */
  documents?: DocumentsStatus;
}

export interface DocumentsStatus {
  /** Stores kept as documents, and their records. */
  stores: number;
  rows: number;
  /** Records written by this instance, and applied from others. */
  written: number;
  followed: number;
  /** Records two instances changed at once (merged three ways), and values both changed differently (the later write kept). */
  merged: number;
  conflicts: number;
  /** Record numbers given past a reserved block before the next one arrived (should stay 0). */
  counterOverruns: number;
  lastSweepAt?: string;
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
  /** Whether the store `key` is kept in the record tables (then it has no snapshot). */
  owns(key: string): boolean;
  /** Every store is kept in the record tables: any instance takes any change. */
  ownsAll: boolean;
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
  /** Record numbers reserved per block (`counter`: each store's own counters, `seq` and `…Seq`). */
  blockSize?: { twin?: number; facility?: number; boundary?: number; parcel?: number; counter?: number };
  /** Keep every other store as per-record documents (default true; false keeps them in snapshots, as before). */
  documents?: boolean;
  /** How often stores used since the last write are compared when nothing was audited (ms, default 1000). */
  docMs?: number;
  /** How often every store is compared, for changes made without its accessor (ms, default 30000). */
  sweepMs?: number;
}

/** A store's key (as lib/data/persist.ts saves them). */
const STORE_KEY = /^__civicos[A-Za-z0-9_]*$/;
/** One store's changed records, as compared at a flush. */
interface DocBatch { store: string; changes: Change[] }
/** What a written record ended as: its version, and the merged record when another instance had changed it too. */
interface DocResult { version: number; merged?: DocRow }
const docKey = (store: string, path: string) => `${store}\u0000${path}`;

const UPSERTS = new Set(['twin.entity', 'twin.source', 'twin.run', 'facility', 'boundary.version', 'parcel']);
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

  // ── Documents: every other store, one row per record (./documents.ts) ───
  const DOCS = opts.documents !== false;
  /** Each store's records as last written or read here (path → kind, JSON, version). */
  const docKnown = new Map<string, Map<string, Known>>();
  /** Stores used since they were last compared (lib/data/repo/track.ts). */
  const touched = new Set<string>();
  const docMs = opts.docMs ?? 1000, sweepMs = opts.sweepMs ?? 30_000;
  let lastSweep = Date.now();
  const docStatus: DocumentsStatus = { stores: 0, rows: 0, written: 0, followed: 0, merged: 0, conflicts: 0, counterOverruns: 0 };
  const knownOf = (store: string): Map<string, Known> => docKnown.get(store) ?? docKnown.set(store, new Map()).get(store)!;
  /** Top-level fields with typed tables: not documents. */
  const skipOf = (store: string): Set<string> => new Set(RECORD_FIELDS[store] ?? []);
  const liveStores = (): string[] => Object.keys(root).filter(k => STORE_KEY.test(k) && root[k] !== undefined);
  const setStore = (store: string, v: unknown): void => { if (root[store] !== v) root[store] = v; };
  const runFollow = (store: string): void => {
    if (root !== (globalThis as unknown as Root)) return; // a test's second read model has no modules of its own
    for (const e of followed(store)) log('warn', 'records.documents.follow', { store, message: e.message });
  };

  /** The records of these stores that changed since they were last written or read. */
  const diffDocs = (keys: Iterable<string>): DocBatch[] => {
    const out: DocBatch[] = [];
    for (const store of keys) {
      const v = root[store];
      if (v === undefined || !STORE_KEY.test(store)) continue;
      const known = knownOf(store);
      const changes = diff(decompose(v, skipOf(store)), known).filter(c => {
        // A record counter is written only when it went past what is recorded (other instances number from their own blocks).
        if (c.json === null || !isCounterPath(segsOf(c.path))) return true;
        const k = known.get(c.path);
        const now = Number(JSON.parse(c.json)), was = k ? Number(JSON.parse(k.json)) : NaN;
        return !(Number.isFinite(now) && Number.isFinite(was) && now <= was);
      });
      if (changes.length) out.push({ store, changes });
    }
    return out;
  };
  /** The stores to compare now: those used since the last flush, or every store on a sweep. */
  const takeDocKeys = (): string[] => {
    if (!DOCS) return [];
    const now = Date.now();
    if (now - lastSweep >= sweepMs) {
      lastSweep = now; docStatus.lastSweepAt = new Date(now).toISOString();
      touched.clear();
      return liveStores();
    }
    const keys = [...touched];
    touched.clear();
    return keys;
  };
  /** After the commit: the versions written, and a merged record brought into the store (with any change made here since on top). */
  const commitDocs = (docs: DocBatch[], results: Map<string, DocResult>): void => {
    const changed = new Set<string>();
    for (const d of docs) {
      const known = knownOf(d.store);
      for (const c of d.changes) {
        docStatus.written++;
        if (c.json === null) { if ((known.get(c.path)?.version ?? 0) === c.expected) known.delete(c.path); continue; }
        const res = results.get(docKey(d.store, c.path));
        if (!res) continue;
        if ((known.get(c.path)?.version ?? 0) >= res.version) continue; // a later version was applied meanwhile
        if (!res.merged) { known.set(c.path, { kind: c.kind, json: c.json, version: res.version }); continue; }
        const final = normalise(res.merged);
        known.set(c.path, { ...final, version: res.version });
        const segs = segsOf(c.path);
        const local = rowAt(root[d.store], segs, skipOf(d.store));
        let row = final;
        if (local && local.json !== c.json && local.kind === final.kind && (final.kind === 'value' || final.kind === 'list')) {
          row = normalise({ kind: final.kind, json: JSON.stringify(mergeAt(segs, JSON.parse(c.json), JSON.parse(local.json), JSON.parse(final.json)).value) });
          touched.add(d.store);
        }
        if (isCounterPath(segs) && Object.getOwnPropertyDescriptor(root[d.store] as object, segs[0]![1])?.get) continue;
        setStore(d.store, applyRow(root[d.store], segs, row));
        changed.add(d.store);
      }
    }
    for (const s of changed) runFollow(s);
  };

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
    const others: AuditEntry[] = [];
    for (const f of fresh) {
      // One of this instance's own entries, committed by a flush that has not finished its bookkeeping
      // yet (a pull can read the table in between): it keeps its place and its committed numbers.
      const own = mine.findIndex(e => e.id === f.id);
      if (own < 0) { chain.push(f); others.push(f); continue; }
      const [e] = mine.splice(own, 1);
      e!.seq = f.seq; e!.prevHash = f.prevHash; e!.hash = f.hash;
      pendingAudit.delete(e!);
      chain.push(e!);
    }
    committedSeq = fresh[fresh.length - 1]!.seq;
    let prev = chain[chain.length - 1]!;
    for (const e of mine) {
      e.seq = prev.seq + 1; e.prevHash = prev.hash; e.hash = auditHashV2(e);
      chain.push(e); prev = e;
    }
    if (mine.length) { status.rebased += mine.length; rebaseEpoch++; }
    if (isPrimary()) for (const e of others) { try { auditCommitted(e); } catch (err) { log('warn', 'records.audit.follow', { message: (err as Error).message }); } }
    return fresh;
  };

  /** The entries other instances committed since this instance's head, from the table (the chain never has gaps). */
  const catchUpAudit = async (): Promise<AuditEntry[]> =>
    integrate((await q(sql, `select ${AUDIT_COLS} from civicos.audit_entry where seq > $1 order by seq`, [committedSeq])).map(toEntry));

  /** Write the queued changes and the changed records in one transaction, with one outbox row each. */
  const writeBatch = async (batch: Op[], docs: DocBatch[] = []): Promise<{ results: Map<string, DocResult>; merged: number; conflicts: number }> => {
    let written = { results: new Map<string, DocResult>(), merged: 0, conflicts: 0 };
    await sql.begin(async tx => {
      await writeOps(tx, batch, instance);
      const rows = batch.map(op => JSON.stringify({ instance, topic: op.topic, record_id: recordId(op), payload: payloadOf(op) }));
      if (docs.length) {
        written = await writeDocs(tx, docs, instance);
        rows.push(...docOutboxRows(docs, written.results, instance));
      }
      if (!rows.length) return;
      const ids = await q(tx, `insert into civicos.outbox (instance, topic, record_id, payload)
                               select x.instance, x.topic, x.record_id, x.payload from jsonb_to_recordset($1::text::jsonb) as x(instance text, topic text, record_id text, payload jsonb)
                               returning id::text as id`, [`[${rows.join(',')}]`]);
      await q(tx, `select pg_notify('civicos_outbox', $1)`, [String(ids[ids.length - 1]?.id ?? '')]);
    });
    return written;
  };

  const flushOnce = async (): Promise<void> => {
    while (!stopped) {
      const batch = queue.slice();
      // The stores used since the last flush are compared now: a change and the audit entry recording it go in one transaction.
      const keys = takeDocKeys();
      const docs = diffDocs(keys);
      if (!batch.length && !docs.length) break;
      if (journal && docs.length) appendFileSync(journal, `${JSON.stringify({ topic: 'docs', data: docs })}\n`);
      const t0 = Date.now(), epoch = rebaseEpoch;
      let written: Awaited<ReturnType<typeof writeBatch>>;
      try {
        written = await writeBatch(batch, docs);
      } catch (e) {
        for (const k of keys) touched.add(k); // compared again on the next attempt
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
      if (docs.length) {
        docStatus.merged += written.merged; docStatus.conflicts += written.conflicts;
        commitDocs(docs, written.results);
      }
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
  const sizes = { twin: opts.blockSize?.twin ?? 200, facility: opts.blockSize?.facility ?? 2000, boundary: opts.blockSize?.boundary ?? 20, parcel: opts.blockSize?.parcel ?? 2000 };
  type Block = { next: number; end: number; refilling?: Promise<void>; spare?: { next: number; end: number } };
  const blocks = new Map<string, Block>();
  const reserve = async (name: string, floor: number, size: number = sizes[name as keyof typeof sizes]): Promise<{ next: number; end: number }> => {
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

  // Each store's own counters (`seq`, `requestSeq` …, as in `SUP-${db.seq++}`) become accessors over a
  // block reserved in civicos.record_counter (`doc:<store>.<field>`), so two instances never give the
  // same number while every store keeps its `x++` and `++x`. One number per block is left unused so
  // both forms stay inside it.
  const counterSize = Math.max(4, opts.blockSize?.counter ?? 50);
  const counterBlocks = new Map<string, Block>();
  const pendingCounters = new Set<string>();
  const checkedStores = new WeakSet<object>();
  /** Keep the next block reserved ahead, so a burst of numbers never waits for the database. */
  const topUp = (name: string, b: Block): void => {
    if (b.spare || b.refilling) return;
    b.refilling = reserve(name, 0, counterSize)
      .then(s => { if (b.next >= b.end - 1) { b.next = s.next; b.end = s.end; } else b.spare = s; })
      .catch(e => { log('error', 'records.numbers', { name, message: (e as Error).message }); })
      .finally(() => { b.refilling = undefined; });
  };
  const advanceCounter = (name: string, b: Block, v: unknown): void => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= b.next) return;
    b.next = v;
    if (b.next >= b.end - 1) {
      if (b.spare) { b.next = b.spare.next; b.end = b.spare.end; b.spare = undefined; }
      else { docStatus.counterOverruns++; log('warn', 'records.counter.overrun', { name, next: b.next }); }
    }
    topUp(name, b);
  };
  const defineCounter = (obj: Record<string, unknown>, field: string, name: string): void => {
    const b = counterBlocks.get(name);
    const d = Object.getOwnPropertyDescriptor(obj, field);
    if (!b || !d || d.get || !d.configurable) return;
    const local = Number(d.value);
    if (Number.isFinite(local) && local > b.next) advanceCounter(name, b, local);
    Object.defineProperty(obj, field, { configurable: true, enumerable: true, get: () => b.next, set: (v: unknown) => advanceCounter(name, b, v) });
  };
  /** Give a store's counters their blocks (at once when reserved, else once the reservation arrives). */
  const ensureCounters = (store: string, obj: unknown): Promise<unknown> | undefined => {
    if (!DOCS || !obj || typeof obj !== 'object') return undefined;
    const waits: Promise<void>[] = [];
    for (const field of counterFields(obj)) {
      const name = `doc:${store}.${field}`;
      if (counterBlocks.has(name)) { defineCounter(obj as Record<string, unknown>, field, name); continue; }
      if (pendingCounters.has(name)) continue;
      pendingCounters.add(name);
      waits.push(reserve(name, Number((obj as Record<string, unknown>)[field]) || 0, counterSize)
        .then(blk => {
          const b: Block = { next: blk.next, end: blk.end };
          counterBlocks.set(name, b);
          topUp(name, b);
          const cur = root[store];
          if (cur && typeof cur === 'object') defineCounter(cur as Record<string, unknown>, field, name);
        })
        .catch(e => { log('error', 'records.numbers', { name, message: (e as Error).message }); })
        .finally(() => { pendingCounters.delete(name); }));
    }
    return waits.length ? Promise.all(waits) : undefined;
  };
  /** A store was used (track.ts): compare it at the next flush; a store object seen for the first time gets its counters. */
  const onUse = (store: string, obj: unknown): void => {
    touched.add(store);
    if (obj && typeof obj === 'object' && !checkedStores.has(obj)) {
      checkedStores.add(obj);
      void ensureCounters(store, obj);
    }
  };

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
    parcels(store) {
      const m = memoryParcels(store);
      return { ...m, nextSeq: nextOf('parcel'), add(p) { m.add(p); enqueue({ topic: 'parcel', data: p }); }, save(p) { enqueue({ topic: 'parcel', data: p }); } };
    },
  };

  // ── Start: replay, import, load ────────────────────────────────────────
  // 1. A journal left by a crash: replayed in order (idempotent); audit entries not yet in the chain go on its current head.
  if (journal && existsSync(journal)) {
    type Line = Op | { topic: 'docs'; data: DocBatch[] };
    const lines = readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) as Line; } catch { return null; } }).filter((x): x is Line => !!x);
    const ops = lines.filter((l): l is Op => l.topic !== 'docs');
    const docLines = lines.flatMap(l => (l.topic === 'docs' ? (l.data as DocBatch[]) : []));
    if (docLines.length) {
      await sql.begin(async tx => {
        const results = await replayDocs(tx, docLines, instance);
        const applied = docLines.map(d => ({ store: d.store, changes: d.changes.filter(c => results.has(docKey(d.store, c.path))) })).filter(d => d.changes.length);
        const rows = docOutboxRows(applied, results, instance);
        if (rows.length) await q(tx, `insert into civicos.outbox (instance, topic, record_id, payload)
                                     select x.instance, x.topic, x.record_id, x.payload from jsonb_to_recordset($1::text::jsonb) as x(instance text, topic text, record_id text, payload jsonb)`, [`[${rows.join(',')}]`]);
      });
      log('info', 'records.journal.replay', { records: docLines.reduce((n, d) => n + d.changes.length, 0) });
    }
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
      (select count(*) from civicos.twin_run)::int as runs, (select count(*) from civicos.facility)::int as facilities, (select count(*) from civicos.boundary_version)::int as versions,
      (select count(*) from civicos.parcel)::int as parcels`))[0]!;
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
  if (Number(counts.parcels) === 0) imports.push(...parcelsOf(root).parcels.map(p => ({ topic: 'parcel' as const, data: p })));
  // Every other store live here (restored from a snapshot, or seeded) and not yet in civicos.record_doc.
  const docImports: DocBatch[] = [];
  if (DOCS) {
    const have = new Set((await q(sql, `select distinct store from civicos.record_doc`)).map(r => String(r.store)));
    for (const store of liveStores()) {
      if (have.has(store)) continue;
      const changes = diff(decompose(root[store], skipOf(store)), new Map());
      if (changes.length) docImports.push({ store, changes });
    }
  }
  if (imports.length || docImports.length) {
    await writeBatch(imports, docImports);
    log('info', 'records.import', { records: imports.length, documents: docImports.reduce((n, d) => n + d.changes.length, 0) });
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
    const ps = parcelsOf(root);
    ps.parcels = (await q(tx, `select doc from civicos.parcel order by pos`)).map(r => doc<Parcel>(r));
    // Every other store from its records, put into the store objects modules already hold (in place).
    if (DOCS) {
      const byStore = new Map<string, Row[]>();
      for (const r of await q(tx, `select store, path, kind, doc::text as doc, version::text as version from civicos.record_doc order by store, pos`)) {
        (byStore.get(String(r.store)) ?? byStore.set(String(r.store), []).get(String(r.store))!).push(r);
      }
      docKnown.clear();
      for (const [store, rows] of byStore) {
        const known = knownOf(store);
        const records = rows.map(r => {
          const row = normalise({ kind: String(r.kind) as Kind, json: String(r.doc) });
          known.set(String(r.path), { ...row, version: Number(r.version) });
          return { path: String(r.path), ...row };
        });
        const built = build(records);
        setStore(store, root[store] === undefined ? built : replaceInPlace(root[store], built, skipOf(store)));
      }
    }
  });
  status.outboxSeen = outboxSeen;
  // Transactions still open while the read model loaded may have taken lower outbox ids: ask for those again.
  if (outboxSeen > 0) {
    const near = new Set((await q(sql, `select id::text as id from civicos.outbox where id > $1 and id <= $2`, [Math.max(0, outboxSeen - 1000), outboxSeen])).map(r => Number(r.id)));
    for (let id = Math.max(1, outboxSeen - 999); id <= outboxSeen; id++) if (!near.has(id)) gaps.set(id, Date.now());
  }
  delete (root as { __facilityGrid?: unknown }).__facilityGrid;
  delete (root as { __parcelIndex?: unknown }).__parcelIndex;

  // 4. Record numbers: blocks above every number already given (also those in a restored snapshot).
  const tw = twinOf(root), fs = facilitiesOf(root), bs = boundariesOf(root), ps = parcelsOf(root);
  const twinFloor = Math.max(tw.seq, maxNum([...tw.runs.map(r => r.id), ...tw.sources.map(s => s.id)], /^(?:RUN|SRC)-(\d+)$/) + 1);
  const facFloor = Math.max(fs.seq, maxNum(fs.facilities.map(f => f.id), /^FAC-(\d+)$/) + 1);
  const bndFloor = Math.max(bs.seq, maxNum(bs.versions.map(v => v.id), /^bnd-(\d+)$/) + 1);
  blocks.set('twin', await reserve('twin', twinFloor));
  blocks.set('facility', await reserve('facility', facFloor));
  blocks.set('boundary', await reserve('boundary', bndFloor));
  blocks.set('parcel', await reserve('parcel', Math.max(ps.seq, maxNum(ps.parcels.map(p => p.id), /^PCL-(\d+)$/) + 1)));
  // Every store's own counters, and from now on every store used is noted (track.ts).
  if (DOCS) {
    await Promise.all(liveStores().map(s => { const o = root[s]; if (o && typeof o === 'object') checkedStores.add(o); return ensureCounters(s, o); }));
    if (root === (globalThis as unknown as Root)) listenForUse(onUse);
  }

  // ── Following other instances ──────────────────────────────────────────
  /** Stores another instance's records reached during a pull (their onFollow hooks run once it ends). */
  const followedStores = new Set<string>();
  /**
   * Another instance's record: put into the store in place. A record changed
   * here and not written yet is merged with it (mergeAt) and written back on
   * the next flush; this instance's own counters keep their blocks.
   */
  const applyRemoteDoc = async (p: Record<string, unknown>): Promise<void> => {
    if (!DOCS) return;
    const store = String(p.store), path = String(p.path);
    if (!STORE_KEY.test(store)) return;
    const segs = segsOf(path), known = knownOf(store), k = known.get(path);
    const local = root[store] === undefined ? undefined : rowAt(root[store], segs, skipOf(store));
    const dirty = !!local && (!k || local.kind !== k.kind || local.json !== k.json);
    if (p.deleted) {
      if (!k && !local) return;
      known.delete(path);
      if (dirty) { docStatus.conflicts++; touched.add(store); return; } // changed here since: kept, and written again
      removeAt(root[store], segs);
      followedStores.add(store); docStatus.followed++;
      return;
    }
    let version = Number(p.version ?? 0);
    if (k && version && k.version >= version) return;
    let row: DocRow | null = p.doc !== undefined && p.kind !== undefined ? { kind: String(p.kind) as Kind, json: JSON.stringify(p.doc) } : null;
    if (!row || !version) {
      const cur = (await q(sql, `select kind, doc::text as doc, version::text as version from civicos.record_doc where store = $1 and path = $2`, [store, path]))[0];
      if (!cur) return; // removed since; its removal follows
      row = { kind: String(cur.kind) as Kind, json: String(cur.doc) };
      version = Number(cur.version);
      if (k && k.version >= version) return;
    }
    const theirs = normalise(row);
    known.set(path, { ...theirs, version });
    docStatus.followed++;
    const holder = root[store];
    if (isCounterPath(segs) && holder && typeof holder === 'object' && Object.getOwnPropertyDescriptor(holder, segs[0]![1])?.get) return;
    let apply = theirs;
    if (dirty) {
      touched.add(store);
      if (local!.kind !== theirs.kind) { docStatus.conflicts++; return; }
      if (theirs.kind === 'object' || theirs.kind === 'map') return;
      const m = mergeAt(segs, k ? JSON.parse(k.json) : undefined, JSON.parse(local!.json), JSON.parse(theirs.json));
      apply = normalise({ kind: theirs.kind, json: JSON.stringify(m.value) });
      docStatus.merged++; docStatus.conflicts += m.conflicts;
    }
    setStore(store, applyRow(root[store], segs, apply));
    followedStores.add(store);
  };
  const applyRemote = async (r: Row): Promise<void> => {
    const topic = String(r.topic), p = (typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload) as Record<string, unknown>;
    const tw2 = twinOf(root);
    switch (topic) {
      case 'doc': await applyRemoteDoc(p); return;
      case 'state.restore': {
        // Another instance restored the whole state from a backup (lib/data/backups.ts): this read model is
        // now of another time. Stop taking changes and ask for a restart, which loads the restored tables.
        const why = `the state was restored from backup ${String(p.backupId ?? '?')} by another instance (${String(r.instance)}); restart this server before it takes changes`;
        status.error = why;
        if (root === (globalThis as unknown as Root)) {
          const ps = (globalThis as { __persistStatus?: { restartRequired?: string; error?: string } }).__persistStatus;
          if (ps) { ps.restartRequired = why; ps.error = why; }
        }
        return;
      }
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
      case 'parcel': {
        const row = (await q(sql, `select doc from civicos.parcel where id = $1`, [p.id]))[0];
        if (!row) return;
        const rec = doc<Parcel>(row), list = parcelsOf(root).parcels;
        const i = list.findIndex(x => x.id === rec.id);
        if (i < 0) list.push(rec); else list[i] = rec;
        delete (root as { __parcelIndex?: unknown }).__parcelIndex;
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
    for (const s of followedStores) runFollow(s);
    followedStores.clear();
    if (touched.size) schedule(); // records merged here are written back
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
  // Changes made without an audit entry: the stores used are compared every docMs, every store every sweepMs.
  const docTimer = DOCS ? setInterval(() => { if (touched.size || Date.now() - lastSweep >= sweepMs) schedule(); }, docMs) : undefined;
  docTimer?.unref?.();

  return {
    backend,
    sql,
    status: () => {
      const s: RecordsStatus = { ...status, queueDepth: queue.length };
      if (DOCS) s.documents = { ...docStatus, stores: docKnown.size, rows: [...docKnown.values()].reduce((n, m) => n + m.size, 0) };
      return s;
    },
    async drain(timeoutMs = 10_000) {
      const until = Date.now() + timeoutMs;
      // Every store is compared once more, so a change made without its accessor is written too.
      if (DOCS) lastSweep = 0;
      for (;;) {
        // While a failed write waits for its retry, wait with it rather than push.
        if (!retryTimer) await flush();
        const pending = queue.length > 0 || (DOCS && diffDocs(liveStores()).length > 0);
        if (!pending) return true;
        if (Date.now() >= until) return false;
        if (DOCS) lastSweep = 0;
        await new Promise(r => setTimeout(r, 50));
      }
    },
    pull,
    stateAsOf: (query = {}) => stateAsOfSql(sql, query),
    owns: (key: string) => DOCS && STORE_KEY.test(key),
    ownsAll: DOCS,
    async stop() {
      stopped = true;
      clearInterval(poll);
      if (docTimer) clearInterval(docTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (DOCS && root === (globalThis as unknown as Root)) listenForUse(undefined);
      await flushing;
      await listener?.unlisten().catch(() => undefined);
    },
  };
}
