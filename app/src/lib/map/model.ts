// Everything a map draws, worked out from the nation's geography and the
// figures a page passes in: paths for every unit fitted to the box with the
// nation's projection (and inset boxes), shading classes, label points, the
// scale bar, and which figures matched no unit. Pure, so it is tested
// without a browser; components/map/NationMap.tsx renders it.

import { geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo';
import type { Geom } from '@/lib/geo/admin1';
import type { NationGeography } from './geography';
import { INSETS, insetProjection, projectionFor, projectionKind, scaleBar, type ProjectionKind } from './projection';
import { quantileClasses, type Classes } from './classify';
import { nameKeys } from './names';

/** A figure for one unit, keyed by the unit's name (as the nation's region list spells it) or its ISO 3166-2 code. */
export interface MapValue { key: string; value: number; unit?: string; asOf?: string; note?: string }
export type MapTone = 'ok' | 'warn' | 'alert' | 'neutral';
/**
 * Something on the map: located in a unit (e.g. open incidents, drawn at the
 * unit's label point), or at its own longitude/latitude (a registered site).
 */
export interface MapPoint { key: string; label: string; tone: MapTone; count?: number; lng?: number; lat?: number; glyph?: string; href?: string }

export interface ModelUnit { name: string; code?: string; d: string; cx?: number; cy?: number; value?: MapValue; cls?: number }
export interface MapModel {
  width: number;
  height: number;
  kind: ProjectionKind;
  units: ModelUnit[];
  context: string[];
  frames: { x: number; y: number; w: number; h: number }[];
  classes: Classes;
  scale: { km: number; px: number } | null;
  points: { x: number; y: number; label: string; tone: MapTone; count?: number; unit: string; glyph?: string; href?: string; exact?: boolean }[];
  /** Figures whose key matched no unit (listed under the map, never dropped silently). */
  unmatched: string[];
  /** Units on the nation's list that have no shape in the boundary data. */
  noShape: string[];
  /** Share of the frame the nation's land covers (0–1): how well the projection uses the space. */
  coverage: number;
  /** The capital's position on the map, when it falls inside the frame. */
  capital: { x: number; y: number; name: string; chosen: boolean } | null;
  /** Where a longitude/latitude falls on this map (null outside the frame), for overlays. */
  project: (lng: number, lat: number) => [number, number] | null;
  /** The longitude/latitude under a point of the map (null off the projection). */
  invert: (x: number, y: number) => [number, number] | null;
  /** An outside shape (e.g. a neighbouring country) drawn with this map's projection. */
  pathOf: (g: Geom) => string;
  /** The on-map bounding box of an outside shape, [[x0, y0], [x1, y1]]. */
  boundsOf: (g: Geom) => [[number, number], [number, number]];
}

const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });
const collection = (gs: Geom[]) => ({ type: 'FeatureCollection' as const, features: gs.map(feature) });
const PAD = 10;

export interface MapOptions {
  width: number;
  maxHeight: number;
  minHeight?: number;
  values?: MapValue[];
  points?: MapPoint[];
  /** The projection the nation chose (SovereignProfile.map.projection); unset picks one for its shape. */
  projection?: ProjectionKind;
  /** The capital to mark; `chosen` is false for the map data's default. */
  capital?: { name: string; lng: number; lat: number; chosen: boolean } | null;
  /**
   * Fill a fixed frame instead of taking the height the nation needs (the
   * Situation Room theatre): the nation is fitted inside, centred, keeping its
   * proportions, with room kept free at the end for panels laid over the map.
   */
  frame?: { height: number; insetEnd?: number; insetBottom?: number };
}

export function buildMapModel(geo: NationGeography, opts: MapOptions): MapModel {
  const W = Math.max(200, Math.round(opts.width));
  const shaped = geo.units.filter(u => u.geometry);
  // The frame fits the nation's own units; outlying shapes not on its list are drawn as context around them.
  const own = shaped.map(u => u.geometry!);
  const base = own.length ? own : geo.context.length ? geo.context : geo.outline ? [geo.outline] : [];

  // Inset groups present for this nation; the rest is the mainland the projection fits.
  const groups = (INSETS[geo.iso3] ?? []).map(codes => shaped.filter(u => u.code && codes.includes(u.code))).filter(g => g.length);
  const inInset = new Set(groups.flat());
  const mainland = base.filter(g => !groups.flat().some(u => u.geometry === g));
  const fc = collection(mainland.length ? mainland : base) as GeoPermissibleObjects;

  const kind = projectionKind(geo.iso3, fc, opts.projection);
  const proj: GeoProjection = projectionFor(geo.iso3, fc, opts.projection);
  // The map keeps the nation's own proportions: fit to the width, then take the height it needs.
  let H: number;
  if (opts.frame) {
    H = Math.round(opts.frame.height);
    const end = Math.min(W * 0.4, opts.frame.insetEnd ?? 0);
    proj.fitExtent([[PAD * 4, PAD * 4], [W - PAD * 4 - end, H - PAD * 5 - Math.min(H * 0.3, opts.frame.insetBottom ?? 0)]], fc);
  } else {
    proj.fitWidth(W - PAD * 2, fc);
    const [[, y0], [, y1]] = geoPath(proj).bounds(fc);
    H = Math.round(Math.max(opts.minHeight ?? 220, Math.min(opts.maxHeight, y1 - y0 + PAD * 2)));
    proj.fitExtent([[PAD, PAD], [W - PAD, H - PAD - (groups.length ? 4 : 0)]], fc);
  }

  const bw = Math.round(Math.min(96, W * 0.18)), bh = Math.round(bw * 0.72), gap = 6;
  const frames = groups.map((g, k) => {
    const x = W - PAD - (groups.length - k) * (bw + gap) + gap, y = H - PAD - bh;
    return { x, y, w: bw, h: bh, proj: insetProjection().fitExtent([[x + 6, y + 6], [x + bw - 6, y + bh - 6]], collection(g.map(u => u.geometry!)) as never) };
  });
  const projOf = (u: (typeof shaped)[number]) => (inInset.has(u) ? frames[groups.findIndex(g => g.includes(u))]!.proj : proj);

  // Figures by unit: by code first, then by any of the unit's name forms.
  const byKey = new Map<string, MapValue>();
  for (const v of opts.values ?? []) { byKey.set(v.key, v); for (const k of nameKeys(v.key)) if (!byKey.has(k)) byKey.set(k, v); }
  const valueFor = (name: string, code?: string) => (code ? byKey.get(code) : undefined) ?? nameKeys(name).map(k => byKey.get(k)).find(Boolean);
  const matchedKeys = new Set<string>();

  let land = 0;
  const units: ModelUnit[] = geo.units.map(u => {
    const value = valueFor(u.name, u.code);
    if (value) matchedKeys.add(value.key);
    if (!u.geometry) return { name: u.name, code: u.code, d: '', value };
    const p = projOf(u);
    const d = geoPath(p)(feature(u.geometry) as never) || '';
    land += geoPath(p).area(feature(u.geometry) as never) || 0;
    const c = u.lng != null && u.lat != null ? p([u.lng, u.lat]) : null;
    const [cx, cy] = c ?? geoPath(p).centroid(feature(u.geometry) as never);
    return { name: u.name, code: u.code, d, cx: Number.isFinite(cx) ? cx : undefined, cy: Number.isFinite(cy) ? cy : undefined, value };
  });
  const classes = quantileClasses(units.flatMap(u => (u.value ? [u.value.value] : [])));
  for (const u of units) if (u.value) u.cls = classes.of(u.value.value);

  const unitByKey = new Map<string, ModelUnit>();
  for (const u of units) { if (u.code) unitByKey.set(u.code, u); for (const k of nameKeys(u.name)) if (!unitByKey.has(k)) unitByKey.set(k, u); }
  const points: MapModel['points'] = [];
  const unplaced: string[] = [];
  for (const pt of opts.points ?? []) {
    if (pt.lng != null && pt.lat != null) {
      const q = proj([pt.lng, pt.lat]);
      if (q && q.every(Number.isFinite) && q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= H) {
        const inUnit = units.find(u => u.code === pt.key || u.name === pt.key);
        points.push({ x: q[0], y: q[1], label: pt.label, tone: pt.tone, count: pt.count, unit: inUnit?.name ?? '', glyph: pt.glyph, href: pt.href, exact: true });
      } else unplaced.push(pt.label);
      continue;
    }
    const u = unitByKey.get(pt.key) ?? nameKeys(pt.key).map(k => unitByKey.get(k)).find(Boolean);
    if (u?.cx != null && u.cy != null) points.push({ x: u.cx, y: u.cy, label: pt.label, tone: pt.tone, count: pt.count, unit: u.name });
    else unplaced.push(pt.key);
  }
  // Figures for units of another level (e.g. districts while the map shows regions) are not "unplaced";
  // nor, inside an opened unit, are the figures for the nation's regions.
  const elsewhere = new Set(geo.otherCodes ?? []);
  const scoped = !!geo.parent;

  const cap = opts.capital ? proj([opts.capital.lng, opts.capital.lat]) : null;
  const capital = cap && cap.every(Number.isFinite) && cap[0] >= 0 && cap[0] <= W && cap[1] >= 0 && cap[1] <= H
    ? { x: cap[0], y: cap[1], name: opts.capital!.name, chosen: opts.capital!.chosen } : null;

  return {
    width: W,
    height: H,
    kind,
    units,
    context: geo.context.map(g => geoPath(proj)(feature(g) as never) || ''),
    frames: frames.map(({ x, y, w, h }) => ({ x, y, w, h })),
    classes,
    scale: scaleBar(proj, W, H),
    points,
    unmatched: scoped ? [] : [...(opts.values ?? []).filter(v => !matchedKeys.has(v.key) && !elsewhere.has(v.key)).map(v => v.key), ...unplaced.filter(k => !elsewhere.has(k))],
    noShape: geo.units.filter(u => !u.geometry).map(u => u.name),
    coverage: land / (W * H),
    capital,
    pathOf: g => geoPath(proj)(feature(g) as never) || '',
    boundsOf: g => geoPath(proj).bounds(feature(g) as never) as [[number, number], [number, number]],
    invert: (x, y) => { const q = proj.invert?.([x, y]); return q && q.every(Number.isFinite) ? [q[0], q[1]] : null; },
    project: (lng, lat) => { const q = proj([lng, lat]); return q && q.every(Number.isFinite) && q[0] >= 0 && q[0] <= W && q[1] >= 0 && q[1] <= H ? [q[0], q[1]] : null; },
  };
}
