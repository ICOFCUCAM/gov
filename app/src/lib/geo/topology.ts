// Topology checks for boundary files (OGC Simple Features validity, INSPIRE
// topology rules), in plain JavaScript, on longitude/latitude:
//
// - kinks: a ring that crosses itself (a bow-tie) has no well-defined inside,
//   so areas and position checks go wrong. Segments are bucketed on a grid,
//   so a ring of 100,000 points is checked in linear time on average. Rings
//   that only touch at a shared vertex are not kinks.
// - coverage: every unit is rasterised (scan-line, even-odd, holes respected)
//   on one grid over the territory. Cells inside the national outline that no
//   unit covers are gaps, cells two units cover are overlaps, and the area of
//   their union is compared with the outline's. Gaps and overlaps are grouped
//   into patches and named by the units around them.
// - slivers: polygon parts that are tiny and thin (a digitising artefact
//   along a border), by area and compactness (4πA/P²).
// - nesting: the share of each district's area that lies in the region it is
//   filed under (beyond its centre point).
//
// The raster is an estimate at its cell size (reported); it finds the gaps and
// overlaps worth a person's attention, not slivers of a few metres.

import type { Geom } from './admin1';

type Ring = number[][];
const polysOf = (g: Geom): Ring[][] => (g.type === 'Polygon' ? [g.coordinates as Ring[]] : (g.coordinates as Ring[][]));
const KM_PER_DEG = 111.32;

// ── Kinks ───────────────────────────────────────────────────────────────────

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Where segments p1p2 and p3p4 cross in their interiors (not at an end point), if they do. */
function properCrossing(p1: number[], p2: number[], p3: number[], p4: number[]): [number, number] | null {
  const d1 = cross(p3[0]!, p3[1]!, p4[0]!, p4[1]!, p1[0]!, p1[1]!);
  const d2 = cross(p3[0]!, p3[1]!, p4[0]!, p4[1]!, p2[0]!, p2[1]!);
  const d3 = cross(p1[0]!, p1[1]!, p2[0]!, p2[1]!, p3[0]!, p3[1]!);
  const d4 = cross(p1[0]!, p1[1]!, p2[0]!, p2[1]!, p4[0]!, p4[1]!);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    const t = d1 / (d1 - d2);
    return [p1[0]! + t * (p2[0]! - p1[0]!), p1[1]! + t * (p2[1]! - p1[1]!)];
  }
  return null;
}

/** Points where a closed ring crosses itself (at most `max`). */
export function ringKinks(ring: Ring, max = 10): [number, number][] {
  const n = ring.length - 1; // closed: last point repeats the first
  if (n < 4) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) { if (x! < minX) minX = x!; if (x! > maxX) maxX = x!; if (y! < minY) minY = y!; if (y! > maxY) maxY = y!; }
  const side = Math.max(1, Math.ceil(Math.sqrt(n / 2)));
  const w = (maxX - minX) / side || 1, h = (maxY - minY) / side || 1;
  const cells = new Map<number, number[]>();
  const cx = (x: number) => Math.min(side - 1, Math.max(0, Math.floor((x - minX) / w)));
  const cy = (y: number) => Math.min(side - 1, Math.max(0, Math.floor((y - minY) / h)));
  for (let i = 0; i < n; i++) {
    const a = ring[i]!, b = ring[i + 1]!;
    for (let x = cx(Math.min(a[0]!, b[0]!)); x <= cx(Math.max(a[0]!, b[0]!)); x++) {
      for (let y = cy(Math.min(a[1]!, b[1]!)); y <= cy(Math.max(a[1]!, b[1]!)); y++) {
        const k = x * side + y; const list = cells.get(k); if (list) list.push(i); else cells.set(k, [i]);
      }
    }
  }
  const out: [number, number][] = [];
  const seen = new Set<string>();
  for (const list of cells.values()) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a]!, j = list[b]!;
        const d = Math.abs(i - j);
        if (d <= 1 || d === n - 1) continue; // neighbours share a vertex
        const key = i < j ? `${i},${j}` : `${j},${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const p = properCrossing(ring[i]!, ring[i + 1]!, ring[j]!, ring[j + 1]!);
        if (p) { out.push(p); if (out.length >= max) return out; }
      }
    }
  }
  return out;
}

/** Self-crossings of every ring of a shape. */
export function kinksOf(g: Geom, max = 10): [number, number][] {
  const out: [number, number][] = [];
  for (const poly of polysOf(g)) for (const ring of poly) { out.push(...ringKinks(ring, max - out.length)); if (out.length >= max) return out; }
  return out;
}

// ── Slivers ─────────────────────────────────────────────────────────────────

/** Planar area (km²) and perimeter (km) of one ring, on a local equirectangular plane. */
function ringMeasure(ring: Ring): { areaKm2: number; perimeterKm: number } {
  let lat0 = 0;
  for (const p of ring) lat0 += p[1]!;
  lat0 /= ring.length;
  const kx = KM_PER_DEG * Math.cos((lat0 * Math.PI) / 180), ky = KM_PER_DEG;
  let a = 0, per = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = [ring[i]![0]! * kx, ring[i]![1]! * ky], [x2, y2] = [ring[i + 1]![0]! * kx, ring[i + 1]![1]! * ky];
    a += x1 * y2 - x2 * y1;
    per += Math.hypot(x2 - x1, y2 - y1);
  }
  return { areaKm2: Math.abs(a) / 2, perimeterKm: per };
}

export interface Sliver { part: number; areaKm2: number; compactness: number }

/**
 * Parts of a shape that are slivers: smaller than `maxKm2` and thin
 * (compactness 4πA/P² below `thin`; a circle is 1, a square 0.785). A small
 * island is compact and is not a sliver.
 */
export function sliversOf(g: Geom, opts: { maxKm2?: number; thin?: number } = {}): Sliver[] {
  const maxKm2 = opts.maxKm2 ?? 5, thin = opts.thin ?? 0.05;
  const out: Sliver[] = [];
  polysOf(g).forEach((poly, part) => {
    const m = ringMeasure(poly[0]!);
    const c = m.perimeterKm > 0 ? (4 * Math.PI * m.areaKm2) / (m.perimeterKm * m.perimeterKm) : 0;
    if (m.areaKm2 < maxKm2 && c < thin) out.push({ part, areaKm2: Math.round(m.areaKm2 * 1000) / 1000, compactness: Math.round(c * 10000) / 10000 });
  });
  return out;
}

// ── Raster coverage ─────────────────────────────────────────────────────────

export interface Grid { minX: number; minY: number; dx: number; dy: number; cols: number; rows: number }

/** A grid over a bounding box with about `cells` cells, square on the ground. */
export function gridOver(bbox: [number, number, number, number], cells = 160_000): Grid {
  const [minX, minY, maxX, maxY] = bbox;
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180) || 1;
  const wKm = Math.max(1e-6, (maxX - minX) * k), hKm = Math.max(1e-6, maxY - minY);
  const side = Math.sqrt((wKm * hKm) / cells);
  const cols = Math.max(1, Math.ceil(wKm / side)), rows = Math.max(1, Math.ceil(hKm / side));
  return { minX, minY, dx: (maxX - minX) / cols || 1e-9, dy: (maxY - minY) / rows || 1e-9, cols, rows };
}

/** Cells whose centre lies inside the shape (even-odd within each polygon, so holes stay empty; parts that overlap each other stay filled). */
export function rasterise(g: Geom, grid: Grid): Uint8Array {
  const mask = new Uint8Array(grid.cols * grid.rows);
  for (const poly of polysOf(g)) fillPolygon(poly, grid, mask);
  return mask;
}

function fillPolygon(rings: Ring[], grid: Grid, mask: Uint8Array): void {
  let minY = Infinity, maxY = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1]! < minY) minY = p[1]!; if (p[1]! > maxY) maxY = p[1]!; }
  const r0 = Math.max(0, Math.floor((minY - grid.minY) / grid.dy)), r1 = Math.min(grid.rows - 1, Math.ceil((maxY - grid.minY) / grid.dy));
  const xs: number[] = [];
  for (let row = r0; row <= r1; row++) {
    const y = grid.minY + (row + 0.5) * grid.dy;
    xs.length = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i]!, [x2, y2] = ring[i + 1]!;
        if ((y1! <= y && y2! > y) || (y2! <= y && y1! > y)) xs.push(x1! + ((y - y1!) / (y2! - y1!)) * (x2! - x1!));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const c0 = Math.max(0, Math.ceil((xs[i]! - grid.minX) / grid.dx - 0.5)), c1 = Math.min(grid.cols - 1, Math.floor((xs[i + 1]! - grid.minX) / grid.dx - 0.5));
      for (let c = c0; c <= c1; c++) mask[row * grid.cols + c] = 1;
    }
  }
}

const cellKm2 = (grid: Grid, row: number) => grid.dx * grid.dy * KM_PER_DEG * KM_PER_DEG * Math.cos(((grid.minY + (row + 0.5) * grid.dy) * Math.PI) / 180);

export interface Patch { kind: 'gap' | 'overlap'; areaKm2: number; between: string[]; at: [number, number] }
export interface Coverage {
  /** Ground size of one raster cell (km), the precision of the estimate. */
  cellKm: number;
  unionKm2: number;
  outlineKm2?: number;
  gapKm2: number;
  overlapKm2: number;
  patches: Patch[];
}

/**
 * Coverage of the territory by the units: union area, gaps inside the outline
 * and overlaps between units, as named patches (largest first).
 */
export function coverage(units: { name: string; geometry: Geom }[], outline?: Geom, opts: { cells?: number; minPatchKm2?: number } = {}): Coverage {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const extend = (g: Geom) => { for (const r of polysOf(g).flat()) for (const p of r) { if (p[0]! < box[0]) box[0] = p[0]!; if (p[1]! < box[1]) box[1] = p[1]!; if (p[0]! > box[2]) box[2] = p[0]!; if (p[1]! > box[3]) box[3] = p[1]!; } };
  units.forEach(u => extend(u.geometry));
  if (outline) extend(outline);
  const grid = gridOver(box, opts.cells);
  const n = grid.cols * grid.rows;
  const count = new Uint8Array(n);
  const owner = new Int32Array(n).fill(-1);
  const second = new Int32Array(n).fill(-1);
  units.forEach((u, i) => {
    const m = rasterise(u.geometry, grid);
    for (let c = 0; c < n; c++) if (m[c]) { if (count[c]! < 255) count[c]!++; if (owner[c] === -1) owner[c] = i; else if (second[c] === -1) second[c] = i; }
  });
  const inside = outline ? rasterise(outline, grid) : null;
  // Without an outline, a gap is uncovered ground enclosed by units: not reachable from the edge of the grid.
  const exterior = new Uint8Array(n);
  if (!inside) {
    const stack: number[] = [];
    const push = (c: number) => { if (!count[c] && !exterior[c]) { exterior[c] = 1; stack.push(c); } };
    for (let col = 0; col < grid.cols; col++) { push(col); push((grid.rows - 1) * grid.cols + col); }
    for (let row = 0; row < grid.rows; row++) { push(row * grid.cols); push(row * grid.cols + grid.cols - 1); }
    while (stack.length) {
      const c = stack.pop()!;
      const row = Math.floor(c / grid.cols), col = c % grid.cols;
      if (row > 0) push(c - grid.cols); if (row < grid.rows - 1) push(c + grid.cols);
      if (col > 0) push(c - 1); if (col < grid.cols - 1) push(c + 1);
    }
  }
  let unionKm2 = 0, outlineKm2 = 0, gapKm2 = 0, overlapKm2 = 0;
  const kind = new Uint8Array(n); // 1 gap, 2 overlap
  for (let row = 0; row < grid.rows; row++) {
    const a = cellKm2(grid, row);
    for (let col = 0; col < grid.cols; col++) {
      const c = row * grid.cols + col;
      if (count[c]) unionKm2 += a;
      if (inside?.[c]) outlineKm2 += a;
      if (!count[c] && (inside ? inside[c] : !exterior[c])) { gapKm2 += a; kind[c] = 1; }
      if (count[c]! >= 2) { overlapKm2 += a; kind[c] = 2; }
    }
  }
  // Group cells of each kind into patches (4-connected) and name the units around them.
  const patches: Patch[] = [];
  const seen = new Uint8Array(n);
  // Patches of a cell or two are the raster's own edge effects (borders a little off a cell centre).
  const minPatch = opts.minPatchKm2 ?? Math.max(3 * cellKm2(grid, Math.floor(grid.rows / 2)), unionKm2 * 0.0005);
  for (let start = 0; start < n; start++) {
    if (!kind[start] || seen[start]) continue;
    const k = kind[start]!;
    const stack = [start];
    seen[start] = 1;
    let area = 0, sx = 0, sy = 0, cells = 0;
    const around = new Map<number, number>();
    while (stack.length) {
      const c = stack.pop()!;
      const row = Math.floor(c / grid.cols), col = c % grid.cols;
      area += cellKm2(grid, row); sx += col; sy += row; cells++;
      if (k === 2) { around.set(owner[c]!, (around.get(owner[c]!) ?? 0) + 1); around.set(second[c]!, (around.get(second[c]!) ?? 0) + 1); }
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
        const r = row + dr, cc = col + dc;
        if (r < 0 || r >= grid.rows || cc < 0 || cc >= grid.cols) continue;
        const q = r * grid.cols + cc;
        if (Math.abs(dr) + Math.abs(dc) === 1 && kind[q] === k && !seen[q]) { seen[q] = 1; stack.push(q); }
        else if (k === 1 && owner[q]! >= 0) around.set(owner[q]!, (around.get(owner[q]!) ?? 0) + 1);
      }
    }
    if (area < minPatch) continue;
    const between = [...around.entries()].filter(([i]) => i >= 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([i]) => units[i]!.name);
    patches.push({ kind: k === 1 ? 'gap' : 'overlap', areaKm2: Math.round(area * 10) / 10, between, at: [Math.round((grid.minX + (sx / cells + 0.5) * grid.dx) * 1e4) / 1e4, Math.round((grid.minY + (sy / cells + 0.5) * grid.dy) * 1e4) / 1e4] });
  }
  patches.sort((a, b) => b.areaKm2 - a.areaKm2);
  const cellKm = Math.round(Math.sqrt(cellKm2(grid, Math.floor(grid.rows / 2))) * 100) / 100;
  return { cellKm, unionKm2: Math.round(unionKm2), ...(outline ? { outlineKm2: Math.round(outlineKm2) } : {}), gapKm2: Math.round(gapKm2), overlapKm2: Math.round(overlapKm2), patches };
}

/**
 * How much of each child lies in each parent: for every child, the share of
 * its area in each parent, of the part that lies in any parent (ground
 * outside every parent, such as a coast drawn differently, is not counted).
 */
export function nesting(children: { name: string; geometry: Geom }[], parents: { code: string; name: string; geometry: Geom }[], opts: { cells?: number } = {}): { child: string; shares: { parent: string; share: number }[] }[] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const g of [...children, ...parents].map(x => x.geometry)) for (const r of polysOf(g).flat()) for (const p of r) { if (p[0]! < box[0]) box[0] = p[0]!; if (p[1]! < box[1]) box[1] = p[1]!; if (p[0]! > box[2]) box[2] = p[0]!; if (p[1]! > box[3]) box[3] = p[1]!; }
  const grid = gridOver(box, opts.cells ?? 250_000);
  const n = grid.cols * grid.rows;
  const parentOf = new Int32Array(n).fill(-1);
  parents.forEach((p, i) => { const m = rasterise(p.geometry, grid); for (let c = 0; c < n; c++) if (m[c] && parentOf[c] === -1) parentOf[c] = i; });
  return children.map(ch => {
    const m = rasterise(ch.geometry, grid);
    const tally = new Map<number, number>();
    let total = 0;
    for (let c = 0; c < n; c++) if (m[c] && parentOf[c]! >= 0) { total++; tally.set(parentOf[c]!, (tally.get(parentOf[c]!) ?? 0) + 1); }
    const shares = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([i, k]) => ({ parent: parents[i]!.code, share: total ? Math.round((k / total) * 1000) / 1000 : 0 }));
    return { child: ch.name, shares };
  });
}
