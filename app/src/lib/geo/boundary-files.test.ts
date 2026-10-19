import { describe, it, expect } from 'vitest';
import proj4 from 'proj4';
import { zipSync } from 'fflate';
import { detectFormat, readBoundaryFile, decodeGpkgGeometry, crsFromWkt, type Feature } from './boundary-files';
import { shapefileZip, geoPackage, gpkgGeometry, encodeShp, WGS84_PRJ, UTM37S_PRJ } from './boundary-fixtures';
import { countVertices, simplifyFeatures } from './boundary-simplify';

const sq = (x: number, y: number, d: number): [number, number][] => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];
const unit = (name: string, code: string, rings: [number, number][][]): Feature => ({ type: 'Feature', properties: { name, code }, geometry: { type: 'Polygon', coordinates: rings } });
const latin1 = (s: string) => Uint8Array.from(Buffer.from(s, 'latin1'));
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('boundary files: formats', () => {
  it('tells the formats apart by their bytes', async () => {
    expect(detectFormat(new TextEncoder().encode('{"type":"FeatureCollection","features":[]}'))).toBe('geojson');
    expect(detectFormat(new TextEncoder().encode('{"type":"Topology","objects":{}}'))).toBe('topojson');
    expect(detectFormat(shapefileZip([unit('A', 'A', [sq(36, -1, 1)])], ['name']))).toBe('shapefile-zip');
    expect(detectFormat(await geoPackage([unit('A', 'A', [sq(36, -1, 1)])], ['name']))).toBe('geopackage');
    expect(detectFormat(encodeShp([unit('A', 'A', [sq(36, -1, 1)])]))).toBe('shp');
    expect(await readBoundaryFile({ bytes: encodeShp([unit('A', 'A', [sq(36, -1, 1)])]) })).toEqual({ error: expect.stringMatching(/zip it with its \.dbf/) });
    expect(await readBoundaryFile({ bytes: new Uint8Array([1, 2, 3]) })).toEqual({ error: expect.stringMatching(/Not a boundary file/) });
  });

  it('reads a WGS 84 Shapefile: rings grouped into polygons with holes, names in the .cpg encoding', async () => {
    const holed = unit('Région Sûd', 'X-1', [sq(36, -2, 2), [[36.5, -1.5], [36.5, -0.5], [37.5, -0.5], [37.5, -1.5], [36.5, -1.5]]]);
    const islands: Feature = { type: 'Feature', properties: { name: 'Île Nord', code: 'X-2' }, geometry: { type: 'MultiPolygon', coordinates: [[sq(39, 0, 1)], [sq(41, 0, 0.5)]] } };
    const r = ok(await readBoundaryFile({ bytes: shapefileZip([holed, islands], ['name', 'code'], { prj: WGS84_PRJ, cpg: 'ISO-8859-1', enc: latin1 }) }));
    expect(r.format).toBe('shapefile-zip');
    expect(r.reprojectedFrom).toBeUndefined();
    expect(r.features.map(f => f.properties?.name)).toEqual(['Région Sûd', 'Île Nord']);
    expect(r.features[0]!.geometry!.type).toBe('Polygon');
    expect((r.features[0]!.geometry!.coordinates as unknown[]).length).toBe(2); // outer ring + hole
    expect(r.features[1]!.geometry!.type).toBe('MultiPolygon');
    expect(r.notes.join(' ')).toMatch(/windows-1252|iso-8859-1/i);

    // The common .cpg spellings, and UTF-8 names without a .cpg.
    const r1252 = ok(await readBoundaryFile({ bytes: shapefileZip([holed], ['name'], { prj: WGS84_PRJ, cpg: '1252', enc: latin1 }) }));
    expect(r1252.features[0]!.properties?.name).toBe('Région Sûd');
    const utf8 = ok(await readBoundaryFile({ bytes: shapefileZip([holed], ['name'], { prj: WGS84_PRJ }) }));
    expect(utf8.features[0]!.properties?.name).toBe('Région Sûd');
    // No .cpg and not UTF-8: read as Windows-1252, and said so.
    const guess = ok(await readBoundaryFile({ bytes: shapefileZip([holed], ['name'], { prj: WGS84_PRJ, enc: latin1 }) }));
    expect(guess.features[0]!.properties?.name).toBe('Région Sûd');
    expect(guess.notes.join(' ')).toMatch(/No \.cpg/);
    expect(await readBoundaryFile({ bytes: shapefileZip([holed], ['name'], { cpg: 'KLINGON-9' }) })).toEqual({ error: expect.stringMatching(/KLINGON-9/) });
  });

  it('reprojects a projected (UTM) Shapefile from its .prj', async () => {
    const t = proj4(UTM37S_PRJ);
    const lonlat = sq(37, -1.5, 0.5);
    const utm = unit('Zone', 'Z', [lonlat.map(p => t.forward(p) as [number, number])]);
    const r = ok(await readBoundaryFile({ bytes: shapefileZip([utm], ['name', 'code'], { prj: UTM37S_PRJ }) }));
    expect(r.reprojectedFrom).toBe('WGS_1984_UTM_Zone_37S');
    expect(r.notes.join(' ')).toMatch(/Reprojected from "WGS_1984_UTM_Zone_37S"/);
    const ring = (r.features[0]!.geometry!.coordinates as number[][][])[0]!;
    const want = [...lonlat].reverse(); // the clockwise outer ring, as a Shapefile holds it
    ring.forEach((p, i) => { expect(p[0]).toBeCloseTo(want[i]![0], 6); expect(p[1]).toBeCloseTo(want[i]![1], 6); });
  });

  it('refuses a coordinate system it cannot read, naming it; and metres without a .prj', async () => {
    const madeUp = 'PROJCS["Made_Up_Grid",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Imaginary_Projection"],UNIT["Meter",1.0]]';
    expect(crsFromWkt(madeUp)).toEqual({ error: expect.stringMatching(/"Made_Up_Grid"/) });
    const metres = unit('M', 'M', [sq(500000, 9800000, 1000)]);
    expect(await readBoundaryFile({ bytes: shapefileZip([metres], ['name'], { prj: madeUp }) })).toEqual({ error: expect.stringMatching(/Made_Up_Grid.*cannot be read/) });
    expect(await readBoundaryFile({ bytes: shapefileZip([metres], ['name']) })).toEqual({ error: expect.stringMatching(/no \.prj/) });
    // National grids with their own datum are read (British National Grid).
    const bng = 'PROJCS["OSGB_1936_British_National_Grid",GEOGCS["GCS_OSGB_1936",DATUM["D_OSGB_1936",SPHEROID["Airy_1830",6377563.396,299.3249646]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",400000.0],PARAMETER["False_Northing",-100000.0],PARAMETER["Central_Meridian",-2.0],PARAMETER["Scale_Factor",0.9996012717],PARAMETER["Latitude_Of_Origin",49.0],UNIT["Meter",1.0]]';
    const c = crsFromWkt(bng);
    if ('error' in c) throw new Error(c.error);
    const [lon, lat] = c.toLonLat!([530000, 180000]);
    expect(lon).toBeCloseTo(-0.128, 2); expect(lat).toBeCloseTo(51.504, 2);
  });

  it('refuses a zip without a .shp or .dbf', async () => {
    expect(await readBoundaryFile({ bytes: zipSync({ 'readme.txt': new TextEncoder().encode('x') }) })).toEqual({ error: expect.stringMatching(/no \.shp/) });
    expect(await readBoundaryFile({ bytes: zipSync({ 'a.shp': encodeShp([unit('A', 'A', [sq(36, -1, 1)])]) }) })).toEqual({ error: expect.stringMatching(/without its \.dbf/) });
  });

  it('reads a GeoPackage: first feature table, GP header + WKB, its spatial reference', async () => {
    const a = unit('Ålborg', 'DK-A', [sq(10, 56, 1)]), b = unit('Øster', 'DK-B', [sq(11, 56, 1)]);
    const r = ok(await readBoundaryFile({ bytes: await geoPackage([a, b], ['name', 'code']) }));
    expect(r.format).toBe('geopackage');
    expect(r.features.map(f => [f.properties?.name, f.properties?.code])).toEqual([['Ålborg', 'DK-A'], ['Øster', 'DK-B']]);
    expect(r.features[0]!.geometry!.type).toBe('Polygon');
    expect(r.reprojectedFrom).toBeUndefined();

    // A UTM layer with no usable definition: reprojected from its EPSG code.
    const t = proj4('+proj=utm +zone=37 +south +datum=WGS84 +units=m +no_defs');
    const utm = unit('Zone', 'Z', [sq(37, -1.5, 0.5).map(p => t.forward(p) as [number, number])]);
    const ru = ok(await readBoundaryFile({ bytes: await geoPackage([utm], ['name'], { id: 32737, name: 'WGS 84 / UTM zone 37S', organization: 'EPSG', code: 32737, definition: 'undefined' }) }));
    expect(ru.reprojectedFrom).toBe('WGS 84 / UTM zone 37S (EPSG:32737)');
    expect((ru.features[0]!.geometry!.coordinates as number[][][])[0]![0]![0]).toBeCloseTo(37, 6);

    // A system that cannot be read is refused by name.
    expect(await readBoundaryFile({ bytes: await geoPackage([utm], ['name'], { id: 990001, name: 'Island Grid 1931', organization: 'NONE', code: 990001, definition: 'undefined' }) }))
      .toEqual({ error: expect.stringMatching(/"Island Grid 1931".*cannot be read/) });
    expect(decodeGpkgGeometry(gpkgGeometry(a.geometry, 4326))).toEqual({ type: 'Polygon', coordinates: a.geometry!.coordinates });
  });
});

describe('boundary files: simplification on a shared topology', () => {
  /** A grid of units whose shared borders zigzag finely. */
  function grid(n: number, steps: number): Feature[] {
    const edge = (a: [number, number], b: [number, number]) => Array.from({ length: steps }, (_, i) => {
      const t = i / steps, w = i % 2 ? 0.0004 : -0.0004;
      return [a[0] + (b[0] - a[0]) * t + (a[1] === b[1] ? 0 : w), a[1] + (b[1] - a[1]) * t + (a[1] === b[1] ? w : 0)] as [number, number];
    });
    const out: Feature[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const [x, y] = [36 + i * 0.5, -2 + j * 0.5];
      const c: [number, number][] = [[x, y], [x, y + 0.5], [x + 0.5, y + 0.5], [x + 0.5, y]];
      // Corners sit on the shared grid lines: the zigzag offsets cancel at i=0.
      const ring = [...edge(c[0]!, c[1]!), ...edge(c[1]!, c[2]!), ...edge(c[2]!, c[3]!), ...edge(c[3]!, c[0]!), c[0]!];
      out.push(unit(`U${i}-${j}`, `U${i}-${j}`, [ring]));
    }
    return out;
  }
  const key = (p: number[]) => `${p[0]!.toFixed(7)},${p[1]!.toFixed(7)}`;
  const keys = (f: Feature) => new Set(JSON.stringify(f.geometry!.coordinates).match(/-?[\d.]+,-?[\d.]+/g)!.map(s => key(s.split(',').map(Number))));

  it('keeps every unit, keeps shared borders shared, and reports points and tolerance', () => {
    const fs = grid(4, 400);
    const before = countVertices(fs);
    const { features, info } = simplifyFeatures(structuredClone(fs), Math.round(before / 10));
    expect(features.length).toBe(16);
    expect(info.units).toBe(16);
    expect(info.verticesBefore).toBe(before);
    expect(info.verticesAfter).toBeLessThan(before / 4);
    expect(info.minAreaKm2).toBeGreaterThan(0);
    // Every point two units shared before and one still has, the other still has too.
    let shared = 0;
    const kb0 = fs.map(keys), ka1 = features.map(keys);
    for (let a = 0; a < fs.length; a++) for (let b = a + 1; b < fs.length; b++) {
      const common = [...kb0[a]!].filter(k => kb0[b]!.has(k));
      if (!common.length) continue;
      const ka = ka1[a]!, kb = ka1[b]!;
      for (const k of common) { expect(ka.has(k)).toBe(kb.has(k)); if (ka.has(k)) shared++; }
    }
    expect(shared).toBeGreaterThan(0);
    // Every ring keeps at least three points (four with its closing point).
    for (const f of features) for (const r of f.geometry!.coordinates as number[][][]) expect(r.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps a tiny island as at least a triangle', () => {
    const big = unit('Big', 'B', [Array.from({ length: 2001 }, (_, i) => { const a = (i / 2000) * 2 * Math.PI; return [37 + Math.cos(a), Math.sin(a) + 0.0001 * (i % 2)] as [number, number]; })]);
    const tiny = unit('Tiny', 'T', [Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * 2 * Math.PI; return [40 + 0.001 * Math.cos(a), 0.001 * Math.sin(a)] as [number, number]; })]);
    const { features } = simplifyFeatures([big, tiny], 200);
    expect(features.length).toBe(2);
    expect((features[1]!.geometry!.coordinates as number[][][])[0]!.length).toBeGreaterThanOrEqual(4);
  });
});
