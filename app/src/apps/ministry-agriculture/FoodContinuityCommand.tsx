'use client';

// Agriculture — National Food Continuity Command. Deliberately *not* a
// table or lane layout — uses a seasonal cycle disk, a 3-column region
// card grid and vertical reserve fills so the ministry reads as
// environmental & biological, not industrial.

import * as React from 'react';
import { foodSecurityBoard, type FoodPosture, type Season } from '@/lib/gov/food-security';

const POSTURE_COL: Record<FoodPosture, string> = {
  sustained: '#3a7d4a', engaged: '#8b9c4a',
  tightening: '#d8a23a', critical: '#a8552e', 'famine-watch': '#8a1f1f',
};
const SEASON_COL: Record<Season, string> = {
  Planting: '#5a8fa3', Growing: '#3a7d4a', Harvest: '#c9a449', Dormant: '#8b6f47',
};

function SeasonCycle({ season, progressPct }: { season: Season; progressPct: number }) {
  const seasons: Season[] = ['Planting', 'Growing', 'Harvest', 'Dormant'];
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(139,111,71,0.3)" strokeWidth="3" />
          {seasons.map((s, i) => {
            const angle = -Math.PI / 2 + (i / 4) * Math.PI * 2;
            const x = 32 + Math.cos(angle) * 28;
            const y = 32 + Math.sin(angle) * 28;
            const active = s === season;
            return <circle key={s} cx={x} cy={y} r={active ? 5 : 3} fill={SEASON_COL[s]} opacity={active ? 1 : 0.55} />;
          })}
          {(() => {
            const idx = seasons.indexOf(season);
            const t = (idx + progressPct / 100) / 4;
            const ang = -Math.PI / 2 + t * Math.PI * 2;
            return <line x1="32" y1="32" x2={32 + Math.cos(ang) * 24} y2={32 + Math.sin(ang) * 24} stroke={SEASON_COL[season]} strokeWidth="2" strokeLinecap="round" />;
          })()}
        </svg>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-ink-muted">Sovereign season</div>
        <div className="text-[16px] font-semibold tracking-tight" style={{ color: SEASON_COL[season] }}>{season}</div>
        <div className="text-[10px] text-ink-muted">{progressPct}% through</div>
      </div>
    </div>
  );
}

export function FoodContinuityCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = foodSecurityBoard(now);
  const c = b.command;
  return (
    <div className="space-y-3"
      style={{ background: 'radial-gradient(110% 70% at 50% 0%, rgba(58,125,74,0.10) 0%, transparent 60%)', padding: '4px' }}>
      {/* Banner with season cycle */}
      <div className="flex flex-wrap items-center gap-4 border-y px-4 py-3"
        style={{ borderColor: `color-mix(in srgb,${POSTURE_COL[c.posture]} 45%,transparent)`, background: 'rgba(28,32,24,0.55)' }}>
        <SeasonCycle season={b.currentSeason} progressPct={b.seasonProgressPct} />
        <div className="flex flex-col">
          <div className="text-[9px] uppercase tracking-[0.22em] text-ink-muted">National food continuity</div>
          <div className="text-[18px] font-semibold tracking-tight" style={{ color: POSTURE_COL[c.posture] }}>
            {c.posture.replace('-', ' ').toUpperCase()}
          </div>
          <div className="text-[10px] text-ink-muted">National reserve <span className="font-semibold tabular-nums text-ink">{c.nationalReserveDays}</span> days</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-ink-muted">{b.bannerLine}</div>
          <div className="mt-1 text-[9px] text-ink-muted">
            <span style={{ color: '#d8a23a' }}>{c.shortageRiskCount}</span> regions at risk · <span style={{ color: '#a8552e' }}>{c.emergencyAllocationCount}</span> on emergency allocation
          </div>
        </div>
      </div>

      {/* 3-column region food state card grid */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-ink-soft" style={{ color: '#3a7d4a' }}>· Regional food state</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {c.regions.map(r => {
            const riskCol = r.shortageRisk === 'imminent' ? '#a8552e' : r.shortageRisk === 'monitor' ? '#d8a23a' : '#3a7d4a';
            return (
              <div key={r.region} className="border p-3"
                style={{ borderColor: 'color-mix(in srgb,#8b6f47 40%,rgb(var(--c-line)))', background: 'linear-gradient(180deg, rgba(58,125,74,0.05) 0%, rgba(0,0,0,0.15) 100%)' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold tracking-tight text-ink">{r.region}</span>
                  <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: riskCol }}>{r.shortageRisk}</span>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Production</div>
                    <div className="text-[20px] font-semibold tabular-nums" style={{ color: r.productionIdx >= 70 ? '#3a7d4a' : r.productionIdx >= 55 ? '#d8a23a' : '#a8552e' }}>{r.productionIdx}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Reserves</div>
                    <div className="text-[20px] font-semibold tabular-nums text-ink">{r.reservesDays}<span className="text-[10px] text-ink-muted">d</span></div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Nutrition</div>
                    <div className="text-[20px] font-semibold tabular-nums" style={{ color: r.nutritionContinuity >= 80 ? '#3a7d4a' : '#d8a23a' }}>{r.nutritionContinuity}</div>
                  </div>
                </div>
                {r.emergencyAllocation ? (
                  <div className="mt-3 border-t px-0 pt-2 text-[9px] uppercase tracking-[0.14em]" style={{ borderColor: '#a8552e', color: '#a8552e' }}>
                    · emergency allocation engaged
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategic food reserves — vertical fill columns */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#c9a449' }}>· Strategic food reserves</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {c.reserves.map(r => {
            const fillCol = r.capacityFillPct >= 70 ? '#3a7d4a' : r.capacityFillPct >= 45 ? '#d8a23a' : '#a8552e';
            return (
              <div key={r.bucket} className="border p-2"
                style={{ borderColor: 'color-mix(in srgb,#8b6f47 40%,rgb(var(--c-line)))', background: 'rgba(0,0,0,0.25)' }}>
                <div className="text-[9px] uppercase tracking-[0.14em] text-ink-soft">{r.bucket}</div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="relative h-20 w-5 overflow-hidden border" style={{ borderColor: 'rgba(139,111,71,0.4)', background: 'rgba(139,111,71,0.08)' }}>
                    <span className="absolute bottom-0 left-0 right-0" style={{ height: `${r.capacityFillPct}%`, background: `linear-gradient(180deg, ${fillCol} 0%, color-mix(in srgb,${fillCol} 60%,#000) 100%)` }} />
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold tabular-nums leading-none" style={{ color: fillCol }}>{r.daysCover}<span className="text-[9px] text-ink-muted">d</span></div>
                    <div className="text-[8px] text-ink-muted">{r.capacityFillPct}% fill</div>
                    <div className="mt-1 text-[8px] uppercase tracking-[0.1em]" style={{ color: r.reserveEligible ? '#3a7d4a' : '#a8552e' }}>
                      {r.reserveEligible ? 'eligible' : 'restricted'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-ink-muted">
        Humanitarian food doctrine: emergency allocation always preserves nutritional continuity before commercial
        distribution; reserve release requires ≥ 40% bucket fill and the lawful emergency-allocation chain.
      </p>
    </div>
  );
}
