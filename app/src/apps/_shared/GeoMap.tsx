'use client';

// Sovereign geospatial command surface. Renders the REAL national outline
// and (where available) REAL provinces of a selected country, projected
// with d3-geo to FILL the panel edge-to-edge — a map-first operational
// anchor, not a decorative blob. Live deterministic health telemetry is
// overlaid as escalation heat, propagation corridors and pulsing nodes.
// Country + language selectable. Public-domain Natural Earth geography.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ac } from '@/apps/_shared/AppKit';
import { seed } from '@/lib/telemetry';
import {
  COUNTRIES, LANGS, loadCountry, provinceLabel,
  type Admin1Country, type Lang,
} from '@/lib/geo/admin1';
import type { HealthGeo } from '@/lib/gov/health-geo';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';
const tn = (v: number): 'ok' | 'warn' | 'alert' => (v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok');

export function GeoMap({
  geo, metric, title, height = 300, accent = '#37c7d4', iso3 = 'ZAF', lang = 'en',
}: {
  geo: HealthGeo; metric: Metric; title: string; height?: number;
  accent?: string; iso3?: string; lang?: Lang;
}) {
  const [cc, setCc] = React.useState(iso3);
  const [lg, setLg] = React.useState<Lang>(lang);
  const [data, setData] = React.useState<Admin1Country | null>(null);
  const [loading, setLoading] = React.useState(true);
  const wrap = React.useRef<HTMLDivElement>(null);
  const [W, setW] = React.useState(680);
  const H = height;

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    loadCountry(cc).then(d => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, [cc]);

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
    const proj = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], fc as never);
    const path = geoPath(proj);
    const outlineD = data.outline ? path({ type: 'Feature', properties: {}, geometry: data.outline } as never) || '' : '';
    const provs = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const c = proj([p.lng, p.lat]);
      return { p, d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '', cx: c?.[0] ?? null, cy: c?.[1] ?? null, v, t: tn(v) };
    });
    // Operational nodes for outline-only countries: deterministic points in bbox.
    let nodes = provs.filter(x => x.cx != null).map(x => ({ x: x.cx as number, y: x.cy as number, v: x.v, t: x.t, label: provinceLabel(x.p, lg) }));
    if (!nodes.length) {
      const [[x0, y0], [x1, y1]] = path.bounds(fc as never);
      const n = Math.max(6, geo.regions.length + 4);
      nodes = Array.from({ length: n }, (_, i) => {
        const reg = geo.regions[i % geo.regions.length];
        const v = reg ? reg[metric] : Math.round(seed(`${cc}:${i}`) * 100);
        return {
          x: x0 + (0.12 + 0.76 * seed(`${cc}:nx:${i}`)) * (x1 - x0),
          y: y0 + (0.12 + 0.76 * seed(`${cc}:ny:${i}`)) * (y1 - y0),
          v, t: tn(v), label: reg?.region ?? '',
        };
      });
    }
    return { provs, nodes, outlineD };
  }, [data, W, H, geo, metric, lg, cc]);

  const entry = COUNTRIES.find(c => c.iso3 === cc);

  return (
    <section className="overflow-hidden rounded-[3px] border" style={{ borderColor: `color-mix(in srgb,${accent} 28%,#142433)`, background: '#04070d', boxShadow: `inset 0 0 60px rgba(0,0,0,0.6), 0 0 0 1px color-mix(in srgb,${accent} 10%,transparent)` }}>
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b px-2 py-1" style={{ borderColor: `color-mix(in srgb,${accent} 22%,#142433)`, background: `linear-gradient(90deg,#070d15,color-mix(in srgb,${accent} 7%,#070d15))` }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-soft">{title || (entry ? entry.name : cc)}</h3>
          <span className="font-mono text-[7.5px] tabular-nums text-ink-muted">{geo.assets.length} ASSETS · {geo.corridors.length} CORR</span>
        </div>
        <div className="flex items-center gap-1">
          <select aria-label="Country" value={cc} onChange={e => setCc(e.target.value)}
            className="rounded-[2px] border bg-[#0a1320] px-1 py-0.5 text-[8px] text-ink-soft" style={{ borderColor: `color-mix(in srgb,${accent} 30%,#142433)` }}>
            {COUNTRIES.map(c => <option key={c.iso3} value={c.iso3}>{c.name}{c.provinces ? ' ●' : ''}</option>)}
          </select>
          <select aria-label="Language" value={lg} onChange={e => setLg(e.target.value as Lang)}
            className="rounded-[2px] border bg-[#0a1320] px-1 py-0.5 text-[8px] text-ink-soft" style={{ borderColor: `color-mix(in srgb,${accent} 30%,#142433)` }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div ref={wrap} className="relative" style={{ height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: H }} role="img" aria-label={`${entry?.name ?? cc} — ${metric}`}>
          <defs>
            <radialGradient id="gmb" cx="50%" cy="40%" r="85%">
              <stop offset="0%" stopColor="#0a1a2a" /><stop offset="60%" stopColor="#070f18" /><stop offset="100%" stopColor="#03060c" />
            </radialGradient>
            <filter id="gms" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#gmb)" />
          {/* operational graticule */}
          <g stroke={accent} strokeOpacity="0.07" strokeWidth="0.5">
            {Array.from({ length: Math.ceil(W / 46) }, (_, i) => <line key={`v${i}`} x1={i * 46} y1={0} x2={i * 46} y2={H} />)}
            {Array.from({ length: Math.ceil(H / 46) }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 46} x2={W} y2={i * 46} />)}
          </g>

          {loading || !view ? (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="rgb(var(--c-ink-muted))" className="uppercase" style={{ letterSpacing: '0.18em' }}>
              {loading ? 'ACQUIRING TERRITORY…' : 'NO GEOGRAPHIC DATA'}
            </text>
          ) : (
            <>
              {view.outlineD ? <path d={view.outlineD} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.3" filter="url(#gms)" /> : null}
              {view.provs.length ? view.provs.map((pr, i) => (
                <path key={`g${i}`} d={pr.d} fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.22" filter="url(#gms)" />
              )) : null}
              {view.provs.map((pr, i) => (
                <path key={`p${i}`} d={pr.d} fill={ac(pr.t)} fillOpacity={0.14 + (pr.v / 100) * 0.5}
                  stroke={`color-mix(in srgb,${accent} 65%,transparent)`} strokeWidth="0.7" strokeOpacity="0.85"
                  className={pr.t === 'alert' ? 'animate-breathe' : undefined} />
              ))}
              {view.outlineD && !view.provs.length ? (
                <path d={view.outlineD} fill={`color-mix(in srgb,${accent} 14%,transparent)`} stroke={accent} strokeWidth="1" strokeOpacity="0.9" />
              ) : null}
              {/* propagation corridors */}
              {view.nodes.slice(0, view.nodes.length - 1).map((nd, i) => {
                const nx = view.nodes[i + 1]!;
                const cr = geo.corridors[i % Math.max(1, geo.corridors.length)];
                return <line key={`c${i}`} x1={nd.x} y1={nd.y} x2={nx.x} y2={nx.y} stroke={ac(cr?.tone ?? 'ok')} strokeWidth="1" strokeDasharray="5 5" className="animate-dash-flow" style={{ opacity: 0.55 }} />;
              })}
              {/* telemetry nodes */}
              {view.nodes.map((nd, i) => {
                const col = ac(nd.t); const r = 2.4 + (nd.v / 100) * 4;
                return (
                  <g key={`n${i}`}>
                    {nd.t === 'alert' ? <circle cx={nd.x} cy={nd.y} r={r + 7} fill="none" stroke={col} strokeWidth="0.8" className="animate-diffuse" style={{ transformOrigin: `${nd.x}px ${nd.y}px` }} /> : null}
                    <circle cx={nd.x} cy={nd.y} r={r + 3} fill={col} fillOpacity="0.14" />
                    <circle cx={nd.x} cy={nd.y} r={r} fill={col} fillOpacity="0.92" stroke="#03060c" strokeWidth="0.7"
                      className={nd.t !== 'ok' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 ${r}px ${col})` }} />
                    {nd.label ? <text x={nd.x} y={nd.y - r - 3} textAnchor="middle" fontSize="7" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono,monospace)' }}>{nd.label}</text> : null}
                  </g>
                );
              })}
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute bottom-1 left-2 right-2 flex flex-wrap items-center gap-x-3 text-[7px] uppercase tracking-wider text-ink-muted">
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('ok') }} /> nominal</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('warn') }} /> elevated</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('alert') }} /> critical</span>
          <span className="ml-auto rounded-[2px] bg-black/40 px-1 py-0.5">{entry ? (entry.provinces ? `${entry.provinces} PROV` : 'NATIONAL') : ''} · {metric.toUpperCase()}</span>
        </div>
      </div>
    </section>
  );
}
