'use client';

// Emergency Management — Humanitarian Continuity & Civil Support.
// Shelter network grid with utilisation gauges, infrastructure
// continuity columns, relief-deliveries readout. Operational disciplined
// type, no spectacle.

import * as React from 'react';
import { emergencyResilienceBoard, type ShelterNetwork, type InfrastructureContinuity } from '@/lib/gov/emergency-resilience';

const AMBER = '#d68a2e';
const CRIMSON = '#b8302e';
const RESCUE_WHITE = '#f5f5f0';
const BLUEGRAY = '#4a5a6a';
const HAZARD = '#c75a2a';
const INK = '#dcdcd8';
const INK_DARK = '#1b1f24';
const PANEL = '#1f242b';
const PANEL2 = '#262c34';
const MUT = '#7e848c';
const OK = '#3a8a82';

const SHELTER_COL: Record<ShelterNetwork['status'], string> = {
  available: OK, monitored: AMBER, pressured: HAZARD, full: CRIMSON,
};
const INFRA_COL: Record<InfrastructureContinuity['status'], string> = {
  intact: OK, pressured: AMBER, degraded: CRIMSON, restoring: BLUEGRAY,
};

export function HumanitarianContinuityCoordination({ id, now }: { id: string; now: number }) {
  void id;
  const b = emergencyResilienceBoard(now);
  const h = b.humanitarian;
  const r = b.resilience;
  return (
    <div style={{ background: INK_DARK, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />

      <header className="px-6 py-5" style={{ background: PANEL, borderBottom: `1px solid ${BLUEGRAY}40` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>NEC ▮ HUMANITARIAN CONTINUITY</div>
            <h2 className="mt-2 text-[18px] uppercase tracking-[0.04em]" style={{ color: RESCUE_WHITE }}>{h.displacedPopulationK.toLocaleString()}K displaced · {h.shelterNetworks.length} regional shelter networks</h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center" style={{ fontFamily: 'ui-monospace, monospace' }}>
            {[
              { l: 'FOOD/DAY', v: `${h.emergencyFoodDeliveriesDailyK}K`, c: OK },
              { l: 'WATER/DAY', v: `${h.emergencyWaterDeliveriesDailyM}ML`, c: OK },
              { l: 'COVER (D)', v: `${h.reliefSuppliesCoverDays}`, c: h.reliefSuppliesCoverDays < 14 ? CRIMSON : h.reliefSuppliesCoverDays < 30 ? AMBER : OK },
              { l: 'ACCESS IDX', v: h.humanitarianAccessIdx, c: h.humanitarianAccessIdx >= 80 ? OK : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, borderLeft: `2px solid ${x.c}`, minWidth: '92px' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[14px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Shelter networks */}
      <section className="px-6 py-5" style={{ background: INK_DARK, borderBottom: `1px solid ${BLUEGRAY}30` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>⛺ SHELTER NETWORK · OCCUPANCY GAUGES</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {h.shelterNetworks.map(s => {
            const col = SHELTER_COL[s.status];
            return (
              <div key={s.id} className="px-4 py-3" style={{ background: PANEL, borderTop: `2px solid ${col}`, fontFamily: 'ui-monospace, monospace' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: RESCUE_WHITE }}>{s.region}</span>
                  <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>▮ {s.status}</span>
                </div>
                <div className="mt-2 text-[10px]" style={{ color: MUT }}>{s.shelters} shelters</div>
                {/* gauge */}
                <div className="mt-3 relative h-3" style={{ background: INK_DARK }}>
                  <div className="absolute inset-y-0 left-0" style={{ width: `${s.utilisationPct}%`, background: `repeating-linear-gradient(90deg, ${col} 0 4px, ${col}cc 4px 8px)` }} />
                  {/* threshold ticks 40, 75, 95 */}
                  {[40, 75, 95].map(p => (
                    <div key={p} className="absolute inset-y-0 w-px" style={{ left: `${p}%`, background: 'rgba(245,245,240,0.2)' }} />
                  ))}
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[10px]">
                  <span style={{ color: MUT }}>OCC <span className="ml-1 tabular-nums" style={{ color: INK }}>{s.occupancyK.toLocaleString()}K</span></span>
                  <span style={{ color: col, fontWeight: 700 }} className="tabular-nums">{s.utilisationPct}%</span>
                  <span style={{ color: MUT }}>CAP <span className="ml-1 tabular-nums" style={{ color: INK }}>{s.capacityK.toLocaleString()}K</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Infrastructure continuity */}
      <section className="px-6 py-5" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>⚙ INFRASTRUCTURE CONTINUITY · NATIONAL LIFELINES</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT, fontFamily: 'ui-monospace, monospace' }}>
            resilience · {r.resilienceHardeningIdx} · stability · {r.societalStabilityIdx} · reserves · {r.strategicReserveActivePct}% active
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {r.infrastructure.map(i => {
            const col = INFRA_COL[i.status];
            return (
              <div key={i.domain} className="flex flex-col px-3 py-3" style={{ background: PANEL2, borderTop: `2px solid ${col}`, minHeight: '170px', fontFamily: 'ui-monospace, monospace' }}>
                <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: RESCUE_WHITE }}>{i.domain}</div>
                <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: col }}>▮ {i.status}</div>
                {/* vertical survivability bar */}
                <div className="mt-3 flex items-end gap-2" style={{ height: '70px' }}>
                  <div className="relative flex-1" style={{ height: '100%', background: INK_DARK }}>
                    <div className="absolute inset-x-0 bottom-0" style={{ height: `${i.survivabilityIdx}%`, background: `linear-gradient(180deg, ${col}88 0%, ${col} 100%)` }} />
                    {/* threshold ticks */}
                    {[60, 80].map(p => (
                      <div key={p} className="absolute inset-x-0 h-px" style={{ bottom: `${p}%`, background: 'rgba(245,245,240,0.18)' }} />
                    ))}
                  </div>
                  <div className="flex flex-col items-center" style={{ height: '100%', justifyContent: 'space-between' }}>
                    <span className="text-[8.5px]" style={{ color: MUT }}>SURV</span>
                    <span className="tabular-nums text-[12px]" style={{ color: col }}>{i.survivabilityIdx}</span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8px' }}>REC %</div>
                    <div className="tabular-nums" style={{ color: i.recoveryProgressPct > 90 ? OK : i.recoveryProgressPct > 30 ? AMBER : CRIMSON }}>{i.recoveryProgressPct}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8px' }}>RES D</div>
                    <div className="tabular-nums" style={{ color: i.reserveCoverageDays < 14 ? CRIMSON : i.reserveCoverageDays < 30 ? AMBER : OK }}>{i.reserveCoverageDays}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />
    </div>
  );
}
