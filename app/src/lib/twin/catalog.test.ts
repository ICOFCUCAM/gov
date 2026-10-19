import { describe, it, expect, beforeEach } from 'vitest';
import { twinCatalog } from './catalog';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { applyNation } from '@/lib/nation/registry';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
type Ds = Record<string, unknown> & { '@id': string; 'dct:identifier': string };

describe('the twin\'s DCAT-AP catalogue', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('describes every source with publisher, licence, coverage and distributions, and every OGC collection', async () => {
    const s = ok(registerSource({ by: 'Director of Statistics', name: 'Census 2019', publisher: 'KNBS', kind: 'csv-url', url: 'https://stats.example.go.ke/pop.csv', licence: 'CC BY 4.0', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, date: { column: 'year' } } }));
    ok(registerSource({ by: 'D', name: 'Uploaded', publisher: 'MoH', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' } } }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1,2009\nKisumu,2,2019\n' });
    const c = await twinCatalog('https://twin.example');
    expect(c).toMatchObject({ '@type': 'dcat:Catalog', '@id': 'https://twin.example/api/twin/catalog', '@context': expect.objectContaining({ dcat: 'http://www.w3.org/ns/dcat#' }) });
    const ds = c['dcat:dataset'] as Ds[];
    const census = ds.find(d => d['dct:identifier'] === s.id)!;
    expect(census).toMatchObject({
      '@type': 'dcat:Dataset', 'dct:title': 'Census 2019', 'dct:publisher': { 'foaf:name': 'KNBS' },
      'dct:license': { 'dct:title': 'CC BY 4.0' }, 'dct:temporal': { 'dcat:startDate': '2009-01-01', 'dcat:endDate': '2019-01-01' },
      'dcat:keyword': ['population'], 'dct:spatial': { 'dct:identifier': 'KEN' },
    });
    expect((census['dcat:distribution'] as { 'dcat:accessURL': { '@id': string } }[]).map(d => d['dcat:accessURL']['@id'])).toEqual(['https://stats.example.go.ke/pop.csv', 'https://twin.example/api/twin/state?metric=population']);
    expect(ds.find(d => d['dct:title'] === 'Uploaded')).toMatchObject({ 'dct:license': { 'dct:title': 'Not stated by the publisher' } });
    expect(ds.map(d => d['dct:identifier'])).toEqual(expect.arrayContaining(['subdivisions', 'facilities', 'boundaries']));
    expect(ds.find(d => d['dct:identifier'] === 'subdivisions')!['dcat:distribution']).toEqual([expect.objectContaining({ 'dcat:mediaType': 'application/geo+json' })]);
  });
});
