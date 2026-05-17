'use client';

// Shared national geospatial intelligence map. Renders the REAL national
// outline and REAL provinces/states of a selected country (public-domain
// Natural Earth admin-1, projected with d3-geo) and overlays the live
// deterministic health telemetry onto true administrative geography.
// Country + language selectable. Backward-compatible API.

import * as React from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ac } from '@/apps/_shared/AppKit';
import {
  COUNTRIES, LANGS, loadCountry, provinceLabel,
  type Admin1Country, type Lang,
} from '@/lib/geo/admin1';
import type { HealthGeo } from '@/lib/gov/health-geo';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';
const tone = (v: number): 'ok' | 'warn' | 'alert' => (v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok');

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

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    loadCountry(cc).then(d => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, [cc]);

  const view = React.useMemo(() => {
    if (!data || data.provinces.length === 0) return null;
    const fc = {
      type: 'FeatureCollection' as const,
      features: data.provinces.map(p => ({ type: 'Feature' as const, properties: {}, geometry: p.geometry })),
    };
    const proj = geoMercator().fitExtent([[3, 3], [97, 97]], fc as never);
    const path = geoPath(proj);
    const provs = data.provinces.map((p, i) => {
      const reg = geo.regions[i % geo.regions.length];
      const v = reg ? reg[metric] : 50;
      const tn = tone(v);
      const c = proj([p.lng, p.lat]);
      return { p, d: path({ type: 'Feature', properties: {}, geometry: p.geometry } as never) || '', cx: c?.[0] ?? null, cy: c?.[1] ?? null, v, tn };
    });
    return { provs };
  }, [data, geo, metric]);

  const entry = COUNTRIES.find(c => c.iso3 === cc);

  return (
    <section className="rounded-[3px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)', background: '#05090f' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb,#16222e 90%,transparent)' }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">{title || (entry ? entry.name : cc)}</h3>
        <div className="flex items-center gap-1.5">
          <select aria-label="Country" value={cc} onChange={e => setCc(e.target.value)}
            className="rounded-[3px] border bg-[#0b1320] px-1.5 py-0.5 text-[8.5px] text-ink-soft"
            style={{ borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)' }}>
            {COUNTRIES.map(c => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
          </select>
          <select aria-label="Language" value={lg} onChange={e => setLg(e.target.value as Lang)}
            className="rounded-[3px] border bg-[#0b1320] px-1.5 py-0.5 text-[8.5px] text-ink-soft"
            style={{ borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)' }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div className="relative p-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height }} role="img" aria-label={`${entry?.name ?? cc} — ${metric}`}>
          <defs>
            <radialGradient id="gm-bg2" cx="50%" cy="42%" r="80%">
              <stop offset="0%" stopColor="#0a1a2a" /><stop offset="60%" stopColor="#070f18" /><stop offset="100%" stopColor="#04070d" />
            </radialGradient>
            <filter id="gm-soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.6" /></filter>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#gm-bg2)" />

          {loading || !view ? (
            <text x="50" y="50" textAnchor="middle" fontSize="3.4" fill="rgb(var(--c-ink-muted))" className="uppercase" style={{ letterSpacing: '0.16em' }}>
              {loading ? 'Loading territory…' : 'No geographic data'}
            </text>
          ) : (
            <>
              {/* glow underlay of full territory */}
              {view.provs.map((pr, i) => (
                <path key={`g${i}`} d={pr.d} fill="none" stroke={accent} strokeWidth="1.3" strokeOpacity="0.22" filter="url(#gm-soft2)" />
              ))}
              {/* real provinces — fill by live metric */}
              {view.provs.map((pr, i) => (
                <path key={`p${i}`} d={pr.d} fill={ac(pr.tn)} fillOpacity={0.16 + (pr.v / 100) * 0.5}
                  stroke={`color-mix(in srgb,${accent} 60%,transparent)`} strokeWidth="0.32" strokeOpacity="0.85"
                  className={pr.tn === 'alert' ? 'animate-breathe' : undefined} />
              ))}
              {/* corridors between province centroids */}
              {view.provs.slice(0, view.provs.length - 1).map((pr, i) => {
                const nx = view.provs[i + 1];
                if (pr.cx == null || nx?.cx == null) return null;
                const cr = geo.corridors[i % Math.max(1, geo.corridors.length)];
                const cl = ac(cr?.tone ?? 'ok');
                return <line key={`c${i}`} x1={pr.cx} y1={pr.cy ?? 0} x2={nx.cx} y2={nx.cy ?? 0} stroke={cl} strokeWidth="0.35" strokeDasharray="2 2" className="animate-dash-flow" style={{ opacity: 0.6 }} />;
              })}
              {/* province pins + labels */}
              {view.provs.map((pr, i) => {
                if (pr.cx == null || pr.cy == null) return null;
                const col = ac(pr.tn);
                const rad = 0.9 + (pr.v / 100) * 1.7;
                return (
                  <g key={`n${i}`}>
                    {pr.tn === 'alert' ? <circle cx={pr.cx} cy={pr.cy} r={rad + 2.6} fill="none" stroke={col} strokeWidth="0.35" className="animate-diffuse" style={{ transformOrigin: `${pr.cx}px ${pr.cy}px` }} /> : null}
                    <circle cx={pr.cx} cy={pr.cy} r={rad} fill={col} fillOpacity="0.9" stroke="#04070d" strokeWidth="0.3" style={{ filter: `drop-shadow(0 0 ${rad}px ${col})` }} />
                    <text x={pr.cx} y={pr.cy - rad - 1.1} textAnchor="middle" fontSize="2" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono,monospace)' }}>{provinceLabel(pr.p, lg)}</text>
                  </g>
                );
              })}
            </>
          )}
        </svg>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] uppercase tracking-wider text-ink-muted">
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('ok') }} /> nominal</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('warn') }} /> elevated</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('alert') }} /> critical</span>
          <span className="ml-auto">{entry ? `${entry.provinces} provinces` : ''} · metric · {metric}</span>
        </div>
      </div>
    </section>
  );
}
