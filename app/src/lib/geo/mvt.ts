// Mapbox Vector Tiles (MVT 2.1) written and read in plain JavaScript: a
// minimal Protocol Buffers encoder and decoder for the vector_tile.proto
// messages (Tile, Layer, Feature, Value), and Web Mercator tile arithmetic.
// Point layers (the facility register) and polygon and line layers (the
// nation's boundaries, lib/twin/boundary-tiles.ts) served by the platform
// itself (no tile server, no outside service, no dependency): MapLibre,
// OpenLayers, QGIS and GDAL read the result.
//
//   Tile    { repeated Layer layers = 3; }
//   Layer   { required uint32 version = 15; required string name = 1;
//             repeated Feature features = 2; repeated string keys = 3;
//             repeated Value values = 4; optional uint32 extent = 5; }
//   Feature { optional uint64 id = 1; repeated uint32 tags = 2 [packed];
//             optional GeomType type = 3; repeated uint32 geometry = 4 [packed]; }
//   Value   { string = 1; float = 2; double = 3; int64 = 4; uint64 = 5; sint64 = 6; bool = 7; }

export const EXTENT = 4096;
export type Prop = string | number | boolean;
export interface TilePoint { id?: number; x: number; y: number; properties: Record<string, Prop | undefined> }
/**
 * A polygon or line in tile coordinates. Polygon rings: each exterior ring
 * followed by its holes (exterior with positive area in tile coordinates,
 * y down, holes negative, as MVT 2.1 §4.3.4.4 requires; encodeTile does not
 * reorient), not repeating the first point at the end.
 */
export interface TileShape { id?: number; type: 'polygon' | 'line'; rings: [number, number][][]; properties: Record<string, Prop | undefined> }
export interface TileLayer { name: string; extent?: number; points: TilePoint[]; shapes?: TileShape[] }

// ── Protocol Buffers ──────────────────────────────────────────────────────

class Writer {
  private buf = new Uint8Array(256);
  private len = 0;
  private ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + n) size *= 2;
    const b = new Uint8Array(size); b.set(this.buf.subarray(0, this.len)); this.buf = b;
  }
  varint(v: number): this {
    // Unsigned, up to 2^53: split by division, as bit operations stop at 2^32.
    this.ensure(10);
    let n = Math.floor(v);
    while (n >= 0x80) { this.buf[this.len++] = (n % 0x80) | 0x80; n = Math.floor(n / 0x80); }
    this.buf[this.len++] = n;
    return this;
  }
  tag(field: number, wire: 0 | 1 | 2 | 5): this { return this.varint(field * 8 + wire); }
  bytes(field: number, b: Uint8Array): this { this.tag(field, 2).varint(b.length); this.ensure(b.length); this.buf.set(b, this.len); this.len += b.length; return this; }
  string(field: number, s: string): this { return this.bytes(field, new TextEncoder().encode(s)); }
  double(field: number, v: number): this { this.tag(field, 1); this.ensure(8); new DataView(this.buf.buffer, this.buf.byteOffset + this.len, 8).setFloat64(0, v, true); this.len += 8; return this; }
  packed(field: number, vs: number[]): this { const w = new Writer(); for (const v of vs) w.varint(v); return this.bytes(field, w.finish()); }
  finish(): Uint8Array { return this.buf.slice(0, this.len); }
}

const zigzag = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzigzag = (n: number) => (n % 2 === 0 ? n / 2 : -(n + 1) / 2);
const command = (id: number, count: number) => (id & 0x7) | (count << 3);

function encodeValue(v: Prop): Uint8Array {
  const w = new Writer();
  if (typeof v === 'string') w.string(1, v);
  else if (typeof v === 'boolean') w.tag(7, 0).varint(v ? 1 : 0);
  else if (Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER) { if (v >= 0) w.tag(5, 0).varint(v); else w.tag(6, 0).varint(zigzag(v)); }
  else w.double(3, v);
  return w.finish();
}

function encodeLayer(l: TileLayer): Uint8Array {
  const keys: string[] = [], values: Prop[] = [];
  const keyIx = new Map<string, number>(), valIx = new Map<string, number>();
  const w = new Writer();
  w.tag(15, 0).varint(2);
  w.string(1, l.name);
  const tagsOf = (props: Record<string, Prop | undefined>) => {
    const tags: number[] = [];
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) continue;
      let ki = keyIx.get(k); if (ki === undefined) { ki = keys.push(k) - 1; keyIx.set(k, ki); }
      const vk = `${typeof v}:${String(v)}`;
      let vi = valIx.get(vk); if (vi === undefined) { vi = values.push(v) - 1; valIx.set(vk, vi); }
      tags.push(ki, vi);
    }
    return tags;
  };
  for (const p of l.points) {
    const tags = tagsOf(p.properties);
    const f = new Writer();
    if (p.id != null && Number.isInteger(p.id) && p.id >= 0) f.tag(1, 0).varint(p.id);
    if (tags.length) f.packed(2, tags);
    f.tag(3, 0).varint(1); // POINT
    f.packed(4, [command(1, 1), zigzag(Math.round(p.x)), zigzag(Math.round(p.y))]);
    w.bytes(2, f.finish());
  }
  for (const sh of l.shapes ?? []) {
    const polygon = sh.type === 'polygon';
    const geom: number[] = [];
    let cx = 0, cy = 0;
    for (const ring of sh.rings) {
      if (ring.length < (polygon ? 3 : 2)) continue;
      const [x0, y0] = ring[0]!;
      geom.push(command(1, 1), zigzag(Math.round(x0) - cx), zigzag(Math.round(y0) - cy));
      cx = Math.round(x0); cy = Math.round(y0);
      geom.push(command(2, ring.length - 1));
      for (let i = 1; i < ring.length; i++) {
        const x = Math.round(ring[i]![0]), y = Math.round(ring[i]![1]);
        geom.push(zigzag(x - cx), zigzag(y - cy)); cx = x; cy = y;
      }
      if (polygon) geom.push(command(7, 1));
    }
    if (!geom.length) continue;
    const tags = tagsOf(sh.properties);
    const f = new Writer();
    if (sh.id != null && Number.isInteger(sh.id) && sh.id >= 0) f.tag(1, 0).varint(sh.id);
    if (tags.length) f.packed(2, tags);
    f.tag(3, 0).varint(polygon ? 3 : 2); // POLYGON or LINESTRING
    f.packed(4, geom);
    w.bytes(2, f.finish());
  }
  for (const k of keys) w.string(3, k);
  for (const v of values) w.bytes(4, encodeValue(v));
  w.tag(5, 0).varint(l.extent ?? EXTENT);
  return w.finish();
}

/** A vector tile of point, polygon and line layers. Empty layers are left out; no layers gives an empty (valid) tile. */
export function encodeTile(layers: TileLayer[]): Uint8Array {
  const w = new Writer();
  for (const l of layers) if (l.points.length || l.shapes?.length) w.bytes(3, encodeLayer(l));
  return w.finish();
}

// ── Decoding (tests, and anyone checking a tile) ──────────────────────────

class Reader {
  pos = 0;
  constructor(private b: Uint8Array) {}
  get done() { return this.pos >= this.b.length; }
  varint(): number { let r = 0, m = 1, c: number; do { c = this.b[this.pos++]!; r += (c & 0x7f) * m; m *= 0x80; } while (c & 0x80); return r; }
  bytes(): Uint8Array { const n = this.varint(); const s = this.b.subarray(this.pos, this.pos + n); this.pos += n; return s; }
  double(): number { const v = new DataView(this.b.buffer, this.b.byteOffset + this.pos, 8).getFloat64(0, true); this.pos += 8; return v; }
  float(): number { const v = new DataView(this.b.buffer, this.b.byteOffset + this.pos, 4).getFloat32(0, true); this.pos += 4; return v; }
  skip(wire: number) { if (wire === 0) this.varint(); else if (wire === 1) this.pos += 8; else if (wire === 2) this.bytes(); else if (wire === 5) this.pos += 4; else throw new Error(`wire type ${wire}`); }
}
const packed = (b: Uint8Array) => { const r = new Reader(b), out: number[] = []; while (!r.done) out.push(r.varint()); return out; };

/** A decoded feature: `geometry` lists every vertex; polygons and lines also give them by part (`rings`, split at each MoveTo). */
export interface DecodedFeature { id?: number; type: number; geometry: [number, number][]; rings?: [number, number][][]; properties: Record<string, Prop> }
export interface DecodedLayer { version: number; name: string; extent: number; features: DecodedFeature[] }

export function decodeTile(bytes: Uint8Array): DecodedLayer[] {
  const r = new Reader(bytes), layers: DecodedLayer[] = [];
  while (!r.done) {
    const t = r.varint();
    if (t >> 3 === 3 && (t & 7) === 2) layers.push(decodeLayer(r.bytes())); else r.skip(t & 7);
  }
  return layers;
}

function decodeLayer(b: Uint8Array): DecodedLayer {
  const r = new Reader(b);
  const l: DecodedLayer = { version: 1, name: '', extent: EXTENT, features: [] };
  const keys: string[] = [], values: Prop[] = [], raw: { id?: number; type: number; tags: number[]; geom: number[] }[] = [];
  while (!r.done) {
    const t = r.varint(), f = t >> 3, wire = t & 7;
    if (f === 15) l.version = r.varint();
    else if (f === 1) l.name = new TextDecoder().decode(r.bytes());
    else if (f === 3) keys.push(new TextDecoder().decode(r.bytes()));
    else if (f === 5) l.extent = r.varint();
    else if (f === 4) values.push(decodeValue(r.bytes()));
    else if (f === 2) {
      const fr = new Reader(r.bytes());
      const feat: { id?: number; type: number; tags: number[]; geom: number[] } = { type: 0, tags: [], geom: [] };
      while (!fr.done) {
        const ft = fr.varint(), ff = ft >> 3;
        if (ff === 1) feat.id = fr.varint(); else if (ff === 2) feat.tags = packed(fr.bytes()); else if (ff === 3) feat.type = fr.varint(); else if (ff === 4) feat.geom = packed(fr.bytes()); else fr.skip(ft & 7);
      }
      raw.push(feat);
    } else r.skip(wire);
  }
  for (const f of raw) {
    const properties: Record<string, Prop> = {};
    for (let i = 0; i + 1 < f.tags.length; i += 2) properties[keys[f.tags[i]!]!] = values[f.tags[i + 1]!]!;
    const geometry: [number, number][] = [], rings: [number, number][][] = [];
    let x = 0, y = 0, i = 0;
    while (i < f.geom.length) {
      const c = f.geom[i++]!, id = c & 7, n = c >> 3;
      if (id === 7) continue;
      if (id === 1) rings.push([]);
      for (let k = 0; k < n; k++) { x += unzigzag(f.geom[i++]!); y += unzigzag(f.geom[i++]!); geometry.push([x, y]); rings[rings.length - 1]?.push([x, y]); }
    }
    l.features.push({ ...(f.id != null ? { id: f.id } : {}), type: f.type, geometry, ...(f.type === 2 || f.type === 3 ? { rings } : {}), properties });
  }
  return l;
}

function decodeValue(b: Uint8Array): Prop {
  const r = new Reader(b);
  let v: Prop = '';
  while (!r.done) {
    const t = r.varint(), f = t >> 3;
    if (f === 1) v = new TextDecoder().decode(r.bytes());
    else if (f === 2) v = r.float();
    else if (f === 3) v = r.double();
    else if (f === 4 || f === 5) v = r.varint();
    else if (f === 6) v = unzigzag(r.varint());
    else if (f === 7) v = r.varint() === 1;
    else r.skip(t & 7);
  }
  return v;
}

// ── Web Mercator tiles ────────────────────────────────────────────────────

const MAX_LAT = 85.0511287798066;

/** A tile's bounds in longitude/latitude, widened by `buffer` tile units on each side. */
export function tileBounds(z: number, x: number, y: number, buffer = 0): [number, number, number, number] {
  const n = 2 ** z, b = buffer / EXTENT;
  const lng = (t: number) => (t / n) * 360 - 180;
  const lat = (t: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n))) * 180) / Math.PI;
  return [lng(x - b), Math.max(-MAX_LAT, lat(y + 1 + b)), lng(x + 1 + b), Math.min(MAX_LAT, lat(y - b))];
}

/** A position in the tile's own coordinates (0..extent; outside for the buffer). */
export function toTile(lng: number, lat: number, z: number, x: number, y: number, extent = EXTENT): [number, number] {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  const tx = ((lng + 180) / 360) * n, ty = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
  return [Math.round((tx - x) * extent), Math.round((ty - y) * extent)];
}

/** Back from tile coordinates to longitude/latitude. */
export function fromTile(px: number, py: number, z: number, x: number, y: number, extent = EXTENT): [number, number] {
  const n = 2 ** z;
  const tx = x + px / extent, ty = y + py / extent;
  return [(tx / n) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI];
}

export const validTile = (z: number, x: number, y: number, maxZoom = 22) =>
  Number.isInteger(z) && Number.isInteger(x) && Number.isInteger(y) && z >= 0 && z <= maxZoom && x >= 0 && y >= 0 && x < 2 ** z && y < 2 ** z;
