// PMTiles v3 (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md)
// written and read in plain TypeScript: one file holding a whole tile pyramid
// (here, the facility register's vector tiles), addressed by Hilbert tile ids,
// with a root directory in the first 16 KiB and leaf directories when the
// root would not fit, so a reader needs only HTTP range requests (or a local
// file) and no tile server. Architecture review G4, R13. No dependency;
// compression is passed in (gzip through node:zlib on the server, the
// browser's DecompressionStream on the client).
//
// Layout: header (127 bytes) · root directory · JSON metadata · leaf
// directories · tile data (clustered: in tile id order, identical tiles stored
// once and runs of them addressed by one entry).

export const HEADER_BYTES = 127;
/** The header and root directory must fit in the first 16 KiB. */
export const ROOT_BYTES = 16_384;
export const MAGIC = 'PMTiles';
export const VERSION = 3;

export enum Compression { Unknown = 0, None = 1, Gzip = 2, Brotli = 3, Zstd = 4 }
export enum TileType { Unknown = 0, Mvt = 1, Png = 2, Jpeg = 3, Webp = 4, Avif = 5 }

export interface Header {
  specVersion: number;
  rootDirectoryOffset: number; rootDirectoryLength: number;
  jsonMetadataOffset: number; jsonMetadataLength: number;
  leafDirectoryOffset: number; leafDirectoryLength: number;
  tileDataOffset: number; tileDataLength: number;
  numAddressedTiles: number; numTileEntries: number; numTileContents: number;
  clustered: boolean;
  internalCompression: Compression; tileCompression: Compression; tileType: TileType;
  minZoom: number; maxZoom: number;
  minLon: number; minLat: number; maxLon: number; maxLat: number;
  centerZoom: number; centerLon: number; centerLat: number;
}

/** One directory entry: a run of `runLength` tiles from `tileId` sharing one content; runLength 0 points at a leaf directory. */
export interface Entry { tileId: number; offset: number; length: number; runLength: number }

// ── Hilbert tile ids ──────────────────────────────────────────────────────

const rotate = (n: number, xy: [number, number], rx: number, ry: number) => {
  if (ry === 0) {
    if (rx === 1) { xy[0] = n - 1 - xy[0]; xy[1] = n - 1 - xy[1]; }
    const t = xy[0]; xy[0] = xy[1]; xy[1] = t;
  }
};
/** Tiles on all zoom levels below z: (4^z − 1) / 3. */
const levelStart = (z: number) => (4 ** z - 1) / 3;

export function zxyToTileId(z: number, x: number, y: number): number {
  if (!Number.isInteger(z) || z < 0 || z > 26) throw new RangeError('zoom 0–26');
  const n = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= n || y >= n) throw new RangeError('tile outside its zoom level');
  const xy: [number, number] = [x, y];
  let d = 0;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (xy[0] & s) > 0 ? 1 : 0, ry = (xy[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    rotate(s, xy, rx, ry);
  }
  return levelStart(z) + d;
}

export function tileIdToZxy(id: number): [number, number, number] {
  if (!Number.isSafeInteger(id) || id < 0) throw new RangeError('tile id');
  let z = 0;
  while (levelStart(z + 1) <= id) z++;
  if (z > 26) throw new RangeError('tile id beyond zoom 26');
  let t = id - levelStart(z);
  const n = 2 ** z, xy: [number, number] = [0, 0];
  for (let s = 1; s < n; s *= 2) {
    const rx = Math.floor(t / 2) % 2, ry = (t % 2) ^ rx;
    rotate(s, xy, rx, ry);
    xy[0] += s * rx; xy[1] += s * ry;
    t = Math.floor(t / 4);
  }
  return [z, xy[0], xy[1]];
}

// ── Bytes ─────────────────────────────────────────────────────────────────

class Bytes {
  private buf = new Uint8Array(1024);
  len = 0;
  private ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let s = this.buf.length * 2; while (s < this.len + n) s *= 2;
    const b = new Uint8Array(s); b.set(this.buf.subarray(0, this.len)); this.buf = b;
  }
  varint(v: number): void {
    this.ensure(10);
    let n = Math.floor(v);
    while (n >= 0x80) { this.buf[this.len++] = (n % 0x80) | 0x80; n = Math.floor(n / 0x80); }
    this.buf[this.len++] = n;
  }
  finish(): Uint8Array { return this.buf.slice(0, this.len); }
}

function readVarint(b: Uint8Array, pos: { i: number }): number {
  let r = 0, m = 1, c: number;
  do {
    if (pos.i >= b.length) throw new Error('truncated varint');
    c = b[pos.i++]!; r += (c & 0x7f) * m; m *= 0x80;
  } while (c & 0x80);
  return r;
}

/** A directory as the spec serialises it (before internal compression). */
export function serializeDirectory(entries: readonly Entry[]): Uint8Array {
  const w = new Bytes();
  w.varint(entries.length);
  let last = 0;
  for (const e of entries) { w.varint(e.tileId - last); last = e.tileId; }
  for (const e of entries) w.varint(e.runLength);
  for (const e of entries) w.varint(e.length);
  entries.forEach((e, i) => {
    const prev = entries[i - 1];
    w.varint(i > 0 && prev && e.offset === prev.offset + prev.length ? 0 : e.offset + 1);
  });
  return w.finish();
}

export function deserializeDirectory(b: Uint8Array): Entry[] {
  const pos = { i: 0 };
  const n = readVarint(b, pos);
  const out: Entry[] = [];
  let last = 0;
  for (let i = 0; i < n; i++) { last += readVarint(b, pos); out.push({ tileId: last, offset: 0, length: 0, runLength: 1 }); }
  for (const e of out) e.runLength = readVarint(b, pos);
  for (const e of out) e.length = readVarint(b, pos);
  out.forEach((e, i) => {
    const v = readVarint(b, pos);
    e.offset = v === 0 && i > 0 ? out[i - 1]!.offset + out[i - 1]!.length : v - 1;
  });
  return out;
}

const u64 = (v: DataView, at: number, n: number) => { v.setUint32(at, n % 2 ** 32, true); v.setUint32(at + 4, Math.floor(n / 2 ** 32), true); };
const r64 = (v: DataView, at: number) => v.getUint32(at, true) + v.getUint32(at + 4, true) * 2 ** 32;
const e7 = (deg: number) => Math.round(deg * 1e7);

export function serializeHeader(h: Header): Uint8Array {
  const b = new Uint8Array(HEADER_BYTES), v = new DataView(b.buffer);
  for (let i = 0; i < MAGIC.length; i++) b[i] = MAGIC.charCodeAt(i);
  b[7] = h.specVersion;
  const nums = [h.rootDirectoryOffset, h.rootDirectoryLength, h.jsonMetadataOffset, h.jsonMetadataLength, h.leafDirectoryOffset, h.leafDirectoryLength, h.tileDataOffset, h.tileDataLength, h.numAddressedTiles, h.numTileEntries, h.numTileContents];
  nums.forEach((n, i) => u64(v, 8 + i * 8, n));
  b[96] = h.clustered ? 1 : 0; b[97] = h.internalCompression; b[98] = h.tileCompression; b[99] = h.tileType; b[100] = h.minZoom; b[101] = h.maxZoom;
  v.setInt32(102, e7(h.minLon), true); v.setInt32(106, e7(h.minLat), true); v.setInt32(110, e7(h.maxLon), true); v.setInt32(114, e7(h.maxLat), true);
  b[118] = h.centerZoom; v.setInt32(119, e7(h.centerLon), true); v.setInt32(123, e7(h.centerLat), true);
  return b;
}

export function deserializeHeader(b: Uint8Array): Header {
  if (b.length < HEADER_BYTES) throw new Error('not a PMTiles archive (too short)');
  if (String.fromCharCode(...b.subarray(0, 7)) !== MAGIC) throw new Error('not a PMTiles archive');
  if (b[7] !== VERSION) throw new Error(`PMTiles version ${b[7]} is not supported (3 is)`);
  const v = new DataView(b.buffer, b.byteOffset, HEADER_BYTES);
  const n = (i: number) => r64(v, 8 + i * 8);
  return {
    specVersion: b[7]!,
    rootDirectoryOffset: n(0), rootDirectoryLength: n(1), jsonMetadataOffset: n(2), jsonMetadataLength: n(3),
    leafDirectoryOffset: n(4), leafDirectoryLength: n(5), tileDataOffset: n(6), tileDataLength: n(7),
    numAddressedTiles: n(8), numTileEntries: n(9), numTileContents: n(10),
    clustered: b[96] === 1, internalCompression: b[97]!, tileCompression: b[98]!, tileType: b[99]!, minZoom: b[100]!, maxZoom: b[101]!,
    minLon: v.getInt32(102, true) / 1e7, minLat: v.getInt32(106, true) / 1e7, maxLon: v.getInt32(110, true) / 1e7, maxLat: v.getInt32(114, true) / 1e7,
    centerZoom: b[118]!, centerLon: v.getInt32(119, true) / 1e7, centerLat: v.getInt32(123, true) / 1e7,
  };
}

// ── Writing ───────────────────────────────────────────────────────────────

export interface WriteOptions {
  tileType: TileType;
  /** How tile bytes are already compressed (the writer does not compress tiles). */
  tileCompression: Compression;
  /** How directories and metadata are compressed, with the function that does it. */
  internalCompression: Compression;
  compress: (b: Uint8Array) => Uint8Array;
  metadata: Record<string, unknown>;
  bounds: [number, number, number, number];
  center?: [number, number, number];
  minZoom?: number;
  maxZoom?: number;
  /** Entries per leaf directory to start from (doubled until the root fits). */
  leafSize?: number;
}

/** A 53-bit FNV-style hash of tile bytes, to find identical tiles (checked byte by byte). */
function hashBytes(b: Uint8Array): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < b.length; i++) { h1 = Math.imul(h1 ^ b[i]!, 16777619); h2 = Math.imul(h2 ^ b[i]!, 2246822519); }
  return `${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}:${b.length}`;
}
function same(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * A PMTiles v3 archive from tiles. Tiles may come in any order; empty tiles
 * should be left out. Identical tiles are stored once, consecutive identical
 * tiles share an entry (run length), and the tile data is clustered.
 */
export function writeArchive(tiles: readonly { z: number; x: number; y: number; data: Uint8Array }[], o: WriteOptions): Uint8Array {
  const sorted = tiles.map(t => ({ id: zxyToTileId(t.z, t.x, t.y), data: t.data })).sort((a, b) => a.id - b.id);
  const b = new ArchiveBuilder(o);
  const chunks: Uint8Array[] = [];
  for (const t of sorted) { const out = b.add(t.id, t.data); if (out) chunks.push(out); }
  return concat([b.finish(), ...chunks]);
}

/** Directory entries in typed arrays: a national archive addresses millions of tiles. */
class EntryList {
  n = 0;
  private ids = new Float64Array(1024); private offs = new Float64Array(1024);
  private lens = new Uint32Array(1024); private runs = new Uint32Array(1024);
  push(tileId: number, offset: number, length: number, runLength: number): void {
    if (this.n === this.ids.length) {
      const grow = <T extends Float64Array | Uint32Array>(a: T): T => { const b = new (a.constructor as new (n: number) => T)(a.length * 2); b.set(a); return b; };
      this.ids = grow(this.ids); this.offs = grow(this.offs); this.lens = grow(this.lens); this.runs = grow(this.runs);
    }
    const i = this.n++;
    this.ids[i] = tileId; this.offs[i] = offset; this.lens[i] = length; this.runs[i] = runLength;
  }
  tileId(i: number): number { return this.ids[i]!; }
  runLength(i: number): number { return this.runs[i]!; }
  extendRun(): void { this.runs[this.n - 1]!++; }
  slice(from: number, to: number): Entry[] {
    const out: Entry[] = [];
    for (let i = from; i < Math.min(to, this.n); i++) out.push({ tileId: this.ids[i]!, offset: this.offs[i]!, length: this.lens[i]!, runLength: this.runs[i]! });
    return out;
  }
}

/** Entries above which the root alone cannot fit in 16 KiB, so leaves are made straight away. */
const ROOT_TRY_MAX = 50_000;

/**
 * An archive written tile by tile, for archives too large to hold as one
 * buffer: add() each tile in increasing tile id order (zoom by zoom, each zoom
 * in Hilbert order) and append what it returns to the tile data (a file);
 * finish() gives everything that goes before the tile data (header, root
 * directory, metadata, leaf directories). The archive is finish() followed
 * by the tile data. Only the directory (in typed arrays) and, to find
 * identical tiles, a digest per stored tile (`digest`; without one, the
 * stored bytes themselves) are kept in memory.
 */
export class ArchiveBuilder {
  private entries = new EntryList();
  private seen = new Map<string, { offset: number; data?: Uint8Array }[]>();
  private prev: { data?: Uint8Array; key: string } | null = null;
  private minId = -1; private maxId = -1;
  dataLength = 0; contents = 0; addressed = 0;
  constructor(private o: WriteOptions & { digest?: (b: Uint8Array) => string }) {}

  /** The next tile (tile ids strictly increasing): the bytes to append to the tile data, or null when it is stored already. */
  add(id: number, data: Uint8Array): Uint8Array | null {
    const e = this.entries, n = e.n;
    if (n && id < e.tileId(n - 1) + e.runLength(n - 1)) throw new Error(id >= e.tileId(n - 1) ? 'a tile appears twice' : 'tiles must be added in tile id order');
    if (this.minId < 0) this.minId = id;
    this.maxId = id; this.addressed++;
    const key = this.o.digest ? this.o.digest(data) : hashBytes(data);
    const equal = (d: { data?: Uint8Array }) => (this.o.digest ? true : same(d.data!, data));
    // The next tile id with the same bytes as the last: extend that entry's run.
    if (n && this.prev && id === e.tileId(n - 1) + e.runLength(n - 1) && this.prev.key === key && equal(this.prev)) { e.extendRun(); return null; }
    this.prev = { key, ...(this.o.digest ? {} : { data }) };
    const hit = this.seen.get(key)?.find(equal);
    if (hit) { e.push(id, hit.offset, data.length, 1); return null; }
    e.push(id, this.dataLength, data.length, 1);
    const list = this.seen.get(key) ?? [];
    list.push({ offset: this.dataLength, ...(this.o.digest ? {} : { data }) });
    this.seen.set(key, list);
    this.dataLength += data.length; this.contents++;
    return data;
  }

  addZxy(z: number, x: number, y: number, data: Uint8Array): Uint8Array | null { return this.add(zxyToTileId(z, x, y), data); }

  /** Header, root directory, metadata and leaf directories: everything that goes before the tile data. */
  finish(): Uint8Array {
    const o = this.o, entries = this.entries, total = entries.n;
    // Directories: everything in the root when it fits, else leaves (doubling until the root fits).
    let root = total <= ROOT_TRY_MAX ? o.compress(serializeDirectory(entries.slice(0, total))) : null;
    let leaves = new Uint8Array(0);
    if (!root || HEADER_BYTES + root.length > ROOT_BYTES) {
      for (let size = o.leafSize ?? 4096; ; size *= 2) {
        const rootEntries: Entry[] = [], parts: Uint8Array[] = [];
        let off = 0;
        for (let i = 0; i < total; i += size) {
          const leaf = o.compress(serializeDirectory(entries.slice(i, i + size)));
          rootEntries.push({ tileId: entries.tileId(i), offset: off, length: leaf.length, runLength: 0 });
          parts.push(leaf); off += leaf.length;
        }
        root = o.compress(serializeDirectory(rootEntries));
        if (HEADER_BYTES + root.length <= ROOT_BYTES) { leaves = concat(parts); break; }
        if (size > total) throw new Error('the root directory does not fit');
      }
    }
    const meta = o.compress(new TextEncoder().encode(JSON.stringify(o.metadata)));
    const minZoom = o.minZoom ?? (this.minId >= 0 ? tileIdToZxy(this.minId)[0] : 0);
    const maxZoom = o.maxZoom ?? (this.maxId >= 0 ? tileIdToZxy(this.maxId)[0] : 0);
    const [minLon, minLat, maxLon, maxLat] = o.bounds;
    const center = o.center ?? [(minLon + maxLon) / 2, (minLat + maxLat) / 2, minZoom];
    const header: Header = {
      specVersion: VERSION,
      rootDirectoryOffset: HEADER_BYTES, rootDirectoryLength: root.length,
      jsonMetadataOffset: HEADER_BYTES + root.length, jsonMetadataLength: meta.length,
      leafDirectoryOffset: HEADER_BYTES + root.length + meta.length, leafDirectoryLength: leaves.length,
      tileDataOffset: HEADER_BYTES + root.length + meta.length + leaves.length, tileDataLength: this.dataLength,
      numAddressedTiles: this.addressed, numTileEntries: total, numTileContents: this.contents,
      clustered: true, internalCompression: o.internalCompression, tileCompression: o.tileCompression, tileType: o.tileType,
      minZoom, maxZoom, minLon, minLat, maxLon, maxLat, centerZoom: Math.round(center[2]), centerLon: center[0], centerLat: center[1],
    };
    return concat([serializeHeader(header), root, meta, leaves]);
  }
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ── Reading ───────────────────────────────────────────────────────────────

/** Where the archive's bytes come from: an HTTP range request, a file, a buffer. */
export type RangeSource = (offset: number, length: number) => Promise<Uint8Array>;
export type Decompress = (b: Uint8Array, c: Compression) => Promise<Uint8Array>;

/** The archive has changed under the reader (a rebuilt archive with a new ETag). */
export class ArchiveChanged extends Error { constructor() { super('the archive changed'); this.name = 'ArchiveChanged'; } }

/** Gzip and "none" with the platform's DecompressionStream (browsers and Node 18+). */
export const decompressNative: Decompress = async (b, c) => {
  if (c === Compression.None || c === Compression.Unknown) return b;
  if (c !== Compression.Gzip) throw new Error(`compression ${Compression[c]} is not supported here`);
  const DS = (globalThis as { DecompressionStream?: new (f: string) => TransformStream<Uint8Array, Uint8Array> }).DecompressionStream;
  if (!DS) throw new Error('this browser cannot decompress gzip');
  const stream = new Blob([b]).stream().pipeThrough(new DS('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** The entry addressing a tile id in one directory (or the leaf to look in), by binary search. */
export function findEntry(entries: readonly Entry[], tileId: number): Entry | null {
  let lo = 0, hi = entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, c = tileId - entries[mid]!.tileId;
    if (c > 0) lo = mid + 1; else if (c < 0) hi = mid - 1; else return entries[mid]!;
  }
  // The run that may cover it: the entry just before.
  if (hi >= 0) {
    const e = entries[hi]!;
    if (e.runLength === 0) return e;
    if (tileId - e.tileId < e.runLength) return e;
  }
  return null;
}

export class PMTilesReader {
  private head: Promise<{ header: Header; root: Entry[] }> | null = null;
  private dirs = new Map<string, Promise<Entry[]>>();
  constructor(private source: RangeSource, private decompress: Decompress = decompressNative) {}

  private start() {
    this.head ??= (async () => {
      const first = await this.source(0, ROOT_BYTES);
      const header = deserializeHeader(first);
      const rootBytes = first.length >= header.rootDirectoryOffset + header.rootDirectoryLength
        ? first.slice(header.rootDirectoryOffset, header.rootDirectoryOffset + header.rootDirectoryLength)
        : await this.source(header.rootDirectoryOffset, header.rootDirectoryLength);
      return { header, root: deserializeDirectory(await this.decompress(rootBytes, header.internalCompression)) };
    })();
    this.head.catch(() => { this.head = null; });
    return this.head;
  }

  /** Forget everything read (after the archive changed). */
  reset(): void { this.head = null; this.dirs.clear(); }

  async header(): Promise<Header> { return (await this.start()).header; }

  async metadata(): Promise<Record<string, unknown>> {
    const { header } = await this.start();
    const raw = await this.source(header.jsonMetadataOffset, header.jsonMetadataLength);
    return JSON.parse(new TextDecoder().decode(await this.decompress(raw, header.internalCompression))) as Record<string, unknown>;
  }

  private leaf(header: Header, offset: number, length: number): Promise<Entry[]> {
    const k = `${offset}:${length}`;
    let p = this.dirs.get(k);
    if (!p) {
      p = this.source(header.leafDirectoryOffset + offset, length).then(b => this.decompress(b, header.internalCompression)).then(deserializeDirectory);
      this.dirs.set(k, p);
      p.catch(() => this.dirs.delete(k));
    }
    return p;
  }

  /** A tile's bytes as stored (still in the archive's tile compression), or null when the archive has none there. */
  async rawTile(z: number, x: number, y: number): Promise<Uint8Array | null> {
    const { header, root } = await this.start();
    if (z < header.minZoom || z > header.maxZoom) return null;
    const id = zxyToTileId(z, x, y);
    let dir = root;
    for (let depth = 0; depth < 4; depth++) {
      const e = findEntry(dir, id);
      if (!e) return null;
      if (e.runLength > 0) return this.source(header.tileDataOffset + e.offset, e.length);
      dir = await this.leaf(header, e.offset, e.length);
    }
    throw new Error('directories nested too deep');
  }

  /** A tile's bytes, decompressed. */
  async tile(z: number, x: number, y: number): Promise<Uint8Array | null> {
    const raw = await this.rawTile(z, x, y);
    if (!raw) return null;
    const { header } = await this.start();
    return this.decompress(raw, header.tileCompression);
  }
}

/** A buffer as a range source (tests, and an archive already in memory). */
export const bufferSource = (b: Uint8Array): RangeSource => async (offset, length) => b.slice(offset, Math.min(b.length, offset + length));

/**
 * An archive over HTTP range requests. The first answer's ETag is kept; an
 * answer with another ETag means the archive was rebuilt (ArchiveChanged), so
 * a reader never mixes directories of one build with tiles of another.
 */
export function httpSource(url: string, fetchImpl: typeof fetch = fetch, init: RequestInit = {}): RangeSource {
  let etag: string | null = null;
  return async (offset, length) => {
    const r = await fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), range: `bytes=${offset}-${offset + length - 1}` } });
    if (r.status === 416) return new Uint8Array(0);
    if (!r.ok) throw new Error(`archive: ${r.status}`);
    const tag = r.headers.get('etag');
    if (etag && tag && tag !== etag) throw new ArchiveChanged();
    etag ??= tag;
    const b = new Uint8Array(await r.arrayBuffer());
    // A server that ignores ranges sends the whole file.
    return r.status === 206 ? b : b.slice(offset, offset + length);
  };
}
