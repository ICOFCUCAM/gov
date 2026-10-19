'use client';

// Located points (and polygons) drawn with WebGL over the map at national
// scale (architecture review G4, R13): above the map's WebGL threshold
// (lib/map/gl-points.ts, 20,000 by default) and always for tile-backed layers.
// The canvas takes no pointer events; NationMap asks it what is under the
// pointer (GPU picking) for hover and click, and its table view still lists
// every point for keyboard and screen-reader users. Colours are the status
// tokens and the theme's own background and surface, read from the page so
// they follow light, dark and the console ground. The layer follows the map's
// zoom with the same 260 ms ease as the SVG, or at once when the viewer asks
// for reduced motion. A lost WebGL context is reported (onLost) so the map
// draws the canvas layer meanwhile, and the layer is rebuilt when the browser
// restores the context.

import * as React from 'react';
import { STATUS } from '@/lib/theme/tokens';
import { GLMapLayer, mapContext, type LayerColours } from '@/lib/map/gl-layer';
import {
  TONE_ORDER, easeOut, glyphIndex, lerpZoom, mapMatrix, packPoints, packPolygons, parseColour, pointSize,
  type PointStyle, type Zoom,
} from '@/lib/map/gl-points';
import type { MapTone } from '@/lib/map/model';

export interface GLPointIn { x: number; y: number; tone: MapTone; glyph?: string; generalised?: boolean }
export interface GLPolygonIn { rings: number[][][]; triangles: number[]; fill: string; opacity?: number }
export interface WebGLPointsHandle {
  /** The point (and polygon) under a position on the page; null when the layer is not drawing. */
  pick(clientX: number, clientY: number, radiusPx?: number): { point: number | null; polygon: number | null } | null;
}

/** A theme colour variable ("r g b") read where the layer is drawn (the theatre sets its own). */
function themeVar(el: Element | null, name: string): string | null {
  if (!el || typeof window === 'undefined') return null;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || null;
}

function useReducedMotion(): boolean {
  const [r, setR] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return r;
}

const ZOOM_MS = 260;
const IDENTITY: Zoom = { z: 1, tx: 0, ty: 0 };

export const WebGLPoints = React.forwardRef<WebGLPointsHandle, {
  points: readonly GLPointIn[];
  polygons?: readonly GLPolygonIn[];
  width: number;
  height: number;
  zoom?: Zoom | null;
  /** Index (in `points`) of the selected point, ringed. (NationMap rings the hovered one itself, so hovering never redraws the layer.) */
  selected?: number | null;
  style?: PointStyle;
  /** The land the points spread over, in map pixels: sizes then follow the spacing between points (lib/map/gl-points.ts pointSize). */
  area?: number;
  /** Told when the WebGL context is lost (true) and when it is back (false). */
  onLost?: (lost: boolean) => void;
}>(function WebGLPoints({ points, polygons = [], width, height, zoom, selected, style = 'dot', area, onLost }, ref) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const layer = React.useRef<GLMapLayer | null>(null);
  const [state, setState] = React.useState<'starting' | 'ready' | 'lost' | 'unavailable'>('starting');
  const [generation, setGeneration] = React.useState(0);
  const reduced = useReducedMotion();
  const shown = React.useRef<Zoom>(zoom ?? IDENTITY);
  const anim = React.useRef<number | null>(null);
  const onLostRef = React.useRef(onLost);
  onLostRef.current = onLost;

  // Points packed once per set: draw order (alert last) and the pick colours.
  const glyphs = React.useMemo(() => glyphIndex(points.map(p => p.glyph)), [points]);
  const packed = React.useMemo(() => packPoints(points.map(p => ({ x: p.x, y: p.y, tone: p.tone, glyph: glyphs.of(p.glyph), generalised: p.generalised }))), [points, glyphs]);
  // Where the points lie on the map (for checks: data-extent).
  const extent = React.useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    return Number.isFinite(x0) ? [x0, y0, x1, y1].map(v => Math.round(v)).join(',') : '';
  }, [points]);
  // Polygon pick ids follow the point ids: one picking pass answers for both.
  const polyPacked = React.useMemo(() => packPolygons(polygons.map(p => ({ triangles: p.triangles, fill: parseColour(p.fill, p.opacity ?? 0.5) ?? [0.5, 0.5, 0.5, 0.5] })), packed.count), [polygons, packed.count]);

  // The context, made once per canvas and again after the browser restores a lost one.
  React.useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const make = () => {
      try { layer.current = new GLMapLayer(c); setState('ready'); setGeneration(g => g + 1); }
      catch { layer.current = null; setState('unavailable'); onLostRef.current?.(true); }
    };
    const lost = (e: Event) => { e.preventDefault(); layer.current = null; setState('lost'); onLostRef.current?.(true); };
    const restored = () => { make(); onLostRef.current?.(false); };
    c.addEventListener('webglcontextlost', lost);
    c.addEventListener('webglcontextrestored', restored);
    if (!mapContext(c)) { setState('unavailable'); onLostRef.current?.(true); }
    else make();
    return () => {
      c.removeEventListener('webglcontextlost', lost);
      c.removeEventListener('webglcontextrestored', restored);
      layer.current?.dispose();
      layer.current = null;
    };
  }, []);

  // Uploads: points, polygons, glyphs.
  React.useEffect(() => { layer.current?.setPoints(packed.data, packed.count); }, [packed, generation]);
  React.useEffect(() => { layer.current?.setPolygons(polyPacked.data, polyPacked.vertices); }, [polyPacked, generation]);
  React.useEffect(() => { if (glyphs.list.length) layer.current?.setGlyphs(glyphs.list); }, [glyphs, generation]);

  const colours = React.useCallback((): LayerColours => {
    const el = canvas.current;
    const v = (n: string, fb: [number, number, number, number]) => { const t = themeVar(el, n); return (t && parseColour(t)) || fb; };
    const tone = (t: MapTone) => parseColour(STATUS[t])!;
    return {
      tones: TONE_ORDER.map(tone),
      halo: v('--c-bg', [0, 0, 0, 1]),
      surface: v('--c-surface', [0.1, 0.1, 0.1, 1]),
      ring: v('--c-ink', [1, 1, 1, 1]),
      select: v('--c-ink', [1, 1, 1, 1]),
    };
  }, []);

  const paint = React.useCallback((z: Zoom) => {
    const c = canvas.current, l = layer.current;
    if (!c || !l) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const size = pointSize(style, z.z, packed.count, area);
    l.draw({
      matrix: mapMatrix(width, height, z), dpr, style, body: size.body, frame: size.frame, glyph: size.glyph && glyphs.list.length > 0, halo: size.halo, glow: size.glow,
      colours: colours(), hover: -1, selected: selected != null ? packed.drawIndex(selected) : -1,
    });
  }, [width, height, style, packed, glyphs, colours, selected, area]);

  // Draw, following the map's zoom (eased unless motion is reduced).
  React.useEffect(() => {
    if (state !== 'ready') return;
    const target = zoom && zoom.z > 1 ? zoom : IDENTITY;
    const from = shown.current;
    if (anim.current != null) cancelAnimationFrame(anim.current);
    const same = from.z === target.z && from.tx === target.tx && from.ty === target.ty;
    if (reduced || same || typeof requestAnimationFrame === 'undefined') { shown.current = target; paint(target); return; }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ZOOM_MS);
      shown.current = lerpZoom(from, target, easeOut(k));
      paint(shown.current);
      anim.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
    return () => { if (anim.current != null) cancelAnimationFrame(anim.current); };
  }, [state, zoom?.z, zoom?.tx, zoom?.ty, reduced, paint, generation]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useImperativeHandle(ref, () => ({
    pick(clientX: number, clientY: number, radiusPx = 8) {
      const c = canvas.current, l = layer.current;
      if (!c || !l || state !== 'ready') return null;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const sx = c.width / r.width, sy = c.height / r.height;
      return l.pick((clientX - r.left) * sx, (clientY - r.top) * sy, radiusPx * sx);
    },
  }), [state]);

  return (
    <canvas ref={canvas} aria-hidden className="pointer-events-none absolute start-0 top-0" style={{ width, height, visibility: state === 'ready' ? 'visible' : 'hidden' }}
      data-testid="map-webgl" data-state={state} data-points={packed.count} data-polygons={polygons.length} data-extent={extent} data-webgl={layer.current?.version ?? ''} />
  );
});
