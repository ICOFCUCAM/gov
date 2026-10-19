// Boundary files as the mapping authority has them (server only): GeoJSON,
// TopoJSON, a zipped Shapefile (.shp + .dbf, with .prj and .cpg when present)
// or a GeoPackage (.gpkg, its first feature table). Everything is read here in
// plain JavaScript (fflate for the zip, sql.js for the GeoPackage's SQLite,
// proj4 for coordinate systems); nothing is sent anywhere.
//
// Coordinates come out as longitude/latitude (WGS 84). A file in another
// system is reprojected when its definition can be read (the .prj's WKT, or
// the GeoPackage's spatial reference: UTM zones, national grids, other
// datums), and refused, naming the system, when it cannot. Names are decoded
// with the Shapefile's .cpg encoding (UTF-8, Latin-1, Windows code pages);
// without one, UTF-8, falling back to Windows-1252.
//
// Used by lib/data/boundaries.ts; the checks themselves stay there.

import { feature as topoFeature } from 'topojson-client';
import { unzipSync } from 'fflate';
import proj4 from 'proj4';

export type BoundaryFormat = 'geojson' | 'topojson' | 'shapefile-zip' | 'geopackage';
export const BOUNDARY_FORMATS: BoundaryFormat[] = ['geojson', 'topojson', 'shapefile-zip', 'geopackage'];

export type Feature = { type: 'Feature'; properties?: Record<string, unknown> | null; geometry?: { type: string; coordinates?: unknown } | null; id?: unknown };

export interface ReadResult {
  format: BoundaryFormat;
  features: Feature[];
  /** What was done to read the file (reprojection, encoding, layer chosen). */
  notes: string[];
  /** The coordinate system the file was in, as it names it. */
  crs?: string;
  /** Set when the coordinates were reprojected to longitude/latitude. */
  reprojectedFrom?: string;
}

/** Uncompressed size a zipped Shapefile may expand to. */
export const MAX_UNZIPPED_BYTES = 400_000_000;
const MAX_FEATURES = 20_000;

const isZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6);
const isSqlite = (b: Uint8Array) => b.length > 16 && new TextDecoder().decode(b.subarray(0, 15)) === 'SQLite format 3';
const isShp = (b: Uint8Array) => b.length > 100 && b[0] === 0 && b[1] === 0 && b[2] === 0x27 && b[3] === 0x0a;

/** The format of an uploaded file, from its first bytes (the name only breaks ties for JSON). */
export function detectFormat(bytes: Uint8Array, name = ''): BoundaryFormat | 'shp' | 'unknown' {
  if (isZip(bytes)) return 'shapefile-zip';
  if (isSqlite(bytes)) return 'geopackage';
  if (isShp(bytes)) return 'shp';
  const head = new TextDecoder().decode(bytes.subarray(0, 4000)).replace(/^﻿/, '').trimStart();
  if (head.startsWith('{')) return /"type"\s*:\s*"Topology"/.test(head) || /\.topojson$/i.test(name) ? 'topojson' : 'geojson';
  return 'unknown';
}

/** Read a boundary file of any accepted format into longitude/latitude features, or say why not. */
export async function readBoundaryFile(input: { bytes?: Uint8Array; text?: string; name?: string; format?: BoundaryFormat }): Promise<ReadResult | { error: string }> {
  const bytes = input.bytes ?? new TextEncoder().encode(input.text ?? '');
  const detected = input.format ?? detectFormat(bytes, input.name);
  if (detected === 'shp') return { error: 'A .shp file on its own has no names: zip it with its .dbf, .prj and .cpg and load the .zip' };
  if (detected === 'unknown') return { error: 'Not a boundary file: load GeoJSON, TopoJSON, a zipped Shapefile (.zip) or a GeoPackage (.gpkg)' };
  if (detected === 'shapefile-zip') return isZip(bytes) ? readShapefileZip(bytes) : { error: 'Not a zip file: a Shapefile is loaded as a .zip holding its .shp, .dbf, .prj and .cpg' };
  if (detected === 'geopackage') return isSqlite(bytes) ? readGeoPackage(bytes) : { error: 'Not a GeoPackage (SQLite) file' };
  const text = input.text ?? new TextDecoder().decode(bytes);
  return readJson(text.replace(/^﻿/, ''), detected);
}

// ── GeoJSON / TopoJSON ──────────────────────────────────────────────────────

function readJson(text: string, format: 'geojson' | 'topojson'): ReadResult | { error: string } {
  let j: unknown;
  try { j = JSON.parse(text); } catch { return { error: 'The file is not valid JSON' }; }
  const o = j as { type?: string; features?: Feature[]; objects?: Record<string, unknown>; crs?: { properties?: { name?: string } } };
  const crs = o.crs?.properties?.name;
  if (crs && !/CRS84|EPSG:?:?4326/i.test(crs)) return { error: `The file is in ${crs}: convert it to longitude/latitude (WGS 84, EPSG:4326) first` };
  if (format === 'topojson' || o.type === 'Topology') {
    if (o.type !== 'Topology' || !o.objects) return { error: 'Not a TopoJSON topology' };
    const name = Object.keys(o.objects)[0];
    if (!name) return { error: 'The topology holds no objects' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = topoFeature(o as any, o.objects[name] as any) as unknown as { features?: Feature[] } & Feature;
    return { format: 'topojson', features: fc.features ?? [fc], notes: [] };
  }
  if (o.type === 'FeatureCollection' && Array.isArray(o.features)) return { format: 'geojson', features: o.features, notes: [] };
  if (o.type === 'Feature') return { format: 'geojson', features: [o as unknown as Feature], notes: [] };
  return { error: 'Expected a GeoJSON FeatureCollection' };
}

// ── Coordinate systems ──────────────────────────────────────────────────────

type Xy = [number, number];
interface Crs { name: string; toLonLat?: (p: Xy) => Xy }

/** The name a WKT gives its coordinate system (its first quoted string). */
export const wktName = (wkt: string) => /"([^"]*)"/.exec(wkt)?.[1]?.trim() || wkt.slice(0, 60).trim();

/** A coordinate system from its WKT (.prj or GeoPackage definition): longitude/latitude WGS 84 as it is, anything else through proj4, or refused naming it. */
export function crsFromWkt(wkt: string): Crs | { error: string } {
  const w = wkt.replace(/^﻿/, '').trim();
  const name = wktName(w);
  const geographic = /^(GEOGCS|GEOGCRS|GEOGRAPHICCRS|GEODCRS|GEODETICCRS)\s*\[/i.test(w);
  const datum = /DATUM\s*\[\s*"([^"]*)"/i.exec(w)?.[1] ?? '';
  if (geographic && /WGS[\s_]*(19)?84|World Geodetic System 1984/i.test(datum || name)) return { name };
  try {
    const t = proj4(w, 'WGS84');
    const probe = t.forward([0, 0]);
    if (!Array.isArray(probe)) throw new Error('no transform');
    return { name, toLonLat: p => t.forward(p) as Xy };
  } catch {
    return { error: `The file is in "${name}", a coordinate system that cannot be read here: convert it to longitude/latitude (WGS 84, EPSG:4326) first` };
  }
}

/** A coordinate system named by an EPSG code (GeoPackage spatial references without a usable definition). */
function crsFromEpsg(code: number): Crs | null {
  if (code === 4326 || code === 4979 || code === 4030) return { name: `EPSG:${code}` };
  const utm = /^32([67])(\d\d)$/.exec(String(code));
  if (utm && Number(utm[2]) >= 1 && Number(utm[2]) <= 60) {
    const t = proj4(`+proj=utm +zone=${Number(utm[2])}${utm[1] === '7' ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`, 'WGS84');
    return { name: `WGS 84 / UTM zone ${Number(utm[2])}${utm[1] === '7' ? 'S' : 'N'} (EPSG:${code})`, toLonLat: p => t.forward(p) as Xy };
  }
  for (const k of [`EPSG:${code}`]) {
    try { const t = proj4(k, 'WGS84'); return { name: k, toLonLat: p => t.forward(p) as Xy }; } catch { /* not known */ }
  }
  return null;
}

function reproject(features: Feature[], crs: Crs): string | null {
  if (!crs.toLonLat) return null;
  const f = crs.toLonLat;
  const conv = (c: unknown): unknown => {
    if (!Array.isArray(c)) return c;
    if (typeof c[0] === 'number') { const [x, y] = f([Number(c[0]), Number(c[1])]); return [Math.round(x * 1e7) / 1e7, Math.round(y * 1e7) / 1e7]; }
    return c.map(conv);
  };
  for (const ft of features) if (ft.geometry?.coordinates) ft.geometry.coordinates = conv(ft.geometry.coordinates);
  const bad = features.find(ft => JSON.stringify(ft.geometry?.coordinates ?? []).match(/null|NaN/));
  return bad ? `Reprojecting from "${crs.name}" gave coordinates that are not numbers: check the .prj matches the file` : null;
}

// ── Shapefile ───────────────────────────────────────────────────────────────

const ENCODINGS: Record<string, string> = { '88591': 'iso-8859-1', '88592': 'iso-8859-2', '88595': 'iso-8859-5', '88597': 'iso-8859-7', '88599': 'iso-8859-9', 'UTF8': 'utf-8', 'ANSI': 'windows-1252', 'LATIN1': 'iso-8859-1' };

/** A decoder for a .cpg label, or null when the label is not an encoding. */
function cpgDecoder(label: string): { dec: TextDecoder; name: string } | null {
  const raw = label.trim();
  const k = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const candidates = [ENCODINGS[k], /^\d{3,4}$/.test(k) ? `windows-${k}` : '', /^CP\d+$/.test(k) ? `windows-${k.slice(2)}` : '', raw].filter(Boolean) as string[];
  for (const c of candidates) { try { const dec = new TextDecoder(c); return { dec, name: dec.encoding }; } catch { /* next */ } }
  return null;
}

/** Signed planar area of a ring (negative when clockwise, a Shapefile's outer ring). */
function ringArea(r: Xy[]): number { let s = 0; for (let i = 0, n = r.length; i < n; i++) { const a = r[i]!, b = r[(i + 1) % n]!; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function inRing(p: Xy, r: Xy[]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i]!, [xj, yj] = r[j]!;
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Group a Shapefile polygon's rings: clockwise rings are outer rings, the others holes in the outer ring around them. */
function groupRings(rings: Xy[][]): { type: string; coordinates: unknown } {
  const outer: { ring: Xy[]; holes: Xy[][]; area: number }[] = [];
  const holes: Xy[][] = [];
  for (const r of rings) (ringArea(r) <= 0 ? outer.push({ ring: r, holes: [], area: Math.abs(ringArea(r)) }) : holes.push(r));
  for (const h of holes) {
    const host = outer.filter(o => inRing(h[0]!, o.ring) || inRing(h[Math.floor(h.length / 2)]!, o.ring)).sort((a, b) => a.area - b.area)[0];
    if (host) host.holes.push(h);
    else outer.push({ ring: h, holes: [], area: Math.abs(ringArea(h)) }); // wound the wrong way: an outer ring after all
  }
  const polys = outer.map(o => [o.ring, ...o.holes]);
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

/** The geometries of a .shp (polygons; null shapes as null). */
export function readShp(buf: Uint8Array): ({ type: string; coordinates: unknown } | null)[] | { error: string } {
  if (!isShp(buf)) return { error: 'The .shp file is not a Shapefile' };
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const type = v.getInt32(32, true);
  if (![0, 5, 15, 25].includes(type)) return { error: `The Shapefile holds ${({ 1: 'points', 3: 'lines', 8: 'multipoints', 11: 'points', 13: 'lines', 21: 'points', 23: 'lines', 31: 'multipatches' } as Record<number, string>)[type] ?? `shape type ${type}`}: boundaries must be polygons` };
  const end = Math.min(buf.byteLength, v.getInt32(24, false) * 2);
  const out: ({ type: string; coordinates: unknown } | null)[] = [];
  let o = 100;
  while (o + 12 <= end) {
    const len = v.getInt32(o + 4, false) * 2;
    const c = o + 8;
    const st = v.getInt32(c, true);
    if (st === 0) out.push(null);
    else if (st === 5 || st === 15 || st === 25) {
      const parts = v.getInt32(c + 36, true), points = v.getInt32(c + 40, true);
      if (parts < 0 || points < 0 || c + 44 + parts * 4 + points * 16 > buf.byteLength) return { error: `Shape ${out.length + 1} is cut short: the .shp is damaged` };
      const starts = Array.from({ length: parts }, (_, i) => v.getInt32(c + 44 + i * 4, true));
      const p0 = c + 44 + parts * 4;
      const rings: Xy[][] = starts.map((s, i) => {
        const e = i + 1 < parts ? starts[i + 1]! : points;
        const r: Xy[] = [];
        for (let k = s; k < e; k++) r.push([v.getFloat64(p0 + k * 16, true), v.getFloat64(p0 + k * 16 + 8, true)]);
        return r;
      }).filter(r => r.length);
      out.push(rings.length ? groupRings(rings) : null);
    } else return { error: `Shape ${out.length + 1} is of type ${st}: boundaries must be polygons` };
    if (out.length > MAX_FEATURES) break;
    o = c + len;
  }
  return out;
}

/** The records of a .dbf (null for deleted ones), decoded with `dec`. */
export function readDbf(buf: Uint8Array, dec: TextDecoder): { fields: string[]; rows: (Record<string, unknown> | null)[] } | { error: string } {
  if (buf.byteLength < 33) return { error: 'The .dbf file is empty or damaged' };
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = v.getUint32(4, true), headerLen = v.getUint16(8, true), recLen = v.getUint16(10, true);
  const fields: { name: string; type: string; len: number; off: number }[] = [];
  let off = 1;
  for (let p = 32; p + 32 <= headerLen && buf[p] !== 0x0d; p += 32) {
    const nameBytes = buf.subarray(p, p + 11);
    const z = nameBytes.indexOf(0);
    const name = dec.decode(z >= 0 ? nameBytes.subarray(0, z) : nameBytes).trim();
    const len = buf[p + 16]!;
    fields.push({ name, type: String.fromCharCode(buf[p + 11]!), len, off });
    off += len;
  }
  const rows: (Record<string, unknown> | null)[] = [];
  for (let i = 0; i < Math.min(n, MAX_FEATURES + 1); i++) {
    const r = headerLen + i * recLen;
    if (r + recLen > buf.byteLength) break;
    if (buf[r] === 0x2a) { rows.push(null); continue; }
    const row: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = dec.decode(buf.subarray(r + f.off, r + f.off + f.len)).replace(/\u0000/g, '').trim();
      row[f.name] = f.type === 'N' || f.type === 'F' ? (raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw))
        : f.type === 'L' ? (/^[YyTt]$/.test(raw) ? true : /^[NnFf]$/.test(raw) ? false : null)
        : raw;
    }
    rows.push(row);
  }
  return { fields: fields.map(f => f.name), rows };
}

const strictUtf8 = (b: Uint8Array) => { try { new TextDecoder('utf-8', { fatal: true }).decode(b); return true; } catch { return false; } };

function readShapefileZip(bytes: Uint8Array): ReadResult | { error: string } {
  let total = 0, tooBig = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: f => {
        if (/(^|\/)__MACOSX\//.test(f.name) || !/\.(shp|dbf|prj|cpg)$/i.test(f.name)) return false;
        total += f.originalSize;
        if (total > MAX_UNZIPPED_BYTES) { tooBig = true; return false; }
        return true;
      },
    });
  } catch { return { error: 'The zip file cannot be opened: it is damaged or encrypted' }; }
  if (tooBig) return { error: `The zip expands to more than ${MAX_UNZIPPED_BYTES / 1_000_000} MB` };
  const byExt = (base: string, ext: string) => Object.keys(files).find(k => k.toLowerCase() === `${base}.${ext}`);
  const shps = Object.keys(files).filter(k => /\.shp$/i.test(k)).sort();
  if (!shps.length) return { error: 'The zip holds no .shp file' };
  const shpName = shps[0]!;
  const base = shpName.slice(0, -4).toLowerCase();
  const notes: string[] = [];
  if (shps.length > 1) notes.push(`Read ${shpName.split('/').pop()}; the zip also holds ${shps.slice(1).map(s => s.split('/').pop()).join(', ')} (load each level as its own file)`);
  const dbfName = byExt(base, 'dbf');
  if (!dbfName) return { error: `The zip holds ${shpName.split('/').pop()} without its .dbf: the names and codes are in the .dbf` };
  const geoms = readShp(files[shpName]!);
  if ('error' in geoms) return geoms;

  const cpgName = byExt(base, 'cpg');
  let dec: TextDecoder;
  const dbfBytes = files[dbfName]!;
  if (cpgName) {
    const label = new TextDecoder().decode(files[cpgName]!).trim();
    const d = cpgDecoder(label);
    if (!d) return { error: `The .cpg names the encoding "${label}", which cannot be read here: save the names as UTF-8` };
    dec = d.dec;
    if (d.name !== 'utf-8') notes.push(`Names read as ${d.name} (from the .cpg)`);
  } else if (strictUtf8(dbfBytes)) dec = new TextDecoder('utf-8');
  else { dec = new TextDecoder('windows-1252'); notes.push('No .cpg and the names are not UTF-8: read as Windows-1252 (add a .cpg naming the encoding if names look wrong)'); }
  const dbf = readDbf(dbfBytes, dec);
  if ('error' in dbf) return dbf;
  if (dbf.rows.length !== geoms.length) notes.push(`The .shp holds ${geoms.length} shapes and the .dbf ${dbf.rows.length} records: matched in order`);

  const features: Feature[] = [];
  geoms.forEach((geometry, i) => {
    const props = dbf.rows[i];
    if (props === null) return; // deleted record
    features.push({ type: 'Feature', properties: props ?? {}, geometry });
  });

  const prjName = byExt(base, 'prj');
  let crs: Crs;
  if (prjName) {
    const c = crsFromWkt(new TextDecoder().decode(files[prjName]!));
    if ('error' in c) return c;
    crs = c;
  } else {
    const v = new DataView(files[shpName]!.buffer, files[shpName]!.byteOffset);
    const box = [36, 44, 52, 60].map(o => v.getFloat64(o, true));
    if (box.some(x => Math.abs(x) > 180) || Math.abs(box[1]!) > 90 || Math.abs(box[3]!) > 90) return { error: 'The zip has no .prj and the coordinates are not longitude/latitude: include the .prj so they can be reprojected' };
    crs = { name: 'longitude/latitude (assumed: no .prj)' };
    notes.push('No .prj in the zip: the coordinates were read as longitude/latitude (WGS 84)');
  }
  const bad = reproject(features, crs);
  if (bad) return { error: bad };
  if (crs.toLonLat) notes.push(`Reprojected from "${crs.name}" to longitude/latitude (WGS 84)`);
  return { format: 'shapefile-zip', features, notes, crs: crs.name, ...(crs.toLonLat ? { reprojectedFrom: crs.name } : {}) };
}

// ── GeoPackage ──────────────────────────────────────────────────────────────

type SqlJs = { Database: new (data?: Uint8Array) => SqlDb };
type SqlStmt = { bind(v?: unknown[]): boolean; step(): boolean; getAsObject(): Record<string, unknown>; free(): void };
type SqlDb = { prepare(sql: string): SqlStmt; close(): void };
let sqlJs: Promise<SqlJs> | null = null;

/** sql.js with its WebAssembly inlined, so the server needs no separate .wasm file (next.config keeps it external). */
export function loadSqlJs(): Promise<SqlJs> {
  return (sqlJs ??= import('sql.js/dist/sql-wasm-inline.js').then(m => {
    const mod = m as unknown as { default?: unknown; Module?: unknown };
    const init = [m, mod.default, mod.Module].find(x => typeof x === 'function') as () => Promise<SqlJs>;
    return init();
  }).catch(e => { sqlJs = null; throw e; }));
}

function rows(db: SqlDb, sql: string, params: unknown[] = [], limit = Infinity): Record<string, unknown>[] {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const out: Record<string, unknown>[] = [];
    while (out.length < limit && st.step()) out.push(st.getAsObject());
    return out;
  } finally { st.free(); }
}

/** Polygons from a GeoPackage geometry blob (GP header, then WKB). */
export function decodeGpkgGeometry(b: Uint8Array): { type: string; coordinates: unknown } | null | { error: string } {
  if (b.length < 8 || b[0] !== 0x47 || b[1] !== 0x50) return { error: 'not a GeoPackage geometry' };
  const flags = b[3]!;
  if (flags & 0x10) return null; // empty
  const env = ([0, 32, 48, 48, 64] as const)[(flags >> 1) & 7];
  if (env === undefined) return { error: 'unknown envelope in the geometry header' };
  const polys: Xy[][][] = [];
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 8 + env;
  const read = (): string | null => {
    const le = v.getUint8(o) === 1; o += 1;
    let t = v.getUint32(o, le); o += 4;
    let dims = 2;
    if (t & 0x80000000) dims++;
    if (t & 0x40000000) dims++;
    if (t & 0x20000000) o += 4; // EWKB SRID
    t &= 0x0fffffff;
    const iso = Math.floor(t / 1000);
    if (iso === 1 || iso === 2) dims = 3; else if (iso === 3) dims = 4;
    const base = t % 1000;
    const ring = (): Xy[] => {
      const n = v.getUint32(o, le); o += 4;
      const r: Xy[] = [];
      for (let i = 0; i < n; i++) { r.push([v.getFloat64(o, le), v.getFloat64(o + 8, le)]); o += 8 * dims; }
      return r;
    };
    if (base === 3) { const n = v.getUint32(o, le); o += 4; polys.push(Array.from({ length: n }, ring)); return null; }
    if (base === 6 || base === 7) { const n = v.getUint32(o, le); o += 4; for (let i = 0; i < n; i++) { const e = read(); if (e) return e; } return null; }
    return ({ 1: 'a point', 2: 'a line', 4: 'points', 5: 'lines', 10: 'a curved polygon', 15: 'a polyhedral surface', 16: 'a TIN' } as Record<number, string>)[base] ?? `geometry type ${base}`;
  };
  try {
    const e = read();
    if (e) return { error: `${e}: boundaries must be polygons` };
  } catch { return { error: 'the geometry is cut short' }; }
  const nonEmpty = polys.filter(p => p.length && p[0]!.length);
  if (!nonEmpty.length) return null;
  return nonEmpty.length === 1 ? { type: 'Polygon', coordinates: nonEmpty[0] } : { type: 'MultiPolygon', coordinates: nonEmpty };
}

async function readGeoPackage(bytes: Uint8Array): Promise<ReadResult | { error: string }> {
  let SQL: SqlJs;
  try { SQL = await loadSqlJs(); } catch { return { error: 'The GeoPackage reader could not start on this server' }; }
  let db: SqlDb;
  try { db = new SQL.Database(bytes); } catch { return { error: 'The GeoPackage cannot be opened: the file is damaged' }; }
  try {
    let tables: Record<string, unknown>[];
    try { tables = rows(db, "SELECT table_name, srs_id FROM gpkg_contents WHERE lower(data_type) = 'features' ORDER BY rowid"); }
    catch { return { error: 'Not a GeoPackage: the file has no gpkg_contents table' }; }
    if (!tables.length) return { error: 'The GeoPackage holds no feature table' };
    const table = String(tables[0]!.table_name);
    const notes: string[] = [];
    if (tables.length > 1) notes.push(`Read the layer "${table}"; the GeoPackage also holds ${tables.slice(1).map(t => `"${t.table_name}"`).join(', ')} (load each level as its own file)`);
    const gc = rows(db, 'SELECT column_name, srs_id FROM gpkg_geometry_columns WHERE table_name = ?', [table])[0];
    if (!gc) return { error: `The layer "${table}" has no geometry column` };
    const geomCol = String(gc.column_name);
    const srsId = Number(gc.srs_id ?? tables[0]!.srs_id);

    let crs: Crs;
    const srs = rows(db, 'SELECT srs_name, organization, organization_coordsys_id, definition FROM gpkg_spatial_ref_sys WHERE srs_id = ?', [srsId])[0];
    const label = srs ? `${String(srs.srs_name ?? '').trim() || `${srs.organization}:${srs.organization_coordsys_id}`}` : `srs ${srsId}`;
    const epsg = srs && /^epsg$/i.test(String(srs.organization)) ? Number(srs.organization_coordsys_id) : NaN;
    if (srsId === -1) return { error: 'The layer is in an undefined Cartesian coordinate system: give it its real system (for example its UTM zone) or convert it to longitude/latitude (WGS 84)' };
    if (srsId === 0) { crs = { name: 'undefined geographic (read as WGS 84)' }; notes.push('The layer names no coordinate system: read as longitude/latitude (WGS 84)'); }
    else if (epsg === 4326) crs = { name: label };
    else {
      const def = String(srs?.definition ?? '').trim();
      const fromWkt = def && !/^undefined$/i.test(def) ? crsFromWkt(def) : null;
      if (fromWkt && !('error' in fromWkt)) crs = { ...fromWkt, name: label || fromWkt.name };
      else {
        const known = Number.isFinite(epsg) ? crsFromEpsg(epsg) : null;
        if (!known) return { error: `The layer is in "${label}"${Number.isFinite(epsg) ? ` (EPSG:${epsg})` : ''}, a coordinate system that cannot be read here: convert it to longitude/latitude (WGS 84, EPSG:4326) first` };
        crs = known;
      }
    }

    const quoted = `"${table.replace(/"/g, '""')}"`;
    const recs = rows(db, `SELECT * FROM ${quoted}`, [], MAX_FEATURES + 1);
    const features: Feature[] = [];
    for (const [i, r] of recs.entries()) {
      const blob = r[geomCol];
      const props: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(r)) if (k !== geomCol && !(val instanceof Uint8Array)) props[k] = val;
      if (!(blob instanceof Uint8Array)) { features.push({ type: 'Feature', properties: props, geometry: null }); continue; }
      const g = decodeGpkgGeometry(blob);
      if (g && 'error' in g) return { error: `Feature ${i + 1} of "${table}": ${g.error}` };
      features.push({ type: 'Feature', properties: props, geometry: g });
    }
    const bad = reproject(features, crs);
    if (bad) return { error: bad };
    if (crs.toLonLat) notes.push(`Reprojected from "${crs.name}" to longitude/latitude (WGS 84)`);
    return { format: 'geopackage', features, notes, crs: crs.name, ...(crs.toLonLat ? { reprojectedFrom: crs.name } : {}) };
  } finally { db.close(); }
}
