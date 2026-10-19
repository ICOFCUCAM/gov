import { describe, it, expect } from 'vitest';
import { areaM2, interiorPoint, inPolygon, overlapAreaM2, readParcelGeometry, type MultiPolygonGeom } from './parcel-geometry';

const sq = (x: number, y: number, d: number) => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

describe('parcel geometry', () => {
  it('measures area on the sphere: one degree square at the equator is about 12,308 km²', () => {
    const g: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [[sq(0, 0, 1) as [number, number][]]] };
    expect(areaM2(g) / 1e6).toBeGreaterThan(12_300);
    expect(areaM2(g) / 1e6).toBeLessThan(12_400);
  });

  it('rewinds rings as RFC 7946 asks and subtracts holes', () => {
    const outer = [...sq(36.8, -1.3, 0.001)].reverse(); // clockwise
    const hole = sq(36.8003, -1.2997, 0.0002); // anticlockwise
    const r = ok(readParcelGeometry({ type: 'Polygon', coordinates: [outer, hole] }));
    expect(r.notes.join(' ')).toMatch(/2 rings rewound/);
    const full = ok(readParcelGeometry({ type: 'Polygon', coordinates: [outer] }));
    expect(r.areaM2).toBeLessThan(full.areaM2);
    expect(full.areaM2 - r.areaM2).toBeGreaterThan(400);
    expect(full.areaM2 - r.areaM2).toBeLessThan(600);
  });

  it('refuses holes outside their ring, overlapping parts and outlines in metres', () => {
    expect(readParcelGeometry({ type: 'Polygon', coordinates: [sq(36.8, -1.3, 0.001), sq(36.9, -1.3, 0.0001)] })).toEqual({ error: expect.stringMatching(/not inside/) });
    expect(readParcelGeometry({ type: 'MultiPolygon', coordinates: [[sq(36.8, -1.3, 0.001)], [sq(36.8005, -1.3, 0.001)]] })).toEqual({ error: expect.stringMatching(/overlap/) });
    expect(readParcelGeometry({ type: 'Polygon', coordinates: [sq(257000, 9857000, 100)] })).toEqual({ error: expect.stringMatching(/metres/) });
    expect(readParcelGeometry('not json')).toEqual({ error: expect.stringMatching(/not valid GeoJSON/) });
  });

  it('finds a point inside a crescent, where the centroid falls outside', () => {
    // A U shape: its centroid lies in the gap between the arms.
    const u = [[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3], [0, 0]].map(([x, y]) => [36.8 + x! * 0.001, -1.3 + y! * 0.001]);
    const r = ok(readParcelGeometry({ type: 'Polygon', coordinates: [u] }));
    const p = interiorPoint(r.geometry);
    expect(inPolygon(p, r.geometry.coordinates[0]!)).toBe(true);
  });

  it('estimates overlaps on a raster: half a square, and none for neighbours sharing an edge', () => {
    const a: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [[sq(36.8, -1.3, 0.001) as [number, number][]]] };
    const b: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [[sq(36.8005, -1.3, 0.001) as [number, number][]]] };
    const c: MultiPolygonGeom = { type: 'MultiPolygon', coordinates: [[sq(36.801, -1.3, 0.001) as [number, number][]]] };
    const half = overlapAreaM2(a, b);
    expect(half.areaM2 / areaM2(a)).toBeGreaterThan(0.49);
    expect(half.areaM2 / areaM2(a)).toBeLessThan(0.51);
    expect(overlapAreaM2(a, c).areaM2).toBe(0);
  });
});
