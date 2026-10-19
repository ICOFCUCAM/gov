import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { parseCql2Text, checkCql2, evaluateCql2, readCql2, CQL2_CONFORMANCE, Cql2Error, type Subject } from './cql2';
import { CONFORMANCE, items } from './ogc';
import { facilityItems } from './ogc-facilities';
import { queryables } from './ogc-queryables';
import { resetTwin, syncRegister } from './register';
import { resetFacilities, proposeFacility, actOnFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';
import { GET as itemsRoute } from '@/app/api/twin/ogc/collections/[collectionId]/items/route';

const B = 'https://gov.example/api/twin/ogc';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

const school: Subject = {
  properties: { name: 'Mombasa Girls School', category: 'school', status: 'operational', regionCode: 'KE-28', publishedAt: '2026-03-10T09:00:00Z', districtCode: undefined },
  geometry: { type: 'Point', coordinates: [39.668, -4.0435] },
};
const run = (text: string, s: Subject = school, collection = 'facilities') => evaluateCql2(checkCql2(parseCql2Text(text), collection), s);
const err = (text: string, collection = 'facilities') => { try { checkCql2(parseCql2Text(text), collection); return null; } catch (e) { if (e instanceof Cql2Error) return e.message; throw e; } };

describe('CQL2-Text and CQL2-JSON', () => {
  it('parses text into the CQL2-JSON form', () => {
    expect(parseCql2Text("category = 'school' AND NOT status <> 'closed'")).toEqual({
      op: 'and', args: [{ op: '=', args: [{ property: 'category' }, 'school'] }, { op: 'not', args: [{ op: '<>', args: [{ property: 'status' }, 'closed'] }] }],
    });
    expect(parseCql2Text('level BETWEEN 1 AND 2')).toEqual({ op: 'between', args: [{ property: 'level' }, 1, 2] });
    expect(parseCql2Text("name NOT LIKE 'A%'")).toEqual({ op: 'not', args: [{ op: 'like', args: [{ property: 'name' }, 'A%'] }] });
    expect(parseCql2Text("S_INTERSECTS(geometry, POINT(36.8 -1.28))")).toEqual({ op: 's_intersects', args: [{ property: 'geometry' }, { type: 'Point', coordinates: [36.8, -1.28] }] });
    expect(parseCql2Text("t_intersects(publishedAt, INTERVAL('2026-01-01', '..'))")).toEqual({ op: 't_intersects', args: [{ property: 'publishedAt' }, { interval: ['2026-01-01', '..'] }] });
    expect(parseCql2Text("districtCode IS NOT NULL")).toEqual({ op: 'not', args: [{ op: 'isNull', args: [{ property: 'districtCode' }] }] });
    expect(parseCql2Text("\"name\" = 'It''s'")).toEqual({ op: '=', args: [{ property: 'name' }, "It's"] });
  });

  it('evaluates comparison, logical, LIKE, IN, BETWEEN and IS NULL', () => {
    expect(run("category = 'school'")).toBe(true);
    expect(run("category = 'school' AND status = 'closed'")).toBe(false);
    expect(run("category = 'health' OR (status = 'operational' AND regionCode IN ('KE-28', 'KE-30'))")).toBe(true);
    expect(run("name LIKE 'Mombasa%'")).toBe(true);
    expect(run("name LIKE '%girls%'")).toBe(false);
    expect(run("name LIKE 'Mombasa_Girls%'")).toBe(true);
    expect(run("regionCode NOT IN ('KE-28')")).toBe(false);
    expect(run("districtCode IS NULL")).toBe(true);
    expect(run("districtCode IS NOT NULL")).toBe(false);
    // Unknown (a missing value) is not true, and NOT unknown stays unknown.
    expect(run("districtCode = 'x'")).toBeNull();
    expect(run("NOT districtCode = 'x'")).toBeNull();
    expect(run("districtCode = 'x' OR category = 'school'")).toBe(true);
    expect(run('level BETWEEN 1 AND 1', { properties: { level: 1 }, geometry: null }, 'subdivisions')).toBe(true);
    expect(run('level > 1', { properties: { level: 1 }, geometry: null }, 'subdivisions')).toBe(false);
    expect(run('TRUE')).toBe(true);
  });

  it('evaluates spatial functions with points, boxes and polygons', () => {
    expect(run('S_INTERSECTS(geometry, BBOX(39, -5, 40, -3))')).toBe(true);
    expect(run('S_INTERSECTS(geometry, BBOX(36, -2, 37, -1))')).toBe(false);
    expect(run('S_WITHIN(geometry, POLYGON((39 -5, 40 -5, 40 -3, 39 -3, 39 -5)))')).toBe(true);
    expect(run('S_DISJOINT(geometry, POLYGON((39 -5, 40 -5, 40 -3, 39 -3, 39 -5)))')).toBe(false);
    expect(run('S_INTERSECTS(geometry, POINT(39.668 -4.0435))')).toBe(true);
    const square: Subject = { properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } };
    expect(run('S_INTERSECTS(geometry, POINT(5 5))', square, 'subdivisions')).toBe(true);
    expect(run('S_INTERSECTS(geometry, POLYGON((9 9, 20 9, 20 20, 9 20, 9 9)))', square, 'subdivisions')).toBe(true);
    expect(run('S_INTERSECTS(geometry, LINESTRING(-5 5, 15 5))', square, 'subdivisions')).toBe(true);
    expect(run('S_WITHIN(geometry, POLYGON((9 9, 20 9, 20 20, 9 20, 9 9)))', square, 'subdivisions')).toBe(false);
    expect(run('S_WITHIN(geometry, BBOX(-1, -1, 11, 11))', square, 'subdivisions')).toBe(true);
    expect(run('S_CONTAINS(geometry, POINT(5 5))', square, 'subdivisions')).toBe(true);
    // A polygon with a hole: the hole is outside.
    const ring: Subject = { properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] } };
    expect(run('S_INTERSECTS(geometry, POINT(5 5))', ring, 'subdivisions')).toBe(false);
  });

  it('evaluates temporal functions with timestamps, dates and intervals', () => {
    expect(run("T_INTERSECTS(publishedAt, INTERVAL('2026-01-01', '..'))")).toBe(true);
    expect(run("T_INTERSECTS(publishedAt, INTERVAL('..', '2025-12-31'))")).toBe(false);
    expect(run("T_INTERSECTS(publishedAt, DATE('2026-03-10'))")).toBe(true);
    expect(run("T_BEFORE(publishedAt, TIMESTAMP('2026-04-01T00:00:00Z'))")).toBe(true);
    expect(run("T_AFTER(publishedAt, TIMESTAMP('2026-04-01T00:00:00Z'))")).toBe(false);
    expect(run("T_DURING(publishedAt, INTERVAL('2026-03-01', '2026-03-31'))")).toBe(true);
    expect(run("publishedAt >= TIMESTAMP('2026-03-01T00:00:00Z')")).toBe(true);
  });

  it('reads CQL2-JSON with the same checks', () => {
    const r = readCql2('facilities', JSON.stringify({ op: 'and', args: [{ op: '=', args: [{ property: 'category' }, 'school'] }, { op: 's_intersects', args: [{ property: 'geometry' }, { bbox: [39, -5, 40, -3] }] }] }), 'cql2-json', null);
    expect(r && 'expr' in r && evaluateCql2(r.expr, school)).toBe(true);
    expect(readCql2('facilities', '{"op":"=","args":[{"property":"colour"},"red"]}', 'cql2-json', null)).toEqual({ error: expect.stringMatching(/"colour" is not a queryable of facilities/) });
    expect(readCql2('facilities', '{not json', 'cql2-json', null)).toEqual({ error: expect.stringMatching(/not valid JSON/) });
  });

  it('refuses with a reason: unknown queryables, mismatched types, bad syntax, other CRS and languages', () => {
    expect(err("colour = 'red'")).toMatch(/not a queryable/);
    expect(err('category = 5')).toMatch(/compares a string with a number/);
    expect(err("level = 'one'", 'subdivisions')).toMatch(/compares a number with a string/);
    expect(err("category LIKE 5")).toMatch(/LIKE takes a quoted pattern/);
    expect(err("S_INTERSECTS(category, POINT(1 2))")).toMatch(/takes geometries/);
    expect(err("geometry = 'x'")).toMatch(/not geometries/);
    expect(err("S_INTERSECTS(geometry, POINT(200 2))")).toMatch(/CRS84/);
    expect(err("S_INTERSECTS(geometry, POLYGON((0 0, 1 0, 1 1, 0 0.5)))")).toMatch(/end where it starts/);
    expect(err("T_INTERSECTS(publishedAt, TIMESTAMP('yesterday'))")).toMatch(/not an RFC 3339/);
    expect(() => parseCql2Text("category = 'school")).toThrow(/not closed/);
    expect(() => parseCql2Text("category = 'school' AND")).toThrow(/Expected/);
    expect(() => parseCql2Text("UPPER(category) = 'X'")).toThrow(/Unknown function/);
    expect(readCql2('facilities', "category = 'school'", 'sql', null)).toEqual({ error: 'filter-lang must be cql2-text or cql2-json' });
    expect(readCql2('facilities', "category = 'school'", null, 'http://www.opengis.net/def/crs/EPSG/0/4326')).toEqual({ error: expect.stringMatching(/filter-crs must be/) });
    expect(readCql2('facilities', null, 'cql2-text', null)).toEqual({ error: expect.stringMatching(/only with filter/) });
    expect(readCql2('facilities', null, null, null)).toBeUndefined();
  });

  it('declares the conformance classes and the temporal queryables', () => {
    for (const c of CQL2_CONFORMANCE) expect(CONFORMANCE).toContain(c);
    expect(queryables(B, 'facilities')!.properties).toHaveProperty('publishedAt.format', 'date-time');
    expect(queryables(B, 'boundaries')!.properties).toHaveProperty('validFrom.format', 'date');
  });
});

describe('CQL2 on the collections', () => {
  beforeEach(async () => {
    resetTwin(); resetFacilities();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: [] });
    await syncRegister();
  });

  it('filters facilities and subdivisions and keeps the filter in paging links', async () => {
    const [m] = listMinistries();
    const add = async (name: string, category: string, lng: number, lat: number) => {
      const r = await proposeFacility(m!.id, { name, category, lng, lat, method: 'device-gps' }, 'Officer A');
      if ('error' in r) throw new Error(r.error);
      await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
    };
    await add('Nairobi school', 'school', 36.81724, -1.28638);
    await add('Mombasa school', 'school', 39.66820, -4.04350);
    await add('Mombasa clinic', 'health', 39.66920, -4.05350);
    const v = { signedIn: false };
    const cql = ok(readCql2('facilities', "category = 'school' AND S_INTERSECTS(geometry, BBOX(39, -5, 40, -3))", null, null)!);
    const r = ok(facilityItems(B, { cql, limit: '1' }, v));
    expect(r.features.map(f => f.properties.name)).toEqual(['Mombasa school']);
    expect(r.links[0]!.href).toContain('filter=');
    const sub = ok(await items(B, { cql: ok(readCql2('subdivisions', 'S_INTERSECTS(geometry, POINT(36.81724 -1.28638))', null, null)!) }));
    expect(sub.features.map(f => f.id)).toEqual(['KE-30']);
  }, 60_000);

  it('answers 400 with the reason through the items route', async () => {
    const res = await itemsRoute(new NextRequest(`${B}/collections/facilities/items?filter=${encodeURIComponent("colour = 'red'")}`), { params: { collectionId: 'facilities' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('InvalidParameterValue');
    expect(body.description).toMatch(/not a queryable/);
    const good = await itemsRoute(new NextRequest(`${B}/collections/boundaries/items?filter=${encodeURIComponent("T_INTERSECTS(validFrom, INTERVAL('..', '..'))")}`), { params: { collectionId: 'boundaries' } });
    expect(good.status).toBe(200);
  });
});
