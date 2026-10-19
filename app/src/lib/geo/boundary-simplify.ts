// Simplifying a heavy boundary file on the server, keeping its topology.
//
// The units are turned into a topology first (topojson-server: every border
// two units share becomes one arc), each arc is simplified once
// (Visvalingam, by spherical triangle area: topojson-simplify), and the
// units are rebuilt from the simplified arcs. A shared border is therefore
// simplified the same way for both neighbours: no gaps, no overlaps. Arc
// ends (where three units meet, or a coast meets a border) are always kept,
// and every ring keeps at least three points, so no unit and no island is
// dropped. The tolerance used (the smallest triangle kept, in km²) is
// recorded with the version.

import { topology } from 'topojson-server';
import { presimplify, quantile, simplify, sphericalTriangleArea } from 'topojson-simplify';
import { feature as topoFeature } from 'topojson-client';
import type { Feature } from './boundary-files';

/** Files above either limit are simplified. */
export const SIMPLIFY_ABOVE_VERTICES = 200_000;
export const SIMPLIFY_ABOVE_BYTES = 5_000_000;
/** What a simplified file is brought down to. */
export const SIMPLIFY_TARGET_VERTICES = 100_000;
const R_KM = 6371.0088;

export interface Simplification {
  method: string;
  verticesBefore: number;
  verticesAfter: number;
  /** The smallest triangle of three neighbouring points kept, in km² (Visvalingam's tolerance). */
  minAreaKm2: number;
  /** Units before and after (always the same). */
  units: number;
}

/** Number of points in the features' polygons. */
export function countVertices(features: Feature[]): number {
  let n = 0;
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number') { n++; return; }
    for (const x of c) walk(x);
  };
  for (const f of features) walk(f.geometry?.coordinates);
  return n;
}

/** Whether a file of this size and these points is simplified. */
export function needsSimplifying(vertices: number, bytes: number, opts: { aboveVertices?: number; aboveBytes?: number; targetVertices?: number } = {}): boolean {
  const above = opts.aboveVertices ?? SIMPLIFY_ABOVE_VERTICES;
  const target = opts.targetVertices ?? SIMPLIFY_TARGET_VERTICES;
  return vertices > above || (bytes > (opts.aboveBytes ?? SIMPLIFY_ABOVE_BYTES) && vertices > target);
}

type Arcs = number[][];
type Pt = [number, number, number];

/** Simplify the features to about `targetVertices` points, keeping shared borders shared and every unit and ring. */
export function simplifyFeatures(features: Feature[], targetVertices = SIMPLIFY_TARGET_VERTICES): { features: Feature[]; info: Simplification } {
  const before = countVertices(features);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = topology({ units: { type: 'FeatureCollection', features } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pre = presimplify(topo as any, sphericalTriangleArea);
  const arcs = pre.arcs as unknown as Pt[][];
  const finite = arcs.reduce((s, a) => s + a.filter(p => Number.isFinite(p[2])).length, 0);
  const ends = arcs.reduce((s, a) => s + a.length, 0) - finite;
  const p = Math.max(0, Math.min(1, (targetVertices - ends) / Math.max(1, finite)));
  const minWeight = p >= 1 ? 0 : (quantile(pre, p) || 0);

  // Every ring keeps at least three distinct points: protect its strongest points.
  const geoms = (pre.objects.units as unknown as { geometries: { type: string; arcs?: Arcs | Arcs[] }[] }).geometries;
  const rings: Arcs = [];
  for (const g of geoms) {
    if (g.type === 'Polygon') rings.push(...(g.arcs as Arcs));
    else if (g.type === 'MultiPolygon') for (const poly of g.arcs as Arcs[]) rings.push(...poly);
  }
  for (const ring of rings) {
    const pts = ring.flatMap(i => arcs[i < 0 ? ~i : i]!.slice(1));
    const kept = pts.filter(q => q[2] >= minWeight).length;
    if (kept >= 3) continue;
    pts.filter(q => Number.isFinite(q[2]) && q[2] < minWeight).sort((a, b) => b[2] - a[2]).slice(0, 3 - kept).forEach(q => { q[2] = Infinity; });
  }

  const simple = simplify(pre, minWeight);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = (topoFeature(simple as any, simple.objects.units as any) as unknown as { features: Feature[] }).features;
  const after = countVertices(out);
  return {
    features: out,
    info: { method: 'Visvalingam on a shared topology (topojson-simplify, spherical area)', verticesBefore: before, verticesAfter: after, minAreaKm2: Math.round(minWeight * R_KM * R_KM * 1e6) / 1e6, units: out.length },
  };
}
