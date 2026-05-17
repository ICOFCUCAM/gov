'use client';

// Sovereign geospatial command surface. Renders the REAL national outline
// and REAL provinces/states of a FIXED sovereign country (no selectors —
// one consistent country across the whole ecosystem), projected with
// d3-geo to fill the panel edge-to-edge as the dominant operational
// anchor. Live deterministic health telemetry overlaid as escalation
// heat, propagation corridors and pulsing nodes. Public-domain geography.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ac } from '@/apps/_shared/AppKit';
import { loadCountry, provinceLabel, type Admin1Country } from '@/lib/geo/admin1';
import type { HealthGeo } from '@/lib/gov/health-geo';

// The ONE sovereign country the entire ecosystem operates over. Fixed.
export const SOVEREIGN_ISO = 'UGA';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';
const tnf = (v: number): 'ok' | 'warn' | 'alert' => (v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok');

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
    // Fit true country shape large into the panel (aspect preserved — a
    // clean, recognisable territory, never a distorted blob).
    const proj = geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], fc as never);
    const path = geoPath(proj);
    const outlineD = data.outline ? path({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '' : '';
    const provs = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const c = proj([p.lng, p.lat]);
      return { d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '', cx: c?.[0] ?? null, cy: c?.[1] ?? null, v, t: tnf(v), name: provinceLabel(p, 'en') };
    });
    // Clean, deliberate hotspot set — a handful of glowing nodes, not a
    // confetti storm. Highest-pressure districts only.
    const topNodes = provs.filter(x => x.cx != null)
      .sort((a, b) => b.v - a.v).slice(0, 14)
      .map(x => ({ x: x.cx as number, y: x.cy as number, v: x.v, t: x.t, label: x.name }));
    return { provs, topNodes, outlineD };
  }, [data, W, H, geo, metric, iso3]);

  return (
    <div ref={wrap} className="relative w-full overflow-hidden" style={{ height: H, background: '#03070f' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: H }} role="img" aria-label={`${iso3} — ${metric}`}>
        <defs>
          <radialGradient id="gmb" cx="50%" cy="40%" r="90%">
            <stop offset="0%" stopColor="#0b1f33" /><stop offset="55%" stopColor="#06121f" /><stop offset="100%" stopColor="#03070f" />
          </radialGradient>
          <filter id="gms" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#gmb)" />
        <g stroke={accent} strokeOpacity="0.07" strokeWidth="0.5">
          {Array.from({ length: Math.ceil(W / 44) }, (_, i) => <line key={`v${i}`} x1={i * 44} y1={0} x2={i * 44} y2={H} />)}
          {Array.from({ length: Math.ceil(H / 44) }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 44} x2={W} y2={i * 44} />)}
        </g>

        {loading || !view ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="rgb(var(--c-ink-muted))" className="uppercase" style={{ letterSpacing: '0.2em' }}>
            {loading ? 'ACQUIRING TERRITORY…' : 'NO GEOGRAPHIC DATA'}
          </text>
        ) : (
          <g>
            {/* soft territory glow */}
            {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.28" filter="url(#gms)" /> : null}
            {/* clean province fills + crisp thin borders */}
            {view.provs.map((pr, i) => (
              <path key={`p${i}`} d={pr.d} fill={ac(pr.t)} fillOpacity={0.06 + (pr.v / 100) * 0.22}
                stroke={`color-mix(in srgb,${accent} 50%,transparent)`} strokeWidth="0.35" strokeOpacity="0.55" />
            ))}
            {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.85" /> : null}
            {/* a few clean corridors between principal hotspots */}
            {view.topNodes.slice(0, 6).map((nd, i, a) => {
              const nx = a[(i + 1) % a.length]!;
              return <line key={`c${i}`} x1={nd.x} y1={nd.y} x2={nx.x} y2={nx.y} stroke={accent} strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="3 3" className="animate-dash-flow" />;
            })}
            {/* deliberate glowing hotspot nodes */}
            {view.topNodes.map((nd, i) => {
              const col = ac(nd.t); const r = 2 + (nd.v / 100) * 3;
              return (
                <g key={`n${i}`}>
                  {nd.t === 'alert' ? <circle cx={nd.x} cy={nd.y} r={r + 5} fill="none" stroke={col} strokeWidth="0.7" strokeOpacity="0.7" className="animate-diffuse" style={{ transformOrigin: `${nd.x}px ${nd.y}px` }} /> : null}
                  <circle cx={nd.x} cy={nd.y} r={r} fill={col} fillOpacity="0.95" stroke="#03070f" strokeWidth="0.5"
                    className={nd.t === 'alert' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 ${r}px ${col})` }} />
                  {i < 4 ? <text x={nd.x} y={nd.y - r - 2} textAnchor="middle" fontSize="6" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono,monospace)', textShadow: '0 0 4px #03070f' }}>{nd.label}</text> : null}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* minimal overlays — chrome must not steal map gravity */}
      {title ? (
        <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1.5">
          <span className="h-2 w-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-ink-soft" style={{ textShadow: '0 0 8px rgba(0,0,0,0.9)' }}>{title}</span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute right-2 top-1.5 font-mono text-[7px] tabular-nums text-ink-muted" style={{ textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
        {data?.name ?? iso3} · {geo.assets.length} ASSETS · {geo.corridors.length} CORR
      </div>
      <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center gap-x-3 text-[7px] uppercase tracking-wider text-ink-muted">
        <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('ok') }} /> nominal</span>
        <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('warn') }} /> elevated</span>
        <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('alert') }} /> critical</span>
        <span className="ml-auto rounded-[2px] bg-black/50 px-1 py-0.5">{data?.provinces.length ? `${data.provinces.length} PROV` : 'NATIONAL'} · {metric.toUpperCase()}</span>
      </div>
    </div>
  );
}
