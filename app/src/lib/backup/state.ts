// What a backup holds and how it goes back (register 3.7, 9.1), per state mode:
//
//   snapshot  (memory, file, supabase) every `__civicos*` store, encoded as
//             lib/data/persist.ts saves them (Maps, Sets and Dates kept), one
//             part per store, captured in one synchronous pass, so the parts
//             are of one moment
//   postgres  every per-record table of the civicos schema (the audit chain,
//             the twin, facilities, boundaries, parcels, civicos.record_doc,
//             the record counters, the snapshot table), exported in ONE
//             repeatable-read, read-only transaction after this instance's
//             write queue drained, one JSON line per row (generated columns
//             left out: the database recomputes them), ordered by primary key;
//             with CIVICOS_BACKUP_PG_DUMP (the path of pg_dump) also a pg_dump
//             of the schema in custom format, taken in the same snapshot
//             (pg_export_snapshot), for restores outside the platform
//
// Not in a backup: the backup system's own records (`__civicosBackups`), the
// outbox and lease (runtime), the vector tile archives (derived from the
// published records and rebuilt after a restore), and anything outside the
// platform's state (container images: the Update Center's releases).
//
// Verification is a dry run: every part is decoded into a scratch store (a
// fresh object, never globalThis), the audit chain read back is verified link
// by link and must end at the head the manifest names; in postgres mode the
// rows are also loaded into a scratch schema inside a transaction that is
// rolled back, and each table's row count checked.
//
// A restore replaces the state with the backup's, except the stores kept on
// restore (KEPT_ON_RESTORE): the backup system's own records and the Update
// Center's install records, which describe the software actually running,
// not the nation's data. Record counters never go back (a number once given
// is not given again). The key ring keeps every data key either side holds.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { encode, decode } from '@/lib/data/encode';
import { liveKeys, recordsBackend, persistenceStatus, saveNow, forgetStore, reloadRecords, SNAPSHOT_FORMAT, markChanged } from '@/lib/data/persist';
import { replaceInPlace, counterFields } from '@/lib/data/repo/documents';
import { followed } from '@/lib/data/repo/track';
import { verifyChainEntries } from '@/lib/data/store/audit';
import type { AuditEntry } from '@/lib/api/types';
import type { Sql } from '@/lib/data/repo/postgres';
import { sha256, type Manifest, type ManifestPart, type OpenedArchive, type PlainPart } from './archive';

/** Not captured: the backup system's own catalogue, policy and restore proposals. */
export const EXCLUDED_STORES = new Set(['__civicosBackups']);
/** Left as they are by a restore: the backup system's records and the Update Center's install records (the software that runs). */
// The access log is oversight evidence of who read what: a data restore never takes it back.
export const KEPT_ON_RESTORE = ['__civicosBackups', '__civicosUpdates', '__civicosAccessLog', '__civicosEventOutbox'];
export const EXCLUDED_NOTES: Manifest['excluded'] = [
  { what: 'Vector tile archives (facilities, parcels, boundaries)', why: 'Derived from the published records; rebuilt after a restore' },
  { what: 'The backup catalogue, retention policy and restore proposals (__civicosBackups)', why: 'The backup system\'s own records; kept in the target and in the running server' },
  { what: 'The access log (__civicosAccessLog)', why: 'Evidence of who read restricted records; a data restore keeps it as it stands in the running server' },
  { what: 'civicos.outbox and civicos.platform_state_lease (postgres)', why: 'Runtime coordination between instances, not state' },
  { what: 'Container images and release artifacts', why: 'Held by the Update Center\'s registry and mirror (and the restore kit); not part of the data' },
  { what: 'Keys (CIVICOS_DATA_KEK, the key provider\'s keys)', why: 'Held in key custody; recovered separately (docs/DISASTER_RECOVERY.md)' },
];

const g = globalThis as unknown as Record<string, unknown>;
type Root = Record<string, unknown>;

// ── Capture ───────────────────────────────────────────────────────────────
export interface Captured { mode: Manifest['mode']; adapter: string; parts: PlainPart[]; audit: Manifest['audit']; schema: Manifest['schema'] }

const auditOf = (chain: readonly AuditEntry[]): Manifest['audit'] => {
  const head = chain[chain.length - 1];
  return { seq: head?.seq ?? 0, hash: head?.hash ?? null, entries: chain.length };
};
const countOf = (v: unknown): number => (v instanceof Map ? v.size : Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 1);

/** The platform's stores as one snapshot (memory, file and supabase modes). */
export function captureSnapshot(root: Root = g): Captured {
  const parts: PlainPart[] = [];
  const keys = (root === g ? liveKeys() : Object.keys(root).filter(k => /^__civicos[A-Za-z0-9_]*$/.test(k) && root[k] !== undefined)).sort();
  for (const key of keys) {
    if (EXCLUDED_STORES.has(key)) continue;
    parts.push({ name: `store/${key}`, kind: 'store', data: Buffer.from(encode(root[key]), 'utf8'), rows: countOf(root[key]) });
  }
  const chain = ((root.__civicos as { audit?: AuditEntry[] } | undefined)?.audit) ?? [];
  return { mode: 'snapshot', adapter: root === g ? persistenceStatus().adapter : 'memory', parts, audit: auditOf(chain), schema: { snapshotFormat: SNAPSHOT_FORMAT } };
}

/** Tables never backed up (runtime only). */
const SKIP_TABLES = new Set(['outbox', 'platform_state_lease', 'records_schema']);

interface TableInfo { name: string; columns: string[]; generated: string[]; order: string[]; serials: string[] }

async function tables(tx: Sql, schema = 'civicos'): Promise<TableInfo[]> {
  const names = (await tx.unsafe(`select tablename from pg_tables where schemaname = $1 order by tablename`, [schema])).map(r => String(r.tablename)).filter(t => !SKIP_TABLES.has(t));
  const out: TableInfo[] = [];
  for (const name of names) {
    const cols = await tx.unsafe(`select column_name, is_generated, column_default from information_schema.columns where table_schema = $1 and table_name = $2 order by ordinal_position`, [schema, name]);
    const pk = await tx.unsafe(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
                                where i.indrelid = format('%I.%I', $1::text, $2::text)::regclass and i.indisprimary order by array_position(i.indkey::int2[], a.attnum)`, [schema, name]);
    const columns = cols.filter(c => c.is_generated === 'NEVER').map(c => String(c.column_name));
    out.push({
      name, columns,
      generated: cols.filter(c => c.is_generated !== 'NEVER').map(c => String(c.column_name)),
      order: pk.length ? pk.map(r => String(r.attname)) : columns,
      serials: cols.filter(c => c.is_generated === 'NEVER' && /^nextval\(/.test(String(c.column_default ?? ''))).map(c => String(c.column_name)),
    });
  }
  // Referenced tables first (boundary_version before boundary_unit).
  const fks = await tx.unsafe(`select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent from pg_constraint c
                               join pg_namespace n on n.oid = c.connamespace where c.contype = 'f' and n.nspname = $1`, [schema]);
  const strip = (t: string) => t.replace(/^.*\./, '').replace(/"/g, '');
  const deps = new Map<string, Set<string>>();
  for (const f of fks) { const c = strip(String(f.child)), p = strip(String(f.parent)); if (c !== p) (deps.get(c) ?? deps.set(c, new Set()).get(c)!).add(p); }
  const sorted: TableInfo[] = [], done = new Set<string>();
  const visit = (t: TableInfo, depth = 0) => {
    if (done.has(t.name) || depth > 50) return;
    for (const p of deps.get(t.name) ?? []) { const pt = out.find(x => x.name === p); if (pt) visit(pt, depth + 1); }
    done.add(t.name); sorted.push(t);
  };
  out.forEach(t => visit(t));
  return sorted;
}

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function exportTable(tx: Sql, t: TableInfo, schema = 'civicos'): Promise<string[]> {
  const rows = await tx.unsafe(`select (to_jsonb(x) - $1::text[])::text as r from ${ident(schema)}.${ident(t.name)} x order by ${t.order.map(c => `x.${ident(c)}`).join(', ')}`, [t.generated]);
  return rows.map(r => String(r.r));
}

/** The hash of the records schema the running server applied (as ensureSchema keys it). */
async function recordsSchemaVersion(tx: Sql): Promise<string | undefined> {
  const r = await tx.unsafe(`select version from civicos.records_schema order by applied_at desc limit 1`).catch(() => []);
  return r[0] ? String(r[0].version) : undefined;
}

/** The record tables, in one repeatable-read transaction (postgres mode). */
export async function capturePostgres(opts: { pgDump?: string; databaseUrl?: string } = {}): Promise<Captured> {
  const records = recordsBackend();
  if (!records) throw new Error('The per-record backend is not running');
  if (!(await records.drain(30_000))) throw new Error('This server\'s write queue did not drain within 30 s; try again');
  const parts: PlainPart[] = [];
  let audit: Manifest['audit'] = { seq: 0, hash: null, entries: 0 };
  let schemaVersion: string | undefined;
  await records.sql.begin('isolation level repeatable read read only', async tx => {
    let snapshot: string | undefined;
    if (opts.pgDump && opts.databaseUrl) snapshot = String((await tx.unsafe(`select pg_export_snapshot() as s`))[0]!.s);
    schemaVersion = await recordsSchemaVersion(tx);
    for (const t of await tables(tx)) {
      const lines = await exportTable(tx, t);
      parts.push({ name: `table/${t.name}`, kind: 'table', data: Buffer.from(lines.join('\n'), 'utf8'), rows: lines.length, columns: t.columns });
      if (t.name === 'audit_entry' && lines.length) {
        const last = JSON.parse(lines[lines.length - 1]!) as { seq: number; hash: string };
        audit = { seq: Number(last.seq), hash: last.hash, entries: lines.length };
      }
    }
    // pg_dump in the same snapshot, while this transaction holds it open.
    if (snapshot) {
      const { stdout } = await promisify(execFile)(opts.pgDump!, ['--schema=civicos', '--format=custom', '--no-owner', '--no-privileges', `--snapshot=${snapshot}`, `--dbname=${opts.databaseUrl}`], { encoding: 'buffer', maxBuffer: 4 * 1024 ** 3 });
      parts.push({ name: 'pg_dump/civicos.dump', kind: 'pg_dump', data: stdout as Buffer });
    }
  });
  return { mode: 'postgres', adapter: 'postgres', parts, audit, schema: { snapshotFormat: SNAPSHOT_FORMAT, ...(schemaVersion ? { records: schemaVersion } : {}), migrations: ['20261020000000_civicos_records.sql', '20261021000000_civicos_record_docs.sql', '20261023000000_civicos_parcels.sql'] } };
}

/** The state of this server now, in the mode it runs in. */
export async function captureState(opts: { pgDump?: string; databaseUrl?: string } = {}): Promise<Captured> {
  return recordsBackend() ? capturePostgres(opts) : captureSnapshot();
}

/** The mode a restore into this server needs. */
export const serverMode = (): Manifest['mode'] => (recordsBackend() ? 'postgres' : 'snapshot');

// ── Dry run ───────────────────────────────────────────────────────────────
export interface DryRun { ok: boolean; scratch: 'store' | 'schema' | 'parsed'; checks: string[]; problem?: string }

const auditRow = (o: Record<string, unknown>): AuditEntry => ({
  seq: Number(o.seq), id: String(o.id), at: String(o.at), actor: String(o.actor), action: String(o.action), resource: String(o.resource),
  outcome: String(o.outcome), ...(o.detail != null ? { detail: String(o.detail) } : {}), prevHash: o.prev_hash == null ? null : String(o.prev_hash), hash: String(o.hash),
  ...(o.alg != null ? { alg: String(o.alg) } : {}),
} as AuditEntry);

function chainCheck(chain: AuditEntry[], m: Manifest, checks: string[]): void {
  const v = verifyChainEntries(chain);
  if (!v.ok) throw new Error(`The audit chain in the backup is broken at entry ${v.brokenAtSeq}`);
  const head = chain[chain.length - 1];
  if ((head?.seq ?? 0) !== m.audit.seq || (head?.hash ?? null) !== m.audit.hash) throw new Error('The audit chain in the backup does not end at the head its manifest names');
  checks.push(`Audit chain: ${chain.length} entries verified, head ${m.audit.seq}`);
}

/** Decode every part into a scratch store and check it (both modes); postgres backups also load into a scratch schema when a database is at hand. */
export async function dryRun(opened: OpenedArchive): Promise<DryRun> {
  const { manifest: m, parts } = opened;
  const checks = [`${m.parts.length} parts opened; every SHA-256 matches the manifest`];
  try {
    if (m.mode === 'snapshot') {
      const scratch: Root = {};
      for (const p of m.parts) {
        const key = p.name.replace(/^store\//, '');
        const value = decode(parts.get(p.name)!.toString('utf8'));
        scratch[key] = value;
        if (sha256(encode(value)) !== p.sha256) throw new Error(`Store ${key} does not read back to the same content`);
      }
      if (!scratch.__civicos) throw new Error('The backup has no platform store (__civicos)');
      chainCheck(((scratch.__civicos as { audit?: AuditEntry[] }).audit) ?? [], m, checks);
      checks.push(`${Object.keys(scratch).length} stores restored into a scratch store`);
      return { ok: true, scratch: 'store', checks };
    }
    // postgres
    const rows = (name: string) => { const b = parts.get(`table/${name}`); return b && b.length ? b.toString('utf8').split('\n') : []; };
    chainCheck(rows('audit_entry').map(l => auditRow(JSON.parse(l) as Record<string, unknown>)), m, checks);
    const records = recordsBackend();
    if (!records) {
      checks.push('No database on this server: the rows were parsed, not loaded into a scratch schema');
      return { ok: false, scratch: 'parsed', checks, problem: 'A postgres backup is dry-run against a database; verify it on a server with CIVICOS_STATE=postgres' };
    }
    const schema = `civicos_dryrun_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const ROLLBACK = new Error('dry run: roll back');
    try {
      await records.sql.begin(async tx => {
        await tx.unsafe(`create schema ${ident(schema)}`);
        const live = new Set((await tx.unsafe(`select tablename from pg_tables where schemaname = 'civicos'`)).map(r => String(r.tablename)));
        for (const p of m.parts.filter(x => x.kind === 'table')) {
          const t = p.name.replace(/^table\//, '');
          if (!live.has(t)) throw new Error(`Table ${t} is not in this server's schema (the backup is from another schema version)`);
          await tx.unsafe(`create table ${ident(schema)}.${ident(t)} (like civicos.${ident(t)} including defaults including generated)`);
          const n = await loadRows(tx, schema, t, p, rows(t));
          if (n !== (p.rows ?? 0)) throw new Error(`Table ${t}: ${n} rows loaded, the manifest lists ${p.rows}`);
        }
        checks.push(`${m.parts.filter(x => x.kind === 'table').length} tables loaded into a scratch schema (rolled back)`);
        throw ROLLBACK;
      });
    } catch (e) { if (e !== ROLLBACK) throw e; }
    return { ok: true, scratch: 'schema', checks };
  } catch (e) {
    return { ok: false, scratch: m.mode === 'snapshot' ? 'store' : 'schema', checks, problem: (e as Error).message };
  }
}

/** Insert rows (JSON lines) into schema.table in batches; returns how many are there. */
async function loadRows(tx: Sql, schema: string, table: string, p: ManifestPart, lines: string[]): Promise<number> {
  const names = p.columns ?? [];
  const cols = names.map(ident).join(', ');
  // json/jsonb columns are taken as they are (populate would turn a JSON null into SQL NULL); the rest typed by the table.
  const types = new Map((await tx.unsafe(`select column_name, data_type from information_schema.columns where table_schema = $1 and table_name = $2`, [schema, table])).map(r => [String(r.column_name), String(r.data_type)]));
  const exprs = names.map(c => types.get(c) === 'jsonb' ? `(e -> ${lit(c)})` : types.get(c) === 'json' ? `(e -> ${lit(c)})::json` : `r.${ident(c)}`).join(', ');
  for (let i = 0; i < lines.length; i += 2000) {
    const batch = `[${lines.slice(i, i + 2000).join(',')}]`;
    await tx.unsafe(`insert into ${ident(schema)}.${ident(table)} (${cols}) select ${exprs} from jsonb_array_elements($1::text::jsonb) e, lateral jsonb_populate_record(null::${ident(schema)}.${ident(table)}, e) r`, [batch]);
  }
  return Number((await tx.unsafe(`select count(*)::int as n from ${ident(schema)}.${ident(table)}`))[0]!.n);
}

// ── Restore ───────────────────────────────────────────────────────────────
export interface Applied {
  /** Stores or tables replaced, and stores removed (they did not exist at the backup's time). */
  replaced: string[];
  removed: string[];
  kept: string[];
  /** After the restore: each part compared again with the backup. */
  check: { compared: number; differing: string[] };
}

type Keyring = { dataKeys?: { kid: string }[]; current?: string };

/** Replace this server's stores with a snapshot backup's (memory, file and supabase modes). */
export async function applySnapshot(opened: OpenedArchive): Promise<Applied> {
  const { manifest: m, parts } = opened;
  const kept = new Set(KEPT_ON_RESTORE);
  const incoming = new Map<string, unknown>();
  for (const p of m.parts) incoming.set(p.name.replace(/^store\//, ''), decode(parts.get(p.name)!.toString('utf8')));
  const replaced: string[] = [], removed: string[] = [];
  /** Counters kept higher than the backup's, with the backup's values (for the comparison below). */
  const restoredCounters = new Map<string, Record<string, number>>();
  // Stores created after the backup was taken go.
  for (const key of liveKeys()) {
    if (kept.has(key) || incoming.has(key) || EXCLUDED_STORES.has(key)) continue;
    const live = g[key];
    if (live instanceof Map) live.clear(); else await forgetStore(key);
    removed.push(key);
  }
  for (const [key, value] of incoming) {
    if (kept.has(key)) continue;
    let v = value;
    if (key === '__civicosKeyring') v = mergeKeyring(g[key] as Keyring | undefined, value as Keyring);
    // Record counters never go back: a number given after the backup is not given again.
    const counters = keepCounters(key, v);
    g[key] = g[key] === undefined ? v : replaceInPlace(g[key], v);
    const raised = counters();
    if (raised) restoredCounters.set(key, raised);
    replaced.push(key);
  }
  delete g.__facilityGrid; delete g.__parcelIndex;
  const differing = m.parts.filter(p => {
    const key = p.name.replace(/^store\//, '');
    const back = restoredCounters.get(key);
    const asRestored = back ? { ...(g[key] as Record<string, unknown>), ...back } : g[key];
    return !kept.has(key) && key !== '__civicosKeyring' && sha256(encode(asRestored)) !== p.sha256;
  }).map(p => p.name);
  for (const key of replaced) followed(key);
  markChanged();
  await saveNow();
  return { replaced, removed, kept: [...kept], check: { compared: replaced.length, differing } };
}

/**
 * Keep each record counter (`seq`, `…Seq`) of a store at the higher of its
 * live and restored value. Call the result after replacing: it returns the
 * backup's values of the counters it kept higher, or null.
 */
function keepCounters(key: string, restored: unknown): () => Record<string, number> | null {
  const live = g[key];
  if (!live || typeof live !== 'object' || !restored || typeof restored !== 'object') return () => null;
  const fields = counterFields(live).map(f => ({ f, live: Number((live as Record<string, unknown>)[f]) || 0, back: Number((restored as Record<string, unknown>)[f]) || 0 })).filter(x => x.live > x.back);
  return () => {
    const now = g[key] as Record<string, unknown> | undefined;
    if (!now || !fields.length) return null;
    for (const x of fields) now[x.f] = x.live;
    return Object.fromEntries(fields.map(x => [x.f, x.back]));
  };
}

function mergeKeyring(live: Keyring | undefined, restored: Keyring): Keyring {
  if (!live?.dataKeys?.length) return restored;
  const have = new Set((restored.dataKeys ?? []).map(k => k.kid));
  return { ...restored, dataKeys: [...(restored.dataKeys ?? []), ...live.dataKeys.filter(k => !have.has(k.kid))], current: live.current ?? restored.current };
}

const RECORD_FIELDS_CLEAR: Record<string, (s: Record<string, unknown>) => void> = {
  __civicos: s => { if (Array.isArray(s.audit)) s.audit.length = 0; },
  __civicosTwin: s => { s.entities = {}; s.keys = []; s.sources = []; s.runs = []; s.observations = []; },
  __civicosTwinArchive: s => { s.observations = {}; s.runs = []; },
  __civicosFacilities: s => { s.facilities = []; },
  __civicosBoundaries: s => { s.versions = []; },
  __civicosParcels: s => { s.parcels = []; },
};

/** Replace the record tables with a postgres backup's, in one transaction, and reload the read model. */
export async function applyPostgres(opened: OpenedArchive, instance: string, backupId: string): Promise<Applied> {
  const records = recordsBackend();
  if (!records) throw new Error('This server does not run in postgres mode');
  const { manifest: m, parts } = opened;
  const kept = new Set(KEPT_ON_RESTORE);
  const sql = records.sql;
  if (!(await records.drain(30_000))) throw new Error('This server\'s write queue did not drain within 30 s; nothing was restored');
  const rows = (name: string) => { const b = parts.get(`table/${name}`); return b && b.length ? b.toString('utf8').split('\n') : []; };
  const keepDoc = (line: string) => !kept.has(String((JSON.parse(line) as { store?: string }).store));
  const tableParts = m.parts.filter(p => p.kind === 'table');
  const docStores = new Set(rows('record_doc').map(l => String((JSON.parse(l) as { store: string }).store)));
  const replaced: string[] = [];
  await sql.begin(async tx => {
    // The same lock every audit append takes: no instance appends while the chain is replaced.
    await tx.unsafe(`select pg_advisory_xact_lock(hashtext('civicos.records.audit'))`);
    const live = await tables(tx);
    const byName = new Map(live.map(t => [t.name, t]));
    for (const p of tableParts) if (!byName.has(p.name.replace(/^table\//, ''))) throw new Error(`Table ${p.name} is not in this server's schema`);
    const targets = live.filter(t => tableParts.some(p => p.name === `table/${t.name}`));
    // Append-only guards are lifted only inside this transaction (owner only), and put back before it commits.
    for (const t of targets) await tx.unsafe(`alter table civicos.${ident(t.name)} disable trigger user`);
    for (const t of [...targets].reverse()) {
      if (t.name === 'record_counter') continue;
      if (t.name === 'record_doc') await tx.unsafe(`delete from civicos.record_doc where store <> all($1::text[])`, [[...kept]]);
      else await tx.unsafe(`delete from civicos.${ident(t.name)}`);
    }
    for (const t of targets) {
      const p = tableParts.find(x => x.name === `table/${t.name}`)!;
      let lines = rows(t.name);
      if (t.name === 'record_doc') lines = lines.filter(keepDoc);
      if (t.name === 'record_counter') {
        // A record number once given is never given again: keep the higher of the two.
        if (lines.length) await tx.unsafe(`insert into civicos.record_counter (name, next_value) select name, next_value from jsonb_populate_recordset(null::civicos.record_counter, $1::text::jsonb)
                                          on conflict (name) do update set next_value = greatest(civicos.record_counter.next_value, excluded.next_value)`, [`[${lines.join(',')}]`]);
      } else {
        await loadRows(tx, 'civicos', t.name, p, lines);
      }
      for (const c of t.serials) {
        await tx.unsafe(`select setval(pg_get_serial_sequence($1, $2), (select coalesce(max(${ident(c)}), 0) + 1 from civicos.${ident(t.name)}), false)`, [`civicos.${t.name}`, c]);
      }
      replaced.push(`table/${t.name}`);
    }
    for (const t of targets) await tx.unsafe(`alter table civicos.${ident(t.name)} enable trigger user`);
    await tx.unsafe(`insert into civicos.outbox (instance, topic, record_id, payload) values ($1, 'state.restore', $2, $3::text::jsonb)`, [instance, backupId, JSON.stringify({ backupId, at: new Date().toISOString(), auditSeq: m.audit.seq })]);
  });
  // The read model: emptied, then loaded again from the restored tables.
  const removed: string[] = [];
  await reloadRecords(() => {
    for (const [key, clear] of Object.entries(RECORD_FIELDS_CLEAR)) { const s = g[key]; if (s && typeof s === 'object') clear(s as Record<string, unknown>); }
    for (const key of liveKeys()) {
      if (kept.has(key) || docStores.has(key) || key in RECORD_FIELDS_CLEAR) continue;
      const live = g[key];
      if (live instanceof Map) live.clear(); else delete g[key];
      removed.push(key);
    }
  });
  delete g.__facilityGrid; delete g.__parcelIndex;
  for (const key of docStores) if (!kept.has(key)) followed(key);
  // Compare again: each table exported now against the backup (counters and kept stores aside).
  const differing: string[] = [];
  await sql.begin('isolation level repeatable read read only', async tx => {
    for (const t of await tables(tx)) {
      const p = tableParts.find(x => x.name === `table/${t.name}`);
      if (!p || t.name === 'record_counter') continue;
      let now = await exportTable(tx, t), was = rows(t.name);
      if (t.name === 'record_doc') { now = now.filter(keepDoc); was = was.filter(keepDoc); }
      if (sha256(now.join('\n')) !== sha256(was.join('\n'))) differing.push(p.name);
    }
  });
  return { replaced, removed, kept: [...kept], check: { compared: replaced.length, differing } };
}

/** The live state's parts, hashed (for the loss warning and the hash of the replaced state). */
export async function liveDigest(): Promise<{ parts: { name: string; sha256: string }[]; audit: Manifest['audit'] }> {
  if (!recordsBackend()) {
    const c = captureSnapshot();
    return { parts: c.parts.map(p => ({ name: p.name, sha256: sha256(p.data) })), audit: c.audit };
  }
  const c = await capturePostgres();
  return { parts: c.parts.map(p => ({ name: p.name, sha256: sha256(p.data) })), audit: c.audit };
}
