// Per-record documents for every store that has no typed table (architecture
// review R6, D1/D2, C2): the nation profile and ministries (`__civicos`), the
// officials, the Update Center, the public sites, the twin's scenarios and
// metric definitions, the event outbox, the signed audit heads and the rest
// of the `__civicos*` stores. With CIVICOS_STATE=postgres they are kept in
// civicos.record_doc, one row per record, instead of whole-store snapshots
// (lib/data/repo/postgres.ts writes and follows them). Pure functions; no
// database here.
//
// A store is cut into records by its shape, the same way every time:
//   - a plain object or a Map with string keys is a container: one `object`
//     or `map` row, and each property or entry below it, down to MAX_DEPTH;
//   - a non-empty list whose items are all plain objects with distinct string
//     ids (permits, releases, tickets, accounts …) is a `list` row holding
//     the order of the ids, and one `value` row per item: the item is the
//     record;
//   - anything else (numbers, strings, other lists, deeper objects) is a
//     `value` row.
// A row's path names the way down from the store: ['k', property],
// ['m', map key] or ['i', item id]. Values are encoded as the snapshots
// encode them (lib/data/encode.ts: Maps, Sets and Dates kept).
//
// Fields kept elsewhere stay out: the fields with typed tables (RECORD_FIELDS)
// and the store's record counters (`seq`, `…Seq`), which the backend numbers
// from civicos.record_counter so two instances never give the same number.
//
// Two instances changing the same record at once are merged three ways
// (merge3): from what both last agreed on, each side's changes are kept; a
// value both changed differently takes the later writer's and is counted as a
// conflict; lists of records are merged by id.

import { encode, decode } from '@/lib/data/encode';

export type Kind = 'value' | 'object' | 'map' | 'list';
export type Seg = ['k', string] | ['m', string] | ['i', string];
/** A record as stored: its kind and its document as JSON text. */
export interface DocRow { kind: Kind; json: string }
/** A record as this instance last wrote or read it, with the version the table holds. */
export interface Known extends DocRow { version: number }
/** One record to write: `json` null removes it. `expected` is the version it was changed from (0: new). */
export interface Change { path: string; kind: Kind; json: string | null; expected: number; base?: string }

/** How deep containers are cut into records (the store is depth 0). */
export const MAX_DEPTH = 4;
/** A record counter at a store's top level: `seq`, `requestSeq`, `mediaSeq` … */
export const COUNTER = /^(?:seq|[a-z][A-Za-z0-9]*Seq)$/;

type Obj = Record<string, unknown>;
const plain = (v: unknown): v is Obj => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v) as unknown;
  return p === Object.prototype || p === null;
};
const stringKeyed = (m: Map<unknown, unknown>): m is Map<string, unknown> => { for (const k of m.keys()) if (typeof k !== 'string') return false; return true; };
const idList = (v: unknown): v is { id: string }[] => {
  if (!Array.isArray(v) || !v.length) return false;
  const ids = new Set<string>();
  for (const x of v) {
    if (!plain(x) || typeof x.id !== 'string' || ids.has(x.id)) return false;
    ids.add(x.id);
  }
  return true;
};
/**
 * What jsonb refuses never belongs in a record and is replaced by U+FFFD: NUL,
 * and half of a surrogate pair (a record that cannot be written would hold up
 * every write after it).
 */
const storable = (json: string): string => {
  if (!/\\u(0000|d[89a-f])/i.test(json)) return json;
  // Escapes are read left to right, so an escaped backslash is never taken for the start of one.
  return json.replace(/\\ud[89ab][0-9a-f]{2}\\ud[c-f][0-9a-f]{2}|\\u0000|\\ud[89a-f][0-9a-f]{2}|\\[\s\S]/gi,
    m => (m.length === 6 && (/^\\u0000$/.test(m) || /^\\ud[89a-f]/i.test(m)) ? '\\ufffd' : m));
};
const valueRow = (v: unknown): DocRow => ({ kind: 'value', json: storable(encode(v) ?? 'null') });

/** A record read from the table as this instance encodes it (jsonb keeps its own key order and spacing). */
export const normalise = (row: DocRow): DocRow => (row.kind === 'value' ? valueRow(decode(row.json)) : row.kind === 'list' ? { kind: 'list', json: JSON.stringify(JSON.parse(row.json)) } : { kind: row.kind, json: '{}' });

export const pathOf = (segs: Seg[]): string => JSON.stringify(segs);
export const segsOf = (path: string): Seg[] => JSON.parse(path) as Seg[];

/** The counter fields of a store (top level, numbers). */
export function counterFields(store: unknown): string[] {
  if (!plain(store)) return [];
  return Object.keys(store).filter(k => COUNTER.test(k) && typeof store[k] === 'number');
}

/** The row a value at `depth` is, without what lies below it. */
function rowFor(v: unknown, depth: number, inList: boolean): DocRow {
  if (inList || depth >= MAX_DEPTH) return valueRow(v);
  if (plain(v)) return { kind: 'object', json: '{}' };
  if (v instanceof Map && stringKeyed(v)) return { kind: 'map', json: '{}' };
  if (idList(v)) return { kind: 'list', json: JSON.stringify(v.map(x => x.id)) };
  return valueRow(v);
}

/** Cut a store into its records (path → row). `skip`: top-level fields kept elsewhere. */
export function decompose(store: unknown, skip: ReadonlySet<string> = new Set()): Map<string, DocRow> {
  const out = new Map<string, DocRow>();
  const walk = (v: unknown, segs: Seg[], inList: boolean): void => {
    const row = rowFor(v, segs.length, inList);
    out.set(pathOf(segs), row);
    if (row.kind === 'object') {
      for (const [k, x] of Object.entries(v as Obj)) {
        if (x === undefined || typeof x === 'function' || (!segs.length && skip.has(k))) continue;
        walk(x, [...segs, ['k', k]], false);
      }
    } else if (row.kind === 'map') {
      for (const [k, x] of v as Map<string, unknown>) if (x !== undefined) walk(x, [...segs, ['m', k]], false);
    } else if (row.kind === 'list') {
      for (const x of v as { id: string }[]) walk(x, [...segs, ['i', x.id]], true);
    }
  };
  walk(store, [], false);
  return out;
}

/** What changed between the records as known and as they are now. Containers first, then their records. */
export function diff(rows: Map<string, DocRow>, known: Map<string, Known>): Change[] {
  const out: Change[] = [];
  for (const [path, row] of rows) {
    const k = known.get(path);
    if (!k || k.kind !== row.kind || k.json !== row.json) out.push({ path, kind: row.kind, json: row.json, expected: k?.version ?? 0, ...(k ? { base: k.json } : {}) });
  }
  for (const [path, k] of known) if (!rows.has(path)) out.push({ path, kind: k.kind, json: null, expected: k.version, base: k.json });
  const depth = (p: string) => segsOf(p).length;
  return out.sort((a, b) => (a.json === null ? 1 : 0) - (b.json === null ? 1 : 0) || depth(a.path) - depth(b.path));
}

// ── Reading records back into a store ────────────────────────────────────
function childOf(parent: unknown, seg: Seg): unknown {
  if (seg[0] === 'k') return plain(parent) ? parent[seg[1]] : undefined;
  if (seg[0] === 'm') return parent instanceof Map ? parent.get(seg[1]) : undefined;
  return Array.isArray(parent) ? parent.find(x => plain(x) && x.id === seg[1]) : undefined;
}
function setChild(parent: unknown, seg: Seg, v: unknown): void {
  if (seg[0] === 'k') (parent as Obj)[seg[1]] = v;
  else if (seg[0] === 'm') (parent as Map<string, unknown>).set(seg[1], v);
  else {
    const list = parent as unknown[];
    const i = list.findIndex(x => plain(x) && x.id === seg[1]);
    if (i >= 0) list[i] = v; else list.push(v);
  }
}
function removeChild(parent: unknown, seg: Seg): void {
  if (seg[0] === 'k') { if (plain(parent)) delete parent[seg[1]]; }
  else if (seg[0] === 'm') { if (parent instanceof Map) parent.delete(seg[1]); }
  else if (Array.isArray(parent)) {
    const i = parent.findIndex(x => plain(x) && x.id === seg[1]);
    if (i >= 0) parent.splice(i, 1);
  }
}
/** Whether `v` is the container a segment below it needs. */
const holds = (v: unknown, seg: Seg): boolean => (seg[0] === 'k' ? plain(v) : seg[0] === 'm' ? v instanceof Map : Array.isArray(v));
const containerFor = (seg: Seg): unknown => (seg[0] === 'k' ? {} : seg[0] === 'm' ? new Map() : []);
const fits = (v: unknown, kind: Kind): boolean => (kind === 'object' ? plain(v) : kind === 'map' ? v instanceof Map : kind === 'list' ? Array.isArray(v) : false);
const materialise = (row: DocRow): unknown => (row.kind === 'object' ? {} : row.kind === 'map' ? new Map() : row.kind === 'list' ? [] : decode(row.json));

/** Put a list's items in the order of `ids`; items not named (added here and not written yet) stay at the end. */
function reorder(list: unknown[], ids: string[]): void {
  const by = new Map<string, unknown>();
  const rest: unknown[] = [];
  for (const x of list) { if (plain(x) && typeof x.id === 'string' && !by.has(x.id)) by.set(x.id, x); else rest.push(x); }
  const named = new Set(ids);
  const ordered = ids.filter(id => by.has(id)).map(id => by.get(id));
  for (const [id, x] of by) if (!named.has(id)) rest.push(x);
  list.splice(0, list.length, ...ordered, ...rest);
}

/** The value at a path, or undefined. */
export function valueAt(root: unknown, segs: Seg[]): unknown {
  let cur = root;
  for (const s of segs) { cur = childOf(cur, s); if (cur === undefined) return undefined; }
  return cur;
}

/** The record at a path as the store holds it now (undefined: there is none). */
export function rowAt(root: unknown, segs: Seg[], skip: ReadonlySet<string> = new Set()): DocRow | undefined {
  if (segs.length === 1 && segs[0]![0] === 'k' && skip.has(segs[0]![1])) return undefined;
  for (let i = 0; i < segs.length - 1; i++) if (segs[i]![0] === 'i') return undefined; // items are records: nothing lies below them
  const v = valueAt(root, segs);
  if (v === undefined) return undefined;
  return rowFor(v, segs.length, segs.length > 0 && segs[segs.length - 1]![0] === 'i');
}

/**
 * Apply one record to a store, changing it in place (modules keep their
 * store objects). Returns the store, which is a new object only when the
 * store itself was not the container the record needs.
 */
export function applyRow(root: unknown, segs: Seg[], row: DocRow): unknown {
  if (!segs.length) {
    if (row.kind === 'value') return materialise(row);
    if (!fits(root, row.kind)) return materialise(row);
    if (row.kind === 'list') reorder(root as unknown[], JSON.parse(row.json) as string[]);
    return root;
  }
  let out = root;
  if (!holds(out, segs[0]!)) out = containerFor(segs[0]!);
  let cur = out;
  for (let i = 0; i < segs.length - 1; i++) {
    let next = childOf(cur, segs[i]!);
    if (!holds(next, segs[i + 1]!)) { next = containerFor(segs[i + 1]!); setChild(cur, segs[i]!, next); }
    cur = next;
  }
  const last = segs[segs.length - 1]!;
  const existing = childOf(cur, last);
  if (row.kind === 'value') setChild(cur, last, materialise(row));
  else if (!fits(existing, row.kind)) setChild(cur, last, materialise(row));
  if (row.kind === 'list') reorder(childOf(cur, last) as unknown[], JSON.parse(row.json) as string[]);
  return out;
}

/** Remove the record at a path (and what lies below it). */
export function removeAt(root: unknown, segs: Seg[]): void {
  if (!segs.length) return;
  const parent = valueAt(root, segs.slice(0, -1));
  if (parent !== undefined) removeChild(parent, segs[segs.length - 1]!);
}

/** A whole store from its records (rows in any order). */
export function build(rows: { path: string; kind: Kind; json: string }[]): unknown {
  const sorted = rows.map(r => ({ ...r, segs: segsOf(r.path) })).sort((a, b) => a.segs.length - b.segs.length);
  let root: unknown;
  for (const r of sorted) root = applyRow(root, r.segs, r);
  // Lists in their recorded order once every item is there.
  for (const r of sorted) if (r.kind === 'list') { const l = valueAt(root, r.segs); if (Array.isArray(l)) reorder(l, JSON.parse(r.json) as string[]); }
  return root;
}

/**
 * Make `live` hold what `built` holds, in place where both are plain objects
 * or Maps (modules keep a reference to their store). `keep`: top-level fields
 * left as they are (fields kept in tables, record counters). Returns the store.
 */
export function replaceInPlace(live: unknown, built: unknown, keep: ReadonlySet<string> = new Set()): unknown {
  if (plain(live) && plain(built)) {
    for (const k of Object.keys(live)) if (!keep.has(k) && !(k in built)) delete live[k];
    for (const [k, v] of Object.entries(built)) if (!keep.has(k)) live[k] = v;
    return live;
  }
  if (live instanceof Map && built instanceof Map) {
    live.clear();
    for (const [k, v] of built) live.set(k, v);
    return live;
  }
  return built;
}

// ── Three-way merge (on the JSON form of records) ─────────────────────────
type J = unknown;
const isObj = (v: J): v is Record<string, J> => !!v && typeof v === 'object' && !Array.isArray(v);
/** A key-order-free encoding (jsonb keeps keys in its own order). */
export function canon(v: J): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  return v === undefined ? 'undefined' : JSON.stringify(v);
}
export const same = (a: J, b: J): boolean => canon(a) === canon(b);

export interface Merged { value: J; conflicts: number }

/** Merge two changes of the same record made from `base` (undefined: absent). */
export function merge3(base: J, ours: J, theirs: J): Merged {
  if (same(ours, theirs)) return { value: ours, conflicts: 0 };
  if (same(ours, base)) return { value: theirs, conflicts: 0 };
  if (same(theirs, base)) return { value: ours, conflicts: 0 };
  if (isObj(ours) && isObj(theirs)) {
    const b = isObj(base) ? base : {};
    const out: Record<string, J> = {};
    let conflicts = 0;
    for (const k of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
      const r = merge3(b[k], ours[k], theirs[k]);
      conflicts += r.conflicts;
      if (r.value !== undefined) out[k] = r.value;
    }
    return { value: out, conflicts };
  }
  if (Array.isArray(ours) && Array.isArray(theirs)) return mergeLists(Array.isArray(base) ? base : [], ours, theirs);
  // Both changed the same value differently: the later writer (this one) wins, and it is counted.
  return { value: ours, conflicts: 1 };
}

/** Whether a path is one of a store's record counters (`seq`, `…Seq` at its top level). */
export const isCounterPath = (segs: Seg[]): boolean => segs.length === 1 && segs[0]![0] === 'k' && COUNTER.test(segs[0]![1]);

/**
 * merge3 for the record at `segs`. A record counter takes the higher number:
 * each instance gives numbers from its own reserved block, and the field only
 * says how far numbering went.
 */
export function mergeAt(segs: Seg[], base: J, ours: J, theirs: J): Merged {
  if (isCounterPath(segs) && typeof ours === 'number' && typeof theirs === 'number') return { value: Math.max(ours, theirs), conflicts: 0 };
  return merge3(base, ours, theirs);
}

function mergeLists(base: J[], ours: J[], theirs: J[]): Merged {
  const all = [...base, ...ours, ...theirs];
  const byId = all.length > 0 && all.every(x => isObj(x) && typeof x.id === 'string');
  const key = (x: J): string => (byId ? String((x as { id: string }).id) : canon(x));
  const index = (l: J[]) => { const m = new Map<string, J>(); for (const x of l) if (!m.has(key(x))) m.set(key(x), x); return m; };
  const b = index(base), o = index(ours), t = index(theirs);
  const out: J[] = [];
  let conflicts = 0;
  for (const [k, x] of t) {
    const r = byId ? merge3(b.get(k), o.get(k), x) : { value: b.has(k) && !o.has(k) ? undefined : x, conflicts: 0 };
    conflicts += r.conflicts;
    if (r.value !== undefined) out.push(r.value);
  }
  // Records the other side removed and this side changed are kept (this side wrote later).
  if (byId) for (const [k, x] of o) if (b.has(k) && !t.has(k) && !same(x, b.get(k))) { out.push(x); conflicts++; }
  // What this side added: those it put first go first, the rest after.
  const added = ours.filter(x => !b.has(key(x)) && !t.has(key(x)));
  let lead = 0;
  while (lead < ours.length && !b.has(key(ours[lead])) && !t.has(key(ours[lead]))) lead++;
  const front = added.slice(0, lead);
  return { value: [...front, ...out, ...added.slice(lead)], conflicts };
}
