import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetMapPack, installDistrictsFromGeoBoundaries, installDistrictsFromFile, removeInstalledDistricts,
  districtPackStatus, convertDistricts, gbFileUrl, installedForMaps,
} from './map-pack';
import { listAudit } from './store';
import { applyNation } from '@/lib/nation/registry';
import { loadCountry, type Geom } from '@/lib/geo/admin1';
import { hasAdmin2 } from '@/lib/geo/admin2';
import { labelPoint, rewind } from '@/lib/geo/admin2-convert.mjs';
import { loadDistricts, loadNationGeography, loadUnitGeography } from '@/lib/map/geography';
import { installedDistrictsSummary } from '@/lib/map/districts-installed';

// Rwanda: five provinces on the map, no districts bundled with the platform.
const ISO = 'RWA';
type Fc = { type: 'FeatureCollection'; features: { type: 'Feature'; properties: Record<string, string>; geometry: Geom }[] };
let provinces: { code: string; name: string; geometry: Geom }[] = [];
let fc: Fc;

/** A small square (RFC 7946 winding, counter-clockwise) around a point. */
const square = ([x, y]: [number, number], d = 0.01): Geom => ({ type: 'Polygon', coordinates: [[[x - d, y - d], [x + d, y - d], [x + d, y + d], [x - d, y + d], [x - d, y - d]]] });

beforeEach(async () => {
  resetMapPack();
  applyNation({ iso3: ISO, regions: [] });
  const c = await loadCountry(ISO);
  provinces = c!.provinces.map(p => ({ code: p.code, name: p.name, geometry: p.geometry as Geom }));
  // Two districts per province: one small square around a point inside it, and one more beside it.
  fc = {
    type: 'FeatureCollection',
    features: provinces.flatMap((p, i) => {
      const [x, y] = labelPoint(rewind(p.geometry));
      return [
        { type: 'Feature' as const, properties: { shapeName: `${p.name} Centre`, shapeISO: i === 0 ? 'RW-99' : '' }, geometry: square([x, y]) },
        { type: 'Feature' as const, properties: { shapeName: `${p.name} Centre`, shapeISO: '' }, geometry: square([x + 0.004, y + 0.004], 0.002) },
      ];
    }),
  };
});

const META = (over: Record<string, unknown> = {}) => ({
  boundaryID: 'RWA-ADM2-39286606', boundaryISO: ISO, boundaryType: 'ADM2', boundarySource: 'Open Data Rwanda',
  boundaryLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)', boundaryYearRepresented: '2012', admUnitCount: '30',
  gjDownloadURL: 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2.geojson',
  simplifiedGeometryGeoJSON: 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2_simplified.geojson',
  ...over,
});

/** A fetch that answers like geoBoundaries' API and file host, recording every address asked for. */
function fakeNet(metas: Record<string, unknown>, file: () => string) {
  const asked: string[] = [];
  const fetch = (async (u: string | URL) => {
    const url = String(u);
    asked.push(url);
    const m = /^https:\/\/www\.geoboundaries\.org\/api\/current\/gbOpen\/RWA\/(ADM\d)\/$/.exec(url);
    if (m) return metas[m[1]!] ? new Response(JSON.stringify(metas[m[1]!]), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 });
    if (url.startsWith('https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/')) return new Response(file(), { status: 200 });
    return new Response('unexpected', { status: 500 });
  }) as typeof globalThis.fetch;
  return { fetch, resolve: async () => ['140.82.112.3'], asked };
}

describe('district shapes installed at setup', () => {
  it('starts with none for a nation the platform does not bundle', async () => {
    expect(hasAdmin2(ISO)).toBe(false);
    const s = await districtPackStatus();
    expect(s).toEqual(expect.objectContaining({ iso3: ISO, bundled: null, installed: null, drawn: 'none' }));
    expect(await loadDistricts(ISO)).toBeNull();
  });

  it('downloads from geoBoundaries only, places each district in the region holding it, and audits it', async () => {
    const net = fakeNet({ ADM2: META() }, () => JSON.stringify(fc));
    const r = await installDistrictsFromGeoBoundaries('Admin A', net);
    if ('error' in r) throw new Error(r.error);
    expect(new Set(net.asked.map(u => new URL(u).host))).toEqual(new Set(['www.geoboundaries.org', 'media.githubusercontent.com']));
    expect(net.asked[1]).toBe('https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/RWA/ADM2/geoBoundaries-RWA-ADM2_simplified.geojson');
    expect(r).toEqual(expect.objectContaining({ iso3: ISO, adm: 'ADM2', method: 'download', unitCount: 10, parents: 10, installedBy: 'Admin A', boundaryId: 'RWA-ADM2-39286606' }));
    expect(r.credit).toEqual({ source: 'Open Data Rwanda', licence: 'Creative Commons Attribution 4.0 International (CC BY 4.0)', year: '2012', via: 'geoBoundaries' });
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);

    const a2 = await loadDistricts(ISO);
    expect(a2?.units).toHaveLength(10);
    provinces.forEach((p, i) => {
      const mine = a2!.units.filter(u => u.parent === p.code);
      expect(mine.map(u => u.name), p.name).toEqual([`${p.name} Centre`, `${p.name} Centre`]);
      // ISO 3166-2 kept when the source has one; otherwise `${region}:${slug}`, numbered when repeated.
      if (i === 0) expect(mine[0]!.code).toBe('RW-99');
      else expect(mine[0]!.code).toMatch(new RegExp(`^${p.code}:[a-z0-9-]+$`));
      expect(mine[1]!.code).toMatch(new RegExp(`^${p.code}:[a-z0-9-]+(-2)?$`));
    });
    expect(new Set(a2!.units.map(u => u.code)).size).toBe(10);

    const audit = listAudit().filter(e => e.action === 'map-pack.install' && e.resource === `MapPack:${ISO}:districts`);
    expect(audit[0]).toEqual(expect.objectContaining({ actor: 'Admin A', outcome: 'ok' }));
    expect((await districtPackStatus()).drawn).toBe('installed');
  });

  it('takes the first level clearly finer than the regions', async () => {
    const net = fakeNet({ ADM2: META({ admUnitCount: '5' }), ADM3: META({ boundaryType: 'ADM3', admUnitCount: '400', simplifiedGeometryGeoJSON: 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/RWA/ADM3/geoBoundaries-RWA-ADM3_simplified.geojson' }) }, () => JSON.stringify(fc));
    const r = await installDistrictsFromGeoBoundaries('Admin A', net);
    if ('error' in r) throw new Error(r.error);
    expect(r.adm).toBe('ADM3');
  });

  it('refuses licences that are not open, GADM-derived data and download addresses outside geoBoundaries', async () => {
    const closed = fakeNet({ ADM2: META({ boundaryLicense: 'All rights reserved' }) }, () => JSON.stringify(fc));
    expect(await installDistrictsFromGeoBoundaries('Admin A', closed)).toEqual({ error: expect.stringMatching(/licence not open/) });
    expect(closed.asked.every(u => u.startsWith('https://www.geoboundaries.org/'))).toBe(true);
    const gadm = fakeNet({ ADM2: META({ boundarySource: 'GADM' }) }, () => JSON.stringify(fc));
    expect(await installDistrictsFromGeoBoundaries('Admin A', gadm)).toEqual({ error: expect.stringMatching(/GADM/) });
    const elsewhere = fakeNet({ ADM2: META({ simplifiedGeometryGeoJSON: 'https://example.org/rwa.geojson', gjDownloadURL: '' }) }, () => JSON.stringify(fc));
    expect(await installDistrictsFromGeoBoundaries('Admin A', elsewhere)).toEqual({ error: expect.stringMatching(/outside its own repository/) });
    expect(gbFileUrl(META({ simplifiedGeometryGeoJSON: 'https://github.com/other/repo/raw/main/releaseData/gbOpen/RWA/ADM2/x.geojson', gjDownloadURL: '' }), ISO, 'ADM2')).toBeNull();
    expect(gbFileUrl(META({ simplifiedGeometryGeoJSON: 'https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/KEN/ADM2/x.geojson', gjDownloadURL: '' }), ISO, 'ADM2')).toBeNull();
    const pointer = fakeNet({ ADM2: META() }, () => 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 1\n');
    expect(await installDistrictsFromGeoBoundaries('Admin A', pointer)).toEqual({ error: expect.stringMatching(/LFS pointer/) });
    expect((await districtPackStatus()).installed).toBeNull();
  });

  it('installs an uploaded file (offline) under the same checks', async () => {
    expect(await installDistrictsFromFile({ text: JSON.stringify(fc), source: 'Open Data Rwanda' }, 'Admin A')).toEqual({ error: expect.stringMatching(/licence/) });
    expect(await installDistrictsFromFile({ text: JSON.stringify(fc), source: 'GADM', licence: 'CC BY 4.0' }, 'Admin A')).toEqual({ error: expect.stringMatching(/GADM/) });
    expect(await installDistrictsFromFile({ text: JSON.stringify(fc), metaText: JSON.stringify(META({ boundaryISO: 'KEN' })) }, 'Admin A')).toEqual({ error: expect.stringMatching(/for KEN/) });
    expect(await installDistrictsFromFile({ text: '{"type":"Topology"}', source: 'Open Data Rwanda', licence: 'CC BY 4.0' }, 'Admin A')).toEqual({ error: expect.stringMatching(/FeatureCollection/) });
    const r = await installDistrictsFromFile({ text: JSON.stringify(fc), metaText: JSON.stringify(META()) }, 'Admin A');
    if ('error' in r) throw new Error(r.error);
    expect(r).toEqual(expect.objectContaining({ method: 'upload', unitCount: 10, adm: 'ADM2', parents: 10 }));
    expect(r.url).toBeUndefined();
  });

  it('refuses a file whose districts lie in none of the nation’s regions', async () => {
    const away: Fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { shapeName: 'Nairobi' }, geometry: square([36.8, -1.28]) }] };
    expect(await convertDistricts(ISO, JSON.stringify(away))).toEqual({ error: expect.stringMatching(/is the file for this nation/) });
    const mixed: Fc = { ...fc, features: [...fc.features, away.features[0]!] };
    const c = await convertDistricts(ISO, JSON.stringify(mixed));
    if ('error' in c) throw new Error(c.error);
    expect(c.units.find(u => u.name === 'Nairobi')?.parent).toBeUndefined();
    expect(c.units.find(u => u.name === 'Nairobi')?.code).toBe('RWA:nairobi');
    expect(c.warnings.join(' ')).toMatch(/outside every region/);
  });

  it('lets maps open regions to the installed districts; removing hands back to none, audited', async () => {
    const r = await installDistrictsFromFile({ text: JSON.stringify(fc), metaText: JSON.stringify(META()) }, 'Admin A');
    if ('error' in r) throw new Error(r.error);
    expect(await installedDistrictsSummary(ISO)).toEqual(expect.objectContaining({ iso3: ISO, units: 10 }));
    const geo = await loadNationGeography(ISO, []);
    expect(geo!.units.length).toBeGreaterThan(0);
    expect(geo!.units.every(u => u.drill)).toBe(true);
    const first = geo!.units[0]!;
    const opened = await loadUnitGeography(ISO, { name: first.name, code: first.code });
    expect(opened?.units).toHaveLength(2);
    expect(opened?.credit).toMatch(/Open Data Rwanda/);
    expect(installedForMaps(ISO, false)).toEqual(expect.objectContaining({ units: 10 }));
    // Maps in the browser fetch one region's districts at a time.
    expect((installedForMaps(ISO, true, first.code) as { units: unknown[] }).units).toHaveLength(2);
    expect(installedForMaps('KEN', true)).toBeNull();

    expect(removeInstalledDistricts('')).toEqual({ error: expect.stringMatching(/Name the official/) });
    const gone = removeInstalledDistricts('Admin B', 'replaced by the national release');
    expect('removed' in gone).toBe(true);
    expect(listAudit().filter(e => e.action === 'map-pack.remove')[0]).toEqual(expect.objectContaining({ actor: 'Admin B', detail: expect.stringMatching(/regions only: replaced/) }));
    expect(await loadDistricts(ISO)).toBeNull();
    const s = await districtPackStatus();
    expect(s.installed).toBeNull();
    expect(s.history.map(h => h.action)).toEqual(['remove', 'install']);
    expect(removeInstalledDistricts('Admin B')).toEqual({ error: expect.stringMatching(/No districts/) });
  });

  it('installs over bundled districts and removing reinstates them', async () => {
    applyNation({ iso3: 'KEN', regions: [] });
    const bundled = await loadDistricts('KEN');
    const geo = await loadNationGeography('KEN', []);
    const p = geo!.units[0]!;
    const one: Fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { shapeName: 'Test' }, geometry: square([p.lng!, p.lat!]) }] };
    // The district must lie inside the region: use a point inside its shape.
    one.features[0]!.geometry = square(labelPoint(rewind(p.geometry!)));
    const r = await installDistrictsFromFile({ text: JSON.stringify(one), source: 'National mapping agency', licence: 'Open Government Licence' }, 'Admin A');
    if ('error' in r) throw new Error(r.error);
    expect((await loadDistricts('KEN'))?.units).toHaveLength(1);
    expect((await districtPackStatus()).bundled).toEqual(expect.objectContaining({ adm: 'ADM2' }));
    removeInstalledDistricts('Admin A');
    expect((await loadDistricts('KEN'))?.units.length).toBe(bundled!.units.length);
    expect(listAudit().filter(e => e.action === 'map-pack.remove')[0]?.detail).toMatch(/bundled districts/);
  }, 60_000);
});
