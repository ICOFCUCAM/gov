'use client';

// The command map of the police, emergency and immigration apps (map plan
// phase 5): the ministry map preset (components/map/MinistryMap.tsx) on the
// nation's real regions, in the command-theatre look of the Situation Room —
// neighbouring countries named around the nation, radar over the capital,
// scanline, corner brackets, callouts on the regions under most pressure —
// with working controls: zoom in and out (and drag to pan), back to the
// whole nation, full screen, and a layers menu that switches the sample
// layers on and off. The legend lists only what is drawn. Every figure keeps
// its source marker (MinistryMap / NationMap); examples are marked sample.
// Colours come from the page's own palette (passed in) or the design tokens.

import * as React from 'react';
import { geoPath, geoCentroid, type GeoProjection } from 'd3-geo';
import { MinistryMap, type MapFlow, type MapValue, type SampleMarker, type Hotspot } from '@/components/map/MinistryMap';
import type { OverlayContext } from '@/components/map/NationMap';
import { useReducedMotion } from '@/components/features/situation/Theatre';
import { nationCapital, nationIso3, nationProjection, nationRegions } from '@/lib/nation/registry';
import { INSETS, projectionFor, projectionKind } from '@/lib/map/projection';
import type { SignalKind } from '@/lib/twin/signal';
import { CONSOLE } from '@/lib/theme/tokens';
import type { Geom } from '@/lib/geo/admin1';
import { loadFrontier, type Frontier } from './frontier';

/** The page's own colours (its existing constants), so the map wears the page. */
export interface CommandPalette {
  critical: string; high: string; medium: string; low: string; monitor: string;
  accent: string; line: string; panel: string; ink: string; soft: string; muted: string;
}

export interface LegendItem {
  label: string;
  colour: string;
  shape?: 'dot' | 'glow' | 'tile' | 'line' | 'dash' | 'ring' | 'glyph';
  glyph?: string;
  /** Drawn by this layer: hidden from the legend while the layer is off. */
  layer?: string;
  sample?: boolean;
}
export interface MapLayer { id: string; label: string; sample?: boolean }

/** Kept for the page while the overlay draws: unit positions and the map size, for zoom and lists. */
export type CommandCtx = OverlayContext;

const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });
const keyOf = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** The nation's frontier for the installed nation (null until loaded or without a nation). */
export function useFrontier(): Frontier | null {
  const iso3 = nationIso3();
  const regions = nationRegions();
  const key = `${iso3}|${regions.join('|')}`;
  const [f, setF] = React.useState<Frontier | null>(null);
  React.useEffect(() => {
    if (!iso3) return;
    let live = true;
    void loadFrontier(iso3, regions).then(r => { if (live) setF(r); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return f;
}

/**
 * The map's own projection, recovered from the engine's: the same kind and
 * rotation for the same units, scaled and moved to match two of the units the
 * engine placed (checked on a third). Null for composite projections (USA).
 */
function calibrate(ctx: OverlayContext, f: Frontier): GeoProjection | null {
  const shaped = f.geo.units.filter(u => u.geometry);
  const insetCodes = new Set((INSETS[f.geo.iso3] ?? []).flat());
  const main = shaped.filter(u => !(u.code && insetCodes.has(u.code)));
  const fc = { type: 'FeatureCollection' as const, features: (main.length ? main : shaped).map(u => feature(u.geometry!)) };
  if (!fc.features.length) return null;
  // A composite projection (insets moved beside the mainland) has no single frame to draw neighbours in.
  if (projectionKind(f.geo.iso3, fc as never, nationProjection()) === 'albers-usa') return null;
  const proj = projectionFor(f.geo.iso3, fc as never, nationProjection());
  proj.translate([0, 0]);
  const refs = main.flatMap(u => {
    if (u.lng == null || u.lat == null) return [];
    const s = ctx.project(u.lng, u.lat), p = proj([u.lng, u.lat]);
    return s && p ? [{ s, p }] : [];
  });
  if (refs.length < 3) return null;
  const a = refs[0]!;
  const b = refs.reduce((m, r) => (Math.hypot(r.s[0] - a.s[0], r.s[1] - a.s[1]) > Math.hypot(m.s[0] - a.s[0], m.s[1] - a.s[1]) ? r : m), refs[1]!);
  const dp = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
  if (!(dp > 0)) return null;
  const k = Math.hypot(b.s[0] - a.s[0], b.s[1] - a.s[1]) / dp;
  proj.scale(proj.scale() * k).translate([a.s[0] - k * a.p[0], a.s[1] - k * a.p[1]]);
  // Check on a third unit: the recovered projection must agree with the engine within 2 px.
  const third = main.filter(u => u.lng != null && u.lat != null && ctx.project(u.lng, u.lat))[Math.floor(refs.length / 2)];
  if (third) {
    const s = ctx.project(third.lng!, third.lat!)!, p = proj([third.lng!, third.lat!]);
    if (!p || Math.hypot(p[0] - s[0], p[1] - s[1]) > 2) return null;
  }
  proj.clipExtent([[-4, -4], [ctx.width + 4, ctx.height + 4]]);
  return proj;
}

/** Neighbouring countries around the nation, drawn and named (Natural Earth 1:50m). */
function Neighbours({ ctx, frontier, palette }: { ctx: OverlayContext; frontier: Frontier; palette: CommandPalette }) {
  const sig = `${ctx.width}x${ctx.height}:${ctx.capital?.x.toFixed(1)},${ctx.capital?.y.toFixed(1)}:${ctx.units.length}`;
  const drawn = React.useMemo(() => {
    const proj = calibrate(ctx, frontier);
    if (!proj) return null;
    const path = geoPath(proj);
    const near = new Set(frontier.neighbours.map(n => n.index));
    return frontier.world.countries.flatMap((c, i) => {
      if (i === frontier.home) return [];
      const d = path(feature(c.geometry) as never);
      if (!d) return [];
      const [[bx0, by0], [bx1, by1]] = path.bounds(feature(c.geometry) as never);
      const cx0 = Math.max(0, bx0), cx1 = Math.min(ctx.width, bx1), cy0 = Math.max(0, by0), cy1 = Math.min(ctx.height, by1);
      if (cx1 - cx0 < 2 || cy1 - cy0 < 2) return [];
      const ctr = proj(geoCentroid(feature(c.geometry) as never) as [number, number]);
      const inside = ctr && ctr[0] > 40 && ctr[0] < ctx.width - 40 && ctr[1] > 46 && ctr[1] < ctx.height - 26;
      const at: [number, number] | null = inside ? [ctr![0], ctr![1]] : cx1 - cx0 > 80 && cy1 - cy0 > 34 ? [(cx0 + cx1) / 2, (cy0 + cy1) / 2] : null;
      return [{ d, name: c.name, at, neighbour: near.has(i) }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontier, sig]);
  if (!drawn) return null;
  return (
    <g aria-hidden pointerEvents="none">
      {drawn.map((c, i) => (
        <path key={i} d={c.d} fill={palette.muted} fillOpacity={c.neighbour ? 0.12 : 0.07} stroke={palette.soft} strokeOpacity={c.neighbour ? 0.5 : 0.25} strokeWidth={0.8} />
      ))}
      {drawn.map((c, i) => c.at ? (
        <text key={`l${i}`} x={c.at[0]} y={c.at[1]} textAnchor="middle" fontSize="8.5" letterSpacing="2.2" fill={palette.soft} opacity={0.75}>{c.name.toUpperCase()}</text>
      ) : null)}
    </g>
  );
}

/** Radar rings and sweep over the capital, the theatre's centre of command. */
function Radar({ ctx, colour, reduced }: { ctx: OverlayContext; colour: string; reduced: boolean }) {
  const cap = ctx.capital;
  if (!cap) return null;
  const R = Math.max(40, Math.min(ctx.width, ctx.height) * 0.22);
  return (
    <g aria-hidden pointerEvents="none">
      {[1, 2, 3].map(k => <circle key={k} cx={cap.x} cy={cap.y} r={R * 0.5 * k} fill="none" stroke={colour} strokeOpacity={0.16} strokeWidth={0.7} strokeDasharray="2 5" />)}
      <path d={`M${cap.x},${cap.y} L${cap.x + R * 1.5},${cap.y} A${R * 1.5},${R * 1.5} 0 0 0 ${cap.x + R * 1.5 * Math.cos(-0.5)},${cap.y + R * 1.5 * Math.sin(-0.5)} Z`}
        fill={colour} fillOpacity={0.1}>
        {!reduced ? <animateTransform attributeName="transform" type="rotate" from={`0 ${cap.x} ${cap.y}`} to={`360 ${cap.x} ${cap.y}`} dur="7s" repeatCount="indefinite" /> : null}
      </path>
      <circle cx={cap.x} cy={cap.y} r={9} fill="none" stroke={colour} strokeOpacity={0.6} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
    </g>
  );
}

/** Labelled callouts for the regions under most pressure, stacked so they never overlap. */
function Callouts({ ctx, items, palette }: { ctx: OverlayContext; items: { region: string; line1: string; line2: string; colour: string }[]; palette: CommandPalette }) {
  const at = new Map(ctx.units.map(u => [keyOf(u.name), u] as const));
  const cap = ctx.capital ?? { x: ctx.width / 2, y: ctx.height / 2 };
  const placed: { x: number; y: number; lx: number; ly: number; right: boolean; it: (typeof items)[number] }[] = [];
  const w = 118, gap = 32, lo = 40, hi = ctx.height - 40;
  for (const it of items) {
    const u = at.get(keyOf(it.region));
    if (!u) continue;
    const right = u.x >= cap.x;
    const lx = right ? Math.min(ctx.width - w - 6, u.x + 34) : Math.max(6, u.x - 34 - w);
    placed.push({ x: u.x, y: u.y, lx, ly: Math.max(lo, Math.min(hi, u.y - 14)), right, it });
  }
  // Stack each side so no two callouts overlap: down from the top, then back up from the foot.
  for (const side of [true, false]) {
    const col = placed.filter(p => p.right === side).sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < col.length; i++) col[i]!.ly = Math.max(col[i]!.ly, col[i - 1]!.ly + gap);
    for (let i = col.length - 1; i >= 0; i--) col[i]!.ly = Math.max(lo, Math.min(col[i]!.ly, i === col.length - 1 ? hi : col[i + 1]!.ly - gap));
  }
  return (
    <g aria-hidden pointerEvents="none">
      {placed.map((p, i) => (
        <g key={i}>
          <path d={`M${p.x},${p.y} L${p.right ? p.lx : p.lx + 118},${p.ly + 13}`} stroke={p.it.colour} strokeOpacity={0.7} strokeWidth={0.7} fill="none" />
          <circle cx={p.x} cy={p.y} r={2.2} fill={p.it.colour} />
          <rect x={p.lx} y={p.ly} width={118} height={27} rx={2} fill={palette.panel} fillOpacity={0.86} stroke={p.it.colour} strokeOpacity={0.6} strokeWidth={0.7} />
          <text x={p.lx + 6} y={p.ly + 11} fontSize="9" fontWeight="600" fill={palette.ink}>{p.it.line1.length > 21 ? `${p.it.line1.slice(0, 20)}…` : p.it.line1}</text>
          <text x={p.lx + 6} y={p.ly + 21.5} fontSize="7.5" fontWeight="700" letterSpacing="0.8" fill={p.it.colour}>{p.it.line2}</text>
        </g>
      ))}
    </g>
  );
}

function LegendMark({ it }: { it: LegendItem }) {
  const c = it.colour;
  switch (it.shape) {
    case 'glow': return <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 5px ${c}` }} aria-hidden />;
    case 'tile': return <span className="h-2 w-2 rounded-[2px] border" style={{ borderColor: c }} aria-hidden />;
    case 'line': return <span className="h-0.5 w-3" style={{ background: c }} aria-hidden />;
    case 'dash': return <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: c }} aria-hidden />;
    case 'ring': return <span className="h-2 w-2 rounded-full border" style={{ borderColor: c }} aria-hidden />;
    case 'glyph': return <span className="text-[9px] leading-none" style={{ color: c }} aria-hidden>{it.glyph}</span>;
    default: return <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} aria-hidden />;
  }
}

export function CommandMap({
  title, height, palette, values, kind, source, valueLabel, unit, categories = [], samples = [], samplesSource, flows = [], flowsKind = 'sample',
  hotspots = [], callouts = [], layers = [], legend, extra, selected, onSelect, fullMapHref, fullRef, emptyNote,
}: {
  title: string;
  /** Height of the map itself in the panel. */
  height: number;
  palette: CommandPalette;
  values: MapValue[];
  kind: SignalKind;
  source: string;
  valueLabel: string;
  unit?: string;
  categories?: string[];
  samples?: (SampleMarker & { layer?: string })[];
  samplesSource?: string;
  flows?: (MapFlow & { layer?: string })[];
  flowsKind?: SignalKind;
  hotspots?: Hotspot[];
  /** The regions to label on the map (most pressed first). */
  callouts?: { region: string; line1: string; line2: string; colour: string }[];
  /** Layers the viewer can switch (besides pressure, callouts and radar, which are always offered). */
  layers?: MapLayer[];
  legend: LegendItem[];
  extra?: (ctx: OverlayContext, on: (layer: string) => boolean, frontier: Frontier | null) => React.ReactNode;
  selected?: string;
  onSelect?: (region: string | undefined) => void;
  /** Where "the full map" lives (also opens full screen here). */
  fullMapHref?: string;
  /** Set to a function that opens this map full screen (for a "View Full Map" action elsewhere). */
  fullRef?: React.MutableRefObject<(() => void) | null>;
  /** Shown under the map while no region has a figure. */
  emptyNote?: React.ReactNode;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const frontier = useFrontier();
  const [full, setFull] = React.useState(false);
  const [view, setView] = React.useState<{ z: number; tx: number; ty: number }>({ z: 1, tx: 0, ty: 0 });
  const [menu, setMenu] = React.useState(false);
  const [off, setOff] = React.useState<Set<string>>(new Set());
  const [svgBox, setSvgBox] = React.useState<{ top: number; height: number; width: number } | null>(null);
  const ctxRef = React.useRef<OverlayContext | null>(null);
  const legendBox = React.useRef<HTMLDivElement>(null);
  const on = React.useCallback((l: string) => !off.has(l), [off]);
  const allLayers: MapLayer[] = [{ id: 'pressure', label: 'Pressure glow' }, { id: 'callouts', label: 'Callouts' }, ...layers, { id: 'neighbours', label: 'Neighbouring countries' }, { id: 'radar', label: 'Radar over the capital' }];

  // Full screen of the panel's map.
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

  // Zoom: the map's own drawing is scaled about a point (the chosen region, else the capital) and can be dragged.
  const svgOf = () => box.current?.querySelector<SVGSVGElement>('svg[aria-roledescription="map"]') ?? null;
  const clampView = (z: number, tx: number, ty: number) => {
    const c = ctxRef.current; if (!c) return { z, tx, ty };
    return { z, tx: Math.min(0, Math.max(c.width - c.width * z, tx)), ty: Math.min(0, Math.max(c.height - c.height * z, ty)) };
  };
  const focusPoint = () => {
    const c = ctxRef.current; if (!c) return null;
    const u = selected ? c.units.find(x => keyOf(x.name) === keyOf(selected)) : undefined;
    return u ? { x: u.x, y: u.y } : c.capital ?? { x: c.width / 2, y: c.height / 2 };
  };
  const zoomTo = (z: number) => {
    const c = ctxRef.current, p = focusPoint(); if (!c || !p) return;
    const zz = Math.max(1, Math.min(4, z));
    setView(zz === 1 ? { z: 1, tx: 0, ty: 0 } : clampView(zz, c.width / 2 - p.x * zz, c.height / 2 - p.y * zz));
  };
  React.useEffect(() => { if (view.z > 1) zoomTo(view.z); /* follow the chosen region */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Apply the view to the engine's drawing, and keep strips for the title above and the legend below.
  React.useLayoutEffect(() => {
    const apply = () => {
      const svg = svgOf(); if (!svg) return;
      svg.style.transformOrigin = '0 0';
      svg.style.transition = reduced ? 'none' : 'transform 260ms ease';
      svg.style.transform = view.z === 1 ? '' : `translate(${view.tx}px, ${view.ty}px) scale(${view.z})`;
      svg.style.cursor = view.z > 1 ? 'grab' : '';
      if (svg.parentElement) {
        svg.parentElement.style.overflow = 'hidden';
        // A strip over the map for the engine's title and view buttons (however many rows they wrap to),
        // so they never sit on the map or the north arrow.
        const fig = svg.parentElement.parentElement;
        const head = fig?.firstElementChild as HTMLElement | null;
        if (fig?.tagName === 'FIGURE') fig.style.paddingTop = `${Math.max(30, (head?.offsetHeight ?? 22) + 8)}px`;
        // A strip under the map for the legend, so it never covers the map.
        const lh = legendBox.current?.offsetHeight ?? 0;
        svg.parentElement.style.marginBottom = lh ? `${lh + 8}px` : '';
      }
      const b = box.current!.getBoundingClientRect(), r = svg.parentElement!.getBoundingClientRect();
      const next = { top: Math.round(r.top - b.top), height: Math.round(r.height), width: Math.round(r.width) };
      setSvgBox(o => (o && o.top === next.top && o.height === next.height && o.width === next.width ? o : next));
    };
    apply();
    const mo = new MutationObserver(apply);
    if (box.current) mo.observe(box.current, { childList: true, subtree: true });
    return () => mo.disconnect();
  });

  // Drag to pan while zoomed in.
  React.useEffect(() => {
    const svg = svgOf();
    if (!svg || view.z === 1) return;
    let start: { x: number; y: number; tx: number; ty: number } | null = null;
    const down = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      svg.style.transition = 'none';
      setView(clampView(view.z, start.tx + dx, start.ty + dy));
    };
    const up = () => { start = null; };
    svg.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { svg.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.z, view.tx, view.ty]);

  const shownSamples = samples.filter(s => on(s.layer ?? 'samples')).map(({ layer: _l, ...s }) => s);
  const shownFlows = flows.filter(f => on(f.layer ?? 'flows')).map(({ layer: _l, ...f }) => f);
  const mapH = full ? Math.max(height, (typeof window !== 'undefined' ? window.innerHeight : 800) - 150) : height;
  const legendShown = legend.filter(l => !l.layer || on(l.layer));
  const btn = 'grid h-6 w-6 place-items-center rounded-[2px] border text-[11px] focus-ring hover:brightness-125';
  const btnStyle = { borderColor: palette.line, background: palette.panel, color: palette.soft };

  const uid = React.useId().replace(/:/g, '');
  return (
    <div ref={box} data-command-map={uid} className={`relative ${full ? 'flex h-full flex-col justify-center overflow-auto p-4' : ''}`}
      style={{ ...(CONSOLE as React.CSSProperties), background: full ? palette.panel : undefined }}>
      {/* The engine's notes under the map (legend of shades, capital, sources) at the panel's own small type. */}
      <style>{`[data-command-map="${uid}"] figure > div.space-y-1, [data-command-map="${uid}"] > div > p { font-size: 9px; line-height: 1.4; }`}</style>
      <MinistryMap title={title} theatre values={values} kind={kind} source={source} valueLabel={valueLabel} unit={unit}
        categories={categories} samples={shownSamples} samplesSource={samplesSource} flows={shownFlows} flowsKind={flowsKind}
        hotspots={on('pressure') ? hotspots : []} maxHeight={mapH} minHeight={mapH} selected={selected} emptyNote={emptyNote}
        onSelect={onSelect ? u => onSelect(selected && keyOf(selected) === keyOf(u.name) ? undefined : u.name) : undefined}
        extra={ctx => {
          ctxRef.current = ctx;
          return (
            <g>
              {frontier && on('neighbours') ? <Neighbours ctx={ctx} frontier={frontier} palette={palette} /> : null}
              {on('radar') ? <Radar ctx={ctx} colour={palette.accent} reduced={reduced} /> : null}
              {extra?.(ctx, on, frontier)}
              {/* Callouts label the whole-nation view; zoomed in, the regions speak for themselves (and hover names them). */}
              {on('callouts') && view.z === 1 ? <Callouts ctx={ctx} items={callouts} palette={palette} /> : null}
            </g>
          );
        }} />

      {/* tactical framing over the map: scanline and corner brackets */}
      {svgBox ? (
        <div className="pointer-events-none absolute inset-x-2 overflow-hidden" style={{ top: svgBox.top, height: svgBox.height }} aria-hidden>
          {!reduced ? <div className="absolute inset-x-0 top-0 h-px motion-safe:animate-scanline" style={{ background: palette.accent, boxShadow: `0 0 6px ${palette.accent}`, opacity: 0.5 }} /> : null}
          {(['start-0 top-0 border-s border-t', 'end-0 top-0 border-e border-t', 'start-0 bottom-0 border-s border-b', 'end-0 bottom-0 border-e border-b'] as const).map(c => (
            <span key={c} className={`absolute h-3.5 w-3.5 ${c}`} style={{ borderColor: palette.accent, opacity: 0.6 }} />
          ))}
        </div>
      ) : null}

      {/* control stack: zoom, whole nation, full screen, layers */}
      {svgBox ? (
        <div className="absolute end-3 z-20 flex flex-col gap-1" style={{ top: svgBox.top + 42 }}>
          <button type="button" className={btn} style={btnStyle} onClick={() => zoomTo(view.z * 1.5)} disabled={view.z >= 4} title="Zoom in" aria-label="Zoom in">+</button>
          <button type="button" className={btn} style={btnStyle} onClick={() => zoomTo(view.z / 1.5)} disabled={view.z <= 1} title="Zoom out" aria-label="Zoom out">−</button>
          <button type="button" className={btn} style={btnStyle} onClick={() => { setView({ z: 1, tx: 0, ty: 0 }); onSelect?.(undefined); }} title="Whole nation" aria-label="Show the whole nation">⌖</button>
          <button type="button" className={btn} style={btnStyle} onClick={toggleFull} title={full ? 'Leave full screen' : 'Full screen'} aria-label={full ? 'Leave full screen' : 'Full screen'} aria-pressed={full}>⛶</button>
          <div className="relative">
            <button type="button" className={btn} style={{ ...btnStyle, color: menu ? palette.accent : palette.soft }} onClick={() => setMenu(m => !m)} title="Layers" aria-label="Layers" aria-expanded={menu}>☰</button>
            {menu ? (
              <div className="absolute end-7 top-0 z-30 w-52 space-y-1 rounded-[3px] border p-2 text-[10px]" role="group" aria-label="Map layers"
                style={{ borderColor: palette.line, background: palette.panel, color: palette.soft }}>
                {allLayers.map(l => (
                  <label key={l.id} className="flex cursor-pointer items-center gap-1.5">
                    <input type="checkbox" checked={on(l.id)} onChange={() => setOff(s => { const n = new Set(s); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} />
                    <span className="flex-1">{l.label}</span>
                    {l.sample ? <span className="rounded-[2px] border border-dashed px-1 text-[8px] uppercase" style={{ borderColor: palette.muted }}>sample</span> : null}
                  </label>
                ))}
                {fullMapHref ? <a href={fullMapHref} className="mt-1 block border-t pt-1 underline" style={{ borderColor: palette.line, color: palette.accent }}>Open the full national map</a> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* legend over the map's foot: every entry is drawn */}
      {svgBox && legendShown.length ? (
        <div className="pointer-events-none absolute inset-x-2 z-10 flex justify-center" style={{ top: svgBox.top + svgBox.height + 4 }}>
          <div ref={legendBox} className="flex max-w-full flex-wrap justify-center gap-x-3 gap-y-0.5 rounded-[2px] border px-3 py-1"
            style={{ borderColor: palette.line, background: `color-mix(in srgb, ${palette.panel} 82%, transparent)` }}>
            {legendShown.map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: palette.soft }}>
                <LegendMark it={l} />{l.label}{l.sample ? <span className="rounded-[2px] border border-dashed px-0.5 text-[6.5px]" style={{ borderColor: palette.muted }}>sample</span> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {view.z > 1 ? (
        <div className="pointer-events-none absolute start-3 z-10 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ top: svgBox ? svgBox.top + 8 : 40, color: palette.accent }} aria-live="polite">
          Zoom ×{view.z.toFixed(1)}{selected ? ` · ${selected}` : ''} · drag to move
        </div>
      ) : null}
    </div>
  );
}

/** The capital's name, for lists that name it (null before setup). */
export function capitalName(): string | null { return nationCapital()?.name ?? null; }
