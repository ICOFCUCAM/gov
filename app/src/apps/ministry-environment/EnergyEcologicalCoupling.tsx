'use client';

// Environment — Energy & Ecological Interdependency.
// Cross-system load↔recovery diagnostics rendered as opposing
// pressure dials per coupling axis. Tension is shown by the gap
// between two opposing arrows on a baseline. Distinct from prior
// environment surfaces: bidirectional pressure arrows, not bars.

import * as React from 'react';
import { environmentalGovernanceBoard, type CouplingDiagnostic } from '@/lib/gov/environmental-governance';

const FOREST_DEEP = '#152721';
const PANEL = '#1a221f';
const PANEL2 = '#1f2925';
const CANOPY = '#4f7a5e';
const EARTH = '#5a4a35';
const ATMOS = '#6a7d8a';
const SKY = '#314050';
const AMBER = '#b88b3a';
const GLACIER = '#e5e8e6';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const CLASS_COL: Record<CouplingDiagnostic['classification'], string> = {
  balanced: CANOPY, observant: ATMOS, tightening: AMBER, overload: ALERT,
};

const AXIS_LABEL: Record<CouplingDiagnostic['axis'], string> = {
  'energy-emissions': 'Energy ↔ Emissions',
  'energy-water': 'Energy ↔ Water',
  'industry-pollution': 'Industry ↔ Pollution',
  'agriculture-runoff': 'Agriculture ↔ Runoff',
  'transport-air-quality': 'Transport ↔ Air quality',
  'infrastructure-climate-exposure': 'Infrastructure ↔ Climate',
};

function CouplingPressure({ d }: { d: CouplingDiagnostic }) {
  const col = CLASS_COL[d.classification];
  // Two opposing arrows along a horizontal baseline.
  // Load points right (industrial→ecological), recovery points left.
  // Their lengths sit on opposite sides of midline; the gap is the tension.
  const w = 360, h = 70;
  const mid = w / 2;
  const loadLen = Math.min(mid - 8, (d.loadIdx / 100) * (mid - 8));
  const recoveryLen = Math.min(mid - 8, (d.recoveryIdx / 100) * (mid - 8));
  return (
    <div className="px-4 py-3" style={{ background: PANEL, border: `1px solid ${col}33` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px]" style={{ color: GLACIER }}>{AXIS_LABEL[d.axis]}</span>
        <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>● {d.classification}</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {/* baseline */}
        <line x1={8} y1={h / 2} x2={w - 8} y2={h / 2} stroke="rgba(214,218,211,0.18)" />
        {/* midline marker */}
        <line x1={mid} y1={h / 2 - 14} x2={mid} y2={h / 2 + 14} stroke={MUT} strokeOpacity={0.6} />
        {/* recovery arrow ← (left of midline) */}
        <g>
          <line x1={mid - recoveryLen} y1={h / 2} x2={mid - 6} y2={h / 2} stroke={CANOPY} strokeWidth={4} />
          <polygon points={`${mid - recoveryLen - 10},${h / 2} ${mid - recoveryLen},${h / 2 - 6} ${mid - recoveryLen},${h / 2 + 6}`} fill={CANOPY} />
          <text x={mid - recoveryLen - 14} y={h / 2 - 9} fontSize={9} fill={CANOPY} textAnchor="end" letterSpacing={2}>RECOVERY {d.recoveryIdx}</text>
        </g>
        {/* load arrow → (right of midline) */}
        <g>
          <line x1={mid + 6} y1={h / 2} x2={mid + loadLen} y2={h / 2} stroke={col} strokeWidth={4} />
          <polygon points={`${mid + loadLen + 10},${h / 2} ${mid + loadLen},${h / 2 - 6} ${mid + loadLen},${h / 2 + 6}`} fill={col} />
          <text x={mid + loadLen + 14} y={h / 2 - 9} fontSize={9} fill={col} letterSpacing={2}>LOAD {d.loadIdx}</text>
        </g>
        {/* tension reading */}
        <text x={mid} y={h - 6} fontSize={9} fill={MUT} textAnchor="middle" letterSpacing={2}>
          TENSION <tspan fill={col} fontWeight={700}>{d.tension}</tspan>
        </text>
      </svg>
    </div>
  );
}

export function EnergyEcologicalCoupling({ id, now }: { id: string; now: number }) {
  void id;
  const b = environmentalGovernanceBoard(now);
  const m = b.interdependency;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #2a3a48 0%, #152721 100%)', borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.75 }}>Energy &amp; Ecological Interdependency</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>
              Cross-system load ↔ recovery diagnostics · {m.diagnostics.length} coupling axes
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Alignment idx', v: m.energyEcologyAlignmentIdx, c: m.energyEcologyAlignmentIdx >= 70 ? CANOPY : ATMOS },
              { l: 'Green transition', v: `${m.greenTransitionProgressPct}%`, c: m.greenTransitionProgressPct >= 40 ? CANOPY : AMBER },
            ].map(x => (
              <div key={x.l} className="px-4 py-2.5" style={{ background: PANEL2, border: '1px solid rgba(229,232,230,0.06)' }}>
                <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[20px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Top exposure indices */}
      <section className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: 'rgba(229,232,230,0.06)' }}>
        {[
          { l: 'Industrial pollution exposure', v: m.industrialPollutionExposureIdx, c: m.industrialPollutionExposureIdx >= 60 ? ALERT : m.industrialPollutionExposureIdx >= 35 ? AMBER : CANOPY },
          { l: 'Agricultural climate pressure', v: m.agriculturalClimatePressureIdx, c: m.agriculturalClimatePressureIdx >= 60 ? ALERT : m.agriculturalClimatePressureIdx >= 35 ? AMBER : CANOPY },
          { l: 'Water ↔ energy dependency', v: m.waterEnergyDependencyIdx, c: m.waterEnergyDependencyIdx >= 60 ? AMBER : ATMOS },
        ].map(x => (
          <div key={x.l} className="px-6 py-4" style={{ background: PANEL2 }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: MUT }}>{x.l}</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-[3px] flex-1" style={{ background: 'rgba(15,30,22,0.7)' }}>
                <div className="h-full" style={{ width: `${x.v}%`, background: x.c }} />
              </div>
              <span className="tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Coupling pressure matrix */}
      <section className="px-8 py-6" style={{ background: PANEL }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>↔ Coupling pressure matrix · load ⇋ recovery</h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {m.diagnostics.map(d => <CouplingPressure key={d.axis} d={d} />)}
        </div>
        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-4 py-2" style={{ background: PANEL2 }}>
          <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>coupling legend</span>
          {(['balanced', 'observant', 'tightening', 'overload'] as CouplingDiagnostic['classification'][]).map(c => (
            <span key={c} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
              <span className="block h-2 w-4" style={{ background: CLASS_COL[c] }} />
              {c}
            </span>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL2, borderTop: '1px solid rgba(229,232,230,0.06)' }}>
        <span className="text-[9px] uppercase tracking-[0.36em]" style={{ color: MUT }}>
          ⇌ Industrial load is sovereign — the biosphere's recovery capacity is the constitutional ceiling ⇌
        </span>
        {void EARTH}{void SKY}
      </footer>
    </div>
  );
}
