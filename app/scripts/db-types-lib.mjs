// Supabase TypeScript types from the SQL migrations, offline (architecture
// review R16, C4): no database, no Supabase CLI. Reads
// app/supabase/migrations/*.sql in order and replays what they declare —
// tables (create, add/drop/rename column, drop), enums, views and functions —
// into the `Database` type `supabase gen types typescript` produces, for the
// `civicos` and `public` schemas. Used by scripts/build-db-types.mjs (writes
// src/lib/db/types.generated.ts) and by src/lib/db/types-generated.test.ts
// (fails while that file is stale).
//
// It reads the SQL the migrations use, not every form Postgres accepts:
// statements inside DO blocks and function bodies are not replayed (they are
// conditional or dynamic), and a view column whose type cannot be told from
// its expression is `unknown`.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const SCHEMAS = ['civicos', 'public'];

// ── Splitting the SQL into statements ───────────────────────────────────────
/** Statements, with comments removed and dollar-quoted bodies replaced by `$body$`. */
export function statements(sql) {
  const out = [];
  let cur = '';
  for (let i = 0; i < sql.length;) {
    const c = sql[i], n = sql[i + 1];
    if (c === '-' && n === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? sql.length : e + 2; cur += ' '; continue; }
    if (c === "'") {
      let j = i + 1;
      for (; j < sql.length; j++) { if (sql[j] === "'" && sql[j + 1] === "'") { j++; continue; } if (sql[j] === "'") break; }
      cur += sql.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
      if (m) {
        const tag = m[0], e = sql.indexOf(tag, i + tag.length);
        cur += ' $body$ '; i = e < 0 ? sql.length : e + tag.length; continue;
      }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.replace(/\s+/g, ' ').trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.replace(/\s+/g, ' ').trim());
  return out;
}

/** Split at top-level commas (outside parentheses and quotes). */
function splitTop(s) {
  const out = [];
  let depth = 0, cur = '', q = false;
  for (const ch of s) {
    if (ch === "'") q = !q;
    if (!q && ch === '(') depth++;
    if (!q && ch === ')') depth--;
    if (!q && depth === 0 && ch === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/** The text inside the parentheses that open at `from` (index of '('). */
function inside(s, from) {
  let depth = 0, q = false;
  for (let i = from; i < s.length; i++) {
    if (s[i] === "'") q = !q;
    if (q) continue;
    if (s[i] === '(') depth++;
    if (s[i] === ')' && --depth === 0) return { text: s.slice(from + 1, i), end: i + 1 };
  }
  return { text: s.slice(from + 1), end: s.length };
}

const unquote = (n) => n.replace(/"/g, '');
/** [schema, name] of a qualified name (unqualified: public). */
function qname(raw) {
  const parts = unquote(raw).toLowerCase().split('.');
  return parts.length > 1 ? [parts[0], parts[1]] : ['public', parts[0]];
}

// ── Types ─────────────────────────────────────────────────────────────────
const TYPE_RE = /^(double precision|timestamp(?:\s*\(\d+\))?(?:\s+with(?:out)?\s+time\s+zone)?|time(?:\s+with(?:out)?\s+time\s+zone)?|character varying(?:\s*\(\d+\))?|bit varying(?:\s*\(\d+\))?|"?[a-z_][a-z0-9_]*"?(?:\."?[a-z_][a-z0-9_]*"?)?(?:\s*\([^)]*\))?)((?:\s*\[\s*\])*)/i;

function tsType(pgRaw, db, schema) {
  const raw = pgRaw.trim().toLowerCase();
  const arr = /\[\s*\]$/.test(raw);
  const base = raw.replace(/(\s*\[\s*\])+$/, '').replace(/\s*\(.*\)$/, '').replace(/"/g, '');
  const [s, n] = base.includes('.') ? base.split('.') : [schema, base];
  let t;
  if (/^(text|varchar|character varying|character|char|bpchar|citext|uuid|inet|cidr|macaddr|date|time|timetz|timestamp|timestamptz|interval|tstzrange|tsrange|daterange|int4range|int8range|numrange|bytea|name|regclass|bit|bit varying|xml|money)$/.test(n) || /^time(stamp)? with(out)? time zone$/.test(n)) t = 'string';
  else if (/^(smallint|integer|int|int2|int4|int8|bigint|serial|serial4|serial8|bigserial|smallserial|real|double precision|float|float4|float8|numeric|decimal|oid)$/.test(n)) t = 'number';
  else if (/^(boolean|bool)$/.test(n)) t = 'boolean';
  else if (/^(json|jsonb)$/.test(n)) t = 'Json';
  else if (db[s]?.enums.has(n)) t = `Database["${s}"]["Enums"]["${n}"]`;
  else if (db[s]?.tables.has(n)) t = `Database["${s}"]["Tables"]["${n}"]["Row"]`;
  else t = 'unknown';
  return arr ? (t.includes('"') || t === 'unknown' ? `(${t})[]` : `${t}[]`) : t;
}

// ── Replaying the migrations ──────────────────────────────────────────────
function emptyDb() {
  const db = {};
  for (const s of SCHEMAS) db[s] = { tables: new Map(), views: new Map(), functions: new Map(), enums: new Map() };
  return db;
}

/** A column definition: name, SQL type and what the Row/Insert types need to know. */
function parseColumn(def) {
  const m = /^("[^"]+"|[a-z_][a-z0-9_]*)\s+(.*)$/i.exec(def.trim());
  if (!m) return null;
  const name = unquote(m[1]).toLowerCase();
  if (/^(constraint|primary|unique|check|foreign|exclude|like)$/i.test(name)) return null;
  const tm = TYPE_RE.exec(m[2]);
  if (!tm) return null;
  const type = (tm[1] + (tm[2] ?? '')).replace(/\s+/g, ' ');
  const rest = m[2].slice(tm[0].length).toLowerCase();
  const serial = /serial/i.test(tm[1]);
  return {
    name, type,
    notNull: serial || /\bnot null\b/.test(rest) || /\bprimary key\b/.test(rest),
    hasDefault: serial || /\bdefault\b/.test(rest) || /\bgenerated\b.*\bas identity\b/.test(rest),
    generated: /\bgenerated always as\s*\(/.test(rest),
  };
}

function createTable(db, st) {
  const m = /^create (?:unlogged )?table (?:if not exists )?([^\s(]+)\s*\(/i.exec(st);
  if (!m) return;
  const [s, n] = qname(m[1]);
  if (!db[s]) return;
  if (/ if not exists /i.test(st.slice(0, m[0].length)) && db[s].tables.has(n)) return;
  const body = inside(st, m[0].length - 1).text;
  const cols = new Map();
  const pk = [];
  for (const part of splitTop(body)) {
    const p = /^(?:constraint \S+ )?primary key\s*\(([^)]*)\)/i.exec(part);
    if (p) { pk.push(...p[1].split(',').map(x => unquote(x.trim()).toLowerCase())); continue; }
    const c = parseColumn(part);
    if (c) cols.set(c.name, c);
  }
  for (const k of pk) { const c = cols.get(k); if (c) c.notNull = true; }
  db[s].tables.set(n, cols);
}

function alterTable(db, st) {
  const m = /^alter table (?:if exists )?(?:only )?([^\s]+) (.*)$/i.exec(st);
  if (!m) return;
  const [s, n] = qname(m[1]);
  const cols = db[s]?.tables.get(n);
  if (!cols) return;
  const ren = /^rename to ([^\s]+)$/i.exec(m[2]);
  if (ren) { db[s].tables.delete(n); db[s].tables.set(unquote(ren[1]).toLowerCase(), cols); return; }
  const rc = /^rename (?:column )?([^\s]+) to ([^\s]+)$/i.exec(m[2]);
  if (rc) {
    const from = unquote(rc[1]).toLowerCase(), to = unquote(rc[2]).toLowerCase();
    const c = cols.get(from);
    if (c) { cols.delete(from); cols.set(to, { ...c, name: to }); }
    return;
  }
  for (const action of splitTop(m[2])) {
    const add = /^add (?:column )?(?:if not exists )?(.*)$/i.exec(action);
    if (add && !/^add (constraint|primary key|unique|check|foreign key)/i.test(action)) {
      const c = parseColumn(add[1]);
      if (c && !(/if not exists/i.test(action) && cols.has(c.name))) cols.set(c.name, c);
      continue;
    }
    const drop = /^drop (?:column )?(?:if exists )?("[^"]+"|[a-z_][a-z0-9_]*)/i.exec(action);
    if (drop && !/^drop (constraint|not null|default)/i.test(action)) { cols.delete(unquote(drop[1]).toLowerCase()); continue; }
    const alt = /^alter (?:column )?("[^"]+"|[a-z_][a-z0-9_]*) (.*)$/i.exec(action);
    if (alt) {
      const c = cols.get(unquote(alt[1]).toLowerCase());
      if (!c) continue;
      const what = alt[2].toLowerCase();
      if (/^set not null/.test(what)) c.notNull = true;
      else if (/^drop not null/.test(what)) c.notNull = false;
      else if (/^set default/.test(what)) c.hasDefault = true;
      else if (/^drop default/.test(what)) c.hasDefault = false;
      else { const t = /^(?:set data )?type (.*?)(?: using .*)?$/.exec(what); if (t) { const tm = TYPE_RE.exec(t[1]); if (tm) c.type = (tm[1] + (tm[2] ?? '')).replace(/\s+/g, ' '); } }
    }
  }
}

function createEnum(db, st) {
  const m = /^create type ([^\s]+) as enum\s*\(/i.exec(st);
  if (!m) return;
  const [s, n] = qname(m[1]);
  if (!db[s]) return;
  const values = [...inside(st, m[0].length - 1).text.matchAll(/'((?:[^']|'')*)'/g)].map(x => x[1].replace(/''/g, "'"));
  db[s].enums.set(n, values);
}

/** The columns a view's select list gives, with their types where they can be told. */
function createView(db, st) {
  const m = /^create (?:or replace )?(?:materialized )?view ([^\s(]+)(?: with \([^)]*\))? as (.*)$/i.exec(st);
  if (!m) return;
  const [s, n] = qname(m[1]);
  if (!db[s]) return;
  const sel = /^\(?\s*select (distinct (?:on \([^)]*\) )?)?(.*)$/i.exec(m[2]);
  if (!sel) { db[s].views.set(n, new Map()); return; }
  // The select list ends at the top-level FROM.
  const body = sel[2];
  let depth = 0, end = body.length;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') depth--;
    else if (depth === 0 && /^\sfrom\s/i.test(body.slice(i, i + 6))) { end = i; break; }
  }
  const list = body.slice(0, end), from = body.slice(end);
  // Tables in FROM and JOINs, by alias.
  const aliases = new Map();
  for (const t of from.matchAll(/(?:from|join)\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)(?:\s+(?:as\s+)?(?!on\b|where\b|join\b|left\b|right\b|inner\b|cross\b|full\b|group\b|order\b|limit\b|union\b)([a-z_][a-z0-9_]*))?/gi)) {
    const [ts, tn] = qname(t[1]);
    const cols = db[ts]?.tables.get(tn) ?? db[ts]?.views.get(tn);
    if (!cols) continue;
    aliases.set(tn, { cols, schema: ts });
    if (t[2]) aliases.set(t[2].toLowerCase(), { cols, schema: ts });
  }
  const first = [...aliases.values()][0];
  const cols = new Map();
  for (const item of splitTop(list)) {
    const star = /^(?:([a-z_][a-z0-9_]*)\.)?\*$/i.exec(item);
    if (star) {
      const src = star[1] ? aliases.get(star[1].toLowerCase()) : first;
      for (const [k, c] of src?.cols ?? []) cols.set(k, { ...c, notNull: false, schema: src.schema });
      continue;
    }
    const as = /^(.*?)\s+(?:as\s+)?("[^"]+"|[a-z_][a-z0-9_]*)$/i.exec(item);
    const expr = (as && !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(item) ? as[1] : item).trim();
    const ref = /^(?:([a-z_][a-z0-9_]*)\.)?([a-z_][a-z0-9_]*)$/i.exec(expr);
    const name = unquote(as && expr !== item ? as[2] : (ref ? ref[2] : item)).toLowerCase();
    let type = null, schema = s;
    if (ref) {
      const src = ref[1] ? aliases.get(ref[1].toLowerCase()) : [...aliases.values()].find(a => a.cols.has(ref[2].toLowerCase()));
      const c = src?.cols.get(ref[2].toLowerCase());
      if (c) { type = c.type; schema = src.schema; }
    }
    const cast = /::\s*([a-z_][a-z0-9_ ]*(?:\[\])?)\s*$/i.exec(expr);
    if (!type && cast) type = cast[1];
    const ops = expr.replace(/#?->>?|#>>?|::/g, ' ');
    if (!type && /->>\s*[^\s]+$/.test(expr)) type = 'text';
    if (!type && /\b(is (not )?null|is (not )?distinct|exists)\b|(=|<>|<|>)/i.test(ops) && !/\bcase\b/i.test(expr)) type = 'boolean';
    if (!type && /^count\(/i.test(expr)) type = 'bigint';
    cols.set(name, { name, type: type ?? 'unknown', notNull: false, schema });
  }
  db[s].views.set(n, cols);
}

function createFunction(db, st) {
  const m = /^create (?:or replace )?function ([^\s(]+)\s*\(/i.exec(st);
  if (!m) return;
  const [s, n] = qname(m[1]);
  if (!db[s]) return;
  const { text: argText, end } = inside(st, m[0].length - 1);
  const after = st.slice(end);
  const ret = /^\s*returns\s+(setof\s+)?(table\s*\(|[^\s]+(?:\s+precision|\s+with(?:out)?\s+time\s+zone)?(?:\[\])?)/i.exec(after);
  if (!ret) return;
  if (/^trigger$/i.test(ret[2]) || /^event_trigger$/i.test(ret[2])) return;
  const args = [];
  for (const a of splitTop(argText)) {
    if (!a) continue;
    const am = /^(?:(in|out|inout|variadic)\s+)?("[^"]+"|[a-z_][a-z0-9_]*)\s+(.*)$/i.exec(a);
    if (!am || /^out$/i.test(am[1] ?? '')) continue;
    const tm = TYPE_RE.exec(am[3]);
    args.push({ name: unquote(am[2]).toLowerCase(), type: tm ? (tm[1] + (tm[2] ?? '')) : 'unknown', optional: /\bdefault\b|=/i.test(am[3].slice(tm ? tm[0].length : 0)) });
  }
  let returns;
  if (/^table\s*\(/i.test(ret[2])) {
    const t = inside(after, after.indexOf('(', after.toLowerCase().indexOf('returns'))).text;
    returns = { table: splitTop(t).map(parseColumn).filter(Boolean), setof: true };
  } else returns = { type: ret[2], setof: !!ret[1] };
  const key = args.map(a => a.type.toLowerCase()).join(',');
  const list = db[s].functions.get(n) ?? new Map();
  list.set(key, { args, returns });
  db[s].functions.set(n, list);
}

function drop(db, st) {
  const t = /^drop (table|view|materialized view|type|function) (?:if exists )?([^\s(;]+)(?:\s*\(([^)]*)\))?/i.exec(st);
  if (!t) return;
  for (const target of t[2].split(',')) {
    const [s, n] = qname(target.trim());
    if (!db[s]) continue;
    const kind = t[1].toLowerCase();
    if (kind === 'table') db[s].tables.delete(n);
    else if (kind.endsWith('view')) db[s].views.delete(n);
    else if (kind === 'type') db[s].enums.delete(n);
    else if (t[3] !== undefined) {
      const key = splitTop(t[3]).map(a => { const am = /^(?:(?:in|inout|variadic)\s+)?(?:"[^"]+"\s+|[a-z_][a-z0-9_]*\s+(?=[a-z]))?(.*)$/i.exec(a.trim()); const tm = TYPE_RE.exec(am ? am[1] : a); return (tm ? tm[1] + (tm[2] ?? '') : a).toLowerCase(); }).join(',');
      db[s].functions.get(n)?.delete(key);
      if (db[s].functions.get(n)?.size === 0) db[s].functions.delete(n);
    } else db[s].functions.delete(n);
  }
}

export async function readMigrations(appDir) {
  const dir = path.join(appDir, 'supabase/migrations');
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();
  return Promise.all(files.map(async f => ({ file: f, sql: await fs.readFile(path.join(dir, f), 'utf8') })));
}

/** Replay the migrations into tables, views, enums and functions per schema. */
export function replay(migrations) {
  const db = emptyDb();
  for (const { sql } of migrations) {
    for (const st of statements(sql)) {
      if (/^create (unlogged )?table /i.test(st)) createTable(db, st);
      else if (/^alter table /i.test(st)) alterTable(db, st);
      else if (/^create type .* as enum/i.test(st)) createEnum(db, st);
      else if (/^create (or replace )?(materialized )?view /i.test(st)) createView(db, st);
      else if (/^create (or replace )?function /i.test(st)) createFunction(db, st);
      else if (/^drop (table|view|materialized view|type|function) /i.test(st)) drop(db, st);
    }
  }
  return db;
}

// ── Writing the Database type ─────────────────────────────────────────────
const prop = (n) => (/^[a-z_$][a-z0-9_$]*$/i.test(n) ? n : JSON.stringify(n));
const sorted = (m) => [...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

function rowType(cols, db, schema, indent, mode) {
  const pad = ' '.repeat(indent);
  if (!cols.size) return '{ [_ in never]: never }';
  const lines = sorted(cols).map(([, c]) => {
    const t = tsType(c.type, db, c.schema ?? schema);
    if (mode === 'row') return `${pad}  ${prop(c.name)}: ${c.notNull ? t : `${t} | null`}`;
    if (c.generated) return `${pad}  ${prop(c.name)}?: never`;
    const opt = mode === 'update' || !c.notNull || c.hasDefault;
    return `${pad}  ${prop(c.name)}${opt ? '?' : ''}: ${c.notNull ? t : `${t} | null`}`;
  });
  return `{\n${lines.join('\n')}\n${pad}}`;
}

function returnsType(r, db, schema, indent) {
  if (r.table) {
    const cols = new Map(r.table.map(c => [c.name, { ...c, notNull: true }]));
    return `${rowType(cols, db, schema, indent, 'row')}[]`;
  }
  const t = r.type.toLowerCase();
  if (t === 'void') return 'undefined';
  if (t === 'record') return r.setof ? 'Record<string, unknown>[]' : 'Record<string, unknown>';
  const ts = tsType(r.type, db, schema);
  return r.setof ? (ts.includes('"') || ts === 'unknown' ? `(${ts})[]` : `${ts}[]`) : ts;
}

export function render(db) {
  const out = [];
  out.push('// Generated by scripts/build-db-types.mjs from app/supabase/migrations: do not edit.');
  out.push('// Run `npm run build:db-types` (in app/) after adding a migration; types-generated.test.ts');
  out.push('// fails while this file is stale. The same shape as `supabase gen types typescript`.');
  out.push('');
  out.push('export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];');
  out.push('');
  out.push('export type Database = {');
  for (const s of SCHEMAS) {
    const d = db[s];
    out.push(`  ${s}: {`);
    out.push('    Tables: {');
    for (const [n, cols] of sorted(d.tables)) {
      out.push(`      ${prop(n)}: {`);
      out.push(`        Row: ${rowType(cols, db, s, 8, 'row')};`);
      out.push(`        Insert: ${rowType(cols, db, s, 8, 'insert')};`);
      out.push(`        Update: ${rowType(cols, db, s, 8, 'update')};`);
      out.push('        Relationships: [];');
      out.push('      };');
    }
    out.push('    };');
    out.push('    Views: {');
    for (const [n, cols] of sorted(d.views)) {
      out.push(`      ${prop(n)}: {`);
      out.push(`        Row: ${rowType(cols, db, s, 8, 'row')};`);
      out.push('        Relationships: [];');
      out.push('      };');
    }
    out.push('    };');
    out.push('    Functions: {');
    for (const [n, overloads] of sorted(d.functions)) {
      const variants = sorted(overloads).map(([, f]) => {
        const args = f.args.length
          ? `{ ${f.args.map(a => `${prop(a.name)}${a.optional ? '?' : ''}: ${tsType(a.type, db, s)}`).join('; ')} }`
          : 'Record<PropertyKey, never>';
        return `{ Args: ${args}; Returns: ${returnsType(f.returns, db, s, 8)} }`;
      });
      out.push(`      ${prop(n)}: ${variants.join('\n        | ')};`);
    }
    out.push('    };');
    out.push('    Enums: {');
    for (const [n, values] of sorted(d.enums)) out.push(`      ${prop(n)}: ${values.map(v => JSON.stringify(v)).join(' | ') || 'never'};`);
    out.push('    };');
    out.push('    CompositeTypes: { [_ in never]: never };');
    out.push('  };');
  }
  out.push('};');
  out.push('');
  out.push('type Schema = keyof Database;');
  out.push('/** A table\'s row, e.g. Tables<\'record_doc\'> (schema civicos unless named). */');
  out.push('export type Tables<T extends keyof Database[S][\'Tables\'], S extends Schema = \'civicos\'> = Database[S][\'Tables\'][T] extends { Row: infer R } ? R : never;');
  out.push('export type TablesInsert<T extends keyof Database[S][\'Tables\'], S extends Schema = \'civicos\'> = Database[S][\'Tables\'][T] extends { Insert: infer R } ? R : never;');
  out.push('export type TablesUpdate<T extends keyof Database[S][\'Tables\'], S extends Schema = \'civicos\'> = Database[S][\'Tables\'][T] extends { Update: infer R } ? R : never;');
  out.push('export type Views<T extends keyof Database[S][\'Views\'], S extends Schema = \'public\'> = Database[S][\'Views\'][T] extends { Row: infer R } ? R : never;');
  out.push('export type Enums<T extends keyof Database[S][\'Enums\'], S extends Schema = \'civicos\'> = Database[S][\'Enums\'][T];');
  out.push('');
  return out.join('\n');
}

/** The generated file's text for an app directory. */
export async function generate(appDir) {
  return render(replay(await readMigrations(appDir)));
}
