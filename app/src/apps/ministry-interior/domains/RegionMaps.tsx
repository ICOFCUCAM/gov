'use client';

// Ministry maps on the nation's real geography (map plan phase 5) for the
// interior, municipal and treasury apps. Built on the shared engine
// (components/map/NationMap): the nation's own regions in their real shapes,
// each coloured by the page's figure through the page's own status bands
// (`colourOf`), so the legend the page already shows stays true. Over that,
// what a command map adds: glows and pulses over regions under pressure,
// markers by region (examples until the ministry registers its sites; the
// national facility register's sites replace them kind by kind), flows
// between regions or to the capital, and short labels. Every figure carries
// its source marker; nothing invented is shown as the nation's.
//
// MinistryMap (components/map/MinistryMap.tsx) shades with the sequential
// ramp only; these panels keep categorical status legends, so they use the
// engine directly with the same overlay language.

import * as React from 'react';
import { geoArea, geoContains } from 'd3-geo';
import { NationMap, type MapPoint, type MapValue, type OverlayContext } from '@/components/map/NationMap';
import { loadNationGeography } from '@/lib/map/geography';
import { nameKeys } from '@/lib/map/names';
import { nationCapital, nationIso3, nationRegions } from '@/lib/nation/registry';
import { SignalTag } from '@/components/ui/SignalTag';
import { LIGHT } from '@/lib/theme/tokens';
import { SIGNAL_LABEL, needsMarker, type SignalKind } from '@/lib/twin/signal';
import { seed } from '@/lib/telemetry';

export type { MapValue };

/** One of the nation's regions as its map draws it (its region list, else its official subdivisions). */
export interface NationUnit { name: string; code?: string; areaKm2?: number; capital: boolean; lng?: number; lat?: number }

const EARTH_KM = 6371.0088;
const feature = (g: unknown) => ({ type: 'Feature', properties: {}, geometry: g }) as never;

export interface NationGeo { units: NationUnit[]; credit: string; noun: string; plural: string }

/**
 * The nation's regions in official order, read at use (setup can change them
 * at runtime), with the boundaries' credit and the nation's word for a region.
 * Null while the boundaries load; no units when no nation is set.
 */
export function useNationGeo(): NationGeo | null {
  const iso3 = nationIso3();
  const regionsKey = nationRegions().join('|');
  const [geo, setGeo] = React.useState<NationGeo | null>(null);
  React.useEffect(() => {
    if (!iso3) { setGeo({ units: [], credit: '', noun: 'region', plural: 'regions' }); return; }
    let live = true;
    void loadNationGeography(iso3, regionsKey ? regionsKey.split('|') : []).then(g => {
      if (!live) return;
      const cap = nationCapital();
      const noun = g?.noun ?? 'region';
      setGeo({
        credit: g?.credit ?? '', noun, plural: `${noun}${/s$/.test(noun) ? '' : 's'}`.replace(/ys$/, 'ies'),
        units: (g?.units ?? []).map(u => {
          let sr = u.geometry ? geoArea(feature(u.geometry)) : undefined;
          if (sr != null && sr > 2 * Math.PI) sr = 4 * Math.PI - sr; // ring wound the other way
          return {
            name: u.name, ...(u.code ? { code: u.code } : {}),
            ...(sr != null ? { areaKm2: sr * EARTH_KM * EARTH_KM } : {}),
            capital: !!(cap && u.geometry && geoContains(feature(u.geometry), [cap.lng, cap.lat])),
            ...(u.lng != null ? { lng: u.lng, lat: u.lat } : {}),
          };
        }),
      });
    }).catch(() => { if (live) setGeo({ units: [], credit: '', noun: 'region', plural: 'regions' }); });
    return () => { live = false; };
  }, [iso3, regionsKey]);
  return geo;
}

/** The nation's regions (see useNationGeo); null while loading. */
export function useNationUnits(): NationUnit[] | null {
  return useNationGeo()?.units ?? null;
}

/** A 0–1 pressure for a region that drifts over time and stays low for most regions (a few run hot). */
export const skewed = (w01: number, power = 1.5) => Math.pow(Math.max(0, Math.min(1, w01)), power);

/** A figure per region from an engine's rows when they name the region, else a sample seeded by the region's own name. */
export function perUnit<T extends { region: string }>(units: NationUnit[], rows: readonly T[], pick: (r: T) => number, sampleOf: (u: NationUnit, i: number) => number): { values: MapValue[]; fromEngine: number } {
  const byKey = new Map<string, T>();
  for (const r of rows) for (const k of nameKeys(r.region)) if (!byKey.has(k)) byKey.set(k, r);
  let fromEngine = 0;
  const values = units.map((u, i) => {
    const row = nameKeys(u.name).map(k => byKey.get(k)).find(Boolean);
    if (row) fromEngine++;
    return { key: u.name, value: row ? pick(row) : sampleOf(u, i) };
  });
  return { values, fromEngine };
}

/** The maps' clock: the page's telemetry time held for about half a minute, so region figures (and the map) change in steps. */
export const mapClock = (ts: number) => Math.floor(ts / 8) * 8;

/** A deterministic 0–1 number for a region and a key (spreads samples over real regions). */
export const unitSeed = (key: string, u: NationUnit) => seed(`${key}:${u.code ?? u.name}`);

interface RegisteredSite { id: string; name: string; category: string; location: { lng: number; lat: number }; certification: { state: string }; generalised?: boolean }

/** Sites of the given register categories from the national facility register, drawn where they are. */
export function useRegisteredSites(categories: string[]): { points: MapPoint[]; categories: Set<string> } {
  const [sites, setSites] = React.useState<RegisteredSite[]>([]);
  const [glyphs, setGlyphs] = React.useState<Record<string, string>>({});
  const key = categories.join(',');
  React.useEffect(() => {
    if (!key) return;
    let live = true;
    fetch('/api/facilities').then(r => (r.ok ? r.json() : null)).then((j: { sites?: RegisteredSite[]; categories?: { key: string; glyph: string }[] } | null) => {
      if (!live || !j?.sites) return;
      const want = new Set(key.split(','));
      setSites(j.sites.filter(s => want.has(s.category)));
      setGlyphs(Object.fromEntries((j.categories ?? []).map(c => [c.key, c.glyph])));
    }).catch(() => undefined);
    return () => { live = false; };
  }, [key]);
  return React.useMemo(() => ({
    points: sites.map(s => ({
      key: s.id, label: `${s.name}${s.certification.state === 'certified' ? '' : ' (location awaiting certification)'}${s.generalised ? ' · position generalised' : ''}`,
      tone: s.certification.state === 'certified' ? 'ok' as const : 'warn' as const, lng: s.location.lng, lat: s.location.lat, glyph: glyphs[s.category] ?? '●', href: `/gov/sites#${s.id}`,
    })),
    categories: new Set(sites.map(s => s.category)),
  }), [sites, glyphs]);
}

/** Glow over a region: `r` 0–1 scales it; `pulse` adds a diffusing ring (critical). */
export interface RegionGlow { region: string; colour: string; r: number; pulse?: boolean }
/** A marker in a region (a sample until the register holds sites of its kind). */
export interface RegionMarker { region: string; glyph: string; colour: string; label: string; count?: number; pulse?: boolean; dx?: number; dy?: number }
/** Movement between regions (or 'capital'); weight 0–1. */
export interface RegionFlow { from: string; to: string; colour: string; weight: number; label: string }
export interface RegionLabel { region: string; text: string; colour: string; ink?: string }
/** A node at a region's centre (r in px), with a soft halo. */
export interface RegionDot { region: string; colour: string; r: number; label?: string }

const LIGHT_VARS = LIGHT as unknown as React.CSSProperties;

export function RegionMap({
  title, values, kind, source, valueLabel = 'Value', unit = '', colourOf, theatre = false, ground, heat = true, compact = true,
  maxHeight = 320, minHeight = 160, selected, onSelect, hideCaption = false, small = false, glows = [], markers = [], flows = [], labels = [], dots = [],
  points, emptyNote, flowsMove = true, className = '',
}: {
  title: string;
  values: MapValue[];
  kind: SignalKind;
  source?: string;
  valueLabel?: string;
  unit?: string;
  /** The page's colour for a figure (its legend's bands). */
  colourOf: (v: MapValue) => string;
  theatre?: boolean;
  /** 'light' for the white-card pages: the map takes the light ground's colours. */
  ground?: 'light';
  heat?: boolean;
  compact?: boolean;
  maxHeight?: number;
  minHeight?: number;
  selected?: string;
  onSelect?: (u: { name: string; code?: string }) => void;
  /** The page shows the title (and the source marker, via MapCaption) itself. */
  hideCaption?: boolean;
  /** Smaller furniture for the dense command grids. */
  small?: boolean;
  glows?: RegionGlow[];
  markers?: RegionMarker[];
  flows?: RegionFlow[];
  labels?: RegionLabel[];
  dots?: RegionDot[];
  points?: MapPoint[];
  emptyNote?: React.ReactNode;
  flowsMove?: boolean;
  className?: string;
}) {
  const uid = React.useId().replace(/:/g, '');
  // Figures recomputed on every tick keep their identity while unchanged, so the map is not rebuilt.
  const sig = values.map(v => `${v.key}=${v.value}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = React.useMemo(() => values, [sig]);
  const overlay = (ctx: OverlayContext) => {
    const at = new Map<string, { x: number; y: number }>();
    for (const u of ctx.units) { for (const k of nameKeys(u.name)) if (!at.has(k)) at.set(k, u); if (u.code) at.set(u.code.toLowerCase(), u); }
    const pos = (r: string) => (r === 'capital' ? ctx.capital : nameKeys(r).map(k => at.get(k)).find(Boolean) ?? at.get(r.toLowerCase()) ?? null);
    const spread = Math.max(7, Math.min(28, Math.sqrt((ctx.width * ctx.height) / Math.max(1, ctx.units.length)) * 0.42));
    const colours = [...new Set(glows.map(g => g.colour))];
    return (
      <g>
        <defs>
          {colours.map((c, i) => (
            <radialGradient key={c} id={`rg-${uid}-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c} stopOpacity={0.55} />
              <stop offset="55%" stopColor={c} stopOpacity={0.16} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        <g pointerEvents="none" aria-hidden>
          {glows.map((g, i) => {
            const p = pos(g.region); if (!p) return null;
            const r = spread * (0.9 + g.r * 1.3);
            return (
              <g key={`g${i}`}>
                <circle cx={p.x} cy={p.y} r={r} fill={`url(#rg-${uid}-${colours.indexOf(g.colour)})`} style={{ mixBlendMode: ground === 'light' ? 'multiply' : 'screen' }} />
                {g.pulse ? <circle cx={p.x} cy={p.y} r={spread * 0.75} fill="none" stroke={g.colour} strokeWidth={1.2} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
                {g.pulse ? <circle cx={p.x} cy={p.y} r={2.2} fill={g.colour} /> : null}
              </g>
            );
          })}
          {flows.map((f, i) => {
            const a = pos(f.from), b = pos(f.to); if (!a || !b || (a.x === b.x && a.y === b.y)) return null;
            const bend = Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.22);
            const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2 - bend).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
            const w = 0.7 + f.weight * 2.6;
            return (
              <g key={`f${i}`}>
                <path d={d} fill="none" stroke={f.colour} strokeWidth={w + 3} strokeOpacity={0.12} strokeLinecap="round" />
                <path d={d} fill="none" stroke={f.colour} strokeWidth={w} strokeOpacity={0.5 + f.weight * 0.45} strokeLinecap="round" strokeDasharray="4 4"
                  className={flowsMove ? 'motion-safe:animate-dash-flow' : undefined} />
                <circle cx={b.x} cy={b.y} r={1.2 + f.weight * 1.6} fill={f.colour} />
                <title>{f.label}</title>
              </g>
            );
          })}
        </g>
        <g>
          {dots.map((d, i) => {
            const p = pos(d.region); if (!p) return null;
            return (
              <g key={`d${i}`} pointerEvents="none" aria-hidden>
                <circle cx={p.x} cy={p.y} r={d.r * 2.4} fill={d.colour} fillOpacity={0.16} />
                <circle cx={p.x} cy={p.y} r={d.r} fill={d.colour} stroke="rgb(var(--c-surface))" strokeWidth={0.8} />
                {d.label ? <title>{d.label}</title> : null}
              </g>
            );
          })}
          {markers.map((m, i) => {
            const p = pos(m.region); if (!p) return null;
            const x = p.x + (m.dx ?? 0) * spread, y = p.y + (m.dy ?? -0.55) * spread;
            const s = small ? 5.5 : 7;
            return (
              <g key={`m${i}`} role="img" aria-label={`${m.label} (sample)`}>
                {m.pulse ? <circle cx={x} cy={y} r={s + 3} fill="none" stroke={m.colour} strokeWidth={1} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
                <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={2.5} fill="rgb(var(--c-surface-2))" fillOpacity={0.92} stroke={m.colour} strokeWidth={1} strokeDasharray="2 1.5" />
                <text x={x} y={y + s * 0.45} textAnchor="middle" fontSize={s * 1.25} fill={m.colour}>{m.glyph}</text>
                {m.count && m.count > 1 ? <text x={x + s + 1} y={y - s + 2} fontSize={small ? 7 : 8} fontWeight="700" fill="rgb(var(--c-ink-soft))">{m.count}</text> : null}
                <title>{`${m.label} (sample)`}</title>
              </g>
            );
          })}
          {labels.map((l, i) => {
            const q = pos(l.region); if (!q) return null;
            // Clear of the capital's star when the label sits on it.
            const p = ctx.capital && Math.hypot(ctx.capital.x - q.x, ctx.capital.y - q.y) < 12 ? { x: q.x, y: q.y - 14 } : q;
            const w = l.text.length * (small ? 4.6 : 5.4) + 8, h = small ? 11 : 13;
            return (
              <g key={`l${i}`} pointerEvents="none" aria-hidden>
                <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={h / 2} fill={l.colour} fillOpacity={0.92} />
                <text x={p.x} y={p.y + (small ? 3 : 3.5)} textAnchor="middle" fontSize={small ? 7.5 : 8.5} fontWeight="700" fill={l.ink ?? 'rgb(var(--c-bg))'}>{l.text}</text>
              </g>
            );
          })}
        </g>
      </g>
    );
  };
  const geo = useNationGeo();
  // Dense panels: the map's own controls shrink to the corner and its footer
  // becomes one line (count, source marker, capital, boundaries credit); the
  // table view and the full source stay one click / hover away.
  const furniture = [
    hideCaption ? '[&_figcaption]:sr-only [&_figure>div:first-child]:!justify-end' : '',
    small ? '[&_figure>div:last-child]:hidden [&_div.font-mono]:hidden [&_figure>div:first-child_label]:hidden [&_figure>div:first-child_button]:!text-[8.5px] [&_figure>div:first-child_button]:!px-1 [&_figure>div:first-child_button]:!py-0 [&_figure>div:first-child_button]:bg-[rgb(var(--c-bg)/0.7)]' : '',
  ].join(' ');
  const shown = values.length, capital = geo?.units.find(u => u.capital);
  return (
    // w-0 + min-w-full: the map takes its column's width and never widens the column.
    <div className={`w-0 min-w-full ${furniture} ${className}`} style={ground === 'light' ? LIGHT_VARS : undefined}>
      <NationMap title={title} values={stable} kind={kind} source={source} valueLabel={valueLabel} unit={unit} colourOf={colourOf}
        variant={theatre ? 'theatre' : 'standard'} heat={heat} compact={compact} maxHeight={maxHeight} minHeight={minHeight}
        selected={selected} onSelect={onSelect} points={points} pointsLabel="Registered sites" emptyNote={emptyNote} overlay={overlay} />
      {small && geo?.units.length ? (() => {
        const line = [`${shown} of ${geo.units.length} ${geo.plural}`, needsMarker(kind) ? `${SIGNAL_LABEL[kind].toLowerCase()}, hatched` : '', capital ? `★ ${capital.name}` : '', geo.credit ? `Boundaries: ${geo.credit}` : ''].filter(Boolean).join(' · ');
        return <div className="mt-0.5 truncate text-[7.5px] leading-[1.5] text-ink-muted" title={`${line}${source ? ` · Figures: ${source}` : ''}`}>{line}</div>;
      })() : null}
    </div>
  );
}

/** The page's own map heading with the figures' source marker (when the map's caption is hidden). */
export function MapCaption({ kind, source, children, className = '', style }: { kind: SignalKind; source?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`flex items-center gap-1.5 ${className}`} style={style}>{children}<SignalTag kind={kind} source={source} /></div>;
}
