'use client';

// Environment — Ecological Foresight & Crisis Coordination.
// Pollution & compliance ledger, climate-emergency chronology with
// cross-ministry cascade, and 25-year planetary trajectory rendered
// as topographic horizon curves at 5 inflection points.

import * as React from 'react';
import { climateResilienceBoard, type ClimateIncident } from '@/lib/gov/climate-resilience';

const FOREST = '#20392c';
const FOREST_DEEP = '#152721';
const CANOPY = '#4f7a5e';
const PANEL = '#1a221f';
const ATMOS = '#6a7d8a';
const SKY = '#314050';
const EARTH = '#5a4a35';
const GLACIER = '#e5e8e6';
const AMBER = '#b88b3a';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const SEV_COL: Record<ClimateIncident['severity'], string> = {
  advisory: ATMOS, elevated: AMBER, critical: '#a05538', national: ALERT,
};

function HorizonCurve({ label, series, color, baseline = 50, unit = '' }: { label: string; series: number[]; color: string; baseline?: number; unit?: string }) {
  const w = 280, h = 80;
  const padX = 6;
  const min = Math.min(...series, baseline);
  const max = Math.max(...series, baseline);
  const range = Math.max(1, max - min);
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = +(end - start).toFixed(1);
  const xs = series.map((_, i) => padX + (i / (series.length - 1)) * (w - 2 * padX));
  const ys = series.map(v => h - 8 - ((v - min) / range) * (h - 18));
  // smooth horizon path (no straight lines — curves)
  const path = xs.map((x, i) => {
    const y = ys[i]!;
    if (i === 0) return `M${x},${y}`;
    const px = xs[i - 1]!; const py = ys[i - 1]!;
    const cx = (px + x) / 2;
    return `Q${cx},${py} ${x},${y}`;
  }).join(' ');
  return (
    <div className="px-4 py-4" style={{ background: PANEL, border: '1px solid rgba(229,232,230,0.06)' }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {/* contour ticks */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={padX} y1={padX + p * (h - 12)} x2={w - padX} y2={padX + p * (h - 12)} stroke="rgba(229,232,230,0.06)" />
        ))}
        {/* baseline horizon */}
        <line x1={padX} y1={h - 8 - ((baseline - min) / range) * (h - 18)} x2={w - padX}
          y2={h - 8 - ((baseline - min) / range) * (h - 18)} stroke={EARTH} strokeOpacity={0.5} strokeDasharray="2 4" />
        {/* fill below */}
        <path d={`${path} L${xs[xs.length - 1]},${h - 4} L${xs[0]},${h - 4} Z`} fill={color} fillOpacity={0.16} />
        {/* horizon */}
        <path d={path} stroke={color} strokeWidth={2} fill="none" />
        {/* nodes */}
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r={2.5} fill={color} />
            <text x={x} y={h - 0.5} fontSize={7} fill={MUT} textAnchor="middle">+{[5, 10, 15, 20, 25][i]}y</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[10px]">
        <span style={{ color: MUT }}>now <span className="tabular-nums ml-1" style={{ color: INK }}>{start}{unit}</span></span>
        <span style={{ color: delta >= 0 ? CANOPY : ALERT }}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}{unit}</span>
        <span style={{ color: MUT }}>+25y <span className="tabular-nums ml-1" style={{ color }}>{end}{unit}</span></span>
      </div>
    </div>
  );
}

export function EcologicalForesightCrisis({ id, now }: { id: string; now: number }) {
  void id;
  const b = climateResilienceBoard(now);
  const f = b.forecast;
  const p = b.pollution;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Header strip */}
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #2a3a48 0%, #152721 100%)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.7 }}>Ecological Foresight &amp; Crisis Coordination</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>25-year planetary trajectory · {b.incidents.length} active ecological incidents</h2>
          </div>
          <div className="grid grid-cols-3 gap-x-6 text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: GLACIER, opacity: 0.85 }}>
            <div>
              <div>Planetary resilience</div>
              <div className="mt-1 tabular-nums text-[15px]" style={{ color: f.planetaryResilienceIdx >= 70 ? CANOPY : f.planetaryResilienceIdx >= 55 ? ATMOS : ALERT }}>{f.planetaryResilienceIdx}</div>
            </div>
            <div>
              <div>Collapse risk</div>
              <div className="mt-1 tabular-nums text-[15px]" style={{ color: f.ecosystemCollapseRisk >= 60 ? ALERT : f.ecosystemCollapseRisk >= 30 ? AMBER : CANOPY }}>{f.ecosystemCollapseRisk}</div>
            </div>
            <div>
              <div>Intergen. continuity</div>
              <div className="mt-1 tabular-nums text-[15px]" style={{ color: f.intergenerationalContinuityIdx >= 70 ? CANOPY : ATMOS }}>{f.intergenerationalContinuityIdx}</div>
            </div>
          </div>
        </div>
      </header>

      {/* 25-year horizon curves */}
      <section className="px-8 py-6" style={{ background: FOREST_DEEP, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="mb-4 text-[9px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>◬ 25-year planetary horizon · +5/+10/+15/+20/+25</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <HorizonCurve label="Temperature anomaly" series={f.temperatureAnomalyTrajectory} color={ALERT} baseline={0} unit="°C" />
          <HorizonCurve label="Biodiversity" series={f.biodiversityTrajectory} color={CANOPY} baseline={70} />
          <HorizonCurve label="Forest cover" series={f.forestCoverTrajectory} color={CANOPY} baseline={40} unit="%" />
          <HorizonCurve label="Water stress" series={f.waterStressTrajectory} color={AMBER} baseline={50} />
          <HorizonCurve label="Carbon continuity" series={f.carbonContinuityTrajectory} color={EARTH} baseline={60} />
        </div>
      </section>

      {/* Pollution & compliance */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: 'rgba(229,232,230,0.06)' }}>
        <div className="px-8 py-6" style={{ background: PANEL }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>▰ Pollution &amp; compliance ledger</h3>
            <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>top emitters · share of national emissions</span>
          </div>
          <div className="space-y-2">
            {p.topEmitters.map(s => (
              <div key={s.sector} className="grid grid-cols-[200px_1fr_60px_60px] items-center gap-3">
                <span className="text-[12px]" style={{ color: GLACIER }}>{s.sector}</span>
                <div className="h-3" style={{ background: '#0b1311' }}>
                  <div className="h-full" style={{
                    width: `${s.sharePct * 3}%`,
                    background: `repeating-linear-gradient(90deg, ${s.tone === 'alert' ? ALERT : s.tone === 'warn' ? AMBER : CANOPY} 0 5px, ${s.tone === 'alert' ? ALERT + 'aa' : s.tone === 'warn' ? AMBER + 'aa' : CANOPY + 'aa'} 5px 10px)`,
                  }} />
                </div>
                <span className="text-right tabular-nums text-[12px]" style={{ color: s.tone === 'alert' ? ALERT : s.tone === 'warn' ? AMBER : CANOPY }}>{s.sharePct}%</span>
                <span className="text-right text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>· {s.tone}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-6" style={{ background: FOREST_DEEP }}>
          <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>◊ Compliance register</div>
          <div className="mt-3 space-y-3 text-[11px]">
            {[
              { l: 'Emissions vs target', v: `${p.emissionsVsTargetPct}%`, t: p.emissionsVsTargetPct > 105 ? ALERT : p.emissionsVsTargetPct > 95 ? AMBER : CANOPY },
              { l: 'Air violations active', v: `${p.airViolationsActive}`, t: p.airViolationsActive >= 8 ? ALERT : p.airViolationsActive >= 4 ? AMBER : CANOPY },
              { l: 'Water violations active', v: `${p.waterViolationsActive}`, t: p.waterViolationsActive >= 6 ? ALERT : p.waterViolationsActive >= 3 ? AMBER : CANOPY },
              { l: 'Hazardous-material', v: `${p.hazardousMaterialIncidents}`, t: p.hazardousMaterialIncidents ? AMBER : CANOPY },
              { l: 'Enforcement actions', v: `${p.enforcementActions}`, t: GLACIER },
              { l: 'Compliance index', v: `${p.complianceIdx}`, t: p.complianceIdx >= 80 ? CANOPY : ATMOS },
            ].map(x => (
              <div key={x.l} className="flex items-baseline justify-between border-b pb-1.5" style={{ borderColor: 'rgba(229,232,230,0.06)' }}>
                <span className="uppercase tracking-[0.22em]" style={{ color: MUT, fontSize: '9px' }}>{x.l}</span>
                <span className="tabular-nums" style={{ color: x.t }}>{x.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <section className="flex flex-wrap items-baseline gap-3 px-8 py-3" style={{ background: PANEL, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
          <span className="text-[9px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>◊ Ecological cascade — ministries engaged</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="px-3 py-1 text-[10.5px]" style={{ background: FOREST_DEEP, border: '1px solid rgba(79,122,94,0.4)', color: INK }}>
              {m.ministry} <span className="ml-1 tabular-nums" style={{ color: AMBER }}>·{m.engaged}</span>
            </span>
          ))}
        </section>
      ) : null}

      {/* Climate emergency chronology */}
      <section className="px-8 py-6" style={{ background: FOREST_DEEP, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>⚠ Climate emergency chronology · cross-ministry cascade</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{b.incidents.length} incidents · severity-sorted</span>
        </div>
        <div className="space-y-3">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="overflow-hidden" style={{ background: PANEL, borderLeft: `4px solid ${SEV_COL[i.severity]}` }}>
              {/* incident header */}
              <div className="flex items-baseline gap-3 px-5 py-2.5" style={{ background: 'rgba(229,232,230,0.03)' }}>
                <span className="tabular-nums text-[10px]" style={{ color: MUT }}>{i.id}</span>
                <span className="text-[12.5px] tracking-[0.04em]" style={{ color: GLACIER }}>{i.kind.replace(/-/g, ' ')}</span>
                <span className="text-[10px]" style={{ color: MUT }}>· {i.region} · {i.ecoregion}</span>
                <span className="ml-auto text-[10px] uppercase tracking-[0.24em]" style={{ color: SEV_COL[i.severity] }}>● {i.severity}</span>
              </div>
              {/* metrics row */}
              <div className="grid grid-cols-3 gap-px md:grid-cols-5" style={{ background: 'rgba(229,232,230,0.06)' }}>
                {[
                  { l: 'age', v: `${i.ageHours}h` },
                  { l: 'population exposed', v: `${i.populationExposedK.toLocaleString()}K` },
                  { l: 'hectares affected', v: `${i.hectaresAffectedK.toLocaleString()}K` },
                  { l: 'pathway', v: i.recoveryPathway.replace(/-/g, ' ') },
                  { l: 'cascade nodes', v: `${i.ministryCascade.length}` },
                ].map(x => (
                  <div key={x.l} className="px-4 py-2" style={{ background: PANEL }}>
                    <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>{x.l}</div>
                    <div className="tabular-nums text-[11px]" style={{ color: INK }}>{x.v}</div>
                  </div>
                ))}
              </div>
              {/* cascade list */}
              <div className="px-5 py-3">
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  {i.ministryCascade.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-[140px_1fr_50px_90px] items-baseline gap-2 px-3 py-1.5 text-[11px]" style={{ background: FOREST_DEEP, borderTop: `1px solid ${c.status === 'cleared' ? CANOPY : c.status === 'engaged' ? AMBER : MUT}` }}>
                      <span style={{ color: INK }}>{c.ministry}</span>
                      <span style={{ color: MUT, fontSize: '10px' }}>{c.effect}</span>
                      <span className="text-right tabular-nums" style={{ color: ATMOS, fontSize: '10px' }}>+{c.delayHrs}h</span>
                      <span className="text-right text-[9px] uppercase tracking-[0.22em]" style={{ color: c.status === 'cleared' ? CANOPY : c.status === 'engaged' ? AMBER : MUT }}>· {c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
        <span className="text-[9px] uppercase tracking-[0.36em]" style={{ color: MUT }}>
          ◬ The biosphere outlives the budget cycle — continuity is measured in generations ◬
        </span>
      </footer>
    </div>
  );
}
