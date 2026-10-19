import { describe, it, expect } from 'vitest';
import { buildTileTopology, toWorld, zoomTolerance } from './tile-topology';

// Two units sharing a long jagged border, inside a plain rectangle (lng 30–32, lat 0–1), and a tiny island.
const N = 400;
const border: number[][] = Array.from({ length: N + 1 }, (_, i) => [31 + 0.01 * Math.sin(i * 1.7) + 0.004 * Math.cos(i * 0.31), i / N]);
const west = [[[30, 0], ...border, [30, 1], [30, 0]]];
const east = [[[32, 0], [32, 1], ...[...border].reverse(), [32, 0]]];
const island = [[[33, 0.5], [33.0001, 0.5], [33.0001, 0.5001], [33.00005, 0.50012], [33, 0.5001], [33, 0.5]]];

/** Twice the signed area of a world-unit ring (shoelace). */
const area2 = (r: [number, number][]) => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i]![0] * r[i + 1]![1] - r[i + 1]![0] * r[i]![1]; return a; };
const key = (p: [number, number]) => `${p[0]},${p[1]}`;

describe('boundaries simplified per zoom on one topology', () => {
  const topo = buildTileTopology({ units: [[west], [east]], islands: [[island]] });

  it('simplifies a shared border identically for both neighbours: no gaps, no overlaps', () => {
    const [w0, s0] = toWorld(30, 1), [e0, n0] = toWorld(32, 0);
    const box = Math.abs((e0 - w0) * (n0 - s0));
    for (const z of [0, 3, 6, 9, 12]) {
      const a = topo.polygons('units', 0, z)[0]![0]!, b = topo.polygons('units', 1, z)[0]![0]!;
      // The border points of one are exactly the border points of the other.
      const inB = new Set(b.map(key));
      const shared = a.filter(p => inB.has(key(p)));
      expect(shared.length).toBeGreaterThanOrEqual(2);
      const interiorA = a.filter(p => p[0] > w0 + 1e-12 && p[0] < e0 - 1e-12 && p[1] > s0 + 1e-12 && p[1] < n0 - 1e-12);
      const interiorB = b.filter(p => p[0] > w0 + 1e-12 && p[0] < e0 - 1e-12 && p[1] > s0 + 1e-12 && p[1] < n0 - 1e-12);
      expect(new Set(interiorA.map(key))).toEqual(new Set(interiorB.map(key)));
      // Together they still cover the rectangle exactly.
      expect(Math.abs(Math.abs(area2(a)) + Math.abs(area2(b)) - 2 * box) / (2 * box)).toBeLessThan(1e-9);
    }
  });

  it('keeps fewer points at lower zooms, all of them at the highest', () => {
    const counts = [0, 4, 8, 12, 16, 22].map(z => topo.verticesAt(z));
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
    expect(counts[0]!).toBeLessThan(topo.vertices.arcs / 10);
    expect(counts[counts.length - 1]).toBe(topo.vertices.arcs);
    expect(zoomTolerance(5)).toBeLessThan(zoomTolerance(4));
  });

  it('never drops a unit or an island: every ring keeps three distinct points', () => {
    for (const z of [0, 2, 5, 10]) {
      for (const [layer, i] of [['units', 0], ['units', 1], ['islands', 0]] as const) {
        const ring = topo.polygons(layer, i, z)[0]![0]!;
        expect(new Set(ring.map(key)).size).toBeGreaterThanOrEqual(3);
        expect(key(ring[0]!)).toBe(key(ring[ring.length - 1]!)); // closed
      }
    }
  });

  it('gives a shape with no polygons no polygons', () => {
    const t = buildTileTopology({ a: [[], [west]] });
    expect(t.polygons('a', 0, 3)).toEqual([]);
    expect(t.polygons('a', 1, 3)).toHaveLength(1);
    expect(t.polygons('missing', 0, 3)).toEqual([]);
  });
});
