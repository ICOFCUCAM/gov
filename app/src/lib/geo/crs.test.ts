import { describe, it, expect } from 'vitest';
import proj4 from 'proj4';
import { readCrs, crsByEpsg, epsgOf, toWgs84, NATIONAL_CRS, crsChoices } from './crs';
import { UTM37S_PRJ, WGS84_PRJ } from './boundary-fixtures';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const metres = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) => Math.hypot((a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180), (a.lat - b.lat) * 110_574);

describe('national coordinate systems', () => {
  it('reads EPSG codes in every spelling, and refuses what is not bundled', () => {
    for (const s of ['EPSG:21037', '21037', 'urn:ogc:def:crs:EPSG::21037', 'http://www.opengis.net/def/crs/EPSG/0/21037']) expect(epsgOf(s)).toBe(21037);
    expect(epsgOf('urn:ogc:def:crs:OGC:1.3:CRS84')).toBe(4326);
    expect(ok(readCrs({ crs: 'EPSG:21037' }))).toMatchObject({ epsg: 21037, projected: true, name: 'Arc 1960 / UTM zone 37S (EPSG:21037)', transformation: expect.stringContaining('+towgs84=-160,-6,-302') });
    expect(ok(readCrs({}))).toMatchObject({ epsg: 4326, wgs84: true });
    expect(readCrs({ crs: 'EPSG:99999' })).toEqual({ error: expect.stringMatching(/not one of the bundled.*\.prj/) });
    expect(readCrs({ crs: 'Clarke grid' })).toEqual({ error: expect.stringMatching(/not an EPSG code/) });
    // Generic UTM zones are built from their codes.
    expect(crsByEpsg(32636)?.name).toBe('WGS 84 / UTM zone 36N (EPSG:32636)');
    expect(crsByEpsg(25832)?.name).toBe('ETRS89 / UTM zone 32N (EPSG:25832)');
    expect(crsByEpsg(26918)?.name).toBe('NAD83 / UTM zone 18N (EPSG:26918)');
    expect(crsByEpsg(7855)?.name).toBe('GDA2020 / MGA zone 55 (EPSG:7855)');
    expect(crsChoices().length).toBe(NATIONAL_CRS.length);
  });

  it('converts national grids to WGS 84 within a few metres', () => {
    // Nairobi on Arc 1960 / UTM 37S: about 257 km east, 9,857 km north.
    const arc = ok(readCrs({ crs: 'EPSG:21037' }));
    const there = { lng: 36.81724, lat: -1.28638 };
    const [e, n] = proj4('WGS84', arc.transformation, [there.lng, there.lat]) as [number, number];
    expect(e).toBeGreaterThan(256_000); expect(e).toBeLessThan(258_500);
    expect(n).toBeGreaterThan(9_857_000); expect(n).toBeLessThan(9_858_500);
    expect(metres(toWgs84(arc, e, n)!, there)).toBeLessThan(1);
    // The datum shift matters: on WGS 84 / UTM 37S the same numbers land about 300 m away.
    const wgsUtm = crsByEpsg(32737)!;
    const shifted = metres(toWgs84(wgsUtm, e, n)!, there);
    expect(shifted).toBeGreaterThan(100); expect(shifted).toBeLessThan(600);
    // ETRS89-LAEA: the projection's origin is exactly 10°E 52°N.
    const laea = ok(readCrs({ crs: 'EPSG:3035' }));
    const o = toWgs84(laea, 4_321_000, 3_210_000)!;
    expect(o.lng).toBeCloseTo(10, 6); expect(o.lat).toBeCloseTo(52, 6);
    // British National Grid: the origin of the grid's true point (49°N 2°W) is at 400 km E, -100 km N.
    const bng = ok(readCrs({ crs: 'EPSG:27700' }));
    const t = toWgs84(bng, 400_000, -100_000)!;
    expect(metres(t, { lng: -2, lat: 49 })).toBeLessThan(200); // OSGB36 to WGS 84 shifts ~100 m
    // Out of the world: refused.
    expect(toWgs84(arc, Number.NaN, 1)).toBeNull();
  });

  it('reads a .prj: a national grid through proj4, WGS 84 as it is', () => {
    const utm = ok(readCrs({ prj: UTM37S_PRJ }));
    expect(utm).toMatchObject({ projected: true, transformation: UTM37S_PRJ });
    expect(utm.name).toMatch(/UTM_Zone_37S/);
    const p = toWgs84(utm, 500_000, 10_000_000)!;
    expect(p.lng).toBeCloseTo(39, 5); expect(p.lat).toBeCloseTo(0, 5);
    expect(ok(readCrs({ prj: WGS84_PRJ }))).toMatchObject({ wgs84: true, projected: false });
    // A .prj naming its EPSG authority uses the bundled definition (with its datum shift).
    const withId = `PROJCS["Arc 1960 / UTM zone 37S",GEOGCS["Arc 1960",DATUM["Arc_1960",SPHEROID["Clarke 1880 (RGS)",6378249.145,293.465]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",39],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",10000000],UNIT["metre",1],AUTHORITY["EPSG","21037"]]`;
    expect(ok(readCrs({ prj: withId })).epsg).toBe(21037);
  });
});
