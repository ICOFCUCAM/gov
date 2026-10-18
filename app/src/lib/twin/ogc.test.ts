import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { items, item, collectionInfo, landing, parseBbox, parseDatetime, CONFORMANCE } from './ogc';
import { applyNation } from '@/lib/nation/registry';

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
    expect(landing(B).links.map(l => l.rel)).toEqual(['self', 'service-desc', 'conformance', 'data']);
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
    expect(nairobi.properties.observations).toMatchObject({ population: { value: 4397073, unit: 'persons', validFrom: '2019-01-01', source: 'Census' } });
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
