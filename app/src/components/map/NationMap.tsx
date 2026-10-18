'use client';

// The one map component every console page uses (map plan phase 1). It draws
// the installed nation's own units in their real shapes (lib/map), shades
// them by the figures a page passes in, and adds what a map needs to be read
// and trusted: a legend, scale bar, north arrow, the source of the boundaries
// and of the figures, an "as of" date, and a table of every unit in official
// order. Figures that are not observed or reported are hatched and carry the
// source marker; a unit with no figure stays blank and says so. Units are
// reachable by keyboard (arrow keys in official order, Enter selects). A unit
// with units beneath it (a region's districts) can be opened from the "Open"
// list or by double-clicking it. The capital is marked: the nation's own
// choice from setup, else the map data's default, which says so.

import * as React from 'react';
import { nationCapital, nationIso3, nationProjection, nationRegions } from '@/lib/nation/registry';
import { loadNationGeography, loadUnitGeography, type NationGeography } from '@/lib/map/geography';
import { buildMapModel, type MapPoint, type MapTone, type MapValue } from '@/lib/map/model';
import { classColour } from '@/lib/map/classify';
import { nameKeys } from '@/lib/map/names';
import { loadWorld, nationIndex, type WorldModel } from '@/lib/map/world';
import { geoCentroid } from 'd3-geo';
import { SignalTag } from '@/components/ui/SignalTag';
import { needsMarker, SIGNAL_LABEL, type SignalKind } from '@/lib/twin/signal';
import { STATUS } from '@/lib/theme/tokens';

export type { MapPoint, MapValue, MapTone };

const TONE_SHAPE: Record<MapTone, 'triangle' | 'diamond' | 'circle'> = { alert: 'triangle', warn: 'diamond', ok: 'circle', neutral: 'circle' };
const TONE_WORD: Record<MapTone, string> = { alert: 'critical', warn: 'needs attention', ok: 'normal', neutral: 'no status' };
const fmt = (v: number) => v.toLocaleString('en', { maximumFractionDigits: 1 });

function Marker({ x, y, tone, r }: { x: number; y: number; tone: MapTone; r: number }) {
  const c = STATUS[tone];
  const shape = TONE_SHAPE[tone];
  const common = { fill: c, fillOpacity: 0.85, stroke: 'rgb(var(--c-bg))', strokeWidth: 1.2 };
  if (shape === 'triangle') return <path d={`M ${x} ${y - r * 1.15} L ${x + r} ${y + r * 0.75} L ${x - r} ${y + r * 0.75} Z`} {...common} />;
  if (shape === 'diamond') return <path d={`M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`} {...common} />;
  return <circle cx={x} cy={y} r={r * 0.85} {...common} />;
}

/** A five-pointed star centred on (x, y): the conventional capital symbol. */
function star(x: number, y: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

export interface OverlayContext {
  width: number;
  height: number;
  capital: { x: number; y: number } | null;
  project: (lng: number, lat: number) => [number, number] | null;
  /** Every drawn unit's label point, in official order. */
  units: { name: string; code?: string; x: number; y: number; value?: number }[];
}

export function NationMap({
  title, values = [], kind, source, valueLabel = 'Value', unit = '', points, pointsLabel = 'Located items',
  asOf, maxHeight = 520, minHeight = 220, selected, onSelect, emptyNote, iso3: isoOverride, regions: regionsOverride, compact = false, overlay, variant = 'standard', heat = false, hud, frameHeight, insetEnd, insetBottom, colourOf, actions, inMap,
}: {
  /** What the map shows, e.g. "Open incidents by county"; used for the accessible name and the table caption. */
  title: string;
  values?: MapValue[];
  /** Where the figures come from (observed, reported, modelled, sample, unavailable). */
  kind: SignalKind;
  /** Plain description of the figures' source, e.g. "Regional model (sample)". */
  source?: string;
  valueLabel?: string;
  unit?: string;
  points?: MapPoint[];
  pointsLabel?: string;
  asOf?: string;
  maxHeight?: number;
  minHeight?: number;
  selected?: string;
  onSelect?: (unit: { name: string; code?: string }) => void;
  /** Shown under the map when no figure is shown yet (e.g. how to connect a source). */
  emptyNote?: React.ReactNode;
  iso3?: string;
  regions?: readonly string[];
  /** Smaller furniture for dense panels (the table view stays). */
  compact?: boolean;
  /**
   * Extra layers a page draws over the whole-nation view (e.g. the Situation
   * Room's institutions and their knock-on links), placed with the map's own
   * projection. Not drawn while a unit is opened.
   */
  overlay?: (map: OverlayContext) => React.ReactNode;
  /**
   * 'theatre' draws the map as a command theatre (the Situation Room): the
   * page's own frame shows through, units glow by their figure, a live
   * coordinate readout follows the pointer. 'standard' everywhere else.
   */
  variant?: 'standard' | 'theatre';
  /** Theatre only: stronger shading (the "heat intensity" control). */
  heat?: boolean;
  /** Controls drawn on the map itself (top left), e.g. the theatre's control stack. */
  hud?: React.ReactNode;
  /** Theatre only: the frame's height; the nation is fitted inside it and the neighbouring countries drawn around it. */
  frameHeight?: number;
  /** Theatre only: room kept free at the end of the frame for panels laid over the map. */
  insetEnd?: number;
  /** A colour for a figure instead of the shading classes (the theatre colours units by status); the page then gives the legend. */
  colourOf?: (v: MapValue) => string;
  /** Controls placed in the map's header (e.g. the theatre's layers and full screen). */
  actions?: React.ReactNode;
  /** Theatre only: room kept free at the bottom of the frame for panels laid over the map. */
  insetBottom?: number;
  /** Panels laid over the bottom of the map itself (the theatre's legend and operating strip). */
  inMap?: React.ReactNode;
}) {
  const iso3 = isoOverride ?? nationIso3();
  const regionsKey = (regionsOverride ?? nationRegions()).join('|');
  const [geo, setGeo] = React.useState<NationGeography | null | undefined>(undefined);
  const [nationGeo, setNationGeo] = React.useState<NationGeography | null>(null);
  const [opened, setOpened] = React.useState<{ name: string; code?: string } | null>(null);
  const [openNote, setOpenNote] = React.useState('');
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(640);
  const [view, setView] = React.useState<'map' | 'table'>('map');
  const [focus, setFocus] = React.useState(0);
  const [active, setActive] = React.useState<number | null>(null);
  const pathRefs = React.useRef<(SVGPathElement | null)[]>([]);
  const theatre = variant === 'theatre';
  const [cursor, setCursor] = React.useState<[number, number] | null>(null);
  const uid = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    if (!iso3) { setGeo(null); return; }
    let live = true;
    setGeo(undefined);
    const load = opened ? loadUnitGeography(iso3, opened) : loadNationGeography(iso3, regionsKey ? regionsKey.split('|') : []);
    load.then(g => {
      if (!live) return;
      if (opened && !g) { setOpenNote(`No shapes are recorded beneath ${opened.name}.`); setOpened(null); return; }
      setGeo(g);
      if (!opened) setNationGeo(g);
    });
    return () => { live = false; };
  }, [iso3, regionsKey, opened]);
  React.useEffect(() => { setOpened(null); }, [iso3, regionsKey]);
  const open = (u: { name: string; code?: string } | null) => { setOpenNote(''); setActive(null); setFocus(0); setOpened(u); };
  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(200, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const capital = nationCapital();
  const projection = nationProjection();
  // Located items are counted by the nation's regions, so they show on the whole-nation view only.
  const frame = theatre && frameHeight ? { height: frameHeight, insetEnd, insetBottom } : undefined;
  const model = React.useMemo(() => (geo ? buildMapModel(geo, { width: W, maxHeight, minHeight, values, points: geo.parent ? undefined : points, projection, capital, frame }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo, W, maxHeight, minHeight, values, points, projection, capital?.name, capital?.lng, capital?.lat, frame?.height, frame?.insetEnd, frame?.insetBottom]);
  // The theatre draws the neighbouring countries around the nation (Natural Earth 1:50m).
  const [world, setWorld] = React.useState<WorldModel | null>(null);
  React.useEffect(() => {
    if (!theatre) return;
    let live = true;
    void loadWorld().then(w => { if (live) setWorld(w); });
    return () => { live = false; };
  }, [theatre]);
  const worldPaths = React.useMemo(() => {
    if (!world || !model || !frame) return [];
    const home = capital ? nationIndex(world, [capital.lng, capital.lat]) : -1;
    return world.countries.map((c, i) => {
      // Label a neighbour at its centre, or at the middle of the part of it inside the frame.
      const at = i === home ? null : (() => {
        const [lng, lat] = geoCentroid({ type: 'Feature', properties: {}, geometry: c.geometry } as never);
        const p = model.project(lng, lat);
        if (p) return p;
        const [[x0, y0], [x1, y1]] = model.boundsOf(c.geometry);
        const cx0 = Math.max(0, x0), cx1 = Math.min(model.width, x1), cy0 = Math.max(0, y0), cy1 = Math.min(model.height, y1);
        return cx1 - cx0 > 70 && cy1 - cy0 > 40 ? [(cx0 + cx1) / 2, (cy0 + cy1) / 2] as [number, number] : null;
      })();
      return { d: model.pathOf(c.geometry), name: c.name, at, home: i === home };
    }).filter(w => w.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, model, frame?.height, capital?.lng, capital?.lat]);
  const openable = (nationGeo?.units ?? []).filter(u => u.drill && u.code && u.geometry);
  // The opened unit's own figure, from the figures the page passed for the nation's units.
  const parentValue = opened ? values.find(v => v.key === opened.code) ?? values.find(v => nameKeys(v.key).some(k => nameKeys(opened.name).includes(k))) : undefined;
  const marked = needsMarker(kind);
  const shown = model?.units.filter(u => u.value).length ?? 0;
  const drawn = model?.units.map((u, i) => ({ u, i })).filter(x => x.u.d) ?? [];
  const noun = geo?.noun ?? 'region';
  const plural = (n: number) => (n === 1 ? noun : `${noun}${/s$/.test(noun) ? '' : 's'}`.replace(/ys$/, 'ies'));
  const activeUnit = active != null ? model?.units[active] : null;
  const top = model ? [...model.units].filter(u => u.value).sort((a, b) => b.value!.value - a.value!.value)[0] : undefined;
  const summary = model
    ? `${title}: ${shown} of ${model.units.length} ${plural(model.units.length)} have a figure${top ? `; highest ${top.name}, ${fmt(top.value!.value)}${unit ? ` ${unit}` : ''}` : ''}${marked ? ` (${SIGNAL_LABEL[kind].toLowerCase()})` : ''}.`
    : title;

  const moveFocus = (to: number) => {
    if (!drawn.length) return;
    const k = (to + drawn.length) % drawn.length;
    setFocus(k);
    pathRefs.current[drawn[k]!.i]?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in keys) { e.preventDefault(); moveFocus(focus + keys[e.key]!); }
    else if (e.key === 'Home') { e.preventDefault(); moveFocus(0); }
    else if (e.key === 'End') { e.preventDefault(); moveFocus(drawn.length - 1); }
  };

  if (iso3 == null) return <p className="p-3 text-[13px] text-ink-soft">Set the nation&rsquo;s country in setup to draw its map.</p>;
  const btn = (v: 'map' | 'table', label: string) => (
    <button type="button" aria-pressed={view === v} onClick={() => setView(v)}
      className={`focus-ring rounded-[3px] border px-2 py-0.5 text-[11px] ${view === v ? 'border-ink text-ink' : 'border-line text-ink-muted hover:text-ink'}`}>{label}</button>
  );
  const hatch = `hatch-${uid}`;

  return (
    <figure className={`min-w-0 space-y-1.5 ${theatre ? 'relative' : ''}`} aria-label={title}>
      <div className={theatre ? `absolute ${hud ? 'start-12' : 'start-2'} end-2 top-2 z-20 flex flex-wrap items-center justify-between gap-2` : 'flex flex-wrap items-center justify-between gap-2'}>
        <figcaption className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {title}<SignalTag kind={kind} source={source} />
        </figcaption>
        <div className="flex flex-wrap items-center gap-1">
          {opened ? (
            <button type="button" onClick={() => open(null)}
              className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[11px] text-ink-soft hover:text-ink">Back to {nationGeo?.name ?? 'the nation'}</button>
          ) : null}
          {openable.length ? (
            <label className="flex items-center gap-1 text-[11px] text-ink-muted">
              <span className="sr-only">Open a {nationGeo?.noun ?? 'region'} to see the units beneath it</span>
              <select value={opened?.code ?? ''} onChange={e => { const u = openable.find(x => x.code === e.currentTarget.value); open(u ? { name: u.name, code: u.code } : null); }}
                className="focus-ring max-w-[11rem] rounded-[3px] border border-line bg-surface px-1.5 py-0.5 text-[11px] text-ink-soft">
                <option value="">{opened ? 'Whole nation' : `Open a ${nationGeo?.noun ?? 'region'}…`}</option>
                {openable.map(u => <option key={u.code} value={u.code}>{u.name}</option>)}
              </select>
            </label>
          ) : null}
          <div className="flex gap-1" role="group" aria-label="Show as">{btn('map', 'Map')}{btn('table', 'Table')}</div>
          {actions}
        </div>
      </div>
      {opened && geo?.parent ? (
        <p className="text-[11px] text-ink-soft" role="status">
          {opened.name}: {geo.units.length} {plural(geo.units.length)}
          {parentValue ? <> · {valueLabel} for {opened.name}: <strong className="text-ink">{fmt(parentValue.value)}</strong>{parentValue.unit ?? unit ? ` ${parentValue.unit ?? unit}` : ''}{marked ? ` (${SIGNAL_LABEL[kind].toLowerCase()})` : ''}</> : null}
          {' · '}{plural(2)} are shaded only where a figure is recorded for each
        </p>
      ) : null}
      {openNote ? <p className="text-[11px] text-ink-muted" role="status">{openNote}</p> : null}

      <div ref={wrap} className={view === 'map' ? 'relative w-full' : 'hidden'}>
        {geo === undefined ? <p className="p-3 text-[13px] text-ink-soft" style={{ minHeight }}>Loading the nation&rsquo;s boundaries…</p>
          : geo === null || !model ? <p className="p-3 text-[13px] text-ink-soft">No boundaries are available for this country yet.</p> : (
          <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} className="block max-w-full"
            role="group" aria-roledescription="map" aria-label={summary} onKeyDown={onKey}
            onMouseMove={theatre ? e => { const r = e.currentTarget.getBoundingClientRect(); setCursor(model.invert(((e.clientX - r.left) / r.width) * model.width, ((e.clientY - r.top) / r.height) * model.height)); } : undefined}
            onMouseLeave={theatre ? () => setCursor(null) : undefined}>
            <defs>
              <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--c-bg))" strokeWidth="2" strokeOpacity="0.55" />
              </pattern>
            </defs>
            <rect width={model.width} height={model.height} fill={theatre ? 'transparent' : 'rgb(var(--c-bg))'} />
            {worldPaths.map((w, i) => w.home ? null : <path key={`w${i}`} d={w.d} fill="rgb(var(--c-ink-muted))" fillOpacity={0.1} stroke="rgb(var(--c-ink-soft))" strokeOpacity={0.45} strokeWidth={0.9} aria-hidden pointerEvents="none" />)}
            {worldPaths.map((w, i) => w.at && w.at[0] > 30 && w.at[0] < model.width - 30 && w.at[1] > 50 && w.at[1] < model.height - 24 ? (
              <text key={`wl${i}`} x={w.at[0]} y={w.at[1]} textAnchor="middle" fontSize="9" letterSpacing="2" fill="rgb(var(--c-ink-muted))" opacity={0.75} aria-hidden pointerEvents="none">{w.name.toUpperCase()}</text>
            ) : null)}
            {model.context.map((d, i) => <path key={`c${i}`} d={d} fill="rgb(var(--c-surface-2))" fillOpacity={0.35} stroke="rgb(var(--c-line))" strokeWidth={0.4} aria-hidden />)}
            {model.frames.map((f, i) => <rect key={`f${i}`} x={f.x} y={f.y} width={f.w} height={f.h} fill="none" stroke="rgb(var(--c-line))" strokeDasharray="3 2" aria-hidden />)}
            {drawn.map(({ u, i }, k) => {
              const fill = u.value ? (colourOf ? colourOf(u.value) : classColour(u.cls ?? 0)) : 'rgb(var(--c-surface-2))';
              const fillOpacity = theatre ? (u.value ? (heat ? 0.7 : 0.34) : 0.3) : u.value ? 0.9 : 0.55;
              const on = active === i || selected === u.name || selected === u.code;
              const label = `${u.name}${u.value ? `: ${fmt(u.value.value)}${u.value.unit ?? unit ? ` ${u.value.unit ?? unit}` : ''}${marked ? ` (${SIGNAL_LABEL[kind].toLowerCase()})` : ''}` : ': no figure'}`;
              return (
                <g key={`${u.code ?? u.name}-${i}`}>
                  <path ref={el => { pathRefs.current[i] = el; }} d={u.d} fill={fill} fillOpacity={fillOpacity}
                    stroke={on ? 'rgb(var(--c-ink))' : theatre ? fill : u.value ? 'rgb(var(--c-bg))' : 'rgb(var(--c-ink-muted))'} strokeWidth={on ? 2 : theatre ? 1 : 0.7} strokeOpacity={theatre && !on ? 0.85 : 1}
                    tabIndex={k === focus ? 0 : -1} role="button" aria-label={label} aria-pressed={onSelect ? on : undefined}
                    className="cursor-pointer outline-none focus-visible:[stroke:rgb(var(--c-ink))] focus-visible:[stroke-width:2.5]"
                    onFocus={() => { setFocus(k); setActive(i); }} onBlur={() => setActive(a => (a === i ? null : a))}
                    onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(a => (a === i ? null : a))}
                    onClick={() => onSelect?.({ name: u.name, code: u.code })}
                    onDoubleClick={() => { const n = nationGeo?.units.find(x => x.code === u.code && x.drill); if (!opened && n) open({ name: n.name, code: n.code }); }}
                    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onSelect) { e.preventDefault(); onSelect({ name: u.name, code: u.code }); } }} />
                  {u.value && marked ? <path d={u.d} fill={`url(#${hatch})`} opacity={theatre ? 0.22 : 1} pointerEvents="none" aria-hidden /> : null}
                </g>
              );
            })}
            {model.points.filter(p => p.tone === 'alert').map((p, i) => (
              <circle key={`ring${i}`} cx={p.x} cy={p.y} r={14} fill="none" stroke={STATUS.alert} strokeWidth={1.1} aria-hidden pointerEvents="none"
                className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            ))}
            {model.points.map((p, i) => (
              <g key={`p${i}`} aria-hidden pointerEvents="none">
                <Marker x={p.x} y={p.y} tone={p.tone} r={Math.min(13, 5 + Math.sqrt(p.count ?? 1) * 2)} />
                {p.count && p.count > 1 ? <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgb(var(--c-bg))">{p.count}</text> : null}
              </g>
            ))}
            {overlay && !geo.parent ? overlay({
              width: model.width, height: model.height, capital: model.capital, project: model.project,
              units: model.units.flatMap(u => (u.cx != null && u.cy != null ? [{ name: u.name, code: u.code, x: u.cx, y: u.cy, value: u.value?.value }] : [])),
            }) : null}
            {model.capital ? (
              <g pointerEvents="none" aria-hidden>
                <path d={star(model.capital.x, model.capital.y, 6)} fill="rgb(var(--c-ink))" stroke="rgb(var(--c-bg))" strokeWidth={1.2} />
                {!compact ? <text x={model.capital.x + 8} y={model.capital.y + 3} fontSize="10" fontWeight="600" fill="rgb(var(--c-ink))" stroke="rgb(var(--c-bg))" strokeWidth={2.5} paintOrder="stroke">{model.capital.name}</text> : null}
              </g>
            ) : null}
            {!compact ? (
              <g aria-hidden transform={`translate(${model.width - 24},${22})`}>
                <path d="M 0 -12 L 5 4 L 0 1 L -5 4 Z" fill="rgb(var(--c-ink-soft))" />
                <text y="16" textAnchor="middle" fontSize="9" fill="rgb(var(--c-ink-muted))">N</text>
              </g>
            ) : null}
            {model.scale ? (
              <g aria-hidden transform={`translate(12,${model.height - 14})`}>
                <rect width={model.scale.px} height="4" fill="rgb(var(--c-ink-soft))" />
                <rect width={model.scale.px / 2} height="4" fill="rgb(var(--c-bg))" stroke="rgb(var(--c-ink-soft))" strokeWidth="0.6" />
                <text y="-4" fontSize="9" fill="rgb(var(--c-ink-muted))">0</text>
                <text x={model.scale.px} y="-4" textAnchor="end" fontSize="9" fill="rgb(var(--c-ink-muted))">{model.scale.km.toLocaleString('en')} km</text>
              </g>
            ) : null}
          </svg>
        )}
        {hud && model ? <div className="absolute start-2 top-2 z-10 flex flex-col gap-1">{hud}</div> : null}
        {inMap && model && !geo?.parent ? <div className="absolute inset-x-0 bottom-0 z-10">{inMap}</div> : null}
        {theatre && model ? (
          <div className={`pointer-events-none absolute ${inMap ? 'bottom-[118px] end-2' : 'bottom-1 end-2'} font-mono text-[10px] tracking-[0.12em] text-ink-muted`} aria-hidden>
            {cursor ? `${Math.abs(cursor[1]).toFixed(3)}°${cursor[1] >= 0 ? 'N' : 'S'} ${Math.abs(cursor[0]).toFixed(3)}°${cursor[0] >= 0 ? 'E' : 'W'}` : `${model.kind.replace(/-/g, ' ').toUpperCase()}`}
          </div>
        ) : null}
        {activeUnit ? (
          <div className={`pointer-events-none absolute ${hud ? 'start-12' : 'start-2'} top-2 max-w-[70%] rounded-[3px] border border-line bg-surface px-2 py-1 text-[12px] shadow`} role="status">
            <strong>{activeUnit.name}</strong>{activeUnit.code ? <span className="text-ink-muted"> · {activeUnit.code}</span> : null}
            <div>{activeUnit.value ? <>{valueLabel}: <strong>{fmt(activeUnit.value.value)}</strong> {activeUnit.value.unit ?? unit}{activeUnit.value.asOf ? <span className="text-ink-muted"> · as of {activeUnit.value.asOf}</span> : null}{activeUnit.value.note ? <div className="text-ink-muted">{activeUnit.value.note}</div> : null}</> : <span className="text-ink-muted">no figure</span>}</div>
            {model?.points.filter(p => p.unit === activeUnit.name).map((p, i) => <div key={i}>{p.label}{p.count ? `: ${p.count}` : ''} <span className="text-ink-muted">({TONE_WORD[p.tone]})</span></div>)}
          </div>
        ) : null}
      </div>

      {view === 'table' && model ? (
        <div className="max-h-[420px] overflow-auto rounded-[3px] border border-line">
          <table className="w-full text-[12px]">
            <caption className="sr-only">{summary}</caption>
            <thead><tr className="border-b border-line text-ink-muted">
              <th className="px-2 py-1 text-start font-semibold capitalize">{noun}</th><th className="text-start font-semibold">Code</th>
              <th className="text-end font-semibold">{valueLabel}{unit ? ` (${unit})` : ''}</th>
              {model.points.length ? <th className="text-start font-semibold">{pointsLabel}</th> : null}
              <th className="pe-2 text-start font-semibold">As of</th>
            </tr></thead>
            <tbody>
              {model.units.map((u, i) => (
                <tr key={`${u.code ?? u.name}-${i}`} className="border-b border-line-soft">
                  <td className="px-2 py-1">{u.name}{u.d ? '' : <span className="text-ink-muted"> (no shape)</span>}</td>
                  <td className="font-mono text-ink-muted">{u.code ?? '—'}</td>
                  <td className="text-end tabular-nums">{u.value ? fmt(u.value.value) : '—'}</td>
                  {model.points.length ? <td>{model.points.filter(p => p.unit === u.name).map(p => `${p.label}${p.count ? ` ${p.count}` : ''}`).join(', ') || '—'}</td> : null}
                  <td className="pe-2 text-ink-muted">{u.value?.asOf ?? asOf ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {model ? (
        <div className="space-y-1 text-[11px] text-ink-soft">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {model.classes.legend.length && !colourOf ? (
              <span className="flex flex-wrap items-center gap-1" aria-label={`Legend: ${valueLabel}`}>
                {model.classes.legend.map((l, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <svg width="18" height="10" aria-hidden><rect width="18" height="10" fill={l.colour} />{marked ? <rect width="18" height="10" fill={`url(#${hatch})`} /> : null}</svg>
                    <span className="tabular-nums">{l.from === l.to ? fmt(l.from) : `${fmt(l.from)}–${fmt(l.to)}`}</span>
                  </span>
                ))}
                {unit ? <span>{unit}</span> : null}
              </span>
            ) : null}
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-4 border border-line bg-surface-2/40" aria-hidden /> no figure</span>
            {model.points.length ? (
              <span className="flex items-center gap-2">
                {(['alert', 'warn', 'ok'] as MapTone[]).filter(t => model.points.some(p => p.tone === t)).map(t => (
                  <span key={t} className="flex items-center gap-1"><svg width="12" height="12" aria-hidden><Marker x={6} y={6.5} tone={t} r={5} /></svg>{TONE_WORD[t]}</span>
                ))}
              </span>
            ) : null}
            {model.capital ? (
              <span className="flex items-center gap-1"><svg width="12" height="12" aria-hidden><path d={star(6, 6.5, 5)} fill="rgb(var(--c-ink))" /></svg>
                Capital: {model.capital.name}{model.capital.chosen ? '' : ' (from the map data; confirm in setup)'}</span>
            ) : null}
            <span>{shown} of {model.units.length} {plural(model.units.length)} with a figure{marked ? ` · ${SIGNAL_LABEL[kind].toLowerCase()}, hatched` : ''}</span>
          </div>
          {shown === 0 && emptyNote ? <div className="text-ink-muted">{emptyNote}</div> : null}
          {model.unmatched.length ? <div className="text-warn">Not placed on the map (name not found among the {plural(2)}): {model.unmatched.slice(0, 8).join(', ')}{model.unmatched.length > 8 ? ` and ${model.unmatched.length - 8} more` : ''}</div> : null}
          <div className="text-[10px] text-ink-muted">
            Boundaries: {geo?.credit}{source ? ` · Figures: ${source}` : ''}{asOf ? ` · As of ${asOf}` : ''}
          </div>
        </div>
      ) : null}
    </figure>
  );
}
