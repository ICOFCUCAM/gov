// CQL2 filters for the twin's OGC API – Features collections (OGC API –
// Features Part 3 "Filtering", OGC 21-065 CQL2). A client sends
// `filter=<expression>` on /items, in CQL2-Text (`filter-lang=cql2-text`, the
// default) or CQL2-JSON (`filter-lang=cql2-json`), with coordinates in CRS84
// (`filter-crs`, the only one accepted). The expression may use only the
// collection's queryables (/collections/{id}/queryables) and `geometry`.
//
// Supported: comparison (= <> < <= > >=), logical (AND OR NOT), LIKE (% and _,
// backslash escapes), IN, BETWEEN, IS [NOT] NULL; spatial S_INTERSECTS,
// S_WITHIN, S_DISJOINT and S_CONTAINS with POINT, LINESTRING, POLYGON,
// MULTIPOINT, MULTILINESTRING, MULTIPOLYGON and BBOX literals; every temporal
// function (T_AFTER … T_STARTS, Allen's interval relations) with TIMESTAMP,
// DATE and INTERVAL literals ('..' for an open end). Comparisons with a
// missing value are unknown (three-valued logic): such features are left out.
// Errors are reasons a client can act on, answered with 400 by the routes.
//
// Text is parsed into the CQL2-JSON form, so both languages are checked and
// evaluated by the same code.

import { QUERYABLES } from './ogc-queryables';

export const CQL2_CONFORMANCE = [
  'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/filter',
  'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/features-filter',
  'http://www.opengis.net/spec/cql2/1.0/conf/cql2-text',
  'http://www.opengis.net/spec/cql2/1.0/conf/cql2-json',
  'http://www.opengis.net/spec/cql2/1.0/conf/basic-cql2',
  'http://www.opengis.net/spec/cql2/1.0/conf/advanced-comparison-operators',
  'http://www.opengis.net/spec/cql2/1.0/conf/basic-spatial-functions',
  'http://www.opengis.net/spec/cql2/1.0/conf/basic-spatial-functions-plus',
  'http://www.opengis.net/spec/cql2/1.0/conf/temporal-functions',
];
export const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

// ── The expression (CQL2-JSON form) ─────────────────────────────────────────

export type Geometry =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'MultiPoint'; coordinates: number[][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };
export type Operand =
  | string | number | boolean | null
  | { property: string }
  | { timestamp: string } | { date: string } | { interval: [Operand, Operand] }
  | { bbox: number[] }
  | Geometry;
export interface Op { op: string; args: (Cql2 | Operand | Operand[])[] }
export type Cql2 = Op | boolean;

const COMPARE = ['=', '<>', '<', '<=', '>', '>='];
const SPATIAL = ['s_intersects', 's_within', 's_disjoint', 's_contains'];
const TEMPORAL = ['t_after', 't_before', 't_contains', 't_disjoint', 't_during', 't_equals', 't_finishedby', 't_finishes', 't_intersects', 't_meets', 't_metby', 't_overlappedby', 't_overlaps', 't_startedby', 't_starts'];

export class Cql2Error extends Error {}
const fail = (msg: string): never => { throw new Cql2Error(msg); };

// ── CQL2-Text ───────────────────────────────────────────────────────────────

type Tok = { k: 'num'; v: number } | { k: 'str'; v: string } | { k: 'id'; v: string; quoted?: boolean } | { k: 'p'; v: string } | { k: 'end' };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'") {
      let s = ''; i++;
      for (;;) {
        if (i >= src.length) fail('A text value is not closed (missing \')');
        if (src[i] === "'") { if (src[i + 1] === "'") { s += "'"; i += 2; continue; } i++; break; }
        s += src[i++];
      }
      out.push({ k: 'str', v: s }); continue;
    }
    if (c === '"') {
      const j = src.indexOf('"', i + 1);
      if (j < 0) fail('A quoted property name is not closed (missing ")');
      out.push({ k: 'id', v: src.slice(i + 1, j), quoted: true }); i = j + 1; continue;
    }
    const num = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    // A sign always belongs to its number: CQL2 arithmetic is not supported, and WKT puts negative coordinates after others.
    if (num) {
      out.push({ k: 'num', v: Number(num[0]) }); i += num[0].length; continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '<>' || two === '<=' || two === '>=') { out.push({ k: 'p', v: two }); i += 2; continue; }
    if ('()=<>,'.includes(c)) { out.push({ k: 'p', v: c }); i++; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_.:]*/.exec(src.slice(i));
    if (id) { out.push({ k: 'id', v: id[0] }); i += id[0].length; continue; }
    fail(`Unexpected character "${c}" at position ${i + 1}`);
  }
  out.push({ k: 'end' });
  return out;
}

/** Parse a CQL2-Text expression into its CQL2-JSON form. */
export function parseCql2Text(src: string): Cql2 {
  if (src.length > 20_000) fail('The filter is too long (at most 20,000 characters)');
  const t = tokenize(src);
  let i = 0;
  const peek = () => t[i]!;
  const kw = (w: string, at = 0) => { const x = t[i + at]!; return x.k === 'id' && !x.quoted && x.v.toUpperCase() === w; };
  const eat = (v: string) => { const x = peek(); if (x.k === 'p' && x.v === v) { i++; return; } fail(`Expected "${v}" ${where()}`); };
  const where = () => { const x = peek(); return x.k === 'end' ? 'at the end of the filter' : `before "${'v' in x ? x.v : ''}"`; };
  let depth = 0;

  function orExpr(): Cql2 {
    if (++depth > 100) fail('The filter is nested too deeply');
    const args = [andExpr()];
    while (kw('OR')) { i++; args.push(andExpr()); }
    depth--;
    return args.length === 1 ? args[0]! : { op: 'or', args };
  }
  function andExpr(): Cql2 {
    const args = [notExpr()];
    while (kw('AND')) { i++; args.push(notExpr()); }
    return args.length === 1 ? args[0]! : { op: 'and', args };
  }
  function notExpr(): Cql2 {
    if (kw('NOT')) { i++; return { op: 'not', args: [notExpr()] }; }
    return primary();
  }
  function primary(): Cql2 {
    const x = peek();
    if (x.k === 'p' && x.v === '(') { i++; const e = orExpr(); eat(')'); return e; }
    if (x.k === 'id' && !x.quoted) {
      const u = x.v.toUpperCase();
      if ((SPATIAL.includes(u.toLowerCase()) || TEMPORAL.includes(u.toLowerCase())) && t[i + 1]?.k === 'p' && (t[i + 1] as { v: string }).v === '(') {
        i += 2;
        const a = operand(); eat(','); const b = operand(); eat(')');
        return { op: u.toLowerCase(), args: [a, b] };
      }
      if ((u === 'TRUE' || u === 'FALSE') && !(t[i + 1]?.k === 'p' && COMPARE.includes((t[i + 1] as { v: string }).v))) { i++; return u === 'TRUE'; }
    }
    const left = operand();
    const y = peek();
    if (y.k === 'p' && COMPARE.includes(y.v)) { i++; return { op: y.v, args: [left, operand()] }; }
    let negate = false;
    if (kw('NOT') && (kw('LIKE', 1) || kw('BETWEEN', 1) || kw('IN', 1))) { negate = true; i++; }
    const wrap = (e: Op): Cql2 => (negate ? { op: 'not', args: [e] } : e);
    if (kw('LIKE')) { i++; return wrap({ op: 'like', args: [left, operand()] }); }
    if (kw('BETWEEN')) { i++; const lo = operand(); if (!kw('AND')) fail(`Expected AND in BETWEEN ${where()}`); i++; return wrap({ op: 'between', args: [left, lo, operand()] }); }
    if (kw('IN')) {
      i++; eat('(');
      const list = [operand()];
      while (peek().k === 'p' && (peek() as { v: string }).v === ',') { i++; list.push(operand()); }
      eat(')');
      return wrap({ op: 'in', args: [left, list] });
    }
    if (kw('IS')) {
      i++;
      const not = kw('NOT'); if (not) i++;
      if (!kw('NULL')) fail(`Expected NULL after IS ${where()}`);
      i++;
      const e: Op = { op: 'isNull', args: [left] };
      return not ? { op: 'not', args: [e] } : e;
    }
    return fail(`Expected a comparison, LIKE, BETWEEN, IN or IS NULL ${where()}`);
  }
  function numbers(): number[] {
    const out: number[] = [];
    for (;;) { const x = peek(); if (x.k !== 'num') break; out.push(x.v); i++; }
    if (out.length < 2) fail(`A position needs at least two numbers (longitude latitude) ${where()}`);
    return out;
  }
  const list = <T,>(item: () => T): T[] => {
    eat('(');
    const out = [item()];
    while (peek().k === 'p' && (peek() as { v: string }).v === ',') { i++; out.push(item()); }
    eat(')');
    return out;
  };
  const point = () => numbers();
  const ring = () => list(point);
  const pointInMulti = () => { if (peek().k === 'p' && (peek() as { v: string }).v === '(') { eat('('); const p = numbers(); eat(')'); return p; } return numbers(); };
  function operand(): Operand {
    const x = peek();
    if (x.k === 'num') { i++; return x.v; }
    if (x.k === 'str') { i++; return x.v; }
    if (x.k === 'id' && x.quoted) { i++; return { property: x.v }; }
    if (x.k === 'id') {
      const u = x.v.toUpperCase();
      const call = t[i + 1]?.k === 'p' && (t[i + 1] as { v: string }).v === '(';
      if (u === 'TRUE' || u === 'FALSE') { i++; return u === 'TRUE'; }
      if (u === 'NULL') { i++; return null; }
      if (call) {
        i++;
        switch (u) {
          case 'TIMESTAMP': case 'DATE': {
            eat('('); const s = peek(); if (s.k !== 'str') fail(`${u} takes a quoted value`); i++; eat(')');
            return u === 'DATE' ? { date: (s as { v: string }).v } : { timestamp: (s as { v: string }).v };
          }
          case 'INTERVAL': {
            eat('('); const a = operand(); eat(','); const b = operand(); eat(')');
            return { interval: [a, b] };
          }
          case 'BBOX': { const n = list(() => { const v = peek(); if (v.k !== 'num') fail('BBOX takes numbers'); i++; return (v as { v: number }).v; }); return { bbox: n }; }
          case 'POINT': { eat('('); const p = numbers(); eat(')'); return { type: 'Point', coordinates: p }; }
          case 'LINESTRING': return { type: 'LineString', coordinates: list(point) };
          case 'POLYGON': return { type: 'Polygon', coordinates: list(ring) };
          case 'MULTIPOINT': return { type: 'MultiPoint', coordinates: list(pointInMulti) };
          case 'MULTILINESTRING': return { type: 'MultiLineString', coordinates: list(ring) };
          case 'MULTIPOLYGON': return { type: 'MultiPolygon', coordinates: list(() => list(ring)) };
          default: return fail(`Unknown function ${x.v}() (functions other than the CQL2 literals are not supported)`);
        }
      }
      i++;
      return { property: x.v };
    }
    if (x.k === 'p' && x.v === '(') fail('Arithmetic and nested values are not supported here');
    return fail(`Expected a value or property ${where()}`);
  }

  const e = orExpr();
  if (peek().k !== 'end') fail(`Unexpected text ${where()}`);
  return e;
}

// ── Checking against the collection's queryables ───────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isProp = (v: unknown): v is { property: string } => isObj(v) && typeof v.property === 'string';
const GEOM_TYPES = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
const isGeom = (v: unknown): v is Geometry => isObj(v) && GEOM_TYPES.includes(v.type as string) && Array.isArray(v.coordinates);
const isBbox = (v: unknown): v is { bbox: number[] } => isObj(v) && Array.isArray(v.bbox);
const isTemporal = (v: unknown) => isObj(v) && ('timestamp' in v || 'date' in v || 'interval' in v);

/** Check an expression's shape, properties and literals for one collection; throws Cql2Error with the reason. */
export function checkCql2(e: unknown, collectionId: string): Cql2 {
  const q = QUERYABLES[collectionId] ?? {};
  const known = ['geometry', ...Object.keys(q)];
  const prop = (p: { property: string }) => {
    if (!known.includes(p.property)) fail(`"${p.property}" is not a queryable of ${collectionId}. Queryables: ${known.join(', ')} (/collections/${collectionId}/queryables)`);
    return p.property;
  };
  const kind = (o: unknown): 'string' | 'number' | 'boolean' | 'temporal' | 'geometry' | 'null' | 'any' => {
    if (isProp(o)) {
      const name = prop(o);
      if (name === 'geometry') return 'geometry';
      const d = q[name]!;
      if (d.format === 'date-time' || d.format === 'date') return 'temporal';
      return d.type === 'integer' || d.type === 'number' ? 'number' : 'string';
    }
    if (o === null) return 'null';
    if (typeof o === 'string') return 'string';
    if (typeof o === 'number') { if (!Number.isFinite(o)) fail('Numbers must be finite'); return 'number'; }
    if (typeof o === 'boolean') return 'boolean';
    if (isTemporal(o)) { temporalLiteral(o); return 'temporal'; }
    if (isGeom(o) || isBbox(o)) { geometryOf(o); return 'geometry'; }
    return fail(`Not a CQL2 value: ${JSON.stringify(o).slice(0, 80)}`);
  };
  const scalar = (o: unknown, op: string) => {
    const k = kind(o);
    if (k === 'geometry') fail(`${op} compares values, not geometries (use S_INTERSECTS or S_WITHIN)`);
    return k;
  };
  const sameKind = (a: string, b: string, op: string) => {
    if (a === 'any' || b === 'any' || a === 'null' || b === 'null' || a === b) return;
    // Text queryables compared with a timestamp are read as instants.
    if ((a === 'temporal' && b === 'string') || (a === 'string' && b === 'temporal')) return;
    fail(`${op} compares a ${a} with a ${b}`);
  };
  const walk = (x: unknown): Cql2 => {
    if (typeof x === 'boolean') return x;
    if (!isObj(x) || typeof x.op !== 'string' || !Array.isArray(x.args)) return fail('Each part of a CQL2-JSON filter is { "op": …, "args": [ … ] }');
    const op = x.op.toLowerCase();
    const a = x.args as unknown[];
    const n = (k: number) => { if (a.length !== k) fail(`${x.op} takes ${k} argument${k === 1 ? '' : 's'}`); };
    if (op === 'and' || op === 'or') { if (a.length < 2) fail(`${op.toUpperCase()} takes at least two arguments`); return { op, args: a.map(walk) }; }
    if (op === 'not') { n(1); return { op, args: [walk(a[0])] }; }
    if (COMPARE.includes(op)) { n(2); sameKind(scalar(a[0], op), scalar(a[1], op), op); return { op, args: a as Operand[] }; }
    if (op === 'like') {
      n(2); const k = scalar(a[0], 'LIKE');
      if (k !== 'string') fail('LIKE applies to text');
      if (typeof a[1] !== 'string') fail('LIKE takes a quoted pattern');
      return { op, args: a as Operand[] };
    }
    if (op === 'between') { n(3); const k = scalar(a[0], 'BETWEEN'); sameKind(k, scalar(a[1], 'BETWEEN'), 'BETWEEN'); sameKind(k, scalar(a[2], 'BETWEEN'), 'BETWEEN'); return { op, args: a as Operand[] }; }
    if (op === 'in') {
      n(2); const k = scalar(a[0], 'IN');
      if (!Array.isArray(a[1]) || !a[1].length) fail('IN takes a list of values');
      for (const v of a[1] as unknown[]) sameKind(k, scalar(v, 'IN'), 'IN');
      return { op, args: [a[0] as Operand, a[1] as Operand[]] };
    }
    if (op === 'isnull') { n(1); kind(a[0]); return { op: 'isNull', args: a as Operand[] }; }
    if (SPATIAL.includes(op)) {
      n(2);
      for (const v of a) if (kind(v) !== 'geometry') fail(`${op.toUpperCase()} takes geometries (the property "geometry" or a POINT, LINESTRING, POLYGON or BBOX)`);
      return { op, args: a as Operand[] };
    }
    if (TEMPORAL.includes(op)) {
      n(2);
      for (const v of a) { const k = kind(v); if (k !== 'temporal' && k !== 'string') fail(`${op.toUpperCase()} takes instants or intervals (a date-time queryable, TIMESTAMP, DATE or INTERVAL)`); }
      return { op, args: a as Operand[] };
    }
    return fail(`Unknown operator "${x.op}"`);
  };
  return walk(e);
}

// ── Parameters of an /items request ────────────────────────────────────────

export interface ParsedFilter { expr: Cql2; qs: string }

/**
 * The `filter`, `filter-lang` and `filter-crs` parameters of an items
 * request: undefined without a filter, the checked expression, or a reason.
 */
export function readCql2(collectionId: string, filter: string | null, lang: string | null, crs: string | null): ParsedFilter | { error: string } | undefined {
  if (!filter) {
    if (lang || crs) return { error: 'filter-lang and filter-crs apply only with filter' };
    return undefined;
  }
  const language = (lang ?? 'cql2-text').toLowerCase();
  if (language !== 'cql2-text' && language !== 'cql2-json') return { error: 'filter-lang must be cql2-text or cql2-json' };
  if (crs && crs !== CRS84) return { error: `filter-crs must be ${CRS84} (longitude, latitude)` };
  try {
    let raw: unknown;
    if (language === 'cql2-json') {
      try { raw = JSON.parse(filter); } catch { return { error: 'filter is not valid JSON (filter-lang=cql2-json)' }; }
    } else raw = parseCql2Text(filter);
    const expr = checkCql2(raw, collectionId);
    const qs = `&filter=${encodeURIComponent(filter)}${lang ? `&filter-lang=${encodeURIComponent(lang)}` : ''}${crs ? `&filter-crs=${encodeURIComponent(crs)}` : ''}`;
    return { expr, qs };
  } catch (e) {
    if (e instanceof Cql2Error) return { error: `Invalid filter: ${e.message}` };
    throw e;
  }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

/** What a filter reads from a feature. */
export interface Subject { properties: Record<string, unknown>; geometry: unknown }

type V = string | number | boolean | null | undefined;

function temporalLiteral(o: unknown): [number, number] {
  if (!isObj(o)) return fail('Not a time');
  const instant = (s: unknown, end: boolean): number => {
    if (s === '..' ) return end ? Infinity : -Infinity;
    if (isObj(s) && ('timestamp' in s || 'date' in s)) return temporalLiteral(s)[end ? 1 : 0];
    if (typeof s !== 'string') return fail('A time must be a quoted date or timestamp');
    const t = Date.parse(s);
    if (!Number.isFinite(t)) fail(`"${s}" is not an RFC 3339 date or timestamp`);
    // A date is the whole day.
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && end ? t + 86_400_000 - 1 : t;
  };
  if ('timestamp' in o) { const t = instant(o.timestamp, false); return [t, t]; }
  if ('date' in o) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date))) fail('DATE takes YYYY-MM-DD'); return [instant(o.date, false), instant(o.date, true)]; }
  if ('interval' in o && Array.isArray(o.interval) && o.interval.length === 2) {
    const r: [number, number] = [instant(o.interval[0], false), instant(o.interval[1], true)];
    if (r[0] > r[1]) fail('An interval must not end before it starts');
    return r;
  }
  return fail('Not a time');
}

/** A value's time span: a date-time property, or a temporal literal. */
function spanOf(v: unknown): [number, number] | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (!Number.isFinite(t)) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? [t, t + 86_400_000 - 1] : [t, t];
  }
  if (isTemporal(v)) return temporalLiteral(v);
  return null;
}

function temporal(op: string, a: [number, number], b: [number, number]): boolean {
  const [s1, e1] = a, [s2, e2] = b;
  switch (op) {
    case 't_after': return s1 > e2;
    case 't_before': return e1 < s2;
    case 't_contains': return s1 < s2 && e1 > e2;
    case 't_disjoint': return !(s1 <= e2 && e1 >= s2);
    case 't_during': return s1 > s2 && e1 < e2;
    case 't_equals': return s1 === s2 && e1 === e2;
    case 't_finishedby': return s1 < s2 && e1 === e2;
    case 't_finishes': return s1 > s2 && e1 === e2;
    case 't_intersects': return s1 <= e2 && e1 >= s2;
    case 't_meets': return e1 === s2;
    case 't_metby': return s1 === e2;
    case 't_overlappedby': return s1 > s2 && s1 < e2 && e1 > e2;
    case 't_overlaps': return s1 < s2 && e1 > s2 && e1 < e2;
    case 't_startedby': return s1 === s2 && e1 > e2;
    case 't_starts': return s1 === s2 && e1 < e2;
    default: return false;
  }
}

function likeRe(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '\\' && i + 1 < pattern.length) { re += pattern[++i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); continue; }
    re += c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 's');
}

/** Evaluate a checked expression for one feature: true, false or null (unknown). */
export function evaluateCql2(e: Cql2, f: Subject): boolean | null {
  if (typeof e === 'boolean') return e;
  const val = (o: unknown): V | unknown => (isProp(o) ? (o.property === 'geometry' ? f.geometry : f.properties[o.property]) : o);
  const a = e.args;
  switch (e.op) {
    case 'and': { let unknown = false; for (const x of a) { const r = evaluateCql2(x as Cql2, f); if (r === false) return false; if (r === null) unknown = true; } return unknown ? null : true; }
    case 'or': { let unknown = false; for (const x of a) { const r = evaluateCql2(x as Cql2, f); if (r === true) return true; if (r === null) unknown = true; } return unknown ? null : false; }
    case 'not': { const r = evaluateCql2(a[0] as Cql2, f); return r === null ? null : !r; }
    case 'isNull': { const v = val(a[0]); return v === null || v === undefined; }
    case 'like': { const v = val(a[0]); return v == null ? null : likeRe(String(a[1])).test(String(v)); }
    case 'in': { const v = val(a[0]); if (v == null) return null; return (a[1] as Operand[]).some(x => compare('=', v, val(x)) === true); }
    case 'between': {
      const v = val(a[0]);
      const lo = compare('>=', v, val(a[1])), hi = compare('<=', v, val(a[2]));
      return lo === null || hi === null ? null : lo && hi;
    }
    default:
      if (COMPARE.includes(e.op)) return compare(e.op, val(a[0]), val(a[1]));
      if (SPATIAL.includes(e.op)) {
        const g1 = val(a[0]), g2 = val(a[1]);
        if (g1 == null || g2 == null) return null;
        let A: Parts, B: Parts;
        try { A = geometryOf(g1); B = geometryOf(g2); } catch { return null; }
        switch (e.op) {
          case 's_intersects': return intersectsGeom(A, B);
          case 's_disjoint': return !intersectsGeom(A, B);
          case 's_within': return withinGeom(A, B);
          case 's_contains': return withinGeom(B, A);
        }
      }
      if (TEMPORAL.includes(e.op)) {
        const s1 = spanOf(val(a[0])), s2 = spanOf(val(a[1]));
        return s1 && s2 ? temporal(e.op, s1, s2) : null;
      }
      return null;
  }
}

function compare(op: string, x: unknown, y: unknown): boolean | null {
  if (x == null || y == null) return null;
  let l: string | number | boolean, r: string | number | boolean;
  if (isTemporal(x) || isTemporal(y)) {
    const a = spanOf(x), b = spanOf(y);
    if (!a || !b) return null;
    l = a[0]; r = b[0];
  } else if (typeof x === 'number' || typeof y === 'number') {
    l = Number(x); r = Number(y);
    if (!Number.isFinite(l) || !Number.isFinite(r)) return null;
  } else { l = x as string | boolean; r = y as string | boolean; }
  switch (op) {
    case '=': return l === r;
    case '<>': return l !== r;
    case '<': return l < r;
    case '<=': return l <= r;
    case '>': return l > r;
    case '>=': return l >= r;
  }
  return null;
}

// ── Geometry (planar, in longitude/latitude) ───────────────────────────────

type Pt = [number, number];
interface Parts { points: Pt[]; lines: Pt[][]; polygons: Pt[][][]; box: [number, number, number, number] }

const parsedGeometry = new WeakMap<object, Parts>();
/** A geometry's parts, kept per object (a filter's literal is read once, not per feature). */
function geometryOf(g: unknown): Parts {
  if (!isObj(g)) return fail('Not a geometry');
  const seen = parsedGeometry.get(g);
  if (seen) return seen;
  const parts = readGeometry(g);
  parsedGeometry.set(g, parts);
  return parts;
}

function readGeometry(g: unknown): Parts {
  const parts: Parts = { points: [], lines: [], polygons: [], box: [Infinity, Infinity, -Infinity, -Infinity] };
  const pos = (c: unknown): Pt => {
    if (!Array.isArray(c) || c.length < 2 || !c.slice(0, 2).every(n => typeof n === 'number' && Number.isFinite(n))) fail('A position is [longitude, latitude]');
    const p: Pt = [(c as number[])[0]!, (c as number[])[1]!];
    if (p[0] < -180 || p[0] > 180 || p[1] < -90 || p[1] > 90) fail('Positions are longitude -180…180 and latitude -90…90 (CRS84)');
    parts.box = [Math.min(parts.box[0], p[0]), Math.min(parts.box[1], p[1]), Math.max(parts.box[2], p[0]), Math.max(parts.box[3], p[1])];
    return p;
  };
  const ring = (r: unknown): Pt[] => {
    if (!Array.isArray(r) || r.length < 4) fail('A polygon ring needs at least four positions (closed)');
    const pts = (r as unknown[]).map(pos);
    const [f, l] = [pts[0]!, pts[pts.length - 1]!];
    if (f[0] !== l[0] || f[1] !== l[1]) fail('A polygon ring must end where it starts');
    return pts;
  };
  const line = (l: unknown): Pt[] => { if (!Array.isArray(l) || l.length < 2) fail('A line needs at least two positions'); return (l as unknown[]).map(pos); };
  const poly = (p: unknown): Pt[][] => { if (!Array.isArray(p) || !p.length) fail('A polygon needs an outer ring'); return (p as unknown[]).map(ring); };
  if (isBbox(g)) {
    const b = g.bbox;
    if (!(b.length === 4 || b.length === 6) || !b.every(n => typeof n === 'number' && Number.isFinite(n))) fail('BBOX takes minLon, minLat, maxLon, maxLat');
    const [x1, y1, x2, y2] = b.length === 6 ? [b[0]!, b[1]!, b[3]!, b[4]!] : (b as [number, number, number, number]);
    if (x1 > x2 || y1 > y2) fail('BBOX takes minLon, minLat, maxLon, maxLat (minimum first)');
    parts.polygons.push([[pos([x1, y1]), pos([x2, y1]), pos([x2, y2]), pos([x1, y2]), pos([x1, y1])]]);
    return parts;
  }
  if (!isObj(g)) return fail('Not a geometry');
  const c = g.coordinates;
  switch (g.type) {
    case 'Point': parts.points.push(pos(c)); break;
    case 'MultiPoint': if (!Array.isArray(c)) fail('Not a geometry'); (c as unknown[]).forEach(p => parts.points.push(pos(p))); break;
    case 'LineString': parts.lines.push(line(c)); break;
    case 'MultiLineString': if (!Array.isArray(c)) fail('Not a geometry'); (c as unknown[]).forEach(l => parts.lines.push(line(l))); break;
    case 'Polygon': parts.polygons.push(poly(c)); break;
    case 'MultiPolygon': if (!Array.isArray(c)) fail('Not a geometry'); (c as unknown[]).forEach(p => parts.polygons.push(poly(p))); break;
    default: fail(`Geometry type ${String(g.type)} is not supported`);
  }
  return parts;
}

const boxesMeet = (a: Parts['box'], b: Parts['box']) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const orient = (a: Pt, b: Pt, c: Pt) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
const onSeg = (a: Pt, b: Pt, p: Pt) => orient(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
function segsMeet(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const o1 = orient(p1, p2, q1), o2 = orient(p1, p2, q2), o3 = orient(q1, q2, p1), o4 = orient(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  return onSeg(p1, p2, q1) || onSeg(p1, p2, q2) || onSeg(q1, q2, p1) || onSeg(q1, q2, p2);
}
/** Segments that cross at a point inside both (not touching at ends or along a side). */
function segsCross(p1: Pt, p2: Pt, q1: Pt, q2: Pt): boolean {
  const o1 = orient(p1, p2, q1), o2 = orient(p1, p2, q2), o3 = orient(q1, q2, p1), o4 = orient(q1, q2, p2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}
const edges = (pts: Pt[]): [Pt, Pt][] => pts.slice(1).map((p, i) => [pts[i]!, p]);
const ringsOf = (parts: Parts) => parts.polygons.flat();
const allEdges = (parts: Parts) => [...parts.lines.flatMap(edges), ...ringsOf(parts).flatMap(edges)];

function inRing(p: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** In the polygon (outer ring, outside its holes), counting its boundary as in. */
function inPolygon(p: Pt, poly: Pt[][]): boolean {
  if (poly.some(r => edges(r).some(([a, b]) => onSeg(a, b, p)))) return true;
  if (!inRing(p, poly[0]!)) return false;
  return !poly.slice(1).some(h => inRing(p, h));
}
const inAnyPolygon = (p: Pt, parts: Parts) => parts.polygons.some(poly => inPolygon(p, poly));
const onAnyLine = (p: Pt, parts: Parts) => parts.lines.some(l => edges(l).some(([a, b]) => onSeg(a, b, p)));
const vertices = (parts: Parts): Pt[] => [...parts.points, ...parts.lines.flat(), ...ringsOf(parts).flat()];

export function intersectsGeom(A: Parts, B: Parts): boolean {
  if (!boxesMeet(A.box, B.box)) return false;
  for (const p of A.points) if (B.points.some(q => q[0] === p[0] && q[1] === p[1]) || inAnyPolygon(p, B) || onAnyLine(p, B)) return true;
  for (const p of B.points) if (inAnyPolygon(p, A) || onAnyLine(p, A)) return true;
  // One shape's vertex inside the other's polygon, or edges that meet.
  if (A.polygons.length && [...B.lines.flat(), ...ringsOf(B).flat()].some(p => inAnyPolygon(p, A))) return true;
  if (B.polygons.length && [...A.lines.flat(), ...ringsOf(A).flat()].some(p => inAnyPolygon(p, B))) return true;
  const eb = allEdges(B);
  return allEdges(A).some(([a, b]) => eb.some(([c, d]) => segsMeet(a, b, c, d)));
}

/** Every part of A lies in B (its boundary included); approximate for lines and polygons: vertices inside and no edge crossing B's. */
export function withinGeom(A: Parts, B: Parts): boolean {
  if (!(A.box[0] >= B.box[0] && A.box[1] >= B.box[1] && A.box[2] <= B.box[2] && A.box[3] <= B.box[3])) return false;
  const vs = vertices(A);
  if (!vs.length) return false;
  if (!B.polygons.length) {
    // Within points or lines: every vertex on them (points within points, points on lines).
    return vs.every(p => B.points.some(q => q[0] === p[0] && q[1] === p[1]) || onAnyLine(p, B)) && !A.polygons.length;
  }
  if (!vs.every(p => inAnyPolygon(p, B))) return false;
  const eb = ringsOf(B).flatMap(edges);
  return !allEdges(A).some(([a, b]) => eb.some(([c, d]) => segsCross(a, b, c, d)));
}

/** Keep the features a parsed filter accepts (unknown counts as no). */
export const cql2Matches = (f: ParsedFilter | undefined, s: Subject): boolean => !f || evaluateCql2(f.expr, s) === true;
