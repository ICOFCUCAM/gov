import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { applyNation } from '@/lib/nation/registry';
import { resetTwin, syncRegister } from './register';
import { CONFORMANCE } from './ogc';
import { CRS84, CRS_CONFORMANCE, collectionCrs, readCrsParam, bboxToCrs84, featureInCrs, contentCrs } from './ogc-crs';
import { GET as itemsRoute } from '@/app/api/twin/ogc/collections/[collectionId]/items/route';
import { GET as itemRoute } from '@/app/api/twin/ogc/collections/[collectionId]/items/[featureId]/route';
import { GET as collectionRoute } from '@/app/api/twin/ogc/collections/[collectionId]/route';

const EPSG = (c: number) => `http://www.opengis.net/def/crs/EPSG/0/${c}`;
const get = (path: string) => new NextRequest(`https://civic.example${path}`);
const props = <T extends object>(p: T) => ({ params: Promise.resolve(p) });
const ok = <T,>(r: T | { error: string } | undefined): T => { if (!r || (typeof r === 'object' && 'error' in r)) throw new Error(String((r as { error?: string })?.error)); return r as T; };

describe('OGC API – Features Part 2: coordinate systems by reference', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('declares the conformance class and offers CRS84, EPSG:4326, EPSG:3857 and the nation\'s national grids', async () => {
    expect(CONFORMANCE).toEqual(expect.arrayContaining(CRS_CONFORMANCE));
    const list = collectionCrs();
    expect(list[0]).toBe(CRS84);
    expect(list).toEqual(expect.arrayContaining([EPSG(4326), EPSG(3857), EPSG(21037), EPSG(4210)]));
    expect(list).not.toContain(EPSG(27700));
    const c = await (await collectionRoute(get('/api/twin/ogc/collections/subdivisions'), props({ collectionId: 'subdivisions' }))).json();
    expect(c).toMatchObject({ storageCrs: CRS84, crs: list });
    // Another nation gets its own grids.
    applyNation({ configured: true, stateName: 'United Kingdom', iso3: 'GBR', regions: [] });
    expect(collectionCrs()).toContain(EPSG(27700));
    expect(collectionCrs()).not.toContain(EPSG(21037));
  });

  it('reads crs as a URI or safe CURIE, and refuses a system the collection does not offer', () => {
    expect(readCrsParam(null, 'crs')).toBeUndefined();
    expect(ok(readCrsParam(CRS84, 'crs')).uri).toBe(CRS84);
    expect(ok(readCrsParam('[EPSG:4326]', 'crs')).uri).toBe(EPSG(4326));
    expect(readCrsParam(EPSG(27700), 'crs')).toMatchObject({ error: expect.stringContaining('crs must be one of') });
    expect(readCrsParam('nonsense', 'bbox-crs')).toMatchObject({ error: expect.stringContaining('bbox-crs') });
  });

  it('converts positions with each system\'s axis order: EPSG:4326 latitude first, grids easting first', () => {
    const f = { type: 'Feature', geometry: { type: 'Point', coordinates: [36.81724, -1.28638] } };
    const latLon = featureInCrs(f, ok(readCrsParam(EPSG(4326), 'crs')));
    expect(latLon.geometry!.coordinates).toEqual([-1.28638, 36.81724]);
    const merc = featureInCrs(f, ok(readCrsParam(EPSG(3857), 'crs'))).geometry!.coordinates as number[];
    expect(merc[0]).toBeCloseTo(4_098_476, -1);
    expect(merc[1]).toBeCloseTo(-143_208, -1);
    // Arc 1960 / UTM zone 37S, the grid the site importer reads: back to the same position.
    const grid = ok(readCrsParam(EPSG(21037), 'crs'));
    const en = featureInCrs(f, grid).geometry!.coordinates as [number, number];
    expect(en[0]).toBeGreaterThan(200_000); expect(en[0]).toBeLessThan(300_000);
    expect(en[1]).toBeGreaterThan(9_800_000);
    const back = grid.toCrs84(en);
    expect(back[0]).toBeCloseTo(36.81724, 5); expect(back[1]).toBeCloseTo(-1.28638, 5);
  });

  it('reads bbox in bbox-crs as the CRS84 box around it', () => {
    expect(bboxToCrs84('-1.5,36.6,-1.1,37.1', ok(readCrsParam(EPSG(4326), 'bbox-crs')))).toBe('36.6,-1.5,37.1,-1.1');
    const m = bboxToCrs84('4070000,-170000,4130000,-120000', ok(readCrsParam(EPSG(3857), 'bbox-crs'))) as string;
    const [x0, y0, x1, y1] = m.split(',').map(Number);
    expect(x0).toBeCloseTo(36.56, 1); expect(x1).toBeCloseTo(37.10, 1); expect(y0).toBeLessThan(y1!);
    expect(bboxToCrs84('3,2,1,0', ok(readCrsParam(EPSG(4326), 'bbox-crs')))).toMatchObject({ error: expect.any(String) });
    expect(bboxToCrs84('1,2,3,4', undefined)).toBe('1,2,3,4');
  });

  it('serves items in the system asked for, with Content-Crs and links that keep crs and bbox-crs', async () => {
    const plain = await itemsRoute(get('/api/twin/ogc/collections/subdivisions/items?limit=2'), props({ collectionId: 'subdivisions' }));
    expect(plain.headers.get('content-crs')).toBe(contentCrs(undefined));
    const p = await plain.json();
    const q = `crs=${encodeURIComponent(EPSG(4326))}&bbox-crs=${encodeURIComponent(EPSG(4326))}&bbox=-1.45,36.65,-1.15,37.1&limit=50`;
    const r = await itemsRoute(get(`/api/twin/ogc/collections/subdivisions/items?${q}`), props({ collectionId: 'subdivisions' }));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-crs')).toBe(`<${EPSG(4326)}>`);
    const body = await r.json();
    expect(body.features.map((f: { id: string }) => f.id)).toContain('KE-30');
    // Latitudes first: Kenya's are between -5 and 5, its longitudes above 33.
    const first = JSON.stringify(body.features[0].geometry.coordinates).match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(Math.abs(first[0]!)).toBeLessThan(6);
    expect(first[1]).toBeGreaterThan(33);
    const self = new URL(body.links.find((l: { rel: string }) => l.rel === 'self').href);
    expect(self.searchParams.get('crs')).toBe(EPSG(4326));
    expect(self.searchParams.get('bbox-crs')).toBe(EPSG(4326));
    expect(self.searchParams.get('bbox')).toBe('-1.45,36.65,-1.15,37.1');
    expect(p.features[0].geometry).toBeTruthy();
    const bad = await itemsRoute(get(`/api/twin/ogc/collections/subdivisions/items?crs=${encodeURIComponent(EPSG(27700))}`), props({ collectionId: 'subdivisions' }));
    expect(bad.status).toBe(400);
    const one = await itemRoute(get(`/api/twin/ogc/collections/subdivisions/items/KE-30?crs=${encodeURIComponent(EPSG(21037))}`), props({ collectionId: 'subdivisions', featureId: 'KE-30' }));
    expect(one.headers.get('content-crs')).toBe(`<${EPSG(21037)}>`);
    const xs = JSON.stringify((await one.json()).geometry.coordinates).match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(xs[0]).toBeGreaterThan(200_000);
    expect(xs[1]).toBeGreaterThan(9_800_000);
  });
});
