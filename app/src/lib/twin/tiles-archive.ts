// The national facility register as one PMTiles v3 archive (architecture
// review G4, R13; lib/geo/pmtiles.ts): every tile from zoom 0 to 12 (or the
// range in CIVICOS_TILES_ZOOMS, e.g. "0-10") of the "facilities" vector layer,
// built from the published sites AS THE PUBLIC SEES THEM — restricted sites at
// the position viewFacility() gives a viewer who is not signed in, never the
// exact one; confidential categories are never in the register. Served at
// /api/twin/tiles/facilities.pmtiles with HTTP range requests, for the public
// locator, GIS clients and offline or air-gapped copies. Signed-in officials
// read the live, viewer-aware tile route instead (lib/twin/tiles.ts).
//
// Rebuilt after publication changes: every audited `facility.*` change
// (through the audit hook, lib/events/outbox.ts onAudited) marks the archive
// stale and schedules a rebuild after a quiet period (CIVICOS_TILES_DEBOUNCE_MS,
// default 5 s); a request that finds it stale checks the sites' fingerprint
// (SHA-256 of what the public sees) and rebuilds only when it changed, serving
// the previous archive meanwhile. The archive is derived data: kept as a file
// in the platform's data directory (CIVICOS_TILES_DIR, else
// <CIVICOS_STATE_DIR or ./.civicos-state>/tiles whenever the platform keeps
// its state: CIVICOS_STATE set, or CIVICOS_STATE_DIR given) so a restart
// serves it at once; in memory only where there is no writable directory (an
// in-memory platform, CIVICOS_TILES_DIR=memory, or a directory that refuses
// writes) and rebuilt on first use. Never written into the JSON state snapshot.
//
// Built for 10⁶ sites: on file, a build writes the tile data zoom by zoom
// (each zoom in tile id order) to a spool file as it goes, then the header
// and directories followed by the spooled data to a temporary file, hashing
// as it writes (the ETag), and renames it into place, so neither the tiles
// nor the archive are ever one buffer. Requests read only the bytes they ask
// for, from an open handle of the build they started with (a rebuild renamed
// over the file does not change what an open handle reads; the old handle
// closes when its last reader is done).
//
// The same machinery builds an institution's own signed-in archive
// (institutionArchive(): its published sites as the requesting official may
// see them, restricted ones exact for its own officials and generalised for
// anyone without need, confidential never), served at
// /api/org/ministries/{id}/facilities/tiles.pmtiles.

import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { promises as fs, constants as fsc } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { listFacilities, type Viewer } from '@/lib/data/facilities';
import { onAudited } from '@/lib/events/outbox';
import { ArchiveBuilder, Compression, TileType, zxyToTileId, PMTilesReader, type WriteOptions, type RangeSource } from '@/lib/geo/pmtiles';
import { EXTENT } from '@/lib/geo/mvt';
import { BUFFER, TILE_FIELDS, TILE_LAYER, sitesTile, type TileSite } from './tiles';

export const ARCHIVE_TYPE = 'application/vnd.pmtiles';
export const ARCHIVE_FILE = 'facilities.pmtiles';

export interface ArchiveInfo {
  etag: string; fingerprint: string; builtAt: string; sites: number; tiles: number; contents: number; bytes: number; minZoom: number; maxZoom: number; ms: number;
  viewer: 'public' | 'institution';
  /** The institution whose own archive this is (viewer 'institution'). */
  institution?: string;
  /** Restricted sites at their exact position (an institution's own officials) or generalised. */
  positions?: 'exact' | 'generalised';
  /** Where the build is kept. */
  stored?: 'file' | 'memory';
}
/** A build held as one buffer (no writable directory, tests). */
export interface MemoryArchive { info: ArchiveInfo; bytes: Uint8Array; file?: undefined }
/** A build kept as a file and read by ranges from an open handle. */
interface OpenFile { path: string; fh: FileHandle; refs: number; retired: boolean }
export interface FileArchive { info: ArchiveInfo; file: OpenFile; bytes?: undefined }
export type ArchiveState = MemoryArchive | FileArchive;

interface Slot { state: ArchiveState | null; stale: boolean; loaded: boolean; building: Promise<ArchiveState> | null; timer: ReturnType<typeof setTimeout> | null; lastError?: string }

// Not a __civicos key: the archives' bytes must never go into the JSON state snapshot.
const g = globalThis as unknown as { __facilityTileArchive?: Slot; __facilityTileArchives?: Map<string, Slot> };
const newSlot = (): Slot => ({ state: null, stale: true, loaded: false, building: null, timer: null });
const slot = (): Slot => (g.__facilityTileArchive ??= newSlot());
const institutionSlots = () => (g.__facilityTileArchives ??= new Map());

/** The zoom range built: CIVICOS_TILES_ZOOMS="min-max" within 0–14, default 0–12. */
export function archiveZooms(env = process.env): [number, number] {
  const m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(env.CIVICOS_TILES_ZOOMS ?? '');
  if (!m) return [0, 12];
  const a = Math.min(14, Number(m[1])), b = Math.min(14, Number(m[2]));
  return a <= b ? [a, b] : [b, a];
}

/**
 * Where archive files live, or null to keep them in memory: CIVICOS_TILES_DIR
 * ("memory" keeps them in memory), else the platform's data directory
 * (CIVICOS_STATE_DIR, default ./.civicos-state) whenever the platform keeps
 * its state (CIVICOS_STATE set, or CIVICOS_STATE_DIR given).
 */
export function archiveDir(env = process.env): string | null {
  const t = env.CIVICOS_TILES_DIR?.trim();
  if (t) return t.toLowerCase() === 'memory' ? null : t;
  const mode = (env.CIVICOS_STATE ?? '').trim().toLowerCase();
  if ((mode && mode !== 'memory') || env.CIVICOS_STATE_DIR) return path.join(env.CIVICOS_STATE_DIR || path.join(process.cwd(), '.civicos-state'), 'tiles');
  return null;
}

/** The archive directory when it exists (or can be made) and takes writes, else null (in memory). */
async function writableDir(): Promise<string | null> {
  const dir = archiveDir();
  if (!dir) return null;
  try {
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.access(dir, fsc.W_OK);
    return dir;
  } catch { return null; }
}

/** Published sites as a member of the public may see them. */
export const publicSites = (): TileSite[] => listFacilities({}, { signedIn: false });

/** A digest of everything the public archive shows (and the zoom range), to tell whether it needs building again. */
export function fingerprint(sites: readonly TileSite[], zooms: [number, number]): string {
  const h = createHash('sha256').update(`civicos-facility-tiles-v1|${zooms.join('-')}|`);
  for (const s of [...sites].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    h.update(JSON.stringify([s.id, s.ids?.national, s.name, s.category, s.status, s.location.lng, s.location.lat, s.place.regionCode, s.place.region, s.ownerId, s.certification.state, !!s.generalised]));
    h.update('\n');
  }
  return h.digest('hex');
}

const lngToX = (lng: number, n: number) => ((lng + 180) / 360) * n;
const latToY = (lat: number, n: number) => {
  const phi = (Math.max(-85.0511287798066, Math.min(85.0511287798066, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
};

/** Sites by the tiles they appear in at zoom z (their own tile, and a neighbour when within its buffer). */
export function tilesAtZoom(sites: readonly TileSite[], z: number): Map<string, TileSite[]> {
  const n = 2 ** z, b = BUFFER / EXTENT, out = new Map<string, TileSite[]>();
  for (const s of sites) {
    const tx = lngToX(s.location.lng, n), ty = latToY(s.location.lat, n);
    const x = Math.min(n - 1, Math.floor(tx)), y = Math.min(n - 1, Math.floor(ty));
    const xs = [x], ys = [y];
    if (tx - x < b && x > 0) xs.push(x - 1);
    if (x + 1 - tx < b && x < n - 1) xs.push(x + 1);
    if (ty - y < b && y > 0) ys.push(y - 1);
    if (y + 1 - ty < b && y < n - 1) ys.push(y + 1);
    for (const xx of xs) for (const yy of ys) {
      const k = `${xx}/${yy}`;
      const a = out.get(k); if (a) a.push(s); else out.set(k, [s]);
    }
  }
  return out;
}

const yieldNow = () => new Promise<void>(r => setImmediate(r));

/**
 * The archive's tiles in tile id order, gzipped, one zoom at a time (only one
 * zoom's grouping is held; yields every few hundred tiles and between zooms
 * so requests keep being served).
 */
export async function* archiveTiles(sites: readonly TileSite[], zooms: [number, number]): AsyncGenerator<{ id: number; data: Uint8Array }> {
  for (let z = zooms[0]; z <= zooms[1]; z++) {
    const keys = [...tilesAtZoom(sites, z)].map(([k, list]) => { const [x, y] = k.split('/').map(Number) as [number, number]; return { id: zxyToTileId(z, x, y), x, y, list }; });
    keys.sort((a, b) => a.id - b.id);
    let i = 0;
    for (const k of keys) {
      const t = sitesTile(k.list, z, k.x, k.y);
      if (t.count) yield { id: k.id, data: new Uint8Array(gzipSync(t.bytes)) };
      if (++i % 512 === 0) await yieldNow();
    }
    await yieldNow();
  }
}

/** What an archive is of, and how it describes itself. */
export interface ArchiveSpec {
  sites: readonly TileSite[];
  zooms: [number, number];
  viewer: 'public' | 'institution';
  institution?: string;
  positions?: 'exact' | 'generalised';
  name?: string;
  description?: string;
}

const gz = (b: Uint8Array) => new Uint8Array(gzipSync(b));

function writeOptions(spec: ArchiveSpec, fp: string, builtAt: string): WriteOptions {
  const { sites, zooms } = spec;
  let w = 180, s = 90, e = -180, n = -90;
  for (const x of sites) { w = Math.min(w, x.location.lng); e = Math.max(e, x.location.lng); s = Math.min(s, x.location.lat); n = Math.max(n, x.location.lat); }
  const bounds: [number, number, number, number] = sites.length ? [w, s, e, n] : [-180, -85.0511, 180, 85.0511];
  return {
    tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, compress: gz,
    bounds, center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2, Math.max(zooms[0], Math.min(zooms[1], 6))], minZoom: zooms[0], maxZoom: zooms[1],
    metadata: {
      name: spec.name ?? 'National facility register', format: 'pbf', type: 'overlay', version: '1.0.0',
      description: spec.description ?? 'Published sites of the national facility register as the public sees them: restricted sites at their generalised position; confidential sites are not included.',
      attribution: 'National facility register (declared by the owning institutions)',
      vector_layers: [{ id: TILE_LAYER, description: 'Published sites (points)', minzoom: zooms[0], maxzoom: zooms[1], fields: TILE_FIELDS }],
      generated: builtAt, fingerprint: fp, sites: sites.length, viewer: spec.viewer,
      ...(spec.institution ? { institution: spec.institution, positions: spec.positions } : {}),
    },
  };
}

function infoOf(spec: ArchiveSpec, fp: string, builtAt: string, t0: number, b: ArchiveBuilder, size: number, etag: string, stored: 'file' | 'memory'): ArchiveInfo {
  return {
    etag, fingerprint: fp, builtAt, sites: spec.sites.length, tiles: b.addressed, contents: b.contents, bytes: size, minZoom: spec.zooms[0], maxZoom: spec.zooms[1], ms: Date.now() - t0,
    viewer: spec.viewer, ...(spec.institution ? { institution: spec.institution, positions: spec.positions } : {}), stored,
  };
}

/** Build an archive as one buffer. */
export async function buildMemoryArchive(spec: ArchiveSpec): Promise<MemoryArchive> {
  const t0 = Date.now(), builtAt = new Date().toISOString(), fp = fingerprint(spec.sites, spec.zooms);
  const b = new ArchiveBuilder(writeOptions(spec, fp, builtAt));
  const chunks: Uint8Array[] = [];
  for await (const t of archiveTiles(spec.sites, spec.zooms)) { const out = b.add(t.id, t.data); if (out) chunks.push(out); }
  const prefix = b.finish();
  const bytes = new Uint8Array(prefix.length + b.dataLength);
  bytes.set(prefix, 0);
  let o = prefix.length;
  for (const c of chunks) { bytes.set(c, o); o += c.length; }
  const etag = `"${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}"`;
  return { bytes, info: infoOf(spec, fp, builtAt, t0, b, bytes.length, etag, 'memory') };
}

/** Build the public archive from the sites as one buffer (tests, and where there is no writable directory). */
export async function buildArchive(sites: readonly TileSite[] = publicSites(), zooms = archiveZooms()): Promise<MemoryArchive> {
  return buildMemoryArchive({ sites, zooms, viewer: 'public' });
}

const COPY_CHUNK = 1 << 20;
let seq = 0;

/**
 * Build an archive into `file` without holding it: tile data spooled to a
 * file as it is made, then the header and directories and the spooled data
 * written to a temporary file (hashed as written) and renamed into place.
 * The build record goes beside it (`<file>.json`, also by rename).
 */
export async function buildFileArchive(spec: ArchiveSpec, file: string): Promise<FileArchive> {
  const t0 = Date.now(), builtAt = new Date().toISOString(), fp = fingerprint(spec.sites, spec.zooms);
  const b = new ArchiveBuilder({ ...writeOptions(spec, fp, builtAt), digest: d => createHash('sha256').update(d).digest('base64') });
  const tag = `${process.pid}.${Date.now().toString(36)}.${++seq}`;
  const spool = `${file}.${tag}.data.tmp`, tmp = `${file}.${tag}.tmp`;
  try {
    const out = await fs.open(spool, 'w', 0o600);
    try {
      let pending: Uint8Array[] = [], size = 0;
      const flush = async () => { if (!size) return; await out.write(Buffer.concat(pending, size)); pending = []; size = 0; };
      for await (const t of archiveTiles(spec.sites, spec.zooms)) {
        const add = b.add(t.id, t.data);
        if (add) { pending.push(add); size += add.length; if (size >= COPY_CHUNK) await flush(); }
      }
      await flush();
    } finally { await out.close(); }
    const prefix = b.finish();
    const hash = createHash('sha256');
    const dst = await fs.open(tmp, 'w', 0o600);
    try {
      await dst.write(prefix); hash.update(prefix);
      const src = await fs.open(spool, 'r');
      try {
        const buf = Buffer.allocUnsafe(COPY_CHUNK);
        for (let pos = 0; ;) {
          const { bytesRead } = await src.read(buf, 0, COPY_CHUNK, pos);
          if (!bytesRead) break;
          const part = buf.subarray(0, bytesRead);
          await dst.write(part); hash.update(part); pos += bytesRead;
        }
      } finally { await src.close(); }
      await dst.sync();
    } finally { await dst.close(); }
    const etag = `"${hash.digest('hex').slice(0, 32)}"`;
    const info = infoOf(spec, fp, builtAt, t0, b, prefix.length + b.dataLength, etag, 'file');
    await fs.rename(tmp, file);
    // Opened straight after the rename: the handle reads this build whatever replaces the file later.
    const fh = await fs.open(file, 'r');
    await fs.writeFile(`${file}.json.${tag}.tmp`, JSON.stringify(info, null, 2), { mode: 0o600 });
    await fs.rename(`${file}.json.${tag}.tmp`, `${file}.json`);
    return { info, file: { path: file, fh, refs: 0, retired: false } };
  } finally {
    await fs.rm(spool, { force: true }).catch(() => {});
    await fs.rm(tmp, { force: true }).catch(() => {});
  }
}

const handleSource = (fh: FileHandle): RangeSource => async (offset, length) => {
  const b = Buffer.alloc(length);
  const { bytesRead } = await fh.read(b, 0, length, offset);
  return new Uint8Array(b.buffer, b.byteOffset, bytesRead);
};

/** A kept build, read from its file: its record, and a check that the file is that build (size, and the fingerprint in its metadata). */
async function loadFile(file: string): Promise<FileArchive | null> {
  let fh: FileHandle | null = null;
  try {
    const info = JSON.parse(await fs.readFile(`${file}.json`, 'utf8')) as ArchiveInfo;
    fh = await fs.open(file, 'r');
    if ((await fh.stat()).size !== info.bytes) throw new Error('size');
    if ((await new PMTilesReader(handleSource(fh)).metadata()).fingerprint !== info.fingerprint) throw new Error('fingerprint');
    return { info: { ...info, stored: 'file' }, file: { path: file, fh, refs: 0, retired: false } };
  } catch {
    await fh?.close().catch(() => {});
    return null;
  }
}

/** Stop using a build: its file handle closes once no request is still reading it. */
function retire(st: ArchiveState | null): void {
  if (!st?.file) return;
  st.file.retired = true;
  if (st.file.refs === 0) void st.file.fh.close().catch(() => {});
}

/** Build into the directory when there is a writable one, else in memory. */
async function buildKept(spec: ArchiveSpec, fileName: string, s: Slot): Promise<ArchiveState> {
  const dir = await writableDir();
  if (dir) {
    try {
      const st = await buildFileArchive(spec, path.join(dir, fileName));
      s.lastError = undefined;
      return st;
    } catch (e) { s.lastError = `archive not saved, kept in memory: ${(e as Error).message}`; }
  }
  return buildMemoryArchive(spec);
}

/** Build (once at a time), keep and replace the previous build. */
function rebuildSlot(s: Slot, spec: () => ArchiveSpec, fileName: string): Promise<ArchiveState> {
  s.building ??= (async () => {
    try {
      const st = await buildKept(spec(), fileName, s);
      const old = s.state;
      s.state = st; s.stale = false;
      if (old !== st) retire(old);
      return st;
    } finally { s.building = null; }
  })();
  return s.building;
}

const publicSpec = (): ArchiveSpec => ({ sites: publicSites(), zooms: archiveZooms(), viewer: 'public' });

/**
 * The current public archive: the one kept when nothing changed since; after
 * a change, the same one when the sites' fingerprint is unchanged, else a new
 * build (the previous one is served while it builds, when there is one).
 */
export async function facilityArchive(): Promise<ArchiveState> {
  const s = slot();
  if (!s.loaded) {
    s.loaded = true;
    const dir = archiveDir();
    if (!s.state && dir) s.state = await loadFile(path.join(dir, ARCHIVE_FILE));
  }
  if (s.state && !s.stale) return s.state;
  if (s.state) {
    const fp = fingerprint(publicSites(), archiveZooms());
    if (fp === s.state.info.fingerprint) { s.stale = false; return s.state; }
    if (s.building) return s.state;
    void rebuildSlot(s, publicSpec, ARCHIVE_FILE).catch(e => { s.lastError = (e as Error).message; });
    return s.state;
  }
  return rebuildSlot(s, publicSpec, ARCHIVE_FILE);
}

/** Whether a viewer sees an institution's restricted sites exactly (as viewFacility() decides). */
export const positionsFor = (institution: string, v: Viewer): 'exact' | 'generalised' =>
  v.signedIn && (!v.institution || v.institution === institution) ? 'exact' : 'generalised';

/** The file an institution's own archive is kept in. */
export const institutionFile = (institution: string, positions: 'exact' | 'generalised') =>
  `institution-${institution.replace(/[^A-Za-z0-9_-]/g, '_')}-${positions}.pmtiles`;

/**
 * An institution's own archive: its published sites as the viewer may see
 * them (viewFacility(): restricted sites exact for its own officials and the
 * whole government, generalised for anyone without need; confidential
 * categories are never in the register). Built on first request and again
 * when the sites it shows have changed (checked after any facility change);
 * an official's own archive is never served out of date. Kept as a file like
 * the public archive (owner-only permissions), else in memory.
 */
export async function institutionArchive(institution: string, v: Viewer): Promise<ArchiveState> {
  const positions = positionsFor(institution, v);
  const key = `${institution}|${positions}`;
  const slots = institutionSlots();
  let s = slots.get(key);
  if (!s) { s = newSlot(); slots.set(key, s); }
  const viewer: Viewer = positions === 'exact' ? { institution, signedIn: true } : { signedIn: false };
  const zooms = archiveZooms();
  const sites = () => listFacilities({ ministryId: institution, state: 'published' }, viewer);
  if (!s.loaded) {
    s.loaded = true;
    const dir = archiveDir();
    if (!s.state && dir) s.state = await loadFile(path.join(dir, institutionFile(institution, positions)));
  }
  if (s.state && !s.stale) return s.state;
  if (s.state && fingerprint(sites(), zooms) === s.state.info.fingerprint) { s.stale = false; return s.state; }
  return rebuildSlot(s, () => ({
    sites: sites(), zooms, viewer: 'institution', institution, positions,
    name: `Facility register: ${institution}`,
    description: positions === 'exact'
      ? 'Published sites of one institution as its own officials see them: restricted sites at their exact position (not for publication); confidential sites are not included.'
      : 'Published sites of one institution: restricted sites at their generalised position; confidential sites are not included.',
  }), institutionFile(institution, positions));
}

/** What the archive is now (no build). */
export function archiveStatus(): { info: ArchiveInfo | null; stale: boolean; building: boolean; error?: string; file: string | null } {
  const s = slot(), dir = archiveDir();
  return { info: s.state?.info ?? null, stale: s.stale, building: !!s.building, ...(s.lastError ? { error: s.lastError } : {}), file: dir ? path.join(dir, ARCHIVE_FILE) : null };
}

/** Mark the archive stale and rebuild after a quiet period (several changes in a row build once). Institution archives are checked again on their next request. */
export function scheduleRebuild(ms = Number(process.env.CIVICOS_TILES_DEBOUNCE_MS) || 5000): void {
  const s = slot();
  s.stale = true;
  for (const x of institutionSlots().values()) x.stale = true;
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => { s.timer = null; void facilityArchive().catch(e => { s.lastError = (e as Error).message; }); }, ms);
  (s.timer as { unref?: () => void }).unref?.();
}

/** Forget the archives and close their files (tests). */
export function resetArchive(): void {
  const s = g.__facilityTileArchive;
  if (s?.timer) clearTimeout(s.timer);
  retire(s?.state ?? null);
  for (const x of g.__facilityTileArchives?.values() ?? []) retire(x.state);
  g.__facilityTileArchive = undefined;
  g.__facilityTileArchives = undefined;
}

// Publication changes reach the archive through the audit hook.
onAudited('facility-tile-archive', e => { if (e.outcome === 'ok' && e.action.startsWith('facility.')) scheduleRebuild(); });

// ── Reading a build by ranges ─────────────────────────────────────────────

function release(f: OpenFile): void {
  f.refs--;
  if (f.retired && f.refs === 0) void f.fh.close().catch(() => {});
}

/** Bytes start…end (inclusive) of a build: only those bytes are read from its file. */
export async function readRange(st: ArchiveState, start: number, end: number): Promise<Uint8Array> {
  if (st.bytes) return st.bytes.subarray(start, end + 1);
  const f = st.file;
  f.refs++;
  try {
    const len = end - start + 1, b = Buffer.alloc(len);
    let got = 0;
    while (got < len) {
      const { bytesRead } = await f.fh.read(b, got, len - got, start + got);
      if (!bytesRead) break;
      got += bytesRead;
    }
    return new Uint8Array(b.buffer, b.byteOffset, got);
  } finally { release(f); }
}

/** A range source over a build (PMTilesReader, tests). */
export const stateSource = (st: ArchiveState): RangeSource => (offset, length) =>
  length <= 0 || offset >= st.info.bytes ? Promise.resolve(new Uint8Array(0)) : readRange(st, offset, Math.min(st.info.bytes, offset + length) - 1);

/** Ranges up to this size are answered from one read; larger ones (and the whole file) are streamed. */
export const STREAM_ABOVE = 4 << 20;

/** Bytes start…end of a build as a stream, read from its file a chunk at a time. */
export function streamRange(st: ArchiveState, start: number, end: number): ReadableStream<Uint8Array> {
  if (st.bytes) { const part = st.bytes.subarray(start, end + 1); return new ReadableStream({ start(c) { c.enqueue(part); c.close(); } }); }
  const f = st.file;
  f.refs++;
  let pos = start, done = false;
  const finish = () => { if (!done) { done = true; release(f); } };
  return new ReadableStream<Uint8Array>({
    async pull(c) {
      try {
        if (pos > end) { finish(); c.close(); return; }
        const n = Math.min(COPY_CHUNK, end - pos + 1), b = Buffer.alloc(n);
        const { bytesRead } = await f.fh.read(b, 0, n, pos);
        if (!bytesRead) { finish(); c.close(); return; }
        pos += bytesRead;
        c.enqueue(new Uint8Array(b.buffer, b.byteOffset, bytesRead));
      } catch (e) { finish(); c.error(e); }
    },
    cancel() { finish(); },
  });
}

/**
 * The answer to a GET or HEAD for a build: the whole archive (200), one byte
 * range (206; only those bytes are read), 416 for a range outside it, 304 for
 * a matching If-None-Match. If-Range with another build's ETag gets the whole
 * current archive. Large answers are streamed from the file.
 */
export async function archiveResponse(req: { headers: Headers }, st: ArchiveState, head: boolean, extra: Record<string, string> = {}): Promise<Response> {
  const { info } = st, size = info.bytes;
  const common: Record<string, string> = {
    'content-type': ARCHIVE_TYPE, 'accept-ranges': 'bytes', etag: info.etag, 'last-modified': new Date(info.builtAt).toUTCString(),
    'access-control-expose-headers': 'etag, content-range, content-length', ...extra,
  };
  const ifRange = req.headers.get('if-range');
  const r = ifRange && ifRange !== info.etag ? null : parseRange(req.headers.get('range'), size);
  if (r === 'unsatisfiable') return new Response(null, { status: 416, headers: { ...common, 'content-range': `bytes */${size}` } });
  if (req.headers.get('if-none-match') === info.etag && !r) return new Response(null, { status: 304, headers: common });
  const start = r ? r.start : 0, end = r ? r.end : size - 1, len = Math.max(0, end - start + 1);
  const headers = { ...common, 'content-length': String(len), ...(r ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}) };
  const body = head || len === 0 ? null : len <= STREAM_ABOVE ? await readRange(st, start, end) : streamRange(st, start, end);
  return new Response(body as BodyInit | null, { status: r ? 206 : 200, headers });
}

/** One satisfiable byte range of a Range header ("bytes=a-b", "bytes=a-", "bytes=-n"), or null (whole file), or 'unsatisfiable'. */
export function parseRange(h: string | null, size: number): { start: number; end: number } | null | 'unsatisfiable' {
  if (!h) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim());
  if (!m || (!m[1] && !m[2])) return null; // several ranges or not bytes: send the whole file
  let start: number, end: number;
  if (!m[1]) { const n = Number(m[2]); start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
  if (start >= size || end < start) return 'unsatisfiable';
  return { start, end };
}
