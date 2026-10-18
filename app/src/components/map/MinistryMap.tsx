'use client';

// The map preset every ministry app uses (map plan phase 5). It draws the
// installed nation's own regions with the shared engine (NationMap), shaded by
// the ministry's regional figure, and adds what a ministry's map shows:
// - the ministry's registered sites from the national facility register,
//   where they are (the nation's own data, linked to their record);
// - example markers for kinds of site not registered yet — by region,
//   marked Sample, and dropped kind by kind as real sites are registered;
// - flows between regions or to the capital (routes, transfers, supply,
//   migration), with moving traffic;
// - hotspots: pressure glowing over the regions under strain.
// Every figure says where it comes from; nothing invented is shown as the
// nation's. The "theatre" look is for command screens.

import * as React from 'react';
import { NationMap, type MapPoint, type MapValue, type OverlayContext } from '@/components/map/NationMap';
import type { SignalKind } from '@/lib/twin/signal';
import { STATUS } from '@/lib/theme/tokens';
import { nameKeys } from '@/lib/map/names';

export type { MapValue };
export type Tone = 'ok' | 'warn' | 'alert' | 'neutral';

/** A kind of thing the ministry marks, by region, until real sites of its register category exist. */
export interface SampleMarker { region: string; label: string; tone: Tone; glyph: string; category?: string; count?: number }
/** Something moving between places: from a region (or "capital") to a region (or "capital"). */
export interface MapFlow { from: string; to: string; label: string; tone: Tone; weight?: number }
/** Pressure over a region (0–100). */
export interface Hotspot { region: string; intensity: number; label?: string }

interface RegisteredSite { id: string; name: string; category: string; location: { lng: number; lat: number }; certification: { state: string }; generalised?: boolean }

const keyOf = (s: string) => nameKeys(s)[0] ?? s.toLowerCase();

export function MinistryMap({
  title, values = [], kind, source, valueLabel = 'Value', unit = '', categories = [], samples = [], samplesSource,
  flows = [], flowsKind = 'sample', hotspots = [], theatre = false, maxHeight = 460, minHeight = 260, compact, emptyNote, selected, onSelect, extra,
}: {
  title: string;
  /** The ministry's figure by region (by name as the nation spells it, or ISO 3166-2 code). */
  values?: MapValue[];
  /** Where the regional figures come from. */
  kind: SignalKind;
  source?: string;
  valueLabel?: string;
  unit?: string;
  /** Facility register categories this ministry runs (e.g. ['police'], ['health']): its registered sites are drawn where they are. */
  categories?: string[];
  /** Example markers by region, until sites of their category are registered. */
  samples?: SampleMarker[];
  samplesSource?: string;
  flows?: MapFlow[];
  /** Where the flows come from. */
  flowsKind?: SignalKind;
  hotspots?: Hotspot[];
  /** Command-screen look: dark frame, glows, moving traffic. */
  theatre?: boolean;
  maxHeight?: number;
  minHeight?: number;
  compact?: boolean;
  emptyNote?: React.ReactNode;
  selected?: string;
  onSelect?: (u: { name: string; code?: string }) => void;
  /** Anything else the ministry draws over its map. */
  extra?: (ctx: OverlayContext) => React.ReactNode;
}) {
  const [sites, setSites] = React.useState<RegisteredSite[]>([]);
  const [glyphs, setGlyphs] = React.useState<Record<string, string>>({});
  const catKey = categories.join(',');
  React.useEffect(() => {
    if (!catKey) return;
    let live = true;
    fetch('/api/facilities').then(r => (r.ok ? r.json() : null)).then((j: { sites?: RegisteredSite[]; categories?: { key: string; glyph: string }[] } | null) => {
      if (!live || !j?.sites) return;
      const want = new Set(catKey.split(','));
      setSites(j.sites.filter(s => want.has(s.category)));
      setGlyphs(Object.fromEntries((j.categories ?? []).map(c => [c.key, c.glyph])));
    }).catch(() => undefined);
    return () => { live = false; };
  }, [catKey]);

  // Registered kinds replace their examples.
  const registered = new Set(sites.map(s => s.category));
  const shownSamples = samples.filter(s => !s.category || !registered.has(s.category));
  const points: MapPoint[] = [
    ...sites.map(s => ({ key: s.id, label: `${s.name}${s.certification.state === 'certified' ? '' : ' (location awaiting certification)'}${s.generalised ? ' · position generalised' : ''}`,
      tone: (s.certification.state === 'certified' ? 'ok' : 'warn') as Tone, lng: s.location.lng, lat: s.location.lat, glyph: glyphs[s.category] ?? '●', href: `/gov/sites#${s.id}` })),
  ];
  const uid = React.useId().replace(/:/g, '');

  const overlay = (ctx: OverlayContext) => {
    const at = new Map(ctx.units.map(u => [keyOf(u.name), u] as const));
    for (const u of ctx.units) if (u.code) at.set(u.code.toLowerCase(), u);
    const pos = (r: string) => (r === 'capital' ? ctx.capital : (() => { const u = at.get(keyOf(r)) ?? at.get(r.toLowerCase()); return u ? { x: u.x, y: u.y } : null; })());
    const spread = Math.max(8, Math.min(30, Math.sqrt((ctx.width * ctx.height) / Math.max(1, ctx.units.length)) * 0.4));
    return (
      <g>
        <defs>
          {(['ok', 'warn', 'alert', 'neutral'] as const).map(t => (
            <radialGradient key={t} id={`mm-${t}-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={STATUS[t]} stopOpacity={0.38} />
              <stop offset="100%" stopColor={STATUS[t]} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        <g pointerEvents="none" aria-hidden>
          {hotspots.map((h, i) => {
            const p = pos(h.region); if (!p) return null;
            const t: Tone = h.intensity >= 75 ? 'alert' : h.intensity >= 55 ? 'warn' : 'neutral';
            return (
              <g key={`h${i}`}>
                <circle cx={p.x} cy={p.y} r={spread * (1 + h.intensity / 60)} fill={`url(#mm-${t}-${uid})`} />
                {h.intensity >= 75 ? <circle cx={p.x} cy={p.y} r={spread * 0.9} fill="none" stroke={STATUS.alert} strokeWidth={1.2} className="motion-safe:animate-diffuse" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} /> : null}
              </g>
            );
          })}
          {flows.map((f, i) => {
            const a = pos(f.from), b = pos(f.to); if (!a || !b) return null;
            const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2 - 24 - (i % 3) * 8).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
            const w = 0.8 + Math.min(3, (f.weight ?? 1) * 0.6);
            return (
              <g key={`f${i}`}>
                <path d={d} fill="none" stroke={STATUS[f.tone]} strokeWidth={w + 2.5} strokeOpacity={0.08} />
                <path d={d} fill="none" stroke={STATUS[f.tone]} strokeWidth={w} strokeOpacity={0.7} strokeDasharray={flowsKind === 'observed' || flowsKind === 'reported' ? undefined : '3 5'}
                  className={theatre ? 'motion-safe:animate-dash-flow' : undefined} />
                <title>{f.label}</title>
              </g>
            );
          })}
          {shownSamples.map((s, i) => {
            const p = pos(s.region); if (!p) return null;
            const off = (i % 3) * 7 - 7;
            const x = p.x + off, y = p.y - spread * 0.55;
            return (
              <g key={`s${i}`} opacity={0.9}>
                <rect x={x - 7} y={y - 7} width={14} height={14} rx={3} fill="rgb(var(--c-surface-2))" stroke={STATUS[s.tone]} strokeWidth={1} strokeDasharray="2 1.5" />
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill={STATUS[s.tone]}>{s.glyph}</text>
                {s.count && s.count > 1 ? <text x={x + 8} y={y - 5} fontSize="8" fontWeight="700" fill="rgb(var(--c-ink-soft))">{s.count}</text> : null}
                <title>{`${s.label} (sample)`}</title>
              </g>
            );
          })}
        </g>
        {extra?.(ctx)}
      </g>
    );
  };

  const anySample = shownSamples.length > 0 || (flows.length > 0 && flowsKind === 'sample');
  return (
    <div className={theatre ? 'rounded-[4px] border border-line-soft bg-bg p-2' : undefined}>
      <NationMap title={title} values={values} kind={kind} source={source} valueLabel={valueLabel} unit={unit} points={points} pointsLabel="Registered sites"
        maxHeight={maxHeight} minHeight={minHeight} compact={compact} emptyNote={emptyNote} selected={selected} onSelect={onSelect}
        variant={theatre ? 'theatre' : 'standard'} overlay={overlay} />
      {sites.length || anySample ? (
        <p className="mt-1 text-[11px] text-ink-muted">
          {sites.length ? `${sites.length} registered site${sites.length === 1 ? '' : 's'} from the national facility register. ` : ''}
          {anySample ? `Dashed markers and routes are samples${samplesSource ? ` (${samplesSource})` : ''} until the ministry registers its sites and connects its data.` : ''}
        </p>
      ) : null}
    </div>
  );
}
