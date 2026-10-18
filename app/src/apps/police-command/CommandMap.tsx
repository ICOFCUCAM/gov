'use client';

// The command map of the police, emergency and immigration apps (map plan
// phase 5): the ministry map preset (components/map/MinistryMap.tsx) on the
// nation's real regions, in the command-theatre look of the Situation Room:
// the engine's fixed theatre frame with the neighbouring countries drawn and
// named around the nation, radar over the capital, scanline, corner brackets,
// callouts on the regions under most pressure. Working controls: zoom in and
// out (and drag to pan) through the engine's own zoom, back to the whole
// nation, full screen, and a layers menu that switches the sample layers on
// and off. The legend sits under the map (the engine's `below` slot) and
// lists only what is drawn. Every figure keeps its source marker (MinistryMap
// / NationMap); examples are marked sample. Colours come from the page's own
// palette (passed in) or the design tokens. Nothing here touches the engine's
// elements: everything goes through its props.

import * as React from 'react';
import { MinistryMap, type MapFlow, type MapValue, type SampleMarker, type Hotspot } from '@/components/map/MinistryMap';
import type { OverlayContext } from '@/components/map/NationMap';
import { useReducedMotion } from '@/components/features/situation/Theatre';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import type { SignalKind } from '@/lib/twin/signal';
import { CONSOLE } from '@/lib/theme/tokens';
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
    const lx = right ? Math.min(ctx.width - w - 6, u.x + 34) : Math.max(40, u.x - 34 - w); // 40: clear of the control stack
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

/**
 * Tactical framing: scanline and corner brackets on the frame. The overlay is
 * drawn inside the engine's zoomed drawing, so this undoes the zoom to stay
 * fixed to the frame while the map moves under it.
 */
function Framing({ ctx, zoom, colour, reduced }: { ctx: OverlayContext; zoom: { z: number; tx: number; ty: number }; colour: string; reduced: boolean }) {
  const { width: W, height: H } = ctx;
  return (
    <g aria-hidden pointerEvents="none" transform={zoom.z > 1 ? `scale(${1 / zoom.z}) translate(${-zoom.tx} ${-zoom.ty})` : undefined} style={{ transition: 'transform 260ms ease' }}>
      {!reduced ? (
        <line x1={0} x2={W} y1={0} y2={0} stroke={colour} strokeOpacity={0.4} strokeWidth={0.8} style={{ filter: `drop-shadow(0 0 3px ${colour})` }}>
          <animateTransform attributeName="transform" type="translate" from="0 0" to={`0 ${H}`} dur="6.5s" repeatCount="indefinite" />
        </line>
      ) : null}
      {[[2, 2, 1, 1], [W - 2, 2, -1, 1], [2, H - 2, 1, -1], [W - 2, H - 2, -1, -1]].map(([x, y, dx, dy], i) => (
        <path key={i} d={`M${x},${y! + dy! * 14} L${x},${y} L${x! + dx! * 14},${y}`} fill="none" stroke={colour} strokeOpacity={0.6} strokeWidth={1} />
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
  const [winH, setWinH] = React.useState(800);
  // The engine's last whole-nation layout (unit positions, capital, size), kept from its overlay call for zoom and pan.
  const ctxRef = React.useRef<OverlayContext | null>(null);
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const on = React.useCallback((l: string) => !off.has(l), [off]);
  const allLayers: MapLayer[] = [{ id: 'pressure', label: 'Pressure glow' }, { id: 'callouts', label: 'Callouts' }, ...layers, { id: 'radar', label: 'Radar over the capital' }];

  // Full screen of the panel's map.
  React.useEffect(() => {
    const f = () => { setFull(document.fullscreenElement === box.current); setWinH(window.innerHeight); };
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  const toggleFull = React.useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void box.current?.requestFullscreen?.().catch(() => undefined);
  }, []);
  React.useEffect(() => { if (fullRef) fullRef.current = toggleFull; }, [fullRef, toggleFull]);

  // Zoom (the engine's `zoom`): about the chosen region, else the capital; kept inside the frame.
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

  // Drag to pan while zoomed in: pointer handlers on this panel's own wrapper, starting on the map drawing.
  const onPointerDown = (e: React.PointerEvent) => {
    if (view.z === 1 || !(e.target instanceof Element) || !e.target.closest('svg')) return;
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    d.moved = true;
    setView(clampView(view.z, d.tx + dx, d.ty + dy));
  };
  // After a move the drag is kept until the click that follows, so that click can be ignored.
  const endDrag = () => { if (!drag.current?.moved) drag.current = null; };
  // A drag is not a click: the region under the pointer is not chosen when the map was moved.
  const onClickCapture = (e: React.MouseEvent) => { if (drag.current?.moved) { e.stopPropagation(); } drag.current = null; };

  const shownSamples = samples.filter(s => on(s.layer ?? 'samples')).map(({ layer: _l, ...s }) => s);
  const shownFlows = flows.filter(f => on(f.layer ?? 'flows')).map(({ layer: _l, ...f }) => f);
  const mapH = full ? Math.max(height, winH - 190) : height;
  const legendShown = legend.filter(l => !l.layer || on(l.layer));
  const btn = 'grid h-6 w-6 place-items-center rounded-[2px] border text-[11px] focus-ring hover:brightness-125 disabled:opacity-60';
  const btnStyle = { borderColor: palette.line, background: palette.panel, color: palette.soft };

  // Control stack on the map (the engine's `hud`): zoom, whole nation, full screen, layers; the zoom readout under it.
  const hud = (
    <>
      <button type="button" className={btn} style={btnStyle} onClick={() => zoomTo(view.z * 1.5)} disabled={view.z >= 4} title="Zoom in" aria-label="Zoom in">+</button>
      <button type="button" className={btn} style={btnStyle} onClick={() => zoomTo(view.z / 1.5)} disabled={view.z <= 1} title="Zoom out" aria-label="Zoom out">−</button>
      <button type="button" className={btn} style={btnStyle} onClick={() => { setView({ z: 1, tx: 0, ty: 0 }); onSelect?.(undefined); }} title="Whole nation" aria-label="Show the whole nation">⌖</button>
      <button type="button" className={btn} style={btnStyle} onClick={toggleFull} title={full ? 'Leave full screen' : 'Full screen'} aria-label={full ? 'Leave full screen' : 'Full screen'} aria-pressed={full}>⛶</button>
      <div className="relative">
        <button type="button" className={btn} style={{ ...btnStyle, color: menu ? palette.accent : palette.soft }} onClick={() => setMenu(m => !m)} title="Layers" aria-label="Layers" aria-expanded={menu}>☰</button>
        {menu ? (
          <div className="absolute start-7 top-0 z-30 w-52 space-y-1 rounded-[3px] border p-2 text-[10px]" role="group" aria-label="Map layers"
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
      {view.z > 1 ? (
        <div className="pointer-events-none mt-1 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: palette.accent }} aria-live="polite">
          ×{view.z.toFixed(1)}{selected ? ` · ${selected}` : ''}<br />drag to move
        </div>
      ) : null}
    </>
  );

  // Legend strip under the map (the engine's `below`): every entry is drawn.
  const below = legendShown.length ? (
    <div className="flex justify-center">
      <div className="flex max-w-full flex-wrap justify-center gap-x-3 gap-y-0.5 rounded-[2px] border px-3 py-1"
        style={{ borderColor: palette.line, background: `color-mix(in srgb, ${palette.panel} 82%, transparent)` }}>
        {legendShown.map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-wider" style={{ color: palette.soft }}>
            <LegendMark it={l} />{l.label}{l.sample ? <span className="rounded-[2px] border border-dashed px-0.5 text-[6.5px]" style={{ borderColor: palette.muted }}>sample</span> : null}
          </span>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <div ref={box} className={`relative ${full ? 'flex h-full flex-col justify-center overflow-auto p-4' : ''}`}
      style={{ ...(CONSOLE as React.CSSProperties), background: full ? palette.panel : undefined, cursor: view.z > 1 ? (drag.current ? 'grabbing' : 'grab') : undefined, touchAction: view.z > 1 ? 'none' : undefined }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={() => { drag.current = null; }} onClickCapture={onClickCapture}>
      <MinistryMap title={title} theatre values={values} kind={kind} source={source} valueLabel={valueLabel} unit={unit}
        categories={categories} samples={shownSamples} samplesSource={samplesSource} flows={shownFlows} flowsKind={flowsKind}
        hotspots={on('pressure') ? hotspots : []} maxHeight={mapH} minHeight={mapH} selected={selected} emptyNote={emptyNote}
        onSelect={onSelect ? u => onSelect(selected && keyOf(selected) === keyOf(u.name) ? undefined : u.name) : undefined}
        engine={{ frameHeight: mapH, header: 'above', zoom: view, hud, below, notes: 'small' }}
        extra={ctx => {
          ctxRef.current = ctx;
          return (
            <g>
              {on('radar') ? <Radar ctx={ctx} colour={palette.accent} reduced={reduced} /> : null}
              {extra?.(ctx, on, frontier)}
              {/* Callouts label the whole-nation view; zoomed in, the regions speak for themselves (and hover names them). */}
              {on('callouts') && view.z === 1 ? <Callouts ctx={ctx} items={callouts} palette={palette} /> : null}
              <Framing ctx={ctx} zoom={view} colour={palette.accent} reduced={reduced} />
            </g>
          );
        }} />
    </div>
  );
}
