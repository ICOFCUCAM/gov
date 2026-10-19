import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applyNation } from '@/lib/nation/registry';
import { loadNationGeography } from '@/lib/map/geography';
import { resetBoundaries, proposeBoundaries, publishBoundaries } from '@/lib/data/boundaries';
import { decodeTile, encodeTile, fromTile } from '@/lib/geo/mvt';
import { boundaryTile, boundaryTileJson, boundaryVersionKey, clipRing, parseBoundaryTile, resetBoundaryTiles, ringArea2, DISTRICT_MIN_ZOOM } from './boundary-tiles';
import { GET as tileGET } from '@/app/api/twin/tiles/boundaries/[z]/[x]/[y]/route';
import { GET as jsonGET } from '@/app/api/twin/tiles/boundaries/route';

const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});
const layers = (b: Uint8Array) => Object.fromEntries(decodeTile(b).map(l => [l.name, l]));

beforeEach(() => {
  resetBoundaries(); resetBoundaryTiles();
  applyNation({ iso3: 'KEN', regions: [] });
});

describe('boundary vector tiles', () => {
  it('cuts the regions in force into a tile as oriented polygons, districts from their zoom', async () => {
    const z = 6, t = tileOf(36.82, -1.29, z);
    const r = await boundaryTile(z, t.x, t.y);
    const l = layers(r.bytes);
    expect(l.regions!.features.length).toBeGreaterThan(3);
    const nairobi = l.regions!.features.find(f => f.properties.code === 'KE-30')!;
    expect(nairobi).toBeTruthy();
    expect(nairobi.type).toBe(3);
    expect(nairobi.properties).toMatchObject({ name: expect.any(String), level: 1 });
    expect(ringArea2(nairobi.rings![0]!)).toBeGreaterThan(0); // exterior ring: positive area (MVT 2.1)
    // Nairobi's outline lies where Nairobi is
    const [lng, lat] = fromTile(nairobi.rings![0]![0]![0], nairobi.rings![0]![0]![1], z, t.x, t.y);
    expect(Math.abs(lng - 36.82)).toBeLessThan(0.5); expect(Math.abs(lat + 1.29)).toBeLessThan(0.5);
    expect(l.districts?.features.length ?? 0).toBeGreaterThan(0);
    const low = tileOf(36.82, -1.29, DISTRICT_MIN_ZOOM - 1);
    expect(layers((await boundaryTile(DISTRICT_MIN_ZOOM - 1, low.x, low.y)).bytes).districts).toBeUndefined();
    // the same tile again comes from the cache with the same ETag
    expect((await boundaryTile(z, t.x, t.y)).etag).toBe(r.etag);
    // far from the nation: an empty tile
    expect((await boundaryTile(6, 0, 0)).bytes.length).toBe(0);
  });

  it('marks disputed territory as disputed unless the nation chose a point of view', async () => {
    const z = 6, t = tileOf(35.3, 4.8, z); // the Ilemi Triangle
    const neutral = layers((await boundaryTile(z, t.x, t.y)).bytes).disputed!.features.find(f => f.properties.name === 'Ilemi Triangle')!;
    expect(neutral.properties).toMatchObject({ disputed: true, shownAs: 'disputed' });
    expect(String(neutral.properties.text)).toMatch(/drawn as disputed; the platform takes no side/);
    const before = (await boundaryTile(z, t.x, t.y)).etag;
    // A point of view chosen in setup (here one that gives the area to Kenya) changes the tiles and their ETag.
    applyNation({ iso3: 'KEN', regions: [], map: { worldview: 'FR' } as never });
    const viewed = await boundaryTile(z, t.x, t.y);
    expect(viewed.etag).not.toBe(before);
    const f = layers(viewed.bytes).disputed!.features.find(x => x.properties.name === 'Ilemi Triangle')!;
    expect(f.properties).toMatchObject({ disputed: false, shownAs: 'KEN' });
    const tj = await boundaryTileJson('https://x');
    expect(tj.worldview).toBe('FR');
  });

  it('drops its cache when a new boundary version comes into force', async () => {
    const z = 6, t = tileOf(36.82, -1.29, z);
    const first = await boundaryTile(z, t.x, t.y);
    const geo = await loadNationGeography('KEN', [], 'full');
    const fc = { type: 'FeatureCollection', features: geo!.units.filter(u => u.geometry).map(u => ({ type: 'Feature', properties: { shapeName: u.name, shapeISO: u.code! }, geometry: structuredClone(u.geometry) })) };
    const source = { publisher: 'Survey of Kenya', licence: 'Open Government Licence', year: '2024' };
    // A version published for a date still to come changes nothing yet.
    const later = await proposeBoundaries({ level: 1, text: JSON.stringify(fc), source, validFrom: '2999-01-01' }, 'Officer A');
    if ('error' in later) throw new Error(later.error);
    publishBoundaries(later.version!.id, 'Signer B');
    expect((await boundaryTile(z, t.x, t.y)).etag).toBe(first.etag);
    const now = await proposeBoundaries({ level: 1, text: JSON.stringify(fc), source, validFrom: '2024-01-01' }, 'Officer A');
    if ('error' in now) throw new Error(now.error);
    const key = await boundaryVersionKey();
    publishBoundaries(now.version!.id, 'Signer B');
    expect(await boundaryVersionKey()).not.toBe(key);
    const second = await boundaryTile(z, t.x, t.y);
    expect(second.etag).not.toBe(first.etag);
    const tj = await boundaryTileJson('https://x');
    expect(tj.boundaryVersion).toMatchObject({ regions: 'version 2 in force from 2024-01-01' });
    expect(tj.attribution).toMatch(/Survey of Kenya/);
  }, 120_000);

  it('serves tiles and TileJSON with ETags and 304', async () => {
    const t = tileOf(36.82, -1.29, 5);
    const ctx = { params: Promise.resolve({ z: '5', x: String(t.x), y: `${t.y}.mvt` }) };
    const r = await tileGET(new NextRequest('http://localhost/x'), ctx);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile');
    expect(Number(r.headers.get('x-feature-count'))).toBeGreaterThan(0);
    const etag = r.headers.get('etag')!;
    expect((await tileGET(new NextRequest('http://localhost/x', { headers: { 'if-none-match': etag } }), ctx)).status).toBe(304);
    expect((await tileGET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ z: '15', x: '0', y: '0' }) })).status).toBe(404);
    const j = await (await jsonGET(new NextRequest('http://localhost/api/twin/tiles/boundaries'))).json();
    expect(j).toMatchObject({ tilejson: '3.0.0', tiles: ['http://localhost/api/twin/tiles/boundaries/{z}/{x}/{y}.mvt'], minzoom: 0, maxzoom: 14, worldview: 'neutral' });
    expect(j.vector_layers.map((l: { id: string }) => l.id)).toEqual(['regions', 'districts', 'disputed']);
    // a GIS client's key is checked like on the facility tiles
    expect((await tileGET(new NextRequest('http://localhost/x', { headers: { authorization: 'Bearer civ_nope' } }), ctx)).status).toBe(401);
  });

  it('simplifies per zoom without gaps or overlaps between neighbours, and keeps low-zoom tiles small', async () => {
    // A tile wholly inside Kenya: its regions (and its districts) together cover it exactly, as without simplification.
    const z = 8, t = tileOf(37.0, -0.9, z);
    const square = 2 * (4096 + 128) ** 2;
    const cover = (b: Uint8Array, layer: string) => layers(b)[layer]!.features.reduce((s, f) => s + f.rings!.reduce((a, r) => a + ringArea2(r), 0), 0);
    const simple = await boundaryTile(z, t.x, t.y), full = await boundaryTile(z, t.x, t.y, { simplify: false });
    for (const layer of ['regions', 'districts']) {
      expect(Math.abs(cover(full.bytes, layer) - square) / square).toBeLessThan(0.002);
      expect(Math.abs(cover(simple.bytes, layer) - square) / square).toBeLessThan(0.002);
    }
    // Every unit of the full tile is still there.
    for (const layer of ['regions', 'districts']) {
      const codes = (b: Uint8Array) => new Set(layers(b)[layer]!.features.map(f => f.properties.code));
      expect(codes(simple.bytes)).toEqual(codes(full.bytes));
    }
    // A whole-nation tile carries far fewer points than the full shapes cut to it.
    let small = 0, big = 0;
    for (const zz of [3, 5]) {
      const tt = tileOf(37.9, 0.2, zz);
      small += (await boundaryTile(zz, tt.x, tt.y)).bytes.length;
      big += (await boundaryTile(zz, tt.x, tt.y, { simplify: false })).bytes.length;
    }
    expect(small).toBeLessThan(big * 0.5);
    const tj = await boundaryTileJson('https://x');
    expect(tj.simplification).toMatchObject({ toleranceTileUnits: expect.any(Number) });
    expect(tj.simplification!.sharedVertices).toBeLessThan(tj.simplification!.vertices);
  }, 120_000);

  it('clips rings to the tile and encodes polygons and lines', () => {
    const sq: [number, number][] = [[-100, -100], [5000, -100], [5000, 5000], [-100, 5000]];
    const c = clipRing(sq, -64, 4160);
    expect([...c].sort()).toEqual([[-64, -64], [4160, -64], [4160, 4160], [-64, 4160]].sort());
    expect(ringArea2(c)).toBe(2 * 4224 * 4224);
    expect(clipRing([[5000, 5000], [6000, 5000], [6000, 6000]], -64, 4160)).toEqual([]);
    const b = encodeTile([{ name: 'x', points: [], shapes: [
      { id: 1, type: 'polygon', rings: [[[0, 0], [10, 0], [10, 10], [0, 10]], [[2, 2], [2, 8], [8, 8], [8, 2]]], properties: { a: 'b' } },
      { id: 2, type: 'line', rings: [[[0, 0], [5, 5], [9, 1]]], properties: {} },
    ] }]);
    const [l] = decodeTile(b);
    expect(l!.features[0]).toMatchObject({ id: 1, type: 3, rings: [[[0, 0], [10, 0], [10, 10], [0, 10]], [[2, 2], [2, 8], [8, 8], [8, 2]]], properties: { a: 'b' } });
    expect(l!.features[1]).toMatchObject({ id: 2, type: 2, rings: [[[0, 0], [5, 5], [9, 1]]] });
    expect(parseBoundaryTile('3', '1', '2.pbf')).toEqual({ z: 3, x: 1, y: 2 });
    expect(parseBoundaryTile('3', '8', '2')).toBeNull();
  });
});
