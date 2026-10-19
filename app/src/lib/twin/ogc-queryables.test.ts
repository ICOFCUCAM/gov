import { describe, it, expect, beforeEach } from 'vitest';
import { queryables, readFilters, matchesFilters, QUERYABLES, QUERYABLES_CONFORMANCE } from './ogc-queryables';
import { CONFORMANCE, collectionInfo, items } from './ogc';
import { facilityItems, facilitiesInfo } from './ogc-facilities';
import { boundariesInfo } from './ogc-boundaries';
import { resetTwin, syncRegister } from './register';
import { resetFacilities, proposeFacility, actOnFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';

const B = 'https://gov.example/api/twin/ogc';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

beforeEach(async () => {
  resetTwin(); resetFacilities();
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: [] });
  await syncRegister();
});

describe('OGC queryables and property filters', () => {
  it('publishes a JSON Schema per collection, linked from the collection and declared in conformance', async () => {
    for (const id of Object.keys(QUERYABLES)) {
      const q = queryables(B, id)!;
      expect(q.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(q.$id).toBe(`${B}/collections/${id}/queryables`);
      expect(q.type).toBe('object');
      expect(Object.keys(q.properties)).toEqual(expect.arrayContaining(Object.keys(QUERYABLES[id]!)));
    }
    expect(queryables(B, 'nope')).toBeNull();
    expect(queryables(B, 'facilities')!.properties).toHaveProperty('category.enum', expect.arrayContaining(['school', 'health']));
    expect((queryables(B, 'facilities')!.properties as Record<string, { enum?: string[] }>).category!.enum).not.toContain('defence');
    for (const c of QUERYABLES_CONFORMANCE) expect(CONFORMANCE).toContain(c);
    for (const c of [await collectionInfo(B), facilitiesInfo(B), boundariesInfo(B)]) {
      expect(c.links.find(l => l.rel === 'http://www.opengis.net/def/rel/ogc/1.0/queryables')?.href).toBe(`${B}/collections/${c.id}/queryables`);
    }
  });

  it('refuses unknown parameters and values outside a queryable', () => {
    expect(readFilters('facilities', new URLSearchParams('limit=5&bbox=1,2,3,4&category=school&regionCode=KE-30'))).toEqual({ category: 'school', regionCode: 'KE-30' });
    expect(readFilters('facilities', new URLSearchParams('colour=red'))).toEqual({ error: expect.stringMatching(/Unknown parameter "colour".*queryables/) });
    expect(readFilters('facilities', new URLSearchParams('category=castle'))).toEqual({ error: expect.stringMatching(/category must be one of/) });
    expect(readFilters('subdivisions', new URLSearchParams('level=7'))).toEqual({ error: expect.any(String) });
    expect(readFilters('subdivisions', new URLSearchParams('regionCode=KE-30'))).toEqual({ error: expect.stringMatching(/Unknown parameter/) });
    expect(readFilters('boundaries', new URLSearchParams('code=<script>'))).toEqual({ error: expect.any(String) });
    expect(matchesFilters({ a: 1, b: 'x' }, { a: '1' })).toBe(true);
    expect(matchesFilters({ a: 1 }, { b: 'x' })).toBe(false);
  });

  it('filters subdivisions by code and districts by parent', async () => {
    const one = ok(await items(B, { filters: { code: 'KE-30' } }));
    expect(one.features.map(f => f.id)).toEqual(['KE-30']);
    const nbo = ok(await items(B, { filters: { level: '2', parent: 'KE-30' }, limit: '1000' }));
    expect(nbo.numberMatched).toBeGreaterThan(0);
    expect(nbo.features.every(f => f.properties.parent === 'KE-30')).toBe(true);
    expect(nbo.links.find(l => l.rel === 'self')?.href).toContain('parent=KE-30');
  }, 60_000);

  it('filters facilities by category, region and status', async () => {
    const [m] = listMinistries();
    const add = async (name: string, category: string, lng: number, lat: number) => {
      const r = await proposeFacility(m!.id, { name, category, lng, lat, method: 'device-gps' }, 'Officer A');
      if ('error' in r) throw new Error(r.error);
      await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
      return r.facility.id;
    };
    await add('Nairobi school', 'school', 36.81724, -1.28638);
    const msa = await add('Mombasa school', 'school', 39.66820, -4.04350);
    await add('Mombasa clinic', 'health', 39.66920, -4.05350);
    await actOnFacility(msa, { action: 'status', status: 'closed' }, 'Signer B');
    const v = { signedIn: false };
    expect(ok(facilityItems(B, { filters: { category: 'school' } }, v)).numberMatched).toBe(2);
    expect(ok(facilityItems(B, { filters: { regionCode: 'KE-28' } }, v)).features.map(f => f.properties.name).sort()).toEqual(['Mombasa clinic', 'Mombasa school']);
    const closed = ok(facilityItems(B, { filters: { category: 'school', status: 'closed' } }, v));
    expect(closed.features.map(f => f.id)).toEqual([msa]);
    expect(closed.links[0]!.href).toMatch(/category=school.*status=closed/);
  }, 60_000);
});
