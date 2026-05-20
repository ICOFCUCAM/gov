'use client';

// Trade & Industry — Supply Chain Intelligence & Commercial Continuity.
// Cargo-container row units, supply-chain flow stripes, industrial-
// district pressure grid. Strategic industries arrayed as a priority
// register with reserve-cover bars.

import * as React from 'react';
import { industrialContinuityBoard, type SupplyChain, type StrategicIndustry, type IndustrialDistrict } from '@/lib/gov/industrial-continuity';

const STEEL_DARK = '#2a2e36';
const PANEL = '#23272f';
const PANEL2 = '#1c1f25';
const EXPORT_BLUE = '#3a78c4';
const AMBER = '#c98538';
const SILVER = '#c4c8d0';
const NAVY = '#1c3a6a';
const INK = '#dbdee4';
const MUT = '#7c828d';
const ALERT = '#c44a3a';
const RIVET = 'rgba(196,200,208,0.18)';

const CHAIN_COL: Record<SupplyChain['status'], string> = {
  flowing: EXPORT_BLUE, thinning: SILVER, choked: AMBER, fractured: ALERT,
};
const RISK_COL: Record<StrategicIndustry['riskClass'], string> = {
  stable: EXPORT_BLUE, pressured: SILVER, critical: AMBER, rationed: ALERT,
};
const PRESSURE_COL: Record<IndustrialDistrict['pressureClass'], string> = {
  stable: EXPORT_BLUE, monitor: SILVER, pressured: AMBER, distressed: ALERT,
};
const PRIORITY_GLYPH: Record<StrategicIndustry['allocationPriority'], string> = {
  sovereign: '◆', critical: '◇', standard: '·',
};

// Cargo container row — units quantised
function CargoRow({ days, max = 120, color }: { days: number; max?: number; color: string }) {
  const units = 18;
  const filled = Math.max(1, Math.round((Math.min(days, max) / max) * units));
  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {Array.from({ length: units }).map((_, i) => (
        <span key={i} className="block h-4 w-2.5" style={{
          background: i < filled ? color : '#15171c',
          border: i < filled ? `1px solid ${color}aa` : `1px solid rgba(196,200,208,0.08)`,
        }} />
      ))}
    </div>
  );
}

export function SupplyChainCommerce({ id, now }: { id: string; now: number }) {
  void id;
  const b = industrialContinuityBoard(now);
  const fractured = b.supplyChains.filter(c => c.status === 'fractured').length;
  const choked = b.supplyChains.filter(c => c.status === 'choked').length;
  const distressed = b.districts.filter(d => d.pressureClass === 'distressed').length;
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: INK }}>
      {/* Container yard masthead */}
      <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: RIVET }}>
        {[
          { l: 'SUPPLY CHAINS', v: `${b.supplyChains.length}`, sub: `${fractured} fractured · ${choked} choked`, t: (fractured || choked) ? AMBER : EXPORT_BLUE },
          { l: 'INDUSTRIAL DISTRICTS', v: `${b.districts.length}`, sub: `${distressed} distressed`, t: distressed ? ALERT : EXPORT_BLUE },
          { l: 'STRATEGIC INDUSTRIES', v: `${b.strategicIndustries.length}`, sub: `${b.strategicIndustries.filter(s => s.rerouteActive).length} reroutes active`, t: SILVER },
        ].map(x => (
          <div key={x.l} className="px-6 py-4" style={{ background: STEEL_DARK }}>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{x.l}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="tabular-nums text-[22px]" style={{ color: x.t }}>{x.v}</span>
              <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUT }}>{x.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Supply chain flow stripes */}
      <section style={{ background: PANEL, padding: '20px 24px', borderBottom: `1px solid ${RIVET}` }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>▮▮▮ SUPPLY-CHAIN FLOW STRIPES ▮▮▮  <span className="ml-2 text-[9px]" style={{ color: MUT }}>cargo unit = ≈7 days of inbound cover</span></h3>
        <div className="space-y-2">
          {b.supplyChains.map(s => (
            <div key={s.id} className="grid grid-cols-[200px_1fr_70px_120px_120px] items-center gap-3 px-3 py-2" style={{ background: PANEL2, border: `1px solid ${RIVET}` }}>
              <div>
                <div className="text-[12px]" style={{ color: INK }}>{s.chain}</div>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>upstream · {s.upstreamSource}</div>
              </div>
              <CargoRow days={s.inboundDaysCover} color={CHAIN_COL[s.status]} />
              <span className="text-right tabular-nums text-[12px]" style={{ color: CHAIN_COL[s.status] }}>{s.inboundDaysCover}d</span>
              <span className="text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: s.bottlenecks ? AMBER : MUT }}>
                {s.bottlenecks} bottleneck{s.bottlenecks === 1 ? '' : 's'}
              </span>
              <span className="text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: CHAIN_COL[s.status] }}>▮ {s.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic industries register */}
      <section style={{ background: STEEL_DARK, padding: '20px 24px', borderBottom: `1px solid ${RIVET}` }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>◆ STRATEGIC PRODUCTION · ALLOCATION PRIORITY REGISTER</h3>
        <div className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: RIVET }}>
          {b.strategicIndustries.map(s => (
            <div key={s.id} className="px-4 py-3" style={{ background: STEEL_DARK }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: INK }}>
                  <span className="mr-2 inline-block w-3 text-center" style={{ color: s.allocationPriority === 'sovereign' ? AMBER : s.allocationPriority === 'critical' ? SILVER : MUT }}>{PRIORITY_GLYPH[s.allocationPriority]}</span>
                  {s.industry}
                </span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: RISK_COL[s.riskClass] }}>· {s.riskClass}</span>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_70px_90px] items-center gap-3">
                <div className="h-1.5" style={{ background: '#15171c' }}>
                  <div className="h-full" style={{ width: `${s.domesticOutputPct}%`, background: RISK_COL[s.riskClass] }} />
                </div>
                <span className="tabular-nums text-[10px]" style={{ color: SILVER }}>dom {s.domesticOutputPct}%</span>
                <span className="text-right tabular-nums text-[10px]" style={{ color: s.reserveDays < 30 ? AMBER : MUT }}>{s.reserveDays}d reserve</span>
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: s.rerouteActive ? AMBER : MUT }}>
                {s.rerouteActive ? '⤴ emergency rerouting active' : '· standard allocation'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Industrial districts pressure grid */}
      <section style={{ background: PANEL, padding: '20px 24px' }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>▭ INDUSTRIAL DISTRICTS · SME CONTINUITY GRID</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {b.districts.map(d => (
            <div key={d.id} className="px-4 py-3" style={{ background: PANEL2, border: `1px solid ${RIVET}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: INK }}>{d.district}</span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: PRESSURE_COL[d.pressureClass] }}>▮ {d.pressureClass}</span>
              </div>
              <div className="text-[10px]" style={{ color: MUT }}>{d.region}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ENTERPRISES</div>
                  <div className="tabular-nums" style={{ color: INK }}>{d.enterprisesActiveK}K</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>SME CONT.</div>
                  <div className="tabular-nums" style={{ color: PRESSURE_COL[d.pressureClass] }}>{d.smeContinuityIdx}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>UTIL</div>
                  <div className="tabular-nums" style={{ color: SILVER }}>{d.utilisationPct}%</div>
                </div>
              </div>
              <div className="mt-3 h-1" style={{ background: '#15171c' }}>
                <div className="h-full" style={{ width: `${d.smeContinuityIdx}%`, background: PRESSURE_COL[d.pressureClass] }} />
              </div>
              {void NAVY}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
