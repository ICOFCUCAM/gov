'use client';

// Agriculture — Agricultural Intelligence & Long-Horizon Forecasting.
// Stacked 25-year yield-production area bands, trade-exposure
// vulnerability bar diagram, sustainability layered horizon (5 lines),
// scarcity probability gauge. Earthen palette with sky blue accents.

import * as React from 'react';
import { agricultureRuralBoard, type YieldForecast, type TradeExposureLine } from '@/lib/gov/agriculture-rural';

const SOIL = '#3a2f22';
const SOIL_DEEP = '#1f1813';
const HARVEST = '#a47a35';
const HARVEST_DARK = '#7a5a26';
const FIELD = '#4e6d3e';
const FIELD_DARK = '#2c4023';
const SKY = '#5a7d8f';
const SKY_LIGHT = '#7aa0b8';
const PARCH = '#e9dfc8';
const INK = '#d8d0bc';
const MUT = '#8a8270';
const ALERT = '#a04030';
const WATER = '#406478';

const OUTLOOK_COL: Record<YieldForecast['currentSeasonOutlook'], string> = {
  strong: FIELD, 'on-target': HARVEST, soft: '#a05538', shortfall: ALERT,
};
const CROP_GLYPH: Record<YieldForecast['crop'], string> = {
  cereals: '🌾', pulses: '◇', oilseeds: '◈', 'fruit-vegetable': '✦', tubers: '⬣', 'industrial-cash': '◆',
};
const KIND_COL: Record<TradeExposureLine['tradeKind'], string> = {
  export: FIELD, import: HARVEST,
};

// Stacked production trajectory bands
function ProductionBand({ y }: { y: YieldForecast }) {
  const w = 240, h = 70, padT = 6, padB = 18;
  const max = Math.max(...y.productionTrajectoryMt);
  const min = Math.min(...y.productionTrajectoryMt);
  const range = Math.max(1, max - min);
  const pts = y.productionTrajectoryMt.map((v, i) => ({
    x: 8 + (i / (y.productionTrajectoryMt.length - 1)) * (w - 16),
    y: h - padB - ((v - min) / range) * (h - padT - padB),
    v,
  }));
  const col = OUTLOOK_COL[y.currentSeasonOutlook];
  // area path
  const area = `M${pts[0]!.x} ${h - padB} ${pts.map(p => `L${p.x} ${p.y}`).join(' ')} L${pts[pts.length - 1]!.x} ${h - padB} Z`;
  const line = `M${pts.map(p => `${p.x} ${p.y}`).join(' L')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* ridge lines */}
      {[0.25, 0.5, 0.75].map(p => <line key={p} x1={8} y1={padT + (h - padT - padB) * p} x2={w - 8} y2={padT + (h - padT - padB) * p} stroke={SOIL} />)}
      <path d={area} fill={col} fillOpacity={0.22} />
      <path d={line} fill="none" stroke={col} strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} fill={col} />
          <text x={p.x} y={h - 5} fontSize={7.5} textAnchor="middle" fill={MUT}>+{[5, 10, 15, 20, 25][i]}y</text>
        </g>
      ))}
    </svg>
  );
}

// Layered sustainability horizon — 5 lines on one chart
function SustainabilityLayers({ s }: { s: ReturnType<typeof agricultureRuralBoard>['intelligence']['sustainability'] }) {
  const w = 720, h = 220, padL = 36, padR = 14, padT = 12, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const series = [
    { name: 'Soil health', data: s.soilHealthTrajectory, col: SOIL },
    { name: 'Freshwater', data: s.freshwaterAvailabilityTrajectory, col: WATER },
    { name: 'Biodiversity', data: s.biodiversityIntegrationTrajectory, col: FIELD },
    { name: 'Food self-sufficiency', data: s.foodSelfSufficiencyTrajectory, col: HARVEST },
    { name: 'Climate migration', data: s.climateMigrationPressureTrajectory, col: ALERT },
  ];
  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
        {/* grid */}
        {[25, 50, 75].map(p => (
          <React.Fragment key={p}>
            <line x1={padL} y1={padT + plotH * (1 - p / 100)} x2={w - padR} y2={padT + plotH * (1 - p / 100)} stroke={SOIL} strokeDasharray="2 4" />
            <text x={padL - 6} y={padT + plotH * (1 - p / 100) + 3} fontSize={8} textAnchor="end" fill={MUT}>{p}</text>
          </React.Fragment>
        ))}
        <line x1={padL} y1={padT + plotH} x2={w - padR} y2={padT + plotH} stroke={HARVEST_DARK} />
        {/* x-axis labels */}
        {s.horizonYears.map((y, i) => {
          const x = padL + (i / (s.horizonYears.length - 1)) * plotW;
          return <text key={y} x={x} y={h - 8} fontSize={9} textAnchor="middle" fill={MUT}>+{y}y</text>;
        })}
        {/* series */}
        {series.map(line => {
          const pts = line.data.map((v, i) => ({
            x: padL + (i / (line.data.length - 1)) * plotW,
            y: padT + plotH * (1 - v / 100),
          }));
          const d = `M${pts.map(p => `${p.x} ${p.y}`).join(' L')}`;
          return (
            <g key={line.name}>
              <path d={d} fill="none" stroke={line.col} strokeWidth={1.8} />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={line.col} />)}
              <text x={pts[pts.length - 1]!.x + 4} y={pts[pts.length - 1]!.y + 3} fontSize={9} fill={line.col} fontWeight={700}>{line.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Scarcity probability gauge
function ScarcityGauge({ pct }: { pct: number }) {
  const w = 120, h = 70, cx = w / 2, cy = h - 8, r = 50;
  const start = Math.PI; const end = 0;
  const angle = start + (end - start) * (pct / 100);
  const x1 = cx + Math.cos(start) * r; const y1 = cy + Math.sin(start) * r;
  const x2 = cx + Math.cos(angle) * r; const y2 = cy + Math.sin(angle) * r;
  const col = pct >= 50 ? ALERT : pct >= 25 ? HARVEST : FIELD;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      <path d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${cx + Math.cos(end) * r} ${cy + Math.sin(end) * r}`} fill="none" stroke={SOIL} strokeWidth={8} strokeLinecap="round" />
      <path d={`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={16} fontWeight={700} fill={col}>{pct}%</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={8} fill={MUT} letterSpacing={2}>90D SCARCITY</text>
    </svg>
  );
}

export function AgriculturalIntelligenceForecasting({ id, now }: { id: string; now: number }) {
  void id;
  const b = agricultureRuralBoard(now);
  const i = b.intelligence;
  return (
    <div style={{ background: SOIL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: `linear-gradient(180deg, ${SOIL} 0%, ${SOIL_DEEP} 100%)`, borderBottom: `1px solid ${HARVEST_DARK}55` }}>
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.42em]" style={{ color: HARVEST }}>Agricultural Intelligence &amp; Long-Horizon Forecasting</div>
            <h2 className="mt-2 text-[18px] tracking-[0.03em]" style={{ color: PARCH }}>
              25-year sustainability horizon · {i.earlyWarningSignalsActive} early-warning signals · AI reasoning {i.aiReasoningCoveragePct}%
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <ScarcityGauge pct={i.scarcityProbability90dPct} />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="px-3 py-2" style={{ background: SOIL, border: `1px solid ${HARVEST_DARK}55`, minWidth: '120px' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>Long-horizon</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: i.sustainability.longHorizonResilienceIdx >= 70 ? FIELD : HARVEST }}>{i.sustainability.longHorizonResilienceIdx}</div>
              </div>
              <div className="px-3 py-2" style={{ background: SOIL, border: `1px solid ${HARVEST_DARK}55`, minWidth: '120px' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>Systemic risk</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: i.sustainability.systemicAgriRisk >= 60 ? ALERT : i.sustainability.systemicAgriRisk >= 30 ? HARVEST : FIELD }}>{i.sustainability.systemicAgriRisk}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Yield forecasts */}
      <section className="px-8 py-6" style={{ background: SOIL_DEEP, borderBottom: `1px solid ${SOIL}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>📈 Yield forecasts · 25-year production bands</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>sorted by scarcity risk descending</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {i.yieldForecasts.map(y => (
            <article key={y.crop} className="px-4 py-3" style={{ background: SOIL, border: `1px solid ${OUTLOOK_COL[y.currentSeasonOutlook]}33` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: PARCH }}>
                  <span className="mr-2" style={{ color: HARVEST }}>{CROP_GLYPH[y.crop]}</span>{y.crop.replace(/-/g, ' ')}
                </span>
                <span className="text-[9.5px] uppercase tracking-[0.22em]" style={{ color: OUTLOOK_COL[y.currentSeasonOutlook] }}>· {y.currentSeasonOutlook}</span>
              </div>
              <div className="mt-2"><ProductionBand y={y} /></div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>EXPORT IDX</div>
                  <div className="tabular-nums" style={{ color: FIELD }}>{y.exportShareIdx}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>IMPORT DEP.</div>
                  <div className="tabular-nums" style={{ color: y.importDependencyPct >= 40 ? ALERT : HARVEST }}>{y.importDependencyPct}%</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>SCARCITY</div>
                  <div className="tabular-nums" style={{ color: y.scarcityRiskIdx >= 50 ? ALERT : y.scarcityRiskIdx >= 25 ? HARVEST : FIELD }}>{y.scarcityRiskIdx}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Sustainability horizon */}
      <section className="px-8 py-6" style={{ background: SOIL, borderBottom: `1px solid ${HARVEST_DARK}33` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>🌱 Sustainability layered horizon · 5 lines × 5 horizons</h3>
        <div className="px-2 py-2" style={{ background: SOIL_DEEP, border: `1px solid ${SOIL}` }}>
          <SustainabilityLayers s={i.sustainability} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUT }}>
          {[
            { name: 'Soil health', col: SOIL },
            { name: 'Freshwater', col: WATER },
            { name: 'Biodiversity', col: FIELD },
            { name: 'Food self-sufficiency', col: HARVEST },
            { name: 'Climate migration', col: ALERT },
          ].map(l => (
            <span key={l.name} className="flex items-center gap-2"><span className="block h-2 w-4" style={{ background: l.col }} />{l.name}</span>
          ))}
          {void SKY}{void SKY_LIGHT}{void FIELD_DARK}
        </div>
      </section>

      {/* Trade exposure */}
      <section className="px-8 py-6" style={{ background: SOIL_DEEP }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: HARVEST }}>🌍 Trade exposure · vulnerability ledger</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>{i.tradeExposure.length} bilateral commodity lines</span>
        </div>
        <div className="overflow-hidden border" style={{ borderColor: SOIL, background: SOIL }}>
          <div className="grid grid-cols-[100px_180px_140px_100px_1fr_100px] gap-3 px-4 py-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUT, background: SOIL_DEEP }}>
            <span>Kind</span><span>Partner</span><span>Commodity</span><span className="text-right">Share %</span><span>Vulnerability</span><span className="text-right">Index</span>
          </div>
          {i.tradeExposure.map((t, i2) => (
            <div key={i2} className="grid grid-cols-[100px_180px_140px_100px_1fr_100px] items-center gap-3 border-t px-4 py-2.5 text-[11px]" style={{ borderColor: SOIL_DEEP }}>
              <span className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: KIND_COL[t.tradeKind] }}>{t.tradeKind === 'export' ? '↗ EXPORT' : '↘ IMPORT'}</span>
              <span style={{ color: PARCH }}>{t.partner}</span>
              <span style={{ color: INK }}>{t.commodity}</span>
              <span className="text-right tabular-nums" style={{ color: MUT }}>{t.shareOfPartnerPct}%</span>
              <div className="flex items-center gap-2">
                <div className="h-[3px] flex-1" style={{ background: SOIL_DEEP }}>
                  <div className="h-full" style={{ width: `${t.vulnerabilityIdx}%`, background: t.vulnerabilityIdx >= 60 ? ALERT : t.vulnerabilityIdx >= 35 ? HARVEST : FIELD }} />
                </div>
              </div>
              <span className="text-right tabular-nums" style={{ color: t.vulnerabilityIdx >= 60 ? ALERT : HARVEST }}>{t.vulnerabilityIdx}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: SOIL, borderTop: `1px solid ${HARVEST_DARK}33` }}>
        <span className="text-[9px] uppercase tracking-[0.34em]" style={{ color: MUT }}>
          🌱 Food security is measured in decades — the harvest of 2050 begins with the soil of today 🌱
        </span>
      </footer>
    </div>
  );
}
