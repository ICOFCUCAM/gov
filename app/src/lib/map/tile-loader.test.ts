import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { TileCache, chooseTiles, childrenOf, featuresOf, lngLatToTile, loadTiles, mergeFeatures, tileFetcher, tilesForBounds, viewBounds, TILE_POINT_LIMIT, type TileAddress } from './tile-loader';
import { encodeTile, toTile } from '@/lib/geo/mvt';
import { Compression, TileType, writeArchive } from '@/lib/geo/pmtiles';

const tileWith = (t: TileAddress, pts: { id: string; lng: number; lat: number }[]) =>
  encodeTile([{ name: 'facilities', points: pts.map(p => { const [x, y] = toTile(p.lng, p.lat, t.z, t.x, t.y); return { x, y, properties: { id: p.id, name: p.id } }; }) }]);

describe('which tiles a map needs', () => {
  it('covers a box with the tiles at a zoom', () => {
    expect(lngLatToTile(0, 0, 1)).toEqual([1, 1]);
    expect(lngLatToTile(-180, 85, 2)).toEqual([0, 0]);
    expect(lngLatToTile(180, -85.1, 2)).toEqual([3, 3]);
    const kenya: [number, number, number, number] = [33.9, -4.7, 41.9, 5.0];
    const t = tilesForBounds(kenya, 6);
    expect(t.length).toBe(4);
    expect(t.every(a => a.z === 6)).toBe(true);
    // across the antimeridian (Fiji): both sides
    const fiji = tilesForBounds([177, -19, -179, -16], 5);
    expect(new Set(fiji.map(a => a.x))).toEqual(new Set([31, 0]));
  });

  it('picks the lowest zoom that places points within half a pixel, within the tile limit', () => {
    const b: [number, number, number, number] = [33.9, -4.7, 41.9, 5.0];
    // a 640 px map of ~8° is ~80 px a degree: zoom 4
    expect(chooseTiles(b, 80).z).toBe(4);
    // zoomed in eight times: zoom 7
    expect(chooseTiles(b, 640).z).toBe(7);
    // bounded by maxZoom and maxTiles
    expect(chooseTiles(b, 1e6, { maxZoom: 12 }).z).toBeLessThanOrEqual(12);
    const many = chooseTiles([-180, -85, 180, 85], 1000, { maxTiles: 16 });
    expect(many.tiles.length).toBeLessThanOrEqual(16);
    expect(childrenOf({ z: 3, x: 2, y: 5 })).toEqual([{ z: 4, x: 4, y: 10 }, { z: 4, x: 5, y: 10 }, { z: 4, x: 4, y: 11 }, { z: 4, x: 5, y: 11 }]);
  });

  it('works out what a map shows from its projection and zoom', () => {
    // A plain equirectangular map of [30, 40] × [-5, 5] on 1000 × 1000 px.
    const m = { width: 1000, height: 1000, invert: (x: number, y: number) => [30 + x / 100, 5 - y / 100] as [number, number], projectRaw: (lng: number, lat: number) => [(lng - 30) * 100, (5 - lat) * 100] as [number, number] };
    const v = viewBounds(m)!;
    expect(v.pxPerDegree).toBeCloseTo(100, 5);
    expect(v.bounds[0]).toBeLessThanOrEqual(30); expect(v.bounds[2]).toBeGreaterThanOrEqual(40);
    // zoom 4 into the top-left quarter-ish
    const z = viewBounds(m, { z: 4, tx: 0, ty: 0 })!;
    expect(z.pxPerDegree).toBeCloseTo(400, 5);
    expect(z.bounds[2]).toBeLessThan(33);
    expect(z.bounds[3]).toBeGreaterThanOrEqual(5);
  });
});

describe('loading tiles', () => {
  it('decodes features to positions and merges tiles without duplicates', () => {
    const t = { z: 8, x: 153, y: 128 };
    const f = featuresOf(tileWith(t, [{ id: 'FAC-1', lng: 36.8, lat: -1.28 }, { id: 'FAC-2', lng: 36.9, lat: -1.3 }]), t, 'facilities');
    expect(f.map(x => x.key)).toEqual(['FAC-1', 'FAC-2']);
    expect(Math.abs(f[0]!.lng - 36.8)).toBeLessThan(0.001);
    expect(Math.abs(f[0]!.lat + 1.28)).toBeLessThan(0.001);
    expect(featuresOf(tileWith(t, [{ id: 'x', lng: 36.8, lat: -1.28 }]), t, 'other')).toEqual([]);
    expect(mergeFeatures([f, [f[1]!, { ...f[0]!, key: 'FAC-3' }]]).map(x => x.key)).toEqual(['FAC-1', 'FAC-2', 'FAC-3']);
  });

  it('fetches from the live route, caches, and replaces a cut-short tile by its children', async () => {
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      const [z, x, y] = /(\d+)\/(\d+)\/(\d+)\.mvt/.exec(url)!.slice(1).map(Number) as [number, number, number];
      const t = { z, x, y };
      if (z === 2) return new Response(tileWith(t, [{ id: 'cut', lng: 36.8, lat: -1.28 }]), { headers: { 'x-truncated': 'true' } });
      return new Response(tileWith(t, [{ id: `site-${z}-${x}-${y}`, lng: -180 + ((x + 0.5) / 2 ** z) * 360, lat: 0.0001 - y * 0 + (y < 2 ** (z - 1) ? 10 : -10) }]));
    }) as unknown as typeof fetch;
    const fetchTile = tileFetcher({ kind: 'xyz', url: '/api/twin/tiles/facilities/{z}/{x}/{y}.mvt' }, fake);
    const cache = new TileCache(8);
    const r = await loadTiles([{ z: 2, x: 2, y: 1 }], { fetch: fetchTile, cache, layer: 'facilities', maxZoom: 14 });
    expect(r.truncated).toBe(false);
    expect(r.features.map(f => f.key).sort()).toEqual(['site-3-4-2', 'site-3-4-3', 'site-3-5-2', 'site-3-5-3']);
    const n = calls.length;
    await loadTiles([{ z: 2, x: 2, y: 1 }], { fetch: fetchTile, cache, layer: 'facilities', maxZoom: 14 });
    expect(calls.length).toBe(n);
    // a new version fetches again, with the version in the address
    await loadTiles([{ z: 3, x: 4, y: 2 }], { fetch: fetchTile, cache, layer: 'facilities', maxZoom: 14, version: 'v2' });
    expect(calls[calls.length - 1]).toMatch(/\?v=v2$/);
    expect(TILE_POINT_LIMIT).toBe(50_000);
  });

  it('reads the same features from a PMTiles archive over range requests', async () => {
    const t = { z: 6, x: 38, y: 32 };
    const archive = writeArchive([{ ...t, data: new Uint8Array(gzipSync(tileWith(t, [{ id: 'FAC-9', lng: 36.8, lat: -1.28 }]))) }], {
      tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, compress: b => new Uint8Array(gzipSync(b)), metadata: {}, bounds: [33, -5, 42, 5],
    });
    const fake = (async (_u: string, init?: RequestInit) => {
      const [, s, e] = /bytes=(\d+)-(\d+)/.exec((init!.headers as Record<string, string>).range!)!;
      return new Response(archive.slice(Number(s), Number(e) + 1), { status: 206, headers: { etag: '"a"' } });
    }) as unknown as typeof fetch;
    const fetchTile = tileFetcher({ kind: 'pmtiles', url: '/api/twin/tiles/facilities.pmtiles' }, fake);
    const r = await loadTiles([t, { z: 6, x: 0, y: 0 }], { fetch: fetchTile, cache: new TileCache(), layer: 'facilities', maxZoom: 12 });
    expect(r.features.map(f => f.key)).toEqual(['FAC-9']);
  });
});
