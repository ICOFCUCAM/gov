'use client';

// Agriculture — Harvest & Production Field. Crops rendered as organic
// cards on a soil-toned grid; livestock as horizontal flock blocks.

import * as React from 'react';
import { foodSecurityBoard, type CropProduction, type LivestockHerd } from '@/lib/gov/food-security';

const CROP_HUE: Record<CropProduction['crop'], string> = {
  Maize: '#c9a449', Wheat: '#c9b070', Rice: '#a4b56e', Sorghum: '#a8552e',
  Cassava: '#8b6f47', Vegetables: '#3a7d4a',
};

function PressureDots({ value, color }: { value: number; color: string }) {
  const dots = Math.round(value / 20);
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < dots ? color : 'rgba(139,111,71,0.25)' }} />
      ))}
    </span>
  );
}

const OUTBREAK_COL: Record<LivestockHerd['outbreakRisk'], string> = {
  low: '#3a7d4a', monitor: '#d8a23a', outbreak: '#a8552e',
};

export function HarvestProductionField({ id, now }: { id: string; now: number }) {
  void id;
  const b = foodSecurityBoard(now);
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: '#3a7d4a' }}>· Crop production field</span>
          <span className="text-[9px] text-ink-muted">{b.currentSeason} season · {b.seasonProgressPct}% through</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {b.crops.map(c => {
            const trend = c.forecastIdx - c.yieldIdx;
            return (
              <div key={c.crop} className="border p-3"
                style={{ borderColor: 'color-mix(in srgb,#8b6f47 38%,rgb(var(--c-line)))', background: `linear-gradient(180deg, color-mix(in srgb,${CROP_HUE[c.crop]} 12%, transparent) 0%, rgba(0,0,0,0.15) 100%)` }}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[13px] font-semibold tracking-tight text-ink">{c.crop}</div>
                    <div className="text-[9px] text-ink-muted">{c.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: CROP_HUE[c.crop] }}>{c.yieldIdx}</div>
                    <div className="text-[8.5px] text-ink-muted">yield idx</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Forecast</div>
                    <div className="font-semibold tabular-nums" style={{ color: trend >= 0 ? '#3a7d4a' : '#a8552e' }}>{c.forecastIdx} {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Irrigation</div>
                    <div className="font-semibold tabular-nums" style={{ color: c.irrigationCoverPct >= 60 ? '#5a8fa3' : '#d8a23a' }}>{c.irrigationCoverPct}%</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Pest pressure</div>
                    <PressureDots value={c.pestPressure} color={c.pestPressure >= 60 ? '#a8552e' : '#d8a23a'} />
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Disease pressure</div>
                    <PressureDots value={c.diseasePressure} color={c.diseasePressure >= 50 ? '#a8552e' : '#d8a23a'} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#8b6f47' }}>· Livestock continuity</div>
        <div className="space-y-1.5">
          {b.livestock.map(l => (
            <div key={l.category} className="flex items-center gap-3 border px-3 py-2"
              style={{ borderColor: 'color-mix(in srgb,#8b6f47 38%,rgb(var(--c-line)))', background: 'rgba(0,0,0,0.18)' }}>
              <div className="w-28 shrink-0">
                <div className="text-[12px] font-semibold tracking-tight text-ink">{l.category}</div>
                <div className="text-[9px] tabular-nums text-ink-muted">{l.populationK.toLocaleString()}k head</div>
              </div>
              <div className="flex flex-1 items-center gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Health</span>
                  <span className="text-[14px] font-semibold tabular-nums" style={{ color: l.healthIdx >= 80 ? '#3a7d4a' : '#d8a23a' }}>{l.healthIdx}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Vaccination</span>
                  <span className="text-[14px] font-semibold tabular-nums" style={{ color: l.vaccinationPct >= 75 ? '#3a7d4a' : '#d8a23a' }}>{l.vaccinationPct}%</span>
                </div>
              </div>
              <span className="rounded-full border px-2 py-px text-[9px] uppercase tracking-[0.14em]"
                style={{ borderColor: `color-mix(in srgb,${OUTBREAK_COL[l.outbreakRisk]} 45%,transparent)`, color: OUTBREAK_COL[l.outbreakRisk] }}>
                {l.outbreakRisk}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-ink-muted">
        Crop dots indicate pest / disease pressure intensity (1–5). Livestock outbreak status escalates from low →
        monitor → outbreak; veterinary intervention is dispatched automatically at outbreak.
      </p>
    </div>
  );
}
