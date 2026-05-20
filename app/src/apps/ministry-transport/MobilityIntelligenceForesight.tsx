'use client';

// Transport — Mobility Intelligence & Long-Horizon Forecasting.
// 25-year passenger/freight horizon (ribbon chart), climate-mobility
// risk matrix, freight bottleneck ledger, mobility anomaly stream.

import * as React from 'react';
import { transportExtendedBoard, type ClimateMobilityRisk, type FreightBottleneck, type MobilityAnomaly, type TransportMode } from '@/lib/gov/transport-extended';

const STEEL_DEEP = '#0d1117';
const STEEL = '#161b22';
const PANEL = '#1c2330';
const PANEL2 = '#222a38';
const ORANGE = '#e0673a';
const AMBER = '#f0a13a';
const TEAL = '#3aa39c';
const NAVY = '#3a5680';
const RED = '#c44a3a';
const INK = '#d8dde2';
const PARCH = '#eaecef';
const MUT = '#7e8590';
const RULE = 'rgba(224,103,58,0.22)';

const CLIMATE_COL: Record<ClimateMobilityRisk['classification'], string> = {
  low: TEAL, moderate: AMBER, elevated: ORANGE, severe: RED,
};
const BOTTLENECK_COL: Record<FreightBottleneck['classification'], string> = {
  flowing: TEAL, thinning: AMBER, congested: ORANGE, critical: RED,
};
const TIER_COL: Record<MobilityAnomaly['tier'], string> = {
  observation: NAVY, elevated: AMBER, urgent: ORANGE, critical: RED,
};
const MODE_GLYPH: Record<TransportMode, string> = {
  highway: '▰', rail: '═', aviation: '✈', maritime: '⛴', 'urban-transit': '◐', 'bridge-tunnel': '⌒',
};
const HAZARD_GLYPH: Record<ClimateMobilityRisk['hazard'], string> = {
  'flood-corridor': '≋', 'heatwave-rail-buckling': '☀', 'wildfire-airspace': '🜂', 'storm-aviation': '⛈', 'sea-level-port': '⌒', 'permafrost-thaw-road': '◌',
};
const SIGNAL_GLYPH: Record<MobilityAnomaly['signal'], string> = {
  'unusual-corridor-load': '↯', 'unscheduled-rail-stop': '═', 'port-clearance-spike': '⛴', 'aviation-diversion-cluster': '✈', 'evac-route-engagement': '⇉', 'sensor-blackout': '◌',
};

// Ribbon chart — two stacked series on one chart
function RibbonChart({ passenger, freight, label, unit }: { passenger: number[]; freight: number[]; label: string; unit?: string }) {
  const w = 280, h = 90, padT = 8, padB = 22, padL = 8, padR = 8;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const all = [...passenger, ...freight];
  const min = Math.min(...all), max = Math.max(...all);
  const range = Math.max(1, max - min);
  const passPts = passenger.map((v, i) => ({ x: padL + (i / 4) * plotW, y: padT + plotH - ((v - min) / range) * plotH }));
  const frPts = freight.map((v, i) => ({ x: padL + (i / 4) * plotW, y: padT + plotH - ((v - min) / range) * plotH }));
  const passPath = `M${passPts.map(p => `${p.x} ${p.y}`).join(' L')}`;
  const frPath = `M${frPts.map(p => `${p.x} ${p.y}`).join(' L')}`;
  return (
    <div className="px-4 py-3" style={{ background: STEEL, border: `1px solid ${RULE}` }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1 block" aria-hidden>
        {[0.25, 0.5, 0.75].map(p => <line key={p} x1={padL} y1={padT + plotH * p} x2={w - padR} y2={padT + plotH * p} stroke={STEEL_DEEP} />)}
        {/* freight ribbon */}
        <path d={frPath} stroke={ORANGE} strokeWidth={2} fill="none" />
        {/* passenger ribbon */}
        <path d={passPath} stroke={TEAL} strokeWidth={2} fill="none" strokeDasharray="4 3" />
        {passPts.map((p, i) => <circle key={`p${i}`} cx={p.x} cy={p.y} r={2.5} fill={TEAL} />)}
        {frPts.map((p, i) => <circle key={`f${i}`} cx={p.x} cy={p.y} r={2.5} fill={ORANGE} />)}
        {passenger.map((_, i) => {
          const x = padL + (i / 4) * plotW;
          return <text key={`x${i}`} x={x} y={h - 6} fontSize={7.5} textAnchor="middle" fill={MUT}>+{[5, 10, 15, 20, 25][i]}y</text>;
        })}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[9.5px]">
        <span style={{ color: TEAL }}>● PASSENGER {passenger[passenger.length - 1]}{unit ?? ''}</span>
        <span style={{ color: ORANGE }}>● FREIGHT {freight[freight.length - 1]}{unit ?? ''}</span>
      </div>
    </div>
  );
}

// Single-series horizon trace
function HorizonTrace({ label, series, color, unit, max = 100 }: { label: string; series: number[]; color: string; unit?: string; max?: number }) {
  const w = 280, h = 80, padT = 6, padB = 18, padL = 8, padR = 8;
  const plotH = h - padT - padB;
  const plotW = w - padL - padR;
  const min = Math.min(...series);
  const seriesMax = Math.max(...series, max);
  const range = Math.max(1, seriesMax - min);
  const pts = series.map((v, i) => ({ x: padL + (i / 4) * plotW, y: padT + plotH - ((v - min) / range) * plotH }));
  const path = `M${pts.map(p => `${p.x} ${p.y}`).join(' L')}`;
  const area = `${path} L${pts[pts.length - 1]!.x} ${h - padB} L${pts[0]!.x} ${h - padB} Z`;
  return (
    <div className="px-4 py-3" style={{ background: STEEL, border: `1px solid ${RULE}` }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1 block" aria-hidden>
        {[0.25, 0.5, 0.75].map(p => <line key={p} x1={padL} y1={padT + plotH * p} x2={w - padR} y2={padT + plotH * p} stroke={STEEL_DEEP} />)}
        <path d={area} fill={color} fillOpacity={0.22} />
        <path d={path} stroke={color} strokeWidth={2} fill="none" />
        {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={2.5} fill={color} /><text x={p.x} y={h - 4} fontSize={7.5} textAnchor="middle" fill={MUT}>+{[5, 10, 15, 20, 25][i]}y</text></g>)}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[10px]">
        <span style={{ color: MUT }}>NOW <span className="tabular-nums" style={{ color: INK }}>{series[0]}{unit ?? ''}</span></span>
        <span style={{ color: MUT }}>+25Y <span className="tabular-nums" style={{ color }}>{series[series.length - 1]}{unit ?? ''}</span></span>
      </div>
    </div>
  );
}

export function MobilityIntelligenceForesight({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportExtendedBoard(now);
  const i = b.intelligence;
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #0d1117 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: ORANGE }}>NLO ▸ MOBILITY INTELLIGENCE &amp; LONG-HORIZON FORESIGHT</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              25-year sovereign mobility trajectory · AI reasoning {i.aiReasoningCoveragePct}% · {i.anomalies.length} live signals
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center" style={{ minWidth: '280px' }}>
            {[
              { l: 'Long-horizon resilience', v: i.longHorizonResilienceIdx, c: i.longHorizonResilienceIdx >= 75 ? TEAL : i.longHorizonResilienceIdx >= 55 ? AMBER : RED },
              { l: 'Systemic mobility risk', v: i.systemicMobilityRisk, c: i.systemicMobilityRisk >= 60 ? RED : i.systemicMobilityRisk >= 30 ? AMBER : TEAL },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: STEEL, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 25-year demand horizon */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>↗ 25-YEAR MOBILITY HORIZON · PASSENGER ⇆ FREIGHT</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <RibbonChart passenger={i.demand.passengerKmTrajectory} freight={i.demand.freightTonKmTrajectory} label="Passenger-km vs Freight-ton-km" />
          <HorizonTrace label="Electrification share" series={i.demand.electrificationShareTrajectory} color={TEAL} unit="%" />
          <HorizonTrace label="Congestion index" series={i.demand.congestionIndexTrajectory} color={RED} />
          <HorizonTrace label="Infrastructure resilience" series={i.demand.infrastructureResilienceTrajectory} color={NAVY} />
          <HorizonTrace label="Modal shift to rail" series={i.demand.modalShiftTowardsRailPctTrajectory} color={AMBER} unit="%" />
        </div>
      </section>

      {/* Climate risk matrix */}
      <section className="px-8 py-5" style={{ background: STEEL, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>⚠ CLIMATE-MOBILITY RISK MATRIX</h3>
        <div className="overflow-hidden" style={{ background: STEEL_DEEP }}>
          <div className="grid grid-cols-[40px_1fr_90px_90px_100px_120px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL }}>
            <span></span><span>Hazard</span><span className="text-right">Prob 12m</span><span className="text-right">Impact</span><span className="text-right">Prep.</span><span>Composite</span><span className="text-right">Class</span>
          </div>
          {i.climateRisks.map(r => {
            const col = CLIMATE_COL[r.classification];
            return (
              <div key={r.hazard} className="grid grid-cols-[40px_1fr_90px_90px_100px_120px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${STEEL_DEEP}` }}>
                <span className="text-center text-[14px]" style={{ color: col }}>{HAZARD_GLYPH[r.hazard]}</span>
                <span style={{ color: PARCH }}>{r.hazard.replace(/-/g, ' ')}</span>
                <span className="text-right tabular-nums" style={{ color: r.probabilityNext12mPct >= 50 ? RED : r.probabilityNext12mPct >= 25 ? AMBER : INK }}>{r.probabilityNext12mPct}%</span>
                <span className="text-right tabular-nums" style={{ color: r.impactIfRealisedIdx >= 80 ? RED : AMBER }}>{r.impactIfRealisedIdx}</span>
                <span className="text-right tabular-nums" style={{ color: r.preparednessIdx >= 70 ? TEAL : AMBER }}>{r.preparednessIdx}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1" style={{ background: STEEL_DEEP }}>
                    <div className="h-full" style={{ width: `${Math.min(100, r.composite)}%`, background: col }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: col }}>{r.composite}</span>
                </div>
                <span className="text-right text-[9.5px] uppercase tracking-[0.22em]" style={{ color: col }}>● {r.classification}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Freight bottlenecks + anomalies */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>📦 FREIGHT BOTTLENECK LEDGER</h3>
          <div className="space-y-2">
            {i.bottlenecks.map(f => (
              <div key={f.id} className="grid grid-cols-[28px_1fr_70px_70px_120px_80px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: STEEL, borderLeft: `2px solid ${BOTTLENECK_COL[f.classification]}` }}>
                <span className="text-center text-[14px]" style={{ color: BOTTLENECK_COL[f.classification] }}>{MODE_GLYPH[f.mode]}</span>
                <div>
                  <div style={{ color: PARCH }}>{f.corridor}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{f.mode}</div>
                </div>
                <span className="text-right tabular-nums" style={{ color: f.utilisationPct >= 100 ? RED : f.utilisationPct >= 85 ? ORANGE : INK }}>{f.utilisationPct}%</span>
                <span className="text-right tabular-nums" style={{ color: f.averageDelayHrs >= 24 ? RED : AMBER }}>+{f.averageDelayHrs}h</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1" style={{ background: STEEL_DEEP }}>
                    <div className="h-full" style={{ width: `${f.vulnerabilityIdx}%`, background: BOTTLENECK_COL[f.classification] }} />
                  </div>
                  <span className="tabular-nums text-[9.5px]" style={{ color: BOTTLENECK_COL[f.classification] }}>{f.vulnerabilityIdx}</span>
                </div>
                <span className="text-right text-[9px] uppercase tracking-[0.2em]" style={{ color: BOTTLENECK_COL[f.classification] }}>● {f.classification}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>◧ MOBILITY ANOMALY STREAM · TIER-SORTED</h3>
          <div className="space-y-2">
            {i.anomalies.map(a => (
              <div key={a.id} className="grid grid-cols-[28px_1fr_60px_60px_90px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${TIER_COL[a.tier]}` }}>
                <span className="text-center text-[14px]" style={{ color: TIER_COL[a.tier] }}>{SIGNAL_GLYPH[a.signal]}</span>
                <div>
                  <div style={{ color: PARCH }}>{a.signal.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{a.region} · {a.detectedHrsAgo}h</div>
                </div>
                <span className="text-right tabular-nums" style={{ color: AMBER }}>{a.confidence}</span>
                <span className="text-right tabular-nums text-[9.5px]" style={{ color: MUT }}>{a.id.slice(-5)}</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: TIER_COL[a.tier] }}>● {a.tier}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />
      {void PANEL2}
    </div>
  );
}
