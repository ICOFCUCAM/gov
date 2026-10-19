'use client';

// A world map centred on the nation, for the cyber and intelligence command
// screens (map plan phase 5). Natural Earth 1:50m countries in an Equal Earth
// projection turned to the nation's longitude; the nation in its own shape
// and the page's accent, its capital under a radar sweep; the origins or
// risks a page names drawn as markers at real countries' centres with their
// routes to the capital over the globe (great circles). Foreign countries are
// never coloured by figures: only markers, each marked sample until a real
// feed is connected. Zoom (centred on the nation), whole world, full screen,
// a layers menu, and a table of the same markers.

import * as React from 'react';
import { geoCentroid, geoEqualEarth, geoGraticule10, geoPath, geoInterpolate } from 'd3-geo';
import { loadCountry } from '@/lib/geo/admin1';
import type { Geom } from '@/lib/geo/admin1';
import { loadWorld, nationIndex, type WorldModel } from '@/lib/map/world';
import { nationCapital, nationIso3, nationWorldview } from '@/lib/nation/registry';
import { disputedAreas } from '@/lib/map/disputed';
import { DisputedLayer } from '@/components/map/DisputedLayer';
import { useReducedMotion } from '@/components/features/situation/Theatre';
import { SignalTag } from '@/components/ui/SignalTag';
import { seed } from '@/lib/telemetry';
import type { CommandPalette, LegendItem } from './CommandMap';

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'monitored';
export interface ThreatMarker { level: ThreatLevel; label: string; detail?: string }

const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });

/** The world and the nation's own outline, loaded once. */
function useWorldAndNation() {
  const iso3 = nationIso3();
  const [world, setWorld] = React.useState<WorldModel | null>(null);
  const [nation, setNation] = React.useState<{ name: string; shape: Geom } | null>(null);
  React.useEffect(() => { let live = true; void loadWorld().then(w => { if (live) setWorld(w); }); return () => { live = false; }; }, []);
  React.useEffect(() => {
    if (!iso3) return;
    let live = true;
    void loadCountry(iso3).then(c => {
      if (!live || !c) return;
      const shape: Geom | undefined = c.outline ?? (c.provinces.length ? {
        type: 'MultiPolygon',
        coordinates: c.provinces.flatMap(p => (p.geometry.type === 'Polygon' ? [p.geometry.coordinates as number[][][]] : (p.geometry.coordinates as number[][][][]))),
      } : undefined);
      if (shape) setNation({ name: c.name, shape });
    });
    return () => { live = false; };
  }, [iso3]);
  return { world, nation };
}

/**
 * Sample places for a page's markers: real countries, chosen by a stable seed
 * among those large enough to read on a world map, never the nation itself.
 * They stand in until a real feed names the origins.
 */
function samplePlaces(world: WorldModel, home: number, key: string, n: number): number[] {
  const path = geoPath(geoEqualEarth());
  const big = world.countries.map((c, i) => ({ i, a: path.area(feature(c.geometry) as never) })).filter(x => x.i !== home && x.a > 30).map(x => x.i);
  const out: number[] = [];
  for (let k = 0; out.length < Math.min(n, big.length) && k < n * 20; k++) {
    const pick = big[Math.floor(seed(`${key}:${k}`) * big.length)]!;
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

export function WorldThreatMap({ title, seedKey, markers, palette, height, legend, levelColour, source, routes = true, fullRef }: {
  title: string;
  seedKey: string;
  markers: ThreatMarker[];
  palette: CommandPalette;
  height: number;
  legend: LegendItem[];
  levelColour: Record<ThreatLevel, string>;
  /** Where the markers come from (shown with the Sample marker). */
  source: string;
  /** Draw each marker's route to the capital. */
  routes?: boolean;
  /** Set to a function that opens this map full screen (for a "View Full Map" action elsewhere on the panel). */
  fullRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const reduced = useReducedMotion();
  const { world, nation } = useWorldAndNation();
  const capital = nationCapital();
  const box = React.useRef<HTMLDivElement>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(560);
  const [z, setZ] = React.useState(1);
  const [full, setFull] = React.useState(false);
  const [view, setView] = React.useState<'map' | 'table'>('map');
  const [menu, setMenu] = React.useState(false);
  const [off, setOff] = React.useState<Set<string>>(new Set());
  const on = (l: string) => !off.has(l);
  const uid = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(240, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => {
    const f = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const toggleFull = React.useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void box.current?.requestFullscreen?.().catch(() => undefined);
  }, []);
  React.useEffect(() => { if (fullRef) fullRef.current = toggleFull; }, [fullRef, toggleFull]);

  const H = full ? Math.max(height, (typeof window !== 'undefined' ? window.innerHeight : 800) - 120) : height;
  const model = React.useMemo(() => {
    if (!world) return null;
    const centre = nation ? (geoCentroid(feature(nation.shape) as never) as [number, number]) : capital ? [capital.lng, capital.lat] as [number, number] : [0, 0] as [number, number];
    const proj = geoEqualEarth().rotate([-centre[0], 0]);
    proj.fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' } as never);
    if (z > 1) {
      // Zoom on the nation: scale about its centre and keep it in the middle.
      proj.scale(proj.scale() * z);
      const p = proj(centre)!;
      const [tx, ty] = proj.translate();
      proj.translate([tx + W / 2 - p[0], ty + H / 2 - p[1]]);
    }
    proj.clipExtent([[0, 0], [W, H]]);
    const path = geoPath(proj);
    const home = nationIndex(world, centre);
    const places = samplePlaces(world, home, seedKey, markers.length);
    const cap = capital ? proj([capital.lng, capital.lat]) : nation ? proj(centre) : null;
    const capLL: [number, number] = capital ? [capital.lng, capital.lat] : centre;
    const hubs = markers.slice(0, places.length).map((m, k) => {
      const c = world.countries[places[k]!]!;
      const ll = geoCentroid(feature(c.geometry) as never) as [number, number];
      const xy = proj(ll);
      const line = { type: 'LineString' as const, coordinates: [ll, capLL] };
      const interp = geoInterpolate(ll, capLL);
      const pts = Array.from({ length: 33 }, (_, i) => proj(interp(i / 32))).filter((q): q is [number, number] => !!q && q.every(Number.isFinite));
      return { ...m, country: c.name, xy, d: path(line as never) || '', motion: pts.length > 1 ? `M${pts.map(q => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L')}` : '' };
    });
    return {
      sphere: path({ type: 'Sphere' } as never) || '',
      graticule: path(geoGraticule10() as never) || '',
      countries: world.countries.map((c, i) => ({ d: path(feature(c.geometry) as never) || '', name: c.name, home: i === home })),
      nation: nation ? path(feature(nation.shape) as never) || '' : '',
      pathOf: (g: Geom) => path(feature(g) as never) || '',
      project: (lng: number, lat: number) => { const q = proj([lng, lat]); return q && q.every(Number.isFinite) ? (q as [number, number]) : null; },
      cap: cap && cap.every(Number.isFinite) ? { x: cap[0], y: cap[1] } : null,
      hubs,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, nation, W, H, z, seedKey, markers.map(m => m.level + m.label).join('|'), capital?.lng, capital?.lat]);

  const name = nation?.name ?? 'The nation';
  const summary = model ? `${title}: world map centred on ${name}; ${model.hubs.length} sample markers: ${model.hubs.map(h => `${h.country} (${h.level})`).join(', ')}.` : title;
  const btn = 'grid h-6 w-6 place-items-center rounded-[2px] border text-[11px] focus-ring hover:brightness-125 disabled:opacity-40';
  const btnStyle = { borderColor: palette.line, background: palette.panel, color: palette.soft };
  const toggle = (l: string) => setOff(s => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const legendShown = legend.filter(l => !l.layer || on(l.layer));
  // A short map keeps its controls in a row and its legend under it, so neither covers the world.
  const small = H < 220;

  return (
    <div ref={box} className={`relative ${full ? 'flex h-full flex-col justify-center p-4' : ''}`} style={{ background: full ? palette.panel : undefined }}>
      <figure className="relative min-w-0" aria-label={title}>
        <div className="absolute start-2 end-2 top-1.5 z-20 flex flex-wrap items-center justify-between gap-2">
          <figcaption className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: palette.soft }}>
            {name} in the world<SignalTag kind="sample" source={source} />
          </figcaption>
          <div className="flex gap-1" role="group" aria-label="Show as">
            {(['map', 'table'] as const).map(v => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className="focus-ring rounded-[2px] border px-1.5 py-0.5 text-[8px] uppercase tracking-wider"
                style={{ borderColor: view === v ? palette.accent : palette.line, color: view === v ? palette.accent : palette.soft, background: palette.panel }}>{v}</button>
            ))}
          </div>
        </div>
        <div ref={wrap} className="relative w-full overflow-hidden rounded-[3px]" style={{ height: H, background: `radial-gradient(120% 90% at 50% 45%, color-mix(in srgb, ${palette.accent} 7%, ${palette.panel}), ${palette.panel})` }}>
          {view === 'map' ? (!model ? <p className="p-3 text-[10px]" style={{ color: palette.soft }}>Loading the world map…</p> : (
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label={summary}>
              <defs>
                <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={palette.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                </radialGradient>
                {/* land as a dot matrix, the look of the earlier threat maps, on the real coastlines */}
                <pattern id={`dots-${uid}`} width={H < 220 ? 3 : 3.6} height={H < 220 ? 3 : 3.6} patternUnits="userSpaceOnUse">
                  <circle cx={1.2} cy={1.2} r={H < 220 ? 0.7 : 0.85} fill={palette.soft} fillOpacity={0.55} />
                </pattern>
                {(Object.keys(levelColour) as ThreatLevel[]).map(l => (
                  <radialGradient key={l} id={`lv-${l}-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={levelColour[l]} stopOpacity={0.55} />
                    <stop offset="45%" stopColor={levelColour[l]} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={levelColour[l]} stopOpacity={0} />
                  </radialGradient>
                ))}
              </defs>
              <path d={model.sphere} fill={palette.panel} stroke={palette.accent} strokeOpacity={0.35} strokeWidth={0.8} style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${palette.accent} 40%, transparent))` }} />
              <path d={model.graticule} fill="none" stroke={palette.soft} strokeOpacity={0.12} strokeWidth={0.5} />
              {model.countries.map((c, i) => c.home ? null : (
                <g key={i}>
                  <path d={c.d} fill={palette.muted} fillOpacity={0.14} stroke={palette.soft} strokeOpacity={0.28} strokeWidth={0.35}><title>{c.name}</title></path>
                  <path d={c.d} fill={`url(#dots-${uid})`} pointerEvents="none" aria-hidden />
                </g>
              ))}
              {model.cap && on('radar') ? (
                <g aria-hidden pointerEvents="none">
                  <circle cx={model.cap.x} cy={model.cap.y} r={Math.min(W, H) * 0.16} fill={`url(#glow-${uid})`} />
                  {[1, 2].map(k => <circle key={k} cx={model.cap!.x} cy={model.cap!.y} r={Math.min(W, H) * 0.09 * k} fill="none" stroke={palette.accent} strokeOpacity={0.25} strokeDasharray="2 4" strokeWidth={0.7} />)}
                  <path d={`M${model.cap.x},${model.cap.y} l${Math.min(W, H) * 0.2},0 a${Math.min(W, H) * 0.2},${Math.min(W, H) * 0.2} 0 0 0 ${Math.min(W, H) * 0.2 * (Math.cos(-0.5) - 1)},${Math.min(W, H) * 0.2 * Math.sin(-0.5)} Z`} fill={palette.accent} fillOpacity={0.12}>
                    {!reduced ? <animateTransform attributeName="transform" type="rotate" from={`0 ${model.cap.x} ${model.cap.y}`} to={`360 ${model.cap.x} ${model.cap.y}`} dur="7s" repeatCount="indefinite" /> : null}
                  </path>
                </g>
              ) : null}
              {model.nation ? <path d={model.nation} fill={palette.accent} fillOpacity={0.55} stroke={palette.accent} strokeWidth={1} style={{ filter: `drop-shadow(0 0 4px ${palette.accent})` }}><title>{name}</title></path> : null}
              <DisputedLayer areas={disputedAreas(nationWorldview())} pathOf={model.pathOf} project={model.project} nation={nationIso3()} nationFill={palette.accent} view={nationWorldview()} labels={z > 1.5} />
              {routes && on('routes') ? model.hubs.map((h, i) => h.d ? (
                <g key={`r${i}`} aria-hidden pointerEvents="none">
                  <path d={h.d} fill="none" stroke={levelColour[h.level]} strokeWidth={2.4} strokeOpacity={0.08} />
                  <path d={h.d} fill="none" stroke={levelColour[h.level]} strokeWidth={0.9} strokeOpacity={0.6} strokeDasharray="3 4" className="motion-safe:animate-dash-flow" />
                  {!reduced && h.motion && (h.level === 'critical' || h.level === 'high') ? (
                    <circle r={1.8} fill={levelColour[h.level]} style={{ filter: `drop-shadow(0 0 3px ${levelColour[h.level]})` }}>
                      <animateMotion dur={`${3 + (i % 3)}s`} repeatCount="indefinite" path={h.motion} />
                    </circle>
                  ) : null}
                </g>
              ) : null) : null}
              {on('markers') ? model.hubs.map((h, i) => h.xy ? (
                <g key={`h${i}`}>
                  <title>{`${h.label} · ${h.country} · ${h.level}${h.detail ? ` · ${h.detail}` : ''} (sample)`}</title>
                  {h.level !== 'monitored' ? <circle cx={h.xy[0]} cy={h.xy[1]} r={(h.level === 'critical' ? 20 : h.level === 'high' ? 15 : 11) * Math.min(1.4, Math.max(0.9, H / 240))} fill={`url(#lv-${h.level}-${uid})`} /> : null}
                  {h.level === 'monitored' ? <circle cx={h.xy[0]} cy={h.xy[1]} r={5} fill="none" stroke={levelColour[h.level]} strokeWidth={1} /> : null}
                  {h.level === 'critical' ? <circle cx={h.xy[0]} cy={h.xy[1]} r={8} fill="none" stroke={levelColour[h.level]} strokeWidth={1} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
                  <circle cx={h.xy[0]} cy={h.xy[1]} r={h.level === 'critical' ? 3.6 : 2.6} fill={levelColour[h.level]} stroke={palette.panel} strokeWidth={0.6} strokeDasharray="1.5 1" style={{ filter: `drop-shadow(0 0 3px ${levelColour[h.level]})` }} />
                  {h.level === 'critical' ? <text x={h.xy[0]} y={h.xy[1] + 2.4} textAnchor="middle" fontSize="6.5" fill={palette.panel} aria-hidden>☠</text> : null}
                </g>
              ) : null) : null}
              {model.cap ? (
                <g aria-hidden pointerEvents="none">
                  <circle cx={model.cap.x} cy={model.cap.y} r={3} fill={palette.ink} stroke={palette.panel} strokeWidth={1} />
                  <circle cx={model.cap.x} cy={model.cap.y} r={7} fill="none" stroke={palette.accent} strokeWidth={1} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                  <text x={model.cap.x + 7} y={model.cap.y - 6} fontSize="8.5" fontWeight="700" fill={palette.ink} stroke={palette.panel} strokeWidth={2.4} paintOrder="stroke">{capital?.name ?? name}</text>
                </g>
              ) : null}
              {/* tactical framing */}
              <g aria-hidden pointerEvents="none">
                {!reduced ? (
                  <line x1={0} x2={W} y1={0} y2={0} stroke={palette.accent} strokeOpacity={0.3} strokeWidth={0.8}>
                    <animateTransform attributeName="transform" type="translate" from="0 0" to={`0 ${H}`} dur="6.5s" repeatCount="indefinite" />
                  </line>
                ) : null}
                {[[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]].map(([x, y, dx, dy], i) => (
                  <path key={i} d={`M${x},${y! + dy! * 12} L${x},${y} L${x! + dx! * 12},${y}`} fill="none" stroke={palette.accent} strokeOpacity={0.5} strokeWidth={1} />
                ))}
              </g>
            </svg>
          )) : model ? (
            <div className="h-full overflow-auto px-2 pb-2 pt-8">
              <table className="w-full text-[9px]" style={{ color: palette.soft }}>
                <caption className="sr-only">{summary}</caption>
                <thead><tr className="border-b text-start" style={{ borderColor: palette.line, color: palette.muted }}><th className="py-1 text-start font-semibold">Marker</th><th className="text-start font-semibold">Country (sample)</th><th className="text-start font-semibold">Level</th></tr></thead>
                <tbody>
                  {model.hubs.map((h, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: palette.line }}><td className="py-1" style={{ color: palette.ink }}>{h.label}{h.detail ? <span style={{ color: palette.muted }}> · {h.detail}</span> : null}</td><td>{h.country}</td><td className="font-bold uppercase" style={{ color: levelColour[h.level] }}>{h.level}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {/* controls: zoom on the nation, whole world, full screen, layers */}
          <div className={`absolute z-20 flex gap-1 ${small ? 'bottom-1.5 end-2 flex-row' : 'end-2 top-8 flex-col'}`}>
            <button type="button" className={btn} style={btnStyle} onClick={() => setZ(v => Math.min(6, v * 1.6))} disabled={z >= 6 || view !== 'map'} title="Zoom in on the nation" aria-label="Zoom in on the nation">+</button>
            <button type="button" className={btn} style={btnStyle} onClick={() => setZ(v => Math.max(1, v / 1.6))} disabled={z <= 1 || view !== 'map'} title="Zoom out" aria-label="Zoom out">−</button>
            <button type="button" className={btn} style={btnStyle} onClick={() => setZ(1)} title="Whole world" aria-label="Show the whole world">⌖</button>
            <button type="button" className={btn} style={btnStyle} onClick={toggleFull} title={full ? 'Leave full screen' : 'Full screen'} aria-label={full ? 'Leave full screen' : 'Full screen'} aria-pressed={full}>⛶</button>
            <div className="relative">
              <button type="button" className={btn} style={{ ...btnStyle, color: menu ? palette.accent : palette.soft }} onClick={() => setMenu(m => !m)} title="Layers" aria-label="Layers" aria-expanded={menu}>☰</button>
              {menu ? (
                <div className={`absolute end-7 z-30 w-44 ${small ? 'bottom-0' : 'top-0'} space-y-1 rounded-[3px] border p-2 text-[10px]`} role="group" aria-label="Map layers" style={{ borderColor: palette.line, background: palette.panel, color: palette.soft }}>
                  {[{ id: 'markers', label: 'Markers' }, ...(routes ? [{ id: 'routes', label: 'Routes to the capital' }] : []), { id: 'radar', label: 'Radar over the capital' }].map(l => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={on(l.id)} onChange={() => toggle(l.id)} /><span>{l.label}</span></label>
                  ))}
                  <a href="/gov/situation-room" className="mt-1 block border-t pt-1 underline" style={{ borderColor: palette.line, color: palette.accent }}>Open the Situation Room</a>
                </div>
              ) : null}
            </div>
          </div>
          {legendShown.length && view === 'map' && !small ? (
            <div className="pointer-events-none absolute bottom-2 start-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-3 gap-y-0.5 rounded-[2px] border px-3 py-1"
              style={{ borderColor: palette.line, background: `color-mix(in srgb, ${palette.panel} 82%, transparent)` }}>
              {legendShown.map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: palette.soft }}>
                  <span className={l.shape === 'ring' ? 'h-1.5 w-1.5 rounded-full border' : l.shape === 'line' ? 'h-0.5 w-3' : 'h-1.5 w-1.5 rounded-full'}
                    style={l.shape === 'ring' ? { borderColor: l.colour } : { background: l.colour }} aria-hidden />{l.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {legendShown.length && small ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {legendShown.map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: palette.soft }}>
                <span className={l.shape === 'ring' ? 'h-1.5 w-1.5 rounded-full border' : 'h-1.5 w-1.5 rounded-full'} style={l.shape === 'ring' ? { borderColor: l.colour } : { background: l.colour }} aria-hidden />{l.label}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1 text-[8px]" style={{ color: palette.muted }}>
          World: Natural Earth 1:50m (public domain) · {name}: the nation&rsquo;s own boundaries · Markers and routes: {source} (sample; countries chosen as examples, not findings)
        </p>
      </figure>
    </div>
  );
}
