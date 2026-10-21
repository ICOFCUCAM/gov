'use client';

// Sovereign geospatial command surface. A clean incident-intelligence map:
// ONE smooth glowing national silhouette (no busy per-district borders),
// a deliberate, well-spaced set of glowing severity icon-markers, corridors,
// a legend and density scale. Public-domain Natural Earth geography (upgraded
// per country to its official subdivisions where they differ, credited on the
// map), live deterministic telemetry. The nation's registered health
// facilities (national facility register) are drawn where they are, each
// linked to its record.
//
// Layers (⧉ opens the switches; callers may set them with `layers`):
// - Regions: severity markers matched by name to the region's real shape.
// - Heat: soft blooms over the territory, sized by the shown figure.
// - Routes: the health network's corridors between the real regions they name
//   (sample, dashed), with ambulances and supplies travelling along them and
//   the reroute directive drawn as an arrow when it is active.
// - Registered sites: the national facility register's published sites.
// "−" folds the legend and density scale away to clear the map.

import * as React from 'react';
import { geoAlbersUsa, geoMercator, geoPath } from 'd3-geo';
import { loadCountry, type Admin1Country } from '@/lib/geo/admin1';
import type { HealthGeo } from '@/lib/gov/health-geo';
import { nationIso3 } from '@/lib/nation/registry';

import { INSETS } from '@/lib/map/projection';
import { nameKeys } from '@/lib/map/names';
import { SignalTag } from '@/components/ui/SignalTag';
import { INFO, STATUS } from '@/lib/theme/tokens';

// Kept for callers that imported it; the map no longer falls back to a fixed
// country: until the nation sets its country in setup it says so instead.
export const SOVEREIGN_ISO = 'UGA';

export type GeoMetric = 'pressure' | 'icuLoad' | 'outbreakHeat' | 'testPositivity' | 'vaccinationGap';
type Metric = GeoMetric;
export type GeoLayer = 'markers' | 'heat' | 'routes' | 'facilities';
export type GeoLayers = Partial<Record<GeoLayer, boolean>>;
const LAYER_LABEL: Record<GeoLayer, string> = { markers: 'Regions', heat: 'Heat', routes: 'Routes', facilities: 'Registered sites' };

type BandKey = 'critical' | 'major' | 'moderate' | 'minor' | 'resolved';
const BANDS: Record<BandKey, { label: string; color: string; glyph: 'flame' | 'tri' | 'shield' | 'check' }> = {
  critical: { label: 'Critical', color: '#ff4d5a', glyph: 'flame' },
  major: { label: 'Major', color: '#ff8a3d', glyph: 'flame' },
  moderate: { label: 'Moderate', color: '#ffd23d', glyph: 'tri' },
  minor: { label: 'Minor', color: '#4d9bff', glyph: 'shield' },
  resolved: { label: 'Resolved', color: '#2dd4bf', glyph: 'check' },
};
const bandOf = (v: number): BandKey => (v >= 80 ? 'critical' : v >= 62 ? 'major' : v >= 45 ? 'moderate' : v >= 28 ? 'minor' : 'resolved');
const TONE: Record<'ok' | 'warn' | 'alert', string> = { ok: INFO, warn: STATUS.warn, alert: STATUS.alert };

function Glyph({ kind, c, s }: { kind: 'flame' | 'tri' | 'shield' | 'check'; c: string; s: number }) {
  const p = { fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'flame') return <path d={`M0 ${-s} C ${s * 0.7} ${-s * 0.2} ${s * 0.5} ${s * 0.7} 0 ${s} C ${-s * 0.5} ${s * 0.7} ${-s * 0.7} ${-s * 0.2} 0 ${-s} Z`} fill={c} stroke="none" />;
  if (kind === 'tri') return <path d={`M0 ${-s} L ${s} ${s * 0.8} L ${-s} ${s * 0.8} Z`} {...p} />;
  if (kind === 'shield') return <path d={`M0 ${-s} L ${s} ${-s * 0.4} L ${s * 0.7} ${s} L 0 ${s * 0.7} L ${-s * 0.7} ${s} L ${-s} ${-s * 0.4} Z`} {...p} />;
  return <path d={`M ${-s} 0 L ${-s * 0.2} ${s * 0.7} L ${s} ${-s * 0.7}`} {...p} />;
}

type Pt = { x: number; y: number };
/** A gentle arc between two points: its path and a point along it (0..1). */
function arc(a: Pt, b: Pt, bend = 0.14) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const c = { x: mx - dy * bend, y: my + dx * bend };
  const at = (t: number): Pt => ({
    x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
  });
  return { d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, at };
}

const btn = { borderColor: 'rgba(120,180,230,0.25)', background: 'rgba(8,20,35,0.7)', color: 'rgba(180,210,235,0.8)' };

export function GeoMap({
  geo, metric, title, height = 300, accent = '#37c7d4', iso3, layers, markerFilter = 'all', highlight, onSelectRegion, recordsOnly = false,
}: {
  geo: HealthGeo; metric: Metric; title: string; height?: number;
  accent?: string; iso3?: string;
  /** Layer switches set by the caller (e.g. a page's layer buttons); the ⧉ panel can still change them. */
  layers?: GeoLayers;
  /** 'hot': only regions at moderate or worse (clusters). */
  markerFilter?: 'all' | 'hot';
  /** A region to pick out (e.g. the selected incident's). */
  highlight?: string;
  /** Called with a region's name when its marker is chosen. */
  onSelectRegion?: (region: string) => void;
  /** Only the national facility register's sites: the generated layers, their legend and the Sample marker are left out. */
  recordsOnly?: boolean;
}) {
  const [data, setData] = React.useState<Admin1Country | null>(null);
  const [loading, setLoading] = React.useState(true);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(680);
  const H = height;
  const panelId = React.useId();
  // Small tiles (the ecosystem wall) keep the map clear: fewer labels, no chips.
  const compact = H < 200;

  // Layers: defaults, then the caller's, then the viewer's own switches (reset when the caller's change).
  const defaults: Record<GeoLayer, boolean> = { markers: true, heat: metric === 'outbreakHeat', routes: true, facilities: true };
  const callerKey = JSON.stringify(layers ?? {});
  const [own, setOwn] = React.useState<GeoLayers>({});
  React.useEffect(() => { setOwn({}); }, [callerKey]);
  const on: Record<GeoLayer, boolean> = recordsOnly
    ? { markers: false, heat: false, routes: false, facilities: true }
    : { ...defaults, ...(layers ?? {}), ...own };
  const [panel, setPanel] = React.useState(false);
  const [legend, setLegend] = React.useState(true);

  const country = iso3 ?? nationIso3();
  // Registered health facilities from the national facility register (real positions).
  const [sites, setSites] = React.useState<{ id: string; name: string; lng: number; lat: number; certified: boolean }[]>([]);
  React.useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    type Row = { id: string; name: string; location: { lng: number; lat: number }; certification: { state: string } };
    const get = (again: boolean) => fetch('/api/facilities?category=health').then(r => (r.ok ? r.json() : null)).then((j: { sites?: Row[] } | null) => {
      if (live && j?.sites) setSites(j.sites.map(s => ({ id: s.id, name: s.name, lng: s.location.lng, lat: s.location.lat, certified: s.certification.state === 'certified' })));
      else if (live && again) timer = setTimeout(() => get(false), 3000);
    }).catch(() => { if (live && again) timer = setTimeout(() => get(false), 3000); });
    get(true);
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, []);
  React.useEffect(() => {
    if (!country) { setLoading(false); return; }
    let live = true;
    setLoading(true);
    // One retry: a boundary file can fail to arrive (e.g. a dropped chunk); it is not cached when it does.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = (again: boolean) => loadCountry(country).then(d => {
      if (!live) return;
      if (!d && again) { timer = setTimeout(() => load(false), 1500); return; }
      setData(d); setLoading(false);
    });
    load(true);
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [country]);

  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(220, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // Geography: depends only on the country and the frame, not on the ticking figures.
  const base = React.useMemo(() => {
    if (!data) return null;
    const feats = data.provinces.length
      ? data.provinces.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry }))
      : data.outline ? [{ type: 'Feature' as const, properties: {}, geometry: data.outline }] : [];
    if (!feats.length) return null;
    const fcOf = (ps: typeof data.provinces) => ({ type: 'FeatureCollection' as const, features: ps.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry })) });
    // Inset groups present in this country's data; the rest is the mainland.
    const groups = (INSETS[data.iso3] ?? []).map(codes => data.provinces.filter(p => codes.includes(p.code))).filter(g => g.length);
    const inInset = new Set(groups.flat());
    const mainland = data.provinces.filter(p => !inInset.has(p));
    const fc = groups.length ? fcOf(mainland) : { type: 'FeatureCollection' as const, features: feats };
    // The United States uses its standard national layout, with Alaska and Hawaii inset.
    const proj = (data.iso3 === 'USA' ? geoAlbersUsa() : geoMercator()).fitExtent([[10, 14], [W - 10, H - 14]], fc as never);
    const bw = Math.round(Math.min(92, W * 0.17)), bh = Math.round(bw * 0.72), gap = 6;
    const frames = groups.map((g, k) => {
      const x = W - 10 - (groups.length - k) * (bw + gap) + gap, y = H - 18 - bh;
      return { x, y, w: bw, h: bh, proj: geoMercator().fitExtent([[x + 6, y + 6], [x + bw - 6, y + bh - 6]], fcOf(g) as never) };
    });
    const projOf = (p: (typeof data.provinces)[number]) => frames[groups.findIndex(g => g.includes(p))]?.proj ?? proj;
    const draw = (p: (typeof data.provinces)[number]) => geoPath(projOf(p))({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '';
    const landD = data.provinces.length
      ? data.provinces.map(draw).join(' ')
      : geoPath(proj)({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '';
    const districts = data.provinces.map(draw);
    const units = data.provinces.map((p, i) => {
      const c = projOf(p)([p.lng, p.lat]);
      return { keys: nameKeys(p.name, ...Object.values(p.i18n ?? {})), name: p.name, d: districts[i]!, x: c?.[0] ?? NaN, y: c?.[1] ?? NaN, inset: inInset.has(p) };
    }).filter(u => Number.isFinite(u.x) && Number.isFinite(u.y));
    return { landD, districts, units, proj, frames: frames.map(({ x, y, w, h }) => ({ x, y, w, h })) };
  }, [data, W, H]);

  const view = React.useMemo(() => {
    if (!base) return null;
    // Markers only where a region's figure belongs: matched by name to its real
    // subdivision (never one region's figure repeated over other units).
    const byName = new Map<string, (typeof geo.regions)[number]>();
    for (const r of geo.regions) for (const k of nameKeys(r.region)) byName.set(k, r);
    const cand = base.units.map(u => {
      const reg = u.keys.map(k => byName.get(k)).find(Boolean);
      if (!reg) return null;
      // Official name in the nation's own spelling (ISO 3166-2, see scripts/official-names.mjs).
      return { x: u.x, y: u.y, v: reg[metric], name: u.name, region: reg.region, inset: u.inset, d: u.d };
    }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.v - a.v);
    // Where each region of the figures sits on the map (mean of its matched units, mainland only).
    const at = new Map<string, Pt & { d: string[]; name: string }>();
    for (const c of cand) {
      if (c.inset) continue;
      const e = at.get(c.region);
      if (!e) at.set(c.region, { x: c.x, y: c.y, d: [c.d], name: c.name });
      else { const n = e.d.length; e.x = (e.x * n + c.x) / (n + 1); e.y = (e.y * n + c.y) / (n + 1); e.d.push(c.d); }
    }
    const minGap = Math.max(26, Math.min(W, H) * 0.085);
    const markers: { x: number; y: number; v: number; name: string; region: string; inset: boolean; band: BandKey }[] = [];
    const pool = markerFilter === 'hot' ? cand.filter(c => c.v >= 45) : cand;
    // The highlighted region always keeps its marker.
    const first = highlight ? pool.filter(c => c.region === highlight).slice(0, 1) : [];
    for (const c of [...first, ...pool]) {
      if (markers.length >= 22) break;
      if (markers.every(m => (m.x - c.x) ** 2 + (m.y - c.y) ** 2 >= minGap * minGap)) markers.push({ ...c, band: bandOf(c.v) });
    }
    // Corridors of the health network between the real regions they name (sample).
    const corridors = geo.corridors.flatMap(c => {
      const a = at.get(c.from), b = at.get(c.to);
      if (!a || !b || (a.x === b.x && a.y === b.y)) return [];
      const g = arc(a, b);
      return [{ key: `${c.from}→${c.to}`, from: c.from, to: c.to, d: g.d, at: g.at, load: c.loadPct, tone: c.tone }];
    });
    const byKey = new Map(corridors.map(c => [c.key, c]));
    const traffic = geo.assets.flatMap(m => {
      const c = byKey.get(m.corridor);
      if (!c) return [];
      const p = c.at(Math.min(1, Math.max(0, m.phase ?? 0.5)));
      return [{ id: m.id, kind: m.kind, x: p.x, y: p.y, tone: m.tone }];
    });
    // Before any corridor can be placed, the earlier faint links between markers keep the map's movement.
    const routes = corridors.length ? [] : markers.filter(m => !m.inset).slice(0, 9).map((m, i, a) => {
      const n = a[(i + 1) % a.length]!;
      const mx = (m.x + n.x) / 2, my = (m.y + n.y) / 2 - Math.abs(n.x - m.x) * 0.12;
      return `M ${m.x} ${m.y} Q ${mx} ${my} ${n.x} ${n.y}`;
    });
    const rr = geo.reroute;
    const rA = at.get(rr.fromRegion), rB = at.get(rr.toRegion);
    const reroute = rr.active && rA && rB ? { ...arc(rA, rB, -0.2), from: rA, to: rB, patients: rr.patients, windowMin: rr.windowMin } : null;
    // Heat: hotter regions bloom larger and stronger — half relative to the regions shown (so hotspots
    // stand out), half absolute (a low figure everywhere stays cool); blooms shrink as regions get denser.
    const hv = cand.map(c => c.v), lo = Math.min(...hv), span = Math.max(1, Math.max(...hv) - lo);
    const dense = Math.min(1, 1.6 * Math.sqrt(8 / Math.max(1, cand.length)));
    const heat = cand.slice(0, 60).map(c => {
      const k = 0.5 * ((c.v - lo) / span) + 0.5 * (c.v / 100);
      return { x: c.x, y: c.y, r: Math.max(W, H) * (0.04 + k * 0.12) * dense, o: 0.1 + 0.9 * k ** 1.6 };
    });
    // Clusters: the shapes of the regions at major or worse, tinted by band.
    const zones = markerFilter === 'hot' ? cand.filter(c => c.v >= 62).map(c => ({ d: c.d, color: BANDS[bandOf(c.v)].color })) : [];
    const registered = sites.flatMap(s => { const q = base.proj([s.lng, s.lat]); return q && q.every(Number.isFinite) ? [{ ...s, x: q[0], y: q[1] }] : []; });
    const hl = highlight ? at.get(highlight) ?? null : null;
    return { markers, corridors, traffic, routes, reroute, heat, zones, registered, hl, regionsOnMap: at.size };
  }, [base, W, H, geo, metric, sites, markerFilter, highlight]);

  const toggle = (k: GeoLayer) => setOwn(o => ({ ...o, [k]: !on[k] }));
  const selectable = !!onSelectRegion;
  const summary = view
    ? [
      `${view.markers.length} regions with a sample figure`,
      on.routes && view.corridors.length ? `${view.corridors.length} sample corridors` : '',
      on.facilities && view.registered.length ? `${view.registered.length} registered health sites` : '',
      highlight ? `${highlight} highlighted` : '',
    ].filter(Boolean).join(', ')
    : '';

  return (
    <div ref={wrap} className="relative w-full overflow-hidden rounded-[10px]" style={{ height: H, background: 'radial-gradient(120% 100% at 50% 35%, #0c2036 0%, #071425 55%, #030711 100%)' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: H }} role={selectable ? 'group' : 'img'} aria-label={`${title || data?.name || 'National map'}: ${summary || 'no regions placed yet'}`}>
        <defs>
          <filter id="gmGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="gmSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" /></filter>
          <linearGradient id="gmLand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4e74" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#123a5a" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#0b2740" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="gmHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.62" />
            <stop offset="38%" stopColor="#ff7a1a" stopOpacity="0.34" />
            <stop offset="70%" stopColor="#ffd23d" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffd23d" stopOpacity="0" />
          </radialGradient>
          <marker id="gmArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill={STATUS.alert} />
          </marker>
          <clipPath id="gmClip"><path d={base ? base.landD : ''} /></clipPath>
        </defs>

        {loading || !base || !view ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="rgba(150,180,210,0.6)" className="uppercase" style={{ letterSpacing: '0.2em' }}>
            {loading ? 'ACQUIRING TERRITORY…' : 'NO GEOGRAPHIC DATA'}
          </text>
        ) : (
          <g>
            {/* inset frames for distant territories */}
            {base.frames.map((f, i) => (
              <rect key={`fr${i}`} x={f.x} y={f.y} width={f.w} height={f.h} rx="4" fill="rgba(6,16,28,0.55)" stroke="rgba(120,180,230,0.28)" strokeWidth="0.8" />
            ))}
            {/* soft outer glow of the landmass */}
            <path d={base.landD} fill="#2f7fb8" fillOpacity="0.5" filter="url(#gmGlow)" />
            {/* one smooth silhouette */}
            <path d={base.landD} fill="url(#gmLand)" stroke="#5fb8e8" strokeOpacity="0.5" strokeWidth="0.8" />
            {/* whisper-faint internal contour for texture (not a mesh) */}
            <g filter="url(#gmSoft)">
              {base.districts.map((d, i) => <path key={`d${i}`} d={d} fill="none" stroke="#7fc4ec" strokeOpacity="0.05" strokeWidth="0.4" />)}
            </g>
            {/* the picked-out region (e.g. the selected incident's) */}
            {view.hl ? (
              <g>
                {view.hl.d.map((d, i) => <path key={`hl${i}`} d={d} fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />)}
                <circle cx={view.hl.x} cy={view.hl.y} r="16" fill="none" stroke={accent} strokeOpacity="0.7" strokeWidth="1" className="animate-diffuse" style={{ transformOrigin: `${view.hl.x}px ${view.hl.y}px` }} />
              </g>
            ) : null}
            {/* clusters: regions at major or worse */}
            {view.zones.map((z, i) => (
              <path key={`z${i}`} d={z.d} fill={z.color} fillOpacity="0.26" stroke={z.color} strokeOpacity="0.6" strokeWidth="0.8" strokeDasharray="3 2" />
            ))}
            {/* heat field */}
            {on.heat && view.heat.length ? (
              <g clipPath="url(#gmClip)">
                {view.heat.map((h, i) => (
                  <circle key={`ht${i}`} cx={h.x} cy={h.y} r={h.r} fill="url(#gmHeat)" opacity={h.o} />
                ))}
              </g>
            ) : null}
            {/* corridors between the regions they name, with traffic (sample) */}
            {on.routes ? (
              <g>
                {view.corridors.map(c => (
                  <g key={c.key}>
                    <path d={c.d} fill="none" stroke={TONE[c.tone]} strokeOpacity="0.14" strokeWidth={3 + c.load / 30} strokeLinecap="round" />
                    <path d={c.d} fill="none" stroke={TONE[c.tone]} strokeOpacity="0.62" strokeWidth={0.7 + c.load / 90} strokeDasharray="4 5" className="animate-dash-flow">
                      <title>{`${c.from} → ${c.to} · corridor load ${c.load}% (sample)`}</title>
                    </path>
                  </g>
                ))}
                {view.traffic.map(m => (
                  m.kind === 'ambulance'
                    ? <rect key={m.id} x={m.x - 2.4} y={m.y - 2.4} width="4.8" height="4.8" transform={`rotate(45 ${m.x} ${m.y})`} fill={TONE[m.tone]} style={{ filter: `drop-shadow(0 0 3px ${TONE[m.tone]})` }} />
                    : <circle key={m.id} cx={m.x} cy={m.y} r="2"  fill="rgb(var(--c-ink))" fillOpacity="0.85" stroke={TONE[m.tone]} strokeWidth="0.8" />
                ))}
                {view.routes.map((d, i) => (
                  <path key={`r${i}`} d={d} fill="none" stroke="#5fd0e0" strokeOpacity="0.16" strokeWidth="0.8" strokeDasharray="3 4" className="animate-dash-flow" />
                ))}
                {view.reroute ? (
                  <g>
                    <path d={view.reroute.d} fill="none" stroke={STATUS.alert} strokeWidth="1.8" strokeDasharray="6 4" markerEnd="url(#gmArrow)" className="animate-dash-flow" style={{ filter: `drop-shadow(0 0 4px ${STATUS.alert})` }}>
                      <title>{`Reroute ${view.reroute.patients} ICU patients within ${view.reroute.windowMin} min (sample)`}</title>
                    </path>
                    {compact ? null : (() => {
                      const p = view.reroute.at(0.5);
                      const label = `REROUTE ${view.reroute.patients} ICU · ${view.reroute.windowMin}m`;
                      const w = label.length * 4.6 + 10;
                      return (
                        <g transform={`translate(${Math.min(W - w - 4, Math.max(4, p.x - w / 2))} ${p.y - 16})`}>
                          <rect width={w} height="12" rx="3" fill="rgba(30,6,10,0.85)" stroke={STATUS.alert} strokeWidth="0.8" />
                          <text x={w / 2} y="8.5" textAnchor="middle" fontSize="7" fontWeight="700" fill={STATUS.alert} style={{ letterSpacing: '0.06em' }}>{label}</text>
                        </g>
                      );
                    })()}
                  </g>
                ) : null}
              </g>
            ) : null}
            {/* clean glowing severity markers */}
            {on.markers ? view.markers.map((m, i) => {
              const b = BANDS[m.band];
              const R = 7.5;
              const picked = highlight === m.region;
              const pick = () => onSelectRegion?.(m.region);
              return (
                <g key={`m${i}`}
                  {...(selectable ? {
                    role: 'button', tabIndex: 0, 'aria-label': `${m.name}: ${b.label.toLowerCase()} (${m.v}, sample)`, 'aria-pressed': picked,
                    onClick: pick, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } },
                    style: { cursor: 'pointer', outline: 'none' },
                  } : {})}>
                  <circle cx={m.x} cy={m.y} r={R * 2} fill={b.color} opacity={0.16} filter="url(#gmSoft)" />
                  {(m.band === 'critical' || m.band === 'major') ? (
                    <circle cx={m.x} cy={m.y} r={R + 3} fill="none" stroke={b.color} strokeOpacity="0.6" strokeWidth="1" className="animate-diffuse" style={{ transformOrigin: `${m.x}px ${m.y}px` }} />
                  ) : null}
                  <circle cx={m.x} cy={m.y} r={R} fill="#0a1626" stroke={picked ? accent : b.color} strokeWidth={picked ? 2.2 : 1.4}
                    style={{ filter: `drop-shadow(0 0 5px ${b.color})` }} />
                  <g transform={`translate(${m.x} ${m.y}) scale(0.42)`}><Glyph kind={b.glyph} c={b.color} s={9} /></g>
                  {i < (compact ? 3 : 6) || picked ? (
                    <text x={m.x + R + 3} y={m.y + 3} fontSize="8.5" fill="rgba(210,230,245,0.92)" style={{ fontWeight: 600, textShadow: '0 0 5px #030711' }}>{m.name}</text>
                  ) : null}
                  {selectable ? <title>{`${m.name} · ${m.v} (sample)`}</title> : null}
                </g>
              );
            }) : null}
            {/* registered health facilities (national facility register), where they are */}
            {on.facilities ? view.registered.map(s => (
              <a key={s.id} href={`/gov/sites#${s.id}`} aria-label={`${s.name} (registered${s.certified ? ', location certified' : ''})`}>
                <title>{`${s.name} · registered${s.certified ? ' · location certified' : ''}`}</title>
                <rect x={s.x - 5} y={s.y - 5} width={10} height={10} rx={2} fill="rgb(var(--c-bg))" stroke={s.certified ? BANDS.resolved.color : BANDS.moderate.color} strokeWidth={1.3} />
                <text x={s.x} y={s.y + 3} textAnchor="middle" fontSize="8" fill={s.certified ? BANDS.resolved.color : BANDS.moderate.color}>✚</text>
              </a>
            )) : null}
          </g>
        )}
      </svg>

      {/* title */}
      <div className="pointer-events-none absolute left-3 top-2.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(225,240,250,0.95)', textShadow: '0 0 8px #030711' }}>
        {title || (data?.name ?? country)} {recordsOnly ? null : <SignalTag kind="sample" source="Health figures, corridors and traffic are samples until a health information source is connected; registered sites come from the national facility register" className="ms-1 align-middle" />}
      </div>
      {!country && !loading ? (
        <p className="absolute inset-x-3 top-1/2 text-center text-[12px]" style={{ color: 'rgba(200,222,240,0.9)' }}>Set the nation&rsquo;s country in setup to draw its map.</p>
      ) : null}
      {/* layers control (none for the register's sites alone) */}
      <div className={`absolute right-2.5 top-2.5 flex-col items-end gap-1 ${recordsOnly ? 'hidden' : 'flex'}`}>
        <button type="button" onClick={() => setPanel(p => !p)} aria-expanded={panel} aria-controls={panelId} title="Map layers" aria-label="Map layers"
          className="focus-ring grid h-6 w-6 place-items-center rounded-[6px] border text-[11px]" style={{ ...btn, ...(panel ? { borderColor: accent, color: accent } : {}) }}>⧉</button>
        <button type="button" onClick={() => setLegend(l => !l)} aria-pressed={!legend} title={legend ? 'Hide legend' : 'Show legend'} aria-label={legend ? 'Hide legend' : 'Show legend'}
          className="focus-ring grid h-6 w-6 place-items-center rounded-[6px] border text-[12px]" style={btn}>{legend ? '−' : '+'}</button>
        {panel ? (
          <div id={panelId} role="group" aria-label="Map layers" className="mt-0.5 w-[132px] rounded-[6px] border p-1.5" style={{ borderColor: 'rgba(120,180,230,0.3)', background: 'rgba(6,16,28,0.92)' }}>
            <div className="mb-1 text-[7.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(190,215,235,0.85)' }}>Layers</div>
            {(Object.keys(LAYER_LABEL) as GeoLayer[]).map(k => {
              const n = k === 'facilities' ? view?.registered.length ?? 0 : k === 'routes' ? view?.corridors.length ?? 0 : k === 'markers' ? view?.markers.length ?? 0 : undefined;
              return (
                <button key={k} type="button" aria-pressed={on[k]} onClick={() => toggle(k)}
                  className="focus-ring flex w-full items-center justify-between gap-1 rounded-[4px] px-1 py-0.5 text-start text-[9px]"
                  style={{ color: on[k] ? 'rgba(225,240,250,0.95)' : 'rgba(150,175,200,0.75)' }}>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden className="grid h-2.5 w-2.5 place-items-center rounded-[2px] border text-[7px]" style={{ borderColor: on[k] ? accent : 'rgba(150,175,200,0.5)', color: accent }}>{on[k] ? '✓' : ''}</span>
                    {LAYER_LABEL[k]}
                  </span>
                  {n !== undefined ? <span className="font-mono text-[8px] tabular-nums" style={{ color: 'rgba(150,180,205,0.8)' }}>{n}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {/* legend */}
      {legend && !recordsOnly ? (
        <div className="pointer-events-none absolute left-3 top-9 flex max-w-[78%] flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] font-medium" style={{ color: 'rgba(200,222,240,0.9)' }}>
          {(Object.keys(BANDS) as BandKey[]).map(k => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: BANDS[k].color, boxShadow: `0 0 5px ${BANDS[k].color}` }} />{BANDS[k].label}
            </span>
          ))}
          {!compact && on.routes && view?.corridors.length ? (
            <span className="inline-flex items-center gap-1"><span className="inline-block h-0 w-3 border-t border-dashed" style={{ borderColor: INFO }} />Corridor</span>
          ) : null}
          {!compact && on.facilities && view?.registered.length ? (
            <span className="inline-flex items-center gap-1"><span className="grid h-2.5 w-2.5 place-items-center rounded-[2px] border text-[6px]" style={{ borderColor: BANDS.resolved.color, color: BANDS.resolved.color }}>✚</span>Registered site</span>
          ) : null}
        </div>
      ) : null}
      {/* boundary credit, when the shapes come from an upgraded source */}
      {data?.attribution ? (
        <div className="absolute bottom-1.5 right-2.5 max-w-[42%] truncate text-right text-[7px] tracking-[0.04em]" style={{ color: 'rgba(150,180,205,0.55)' }}
          title={`Boundaries: ${data.attribution.source} (${data.attribution.year}), via ${data.attribution.via ?? 'geoBoundaries'} · ${data.attribution.licence}`}>
          Boundaries © {data.attribution.source} · {data.attribution.via ?? 'geoBoundaries'}
        </div>
      ) : null}
      {/* incident density scale (bottom right on the US map, where Alaska's inset sits bottom left) */}
      {legend && !recordsOnly ? (
        <div className={`pointer-events-none absolute bottom-2.5 ${data?.iso3 === 'USA' ? 'right-3' : 'left-3'} rounded-[6px] border px-2 py-1.5`} style={{ borderColor: 'rgba(120,180,230,0.2)', background: 'rgba(6,16,28,0.66)' }}>
          <div className="text-[7.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(190,215,235,0.85)' }}>Incident Density</div>
          <div className="mt-1 h-1.5 w-28 rounded-full" style={{ background: 'linear-gradient(90deg,#2dd4bf,#ffd23d,#ff4d5a)' }} />
          <div className="mt-0.5 flex justify-between text-[7px]" style={{ color: 'rgba(150,180,205,0.75)' }}><span>Low</span><span>High</span></div>
        </div>
      ) : null}
    </div>
  );
}
