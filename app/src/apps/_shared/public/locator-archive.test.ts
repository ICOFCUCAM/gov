import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { geoMercator } from 'd3-geo';
import { archiveSites, locatorSite, placeOn } from './locator-archive';
import { encodeTile, toTile } from '@/lib/geo/mvt';
import { Compression, TileType, writeArchive } from '@/lib/geo/pmtiles';
import type { SiteLocations } from './locator-types';

describe('the locator reading the public tile archive', () => {
  it('places sites exactly as the server\'s Mercator fit does', () => {
    const p = geoMercator().fitExtent([[10, 10], [310, 170]], { type: 'MultiPoint', coordinates: [[33.9, -4.7], [41.9, 5.0]] } as never);
    const m = { k: p.scale(), tx: p.translate()[0], ty: p.translate()[1] };
    for (const [lng, lat] of [[36.817, -1.286], [39.668, -4.04], [34, 4.9]] as const) {
      const [x, y] = placeOn(m, lng, lat), q = p([lng, lat])!;
      expect(Math.abs(x - q[0])).toBeLessThan(0.06); expect(Math.abs(y - q[1])).toBeLessThan(0.06);
    }
  });

  it('keeps only the institution\'s sites that are open to visit, generalised ones marked approximate', () => {
    const m = { k: 1000, tx: 0, ty: 0 };
    const f = (props: Record<string, string | boolean>) => ({ key: String(props.id), lng: 36.8, lat: -1.28, props });
    expect(locatorSite(f({ id: 'FAC-1', owner: 'health', status: 'operational', name: 'Clinic', category: 'health', categoryLabel: 'Health facility', region: 'Nairobi' }), 'health', m)).toMatchObject({ id: 'FAC-1', name: 'Clinic', region: 'Nairobi', approx: false });
    expect(locatorSite(f({ id: 'FAC-2', owner: 'police', status: 'operational' }), 'health', m)).toBeNull();
    expect(locatorSite(f({ id: 'FAC-3', owner: 'health', status: 'planned' }), 'health', m)).toBeNull();
    expect(locatorSite(f({ id: 'FAC-4', owner: 'health', status: 'operational', generalised: true }), 'health', m)!.approx).toBe(true);
  });

  it('reads every site of the institution from an archive by ranges', async () => {
    const pts = Array.from({ length: 300 }, (_, i) => ({ id: `FAC-${i}`, lng: 34 + (i % 30) * 0.25, lat: -4 + Math.floor(i / 30) * 0.8, owner: i % 3 ? 'health' : 'police' }));
    const tiles = [] as { z: number; x: number; y: number; data: Uint8Array }[];
    for (let z = 0; z <= 8; z++) {
      const by = new Map<string, typeof pts>();
      for (const p of pts) { const x = Math.floor(((p.lng + 180) / 360) * 2 ** z), y = Math.floor(((1 - Math.log(Math.tan((p.lat * Math.PI) / 180) + 1 / Math.cos((p.lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z); const k = `${x}/${y}`; by.set(k, [...(by.get(k) ?? []), p]); }
      for (const [k, list] of by) {
        const [x, y] = k.split('/').map(Number) as [number, number];
        tiles.push({ z, x, y, data: new Uint8Array(gzipSync(encodeTile([{ name: 'facilities', points: list.map(p => { const [tx, ty] = toTile(p.lng, p.lat, z, x, y); return { x: tx, y: ty, properties: { id: p.id, name: p.id, owner: p.owner, status: 'operational', category: 'health', region: 'R' } }; }) }]))) });
      }
    }
    const archive = writeArchive(tiles, { tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, compress: b => new Uint8Array(gzipSync(b)), metadata: {}, bounds: [34, -4, 41.25, 3.2], minZoom: 0, maxZoom: 8 });
    const fake = (async (_u: string, init?: RequestInit) => {
      const [, s, e] = /bytes=(\d+)-(\d+)/.exec((init!.headers as Record<string, string>).range!)!;
      return new Response(archive.slice(Number(s), Number(e) + 1), { status: 206, headers: { etag: '"x"' } });
    }) as unknown as typeof fetch;
    const d: SiteLocations = { institution: true, institutionId: 'health', sites: [], total: 200, tabCategories: [], map: { w: 320, h: 180, land: '', country: 'K', credit: '', mercator: { k: 1000, tx: 0, ty: 0 } } };
    const got = await archiveSites(d, fake);
    expect(got).toHaveLength(200);
    expect(new Set(got.map(s => s.id)).size).toBe(200);
    expect(got.every(s => Number(s.id.slice(4)) % 3 !== 0)).toBe(true);
  });
});
