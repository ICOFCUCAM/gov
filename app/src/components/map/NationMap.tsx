'use client';

// The one map component every console page uses (map plan phase 1). It draws
// the installed nation's own units in their real shapes (lib/map), shades
// them by the figures a page passes in, and adds what a map needs to be read
// and trusted: a legend, scale bar, north arrow, the source of the boundaries
// and of the figures, an "as of" date, and a table of every unit in official
// order. Figures that are not observed or reported are hatched and carry the
// source marker; a unit with no figure stays blank and says so. Units are
// reachable by keyboard (arrow keys in official order, Enter selects).

import * as React from 'react';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadNationGeography, type NationGeography } from '@/lib/map/geography';
import { buildMapModel, type MapPoint, type MapTone, type MapValue } from '@/lib/map/model';
import { classColour } from '@/lib/map/classify';
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

export function NationMap({
  title, values = [], kind, source, valueLabel = 'Value', unit = '', points, pointsLabel = 'Located items',
  asOf, maxHeight = 520, minHeight = 220, selected, onSelect, emptyNote, iso3: isoOverride, regions: regionsOverride, compact = false,
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
}) {
  const iso3 = isoOverride ?? nationIso3();
  const regionsKey = (regionsOverride ?? nationRegions()).join('|');
  const [geo, setGeo] = React.useState<NationGeography | null | undefined>(undefined);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(640);
  const [view, setView] = React.useState<'map' | 'table'>('map');
  const [focus, setFocus] = React.useState(0);
  const [active, setActive] = React.useState<number | null>(null);
  const pathRefs = React.useRef<(SVGPathElement | null)[]>([]);
  const uid = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    if (!iso3) { setGeo(null); return; }
    let live = true;
    setGeo(undefined);
    loadNationGeography(iso3, regionsKey ? regionsKey.split('|') : []).then(g => { if (live) setGeo(g); });
    return () => { live = false; };
  }, [iso3, regionsKey]);
  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(200, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const model = React.useMemo(() => (geo ? buildMapModel(geo, { width: W, maxHeight, minHeight, values, points }) : null), [geo, W, maxHeight, minHeight, values, points]);
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
    <figure className="min-w-0 space-y-1.5" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {title}<SignalTag kind={kind} source={source} />
        </figcaption>
        <div className="flex gap-1" role="group" aria-label="Show as">{btn('map', 'Map')}{btn('table', 'Table')}</div>
      </div>

      <div ref={wrap} className={view === 'map' ? 'relative w-full' : 'hidden'}>
        {geo === undefined ? <p className="p-3 text-[13px] text-ink-soft" style={{ minHeight }}>Loading the nation&rsquo;s boundaries…</p>
          : geo === null || !model ? <p className="p-3 text-[13px] text-ink-soft">No boundaries are available for this country yet.</p> : (
          <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} className="block max-w-full"
            role="group" aria-roledescription="map" aria-label={summary} onKeyDown={onKey}>
            <defs>
              <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--c-bg))" strokeWidth="2" strokeOpacity="0.55" />
              </pattern>
            </defs>
            <rect width={model.width} height={model.height} fill="rgb(var(--c-bg))" />
            {model.context.map((d, i) => <path key={`c${i}`} d={d} fill="rgb(var(--c-surface-2))" fillOpacity={0.35} stroke="rgb(var(--c-line))" strokeWidth={0.4} aria-hidden />)}
            {model.frames.map((f, i) => <rect key={`f${i}`} x={f.x} y={f.y} width={f.w} height={f.h} fill="none" stroke="rgb(var(--c-line))" strokeDasharray="3 2" aria-hidden />)}
            {drawn.map(({ u, i }, k) => {
              const fill = u.value ? classColour(u.cls ?? 0) : 'rgb(var(--c-surface-2))';
              const on = active === i || selected === u.name || selected === u.code;
              const label = `${u.name}${u.value ? `: ${fmt(u.value.value)}${u.value.unit ?? unit ? ` ${u.value.unit ?? unit}` : ''}${marked ? ` (${SIGNAL_LABEL[kind].toLowerCase()})` : ''}` : ': no figure'}`;
              return (
                <g key={`${u.code ?? u.name}-${i}`}>
                  <path ref={el => { pathRefs.current[i] = el; }} d={u.d} fill={fill} fillOpacity={u.value ? 0.9 : 0.4}
                    stroke={on ? 'rgb(var(--c-ink))' : 'rgb(var(--c-bg))'} strokeWidth={on ? 2 : 0.7}
                    tabIndex={k === focus ? 0 : -1} role="button" aria-label={label} aria-pressed={onSelect ? on : undefined}
                    className="cursor-pointer outline-none focus-visible:[stroke:rgb(var(--c-ink))] focus-visible:[stroke-width:2.5]"
                    onFocus={() => { setFocus(k); setActive(i); }} onBlur={() => setActive(a => (a === i ? null : a))}
                    onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(a => (a === i ? null : a))}
                    onClick={() => onSelect?.({ name: u.name, code: u.code })}
                    onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onSelect) { e.preventDefault(); onSelect({ name: u.name, code: u.code }); } }} />
                  {u.value && marked ? <path d={u.d} fill={`url(#${hatch})`} pointerEvents="none" aria-hidden /> : null}
                </g>
              );
            })}
            {model.points.map((p, i) => (
              <g key={`p${i}`} aria-hidden pointerEvents="none">
                <Marker x={p.x} y={p.y} tone={p.tone} r={Math.min(13, 5 + Math.sqrt(p.count ?? 1) * 2)} />
                {p.count && p.count > 1 ? <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgb(var(--c-bg))">{p.count}</text> : null}
              </g>
            ))}
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
        {activeUnit ? (
          <div className="pointer-events-none absolute start-2 top-2 max-w-[70%] rounded-[3px] border border-line bg-surface px-2 py-1 text-[12px] shadow" role="status">
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
            {model.classes.legend.length ? (
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
