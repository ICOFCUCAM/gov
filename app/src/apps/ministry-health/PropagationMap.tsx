'use client';

// The health wall's "Propagation Map": how pressure travels between the
// nation's own regions. The seven regions under most pressure sit where they
// really are (the nation's real regional shapes: Natural Earth or official
// boundary data), linked worst to next in the chain with flowing dashes and a
// fainter second-order link, each node breathing in its tone; the frame
// follows the chain, with the regions around it for context. Figures are
// samples until a health information source is connected. Before the nation's
// country and regions are set it keeps the earlier schematic chain.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { loadCountry, type Admin1Country } from '@/lib/geo/admin1';
import { nationIso3 } from '@/lib/nation/registry';
import { nameKeys } from '@/lib/map/names';
import { seed } from '@/lib/telemetry';
import { sc, type Tone } from '@/apps/_shared/SovereignUI';

const VW = 100, VH = 56;

export interface PropagationRegion { region: string; composite: number; tone: Tone }

export function PropagationMap({ regions, accent, height = 52 }: { regions: PropagationRegion[]; accent: string; height?: number }) {
  const iso3 = nationIso3();
  const clip = `pg${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [data, setData] = React.useState<Admin1Country | null>(null);
  React.useEffect(() => {
    if (!iso3) return;
    let live = true;
    loadCountry(iso3).then(d => { if (live) setData(d); });
    return () => { live = false; };
  }, [iso3]);

  // The chain: the regions under most pressure, highest first.
  const ranked = [...regions].sort((a, b) => b.composite - a.composite);
  const chainKey = ranked.slice(0, 12).map(r => r.region).join('|');
  const geo = React.useMemo(() => {
    if (!data || !data.provinces.length) return null;
    const centre = new Map<string, { lng: number; lat: number }>();
    for (const p of data.provinces) for (const k of nameKeys(p.name, ...Object.values(p.i18n ?? {}))) if (!centre.has(k)) centre.set(k, { lng: p.lng, lat: p.lat });
    const chain = chainKey.split('|').flatMap(r => {
      const c = nameKeys(r).map(k => centre.get(k)).find(Boolean);
      return c ? [{ region: r, ...c }] : [];
    }).slice(0, 7);
    // Frame the chain with room around it; the whole country when nothing can be placed.
    const all = { type: 'FeatureCollection' as const, features: data.provinces.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry })) };
    const lng = chain.map(c => c.lng), lat = chain.map(c => c.lat);
    const pad = (a: number[]) => Math.max(0.5, (Math.max(...a) - Math.min(...a)) * 0.3);
    const box = chain.length >= 2
      ? { type: 'MultiPoint' as const, coordinates: [[Math.min(...lng) - pad(lng), Math.min(...lat) - pad(lat)], [Math.max(...lng) + pad(lng), Math.max(...lat) + pad(lat)]] }
      : all;
    const proj = geoMercator().fitExtent([[4, 4], [VW - 4, VH - 4]], box as never);
    const path = geoPath(proj);
    const land = data.provinces.map(p => path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '').join(' ');
    const at = new Map<string, { x: number; y: number }>();
    for (const c of chain) { const q = proj([c.lng, c.lat]); if (q && q.every(Number.isFinite)) at.set(c.region, { x: q[0], y: q[1] }); }
    return { land, at };
  }, [data, chainKey]);

  const placed = geo
    ? ranked.flatMap(r => {
      const p = geo.at.get(r.region);
      return p ? [{ x: p.x, y: p.y, t: r.tone, label: `${r.region} · pressure ${r.composite} (sample)` }] : [];
    }).slice(0, 7)
    : [];
  const real = placed.length >= 2;
  const nodes = real
    ? placed
    : Array.from({ length: 7 }, (_, i) => ({
      x: 12 + seed(`pg:x:${i}`) * 76, y: 8 + seed(`pg:y:${i}`) * 40,
      t: (seed(`pg:t:${i}`) > 0.7 ? 'alert' : seed(`pg:t:${i}`) > 0.4 ? 'warn' : 'ok') as Tone, label: '',
    }));

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height }} role="img"
      aria-label={real ? `Pressure propagation between ${placed.length} regions, highest first (sample): ${placed.map(n => n.label.split(' · ')[0]).join(' → ')}` : 'Pressure propagation (sample)'}>
      <defs><clipPath id={clip}><rect width={VW} height={VH} /></clipPath></defs>
      {real && geo ? (
        <g clipPath={`url(#${clip})`}>
          <path d={geo.land} fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.24" strokeWidth="0.25" />
        </g>
      ) : null}
      {nodes.map((n, i, a) => (
        <g key={i}>
          {i < a.length - 1 ? <line x1={n.x} y1={n.y} x2={a[i + 1]!.x} y2={a[i + 1]!.y} stroke={accent} strokeOpacity="0.4" strokeWidth="0.5" className="animate-dash-flow" strokeDasharray="2 2" /> : null}
          {i > 1 ? <line x1={n.x} y1={n.y} x2={a[i - 2]!.x} y2={a[i - 2]!.y} stroke={accent} strokeOpacity="0.25" strokeWidth="0.4" /> : null}
        </g>
      ))}
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          {i === 0 && real ? <circle cx={n.x} cy={n.y} r="4.5" fill="none" stroke={sc(n.t)} strokeOpacity="0.6" strokeWidth="0.4" className="animate-diffuse" style={{ transformOrigin: `${n.x}px ${n.y}px` }} /> : null}
          <circle cx={n.x} cy={n.y} r={i === 0 && real ? 2.8 : 2.2} fill={sc(n.t)} className={n.t !== 'ok' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 3px ${sc(n.t)})` }}>
            {n.label ? <title>{n.label}</title> : null}
          </circle>
        </g>
      ))}
    </svg>
  );
}
