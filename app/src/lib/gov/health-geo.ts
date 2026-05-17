// National Health Geospatial Intelligence.
//
// Spatial layer for the Ministry of Health: a deterministic national map —
// regions with fixed coordinates, logistics corridors, per-region geo
// telemetry (pressure / ICU / outbreak / ambulance / escalation), live
// asset movement along corridors, and a QUANTIFIED AI rerouting directive
// ("Redirect N ICU patients from X to Y within Mm — overload p=0.NN").
// Pure & deterministic; no React/DOM.

import { wave, seed } from '@/lib/telemetry';
import { nationalSituation } from '@/lib/gov/health-operations';

export interface GeoRegion {
  region: string;
  x: number; y: number;            // 0-100 normalised canvas
  pressure: number;                // composite 0-100
  icuLoad: number;                 // 0-100
  outbreakHeat: number;            // 0-100
  ambulances: number;
  escalation: 'stable' | 'elevated' | 'critical';
  tone: 'ok' | 'warn' | 'alert';
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

export function healthGeo(id: string, t: number): HealthGeo {
  const ns = nationalSituation(id, t);
  const byRegion = new Map(ns.regions.map(r => [r.region, r]));
  const regions: GeoRegion[] = Object.keys(COORDS).map((region): GeoRegion => {
    const r = byRegion.get(region);
    const pressure = r ? r.composite : Math.round(wave(`hg:p:${id}:${region}`, t, 30, 95));
    const icuLoad = r ? r.icuPressure : Math.round(wave(`hg:i:${id}:${region}`, t, 40, 100));
    const outbreakHeat = r ? r.outbreakHeat : 0;
    const escalation: GeoRegion['escalation'] = pressure >= 80 ? 'critical' : pressure >= 60 ? 'elevated' : 'stable';
    return {
      region, x: COORDS[region]!.x, y: COORDS[region]!.y,
      pressure, icuLoad, outbreakHeat,
      ambulances: Math.round(wave(`hg:a:${id}:${region}`, t, 4, 60)),
      escalation,
      tone: escalation === 'critical' ? 'alert' : escalation === 'elevated' ? 'warn' : 'ok',
    };
  });
  const rmap = new Map(regions.map(r => [r.region, r]));
  const corridors: GeoCorridor[] = EDGES.map(([from, to]): GeoCorridor => {
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
