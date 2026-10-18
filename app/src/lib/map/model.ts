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
/** Something located in a unit (e.g. open incidents), drawn at the unit's label point. */
export interface MapPoint { key: string; label: string; tone: MapTone; count?: number }

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
  points: { x: number; y: number; label: string; tone: MapTone; count?: number; unit: string }[];
  /** Figures whose key matched no unit (listed under the map, never dropped silently). */
  unmatched: string[];
  /** Units on the nation's list that have no shape in the boundary data. */
  noShape: string[];
  /** Share of the frame the nation's land covers (0–1): how well the projection uses the space. */
  coverage: number;
}

const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });
const collection = (gs: Geom[]) => ({ type: 'FeatureCollection' as const, features: gs.map(feature) });
const PAD = 10;

export function buildMapModel(geo: NationGeography, opts: { width: number; maxHeight: number; minHeight?: number; values?: MapValue[]; points?: MapPoint[] }): MapModel {
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

  const kind = projectionKind(geo.iso3, fc);
  const proj: GeoProjection = projectionFor(geo.iso3, fc);
  // The map keeps the nation's own proportions: fit to the width, then take the height it needs.
  proj.fitWidth(W - PAD * 2, fc);
  const [[, y0], [, y1]] = geoPath(proj).bounds(fc);
  const H = Math.round(Math.max(opts.minHeight ?? 220, Math.min(opts.maxHeight, y1 - y0 + PAD * 2)));
  proj.fitExtent([[PAD, PAD], [W - PAD, H - PAD - (groups.length ? 4 : 0)]], fc);

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
    const u = unitByKey.get(pt.key) ?? nameKeys(pt.key).map(k => unitByKey.get(k)).find(Boolean);
    if (u?.cx != null && u.cy != null) points.push({ x: u.cx, y: u.cy, label: pt.label, tone: pt.tone, count: pt.count, unit: u.name });
    else unplaced.push(pt.key);
  }

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
    unmatched: [...(opts.values ?? []).filter(v => !matchedKeys.has(v.key)).map(v => v.key), ...unplaced],
    noShape: geo.units.filter(u => !u.geometry).map(u => u.name),
    coverage: land / (W * H),
  };
}
