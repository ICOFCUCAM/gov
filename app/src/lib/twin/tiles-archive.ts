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
// beside the platform state (CIVICOS_TILES_DIR, else CIVICOS_STATE_DIR/tiles
// when CIVICOS_STATE=file) so a restart serves it at once, else in memory and
// rebuilt on first use. Never written into the JSON state snapshot.

import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listFacilities } from '@/lib/data/facilities';
import { onAudited } from '@/lib/events/outbox';
import { Compression, TileType, deserializeHeader, writeArchive } from '@/lib/geo/pmtiles';
import { EXTENT } from '@/lib/geo/mvt';
import { BUFFER, TILE_FIELDS, TILE_LAYER, sitesTile, type TileSite } from './tiles';

export const ARCHIVE_TYPE = 'application/vnd.pmtiles';
export const ARCHIVE_FILE = 'facilities.pmtiles';

export interface ArchiveInfo { etag: string; fingerprint: string; builtAt: string; sites: number; tiles: number; contents: number; bytes: number; minZoom: number; maxZoom: number; ms: number; viewer: 'public' }
interface ArchiveState { bytes: Uint8Array; info: ArchiveInfo }
interface Slot { state: ArchiveState | null; stale: boolean; loaded: boolean; building: Promise<ArchiveState> | null; timer: ReturnType<typeof setTimeout> | null; lastError?: string }

// Not a __civicos key: the archive's bytes must never go into the JSON state snapshot.
const g = globalThis as unknown as { __facilityTileArchive?: Slot };
const slot = (): Slot => (g.__facilityTileArchive ??= { state: null, stale: true, loaded: false, building: null, timer: null });

/** The zoom range built: CIVICOS_TILES_ZOOMS="min-max" within 0–14, default 0–12. */
export function archiveZooms(env = process.env): [number, number] {
  const m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(env.CIVICOS_TILES_ZOOMS ?? '');
  if (!m) return [0, 12];
  const a = Math.min(14, Number(m[1])), b = Math.min(14, Number(m[2]));
  return a <= b ? [a, b] : [b, a];
}

/** Where the archive file lives, or null to keep it in memory only. */
export function archiveDir(env = process.env): string | null {
  if (env.CIVICOS_TILES_DIR) return env.CIVICOS_TILES_DIR;
  if ((env.CIVICOS_STATE ?? '').toLowerCase() === 'file') return path.join(env.CIVICOS_STATE_DIR || path.join(process.cwd(), '.civicos-state'), 'tiles');
  return null;
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

/** Build the public archive from the sites (yields between zoom levels so requests keep being served). */
export async function buildArchive(sites: readonly TileSite[] = publicSites(), zooms = archiveZooms()): Promise<ArchiveState> {
  const t0 = Date.now();
  const tiles: { z: number; x: number; y: number; data: Uint8Array }[] = [];
  for (let z = zooms[0]; z <= zooms[1]; z++) {
    for (const [k, list] of tilesAtZoom(sites, z)) {
      const [x, y] = k.split('/').map(Number) as [number, number];
      const t = sitesTile(list, z, x, y);
      if (t.count) tiles.push({ z, x, y, data: new Uint8Array(gzipSync(t.bytes)) });
    }
    await yieldNow();
  }
  let w = 180, s = 90, e = -180, n = -90;
  for (const x of sites) { w = Math.min(w, x.location.lng); e = Math.max(e, x.location.lng); s = Math.min(s, x.location.lat); n = Math.max(n, x.location.lat); }
  const bounds: [number, number, number, number] = sites.length ? [w, s, e, n] : [-180, -85.0511, 180, 85.0511];
  const fp = fingerprint(sites, zooms);
  const builtAt = new Date().toISOString();
  const bytes = writeArchive(tiles, {
    tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, compress: b => new Uint8Array(gzipSync(b)),
    bounds, center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2, Math.max(zooms[0], Math.min(zooms[1], 6))], minZoom: zooms[0], maxZoom: zooms[1],
    metadata: {
      name: 'National facility register', format: 'pbf', type: 'overlay', version: '1.0.0',
      description: 'Published sites of the national facility register as the public sees them: restricted sites at their generalised position; confidential sites are not included.',
      attribution: 'National facility register (declared by the owning institutions)',
      vector_layers: [{ id: TILE_LAYER, description: 'Published sites (points)', minzoom: zooms[0], maxzoom: zooms[1], fields: TILE_FIELDS }],
      generated: builtAt, fingerprint: fp, sites: sites.length, viewer: 'public',
    },
  });
  const etag = `"${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}"`;
  const contents = deserializeHeader(bytes).numTileContents;
  return { bytes, info: { etag, fingerprint: fp, builtAt, sites: sites.length, tiles: tiles.length, contents, bytes: bytes.length, minZoom: zooms[0], maxZoom: zooms[1], ms: Date.now() - t0, viewer: 'public' } };
}

async function saveFile(st: ArchiveState): Promise<void> {
  const dir = archiveDir();
  if (!dir) return;
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, ARCHIVE_FILE), tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, st.bytes);
  await fs.rename(tmp, file);
  await fs.writeFile(`${file}.json.tmp`, JSON.stringify(st.info, null, 2));
  await fs.rename(`${file}.json.tmp`, `${file}.json`);
}

async function loadFile(): Promise<ArchiveState | null> {
  const dir = archiveDir();
  if (!dir) return null;
  try {
    const file = path.join(dir, ARCHIVE_FILE);
    const info = JSON.parse(await fs.readFile(`${file}.json`, 'utf8')) as ArchiveInfo;
    const bytes = new Uint8Array(await fs.readFile(file));
    return bytes.length === info.bytes ? { bytes, info } : null;
  } catch { return null; }
}

/** Build (once at a time), keep and save. */
function rebuild(): Promise<ArchiveState> {
  const s = slot();
  s.building ??= (async () => {
    try {
      const st = await buildArchive();
      s.state = st; s.stale = false; s.lastError = undefined;
      await saveFile(st).catch(e => { s.lastError = `archive not saved: ${(e as Error).message}`; });
      return st;
    } finally { s.building = null; }
  })();
  return s.building;
}

/**
 * The current public archive: the one kept when nothing changed since; after
 * a change, the same one when the sites' fingerprint is unchanged, else a new
 * build (the previous one is served while it builds, when there is one).
 */
export async function facilityArchive(): Promise<ArchiveState> {
  const s = slot();
  if (!s.loaded) { s.loaded = true; s.state ??= await loadFile(); }
  if (s.state && !s.stale) return s.state;
  if (s.state) {
    const fp = fingerprint(publicSites(), archiveZooms());
    if (fp === s.state.info.fingerprint) { s.stale = false; return s.state; }
    if (s.building) return s.state;
    void rebuild().catch(e => { s.lastError = (e as Error).message; });
    return s.state;
  }
  return rebuild();
}

/** What the archive is now (no build). */
export function archiveStatus(): { info: ArchiveInfo | null; stale: boolean; building: boolean; error?: string; file: string | null } {
  const s = slot(), dir = archiveDir();
  return { info: s.state?.info ?? null, stale: s.stale, building: !!s.building, ...(s.lastError ? { error: s.lastError } : {}), file: dir ? path.join(dir, ARCHIVE_FILE) : null };
}

/** Mark the archive stale and rebuild after a quiet period (several changes in a row build once). */
export function scheduleRebuild(ms = Number(process.env.CIVICOS_TILES_DEBOUNCE_MS) || 5000): void {
  const s = slot();
  s.stale = true;
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(() => { s.timer = null; void facilityArchive().catch(e => { s.lastError = (e as Error).message; }); }, ms);
  (s.timer as { unref?: () => void }).unref?.();
}

/** Forget the archive (tests). */
export function resetArchive(): void {
  const s = g.__facilityTileArchive;
  if (s?.timer) clearTimeout(s.timer);
  g.__facilityTileArchive = undefined;
}

// Publication changes reach the archive through the audit hook.
onAudited('facility-tile-archive', e => { if (e.outcome === 'ok' && e.action.startsWith('facility.')) scheduleRebuild(); });

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
