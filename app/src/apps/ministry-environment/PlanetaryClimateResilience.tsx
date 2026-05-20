'use client';

// Environment — National Climate Resilience Command.
// Stratified atmospheric layers (troposphere → biosphere →
// hydrosphere → lithosphere) over a hexagonal ecoregion lattice.
// Deep forest green / atmospheric blue-gray / muted earth brown /
// glacier white / restrained environmental amber. Quiet humanist
// sans-serif. No rivets, no chamber, no seal — environmental
// continuity rendered as living strata, not as plate or disc.

import * as React from 'react';
import { climateResilienceBoard, type ClimatePosture, type EcoregionStress } from '@/lib/gov/climate-resilience';

const FOREST = '#20392c';
const FOREST_DEEP = '#152721';
const ATMOS = '#6a7d8a';
const ATMOS_DARK = '#2a3a48';
const EARTH = '#5a4a35';
const EARTH_DEEP = '#3a2f22';
const GLACIER = '#e5e8e6';
const AMBER = '#b88b3a';
const SKY = '#314050';
const PANEL = '#1a221f';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const POSTURE_COL: Record<ClimatePosture, string> = {
  stable: '#4f7a5e', observant: ATMOS, engaged: AMBER, stressed: '#a05538', 'crisis-coordination': ALERT,
};

const CLASS_COL: Record<EcoregionStress['classification'], string> = {
  stable: '#4f7a5e', observant: ATMOS, stressed: AMBER, critical: '#a05538', tipping: ALERT,
};

function HexTile({ er, size = 110 }: { er: EcoregionStress; size?: number }) {
  // pointy-top hex
  const w = size, h = size * 0.95;
  const cx = w / 2, cy = h / 2;
  const r = size / 2 - 4;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');
  const fillFrac = Math.min(1, er.compositeStress / 100);
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
        <defs>
          <clipPath id={`clip-${er.ecoregion.replace(/\s/g, '')}`}>
            <polygon points={pts} />
          </clipPath>
        </defs>
        <polygon points={pts} fill={FOREST_DEEP} stroke={CLASS_COL[er.classification]} strokeWidth={1.2} strokeOpacity={0.85} />
        {/* topo bands */}
        <g clipPath={`url(#clip-${er.ecoregion.replace(/\s/g, '')})`}>
          {[0.18, 0.36, 0.54, 0.72].map((p, i) => (
            <line key={i} x1={4} y1={h * p} x2={w - 4} y2={h * p} stroke={ATMOS_DARK} strokeOpacity={0.4} strokeWidth={0.5} strokeDasharray="2 5" />
          ))}
          {/* stress fill from bottom */}
          <rect x={0} y={h * (1 - fillFrac)} width={w} height={h * fillFrac} fill={CLASS_COL[er.classification]} fillOpacity={0.22} />
        </g>
        {/* center dot */}
        <circle cx={cx} cy={cy} r={3} fill={CLASS_COL[er.classification]} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ pointerEvents: 'none' }}>
        <div className="text-[8.5px] uppercase tracking-[0.22em] leading-tight" style={{ color: INK }}>{er.ecoregion.split(' ').map(w => w[0]).join('')}</div>
        <div className="mt-1 tabular-nums text-[14px]" style={{ color: CLASS_COL[er.classification] }}>{er.compositeStress}</div>
        <div className="text-[7.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>{er.classification}</div>
      </div>
    </div>
  );
}

function StratumBar({ label, value, unit, max = 100, col, contour = true }: { label: string; value: number; unit?: string; max?: number; col: string; contour?: boolean }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="grid grid-cols-[180px_1fr_70px] items-center gap-3 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: MUT }}>{label}</span>
      <div className="relative h-3" style={{ background: '#0b1311' }}>
        {contour && (
          <>
            {/* topographic contour ticks */}
            {[25, 50, 75].map(p => (
              <div key={p} className="absolute inset-y-0" style={{ left: `${p}%`, width: '1px', background: 'rgba(214,218,211,0.08)' }} />
            ))}
          </>
        )}
        <div className="h-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${col}aa 0%, ${col} 100%)` }} />
      </div>
      <span className="text-right tabular-nums text-[12px]" style={{ color: col }}>{value}{unit ?? ''}</span>
    </div>
  );
}

export function PlanetaryClimateResilience({ id, now }: { id: string; now: number }) {
  void id;
  const b = climateResilienceBoard(now);
  const c = b.command;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Stratum masthead — horizon strip with sky→biosphere→soil bands */}
      <header className="relative overflow-hidden px-8 py-6" style={{ background: `linear-gradient(180deg, ${ATMOS_DARK} 0%, ${SKY} 30%, ${FOREST} 65%, ${EARTH_DEEP} 100%)` }}>
        {/* faint topographic horizons */}
        <div className="pointer-events-none absolute inset-0">
          {[18, 38, 58, 78].map(p => (
            <div key={p} className="absolute inset-x-0 h-px" style={{ top: `${p}%`, background: 'rgba(229,232,230,0.07)' }} />
          ))}
        </div>
        <div className="relative flex items-end justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.7 }}>National Climate Resilience Command</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>{b.bannerLine}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="block h-[2px] w-10" style={{ background: POSTURE_COL[c.posture] }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: POSTURE_COL[c.posture] }}>· {c.posture.replace(/-/g, ' ')}</span>
            <span className="block h-[2px] w-10" style={{ background: POSTURE_COL[c.posture] }} />
          </div>
        </div>
      </header>

      {/* Stratified planetary readout */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_440px]" style={{ background: 'rgba(229,232,230,0.06)' }}>
        <div className="px-8 py-6" style={{ background: FOREST_DEEP }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>◬ Planetary strata</h3>
            <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>composite continuity index</span>
          </div>
          {/* Stratum stack */}
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: ATMOS }}>▔ Atmospheric stratum</div>
            <StratumBar label="Climate-risk posture" value={c.climateRiskPostureIdx} col={ATMOS} />
            <StratumBar label="Adaptation readiness" value={c.adaptationReadinessIdx} col={ATMOS} />
            <div className="mt-3 text-[9px] uppercase tracking-[0.32em]" style={{ color: '#4f7a5e' }}>▒ Biosphere stratum</div>
            <StratumBar label="Ecological continuity" value={c.ecologicalContinuityIdx} col="#4f7a5e" />
            <StratumBar label="Forest cover" value={b.biosphere.forestCoverPct} unit="%" col="#4f7a5e" />
            <StratumBar label="Biodiversity index" value={b.biosphere.biodiversityIdx} col="#4f7a5e" />
            <div className="mt-3 text-[9px] uppercase tracking-[0.32em]" style={{ color: SKY }}>≋ Hydrospheric stratum</div>
            <StratumBar label="Coastal resilience" value={b.ocean.coastalResilienceIdx} col={SKY} />
            <StratumBar label="Marine ecosystem" value={b.ocean.marineEcosystemIdx} col={SKY} />
            <div className="mt-3 text-[9px] uppercase tracking-[0.32em]" style={{ color: EARTH }}>▰ Lithospheric stratum</div>
            <StratumBar label="Compliance index" value={b.pollution.complianceIdx} unit="%" col={EARTH} />
            <StratumBar label="Civ. survivability" value={c.civilizationalSurvivabilityIdx} col={AMBER} />
          </div>
        </div>

        {/* Hex lattice of ecoregions */}
        <div className="px-6 py-6" style={{ background: PANEL }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>⬡ Ecoregion lattice</h3>
            <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{c.ecoregions.length} biomes</span>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 justify-items-center">
            {c.ecoregions.map(er => <HexTile key={er.ecoregion} er={er} />)}
          </div>
          {/* legend */}
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-3" style={{ borderColor: 'rgba(214,218,211,0.08)' }}>
            {(['stable', 'observant', 'stressed', 'critical', 'tipping'] as EcoregionStress['classification'][]).map(c2 => (
              <div key={c2} className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
                <span className="block h-[3px] w-5" style={{ background: CLASS_COL[c2] }} />
                <span>{c2}</span>
              </div>
            ))}
          </div>
          {/* per-ecoregion register */}
          <div className="mt-4 space-y-1">
            {c.ecoregions.map(er => (
              <div key={er.ecoregion} className="grid grid-cols-[1fr_42px_42px_42px_42px] items-center gap-2 text-[10px]">
                <span style={{ color: INK }}>{er.ecoregion}</span>
                <span className="text-right tabular-nums" style={{ color: ATMOS }} title="thermal">{er.thermalStressIdx}</span>
                <span className="text-right tabular-nums" style={{ color: SKY }} title="hydro">{er.hydroStressIdx}</span>
                <span className="text-right tabular-nums" style={{ color: '#4f7a5e' }} title="biodiversity">{er.biodiversityPressureIdx}</span>
                <span className="text-right tabular-nums" style={{ color: EARTH }} title="pollution">{er.pollutionPressureIdx}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between px-8 py-3" style={{ background: PANEL, borderTop: '1px solid rgba(229,232,230,0.08)' }}>
        <span className="text-[9px] uppercase tracking-[0.36em]" style={{ color: MUT }}>· Sovereign ecological continuity ·</span>
        <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>intergenerational ⇋ planetary ⇋ long-horizon</span>
      </footer>
    </div>
  );
}
