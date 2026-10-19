// Test fixtures only: builds small zipped Shapefiles and GeoPackages from
// GeoJSON features, byte by byte, so the readers in boundary-files.ts are
// tested against files laid out as GIS software writes them (Shapefile:
// outer rings clockwise, holes anticlockwise, fixed-width .dbf; GeoPackage:
// gpkg_contents, gpkg_geometry_columns, gpkg_spatial_ref_sys, GP header +
// WKB). Not used by the platform at runtime.

import { zipSync } from 'fflate';
import { loadSqlJs, type Feature } from './boundary-files';

type Xy = [number, number];
type Poly = Xy[][];

const polysOf = (g: Feature['geometry']): Poly[] => (!g ? [] : g.type === 'Polygon' ? [g.coordinates as Poly] : g.type === 'MultiPolygon' ? (g.coordinates as Poly[]) : []);
const signed = (r: Xy[]) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i]!, b = r[(i + 1) % r.length]!; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
/** Outer rings clockwise, holes anticlockwise (the Shapefile convention). */
const wind = (r: Xy[], outer: boolean) => ((signed(r) < 0) === outer ? r : [...r].reverse());

export function encodeShp(features: Feature[]): Uint8Array {
  const recs = features.map(f => polysOf(f.geometry).flatMap(p => p.map((r, i) => wind(r, i === 0))));
  const size = 100 + recs.reduce((s, rings) => s + 8 + (rings.length ? 44 + rings.length * 4 + rings.reduce((n, r) => n + r.length, 0) * 16 : 4), 0);
  const buf = new Uint8Array(size);
  const v = new DataView(buf.buffer);
  const all = recs.flat(2);
  const box = all.length ? [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))] : [0, 0, 0, 0];
  v.setInt32(0, 9994, false); v.setInt32(24, size / 2, false); v.setInt32(28, 1000, true); v.setInt32(32, 5, true);
  box.forEach((x, i) => v.setFloat64(36 + i * 8, x!, true));
  let o = 100;
  recs.forEach((rings, i) => {
    const pts = rings.flat();
    const len = rings.length ? 44 + rings.length * 4 + pts.length * 16 : 4;
    v.setInt32(o, i + 1, false); v.setInt32(o + 4, len / 2, false);
    const c = o + 8;
    if (!rings.length) { v.setInt32(c, 0, true); o = c + len; return; }
    v.setInt32(c, 5, true);
    [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))].forEach((x, k) => v.setFloat64(c + 4 + k * 8, x, true));
    v.setInt32(c + 36, rings.length, true); v.setInt32(c + 40, pts.length, true);
    let start = 0;
    rings.forEach((r, k) => { v.setInt32(c + 44 + k * 4, start, true); start += r.length; });
    const p0 = c + 44 + rings.length * 4;
    pts.forEach((p, k) => { v.setFloat64(p0 + k * 16, p[0], true); v.setFloat64(p0 + k * 16 + 8, p[1], true); });
    o = c + len;
  });
  return buf;
}

/** A .dbf with text fields, strings encoded by `enc` (UTF-8 by default). */
export function encodeDbf(rows: Record<string, string>[], fieldNames: string[], enc: (s: string) => Uint8Array = s => new TextEncoder().encode(s)): Uint8Array {
  const lens = fieldNames.map(k => Math.min(254, Math.max(1, ...rows.map(r => enc(r[k] ?? '').length))));
  const headerLen = 32 + fieldNames.length * 32 + 1;
  const recLen = 1 + lens.reduce((a, b) => a + b, 0);
  const buf = new Uint8Array(headerLen + rows.length * recLen + 1);
  const v = new DataView(buf.buffer);
  buf[0] = 0x03; v.setUint32(4, rows.length, true); v.setUint16(8, headerLen, true); v.setUint16(10, recLen, true);
  fieldNames.forEach((k, i) => {
    const p = 32 + i * 32;
    buf.set(new TextEncoder().encode(k.slice(0, 10)), p);
    buf[p + 11] = 'C'.charCodeAt(0); buf[p + 16] = lens[i]!;
  });
  buf[headerLen - 1] = 0x0d;
  rows.forEach((r, i) => {
    let o = headerLen + i * recLen;
    buf[o++] = 0x20;
    fieldNames.forEach((k, j) => { const b = enc(r[k] ?? '').subarray(0, lens[j]!); buf.fill(0x20, o, o + lens[j]!); buf.set(b, o); o += lens[j]!; });
  });
  buf[buf.length - 1] = 0x1a;
  return buf;
}

export const WGS84_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
export const UTM37S_PRJ = 'PROJCS["WGS_1984_UTM_Zone_37S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",39.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';

/** A zipped Shapefile of the features (text attributes from `fields`). */
export function shapefileZip(features: Feature[], fields: string[], opts: { prj?: string; cpg?: string; enc?: (s: string) => Uint8Array; base?: string } = {}): Uint8Array {
  const base = opts.base ?? 'units';
  const rows = features.map(f => Object.fromEntries(fields.map(k => [k, String(f.properties?.[k] ?? '')])));
  const files: Record<string, Uint8Array> = { [`${base}.shp`]: encodeShp(features), [`${base}.dbf`]: encodeDbf(rows, fields, opts.enc) };
  if (opts.prj) files[`${base}.prj`] = new TextEncoder().encode(opts.prj);
  if (opts.cpg) files[`${base}.cpg`] = new TextEncoder().encode(opts.cpg);
  return zipSync(files);
}

/** WKB (little-endian) of a polygon or multipolygon. */
function wkb(g: Feature['geometry']): Uint8Array {
  const polys = polysOf(g);
  const size = 9 + polys.reduce((s, p) => s + 9 + p.reduce((n, r) => n + 4 + r.length * 16, 0), 0);
  const buf = new Uint8Array(size);
  const v = new DataView(buf.buffer);
  let o = 0;
  buf[o++] = 1; v.setUint32(o, 6, true); o += 4; v.setUint32(o, polys.length, true); o += 4;
  for (const p of polys) {
    buf[o++] = 1; v.setUint32(o, 3, true); o += 4; v.setUint32(o, p.length, true); o += 4;
    for (const r of p) { v.setUint32(o, r.length, true); o += 4; for (const [x, y] of r) { v.setFloat64(o, x, true); v.setFloat64(o + 8, y, true); o += 16; } }
  }
  return buf;
}

/** A GeoPackage geometry: GP header (little-endian, no envelope) + WKB. */
export function gpkgGeometry(g: Feature['geometry'], srsId: number): Uint8Array {
  const body = wkb(g);
  const out = new Uint8Array(8 + body.length);
  out.set([0x47, 0x50, 0, 0x01]);
  new DataView(out.buffer).setInt32(4, srsId, true);
  out.set(body, 8);
  return out;
}

/** A GeoPackage with one feature table `units` of the features, in the spatial reference given. */
export async function geoPackage(features: Feature[], fields: string[], srs: { id: number; name: string; organization: string; code: number; definition: string } = { id: 4326, name: 'WGS 84 geodetic', organization: 'EPSG', code: 4326, definition: WGS84_PRJ }): Promise<Uint8Array> {
  const SQL = await loadSqlJs() as unknown as { Database: new () => { run(sql: string, params?: unknown[]): void; export(): Uint8Array; close(): void } };
  const db = new SQL.Database();
  db.run('CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT)');
  db.run('CREATE TABLE gpkg_contents (table_name TEXT PRIMARY KEY, data_type TEXT NOT NULL, identifier TEXT, description TEXT, last_change TEXT, min_x REAL, min_y REAL, max_x REAL, max_y REAL, srs_id INTEGER)');
  db.run('CREATE TABLE gpkg_geometry_columns (table_name TEXT, column_name TEXT, geometry_type_name TEXT, srs_id INTEGER, z TINYINT, m TINYINT)');
  db.run('INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, NULL)', [srs.name, srs.id, srs.organization, srs.code, srs.definition]);
  db.run("INSERT INTO gpkg_contents (table_name, data_type, identifier, srs_id) VALUES ('units', 'features', 'units', ?)", [srs.id]);
  db.run("INSERT INTO gpkg_geometry_columns VALUES ('units', 'geom', 'MULTIPOLYGON', ?, 0, 0)", [srs.id]);
  db.run(`CREATE TABLE units (fid INTEGER PRIMARY KEY AUTOINCREMENT, geom BLOB, ${fields.map(f => `"${f}" TEXT`).join(', ')})`);
  for (const f of features) db.run(`INSERT INTO units (geom, ${fields.map(k => `"${k}"`).join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')})`, [gpkgGeometry(f.geometry, srs.id), ...fields.map(k => String(f.properties?.[k] ?? ''))]);
  const out = db.export();
  db.close();
  return out;
}
