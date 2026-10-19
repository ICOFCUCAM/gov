// Polygons (with holes) into triangles for the WebGL polygon layer
// (lib/map/gl-layer.ts): ear clipping, with each hole joined to the outer
// ring by a bridge to a vertex it can see (Eberly, "Triangulation by Ear
// Clipping"). Plain JavaScript, no dependency; meant for the outlines a
// console map draws (building footprints, parcels, districts) at up to a few
// thousand vertices each. Input rings in screen pixels; output a flat list
// x0, y0, x1, y1, … with three vertices per triangle.

type P = [number, number];

const area2 = (r: readonly P[]) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j]![0] - r[i]![0]) * (r[j]![1] + r[i]![1]); return s; };
const cross = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

/** A ring without its closing duplicate and without repeated vertices. */
function clean(ring: readonly (readonly number[])[]): P[] {
  const out: P[] = [];
  for (const q of ring) {
    const p: P = [Number(q[0]), Number(q[1])];
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    out.push(p);
  }
  if (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1]) out.pop();
  return out;
}

const inTriangle = (p: P, a: P, b: P, c: P) => {
  const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
};

/** Join a hole (clockwise against a counter-clockwise outer, in y-up terms) into the outer ring. */
function bridge(outer: P[], hole: P[]): P[] {
  // The hole's rightmost vertex M.
  let mi = 0;
  hole.forEach((p, i) => { if (p[0] > hole[mi]![0]) mi = i; });
  const M = hole[mi]!;
  // Cast a ray to the right; find the nearest outer edge it meets.
  let best = Infinity, ei = -1, I: P = [0, 0];
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i]!, b = outer[(i + 1) % outer.length]!;
    if ((a[1] > M[1]) === (b[1] > M[1]) && a[1] !== M[1] && b[1] !== M[1]) continue;
    if (a[1] === b[1]) continue;
    const t = (M[1] - a[1]) / (b[1] - a[1]);
    if (t < 0 || t > 1) continue;
    const x = a[0] + t * (b[0] - a[0]);
    if (x >= M[0] && x - M[0] < best) { best = x - M[0]; ei = i; I = [x, M[1]]; }
  }
  let pi: number;
  if (ei < 0) {
    // No edge to the right (degenerate input): bridge to the nearest outer vertex.
    pi = 0;
    outer.forEach((p, i) => { if ((p[0] - M[0]) ** 2 + (p[1] - M[1]) ** 2 < (outer[pi]![0] - M[0]) ** 2 + (outer[pi]![1] - M[1]) ** 2) pi = i; });
  } else {
    const a = outer[ei]!, b = outer[(ei + 1) % outer.length]!;
    pi = a[0] > b[0] ? ei : (ei + 1) % outer.length;
    const P0 = outer[pi]!;
    // A reflex outer vertex inside triangle M, I, P0 hides P0: take the one at the smallest angle to the ray.
    let bestAngle = Infinity;
    for (let i = 0; i < outer.length; i++) {
      if (i === pi) continue;
      const v = outer[i]!;
      if (v[0] < M[0]) continue;
      if (!inTriangle(v, M, I, P0)) continue;
      const prev = outer[(i - 1 + outer.length) % outer.length]!, next = outer[(i + 1) % outer.length]!;
      if (cross(prev, v, next) > 0) continue; // convex in this winding: cannot hide P0
      const ang = Math.abs(Math.atan2(v[1] - M[1], v[0] - M[0]));
      if (ang < bestAngle) { bestAngle = ang; pi = i; }
    }
  }
  const h = [...hole.slice(mi), ...hole.slice(0, mi + 1)];
  return [...outer.slice(0, pi + 1), ...h, ...outer.slice(pi)];
}

/**
 * Triangles of a polygon: rings[0] the outer ring, the rest holes (any
 * winding; GeoJSON order or not). Returns x, y pairs, three per triangle;
 * empty for fewer than three distinct vertices.
 */
export function triangulate(rings: readonly (readonly (readonly number[])[])[]): number[] {
  let outer = clean(rings[0] ?? []);
  if (outer.length < 3) return [];
  // Work with the outer ring counter-clockwise (positive area in the shoelace above) and holes clockwise.
  if (area2(outer) < 0) outer = outer.reverse();
  const holes = rings.slice(1).map(clean).filter(h => h.length >= 3).map(h => (area2(h) > 0 ? h.reverse() : h));
  holes.sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0])));
  let poly = outer;
  for (const h of holes) poly = bridge(poly, h);

  const out: number[] = [];
  const idx = poly.map((_, i) => i);
  let guard = 0;
  while (idx.length > 3 && guard++ < poly.length * poly.length) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k - 1 + idx.length) % idx.length]!, ib = idx[k]!, ic = idx[(k + 1) % idx.length]!;
      const a = poly[ia]!, b = poly[ib]!, c = poly[ic]!;
      if (cross(a, b, c) <= 0) continue; // reflex or flat: the ring runs counter-clockwise, so an ear turns left
      let ear = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        const p = poly[j]!;
        if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
        if (inTriangle(p, a, b, c)) { ear = false; break; }
      }
      if (!ear) continue;
      out.push(a[0], a[1], b[0], b[1], c[0], c[1]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) {
      // Only flat or self-touching corners left: drop a flat one, or stop.
      const flat = idx.findIndex((ib, k) => cross(poly[idx[(k - 1 + idx.length) % idx.length]!]!, poly[ib]!, poly[idx[(k + 1) % idx.length]!]!) === 0);
      if (flat < 0) break;
      idx.splice(flat, 1);
    }
  }
  if (idx.length === 3) {
    const [a, b, c] = idx.map(i => poly[i]!);
    if (cross(a!, b!, c!) !== 0) out.push(a![0], a![1], b![0], b![1], c![0], c![1]);
  }
  return out;
}

/** The area covered by a triangle list (tests: equals the polygon's area less its holes). */
export function trianglesArea(t: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i + 5 < t.length; i += 6) s += Math.abs((t[i + 2]! - t[i]!) * (t[i + 5]! - t[i + 1]!) - (t[i + 4]! - t[i]!) * (t[i + 3]! - t[i + 1]!)) / 2;
  return s;
}

/** The area of a polygon given as rings (outer less holes). */
export function polygonArea(rings: readonly (readonly (readonly number[])[])[]): number {
  const a = rings.map(r => Math.abs(area2(clean(r))) / 2);
  return (a[0] ?? 0) - a.slice(1).reduce((s, x) => s + x, 0);
}
