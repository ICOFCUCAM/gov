// The pure half of the WebGL map layer (architecture review G4, R13): which
// renderer a layer of located points uses, how points and polygons are packed
// into GPU buffers, how a point's index travels through the picking pass as a
// colour and back, the matrix from map pixels to clip space under the map's
// zoom, and point sizes by zoom. components/map/WebGLPoints.tsx and
// lib/map/gl-layer.ts draw with these; tests check them without a GPU.
//
// Renderers by number of located points (map plan budgets):
//   ≤ 2,000      SVG, every point a focusable element (unchanged)
//   ≤ 20,000     one 2D canvas, grid hit-testing (lib/map/point-layer.ts)
//   > 20,000     WebGL, GPU picking (and always for tile-backed layers)
// Without WebGL (or after the context is lost) the canvas layer draws instead.

import { CANVAS_POINTS } from './point-layer';
import type { MapTone } from './model';

/** Above this many points the layer draws with WebGL (configurable per map). */
export const WEBGL_POINTS = 20_000;
export type PointRenderer = 'svg' | 'canvas' | 'webgl';

/** Which renderer draws `n` located points. Tile-backed layers always use WebGL when it is there. */
export function pointRenderer(n: number, o: { webgl: boolean; webglAbove?: number; tiles?: boolean }): PointRenderer {
  if (o.tiles) return o.webgl ? 'webgl' : 'canvas';
  if (o.webgl && n > (o.webglAbove ?? WEBGL_POINTS)) return 'webgl';
  return n > CANVAS_POINTS ? 'canvas' : 'svg';
}

// ── Tones and colours ─────────────────────────────────────────────────────

/** Draw order: alert last, so the gravest stay on top (as on the canvas layer). */
export const TONE_ORDER: readonly MapTone[] = ['neutral', 'ok', 'warn', 'alert'];
export const toneIndex = (t: MapTone): number => Math.max(0, TONE_ORDER.indexOf(t));

/**
 * A colour as the GPU takes it, [r, g, b, a] in 0–1, from "#rgb", "#rrggbb",
 * "#rrggbbaa", "rgb(r, g, b)" / "rgba(…)" or a theme triplet "r g b". Null when
 * the string is none of these (a CSS variable must be resolved first).
 */
export function parseColour(s: string, alpha = 1): [number, number, number, number] | null {
  const v = s.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) { const [r, g, b] = m[1]!.split('').map(c => parseInt(c + c, 16) / 255); return [r!, g!, b!, alpha]; }
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v);
  if (m) {
    const n = parseInt(m[1]!, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, m[2] ? (parseInt(m[2], 16) / 255) * alpha : alpha];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(v) ?? /^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/.exec(v);
  if (m) {
    const a = m[4] ? (m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4])) : 1;
    return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255, a * alpha];
  }
  return null;
}

// ── Picking ids ───────────────────────────────────────────────────────────

/** Largest index a pick colour can carry (24 bits; 0 means "nothing here"). */
export const MAX_PICK = 0xfffffe;

/** A point's index as the colour the picking pass draws it in (index + 1 in 24 bits; alpha full). */
export function encodePickId(i: number): [number, number, number, number] {
  if (!Number.isInteger(i) || i < 0 || i > MAX_PICK) throw new RangeError(`pick id ${i} out of range`);
  const v = i + 1;
  return [v & 255, (v >> 8) & 255, (v >> 16) & 255, 255];
}

/** The index a picking colour stands for, or null for the empty background. */
export function decodePickId(r: number, g: number, b: number, a = 255): number | null {
  if (a === 0) return null;
  const v = r | (g << 8) | (b << 16);
  return v === 0 ? null : v - 1;
}

/**
 * The picked index nearest the centre of a block read back from the picking
 * buffer (`gl.readPixels`, RGBA rows bottom-up, `size`×`size`), within
 * `radius` pixels. Null when nothing was drawn there.
 */
export function nearestPick(pixels: Uint8Array, size: number, radius = size / 2, accept: (id: number) => boolean = () => true): number | null {
  const c = (size - 1) / 2;
  let best: number | null = null, bestD = radius * radius + 1e-9;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const o = (row * size + col) * 4;
      const id = decodePickId(pixels[o]!, pixels[o + 1]!, pixels[o + 2]!, pixels[o + 3]!);
      if (id == null || !accept(id)) continue;
      const d = (col - c) ** 2 + (row - c) ** 2;
      if (d < bestD || (d === bestD && best !== null && id > best)) { bestD = d; best = id; }
    }
  }
  return best;
}

// ── Buffers ───────────────────────────────────────────────────────────────

/** Bytes per point: x, y (float32), tone, glyph, flags, spare (uint8), pick colour (4 × uint8). */
export const POINT_STRIDE = 16;
export const NO_GLYPH = 255;
/** Point flags: the position is generalised (restricted site), drawn with a dashed edge. */
export const FLAG_GENERALISED = 1;

export interface PackablePoint { x: number; y: number; tone: MapTone; glyph?: number; generalised?: boolean }

/**
 * Points packed for one interleaved vertex buffer, in draw order (tone order,
 * alert last; stable within a tone). `order[k]` is the caller's index of the
 * k-th drawn point, and the pick colour carries that index, so a pick answers
 * with the caller's own index.
 */
export function packPoints(points: readonly PackablePoint[]): { data: ArrayBuffer; count: number; order: Uint32Array; drawIndex: (i: number) => number } {
  const n = points.length;
  if (n > MAX_PICK + 1) throw new RangeError(`at most ${MAX_PICK + 1} points in one layer`);
  const order = new Uint32Array(n);
  const counts = [0, 0, 0, 0];
  for (const p of points) counts[toneIndex(p.tone)]!++;
  const start = [0, counts[0]!, counts[0]! + counts[1]!, counts[0]! + counts[1]! + counts[2]!];
  points.forEach((p, i) => { order[start[toneIndex(p.tone)]!++] = i; });
  const inverse = new Uint32Array(n);
  order.forEach((orig, k) => { inverse[orig] = k; });
  const data = new ArrayBuffer(n * POINT_STRIDE);
  const f = new Float32Array(data), u = new Uint8Array(data);
  for (let k = 0; k < n; k++) {
    const i = order[k]!, p = points[i]!, o = k * POINT_STRIDE;
    f[o / 4] = p.x; f[o / 4 + 1] = p.y;
    u[o + 8] = toneIndex(p.tone);
    u[o + 9] = p.glyph != null && p.glyph >= 0 && p.glyph < NO_GLYPH ? p.glyph : NO_GLYPH;
    u[o + 10] = p.generalised ? FLAG_GENERALISED : 0;
    u[o + 11] = 0;
    const [r, g, b, a] = encodePickId(i);
    u[o + 12] = r; u[o + 13] = g; u[o + 14] = b; u[o + 15] = a;
  }
  return { data, count: n, order, drawIndex: (i: number) => inverse[i] ?? -1 };
}

/** Bytes per polygon vertex: x, y (float32), fill colour (4 × uint8), pick colour (4 × uint8). */
export const POLY_STRIDE = 16;

/**
 * Triangulated polygons packed as one triangle list: each vertex carries its
 * polygon's fill colour (0–255 RGBA) and pick colour (the polygon's index
 * after `pickOffset`, so points and polygons share one picking pass).
 */
export function packPolygons(polys: readonly { triangles: Float32Array | number[]; fill: [number, number, number, number] }[], pickOffset = 0): { data: ArrayBuffer; vertices: number } {
  const vertices = polys.reduce((s, p) => s + p.triangles.length / 2, 0);
  const data = new ArrayBuffer(vertices * POLY_STRIDE);
  const f = new Float32Array(data), u = new Uint8Array(data);
  let v = 0;
  polys.forEach((p, i) => {
    const pick = encodePickId(pickOffset + i);
    const fill = p.fill.map(c => Math.round(Math.max(0, Math.min(1, c)) * 255));
    for (let k = 0; k + 1 < p.triangles.length; k += 2, v++) {
      const o = v * POLY_STRIDE;
      f[o / 4] = p.triangles[k]!; f[o / 4 + 1] = p.triangles[k + 1]!;
      u.set(fill, o + 8); u.set(pick, o + 12);
    }
  });
  return { data, vertices };
}

// ── Matrices and sizes ────────────────────────────────────────────────────

export interface Zoom { z: number; tx: number; ty: number }

/**
 * Map pixels to clip space as a column-major 3×3 matrix (WebGL's uniformMatrix3fv):
 * the map's zoom (scale z after moving by tx/ty, as the SVG group's
 * `translate(tx ty) scale(z)`), then x right and y down across width × height.
 */
export function mapMatrix(width: number, height: number, zoom?: Zoom | null): Float32Array {
  const z = zoom && zoom.z > 0 ? zoom : { z: 1, tx: 0, ty: 0 };
  return new Float32Array([
    (2 * z.z) / width, 0, 0,
    0, (-2 * z.z) / height, 0,
    (2 * z.tx) / width - 1, 1 - (2 * z.ty) / height, 1,
  ]);
}

/** A map pixel through a column-major 3×3 matrix (what the vertex shader does). */
export function applyMatrix(m: ArrayLike<number>, x: number, y: number): [number, number] {
  return [m[0]! * x + m[3]! * y + m[6]!, m[1]! * x + m[4]! * y + m[7]!];
}

/** A zoom part way between two (the layer follows the SVG's 260 ms zoom unless motion is reduced). */
export function lerpZoom(a: Zoom, b: Zoom, t: number): Zoom {
  const k = Math.max(0, Math.min(1, t));
  return { z: a.z + (b.z - a.z) * k, tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k };
}
export const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export type PointStyle = 'dot' | 'tile';

/**
 * How big a point is drawn, in CSS pixels, by style, zoom and density.
 * 'dot' (standard maps): a 7 px dot with its halo, 5 px when there are more
 * than 50,000, growing with the square root of the zoom up to three times.
 * 'tile' (the Situation Room theatre): the 18 px glyph tile of the SVG
 * theatre when the layer is sparse or zoomed in; a small 7 px tile without a
 * glyph when thousands crowd the whole-nation view. `body` is the tile's
 * side or the dot's diameter; `frame` adds room for the theatre's glow.
 */
export function pointSize(style: PointStyle, zoomZ: number, count: number): { body: number; frame: number; glyph: boolean } {
  const grow = Math.min(3, Math.sqrt(Math.max(1, zoomZ)));
  if (style === 'dot') {
    const body = (count > 50_000 ? 5 : 7) * grow;
    return { body, frame: body, glyph: false };
  }
  const dense = count > 2000 && zoomZ < 4;
  const body = dense ? Math.min(18, 7 * grow) : 18;
  return { body, frame: body + (dense ? 4 : 10), glyph: body >= 12 };
}

// ── Glyph atlas ───────────────────────────────────────────────────────────

/** Cells of the glyph atlas (the register's category glyphs), drawn once into a texture. */
export const ATLAS_CELL = 32;
export function atlasLayout(glyphs: number): { cols: number; rows: number; width: number; height: number } {
  const cols = Math.max(1, Math.min(16, glyphs));
  const rows = Math.max(1, Math.ceil(glyphs / cols));
  return { cols, rows, width: cols * ATLAS_CELL, height: rows * ATLAS_CELL };
}
/** The glyph index of each distinct glyph string, in first-seen order. */
export function glyphIndex(glyphs: readonly (string | undefined)[]): { list: string[]; of: (g?: string) => number | undefined } {
  const list: string[] = [], at = new Map<string, number>();
  for (const g of glyphs) if (g && !at.has(g) && list.length < NO_GLYPH) { at.set(g, list.length); list.push(g); }
  return { list, of: g => (g ? at.get(g) : undefined) };
}
