'use client';

// Shared national geospatial intelligence map. A living SVG: corridors as
// flowing dashed lines (load-coloured), region nodes as diffuse-pulsing
// rings sized by a chosen metric, moving asset dots. Reused by every
// domain with its own metric so each map reads differently.

import * as React from 'react';
import { ac } from '@/apps/_shared/AppKit';
import type { HealthGeo, GeoRegion } from '@/lib/gov/health-geo';

type Metric = 'pressure' | 'icuLoad' | 'outbreakHeat';

export function GeoMap({ geo, metric, title, height = 300 }: {
  geo: HealthGeo; metric: Metric; title: string; height?: number;
}) {
  const val = (r: GeoRegion) => r[metric];
  const tone = (v: number): 'ok' | 'warn' | 'alert' => (v >= 80 ? 'alert' : v >= 58 ? 'warn' : 'ok');
  return (
    <section className="rounded-[3px] border border-line bg-[#070b10]">
      <div className="flex items-center justify-between gap-2 border-b border-[#16222e] px-2.5 py-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">{title}</h3>
        <span className="font-mono text-[9px] tabular-nums text-ink-muted">{geo.assets.length} assets in motion · {geo.corridors.length} corridors</span>
      </div>
      <div className="relative p-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height }} role="img" aria-label={title}>
          <defs>
            <radialGradient id="gm-bg" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#0c1622" />
              <stop offset="100%" stopColor="#070b10" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#gm-bg)" />
          {/* corridors — flowing dashed lines, colour = load */}
          {geo.corridors.map((c, i) => (
            <line key={i} x1={c.fx} y1={c.fy} x2={c.tx} y2={c.ty}
              stroke={ac(c.tone)} strokeWidth={c.tone === 'alert' ? 0.7 : 0.45}
              strokeDasharray="2 2" className="animate-dash-flow"
              style={{ opacity: 0.5 }} />
          ))}
          {/* region nodes — diffuse pulse ring when critical */}
          {geo.regions.map(r => {
            const v = val(r);
            const tn = tone(v);
            const rad = 2.4 + (v / 100) * 4.2;
            return (
              <g key={r.region}>
                {tn === 'alert' ? (
                  <circle cx={r.x} cy={r.y} r={rad + 3} fill="none" stroke={ac('alert')} strokeWidth="0.5" className="animate-diffuse" style={{ transformOrigin: `${r.x}px ${r.y}px` }} />
                ) : null}
                <circle cx={r.x} cy={r.y} r={rad} fill={ac(tn)} fillOpacity={0.22} stroke={ac(tn)} strokeWidth="0.5"
                  className={tn !== 'ok' ? 'animate-breathe' : undefined} />
                <text x={r.x} y={r.y - rad - 1.4} textAnchor="middle" fontSize="2.4" fill="rgb(var(--c-ink-soft))" style={{ fontFamily: 'var(--font-mono, monospace)' }}>{r.region}</text>
                <text x={r.x} y={r.y + 0.9} textAnchor="middle" fontSize="3" fontWeight="700" fill={ac(tn)}>{v}</text>
              </g>
            );
          })}
          {/* moving assets */}
          {geo.assets.map(a => (
            <circle key={a.id} cx={a.x} cy={a.y} r={a.kind === 'ambulance' ? 0.95 : 0.7}
              fill={a.kind === 'ambulance' ? ac(a.tone) : 'rgb(var(--c-ink-muted))'}>
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
