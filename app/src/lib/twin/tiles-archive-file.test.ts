// The facility archive kept as a file and served by ranges (architecture
// review G4): a large synthetic register built into a file without one
// buffer, read back by ranges, the in-memory fallback, and a build that
// replaces the file while an earlier one is still being read.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  archiveDir, archiveResponse, buildFileArchive, buildMemoryArchive, facilityArchive, readRange, resetArchive, stateSource, streamRange, STREAM_ABOVE,
  type ArchiveSpec, type ArchiveState,
} from './tiles-archive';
import { PMTilesReader, deserializeHeader, bufferSource } from '@/lib/geo/pmtiles';
import { decodeTile } from '@/lib/geo/mvt';
import type { TileSite } from './tiles';
import { resetFacilities } from '@/lib/data/facilities';

/** A register of n sites spread over Kenya, or over the world (a fixed pseudo-random sequence). */
function synthetic(n: number, seed = 7, world = false): TileSite[] {
  let s = seed;
  const rnd = () => { // mulberry32
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: TileSite[] = [];
  for (let i = 0; i < n; i++) {
    const lng = world ? -179 + rnd() * 358 : 34 + rnd() * 7, lat = world ? -60 + rnd() * 130 : -4.5 + rnd() * 9;
    out.push({
      id: `FAC-${String(i + 1).padStart(7, '0')}`, ids: {}, name: `Site ${i + 1}`, category: i % 3 ? 'school' : 'health', status: 'operating',
      location: { lng, lat, method: 'device-gps' }, place: { regionCode: 'KE-30', region: 'Nairobi' }, ownerId: 'min-education',
      certification: { state: 'certified' },
    } as unknown as TileSite);
  }
  return out;
}

const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});

let tmp: string;
const saved = { dir: process.env.CIVICOS_TILES_DIR, zooms: process.env.CIVICOS_TILES_ZOOMS };
beforeEach(() => { resetArchive(); resetFacilities(); tmp = mkdtempSync(path.join(os.tmpdir(), 'civicos-tiles-file-')); });
afterEach(() => {
  resetArchive();
  for (const [k, v] of [['CIVICOS_TILES_DIR', saved.dir], ['CIVICOS_TILES_ZOOMS', saved.zooms]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(tmp, { recursive: true, force: true });
});

describe('the facility archive as a file', () => {
  it('builds a large register (25,000 sites over the world, 8,000+ tiles) into a file, read back by ranges only', async () => {
    const sites = synthetic(25_000, 7, true);
    const spec: ArchiveSpec = { sites, zooms: [0, 7], viewer: 'public' };
    const file = path.join(tmp, 'big.pmtiles');
    const st = await buildFileArchive(spec, file);
    try {
      expect(st.bytes).toBeUndefined();
      expect(st.info).toMatchObject({ stored: 'file', sites: 25_000, minZoom: 0, maxZoom: 7 });
      expect(statSync(file).size).toBe(st.info.bytes);
      // no spool or temporary file left behind; the build record beside it
      expect(readdirSync(tmp).sort()).toEqual(['big.pmtiles', 'big.pmtiles.json']);
      expect(JSON.parse(readFileSync(`${file}.json`, 'utf8')).etag).toBe(st.info.etag);
      const h = deserializeHeader(await readRange(st, 0, 126));
      expect(h.numAddressedTiles).toBe(st.info.tiles);
      expect(h.numAddressedTiles).toBeGreaterThan(8_000);
      expect(h.tileDataOffset + h.tileDataLength).toBe(st.info.bytes);
      // the whole file hashes to its ETag
      const { createHash } = await import('node:crypto');
      expect(`"${createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 32)}"`).toBe(st.info.etag);
      // tiles read through the range source match the sites
      const r = new PMTilesReader(stateSource(st));
      const probe = sites[4321]!;
      for (const z of [0, 4, 7]) {
        const t = tileOf(probe.location.lng, probe.location.lat, z);
        const layer = decodeTile((await r.tile(z, t.x, t.y))!)[0]!;
        if (z === 7) expect(layer.features.map(f => f.properties.id)).toContain(probe.id);
        else expect(layer.features.length).toBeGreaterThan(0);
      }
      // the same tiles as a build held in memory
      const mem = await buildMemoryArchive(spec);
      const m = new PMTilesReader(bufferSource(mem.bytes));
      expect(deserializeHeader(mem.bytes)).toMatchObject({ numAddressedTiles: h.numAddressedTiles, numTileEntries: h.numTileEntries, numTileContents: h.numTileContents, tileDataLength: h.tileDataLength });
      const t6 = tileOf(probe.location.lng, probe.location.lat, 6);
      expect(await r.rawTile(6, t6.x, t6.y)).toEqual(await m.rawTile(6, t6.x, t6.y));
    } finally { await st.file.fh.close(); }
  }, 120_000);

  it('answers ranges from the file, streams large answers and keeps If-Range, 304 and 416', async () => {
    const st = await buildFileArchive({ sites: synthetic(15_000, 3), zooms: [0, 7], viewer: 'public' }, path.join(tmp, 'a.pmtiles'));
    try {
      const whole = readFileSync(path.join(tmp, 'a.pmtiles'));
      const size = st.info.bytes;
      const req = (h: Record<string, string> = {}) => new NextRequest('http://localhost/x', { headers: h });
      const full = await archiveResponse(req(), st, false);
      expect(full.status).toBe(200);
      expect(full.headers.get('content-length')).toBe(String(size));
      expect(Buffer.from(await full.arrayBuffer()).equals(whole)).toBe(true);
      const part = await archiveResponse(req({ range: 'bytes=1000-1999' }), st, false);
      expect(part.status).toBe(206);
      expect(part.headers.get('content-range')).toBe(`bytes 1000-1999/${size}`);
      expect(Buffer.from(await part.arrayBuffer()).equals(whole.subarray(1000, 2000))).toBe(true);
      const tail = await archiveResponse(req({ range: 'bytes=-100' }), st, false);
      expect(Buffer.from(await tail.arrayBuffer()).equals(whole.subarray(size - 100))).toBe(true);
      // answers above STREAM_ABOVE are streamed from the file a chunk at a time
      expect(STREAM_ABOVE).toBeGreaterThan(1 << 20);
      const streamed = new Response(streamRange(st, 10, size - 1));
      expect(Buffer.from(await streamed.arrayBuffer()).equals(whole.subarray(10))).toBe(true);
      expect(st.file.refs).toBe(0); // the reader let the file go
      expect((await archiveResponse(req({ range: 'bytes=0-9', 'if-range': st.info.etag }), st, false)).status).toBe(206);
      expect((await archiveResponse(req({ range: 'bytes=0-9', 'if-range': '"older"' }), st, true)).status).toBe(200);
      expect((await archiveResponse(req({ 'if-none-match': st.info.etag }), st, false)).status).toBe(304);
      expect((await archiveResponse(req({ range: `bytes=${size}-` }), st, false)).status).toBe(416);
      const head = await archiveResponse(req({ range: 'bytes=0-126' }), st, true);
      expect(head.headers.get('content-length')).toBe('127');
      expect(await head.text()).toBe('');
    } finally { await st.file.fh.close(); }
  }, 120_000);

  it('keeps serving the build a reader started with after a new build replaces the file', async () => {
    const file = path.join(tmp, 'facilities.pmtiles');
    const one = await buildFileArchive({ sites: synthetic(500, 1), zooms: [0, 6], viewer: 'public' }, file);
    const oneBytes = readFileSync(file);
    const two = await buildFileArchive({ sites: synthetic(800, 2), zooms: [0, 6], viewer: 'public' }, file);
    try {
      expect(two.info.etag).not.toBe(one.info.etag);
      expect(Buffer.from(await readRange(one, 0, one.info.bytes - 1)).equals(oneBytes)).toBe(true);
      expect(Buffer.from(await readRange(two, 0, two.info.bytes - 1)).equals(readFileSync(file))).toBe(true);
    } finally { await one.file.fh.close(); await two.file.fh.close(); }
  });

  it('serves the public archive from the data directory, and a restart reads it back', async () => {
    process.env.CIVICOS_TILES_DIR = tmp; process.env.CIVICOS_TILES_ZOOMS = '0-6';
    const st: ArchiveState = await facilityArchive();
    expect(st.info.stored).toBe('file');
    expect(existsSync(path.join(tmp, 'facilities.pmtiles'))).toBe(true);
    resetArchive();
    const again = await facilityArchive();
    expect(again.info.etag).toBe(st.info.etag);
    expect(again.bytes).toBeUndefined();
    // a damaged file is not served: it is built again
    resetArchive();
    writeFileSync(path.join(tmp, 'facilities.pmtiles'), 'not an archive');
    const rebuilt = await facilityArchive();
    expect(rebuilt.info.stored).toBe('file');
    expect(deserializeHeader(await readRange(rebuilt, 0, 126)).specVersion).toBe(3);
  });

  it('keeps the archive in memory where there is no writable directory', async () => {
    process.env.CIVICOS_TILES_ZOOMS = '0-4';
    process.env.CIVICOS_TILES_DIR = 'memory';
    expect((await facilityArchive()).info.stored).toBe('memory');
    resetArchive();
    const blocker = path.join(tmp, 'a-file');
    writeFileSync(blocker, 'x');
    process.env.CIVICOS_TILES_DIR = path.join(blocker, 'tiles'); // under a file: cannot be made
    const st = await facilityArchive();
    expect(st.info.stored).toBe('memory');
    expect(st.bytes).toBeInstanceOf(Uint8Array);
  });

  it('finds the data directory', () => {
    expect(archiveDir({ CIVICOS_TILES_DIR: '/srv/tiles' } as never)).toBe('/srv/tiles');
    expect(archiveDir({ CIVICOS_TILES_DIR: 'memory' } as never)).toBeNull();
    expect(archiveDir({ CIVICOS_STATE: 'file', CIVICOS_STATE_DIR: '/srv/state' } as never)).toBe(path.join('/srv/state', 'tiles'));
    expect(archiveDir({ CIVICOS_STATE: 'postgres', CIVICOS_STATE_DIR: '/srv/state' } as never)).toBe(path.join('/srv/state', 'tiles'));
    expect(archiveDir({ CIVICOS_STATE: 'supabase' } as never)).toBe(path.join(process.cwd(), '.civicos-state', 'tiles'));
    expect(archiveDir({} as never)).toBeNull();
  });
});
