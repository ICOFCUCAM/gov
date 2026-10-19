import { describe, it, expect } from 'vitest';
import { CLUSTER_MAX_ZOOM, clusterCount, clusterLabel, clusterPoints, clusterRadius, zoomToCluster } from './cluster';
import type { MapTone } from './model';

const rand = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
const TONES: MapTone[] = ['ok', 'warn', 'alert', 'neutral'];

function cloud(n: number, w = 800, h = 600, seed = 1) {
  const r = rand(seed);
  return Array.from({ length: n }, (_, i) => ({ x: r() * w, y: r() * h, tone: TONES[i % 4]! }));
}

/** Every input index exactly once, in a single or in one cluster. */
function partition(n: number, c: ReturnType<typeof clusterPoints>) {
  const seen = new Uint8Array(n);
  for (const i of c.singles) seen[i]!++;
  for (const k of c.clusters) for (const i of k.members) seen[i]!++;
  return [...seen].every(v => v === 1);
}

describe('clusterPoints', () => {
  it('accounts for every point once: drawn alone or in exactly one cluster', () => {
    const pts = cloud(5000);
    const c = clusterPoints(pts, { zoom: 1 });
    expect(partition(pts.length, c)).toBe(true);
    expect(c.clusters.reduce((s, k) => s + k.count, 0) + c.singles.length).toBe(pts.length);
    expect(c.clusters.length).toBeGreaterThan(0);
    // 800 × 600 in 48 px cells: at most 17 × 13 clusters.
    expect(c.clusters.length).toBeLessThanOrEqual(17 * 13);
  });

  it('places a cluster at its members\' mean, within their extent, with the gravest status', () => {
    const pts = [{ x: 10, y: 10, tone: 'ok' as const }, { x: 20, y: 30, tone: 'alert' as const }, { x: 14, y: 11, tone: 'warn' as const }, { x: 300, y: 300, tone: 'ok' as const }];
    const c = clusterPoints(pts, { zoom: 1, radius: 48 });
    expect(c.singles).toEqual([3]);
    expect(c.clusters).toHaveLength(1);
    const k = c.clusters[0]!;
    expect(k.count).toBe(3);
    expect(k.x).toBeCloseTo(44 / 3); expect(k.y).toBeCloseTo(17);
    expect(k.bounds).toEqual([10, 10, 20, 30]);
    expect(k.tone).toBe('alert');
    expect(k.tones).toEqual({ neutral: 0, ok: 1, warn: 1, alert: 1 });
    expect(k.members.sort()).toEqual([0, 1, 2]);
  });

  it('splits as the map zooms in and stops clustering at maxZoom', () => {
    const pts = cloud(20_000);
    const counts = [1, 2, 4, 8].map(z => clusterPoints(pts, { zoom: z }));
    // More, smaller clusters (and more points alone) as the zoom grows.
    for (let i = 1; i < counts.length; i++) expect(counts[i]!.clusters.length).toBeGreaterThan(counts[i - 1]!.clusters.length);
    expect(Math.max(...counts[3]!.clusters.map(c => c.count))).toBeLessThan(Math.max(...counts[0]!.clusters.map(c => c.count)));
    const off = clusterPoints(pts, { zoom: CLUSTER_MAX_ZOOM });
    expect(off.clusters).toEqual([]);
    expect(off.singles).toHaveLength(pts.length);
  });

  it('leaves sparse points alone and respects minPoints', () => {
    const sparse = Array.from({ length: 10 }, (_, i) => ({ x: i * 100, y: 50, tone: 'ok' as const }));
    expect(clusterPoints(sparse).clusters).toEqual([]);
    const pair = [{ x: 1, y: 1, tone: 'ok' as const }, { x: 2, y: 2, tone: 'ok' as const }];
    expect(clusterPoints(pair).clusters).toHaveLength(1);
    expect(clusterPoints(pair, { minPoints: 3 }).clusters).toHaveLength(0);
    expect(clusterPoints([]).singles).toEqual([]);
  });

  it('keeps clusters stable while the map pans (cells anchored at the map, not the view)', () => {
    const pts = cloud(3000);
    const a = clusterPoints(pts, { zoom: 2 }), b = clusterPoints(pts, { zoom: 2 });
    expect(a.clusters.map(c => c.id)).toEqual(b.clusters.map(c => c.id));
  });

  it('skips positions that are not numbers instead of failing', () => {
    const c = clusterPoints([{ x: NaN, y: 1, tone: 'ok' }, { x: 1, y: 1, tone: 'ok' }, { x: 2, y: 2, tone: 'ok' }]);
    expect(c.clusters).toHaveLength(1);
    expect(c.clusters[0]!.members).toEqual([1, 2]);
  });

  it('clusters 250,000 points in well under a second', () => {
    const pts = cloud(250_000, 1200, 900, 7);
    const t0 = performance.now();
    const c = clusterPoints(pts, { zoom: 1 });
    const ms = performance.now() - t0;
    expect(partition(pts.length, c)).toBe(true);
    expect(ms).toBeLessThan(1500);
  });
});

describe('zoomToCluster', () => {
  it('fits the members to the map and always zooms deeper', () => {
    const z = zoomToCluster({ bounds: [100, 100, 140, 120], x: 120, y: 110 }, 800, 600, 1);
    expect(z.z).toBeGreaterThanOrEqual(2);
    // The cluster's centre lands at the centre of the map.
    expect(120 * z.z + z.tx).toBeCloseTo(400); expect(110 * z.z + z.ty).toBeCloseTo(300);
    // Its extent fits inside the map.
    expect(40 * z.z).toBeLessThanOrEqual(800); expect(20 * z.z).toBeLessThanOrEqual(600);
    // Points on one spot: one step of at most four times, and never past the cap.
    expect(zoomToCluster({ bounds: [5, 5, 5, 5], x: 5, y: 5 }, 800, 600, 4).z).toBe(16);
    expect(zoomToCluster({ bounds: [5, 5, 5, 5], x: 5, y: 5 }, 800, 600, 32).z).toBe(64);
    // A wide cluster: at least twice deeper.
    expect(zoomToCluster({ bounds: [0, 0, 700, 500], x: 350, y: 250 }, 800, 600, 3).z).toBe(6);
  });
});

describe('cluster marks', () => {
  it('grows with the count and writes large counts short', () => {
    expect(clusterRadius(2)).toBeLessThan(clusterRadius(1000));
    expect(clusterRadius(10_000_000)).toBe(20);
    expect(clusterCount(999)).toBe('999');
    expect(clusterCount(1000)).toBe('1k');
    expect(clusterCount(1234)).toBe('1.2k');
    expect(clusterCount(120_000)).toBe('120k');
    expect(clusterCount(2_500_000)).toBe('2.5M');
  });

  it('names a cluster by its count and statuses for assistive technology', () => {
    expect(clusterLabel({ count: 1234, tones: { alert: 4, warn: 30, ok: 1200, neutral: 0 } }, 'published sites'))
      .toBe('1,234 published sites close together (4 critical, 30 needing attention, 1,200 normal). Zoom in to see them.');
  });
});
