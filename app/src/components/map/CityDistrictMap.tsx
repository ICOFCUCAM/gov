'use client';

// The City Operations Map on the nation's real geography (map plan phase 5).
// It opens the region that holds the capital to its districts — their real
// shapes (lib/geo/admin2 or the official sub-units), else the capital's region
// alone — and places the city's operations in them: traffic, incidents, work
// zones, parking, cameras and sensors. Positions are samples inside real
// districts until the municipality connects its systems; the map says so.
// It keeps the earlier schematic's look (dark radial ground, grid, arterial
// roads, pulsing markers, district pills, legend) and makes its controls work:
// + / − zoom (a district opens to fill the map), ⌂ back to the whole city,
// ≣ layer toggles, and a tilted 3D view.

import * as React from 'react';
import { geoBounds, geoContains } from 'd3-geo';
import { loadNationGeography, loadUnitGeography, type MapUnit, type NationGeography } from '@/lib/map/geography';
import { buildMapModel } from '@/lib/map/model';
import { nationCapital, nationIso3, nationProjection, nationRegions } from '@/lib/nation/registry';
import { useReducedMotion } from '@/components/features/situation/Theatre';
import { SignalTag } from '@/components/ui/SignalTag';
import { seed, wave } from '@/lib/telemetry';

export interface CityPalette { CYAN: string; TEAL: string; BLUE: string; GREEN: string; PURPLE: string; AMBER: string; RED: string; INK: string; SOFT: string; MUT: string; PANEL: string; LINE2: string; ground: string }

export interface CityGeo {
  geo: NationGeography;
  /** The region that holds the capital (the city). */
  city: { name: string; code?: string };
  /** True when the districts' own shapes are drawn; false when the capital's region is drawn alone. */
  districts: boolean;
}

const feature = (g: unknown) => ({ type: 'Feature', properties: {}, geometry: g }) as never;

/** The capital's region opened to its districts; null while loading, undefined when the nation has no map. */
export function useCityGeo(): CityGeo | null | undefined {
  const iso3 = nationIso3();
  const regionsKey = nationRegions().join('|');
  const [state, setState] = React.useState<CityGeo | null | undefined>(null);
  React.useEffect(() => {
    if (!iso3) { setState(undefined); return; }
    let live = true;
    setState(null);
    void (async () => {
      const nation = await loadNationGeography(iso3, regionsKey ? regionsKey.split('|') : []);
      const cap = nationCapital();
      const holds = (u: MapUnit) => !!(cap && u.geometry && geoContains(feature(u.geometry), [cap.lng, cap.lat]));
      const city = nation?.units.find(holds) ?? nation?.units.find(u => u.geometry);
      if (!nation || !city) { if (live) setState(undefined); return; }
      const opened = city.code ? await loadUnitGeography(iso3, { name: city.name, code: city.code }).catch(() => null) : null;
      if (!live) return;
      if (opened && opened.units.length) { setState({ geo: opened, city: { name: city.name, code: city.code }, districts: true }); return; }
      setState({
        geo: { ...nation, units: [city], context: nation.units.filter(u => u !== city && u.geometry).map(u => u.geometry!), parent: { name: city.name, code: city.code } },
        city: { name: city.name, code: city.code }, districts: false,
      });
    })().catch(() => { if (live) setState(undefined); });
    return () => { live = false; };
  }, [iso3, regionsKey]);
  return state;
}

export type CityLayer = 'traffic' | 'incidents' | 'work' | 'parking' | 'cameras' | 'sensors' | 'roads' | 'names';
export const CITY_LAYERS: { key: CityLayer; label: string; colour: keyof CityPalette }[] = [
  { key: 'traffic', label: 'Traffic', colour: 'CYAN' },
  { key: 'incidents', label: 'Incidents', colour: 'RED' },
  { key: 'work', label: 'Work Zones', colour: 'AMBER' },
  { key: 'parking', label: 'Parking', colour: 'GREEN' },
  { key: 'cameras', label: 'Cameras', colour: 'TEAL' },
  { key: 'sensors', label: 'Sensors', colour: 'PURPLE' },
];
const MARKER_LAYERS = CITY_LAYERS.map(l => l.key);
const SRC = 'Sample positions inside the real districts until the municipality connects its traffic, incident, parking, camera and sensor systems';

/** A deterministic position inside a district's shape. */
function pointIn(u: MapUnit, key: string): [number, number] | null {
  if (!u.geometry) return null;
  const [[x0, y0], [x1, y1]] = geoBounds(feature(u.geometry));
  for (let k = 0; k < 40; k++) {
    const lng = x0 + (x1 - x0) * seed(`${key}:x:${k}`), lat = y0 + (y1 - y0) * seed(`${key}:y:${k}`);
    if (geoContains(feature(u.geometry), [lng, lat])) return [lng, lat];
  }
  return u.lng != null && u.lat != null ? [u.lng, u.lat] : null;
}

export function CityMap({ id, ts, city, P, district, onDistrict, tilt, onTilt }: {
  id: string; ts: number; city: CityGeo | null | undefined; P: CityPalette;
  /** The district open on the map ('' = the whole city). */
  district: string; onDistrict: (name: string) => void;
  tilt: boolean; onTilt: (on: boolean) => void;
}) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(800);
  const [zoom, setZoom] = React.useState(1);
  const [layers, setLayers] = React.useState<Set<CityLayer>>(() => new Set([...MARKER_LAYERS, 'roads', 'names']));
  const [layersOpen, setLayersOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [hover, setHover] = React.useState<string | null>(null);
  const reduced = useReducedMotion();
  const uid = React.useId().replace(/:/g, '');
  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(260, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  const H = W < 520 ? 300 : 440;
  const model = React.useMemo(() => (city ? buildMapModel(city.geo, { width: W, maxHeight: H, minHeight: H, projection: nationProjection(), capital: nationCapital() }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city, W, H]);

  // Markers: six kinds, three of each, inside the real districts (sample).
  const markers = React.useMemo(() => {
    if (!city || !model) return [];
    const shaped = city.geo.units.filter(u => u.geometry);
    if (!shaped.length) return [];
    return MARKER_LAYERS.flatMap((kind, k) => Array.from({ length: 3 }, (_, j) => {
      const i = k * 3 + j;
      const u = shaped[Math.floor(seed(`mu:md:${id}:${i}`) * shaped.length)]!;
      const at = pointIn(u, `mu:mp:${id}:${i}`);
      const q = at ? model.project(at[0], at[1]) : null;
      return q ? { kind, district: u.name, x: q[0], y: q[1], i } : null;
    })).filter((m): m is NonNullable<typeof m> => !!m);
  }, [city, model, id]);

  if (city === undefined) return <p className="p-3 text-[12px]" style={{ color: P.SOFT }}>Set the nation&rsquo;s country in setup to draw the city&rsquo;s map.</p>;

  const units = model?.units.filter(u => u.d) ?? [];
  const sel = district ? city?.geo.units.find(u => u.name === district) : undefined;
  // The view: a district opens to fill the map; + and − zoom about it (or the city's centre).
  const focus = (() => {
    if (!model) return { cx: W / 2, cy: H / 2, k: 1 };
    if (sel?.geometry) {
      const [[x0, y0], [x1, y1]] = model.boundsOf(sel.geometry);
      const fit = Math.min(6, Math.max(1, 0.8 * Math.min(W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0))));
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: fit * zoom };
    }
    return { cx: W / 2, cy: H / 2, k: zoom };
  })();
  const k = Math.min(12, focus.k);
  const transform = `translate(${W / 2},${H / 2}) scale(${k}) translate(${-focus.cx},${-focus.cy})`;
  const s = 1 / k; // keeps strokes and markers their size while zoomed

  const colourOf = (kind: CityLayer) => P[CITY_LAYERS.find(l => l.key === kind)?.colour ?? 'CYAN'] as string;
  const centroids = units.filter(u => u.cx != null && u.cy != null) as { name: string; cx: number; cy: number }[];
  const centre = model?.capital ?? (centroids[0] ? { x: centroids[0].cx, y: centroids[0].cy } : { x: W / 2, y: H / 2 });
  // Arterials (sample): from the centre out to every district, and a ring road through them in turn.
  const ring = [...centroids].sort((a, b) => Math.atan2(a.cy - centre.y, a.cx - centre.x) - Math.atan2(b.cy - centre.y, b.cx - centre.x));
  // Names for every district when they fit, else the largest eight (and the open one).
  const extent = (name: string) => { const g = city?.geo.units.find(x => x.name === name)?.geometry; if (!g || !model) return 0; const [[x0, y0], [x1, y1]] = model.boundsOf(g); return (x1 - x0) * (y1 - y0); };
  const biggest = [...units].sort((a, b) => extent(b.name) - extent(a.name)).slice(0, W < 520 ? 5 : units.length > 12 ? 8 : units.length).map(u => u.name);
  const pillColours = [P.BLUE, P.GREEN, P.CYAN, P.PURPLE, P.TEAL];
  const toggle = (l: CityLayer) => setLayers(prev => { const n = new Set(prev); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const ctl = 'focus-ring grid h-6 w-6 place-items-center rounded-md border text-[11px]';
  const ctlStyle = { borderColor: P.LINE2, background: `color-mix(in srgb,${P.PANEL} 85%,transparent)`, color: P.SOFT };
  const counts = new Map<string, number>();
  for (const m of markers) if (layers.has(m.kind)) counts.set(m.district, (counts.get(m.district) ?? 0) + 1);
  const summary = city && model
    ? `City operations map of ${city.city.name}: ${city.districts ? `${units.length} ${city.geo.noun}${units.length === 1 ? '' : 's'}` : 'the capital’s region'}${sel ? `, ${sel.name} open` : ''}; ${markers.filter(m => layers.has(m.kind)).length} sample markers.`
    : 'City operations map';

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ background: P.ground, minHeight: 340 }}>
      <div ref={wrap} className="w-full" style={{ perspective: 1100 }}>
        <div className="relative" style={{ transform: tilt ? 'rotateX(42deg) scale(0.94) translateY(-14px)' : 'none', transformOrigin: '50% 62%', transition: reduced ? undefined : 'transform 420ms ease' }}>
        {!model ? <p className="p-4 text-[12px]" style={{ color: P.SOFT, minHeight: H }}>Loading the city&rsquo;s districts…</p> : (
          <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} className="block max-w-full" role="group" aria-roledescription="map" aria-label={summary}>
            <defs>
              <pattern id={`mgrid-${uid}`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke={P.LINE2} strokeWidth="0.5" /></pattern>
              <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
            </defs>
            <rect width={model.width} height={model.height} fill={`url(#mgrid-${uid})`} />
            <g transform={transform} style={{ transition: reduced ? undefined : 'transform 380ms ease' }}>
              {model.context.map((d, i) => <path key={`c${i}`} d={d} fill={P.INK} fillOpacity={0.035} stroke={P.SOFT} strokeOpacity={0.22} strokeWidth={0.6 * s} aria-hidden />)}
              {units.map((u, i) => {
                const on = u.name === district, over = u.name === hover;
                const load = wave(`mu:dl:${id}:${u.code ?? u.name}`, ts, 0, 1);
                return (
                  <path key={`${u.code ?? u.name}-${i}`} d={u.d} role="button" tabIndex={0}
                    aria-label={`${u.name}${counts.get(u.name) ? `: ${counts.get(u.name)} sample markers` : ''}${on ? ' (open)' : ''}`} aria-pressed={on}
                    fill={on ? P.CYAN : P.BLUE} fillOpacity={on ? 0.16 : over ? 0.14 : 0.05 + load * 0.07}
                    stroke={on || over ? P.CYAN : P.CYAN} strokeOpacity={on ? 0.95 : over ? 0.7 : 0.32} strokeWidth={(on ? 1.8 : 0.9) * s}
                    className="cursor-pointer outline-none focus-visible:[stroke-opacity:1]"
                    onMouseEnter={() => setHover(u.name)} onMouseLeave={() => setHover(h => (h === u.name ? null : h))}
                    onClick={() => { setZoom(1); onDistrict(on ? '' : u.name); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setZoom(1); onDistrict(on ? '' : u.name); } }} />
                );
              })}
              {layers.has('roads') ? (
                <g aria-hidden pointerEvents="none">
                  {centroids.map((c, i) => <path key={`a${i}`} d={`M${centre.x},${centre.y} L${c.cx},${c.cy}`} stroke={P.CYAN} strokeOpacity={district && c.name !== district ? 0.1 : 0.34} strokeWidth={2 * s} fill="none" />)}
                  {ring.length > 2 ? <path d={`M${ring.map(c => `${c.cx},${c.cy}`).join(' L')} Z`} fill="none" stroke={P.SOFT} strokeOpacity={district ? 0.12 : 0.28} strokeWidth={1.4 * s} /> : null}
                  {ring.length > 3 ? <path d={`M${ring.slice(0, Math.ceil(ring.length / 2)).map(c => `${c.cx},${c.cy}`).join(' L')}`} fill="none" stroke={P.GREEN} strokeWidth={2 * s} strokeDasharray={`${5 * s} ${3 * s}`} strokeOpacity={0.6}
                    className={reduced ? undefined : 'motion-safe:animate-dash-flow'} /> : null}
                  {layers.has('work') && ring.length > 2 ? <path d={`M${centre.x},${centre.y} L${ring[ring.length - 1]!.cx},${ring[ring.length - 1]!.cy} L${ring[ring.length - 2]!.cx},${ring[ring.length - 2]!.cy}`} fill="none" stroke={P.AMBER} strokeWidth={1.8 * s} strokeOpacity={0.55} /> : null}
                </g>
              ) : null}
              {markers.filter(m => layers.has(m.kind)).map(m => {
                const c = colourOf(m.kind);
                const live = wave(`mu:mo:${id}:${m.i}`, ts, 0, 1) > 0.4;
                const r = (live ? 4.5 : 3) * s;
                return (
                  <g key={`m${m.i}`} aria-hidden pointerEvents="none">
                    {live ? <circle cx={m.x} cy={m.y} r={r * 2.2} fill={c} opacity={0.18} filter={`url(#glow-${uid})`} /> : null}
                    <circle cx={m.x} cy={m.y} r={r} fill={c} opacity={live ? 0.92 : 0.45} stroke={P.PANEL} strokeWidth={0.8 * s}>
                      {live && !reduced ? <animate attributeName="r" values={`${3.5 * s};${6 * s};${3.5 * s}`} dur="2.6s" repeatCount="indefinite" /> : null}
                    </circle>
                    <title>{`${CITY_LAYERS.find(l => l.key === m.kind)!.label} · ${m.district} (sample)`}</title>
                  </g>
                );
              })}
              {model.capital ? (
                <g aria-hidden pointerEvents="none">
                  <circle cx={model.capital.x} cy={model.capital.y} r={3.2 * s} fill={P.INK} stroke={P.PANEL} strokeWidth={1 * s} />
                  <circle cx={model.capital.x} cy={model.capital.y} r={7 * s} fill="none" stroke={P.INK} strokeOpacity={0.5} strokeWidth={0.8 * s} />
                </g>
              ) : null}
            </g>
            {model.scale && k === 1 ? (
              <g aria-hidden transform={`translate(${model.width - model.scale.px - 14},${model.height - 40})`}>
                <rect width={model.scale.px} height="3" fill={P.SOFT} opacity={0.7} />
                <text y="-4" fontSize="8.5" fill={P.MUT}>0</text>
                <text x={model.scale.px} y="-4" textAnchor="end" fontSize="8.5" fill={P.MUT}>{model.scale.km.toLocaleString('en')} km</text>
              </g>
            ) : null}
          </svg>
        )}
      {/* District names, as the schematic's pills; placed with the map's own view. */}
      {model && layers.has('names') ? units.filter(u => u.cx != null && (biggest.includes(u.name) || u.name === district)).map((u, i) => {
        const x = W / 2 + (u.cx! - focus.cx) * k, y = H / 2 + (u.cy! - focus.cy) * k;
        const half = u.name.length * 2.6 + 10;
        if (x < half + 4 || x > W - half - 4 || y < 34 || y > H - 40) return null;
        const c = u.name === district ? P.CYAN : pillColours[i % pillColours.length]!;
        return (
          <span key={`n${u.code ?? u.name}`} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-0.5 text-[8.5px] font-medium" aria-hidden
            style={{ left: `${(x / W) * 100}%`, top: y, borderColor: `color-mix(in srgb,${c} 45%,transparent)`, background: `color-mix(in srgb,${P.PANEL} 82%,transparent)`, color: c }}>{u.name}</span>
        );
      }) : null}

        </div>
      </div>

      {/* Controls: zoom in / out, back to the whole city, layers. */}
      <div className="absolute left-3 top-3 flex flex-col gap-1" role="group" aria-label="Map controls">
        <button type="button" className={ctl} style={ctlStyle} aria-label="Zoom in" title="Zoom in"
          onClick={() => setZoom(z => Math.min(6, z * 1.5))}>+</button>
        <button type="button" className={ctl} style={ctlStyle} aria-label="Zoom out" title="Zoom out"
          onClick={() => { if (zoom > 1.01) setZoom(z => Math.max(1, z / 1.5)); else if (district) onDistrict(''); }}>−</button>
        <button type="button" className={ctl} style={ctlStyle} aria-label={`Back to the whole of ${city?.city.name ?? 'the city'}`} title="Whole city"
          onClick={() => { setZoom(1); onDistrict(''); }}>⌂</button>
        <div className="relative">
          <button type="button" className={ctl} style={{ ...ctlStyle, ...(layersOpen ? { color: P.CYAN, borderColor: P.CYAN } : {}) }} aria-label="Layers" aria-expanded={layersOpen} title="Layers"
            onClick={() => setLayersOpen(o => !o)}>≣</button>
          {layersOpen ? (
            <div className="absolute left-8 top-0 z-20 w-40 space-y-1 rounded-md border p-2 text-[9.5px]" style={{ borderColor: P.LINE2, background: P.PANEL, color: P.SOFT }}>
              <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: P.MUT }}>Layers</div>
              {[...CITY_LAYERS.map(l => ({ key: l.key, label: l.label, c: P[l.colour] as string })), { key: 'roads' as CityLayer, label: 'Arterial roads', c: P.SOFT }, { key: 'names' as CityLayer, label: 'District names', c: P.SOFT }].map(l => (
                <label key={l.key} className="flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" checked={layers.has(l.key)} onChange={() => toggle(l.key)} className="h-3 w-3" style={{ accentColor: l.c }} />
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.c }} />{l.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* View: flat or tilted. */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <SignalTag kind="sample" source={SRC} />
        <div className="relative">
          <button type="button" className="focus-ring rounded-md border px-2.5 py-1 text-[9px]" aria-expanded={viewOpen} aria-haspopup="menu"
            style={{ borderColor: tilt ? P.CYAN : P.LINE2, background: `color-mix(in srgb,${P.PANEL} 85%,transparent)`, color: tilt ? P.CYAN : P.SOFT }}
            onClick={() => setViewOpen(o => !o)}>⬢ 3D View ▾</button>
          {viewOpen ? (
            <div className="absolute right-0 top-7 z-20 w-36 rounded-md border p-1 text-[9.5px]" role="menu" style={{ borderColor: P.LINE2, background: P.PANEL }}>
              {[[false, 'Flat map (2D)'], [true, 'Tilted (3D)']].map(([v, l]) => (
                <button key={String(v)} type="button" role="menuitemradio" aria-checked={tilt === v} className="focus-ring flex w-full items-center gap-1.5 rounded px-2 py-1 text-left"
                  style={{ color: tilt === v ? P.CYAN : P.SOFT }} onClick={() => { onTilt(v as boolean); setViewOpen(false); }}>
                  <span aria-hidden>{tilt === v ? '●' : '○'}</span>{l as string}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {sel || hover ? (
        <div className="pointer-events-none absolute left-12 top-3 rounded-md border px-2 py-1 text-[9.5px]" role="status" style={{ borderColor: P.LINE2, background: `color-mix(in srgb,${P.PANEL} 90%,transparent)`, color: P.SOFT }}>
          <span style={{ color: P.INK }}>{hover ?? sel?.name}</span> · {(() => { const n = counts.get((hover ?? sel?.name)!) ?? 0; return `${n} marker${n === 1 ? '' : 's'}`; })()}{sel && !hover ? ' · open' : ''}
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8.5px]" style={{ color: P.SOFT }}>
          {CITY_LAYERS.map(l => (
            <button key={l.key} type="button" aria-pressed={layers.has(l.key)} onClick={() => toggle(l.key)} className="focus-ring inline-flex items-center gap-1 rounded" style={{ opacity: layers.has(l.key) ? 1 : 0.45 }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: P[l.colour] as string }} />{l.label}
            </button>
          ))}
        </div>
        {city ? (
          <div className="max-w-[55%] truncate text-right text-[7.5px]" style={{ color: P.MUT }} title={`${city.districts ? `${city.city.name} and its ${city.geo.noun}s` : `${city.city.name} (no district shapes recorded beneath it)`} · Boundaries: ${city.geo.credit}`}>
            {city.city.name}{city.districts ? ` · ${units.length} ${city.geo.noun}${units.length === 1 ? '' : 's'}` : ''} · Boundaries: {city.geo.credit}
          </div>
        ) : null}
      </div>
    </div>
  );
}
