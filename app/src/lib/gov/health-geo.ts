// National Health Geospatial Intelligence.
//
// Spatial layer for the Ministry of Health: a deterministic national map —
// one entry per region of the installed nation (the six reference slots until
// one is set), logistics corridors between named regions, per-region geo
// telemetry (pressure / ICU / outbreak / ambulance / escalation), live
// asset movement along corridors, and a QUANTIFIED AI rerouting directive
// ("Redirect N ICU patients from X to Y within Mm — overload p=0.NN").
// Every figure is a sample until a health information source is connected
// (callers mark it). Pure & deterministic; no React/DOM.

import { wave, seed } from '@/lib/telemetry';
import { nationalSituation } from '@/lib/gov/health-operations';
import { nationCapital, nationRegions, regionName } from '@/lib/nation/registry';
import { nameKeys } from '@/lib/map/names';

export interface GeoRegion {
  region: string;
  x: number; y: number;            // 0-100 schematic canvas (maps use the region's real shape)
  pressure: number;                // composite 0-100
  icuLoad: number;                 // 0-100
  outbreakHeat: number;            // 0-100
  ambulances: number;
  escalation: 'stable' | 'elevated' | 'critical';
  tone: 'ok' | 'warn' | 'alert';
  /** Sample test positivity, % (high = worse). */
  testPositivity: number;
  /** Sample share not vaccinated, % (high = worse). */
  vaccinationGap: number;
}
export interface GeoCorridor {
  from: string; to: string;
  fx: number; fy: number; tx: number; ty: number;
  loadPct: number;
  tone: 'ok' | 'warn' | 'alert';
}
export interface GeoAsset {
  id: string; kind: 'ambulance' | 'supply';
  x: number; y: number;            // current interpolated position
  corridor: string;
  /** How far along its corridor (0 = from, 1 = to), so a map can place it on the real route. */
  phase: number;
  tone: 'ok' | 'warn' | 'alert';
}
export interface GeoRerouteDirective {
  active: boolean;
  patients: number;
  fromRegion: string;
  toRegion: string;
  windowMin: number;
  overloadProb: number;            // 0-1
  text: string;
  tone: 'ok' | 'warn' | 'alert';
}
export interface HealthGeo {
  regions: GeoRegion[];
  corridors: GeoCorridor[];
  assets: GeoAsset[];
  reroute: GeoRerouteDirective;
}

const COORDS: Record<string, { x: number; y: number }> = {
  'Capital District': { x: 50, y: 52 },
  Northern: { x: 47, y: 17 },
  Eastern: { x: 82, y: 44 },
  Western: { x: 19, y: 47 },
  Coastal: { x: 63, y: 84 },
  Highland: { x: 28, y: 79 },
};
const EDGES: [string, string][] = [
  ['Capital District', 'Northern'], ['Capital District', 'Eastern'],
  ['Capital District', 'Western'], ['Capital District', 'Coastal'],
  ['Capital District', 'Highland'], ['Western', 'Highland'],
  ['Eastern', 'Coastal'], ['Northern', 'Eastern'],
];

// Before the nation's regions are set the reference fabric keeps its six
// slots on their schematic canvas. Once set, EVERY region of the nation gets an
// entry (read at use, never at module load): the hub is the region named like
// the capital the maps mark (nationCapital), else the first region, as
// regionName(0) treats it; the rest are laid out around it on the schematic
// canvas (x/y are a drawing aid only; maps place regions by their
// real shapes, matched by name).
const SLOTS = Object.keys(COORDS);

/** Schematic canvas position for region i of n (hub at the centre, the rest on a sunflower spiral). */
function layout(i: number, n: number, hub: number): { x: number; y: number } {
  if (i === hub) return { x: 50, y: 50 };
  const k = i < hub ? i + 1 : i, golden = Math.PI * (3 - Math.sqrt(5));
  const r = 42 * Math.sqrt(k / Math.max(1, n - 1));
  const a = k * golden;
  return { x: Math.round((50 + r * Math.cos(a)) * 10) / 10, y: Math.round((50 + r * Math.sin(a)) * 10) / 10 };
}

/**
 * Corridors for the nation's own regions: spokes from the hub to up to seven
 * regions spread through the official order, and links between neighbouring
 * spoke ends — a stable network (the same regions every tick), so moving
 * traffic reads as travel, not as lines jumping about.
 */
function nationEdges(names: readonly string[], hub: number): [string, string][] {
  const others = names.filter((_, i) => i !== hub);
  const n = others.length;
  if (n < 1) return [];
  const k = Math.min(n, 7);
  const ends = Array.from({ length: k }, (_, j) => others[Math.floor((j * n) / k)]!);
  const spokes = ends.map(e => [names[hub]!, e] as [string, string]);
  const ring = ends.slice(0, Math.max(0, k - 2)).map((e, j) => [e, ends[j + 1]!] as [string, string]);
  return [...spokes, ...ring];
}

/** The region holding the capital the maps mark, by name; else the first. */
function hubIndex(names: readonly string[]): number {
  const cap = nationCapital();
  if (!cap) return 0;
  const want = new Set(nameKeys(cap.name));
  const i = names.findIndex(n => nameKeys(n).some(k => want.has(k)));
  return i >= 0 ? i : 0;
}

/** Sample per-region extras (test positivity, unvaccinated share), 0-100, high = worse. */
const extras = (id: string, region: string, t: number) => ({
  testPositivity: Math.round(wave(`hg:tp:${id}:${region}`, t, 2, 38)),
  vaccinationGap: Math.round(wave(`hg:vg:${id}:${region}`, t, 6, 64)),
});

export function healthGeo(id: string, t: number): HealthGeo {
  const ns = nationalSituation(id, t);
  const byRegion = new Map(ns.regions.map(r => [r.region, r]));
  const own = nationRegions();
  const nation = own.length > 0;
  // One entry per region of the installed nation; the reference slots until one is set.
  const names: string[] = nation ? [...own] : SLOTS.map((slot, i) => regionName(i, slot));
  const hub = nation ? hubIndex(names) : 0;
  const pos = (i: number) => (nation ? layout(i, names.length, hub) : COORDS[SLOTS[i]!]!);
  const regions: GeoRegion[] = names.map((region, i): GeoRegion => {
    const r = byRegion.get(region);
    const pressure = r ? r.composite : Math.round(wave(`hg:p:${id}:${region}`, t, 30, 95));
    const icuLoad = r ? r.icuPressure : Math.round(wave(`hg:i:${id}:${region}`, t, 40, 100));
    const outbreakHeat = r ? r.outbreakHeat : 0;
    const escalation: GeoRegion['escalation'] = pressure >= 80 ? 'critical' : pressure >= 60 ? 'elevated' : 'stable';
    const { x, y } = pos(i);
    return {
      region, x, y,
      pressure, icuLoad, outbreakHeat,
      ambulances: Math.round(wave(`hg:a:${id}:${region}`, t, 4, 60)),
      escalation,
      tone: escalation === 'critical' ? 'alert' : escalation === 'elevated' ? 'warn' : 'ok',
      ...extras(id, region, t),
    };
  });
  const rmap = new Map(regions.map(r => [r.region, r]));
  const edges: [string, string][] = nation
    ? nationEdges(names, hub)
    : EDGES.map(([f, t2]) => [regionName(SLOTS.indexOf(f), f), regionName(SLOTS.indexOf(t2), t2)] as [string, string]);
  const corridors: GeoCorridor[] = edges.filter(([f, t2]) => rmap.has(f) && rmap.has(t2) && f !== t2).map(([from, to]): GeoCorridor => {
    const a = rmap.get(from)!; const b = rmap.get(to)!;
    const loadPct = Math.round(wave(`hg:c:${id}:${from}:${to}`, t, 20, 100));
    return {
      from, to, fx: a.x, fy: a.y, tx: b.x, ty: b.y, loadPct,
      tone: loadPct >= 85 ? 'alert' : loadPct >= 65 ? 'warn' : 'ok',
    };
  });
  // Live asset movement — deterministic position along each corridor,
  // phase advanced by t so dots visibly travel between ticks.
  const assets: GeoAsset[] = corridors.flatMap((c, ci): GeoAsset[] =>
    Array.from({ length: 2 }, (_, k): GeoAsset => {
      const phase = (wave(`hg:m:${id}:${ci}:${k}`, t, 0, 1) + seed(`hg:o:${ci}:${k}`)) % 1;
      return {
        id: `MOV-${ci}-${k}`, kind: k === 0 ? 'ambulance' : 'supply',
        x: Math.round((c.fx + (c.tx - c.fx) * phase) * 10) / 10,
        y: Math.round((c.fy + (c.ty - c.fy) * phase) * 10) / 10,
        corridor: `${c.from}→${c.to}`,
        phase: Math.round(phase * 1000) / 1000,
        tone: c.tone,
      };
    }),
  );
  // Quantified AI rerouting directive — move ICU load from the worst
  // region to the one with the most headroom along the best corridor.
  const sorted = [...regions].sort((x, y) => y.icuLoad - x.icuLoad);
  const src = sorted[0]!; const dst = sorted[sorted.length - 1]!;
  const overloadProb = Math.min(0.97, Math.max(0, Math.round(((src.icuLoad - 70) / 30) * 100) / 100));
  const patients = Math.max(0, Math.round((src.icuLoad - 88) * 1.6));
  const dist = Math.round(Math.hypot(src.x - dst.x, src.y - dst.y));
  const windowMin = Math.max(8, Math.round(dist * 0.9));
  const active = src.icuLoad >= 92 && patients > 0;
  const reroute: GeoRerouteDirective = {
    active, patients, fromRegion: src.region, toRegion: dst.region, windowMin,
    overloadProb,
    text: active
      ? `Redirect ${patients} ICU patients from ${src.region} to ${dst.region} within ${windowMin}m to avoid systemic overload — probability ${overloadProb.toFixed(2)}`
      : `ICU load distributed within tolerance — peak ${src.region} ${src.icuLoad}% (no reroute required)`,
    tone: active ? 'alert' : overloadProb >= 0.5 ? 'warn' : 'ok',
  };
  return { regions, corridors, assets, reroute };
}

/** Time windows a map can show, in days. */
export const GEO_WINDOWS = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 } as const;
export type GeoWindow = keyof typeof GEO_WINDOWS;

/**
 * The national health map over a time window: each region's figures are the
 * mean of samples taken across the window (longer windows smooth more and
 * reach further back); traffic and the reroute directive stay live. The
 * window changes the time base of the sample values, never their source.
 */
export function healthGeoWindow(id: string, t: number, win: GeoWindow): HealthGeo {
  const now = healthGeo(id, t);
  const days = GEO_WINDOWS[win];
  if (days <= 7) return now;
  // Samples across the window; one telemetry tick stands for a day here.
  const steps = 6;
  const past = Array.from({ length: steps }, (_, i) => healthGeo(id, t - Math.round((days * (i + 1)) / steps)));
  const all = [now, ...past];
  const mean = (region: string, k: 'pressure' | 'icuLoad' | 'outbreakHeat' | 'ambulances' | 'testPositivity' | 'vaccinationGap') =>
    Math.round(all.reduce((s, g) => s + (g.regions.find(r => r.region === region)?.[k] ?? 0), 0) / all.length);
  const regions = now.regions.map((r): GeoRegion => {
    const pressure = mean(r.region, 'pressure');
    const escalation: GeoRegion['escalation'] = pressure >= 80 ? 'critical' : pressure >= 60 ? 'elevated' : 'stable';
    return {
      ...r, pressure, icuLoad: mean(r.region, 'icuLoad'), outbreakHeat: mean(r.region, 'outbreakHeat'),
      ambulances: mean(r.region, 'ambulances'), testPositivity: mean(r.region, 'testPositivity'), vaccinationGap: mean(r.region, 'vaccinationGap'),
      escalation, tone: escalation === 'critical' ? 'alert' : escalation === 'elevated' ? 'warn' : 'ok',
    };
  });
  const corridors = now.corridors.map((c, i): GeoCorridor => {
    const loadPct = Math.round(all.reduce((s, g) => s + (g.corridors[i]?.loadPct ?? c.loadPct), 0) / all.length);
    return { ...c, loadPct, tone: loadPct >= 85 ? 'alert' : loadPct >= 65 ? 'warn' : 'ok' };
  });
  return { ...now, regions, corridors };
}
