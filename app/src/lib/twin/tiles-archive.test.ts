import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { archiveStatus, archiveZooms, buildArchive, facilityArchive, fingerprint, parseRange, publicSites, resetArchive, scheduleRebuild, tilesAtZoom } from './tiles-archive';
import { PMTilesReader, bufferSource, Compression, TileType, deserializeHeader, ROOT_BYTES } from '@/lib/geo/pmtiles';
import { decodeTile, fromTile } from '@/lib/geo/mvt';
import { resetFacilities, proposeFacility, actOnFacility, listFacilities, viewFacility, getFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';
import { GET, HEAD } from '@/app/api/twin/tiles/facilities.pmtiles/route';

const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});

let school: string, police: string;
const env = { dir: process.env.CIVICOS_TILES_DIR, zooms: process.env.CIVICOS_TILES_ZOOMS };
let tmp: string;
beforeEach(async () => {
  resetFacilities(); resetArchive();
  tmp = mkdtempSync(path.join(os.tmpdir(), 'civicos-tiles-'));
  process.env.CIVICOS_TILES_DIR = tmp;
  process.env.CIVICOS_TILES_ZOOMS = '0-10';
  applyNation({ iso3: 'KEN', regions: [] });
  const [m] = listMinistries();
  const add = async (name: string, category: string, lng: number, lat: number) => {
    const r = await proposeFacility(m!.id, { name, category, lng, lat, method: 'device-gps' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
    return r.facility.id;
  };
  school = await add('Nairobi Primary', 'school', 36.81724, -1.28638);
  police = await add('Central Police Station', 'police', 36.82194, -1.28333);
  await add('Mombasa Clinic', 'health', 39.6682, -4.0435);
});
afterEach(() => {
  resetArchive();
  process.env.CIVICOS_TILES_DIR = env.dir; process.env.CIVICOS_TILES_ZOOMS = env.zooms;
  if (env.dir === undefined) delete process.env.CIVICOS_TILES_DIR;
  if (env.zooms === undefined) delete process.env.CIVICOS_TILES_ZOOMS;
  rmSync(tmp, { recursive: true, force: true });
});

describe('the facility PMTiles archive', () => {
  it('holds every zoom of the public view, header and directory valid', async () => {
    const { bytes, info } = await buildArchive();
    const h = deserializeHeader(bytes);
    expect(h).toMatchObject({ specVersion: 3, tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, minZoom: 0, maxZoom: 10, clustered: true });
    expect(h.rootDirectoryOffset + h.rootDirectoryLength).toBeLessThanOrEqual(ROOT_BYTES);
    expect(h.minLon).toBeCloseTo(36.817, 2); expect(h.maxLon).toBeCloseTo(39.668, 2);
    expect(info).toMatchObject({ sites: 3, minZoom: 0, maxZoom: 10, viewer: 'public' });
    expect(info.tiles).toBeGreaterThan(11); // one at least on every zoom; Nairobi and Mombasa part deeper down
    const r = new PMTilesReader(bufferSource(bytes));
    expect(await r.metadata()).toMatchObject({ name: 'National facility register', viewer: 'public', sites: 3 });
    for (let z = 0; z <= 10; z++) {
      const t = tileOf(36.81724, -1.28638, z);
      const layer = decodeTile((await r.tile(z, t.x, t.y))!)[0]!;
      expect(layer.name).toBe('facilities');
      expect(layer.features.map(f => f.properties.id)).toContain(school);
    }
    expect(await r.tile(10, 0, 0)).toBeNull();
  });

  it('places restricted sites exactly as viewFacility does for a visitor who is not signed in', async () => {
    const { bytes } = await buildArchive();
    const r = new PMTilesReader(bufferSource(bytes));
    const anon = viewFacility(getFacility(police)!, { signedIn: false });
    expect(anon.generalised).toBe(true);
    const z = 10, t = tileOf(anon.location.lng, anon.location.lat, z);
    const f = decodeTile((await r.tile(z, t.x, t.y))!)[0]!.features.find(x => x.properties.id === police)!;
    expect(f.properties.generalised).toBe(true);
    const [lng, lat] = fromTile(f.geometry[0]![0], f.geometry[0]![1], z, t.x, t.y);
    expect(Math.abs(lng - anon.location.lng)).toBeLessThan(0.001);
    expect(Math.abs(lat - anon.location.lat)).toBeLessThan(0.001);
    // and never at the exact position
    const exact = getFacility(police)!.location;
    expect(Math.abs(lng - exact.lng) + Math.abs(lat - exact.lat)).toBeGreaterThan(0.005);
    // what the archive is built from is the public list
    expect(publicSites().map(s => s.location)).toEqual(listFacilities({}, { signedIn: false }).map(s => s.location));
  });

  it('puts a site near a tile edge in the neighbour too (the tile buffer)', () => {
    const near = { ...publicSites()[0]!, location: { lng: 0.0001, lat: 10, method: 'typed' as const } };
    const t = tilesAtZoom([near], 4);
    expect([...t.keys()].sort()).toEqual(['7/7', '8/7'].sort());
  });

  it('rebuilds after publication changes, debounced through the audit hook, and keeps the file', async () => {
    const first = await facilityArchive();
    expect(existsSync(path.join(tmp, 'facilities.pmtiles'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(tmp, 'facilities.pmtiles.json'), 'utf8')).etag).toBe(first.info.etag);
    // unchanged: the same archive
    expect((await facilityArchive()).info.etag).toBe(first.info.etag);
    await actOnFacility(school, { action: 'withdraw', reason: 'closed' }, 'Signer B');
    expect(archiveStatus().stale).toBe(true);
    // the request after the change serves the previous build while the new one is made
    const during = await facilityArchive();
    expect(during.info.etag).toBe(first.info.etag);
    await new Promise(r => setTimeout(r, 50));
    while (archiveStatus().building) await new Promise(r => setTimeout(r, 20));
    const after = await facilityArchive();
    expect(after.info.etag).not.toBe(first.info.etag);
    expect(after.info.sites).toBe(2);
    expect(after.info.fingerprint).toBe(fingerprint(publicSites(), archiveZooms()));
    // a restart reads the file instead of building
    resetArchive();
    expect((await facilityArchive()).info.etag).toBe(after.info.etag);
    scheduleRebuild(1);
    await new Promise(r => setTimeout(r, 30));
    while (archiveStatus().building) await new Promise(r => setTimeout(r, 20));
    expect(archiveStatus().stale).toBe(false);
  });

  it('serves byte ranges', async () => {
    const full = await GET(new NextRequest('http://localhost/api/twin/tiles/facilities.pmtiles'));
    expect(full.status).toBe(200);
    expect(full.headers.get('accept-ranges')).toBe('bytes');
    const size = Number(full.headers.get('content-length'));
    const etag = full.headers.get('etag')!;
    const part = await GET(new NextRequest('http://localhost/api/twin/tiles/facilities.pmtiles', { headers: { range: 'bytes=0-126' } }));
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe(`bytes 0-126/${size}`);
    const head = new Uint8Array(await part.arrayBuffer());
    expect(head.length).toBe(127);
    expect(deserializeHeader(head).specVersion).toBe(3);
    expect((await GET(new NextRequest('http://localhost/x', { headers: { range: `bytes=${size + 5}-` } }))).status).toBe(416);
    expect((await GET(new NextRequest('http://localhost/x', { headers: { range: 'bytes=0-9', 'if-range': '"old"' } }))).status).toBe(200);
    expect((await GET(new NextRequest('http://localhost/x', { headers: { 'if-none-match': etag } }))).status).toBe(304);
    const h = await HEAD(new NextRequest('http://localhost/x'));
    expect(h.headers.get('content-length')).toBe(String(size));
  });

  it('parses ranges', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=95-200', 100)).toEqual({ start: 95, end: 99 });
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(archiveZooms({ CIVICOS_TILES_ZOOMS: '3-14' } as never)).toEqual([3, 14]);
    expect(archiveZooms({} as never)).toEqual([0, 12]);
  });
});
