import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ngsiEntity, ngsiId } from './ngsi';
import { resetTwin, syncRegister, registerSource, runSource, upsertFacilityEntity } from './register';
import { applyNation } from '@/lib/nation/registry';
import { GET } from '@/app/api/twin/entities/[id]/route';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('the NGSI-LD view of twin entities', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, date: { column: 'year' } } }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nNairobi City,3100000,2009\nNairobi City,4397073,2019\n' });
  });

  it('maps a place to an AdministrativeArea with its observations as properties observed at their date', () => {
    const e = ngsiEntity('place:KE-30')!;
    expect(e).toMatchObject({
      id: 'urn:ngsi-ld:AdministrativeArea:place:KE-30', type: 'AdministrativeArea',
      name: { type: 'Property', value: 'Nairobi City' }, sameAs: { type: 'Property', value: 'https://twin.invalid/id/place/KE-30' },
      containedInPlace: { type: 'Relationship', object: 'urn:ngsi-ld:AdministrativeArea:nation:KEN' },
      population: { type: 'Property', value: 4_397_073, observedAt: '2019-01-01T00:00:00Z', unitCode: 'IE', datasetId: 'urn:ngsi-ld:Dataset:SRC-1', source: { value: 'Census' } },
    });
    expect((e['@context'] as unknown[])[0]).toMatch(/ngsi-ld-core-context/);
  });

  it('gives the temporal representation on request', () => {
    const e = ngsiEntity('place:KE-30', { temporal: true })!;
    expect((e.population as { value: number; observedAt: string }[]).map(p => [p.value, p.observedAt])).toEqual([[3_100_000, '2009-01-01T00:00:00Z'], [4_397_073, '2019-01-01T00:00:00Z']]);
  });

  it('maps a facility to a PointOfInterest with a GeoProperty', () => {
    upsertFacilityEntity({ id: 'FAC-00001', name: 'Coast General', location: { lat: -4.05, lng: 39.66 }, regionCode: 'KE-28', ids: {} });
    expect(ngsiEntity('facility:FAC-00001')).toMatchObject({ type: 'PointOfInterest', id: ngsiId({ id: 'facility:FAC-00001', kind: 'facility' }), location: { type: 'GeoProperty', value: { type: 'Point', coordinates: [39.66, -4.05] } } });
    expect(ngsiEntity('nothing')).toBeUndefined();
  });

  it('answers NGSI-LD on Accept: application/ld+json and the unchanged JSON otherwise', async () => {
    const ctx = { params: Promise.resolve({ id: 'place%3AKE-30' }) };
    const ld = await GET(new NextRequest('https://t.example/api/twin/entities/place%3AKE-30', { headers: { accept: 'application/ld+json' } }), ctx);
    expect(ld.headers.get('content-type')).toMatch(/application\/ld\+json/);
    expect((await ld.json()).type).toBe('AdministrativeArea');
    const json = await (await GET(new NextRequest('https://t.example/api/twin/entities/place%3AKE-30'), ctx)).json();
    expect(Object.keys(json).sort()).toEqual(['entity', 'keys', 'observations', 'sources']);
  });
});
