import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { items, item, collectionInfo, landing, parseBbox, parseDatetime, bboxOf, CONFORMANCE, DATETIME_AS_OF } from './ogc';
import { boundaryItems, boundariesInfo } from './ogc-boundaries';
import { facilityItems, facilitiesInfo } from './ogc-facilities';
import { applyNation } from '@/lib/nation/registry';
import { loadNationGeography } from '@/lib/map/geography';
import { resetBoundaries, proposeBoundaries, publishBoundaries, getBoundaryVersion } from '@/lib/data/boundaries';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mapping = { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } as const;
const B = 'https://gov.example/api/twin/ogc';

describe('the twin as OGC API – Features', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,939370,2009\nNairobi City,3138369,2009\nKisumu,968909,2009\n' });
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1208333,2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\n' });
  });

  it('describes itself: landing links, conformance and a collection with an extent', async () => {
    expect(landing(B).links.map(l => l.rel)).toEqual(['self', 'service-desc', 'conformance', 'data', 'related', 'related']);
    expect(CONFORMANCE).toContain('http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson');
    const c = await collectionInfo(B);
    expect(c.extent?.spatial.bbox[0]![0]).toBeGreaterThan(33);
    expect(c.extent?.spatial.bbox[0]![2]).toBeLessThan(43);
  });

  it('serves every subdivision as GeoJSON with observed values true at datetime', async () => {
    const all = ok(await items(B, { limit: '1000' }));
    expect(all.numberMatched).toBe(47);
    const nairobi = all.features.find(f => f.id === 'KE-30')!;
    expect(nairobi.properties).toMatchObject({ name: 'Nairobi City', twinEntity: 'place:KE-30', operationalRegion: true });
    expect(nairobi.properties.observations).toMatchObject({ population: { value: 4397073, unit: '{persons}', validFrom: '2019-01-01', source: 'Census' } });
    const then = ok(await item(B, 'KE-30', '2015-06-01T00:00:00Z'))!;
    expect((then.properties.observations as Record<string, { value: number }>).population!.value).toBe(3138369);
    expect(all.features.find(f => f.id === 'KE-01')?.properties.observations).toEqual({});
  });

  it('pages, filters by bbox and refuses malformed parameters', async () => {
    const p1 = ok(await items(B, { limit: '10' }));
    expect(p1.numberReturned).toBe(10);
    expect(p1.links.find(l => l.rel === 'next')?.href).toContain('offset=10');
    const box = ok(await items(B, { bbox: '36.6,-1.45,37.1,-1.15', limit: '100' }));
    expect(box.features.map(f => f.id)).toContain('KE-30');
    expect(box.numberMatched).toBeLessThan(10);
    expect(parseBbox('1,2,3')).toEqual({ error: expect.any(String) });
    expect(parseDatetime('not a date')).toEqual({ error: expect.any(String) });
    expect(parseDatetime('2019-01-01T00:00:00Z/..')).toMatch(/^\d{4}/);
  });
});

describe('subdivisions follow the boundaries every map draws', () => {
  beforeEach(async () => {
    resetTwin(); resetBoundaries();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('serves the published version in force, not the bundled shapes', async () => {
    const geo = await loadNationGeography('KEN', [], 'full');
    const fc = { type: 'FeatureCollection', features: geo!.units.filter(u => u.geometry).map(u => ({ type: 'Feature', properties: { shapeName: u.name, shapeISO: u.code! }, geometry: structuredClone(u.geometry) })) };
    // The authority's Nairobi is drawn a little smaller than the bundled one.
    const shrink = (a: unknown): unknown => (Array.isArray(a) && typeof a[0] === 'number' ? [36.8 + ((a[0] as number) - 36.8) * 0.98, -1.29 + ((a[1] as number) + 1.29) * 0.98] : Array.isArray(a) ? a.map(shrink) : a);
    const nbo = fc.features.find(f => f.properties.shapeISO === 'KE-30')!;
    nbo.geometry = { ...nbo.geometry!, coordinates: shrink(nbo.geometry!.coordinates) } as typeof nbo.geometry;
    const bundled = ok(await item(B, 'KE-30', null))!;
    expect(bundled.geometry).not.toEqual(nbo.geometry);
    const r = await proposeBoundaries({ level: 1, text: JSON.stringify(fc), source: { publisher: 'Survey of Kenya', licence: 'Open Government Licence', year: '2024' }, validFrom: '2024-01-01' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    publishBoundaries(r.version!.id, 'Signer B');
    const c = await collectionInfo(B);
    expect(c.attribution).toMatch(/Survey of Kenya 2024 .*version 1/);
    const after = ok(await item(B, 'KE-30', null))!;
    expect(after.properties).toMatchObject({ code: 'KE-30', level: 1 });
    expect(after.geometry).toEqual(getBoundaryVersion(r.version!.id)!.units.find(u => u.code === 'KE-30')!.geometry);
  }, 60_000);

  it('boundaries: bbox meets each unit\'s shape, not its centre; every paged collection links back', async () => {
    const geo = await loadNationGeography('KEN', [], 'full');
    const fc = { type: 'FeatureCollection', features: geo!.units.filter(u => u.geometry).map(u => ({ type: 'Feature', properties: { shapeName: u.name, shapeISO: u.code! }, geometry: structuredClone(u.geometry) })) };
    const r = await proposeBoundaries({ level: 1, text: JSON.stringify(fc), source: { publisher: 'Survey of Kenya', licence: 'Open Government Licence', year: '2024' }, validFrom: '2024-01-01' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    publishBoundaries(r.version!.id, 'Signer B');
    const u = getBoundaryVersion(r.version!.id)!.units.find(x => x.code === 'KE-25')!;
    const [minX, minY] = bboxOf(u.geometry);
    // A small box at the corner of the unit's extent: far from its centre.
    const box = [minX, minY, minX + 0.05, minY + 0.05] as const;
    expect(u.lng >= box[0] && u.lng <= box[2] && u.lat >= box[1] && u.lat <= box[3]).toBe(false);
    const hit = ok(boundaryItems(B, { bbox: box.join(','), limit: '100' }));
    expect(hit.features.map(f => f.properties.code)).toContain('KE-25');
    expect(hit.numberMatched).toBeLessThan(47);
    const p2 = ok(boundaryItems(B, { limit: '10', offset: '10' }));
    expect(p2.links.find(l => l.rel === 'prev')?.href).toContain('offset=0');
    expect(p2.links.find(l => l.rel === 'next')?.href).toContain('offset=20');
    const f2 = ok(facilityItems(B, { limit: '10', offset: '10' }, { signedIn: false }));
    expect(f2.links.find(l => l.rel === 'prev')?.href).toContain('offset=0');
    // Every collection says how datetime is read.
    for (const c of [await collectionInfo(B), boundariesInfo(B), facilitiesInfo(B)]) expect(c.description).toContain(DATETIME_AS_OF);
  }, 60_000);

  it('serves districts at level 2 and refuses an unknown level', async () => {
    const d = ok(await items(B, { level: '2', limit: '5' }));
    expect(d.numberMatched).toBeGreaterThan(47);
    expect(d.features[0]!.properties).toMatchObject({ level: 2, parent: expect.stringMatching(/^KE-/) });
    expect(d.links.find(l => l.rel === 'next')?.href).toContain('level=2');
    expect(await items(B, { level: '3' })).toEqual({ error: expect.any(String) });
  }, 60_000);
});
