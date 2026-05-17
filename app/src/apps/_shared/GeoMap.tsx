'use client';

// Sovereign geospatial command surface. A clean incident-intelligence map:
// ONE smooth glowing national silhouette (no busy per-district borders),
// a deliberate, well-spaced set of glowing severity icon-markers, a few
// faint routes, a legend and density scale. Public-domain Natural Earth
// geography, fixed sovereign country, live deterministic telemetry.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { loadCountry, provinceLabel, type Admin1Country } from '@/lib/geo/admin1';
import type { HealthGeo } from '@/lib/gov/health-geo';

export const SOVEREIGN_ISO = 'UGA';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';
type BandKey = 'critical' | 'major' | 'moderate' | 'minor' | 'resolved';
const BANDS: Record<BandKey, { label: string; color: string; glyph: 'flame' | 'tri' | 'shield' | 'check' }> = {
  critical: { label: 'Critical', color: '#ff4d5a', glyph: 'flame' },
  major: { label: 'Major', color: '#ff8a3d', glyph: 'flame' },
  moderate: { label: 'Moderate', color: '#ffd23d', glyph: 'tri' },
  minor: { label: 'Minor', color: '#4d9bff', glyph: 'shield' },
  resolved: { label: 'Resolved', color: '#2dd4bf', glyph: 'check' },
};
const bandOf = (v: number): BandKey => (v >= 80 ? 'critical' : v >= 62 ? 'major' : v >= 45 ? 'moderate' : v >= 28 ? 'minor' : 'resolved');

function Glyph({ kind, c, s }: { kind: 'flame' | 'tri' | 'shield' | 'check'; c: string; s: number }) {
  const p = { fill: 'none', stroke: c, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'flame') return <path d={`M0 ${-s} C ${s * 0.7} ${-s * 0.2} ${s * 0.5} ${s * 0.7} 0 ${s} C ${-s * 0.5} ${s * 0.7} ${-s * 0.7} ${-s * 0.2} 0 ${-s} Z`} fill={c} stroke="none" />;
  if (kind === 'tri') return <path d={`M0 ${-s} L ${s} ${s * 0.8} L ${-s} ${s * 0.8} Z`} {...p} />;
  if (kind === 'shield') return <path d={`M0 ${-s} L ${s} ${-s * 0.4} L ${s * 0.7} ${s} L 0 ${s * 0.7} L ${-s * 0.7} ${s} L ${-s} ${-s * 0.4} Z`} {...p} />;
  return <path d={`M ${-s} 0 L ${-s * 0.2} ${s * 0.7} L ${s} ${-s * 0.7}`} {...p} />;
}

export function GeoMap({
  geo, metric, title, height = 300, accent = '#37c7d4', iso3 = SOVEREIGN_ISO,
}: {
  geo: HealthGeo; metric: Metric; title: string; height?: number;
  accent?: string; iso3?: string;
}) {
  const [data, setData] = React.useState<Admin1Country | null>(null);
  const [loading, setLoading] = React.useState(true);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(680);
  const H = height;

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    loadCountry(iso3).then(d => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, [iso3]);

  React.useEffect(() => {
    if (!wrap.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(es => { const w = es[0]?.contentRect.width; if (w) setW(Math.max(220, Math.round(w))); });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const view = React.useMemo(() => {
    if (!data) return null;
    const feats = data.provinces.length
      ? data.provinces.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry }))
      : data.outline ? [{ type: 'Feature' as const, properties: {}, geometry: data.outline }] : [];
    if (!feats.length) return null;
    const fc = { type: 'FeatureCollection' as const, features: feats };
    const proj = geoMercator().fitExtent([[10, 14], [W - 10, H - 14]], fc as never);
    const path = geoPath(proj);
    const landD = data.provinces.length
      ? data.provinces.map(p => path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '').join(' ')
      : path({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '';
    const districts = data.provinces.map(p => path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '');
    // Deliberate, well-spaced incident markers (dedupe close ones).
    const cand = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const c = proj([p.lng, p.lat]);
      return { x: c?.[0] ?? null, y: c?.[1] ?? null, v, name: provinceLabel(p, 'en') };
    }).filter(x => x.x != null).sort((a, b) => b.v - a.v) as { x: number; y: number; v: number; name: string }[];
    const minGap = Math.max(26, Math.min(W, H) * 0.085);
    const markers: { x: number; y: number; v: number; name: string; band: BandKey }[] = [];
    for (const c of cand) {
      if (markers.length >= 22) break;
      if (markers.every(m => (m.x - c.x) ** 2 + (m.y - c.y) ** 2 >= minGap * minGap)) markers.push({ ...c, band: bandOf(c.v) });
    }
    const routes = markers.slice(0, 9).map((m, i, a) => {
      const n = a[(i + 1) % a.length]!;
      const mx = (m.x + n.x) / 2, my = (m.y + n.y) / 2 - Math.abs(n.x - m.x) * 0.12;
      return `M ${m.x} ${m.y} Q ${mx} ${my} ${n.x} ${n.y}`;
    });
    return { landD, districts, markers, routes };
  }, [data, W, H, geo, metric, iso3]);

  return (
    <div ref={wrap} className="relative w-full overflow-hidden rounded-[10px]" style={{ height: H, background: 'radial-gradient(120% 100% at 50% 35%, #0c2036 0%, #071425 55%, #030711 100%)' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: H }} role="img" aria-label={`${iso3} — ${metric}`}>
        <defs>
          <filter id="gmGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="gmSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" /></filter>
          <linearGradient id="gmLand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4e74" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#123a5a" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#0b2740" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {loading || !view ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="rgba(150,180,210,0.6)" className="uppercase" style={{ letterSpacing: '0.2em' }}>
            {loading ? 'ACQUIRING TERRITORY…' : 'NO GEOGRAPHIC DATA'}
          </text>
        ) : (
          <g>
            {/* soft outer glow of the landmass */}
            <path d={view.landD} fill="#2f7fb8" fillOpacity="0.5" filter="url(#gmGlow)" />
            {/* one smooth silhouette */}
            <path d={view.landD} fill="url(#gmLand)" stroke="#5fb8e8" strokeOpacity="0.5" strokeWidth="0.8" />
            {/* whisper-faint internal contour for texture (not a mesh) */}
            <g filter="url(#gmSoft)">
              {view.districts.map((d, i) => <path key={`d${i}`} d={d} fill="none" stroke="#7fc4ec" strokeOpacity="0.05" strokeWidth="0.4" />)}
            </g>
            {/* faint routes */}
            {view.routes.map((d, i) => (
              <path key={`r${i}`} d={d} fill="none" stroke="#5fd0e0" strokeOpacity="0.16" strokeWidth="0.8" strokeDasharray="3 4" className="animate-dash-flow" />
            ))}
            {/* clean glowing severity markers */}
            {view.markers.map((m, i) => {
              const b = BANDS[m.band];
              const R = 7.5;
              return (
                <g key={`m${i}`}>
                  <circle cx={m.x} cy={m.y} r={R * 2} fill={b.color} opacity={0.16} filter="url(#gmSoft)" />
                  {(m.band === 'critical' || m.band === 'major') ? (
                    <circle cx={m.x} cy={m.y} r={R + 3} fill="none" stroke={b.color} strokeOpacity="0.6" strokeWidth="1" className="animate-diffuse" style={{ transformOrigin: `${m.x}px ${m.y}px` }} />
                  ) : null}
                  <circle cx={m.x} cy={m.y} r={R} fill="#0a1626" stroke={b.color} strokeWidth="1.4"
                    style={{ filter: `drop-shadow(0 0 5px ${b.color})` }} />
                  <g transform={`translate(${m.x} ${m.y}) scale(0.42)`}><Glyph kind={b.glyph} c={b.color} s={9} /></g>
                  {i < 6 ? (
                    <text x={m.x + R + 3} y={m.y + 3} fontSize="8.5" fill="rgba(210,230,245,0.92)" style={{ fontWeight: 600, textShadow: '0 0 5px #030711' }}>{m.name}</text>
                  ) : null}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* title */}
      <div className="pointer-events-none absolute left-3 top-2.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(225,240,250,0.95)', textShadow: '0 0 8px #030711' }}>
        {title || (data?.name ?? iso3)}
      </div>
      {/* layers control */}
      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1">
        <span className="grid h-6 w-6 place-items-center rounded-[6px] border text-[11px]" style={{ borderColor: 'rgba(120,180,230,0.25)', background: 'rgba(8,20,35,0.7)', color: 'rgba(180,210,235,0.8)' }}>⧉</span>
        <span className="grid h-6 w-6 place-items-center rounded-[6px] border text-[12px]" style={{ borderColor: 'rgba(120,180,230,0.25)', background: 'rgba(8,20,35,0.7)', color: 'rgba(180,210,235,0.8)' }}>−</span>
      </div>
      {/* legend */}
      <div className="pointer-events-none absolute left-3 top-9 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] font-medium" style={{ color: 'rgba(200,222,240,0.9)' }}>
        {(Object.keys(BANDS) as BandKey[]).map(k => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: BANDS[k].color, boxShadow: `0 0 5px ${BANDS[k].color}` }} />{BANDS[k].label}
          </span>
        ))}
      </div>
      {/* incident density scale */}
      <div className="pointer-events-none absolute bottom-2.5 left-3 rounded-[6px] border px-2 py-1.5" style={{ borderColor: 'rgba(120,180,230,0.2)', background: 'rgba(6,16,28,0.66)' }}>
        <div className="text-[7.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(190,215,235,0.85)' }}>Incident Density</div>
        <div className="mt-1 h-1.5 w-28 rounded-full" style={{ background: 'linear-gradient(90deg,#2dd4bf,#ffd23d,#ff4d5a)' }} />
        <div className="mt-0.5 flex justify-between text-[7px]" style={{ color: 'rgba(150,180,205,0.75)' }}><span>Low</span><span>High</span></div>
      </div>
    </div>
  );
}
