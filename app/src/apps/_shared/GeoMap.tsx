'use client';

// Shared national geospatial intelligence map. A cinematic living SVG: a
// glowing national territory landmass with a clipped graticule, dense
// deterministic health-node clusters that bloom on hot regions, outbreak
// heat halos, glowing flowing corridors and moving assets. Reused by every
// domain with its own metric so each map reads differently. Pure &
// deterministic (seeded) — SSR-safe.

import * as React from 'react';
import { ac } from '@/apps/_shared/AppKit';
import { seed } from '@/lib/telemetry';
import type { HealthGeo, GeoRegion } from '@/lib/gov/health-geo';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';

// Stylised national landmass — expanded hull of the region coords, smoothed
// into an organic territory. Centroid ≈ (47.8, 54.2).
const HULL: [number, number][] = [
  [47, 17], [82, 44], [63, 84], [28, 79], [19, 47],
];
const CX = 47.8, CY = 54.2, EXPAND = 1.42;
function territoryPath(): string {
  const pts = HULL.map(([x, y]) => [CX + (x - CX) * EXPAND, CY + (y - CY) * EXPAND] as [number, number]);
  const n = pts.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${mid(pts[n - 1]!, pts[0]!).join(' ')}`;
  for (let i = 0; i < n; i++) {
    const cur = pts[i]!, nxt = pts[(i + 1) % n]!;
    const m = mid(cur, nxt);
    d += ` Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]}`;
  }
  return d + ' Z';
}
const TERR = territoryPath();

export function GeoMap({ geo, metric, title, height = 300, accent = '#37c7d4' }: {
  geo: HealthGeo; metric: Metric; title: string; height?: number; accent?: string;
}) {
  const val = (r: GeoRegion) => r[metric];
  const tone = (v: number): 'ok' | 'warn' | 'alert' => (v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok');

  return (
    <section className="rounded-[3px] border" style={{ borderColor: 'color-mix(in srgb,#1d3548 70%,transparent)', background: '#05090f' }}>
      <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1.5" style={{ borderColor: 'color-mix(in srgb,#16222e 90%,transparent)' }}>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">{title}</h3>
        <span className="font-mono text-[9px] tabular-nums text-ink-muted">{geo.assets.length} assets in motion · {geo.corridors.length} corridors</span>
      </div>
      <div className="relative p-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height }} role="img" aria-label={title}>
          <defs>
            <radialGradient id="gm-bg" cx="50%" cy="42%" r="80%">
              <stop offset="0%" stopColor="#0a1a2a" />
              <stop offset="60%" stopColor="#070f18" />
              <stop offset="100%" stopColor="#04070d" />
            </radialGradient>
            <linearGradient id="gm-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`color-mix(in srgb,${accent} 26%,#0c1a26)`} />
              <stop offset="55%" stopColor="#0b1622" />
              <stop offset="100%" stopColor="#081019" />
            </linearGradient>
            <radialGradient id="gm-bloom-alert" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ac('alert')} stopOpacity="0.55" />
              <stop offset="45%" stopColor={ac('alert')} stopOpacity="0.18" />
              <stop offset="100%" stopColor={ac('alert')} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gm-bloom-warn" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ac('warn')} stopOpacity="0.42" />
              <stop offset="50%" stopColor={ac('warn')} stopOpacity="0.13" />
              <stop offset="100%" stopColor={ac('warn')} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gm-bloom-ok" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ac('ok')} stopOpacity="0.3" />
              <stop offset="55%" stopColor={ac('ok')} stopOpacity="0.08" />
              <stop offset="100%" stopColor={ac('ok')} stopOpacity="0" />
            </radialGradient>
            <clipPath id="gm-clip"><path d={TERR} /></clipPath>
            <filter id="gm-soft" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="0.7" />
            </filter>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill="url(#gm-bg)" />

          {/* territory landmass + glow */}
          <path d={TERR} fill="none" stroke={accent} strokeWidth="1.4" strokeOpacity="0.25" filter="url(#gm-soft)" />
          <path d={TERR} fill="url(#gm-land)" stroke={`color-mix(in srgb,${accent} 70%,transparent)`} strokeWidth="0.45" strokeOpacity="0.8" />

          {/* graticule clipped to territory */}
          <g clipPath="url(#gm-clip)" stroke={accent} strokeWidth="0.18" strokeOpacity="0.14">
            {Array.from({ length: 13 }, (_, i) => 8 + i * 7).map(p => (
              <React.Fragment key={p}>
                <line x1={p} y1="0" x2={p} y2="100" />
                <line x1="0" y1={p} x2="100" y2={p} />
              </React.Fragment>
            ))}
          </g>

          {/* outbreak / pressure heat blooms under hot regions */}
          <g clipPath="url(#gm-clip)">
            {geo.regions.map(r => {
              const v = val(r); const tn = tone(v);
              const rad = 9 + (v / 100) * 16;
              return <ellipse key={`b-${r.region}`} cx={r.x} cy={r.y} rx={rad} ry={rad * 0.82} fill={`url(#gm-bloom-${tn})`} />;
            })}
          </g>

          {/* dense deterministic health-node clusters */}
          <g clipPath="url(#gm-clip)">
            {geo.regions.flatMap(r => {
              const v = val(r); const col = ac(tone(v)); const tn = tone(v);
              const count = 7 + Math.round((v / 100) * 22);
              const spread = 4 + (v / 100) * 9;
              return Array.from({ length: count }, (_, i) => {
                const a = seed(`${r.region}|a|${i}`) * Math.PI * 2;
                const dist = (0.18 + 0.82 * seed(`${r.region}|d|${i}`)) * spread;
                const x = r.x + Math.cos(a) * dist * 1.08;
                const y = r.y + Math.sin(a) * dist;
                const rr = 0.34 + seed(`${r.region}|r|${i}`) * 0.62;
                const flick = seed(`${r.region}|f|${i}`) > 0.78;
                return (
                  <circle key={`${r.region}-${i}`} cx={x} cy={y} r={rr} fill={col}
                    fillOpacity={0.32 + seed(`${r.region}|o|${i}`) * 0.45}
                    className={flick && tn !== 'ok' ? 'animate-breathe' : undefined}
                    style={{ filter: `drop-shadow(0 0 ${rr}px ${col})` }} />
                );
              });
            })}
          </g>

          {/* corridors — glowing flowing lines */}
          {geo.corridors.map((c, i) => (
            <g key={i}>
              <line x1={c.fx} y1={c.fy} x2={c.tx} y2={c.ty} stroke={ac(c.tone)} strokeWidth={c.tone === 'alert' ? 1.6 : 1.1} strokeOpacity="0.18" filter="url(#gm-soft)" />
              <line x1={c.fx} y1={c.fy} x2={c.tx} y2={c.ty} stroke={ac(c.tone)} strokeWidth={c.tone === 'alert' ? 0.6 : 0.4}
                strokeDasharray="2.4 2.4" className="animate-dash-flow" style={{ opacity: 0.85 }} />
            </g>
          ))}

          {/* region pins */}
          {geo.regions.map(r => {
            const v = val(r); const tn = tone(v); const col = ac(tn);
            const rad = 1.7 + (v / 100) * 2.4;
            return (
              <g key={r.region}>
                {tn === 'alert' ? (
                  <circle cx={r.x} cy={r.y} r={rad + 3.4} fill="none" stroke={col} strokeWidth="0.4" className="animate-diffuse" style={{ transformOrigin: `${r.x}px ${r.y}px` }} />
                ) : null}
                <circle cx={r.x} cy={r.y} r={rad + 1.4} fill={col} fillOpacity="0.16" />
                <circle cx={r.x} cy={r.y} r={rad} fill={col} fillOpacity="0.9" stroke="#04070d" strokeWidth="0.4"
                  className={tn !== 'ok' ? 'animate-breathe' : undefined} style={{ filter: `drop-shadow(0 0 ${rad}px ${col})` }} />
                <text x={r.x} y={r.y - rad - 2} textAnchor="middle" fontSize="2.5" fontWeight="600" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono, monospace)' }}>{r.region}</text>
                <text x={r.x} y={r.y + 0.95} textAnchor="middle" fontSize="2.9" fontWeight="800" fill="#04070d">{v}</text>
              </g>
            );
          })}

          {/* moving assets */}
          {geo.assets.map(a => (
            <circle key={a.id} cx={a.x} cy={a.y} r={a.kind === 'ambulance' ? 0.95 : 0.7}
              fill={a.kind === 'ambulance' ? ac(a.tone) : '#7f93a6'}
              style={{ filter: a.kind === 'ambulance' ? `drop-shadow(0 0 1.4px ${ac(a.tone)})` : undefined }}>
              <title>{a.kind} · {a.corridor}</title>
            </circle>
          ))}
        </svg>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8px] uppercase tracking-wider text-ink-muted">
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('ok') }} /> nominal</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('warn') }} /> elevated</span>
          <span><span className="inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: ac('alert') }} /> critical</span>
          <span className="ml-auto">metric · {metric}</span>
        </div>
      </div>
    </section>
  );
}
