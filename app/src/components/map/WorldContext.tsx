'use client';

// The nation in the world (Foreign relations): an Equal Earth world map
// centred on the nation's longitude, the nation drawn from its own outline in
// its own colour, the partners it has declared (National settings) and its
// neighbours (shared borders) marked, with a table of the same. Foreign
// countries are never coloured by invented figures: only relationships the
// nation itself declared are shown.

import * as React from 'react';
import { geoCentroid, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo';
import { loadCountry } from '@/lib/geo/admin1';
import { nationForeignAffairs, nationInsignia, nationIso3 } from '@/lib/nation/registry';
import { findByName, loadWorld, nationIndex, type WorldModel } from '@/lib/map/world';
import type { Geom } from '@/lib/geo/admin1';
import { INFO, STATUS } from '@/lib/theme/tokens';

const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });

export function WorldContext({ maxHeight = 420 }: { maxHeight?: number }) {
  const iso3 = nationIso3();
  const accent = nationInsignia()?.accent ?? INFO;
  const { partners, memberships } = nationForeignAffairs();
  const [world, setWorld] = React.useState<WorldModel | null>(null);
  const [nation, setNation] = React.useState<{ name: string; shape: Geom } | null>(null);
  const [view, setView] = React.useState<'map' | 'table'>('map');
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(720);

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
  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(240, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const model = React.useMemo(() => {
    if (!world) return null;
    const centre = nation ? (geoCentroid(feature(nation.shape) as never) as [number, number]) : null;
    const proj = geoEqualEarth().rotate([-(centre?.[0] ?? 0), 0]);
    const H = Math.round(Math.min(maxHeight, W * 0.52));
    proj.fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' } as never);
    const path = geoPath(proj);
    const home = nationIndex(world, centre);
    const partnerIdx = partners.map(p => ({ ...p, i: findByName(world, p.name) }));
    const partnerSet = new Set(partnerIdx.map(p => p.i).filter(i => i >= 0 && i !== home));
    const neighbourIdx = home >= 0 ? (world.neighbours[home] ?? []) : [];
    const neighbourSet = new Set(neighbourIdx);
    return {
      H,
      sphere: path({ type: 'Sphere' } as never) || '',
      graticule: path(geoGraticule10() as never) || '',
      countries: world.countries.map((c, i) => ({ d: path(feature(c.geometry) as never) || '', name: c.name, partner: partnerSet.has(i), neighbour: neighbourSet.has(i), home: i === home })),
      nation: nation ? path(feature(nation.shape) as never) || '' : '',
      partners: partnerIdx.map(p => ({ name: p.name, capital: p.capital, found: p.i >= 0, neighbour: neighbourSet.has(p.i) })),
      neighbours: neighbourIdx.map(i => world.countries[i]!.name).sort(),
      // Neighbours that are not also declared partners (those are listed once, as partners).
      otherNeighbours: neighbourIdx.filter(i => !partnerSet.has(i)).map(i => world.countries[i]!.name).sort(),
    };
  }, [world, nation, W, maxHeight, partners]);

  const name = nation?.name ?? 'The nation';
  const summary = model
    ? `World map centred on ${name}. ${model.neighbours.length} neighbour${model.neighbours.length === 1 ? '' : 's'}${model.neighbours.length ? `: ${model.neighbours.join(', ')}` : ''}. ${partners.length} declared partner${partners.length === 1 ? '' : 's'}.`
    : 'World map';
  const btn = (v: 'map' | 'table', label: string) => (
    <button type="button" aria-pressed={view === v} onClick={() => setView(v)}
      className={`focus-ring rounded-[3px] border px-2 py-0.5 text-[11px] ${view === v ? 'border-ink text-ink' : 'border-line text-ink-muted hover:text-ink'}`}>{label}</button>
  );

  return (
    <figure className="min-w-0 space-y-1.5" aria-label={`${name} in the world`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{name} in the world</figcaption>
        <div className="flex gap-1" role="group" aria-label="Show as">{btn('map', 'Map')}{btn('table', 'Table')}</div>
      </div>
      <div ref={wrap} className={view === 'map' ? 'w-full' : 'hidden'}>
        {!model ? <p className="p-3 text-[13px] text-ink-soft">Loading the world map…</p> : (
          <svg width={W} height={model.H} viewBox={`0 0 ${W} ${model.H}`} className="block max-w-full" role="img" aria-label={summary}>
            <path d={model.sphere} fill="rgb(var(--c-bg))" stroke="rgb(var(--c-line))" />
            <path d={model.graticule} fill="none" stroke="rgb(var(--c-line))" strokeOpacity={0.35} strokeWidth={0.5} />
            {model.countries.map((c, i) => (
              <path key={i} d={c.d} stroke="rgb(var(--c-bg))" strokeWidth={0.4}
                fill={c.partner ? STATUS.ok : c.neighbour ? 'rgb(var(--c-ink-muted))' : 'rgb(var(--c-surface-2))'}
                fillOpacity={c.partner ? 0.55 : c.neighbour ? 0.45 : 0.8}>
                <title>{`${c.name}${c.partner ? ' · declared partner' : ''}${c.neighbour ? ' · neighbour' : ''}`}</title>
              </path>
            ))}
            {model.nation ? <path d={model.nation} fill={accent} fillOpacity={0.9} stroke="rgb(var(--c-ink))" strokeWidth={0.8}><title>{name}</title></path> : null}
          </svg>
        )}
      </div>
      {view === 'table' && model ? (
        <table className="w-full text-[12px]">
          <caption className="sr-only">{summary}</caption>
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Country</th><th className="text-start font-semibold">Relationship</th><th className="text-start font-semibold">Capital</th></tr></thead>
          <tbody>
            {model.partners.map(p => (
              <tr key={`p${p.name}`} className="border-b border-line-soft"><td className="py-1">{p.name}{p.found ? '' : <span className="text-ink-muted"> (not found on the map)</span>}</td><td>Declared partner{p.neighbour ? ' · neighbour' : ''}</td><td>{p.capital ?? '—'}</td></tr>
            ))}
            {model.otherNeighbours.map(n => (
              <tr key={`n${n}`} className="border-b border-line-soft"><td className="py-1">{n}</td><td>Neighbour (shared border)</td><td>—</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-4" style={{ background: accent }} aria-hidden />{name}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-4" style={{ background: STATUS.ok, opacity: 0.55 }} aria-hidden />declared partner ({partners.length})</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-4 bg-ink-muted/45" aria-hidden />neighbour ({model?.neighbours.length ?? 0})</span>
        {memberships.length ? <span>Member of: {memberships.join(', ')}</span> : null}
      </div>
      {!partners.length ? <p className="text-[11px] text-ink-muted">No partners declared yet: add them in National settings (setup, foreign affairs) to see them here.</p> : null}
      <p className="text-[10px] text-ink-muted">World: Natural Earth 1:50m (public domain) · {name}: the nation&rsquo;s own boundaries · Partners: as the nation declared them</p>
    </figure>
  );
}
