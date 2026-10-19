import { describe, it, expect } from 'vitest';
import { ringKinks, kinksOf, sliversOf, coverage, nesting, rasterise, gridOver } from './topology';
import type { Geom } from './admin1';

const box = (x0: number, y0: number, x1: number, y1: number): Geom => ({ type: 'Polygon', coordinates: [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]] });

describe('boundary topology', () => {
  it('finds a ring that crosses itself, and not one that only touches', () => {
    const bowtie = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]];
    const k = ringKinks(bowtie);
    expect(k).toHaveLength(1);
    expect(k[0]![0]).toBeCloseTo(0.5); expect(k[0]![1]).toBeCloseTo(0.5);
    expect(kinksOf(box(0, 0, 1, 1))).toEqual([]);
    // A long ring (a circle of 20,000 points) is checked quickly and is clean.
    const circle = Array.from({ length: 20_001 }, (_, i) => [Math.cos((i / 20_000) * 2 * Math.PI), Math.sin((i / 20_000) * 2 * Math.PI)]);
    circle[20_000] = circle[0]!;
    const t = performance.now();
    expect(ringKinks(circle)).toEqual([]);
    expect(performance.now() - t).toBeLessThan(2000);
    // Swap two far-apart points: the ring now crosses itself.
    const bad = circle.map(p => [...p]); [bad[100], bad[10_100]] = [bad[10_100]!, bad[100]!];
    expect(ringKinks(bad).length).toBeGreaterThan(0);
  });

  it('finds thin slivers but not small compact islands', () => {
    const shape: Geom = { type: 'MultiPolygon', coordinates: [
      box(36, -1, 37, 0).coordinates as number[][][],
      box(37, -0.5, 37.2, -0.49999).coordinates as number[][][], // a 22 km × 1 m strip
      box(38, -2, 38.01, -1.99).coordinates as number[][][], // a 1 km island
    ] };
    const s = sliversOf(shape);
    expect(s.map(x => x.part)).toEqual([1]);
    expect(s[0]!.compactness).toBeLessThan(0.01);
  });

  it('measures gaps between neighbours and overlaps by area, named by the units around them', () => {
    // Three units in a row; a gap between A and B, B overlapping C.
    const units = [
      { name: 'A', geometry: box(0, 0, 1, 1) },
      { name: 'B', geometry: box(1.1, 0, 2, 1) },
      { name: 'C', geometry: box(1.8, 0, 3, 1) },
    ];
    const outline = box(0, 0, 3, 1);
    const c = coverage(units, outline);
    const gap = c.patches.find(p => p.kind === 'gap')!;
    const over = c.patches.find(p => p.kind === 'overlap')!;
    expect(gap.between.sort()).toEqual(['A', 'B']);
    expect(over.between.sort()).toEqual(['B', 'C']);
    // 0.1° × 1° and 0.2° × 1° at the equator: about 1,239 and 2,478 km².
    expect(gap.areaKm2).toBeGreaterThan(1100); expect(gap.areaKm2).toBeLessThan(1400);
    expect(over.areaKm2).toBeGreaterThan(2300); expect(over.areaKm2).toBeLessThan(2700);
    expect(gap.at[0]).toBeCloseTo(1.05, 1);
    expect(c.outlineKm2! - c.unionKm2).toBeGreaterThan(1000);
    // Without an outline, a gap is uncovered ground enclosed by units (a hole in the middle).
    const ring = [
      { name: 'North', geometry: box(0, 2, 3, 3) }, { name: 'South', geometry: box(0, 0, 3, 1) },
      { name: 'West', geometry: box(0, 1, 1, 2) }, { name: 'East', geometry: box(2, 1, 3, 2) },
    ];
    const hole = coverage(ring);
    expect(hole.patches).toEqual([expect.objectContaining({ kind: 'gap', between: expect.arrayContaining(['North', 'South', 'West', 'East']) })]);
    // Neighbours that meet exactly leave no gap and no overlap.
    expect(coverage([{ name: 'A', geometry: box(0, 0, 1, 1) }, { name: 'B', geometry: box(1, 0, 2, 1) }], box(0, 0, 2, 1)).patches).toEqual([]);
  });

  it('rasterises with holes left empty', () => {
    const donut: Geom = { type: 'Polygon', coordinates: [box(0, 0, 4, 4).coordinates[0] as number[][], box(1, 1, 3, 3).coordinates[0] as number[][]] };
    const g = gridOver([0, 0, 4, 4], 1600);
    const m = rasterise(donut, g);
    const filled = m.reduce((a, v) => a + v, 0) / m.length;
    expect(filled).toBeGreaterThan(0.7); expect(filled).toBeLessThan(0.8); // 12 of 16
  });

  it('says how much of each district lies in each region', () => {
    const regions = [{ code: 'R1', name: 'One', geometry: box(0, 0, 1, 1) }, { code: 'R2', name: 'Two', geometry: box(1, 0, 2, 1) }];
    const n = nesting([{ name: 'inside', geometry: box(0.1, 0.1, 0.9, 0.9) }, { name: 'straddles', geometry: box(0.5, 0.2, 1.5, 0.8) }, { name: 'mostly two', geometry: box(0.8, 0.2, 1.8, 0.8) }], regions);
    expect(n[0]!.shares).toEqual([{ parent: 'R1', share: 1 }]);
    expect(n[1]!.shares.map(s => s.parent).sort()).toEqual(['R1', 'R2']);
    expect(n[1]!.shares[0]!.share).toBeCloseTo(0.5, 1);
    expect(n[2]!.shares[0]).toEqual({ parent: 'R2', share: expect.closeTo(0.8, 1) });
  });
});
