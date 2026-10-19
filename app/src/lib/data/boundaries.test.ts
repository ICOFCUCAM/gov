import { describe, it, expect, beforeEach } from 'vitest';
import { resetBoundaries, proposeBoundaries, publishBoundaries, withdrawBoundaries, listBoundaryVersions, boundariesInForce } from './boundaries';
import { applyNation } from '@/lib/nation/registry';
import { loadDistricts, loadNationGeography } from '@/lib/map/geography';
import { pickActive } from '@/lib/map/boundary-active';
import { loadAdmin2 } from '@/lib/geo/admin2';
import { boundaryItems } from '@/lib/twin/ogc-boundaries';

const SOURCE = { publisher: 'Survey of Kenya', licence: 'Open Government Licence', year: '2024' };
let regions: { type: 'FeatureCollection'; features: { type: 'Feature'; properties: Record<string, string>; geometry: unknown }[] };

beforeEach(async () => {
  resetBoundaries();
  applyNation({ iso3: 'KEN', regions: [] });
  const geo = await loadNationGeography('KEN', []);
  regions = { type: 'FeatureCollection', features: geo!.units.filter(u => u.geometry).map(u => ({ type: 'Feature', properties: { shapeName: u.name, shapeISO: u.code! }, geometry: structuredClone(u.geometry) })) };
});

const load = (fc: unknown, by = 'Officer A', extra: Record<string, unknown> = {}) =>
  proposeBoundaries({ level: 1, text: JSON.stringify(fc), source: SOURCE, validFrom: '2024-01-01', ...extra }, by);

describe('national boundary versions', () => {
  it('checks a boundary file: every region matched, nothing recorded on a dry run', async () => {
    const r = await proposeBoundaries({ level: 1, text: JSON.stringify(regions), source: SOURCE }, 'Officer A', { dryRun: true });
    if ('error' in r) throw new Error(r.error);
    expect(r.check.errors).toEqual([]);
    expect(r.check.summary).toEqual(expect.objectContaining({ units: 47, matched: 47, missing: [], fewer: false }));
    // Coastal units with islands (Mombasa) are checked from a point inside them, not a centre in the sea.
    expect(r.check.warnings.join(' ')).not.toMatch(/outside|overlap/);
    expect(listBoundaryVersions()).toEqual([]);
  }, 60_000);

  it('refuses what cannot be boundaries, and says why', async () => {
    const projected = structuredClone(regions);
    (projected.features[0]!.geometry as { coordinates: number[][][] }).coordinates = [[[3_000_000, 100_000], [3_100_000, 100_000], [3_100_000, 200_000], [3_000_000, 100_000]]];
    expect(await load(projected)).toEqual(expect.objectContaining({ error: expect.stringMatching(/projected/) }));
    expect(await load({ ...regions, crs: { type: 'name', properties: { name: 'EPSG:21037' } } })).toEqual({ error: expect.stringMatching(/EPSG:21037/) });
    expect(await proposeBoundaries({ level: 1, text: JSON.stringify(regions), source: { publisher: 'GADM', licence: 'GADM licence' } }, 'A')).toEqual({ error: expect.stringMatching(/GADM/) });
    const dup = structuredClone(regions); dup.features[1]!.properties.shapeISO = dup.features[0]!.properties.shapeISO!; dup.features[1]!.properties.shapeName = dup.features[0]!.properties.shapeName!;
    expect(await load(dup)).toEqual(expect.objectContaining({ error: expect.stringMatching(/used twice/) }));
  }, 60_000);

  it('turns rings wound the other way and closes open rings, noting both', async () => {
    const fc = structuredClone(regions);
    const g0 = fc.features[0]!.geometry as { type: string; coordinates: number[][][] | number[][][][] };
    const polys = (g0.type === 'Polygon' ? [g0.coordinates] : g0.coordinates) as number[][][][];
    polys.forEach(p => p.forEach(r => r.reverse()));
    const r = await proposeBoundaries({ level: 1, text: JSON.stringify(fc), source: SOURCE }, 'A', { dryRun: true });
    if ('error' in r) throw new Error(r.error);
    expect(r.check.summary.rewound).toBeGreaterThan(0);
    expect(r.check.summary.areaKm2).toBeLessThan((r.check.summary.previousAreaKm2 ?? 0) * 1.1);
  }, 60_000);

  it('is published by a different official; maps then draw and credit it, from its date', async () => {
    const r = await load(regions);
    if ('error' in r) throw new Error(r.error);
    const id = r.version!.id;
    expect(publishBoundaries(id, 'Officer A')).toEqual({ error: expect.stringMatching(/different official/) });
    expect(publishBoundaries(id, 'Signer B')).toEqual(expect.objectContaining({ state: 'published', n: 1 }));
    const geo = await loadNationGeography('KEN', []);
    expect(geo!.credit).toMatch(/Survey of Kenya 2024 .*version 1 in force from 2024-01-01/);
    expect(boundariesInForce().map(b => b.id)).toEqual([id]);
    // Before its date, and as known before it was published, the bundled shapes apply.
    expect(boundariesInForce(new Date('2023-06-01'))).toEqual([]);
    expect(boundariesInForce(new Date(), new Date('2020-01-01'))).toEqual([]);
    // The open data service serves the same version.
    const ogc = boundaryItems('http://x', { level: '1', limit: '100' });
    if ('error' in ogc) throw new Error(ogc.error);
    expect(ogc.numberMatched).toBe(47);
    expect(ogc.features[0]!.properties).toEqual(expect.objectContaining({ level: 1, version: 1, validFrom: '2024-01-01' }));
    const before = boundaryItems('http://x', { datetime: '2023-06-01T00:00:00Z' });
    expect('error' in before ? -1 : before.numberMatched).toBe(0);
  }, 60_000);

  it('a later version takes over from its date; withdrawing it hands the map back', async () => {
    const a = await load(regions); if ('error' in a) throw new Error(a.error);
    publishBoundaries(a.version!.id, 'Signer B');
    const b = await load(regions, 'Officer A', { validFrom: '2025-07-01' }); if ('error' in b) throw new Error(b.error);
    publishBoundaries(b.version!.id, 'Signer B');
    expect(b.version!.n).toBe(2);
    expect(boundariesInForce(new Date('2025-01-01'))[0]!.id).toBe(a.version!.id);
    expect(boundariesInForce()[0]!.id).toBe(b.version!.id);
    expect(withdrawBoundaries(b.version!.id, 'Signer B')).toEqual({ error: expect.stringMatching(/reason/) });
    withdrawBoundaries(b.version!.id, 'Signer B', 'wrong date');
    expect(boundariesInForce()[0]!.id).toBe(a.version!.id);
    expect(listBoundaryVersions().map(v => v.state)).toEqual(['withdrawn', 'published']);
  }, 60_000);

  it('fewer units than the boundaries in force must be confirmed', async () => {
    const fewer = { ...regions, features: regions.features.slice(0, 40) };
    expect(await load(fewer)).toEqual(expect.objectContaining({ error: expect.stringMatching(/merged/) }));
    const ok = await load(fewer, 'Officer A', { confirmFewer: true });
    expect('version' in ok && ok.version!.confirmFewer).toBe(true);
  }, 60_000);

  it('districts get their region from the map; published districts replace the bundled ones', async () => {
    const a2 = await loadAdmin2('KEN');
    const some = a2!.units.filter(u => u.parent === 'KE-30');
    const fc = { type: 'FeatureCollection', features: some.map(u => ({ type: 'Feature', properties: { name: u.name }, geometry: u.geometry })) };
    const r = await proposeBoundaries({ level: 2, text: JSON.stringify(fc), source: SOURCE, confirmFewer: true }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    publishBoundaries(r.version!.id, 'Signer B');
    const d = await loadDistricts('KEN');
    expect(d!.units.length).toBe(some.length);
    expect(d!.units.every(u => u.parent === 'KE-30')).toBe(true);
    expect(d!.own).toMatch(/Survey of Kenya/);
  }, 60_000);

  it('chooses the version in force by date, then by when it was published', () => {
    const v = (id: string, validFrom: string, publishedAt: string, state = 'published') => ({ id, n: 1, iso3: 'KEN', level: 1 as const, state, validFrom, publishedAt, source: SOURCE, units: [] });
    const vs = [v('a', '2024-01-01', '2024-01-02T00:00:00Z'), v('b', '2024-01-01', '2024-03-01T00:00:00Z'), v('c', '2026-01-01', '2024-04-01T00:00:00Z'), v('d', '2024-02-01', '2024-02-01T00:00:00Z', 'withdrawn')];
    expect(pickActive(vs, 'KEN', 1, new Date('2025-01-01'))?.id).toBe('b');
    expect(pickActive(vs, 'KEN', 1, new Date('2025-01-01'), new Date('2024-02-01'))?.id).toBe('a');
    expect(pickActive(vs, 'KEN', 1, new Date('2026-06-01'))?.id).toBe('c');
    expect(pickActive(vs, 'UGA', 1)).toBeNull();
  });
});
