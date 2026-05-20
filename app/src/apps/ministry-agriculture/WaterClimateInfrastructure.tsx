'use client';

// Agriculture — Water & Climate Infrastructure. Reservoirs as tall
// vertical fill columns (echoing dam walls); climate pressure as a
// region-by-pressure-type grid using soil/amber/blue palette.

import * as React from 'react';
import { foodSecurityBoard, type Reservoir } from '@/lib/gov/food-security';

const STATUS_COL: Record<Reservoir['status'], string> = {
  nominal: '#5a8fa3', rationing: '#d8a23a', emergency: '#a8552e',
};

export function WaterClimateInfrastructure({ id, now }: { id: string; now: number }) {
  void id;
  const b = foodSecurityBoard(now);
  return (
    <div className="space-y-3">
      {/* Reservoirs — tall vertical fills like dam walls */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#5a8fa3' }}>· National reservoirs &amp; irrigation</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {b.reservoirs.map(r => {
            const col = STATUS_COL[r.status];
            return (
              <div key={r.id} className="border p-3"
                style={{ borderColor: 'color-mix(in srgb,#5a8fa3 35%,rgb(var(--c-line)))', background: 'linear-gradient(180deg, rgba(90,143,163,0.08) 0%, rgba(0,0,0,0.2) 100%)' }}>
                <div className="text-[11px] font-semibold tracking-tight text-ink">{r.name}</div>
                <div className="text-[9px] text-ink-muted">{r.region}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="relative h-28 w-9 overflow-hidden border-2"
                    style={{ borderColor: '#8b6f47', background: 'rgba(139,111,71,0.06)' }}>
                    {/* concrete-dam segmentation lines */}
                    <span className="absolute inset-x-0" style={{ top: '25%', height: '1px', background: 'rgba(139,111,71,0.4)' }} />
                    <span className="absolute inset-x-0" style={{ top: '50%', height: '1px', background: 'rgba(139,111,71,0.4)' }} />
                    <span className="absolute inset-x-0" style={{ top: '75%', height: '1px', background: 'rgba(139,111,71,0.4)' }} />
                    {/* fill */}
                    <span className="absolute bottom-0 left-0 right-0" style={{ height: `${r.capacityFillPct}%`, background: `linear-gradient(180deg, ${col} 0%, color-mix(in srgb,${col} 50%,#000) 100%)` }} />
                  </div>
                  <div className="text-right">
                    <div className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: col }}>{r.capacityFillPct}<span className="text-[10px] text-ink-muted">%</span></div>
                    <div className="text-[8.5px] text-ink-muted">drawdown {r.drawdownRate}/ep</div>
                    <div className="mt-2 text-[8.5px]">
                      <div className="text-ink-muted">agri alloc</div>
                      <div className="font-semibold tabular-nums text-ink">{r.agriAllocationPct}%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[8.5px]">
                  <span className="text-ink-muted">rural water pressure</span>
                  <span className="tabular-nums" style={{ color: r.ruralWaterPressure > 60 ? '#a8552e' : '#d8a23a' }}>{r.ruralWaterPressure}</span>
                </div>
                <div className="mt-2 text-[9px] uppercase tracking-[0.14em]" style={{ color: col }}>{r.status}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Climate pressure grid */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: '#8b6f47' }}>· Climate pressure by region</div>
        <div className="overflow-hidden border" style={{ borderColor: 'color-mix(in srgb,#8b6f47 35%,rgb(var(--c-line)))' }}>
          <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr] gap-px bg-line text-[9.5px]">
            {/* Header row */}
            <div className="bg-black/40 px-3 py-1.5 text-[8.5px] uppercase tracking-[0.16em] text-ink-muted">Region</div>
            <div className="bg-black/40 px-2 py-1.5 text-center text-[8.5px] uppercase tracking-[0.16em]" style={{ color: '#d8a23a' }}>Drought</div>
            <div className="bg-black/40 px-2 py-1.5 text-center text-[8.5px] uppercase tracking-[0.16em]" style={{ color: '#5a8fa3' }}>Flood</div>
            <div className="bg-black/40 px-2 py-1.5 text-center text-[8.5px] uppercase tracking-[0.16em]" style={{ color: '#a8552e' }}>Wildfire</div>
            <div className="bg-black/40 px-2 py-1.5 text-center text-[8.5px] uppercase tracking-[0.16em]" style={{ color: '#8b6f47' }}>Soil deg.</div>
            <div className="bg-black/40 px-2 py-1.5 text-center text-[8.5px] uppercase tracking-[0.16em]" style={{ color: '#3a7d4a' }}>Survivability</div>
            {b.climate.map(c => (
              <React.Fragment key={c.region}>
                <div className="bg-black/30 px-3 py-2 text-ink">{c.region}</div>
                {[
                  { v: c.droughtIdx, col: '#d8a23a', bad: true },
                  { v: c.floodIdx, col: '#5a8fa3', bad: true },
                  { v: c.wildfireRisk, col: '#a8552e', bad: true },
                  { v: c.soilDegradation, col: '#8b6f47', bad: true },
                  { v: c.climateSurvivability, col: '#3a7d4a', bad: false },
                ].map((cell, idx) => (
                  <div key={idx} className="relative bg-black/20 px-2 py-2 text-center"
                    style={{ background: `linear-gradient(180deg, color-mix(in srgb,${cell.col} ${Math.min(40, Math.round(cell.v / 3))}%, #03070f) 0%, #03070f 100%)` }}>
                    <div className="font-semibold tabular-nums" style={{ color: cell.col }}>{cell.v}</div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-ink-muted">
        Reservoirs falling below 50% engage rationing; below 30% trigger emergency-water allocation chains
        coordinated with Environment and Health. Survivability is the composite resilience reading per region.
      </p>
    </div>
  );
}
