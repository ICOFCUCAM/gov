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
import { seed } from '@/lib/telemetry';
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
    // Margin tiny → map nearly touches edges and dominates the panel.
    const proj = geoMercator().fitExtent([[2, 2], [W - 2, H - 2]], fc as never);
    const path = geoPath(proj);
    const outlineD = data.outline ? path({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '' : '';
    const provs = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const c = proj([p.lng, p.lat]);
      return { p, d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '', cx: c?.[0] ?? null, cy: c?.[1] ?? null, v, t: tnf(v) };
    });
    let nodes = provs.filter(x => x.cx != null).map(x => ({ x: x.cx as number, y: x.cy as number, v: x.v, t: x.t, label: provinceLabel(x.p, 'en') }));
    if (!nodes.length) {
      const [[x0, y0], [x1, y1]] = path.bounds(fc as never);
      const n = Math.max(6, geo.regions.length + 4);
      nodes = Array.from({ length: n }, (_, i) => {
        const reg = geo.regions[i % geo.regions.length];
        const v = reg ? reg[metric] : Math.round(seed(`${iso3}:${i}`) * 100);
        return {
          x: x0 + (0.12 + 0.76 * seed(`${iso3}:nx:${i}`)) * (x1 - x0),
          y: y0 + (0.12 + 0.76 * seed(`${iso3}:ny:${i}`)) * (y1 - y0),
          v, t: tnf(v), label: reg?.region ?? '',
        };
      });
    }
    return { provs, nodes, outlineD };
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
          <>
            {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="4" strokeOpacity="0.32" filter="url(#gms)" /> : null}
            {view.provs.map((pr, i) => (
              <path key={`g${i}`} d={pr.d} fill="none" stroke={accent} strokeWidth="3.5" strokeOpacity="0.2" filter="url(#gms)" />
            ))}
            {view.provs.map((pr, i) => (
              <path key={`p${i}`} d={pr.d} fill={ac(pr.t)} fillOpacity={0.05 + (pr.v / 100) * 0.2}
                stroke={`color-mix(in srgb,${accent} 55%,transparent)`} strokeWidth="0.4" strokeOpacity="0.7" />
            ))}
            {view.outlineD && !view.provs.length ? (
              <path d={view.outlineD} fill={`color-mix(in srgb,${accent} 10%,transparent)`} stroke={accent} strokeWidth="1.1" strokeOpacity="0.92" />
            ) : null}
            {/* dense glowing health-node field (benchmark signature) */}
            {view.provs.filter(p => p.cx != null).flatMap((pr, pi) => {
              const col = ac(pr.t);
              const cnt = 3 + Math.round((pr.v / 100) * 9);
              const spread = Math.min(W, H) * (0.035 + (pr.v / 100) * 0.05);
              return Array.from({ length: cnt }, (_, j) => {
                const a = seed(`${iso3}:${pi}:a:${j}`) * 6.283;
                const dd = (0.15 + 0.85 * seed(`${iso3}:${pi}:d:${j}`)) * spread;
                const x = (pr.cx as number) + Math.cos(a) * dd;
                const y = (pr.cy as number) + Math.sin(a) * dd * 0.92;
                const rr = 0.6 + seed(`${iso3}:${pi}:r:${j}`) * 1.2;
                return <circle key={`s${pi}-${j}`} cx={x} cy={y} r={rr} fill={col}
                  fillOpacity={0.45 + seed(`${iso3}:${pi}:o:${j}`) * 0.4}
                  style={{ filter: `drop-shadow(0 0 ${rr * 1.6}px ${col})` }} />;
              });
            })}
            {view.nodes.slice(0, view.nodes.length - 1).map((nd, i) => {
              const nx = view.nodes[i + 1]!;
              const cr = geo.corridors[i % Math.max(1, geo.corridors.length)];
              return <line key={`c${i}`} x1={nd.x} y1={nd.y} x2={nx.x} y2={nx.y} stroke={ac(cr?.tone ?? 'ok')} strokeWidth="0.8" strokeDasharray="4 4" className="animate-dash-flow" style={{ opacity: 0.45 }} />;
            })}
            {view.nodes.map((nd, i) => {
              const col = ac(nd.t); const r = 2.2 + (nd.v / 100) * 3.6;
              return (
                <g key={`n${i}`}>
                  {nd.t === 'alert' ? <circle cx={nd.x} cy={nd.y} r={r + 7} fill="none" stroke={col} strokeWidth="0.8" className="animate-diffuse" style={{ transformOrigin: `${nd.x}px ${nd.y}px` }} /> : null}
                  <circle cx={nd.x} cy={nd.y} r={r + 3} fill={col} fillOpacity="0.12" />
                  <circle cx={nd.x} cy={nd.y} r={r} fill={col} fillOpacity="0.97" stroke="#03070f" strokeWidth="0.6"
                    className={nd.t !== 'ok' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 ${r * 1.4}px ${col})` }} />
                  {nd.label && nd.v >= 60 ? <text x={nd.x} y={nd.y - r - 2.5} textAnchor="middle" fontSize="6" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono,monospace)' }}>{nd.label}</text> : null}
                </g>
              );
            })}
          </>
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
