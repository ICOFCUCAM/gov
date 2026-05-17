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
    // Fit true country shape large into the panel (aspect preserved).
    const proj = geoMercator().fitExtent([[4, 4], [W - 4, H - 4]], fc as never);
    const path = geoPath(proj);
    const outlineD = data.outline ? path({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '' : '';
    const provs = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const c = proj([p.lng, p.lat]);
      return { d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '', cx: c?.[0] ?? null, cy: c?.[1] ?? null, v, t: tnf(v), name: provinceLabel(p, 'en') };
    });
    // Facility network: every district is a node; cap the icon/mesh set so
    // it stays a clean structured network, not confetti.
    const fac = provs.filter(x => x.cx != null)
      .map(x => ({ x: x.cx as number, y: x.cy as number, v: x.v, t: x.t, label: x.name }))
      .sort((a, b) => b.v - a.v).slice(0, 60);
    // Nearest-neighbour mesh (each node → 2 closest) — organised, legible.
    const mesh: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const seen = new Set<string>();
    fac.forEach((n, i) => {
      const d = fac.map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 })).filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2);
      d.forEach(o => { const k = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`; if (!seen.has(k)) { seen.add(k); mesh.push({ x1: n.x, y1: n.y, x2: fac[o.j]!.x, y2: fac[o.j]!.y }); } });
    });
    const blooms = fac.filter(n => n.v >= 58).slice(0, 8);
    const hubs = fac.slice(0, 6);
    return { provs, fac, mesh, blooms, hubs, outlineD };
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
          <radialGradient id="gmheat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ac('alert')} stopOpacity="0.55" />
            <stop offset="45%" stopColor={ac('warn')} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ac('warn')} stopOpacity="0" />
          </radialGradient>
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
            {/* outbreak heat blooms — fill the dark space, benchmark glow */}
            {view.blooms.map((b, i) => {
              const rr = 26 + (b.v / 100) * 30;
              return <ellipse key={`bl${i}`} cx={b.x} cy={b.y} rx={rr} ry={rr * 0.8} fill="url(#gmheat)" />;
            })}
            {/* soft territory glow + subtle fills + crisp borders */}
            {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.26" filter="url(#gms)" /> : null}
            {view.provs.map((pr, i) => (
              <path key={`p${i}`} d={pr.d} fill={ac(pr.t)} fillOpacity={0.05 + (pr.v / 100) * 0.16}
                stroke={`color-mix(in srgb,${accent} 45%,transparent)`} strokeWidth="0.3" strokeOpacity="0.5" />
            ))}
            {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.85" /> : null}
            {/* facility network mesh */}
            {view.mesh.map((m, i) => (
              <line key={`m${i}`} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={accent} strokeWidth="0.3" strokeOpacity="0.22" />
            ))}
            {/* facility nodes — small, clean, dense */}
            {view.fac.map((n, i) => (
              <circle key={`f${i}`} cx={n.x} cy={n.y} r={1.1} fill={ac(n.t)} fillOpacity="0.85"
                style={{ filter: `drop-shadow(0 0 1.5px ${ac(n.t)})` }} />
            ))}
            {/* principal hubs — glowing, labelled */}
            {view.hubs.map((nd, i) => {
              const col = ac(nd.t); const r = 2.4 + (nd.v / 100) * 2.6;
              return (
                <g key={`h${i}`}>
                  {nd.t === 'alert' ? <circle cx={nd.x} cy={nd.y} r={r + 5} fill="none" stroke={col} strokeWidth="0.7" strokeOpacity="0.7" className="animate-diffuse" style={{ transformOrigin: `${nd.x}px ${nd.y}px` }} /> : null}
                  <circle cx={nd.x} cy={nd.y} r={r} fill={col} fillOpacity="0.97" stroke="#03070f" strokeWidth="0.5"
                    className={nd.t === 'alert' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 ${r * 1.3}px ${col})` }} />
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
