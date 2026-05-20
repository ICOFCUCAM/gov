'use client';

// Environment — Biosphere & Restoration Atlas.
// Protected regions arranged as canopy cards over a topographic
// contour pattern; biodiversity / habitat-loss diagrammed as
// counter-flowing currents (restoration vs habitat-loss). Forest cover
// rendered as canopy density bar.

import * as React from 'react';
import { climateResilienceBoard, type ProtectedRegion } from '@/lib/gov/climate-resilience';

const FOREST = '#20392c';
const FOREST_DEEP = '#152721';
const CANOPY = '#36603e';
const PANEL = '#1a221f';
const EARTH = '#5a4a35';
const ATMOS = '#6a7d8a';
const GLACIER = '#e5e8e6';
const AMBER = '#b88b3a';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const STATUS_COL: Record<ProtectedRegion['status'], string> = {
  intact: CANOPY, monitored: ATMOS, pressured: AMBER, degrading: ALERT,
};

function ContourBackdrop({ height }: { height: number }) {
  return (
    <svg width="100%" height={height} viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" className="absolute inset-0" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => {
        const y = (height / 7) * (i + 0.5);
        const path = `M0 ${y} Q150 ${y - 12} 300 ${y} T600 ${y - (i % 2 ? 8 : -8)}`;
        return <path key={i} d={path} stroke="rgba(54,96,62,0.25)" strokeWidth={0.8} fill="none" />;
      })}
    </svg>
  );
}

function CounterCurrents({ restoration, habitatLoss, max }: { restoration: number; habitatLoss: number; max: number }) {
  // Two horizontal flow lanes — restoration to the right, habitat loss to the left.
  const w = 460, h = 80;
  const rPct = Math.min(1, restoration / max);
  const lPct = Math.min(1, habitatLoss / max);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* baseline */}
      <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="rgba(214,218,211,0.18)" />
      {/* restoration arrow (top, →) */}
      <g>
        <line x1={4} y1={h * 0.28} x2={4 + (w - 24) * rPct} y2={h * 0.28} stroke={CANOPY} strokeWidth={4} />
        <polygon points={`${4 + (w - 24) * rPct},${h * 0.28 - 6} ${4 + (w - 24) * rPct + 14},${h * 0.28} ${4 + (w - 24) * rPct},${h * 0.28 + 6}`} fill={CANOPY} />
        <text x={6} y={h * 0.18} fontSize={9} fill={CANOPY} letterSpacing={2}>↦ RESTORATION  {restoration.toFixed(1)}%/yr</text>
      </g>
      {/* habitat-loss arrow (bottom, ←) */}
      <g>
        <line x1={w - 4} y1={h * 0.72} x2={w - 4 - (w - 24) * lPct} y2={h * 0.72} stroke={ALERT} strokeWidth={4} />
        <polygon points={`${w - 4 - (w - 24) * lPct},${h * 0.72 - 6} ${w - 4 - (w - 24) * lPct - 14},${h * 0.72} ${w - 4 - (w - 24) * lPct},${h * 0.72 + 6}`} fill={ALERT} />
        <text x={w - 6} y={h * 0.92} fontSize={9} fill={ALERT} textAnchor="end" letterSpacing={2}>HABITAT LOSS  {habitatLoss.toFixed(1)}%/yr ↤</text>
      </g>
    </svg>
  );
}

export function BiosphereRestorationAtlas({ id, now }: { id: string; now: number }) {
  void id;
  const b = climateResilienceBoard(now);
  const bio = b.biosphere;
  const canopyFill = Math.min(100, bio.forestCoverPct);
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Header strip — canopy gradient */}
      <header className="relative overflow-hidden px-8 py-5" style={{ background: `linear-gradient(180deg, ${FOREST_DEEP} 0%, ${FOREST} 50%, ${CANOPY} 200%)` }}>
        <ContourBackdrop height={70} />
        <div className="relative flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.7 }}>Biosphere &amp; Restoration Atlas</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>{bio.protectedRegions.length} protected ecoregions · {bio.endangeredSpecies.toLocaleString()} species under protection</h2>
          </div>
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.32em]" style={{ color: GLACIER, opacity: 0.7 }}>
            <span>canopy</span>
            <span className="block h-3 w-32" style={{ background: 'rgba(15,30,22,0.6)' }}>
              <span className="block h-full" style={{ width: `${canopyFill}%`, background: `linear-gradient(90deg, ${CANOPY}, #4f7a5e)` }} />
            </span>
            <span className="tabular-nums" style={{ color: GLACIER }}>{bio.forestCoverPct}%</span>
          </div>
        </div>
      </header>

      {/* Counter-currents diagram */}
      <section className="px-8 py-5" style={{ background: PANEL, borderTop: '1px solid rgba(229,232,230,0.06)', borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px] lg:items-center">
          <div>
            <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: MUT }}>◊ Restoration ⇋ habitat-loss currents</div>
            <CounterCurrents restoration={bio.reforestationRatePctYr} habitatLoss={bio.habitatLossYrPct} max={Math.max(2, Math.max(bio.reforestationRatePctYr, bio.habitatLossYrPct) * 1.2)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="px-3 py-3" style={{ background: FOREST_DEEP, border: '1px solid rgba(54,96,62,0.4)' }}>
              <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: MUT }}>Active corridors</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: CANOPY }}>{bio.restorationCorridorsActiveK.toLocaleString()}K</div>
              <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>hectares</div>
            </div>
            <div className="px-3 py-3" style={{ background: FOREST_DEEP, border: '1px solid rgba(160,64,48,0.4)' }}>
              <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: MUT }}>Endangered</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: ALERT }}>{bio.endangeredSpecies.toLocaleString()}</div>
              <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>species</div>
            </div>
            <div className="col-span-2 px-3 py-3" style={{ background: FOREST_DEEP, border: '1px solid rgba(106,125,138,0.4)' }}>
              <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: MUT }}>Biodiversity index</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-1 flex-1" style={{ background: 'rgba(214,218,211,0.08)' }}>
                  <div className="h-full" style={{ width: `${bio.biodiversityIdx}%`, background: bio.biodiversityIdx >= 70 ? CANOPY : bio.biodiversityIdx >= 55 ? ATMOS : ALERT }} />
                </div>
                <span className="tabular-nums text-[18px]" style={{ color: bio.biodiversityIdx >= 70 ? CANOPY : bio.biodiversityIdx >= 55 ? ATMOS : ALERT }}>{bio.biodiversityIdx}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protected region atlas */}
      <section className="px-8 py-6" style={{ background: FOREST_DEEP }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GLACIER }}>⬡ Protected Region Register</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>integrity · rangers · status</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bio.protectedRegions.map(p => (
            <article key={p.id} className="relative overflow-hidden px-4 py-4" style={{ background: PANEL, border: '1px solid rgba(54,96,62,0.35)' }}>
              <ContourBackdrop height={160} />
              <div className="relative">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: GLACIER }}>{p.region}</span>
                  <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: STATUS_COL[p.status] }}>● {p.status}</span>
                </div>
                <div className="text-[10px]" style={{ color: MUT }}>{p.ecoregion} · {p.hectaresK.toLocaleString()}K ha</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>integrity</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-[3px] w-20" style={{ background: 'rgba(15,30,22,0.7)' }}>
                        <div className="h-full" style={{ width: `${p.integrityPct}%`, background: STATUS_COL[p.status] }} />
                      </div>
                      <span className="tabular-nums" style={{ color: STATUS_COL[p.status] }}>{p.integrityPct}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>rangers</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-[3px] w-20" style={{ background: 'rgba(15,30,22,0.7)' }}>
                        <div className="h-full" style={{ width: `${p.rangerCoverage}%`, background: ATMOS }} />
                      </div>
                      <span className="tabular-nums" style={{ color: ATMOS }}>{p.rangerCoverage}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[9.5px] uppercase tracking-[0.22em]" style={{ color: EARTH }}>
                  · {p.speciesUnderProtection.toLocaleString()} species
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
