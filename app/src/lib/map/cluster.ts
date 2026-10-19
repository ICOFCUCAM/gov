// Clustering of located points at low zoom (architecture review G4): at the
// whole-nation view a national register of 10⁵ sites is a carpet of dots, so
// nearby points merge into one mark with a count; zooming in (or activating a
// cluster, which zooms to it) splits them again. Computed in the browser from
// the points the map already has (page points or tile-loaded features), with
// no outside service.
//
// The method is a grid in the map's own pixels: cells of `radius` screen
// pixels at the current zoom (radius / z map pixels), anchored at the map's
// origin, so a cluster stays put while the map pans and splits predictably as
// it zooms. A cell holding at least `minPoints` points becomes one cluster at
// the points' mean position; a cell with fewer leaves its points as they are.
// O(n) for n points (one pass and one map of cells). Above `maxZoom` nothing
// clusters. Pure: NationMap draws the result (components/map/NationMap.tsx)
// for both the canvas (lib/map/point-layer.ts) and WebGL
// (components/map/WebGLPoints.tsx) layers.

import { TONE_ORDER, toneIndex, type Zoom } from './gl-points';
import type { MapTone } from './model';

export interface ClusterOptions {
  /** Map zoom (1 = the whole map). */
  zoom?: number;
  /** Size of a cluster cell on the screen, in CSS pixels (default 48). */
  radius?: number;
  /** Fewest points that make a cluster (default 2). */
  minPoints?: number;
  /** From this map zoom on, every point is drawn on its own (default 16). */
  maxZoom?: number;
}

export interface PointCluster {
  /** Stable for the same cell at the same zoom (React key, picking). */
  id: string;
  /** Mean position of the members, in map pixels. */
  x: number;
  y: number;
  count: number;
  /** The gravest status among the members (alert, then warn, ok, neutral). */
  tone: MapTone;
  /** Members by status. */
  tones: Record<MapTone, number>;
  /** The members' extent in map pixels: [x0, y0, x1, y1]. */
  bounds: [number, number, number, number];
  /** Indices of the members in the input. */
  members: number[];
}

export interface Clustered {
  /** Indices of the points drawn on their own, in input order. */
  singles: number[];
  clusters: PointCluster[];
}

export const CLUSTER_RADIUS = 48;
export const CLUSTER_MAX_ZOOM = 16;

/** Points merged into clusters by a screen-space grid at the given zoom. */
export function clusterPoints(points: readonly { x: number; y: number; tone: MapTone }[], o: ClusterOptions = {}): Clustered {
  const z = Math.max(1, o.zoom ?? 1);
  const minPoints = Math.max(2, Math.floor(o.minPoints ?? 2));
  if (z >= (o.maxZoom ?? CLUSTER_MAX_ZOOM) || points.length < minPoints) return { singles: points.map((_, i) => i), clusters: [] };
  const cell = Math.max(1, o.radius ?? CLUSTER_RADIUS) / z;
  const cells = new Map<string, number[]>();
  points.forEach((p, i) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const a = cells.get(k); if (a) a.push(i); else cells.set(k, [i]);
  });
  const clusters: PointCluster[] = [];
  const single = new Uint8Array(points.length);
  for (const [k, idx] of cells) {
    if (idx.length < minPoints) { for (const i of idx) single[i] = 1; continue; }
    let sx = 0, sy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, worst = 0;
    const tones: Record<MapTone, number> = { neutral: 0, ok: 0, warn: 0, alert: 0 };
    for (const i of idx) {
      const p = points[i]!;
      sx += p.x; sy += p.y;
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
      tones[p.tone] = (tones[p.tone] ?? 0) + 1;
      worst = Math.max(worst, toneIndex(p.tone));
    }
    clusters.push({ id: `${z.toFixed(3)}:${k}`, x: sx / idx.length, y: sy / idx.length, count: idx.length, tone: TONE_ORDER[worst]!, tones, bounds: [x0, y0, x1, y1], members: idx });
  }
  const singles: number[] = [];
  for (let i = 0; i < points.length; i++) if (single[i]) singles.push(i);
  // Larger clusters last, so they draw on top; ties by position for a stable order.
  clusters.sort((a, b) => a.count - b.count || a.y - b.y || a.x - b.x);
  return { singles, clusters };
}

/**
 * The zoom that opens a cluster: its members' extent fitted to the map with a
 * margin, at least twice the current zoom (so every activation goes deeper,
 * even for points on one spot), at most four times it (one step at a time, so
 * the viewer keeps their bearings, as a map's zoom levels do) and at most `max`. Same form as NationMap's
 * `zoom` (translate(tx ty) scale(z)).
 */
export function zoomToCluster(c: Pick<PointCluster, 'bounds' | 'x' | 'y'>, width: number, height: number, current = 1, max = 64): Zoom {
  const [x0, y0, x1, y1] = c.bounds;
  const bw = Math.max(1e-6, x1 - x0), bh = Math.max(1e-6, y1 - y0);
  const fit = Math.min((width * 0.7) / bw, (height * 0.7) / bh);
  const cur = Math.max(1, current);
  const z = Math.min(max, cur * 4, Math.max(cur * 2, fit));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { z, tx: width / 2 - cx * z, ty: height / 2 - cy * z };
}

/** Screen radius of a cluster mark (CSS pixels) by its count: 10 px for 2, growing with the log of the count, at most 20 (so marks of neighbouring 48 px cells rarely touch). */
export const clusterRadius = (count: number): number => Math.min(20, 9 + 3.4 * Math.log10(Math.max(2, count)));

/** A cluster's count as it is written on the mark: 1,234 → "1.2k", 120,000 → "120k". */
export function clusterCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(Math.floor(n / 100_000) / 10).toFixed(1).replace(/\.0$/, '')}M`;
}

const TONE_WORDS: Record<MapTone, string> = { alert: 'critical', warn: 'needing attention', ok: 'normal', neutral: 'without a status' };

/** The accessible name of a cluster mark: how many, by status, and what activating it does. */
export function clusterLabel(c: Pick<PointCluster, 'count' | 'tones'>, noun = 'items'): string {
  const parts = (['alert', 'warn', 'ok', 'neutral'] as const).filter(t => c.tones[t]).map(t => `${c.tones[t].toLocaleString('en')} ${TONE_WORDS[t]}`);
  return `${c.count.toLocaleString('en')} ${noun} close together${parts.length ? ` (${parts.join(', ')})` : ''}. Zoom in to see them.`;
}
