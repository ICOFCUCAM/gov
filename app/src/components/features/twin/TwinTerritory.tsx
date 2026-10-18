'use client';

// The twin's territory: the nation's official subdivisions (ISO 3166-2 shapes,
// lib/geo/admin1 and its upgraded boundaries) shaded by one metric as the twin
// knew it on a date. Only observed values are drawn; a unit without one stays
// blank and says so. A slider steps through the dates the metric was observed.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { loadCountry, type Admin1Country } from '@/lib/geo/admin1';
import { nationIso3 } from '@/lib/nation/registry';
import { INFO } from '@/lib/theme/tokens';

export interface TerritoryObs { entityId: string; value: number; unit: string; validFrom: string }
export interface TerritoryEntity { id: string; name: string; code?: string }

const STEPS = 5;

export function TwinTerritory({ metric, obs, entities, dates, date, onDate }: {
  metric: string; obs: TerritoryObs[]; entities: TerritoryEntity[];
  dates: string[]; date: string; onDate: (d: string) => void;
}) {
  const iso3 = nationIso3();
  const [country, setCountry] = React.useState<Admin1Country | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(640);
  const H = 360;
  React.useEffect(() => {
    if (!iso3) return;
    let live = true;
    loadCountry(iso3).then(d => { if (live) setCountry(d); });
    return () => { live = false; };
  }, [iso3]);
  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(240, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // Value per ISO 3166-2 code, through the register's entities.
  const byCode = React.useMemo(() => {
    const codeOf = new Map(entities.filter(e => e.code).map(e => [e.id, e.code!]));
    const m = new Map<string, TerritoryObs>();
    for (const o of obs) { const c = codeOf.get(o.entityId); if (c) m.set(c, o); }
    return m;
  }, [obs, entities]);
  const values = [...byCode.values()].map(o => o.value).sort((a, b) => a - b);
  const lo = values[0] ?? 0, hi = values.at(-1) ?? 0;
  const step = (v: number) => (hi === lo ? STEPS - 1 : Math.min(STEPS - 1, Math.floor(((v - lo) / (hi - lo)) * STEPS)));
  const fill = (k: number) => `color-mix(in srgb, ${INFO} ${18 + k * 18}%, rgb(var(--c-surface)))`;
  const unit = obs[0]?.unit ?? '';

  const shapes = React.useMemo(() => {
    if (!country?.provinces.length) return null;
    const fc = { type: 'FeatureCollection' as const, features: country.provinces.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry })) };
    const proj = geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], fc as never);
    const path = geoPath(proj);
    return country.provinces.map(p => ({ code: p.code, name: p.name, d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '' }));
  }, [country, W]);

  const [hover, setHover] = React.useState<string | null>(null);
  const hovered = hover ? shapes?.find(s => s.code === hover) : null;
  const hoveredObs = hover ? byCode.get(hover) : undefined;
  const shaded = shapes?.filter(s => byCode.has(s.code)).length ?? 0;
  const idx = Math.max(0, dates.indexOf(dates.filter(d => d <= date).at(-1) ?? ''));

  if (!iso3) return <p className="text-ink-soft">Set the nation's country (ISO code) in setup to draw its territory.</p>;
  return (
    <div className="space-y-2">
      <div ref={wrap} className="relative w-full overflow-hidden rounded-[3px] border border-line bg-bg" style={{ height: H }}>
        {shapes ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`${metric} by subdivision as of ${date}: ${shaded} of ${shapes.length} units have an observed value`}>
            {shapes.map(s => {
              const o = byCode.get(s.code);
              return (
                <path key={s.code} d={s.d} fill={o ? fill(step(o.value)) : 'transparent'} stroke="rgb(var(--c-line))" strokeWidth={hover === s.code ? 2 : 0.8}
                  onMouseEnter={() => setHover(s.code)} onMouseLeave={() => setHover(null)}>
                  <title>{`${s.name} (${s.code}): ${o ? `${o.value.toLocaleString('en')} ${o.unit} · true from ${o.validFrom}` : 'no observed value'}`}</title>
                </path>
              );
            })}
          </svg>
        ) : <p className="p-3 text-ink-soft">Loading the nation's boundaries…</p>}
        {hovered ? (
          <div className="pointer-events-none absolute start-2 top-2 rounded-[3px] border border-line bg-surface px-2 py-1 text-[12px]">
            <strong>{hovered.name}</strong> · {hoveredObs ? `${hoveredObs.value.toLocaleString('en')} ${hoveredObs.unit}` : 'no observed value'}
          </div>
        ) : null}
        {country?.attribution ? (
          <p className="absolute bottom-1 end-2 text-[10px] text-ink-muted">Boundaries: {country.attribution.source} ({country.attribution.licence}{country.attribution.via ? `, via ${country.attribution.via}` : ''})</p>
        ) : <p className="absolute bottom-1 end-2 text-[10px] text-ink-muted">Boundaries: Natural Earth (public domain)</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-soft">
        {values.length ? (
          <span className="flex items-center gap-1" aria-label="Legend">
            {Array.from({ length: STEPS }).map((_, k) => <span key={k} className="h-3 w-6 border border-line" style={{ background: fill(k) }} />)}
            <span className="ms-1 font-mono tabular-nums">{lo.toLocaleString('en')} – {hi.toLocaleString('en')} {unit}</span>
          </span>
        ) : null}
        <span className="flex items-center gap-1"><span className="h-3 w-6 border border-line" /> no observed value</span>
        <span>{shaded} of {shapes?.length ?? 0} subdivisions observed</span>
      </div>
      {dates.length > 1 ? (
        <label className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft">
          History
          <input type="range" min={0} max={dates.length - 1} step={1} value={idx} onChange={e => onDate(dates[Number(e.currentTarget.value)]!)}
            className="min-w-[12rem] flex-1" style={{ accentColor: INFO }} aria-valuetext={dates[idx]} />
          <span className="font-mono tabular-nums text-ink">{dates[idx]}</span>
          <span>({dates.length} observation dates)</span>
        </label>
      ) : null}
    </div>
  );
}
