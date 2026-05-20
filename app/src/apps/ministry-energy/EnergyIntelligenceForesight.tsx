'use client';

// Energy — Intelligence & Long-Horizon Forecasting.
// 25-year stepped demand forecast (peak GW + renewable share +
// carbon intensity), climate-energy risk matrix, geopolitical
// exposure ledger, cascading-failure scenario register.
// Industrial palette with electric-green for resilience, amber for
// hazard, red for systemic.

import * as React from 'react';
import { energyExtendedBoard, type ClimateEnergyRisk, type CascadingFailureScenario } from '@/lib/gov/energy-extended';

const STEEL = '#2a323c';
const STEEL_DEEP = '#161b22';
const NAVY = '#1c2b44';
const AMBER = '#d68a2e';
const ELECTRIC = '#5fc4a8';
const ELECTRIC_DIM = '#3e8a76';
const RED = '#b84030';
const INK = '#d8dbe0';
const PARCH = '#ece6d3';
const MUT = '#7e848c';
const RULE = 'rgba(214,138,46,0.22)';

const CLIMATE_COL: Record<ClimateEnergyRisk['classification'], string> = {
  low: ELECTRIC, moderate: AMBER, elevated: '#c75a2a', severe: RED,
};
const SEVERITY_COL: Record<CascadingFailureScenario['impactSeverity'], string> = {
  localised: ELECTRIC, regional: AMBER, national: '#c75a2a', systemic: RED,
};
const HAZARD_GLYPH: Record<ClimateEnergyRisk['hazard'], string> = {
  'heatwave-peak': '☀', 'cold-snap-peak': '❄', 'drought-hydro': '◌', 'wildfire-grid': '🜂', 'flood-substation': '≋', 'storm-line-down': '⛈',
};
const TRIGGER_GLYPH: Record<CascadingFailureScenario['trigger'], string> = {
  'substation-loss': '◬', 'generation-trip': '⚡', 'interconnector-fault': '↯', 'cyber-intrusion': '⌬', 'fuel-interruption': '◇', 'extreme-weather': '⛈',
};
const RESOURCE_GLYPH: Record<string, string> = {
  'crude-oil': '◇', 'refined-fuels': '◆', 'natural-gas': '◌', uranium: '☢', lithium: '⌬', 'rare-earths-grid': '✦',
};

// 25-year stepped horizon trace
function HorizonTrace({ label, series, color, max, unit }: { label: string; series: number[]; color: string; max: number; unit?: string }) {
  const w = 240, h = 70, padT = 6, padB = 18, padL = 8, padR = 8;
  const plotH = h - padT - padB;
  const plotW = w - padL - padR;
  const min = Math.min(...series);
  const seriesMax = Math.max(...series, max);
  const range = Math.max(1, seriesMax - min);
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = end - start;
  return (
    <div className="px-4 py-3" style={{ background: STEEL, border: `1px solid ${RULE}` }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={padL} y1={padT + plotH * p} x2={w - padR} y2={padT + plotH * p} stroke={STEEL_DEEP} />
        ))}
        {series.map((v, i) => {
          const x = padL + (i / (series.length - 1)) * plotW;
          const y = padT + plotH - ((v - min) / range) * plotH;
          if (i === 0) return null;
          const px = padL + ((i - 1) / (series.length - 1)) * plotW;
          const py = padT + plotH - ((series[i - 1]! - min) / range) * plotH;
          return (
            <g key={i}>
              <line x1={px} y1={py} x2={x} y2={py} stroke={color} strokeWidth={1.6} />
              <line x1={x} y1={py} x2={x} y2={y} stroke={color} strokeWidth={1.6} />
            </g>
          );
        })}
        {series.map((v, i) => {
          const x = padL + (i / (series.length - 1)) * plotW;
          const y = padT + plotH - ((v - min) / range) * plotH;
          return (
            <g key={`pt-${i}`}>
              <rect x={x - 3} y={y - 3} width={6} height={6} fill={color} />
              <text x={x} y={h - 4} fontSize={7.5} textAnchor="middle" fill={MUT}>+{[5, 10, 15, 20, 25][i]}y</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[9.5px]">
        <span style={{ color: MUT }}>NOW <span className="tabular-nums" style={{ color: INK }}>{start}{unit ?? ''}</span></span>
        <span style={{ color: delta >= 0 ? ELECTRIC : RED }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}{unit ?? ''}</span>
        <span style={{ color: MUT }}>+25Y <span className="tabular-nums" style={{ color }}>{end}{unit ?? ''}</span></span>
      </div>
    </div>
  );
}

export function EnergyIntelligenceForesight({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyExtendedBoard(now);
  const i = b.intelligence;
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-monospace, "JetBrains Mono", "Inter", system-ui, monospace' }}>
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #161b22 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>NGC ▮ ENERGY INTELLIGENCE &amp; LONG-HORIZON FORESIGHT</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              25-year sovereign energy trajectory · AI reasoning {i.aiReasoningCoveragePct}% · {i.earlyWarningSignalsActive} early-warning signals
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center" style={{ minWidth: '280px' }}>
            {[
              { l: 'Long-horizon resilience', v: i.longHorizonResilienceIdx, c: i.longHorizonResilienceIdx >= 75 ? ELECTRIC : i.longHorizonResilienceIdx >= 55 ? AMBER : RED },
              { l: 'Systemic energy risk', v: i.systemicEnergyRisk, c: i.systemicEnergyRisk >= 60 ? RED : i.systemicEnergyRisk >= 30 ? AMBER : ELECTRIC },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: STEEL, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Demand horizon traces */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↗ 25-YEAR DEMAND HORIZON · +5/+10/+15/+20/+25</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <HorizonTrace label="Peak demand" series={i.demand.peakDemandTrajectoryGw} color={AMBER} max={300} unit="GW" />
          <HorizonTrace label="Renewable share" series={i.demand.renewableShareTrajectoryPct} color={ELECTRIC} max={100} unit="%" />
          <HorizonTrace label="Carbon intensity" series={i.demand.carbonIntensityTrajectory} color={RED} max={500} />
          <HorizonTrace label="Import dependency" series={i.demand.energyImportDependencyTrajectory} color="#c75a2a" max={100} unit="%" />
          <HorizonTrace label="Grid resilience" series={i.demand.gridResilienceTrajectory} color={ELECTRIC_DIM} max={100} />
          <HorizonTrace label="Self-sufficiency" series={i.demand.selfSufficiencyTrajectory} color={NAVY} max={100} unit="%" />
        </div>
      </section>

      {/* Climate risk matrix */}
      <section className="px-8 py-5" style={{ background: STEEL, borderBottom: `1px solid ${RULE}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⚠ CLIMATE-ENERGY RISK MATRIX · {i.climateRisks.length} HAZARDS</h3>
          <span className="text-[9.5px]" style={{ color: MUT }}>composite = (probability × impact) ÷ preparedness</span>
        </div>
        <div className="overflow-hidden" style={{ background: STEEL_DEEP }}>
          <div className="grid grid-cols-[40px_1fr_90px_90px_100px_120px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: NAVY }}>
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
                <span className="text-right tabular-nums" style={{ color: r.preparednessIdx >= 70 ? ELECTRIC : AMBER }}>{r.preparednessIdx}</span>
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

      {/* Geopolitical exposure + cascading scenarios */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>🌍 GEOPOLITICAL EXPOSURE LEDGER</h3>
          <div className="space-y-2">
            {i.geopoliticalExposure.map(g => (
              <div key={g.resource} className="grid grid-cols-[28px_140px_120px_1fr_60px_70px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: STEEL, borderLeft: `2px solid ${g.vulnerabilityIdx >= 70 ? RED : g.vulnerabilityIdx >= 45 ? AMBER : ELECTRIC}` }}>
                <span className="text-[14px] text-center" style={{ color: AMBER }}>{RESOURCE_GLYPH[g.resource]}</span>
                <span style={{ color: PARCH }}>{g.resource.replace(/-/g, ' ')}</span>
                <span style={{ color: INK }}>{g.partner}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1" style={{ background: STEEL_DEEP }}>
                    <div className="h-full" style={{ width: `${g.vulnerabilityIdx}%`, background: g.vulnerabilityIdx >= 70 ? RED : g.vulnerabilityIdx >= 45 ? AMBER : ELECTRIC }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: g.vulnerabilityIdx >= 70 ? RED : AMBER }}>{g.vulnerabilityIdx}</span>
                </div>
                <span className="text-right tabular-nums text-[10px]" style={{ color: g.importSharePct >= 50 ? RED : MUT }}>{g.importSharePct}%</span>
                <span className="text-right tabular-nums text-[10px]" style={{ color: g.alternativeSourcesAvailable >= 2 ? ELECTRIC : AMBER }}>{g.alternativeSourcesAvailable} alt</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↯ CASCADING FAILURE SCENARIOS</h3>
          <div className="space-y-2">
            {i.cascadingScenarios.map(c => (
              <div key={c.id} className="grid grid-cols-[28px_1fr_60px_80px_80px] items-center gap-2 px-3 py-2 text-[11px]" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${SEVERITY_COL[c.impactSeverity]}` }}>
                <span className="text-[14px] text-center" style={{ color: SEVERITY_COL[c.impactSeverity] }}>{TRIGGER_GLYPH[c.trigger]}</span>
                <div>
                  <div style={{ color: PARCH }}>{c.trigger.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>regions {c.affectedRegions} · depth {c.cascadeDepth}</div>
                </div>
                <span className="text-right tabular-nums text-[10px]" style={{ color: c.probability12mPct >= 30 ? RED : c.probability12mPct >= 15 ? AMBER : INK }}>{c.probability12mPct}%</span>
                <span className="text-right tabular-nums text-[10px]" style={{ color: c.preparednessIdx >= 70 ? ELECTRIC : AMBER }}>prep {c.preparednessIdx}</span>
                <span className="text-right text-[9px] uppercase tracking-[0.2em]" style={{ color: SEVERITY_COL[c.impactSeverity] }}>● {c.impactSeverity}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />
    </div>
  );
}
