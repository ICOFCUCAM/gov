'use client';

// Trade & Industry — Trade Corridors & Export Operations.
// Trade-route geometry: corridor flow rails (mode-coded), partner
// throughput strip, tariff pressure marquee. Cargo container row
// units across the bottom. Steel/blue/amber palette; no chamber, no
// circles, no manuscript.

import * as React from 'react';
import { industrialContinuityBoard, type TradeCorridor } from '@/lib/gov/industrial-continuity';

const STEEL_DARK = '#2a2e36';
const PANEL = '#23272f';
const PANEL2 = '#1c1f25';
const EXPORT_BLUE = '#3a78c4';
const AMBER = '#c98538';
const SILVER = '#c4c8d0';
const INK = '#dbdee4';
const MUT = '#7c828d';
const ALERT = '#c44a3a';
const RIVET = 'rgba(196,200,208,0.18)';

const STATUS_COL: Record<TradeCorridor['status'], string> = {
  open: EXPORT_BLUE, restricted: AMBER, congested: '#a05538', closed: ALERT,
};

const MODE_GLYPH: Record<TradeCorridor['mode'], string> = {
  maritime: '⛴', rail: '═', road: '▭', air: '✈',
};

function CorridorRail({ co }: { co: TradeCorridor }) {
  const segments = 24;
  const filled = Math.round((co.throughputIdx / 100) * segments);
  const col = STATUS_COL[co.status];
  return (
    <div className="grid grid-cols-[40px_220px_1fr_60px_50px_110px] items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${RIVET}` }}>
      <span className="text-[18px] leading-none" style={{ color: col }}>{MODE_GLYPH[co.mode]}</span>
      <div>
        <div className="text-[12px]" style={{ color: INK }}>{co.corridor}</div>
        <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>· {co.mode} · {co.partner}</div>
      </div>
      <div className="flex items-center gap-[2px]" aria-hidden>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className="h-3 flex-1" style={{
            background: i < filled ? col : '#15171c',
            opacity: i < filled ? 0.5 + (i / segments) * 0.5 : 1,
            boxShadow: i < filled ? `inset 0 0 0 1px ${col}33` : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
          }} />
        ))}
      </div>
      <span className="text-right tabular-nums text-[12px]" style={{ color: col }}>{co.throughputIdx}</span>
      <span className="text-right tabular-nums text-[11px]" style={{ color: co.clearanceDays >= 10 ? AMBER : MUT }}>{co.clearanceDays}d</span>
      <span className="text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: col }}>▮ {co.status}</span>
    </div>
  );
}

export function TradeCorridorsExports({ id, now }: { id: string; now: number }) {
  void id;
  const b = industrialContinuityBoard(now);
  const open = b.corridors.filter(c => c.status === 'open').length;
  const closedOrRestricted = b.corridors.filter(c => c.status === 'closed' || c.status === 'restricted').length;
  const avgThroughput = Math.round(b.corridors.reduce((s, c) => s + c.throughputIdx, 0) / b.corridors.length);
  const avgClearance = Math.round(b.corridors.reduce((s, c) => s + c.clearanceDays, 0) / b.corridors.length);
  const f = b.foreign;
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: INK }}>
      {/* Corridor banner — wire telegraph strip */}
      <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ background: STEEL_DARK, borderBottom: `1px solid ${RIVET}` }}>
        <div className="text-[10px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>━━ TRADE CORRIDORS · EXPORT OPERATIONS ━━</div>
        <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
          <span>open <span className="ml-1 tabular-nums" style={{ color: EXPORT_BLUE }}>{open}/{b.corridors.length}</span></span>
          <span>restricted/closed <span className="ml-1 tabular-nums" style={{ color: closedOrRestricted ? ALERT : MUT }}>{closedOrRestricted}</span></span>
          <span>avg throughput <span className="ml-1 tabular-nums" style={{ color: SILVER }}>{avgThroughput}</span></span>
          <span>avg clearance <span className="ml-1 tabular-nums" style={{ color: avgClearance >= 10 ? AMBER : SILVER }}>{avgClearance}d</span></span>
        </div>
      </div>

      {/* Corridor rails */}
      <section style={{ background: PANEL }}>
        <div className="px-4 py-2 text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT, borderBottom: `1px solid ${RIVET}` }}>
          mode · corridor / partner · throughput segments · idx · clearance · status
        </div>
        {b.corridors.map(co => <CorridorRail key={co.id} co={co} />)}
      </section>

      {/* Partner throughput marquee + export dependencies */}
      <section className="grid grid-cols-1 lg:grid-cols-2" style={{ background: STEEL_DARK }}>
        <div className="px-6 py-5" style={{ borderRight: `1px solid ${RIVET}` }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>◧ TARIFF PRESSURE MARQUEE</h3>
          <div className="space-y-1.5">
            {b.corridors.map(co => (
              <div key={co.id} className="grid grid-cols-[1fr_180px_50px] items-center gap-2 text-[11px]">
                <span style={{ color: INK }}>{co.partner}</span>
                <div className="h-1.5" style={{ background: '#15171c' }}>
                  <div className="h-full" style={{ width: `${Math.min(100, co.tariffPressurePct * 3.5)}%`, background: co.tariffPressurePct >= 18 ? ALERT : co.tariffPressurePct >= 8 ? AMBER : EXPORT_BLUE }} />
                </div>
                <span className="text-right tabular-nums" style={{ color: co.tariffPressurePct >= 18 ? ALERT : co.tariffPressurePct >= 8 ? AMBER : MUT }}>{co.tariffPressurePct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-5">
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>◨ EXPORT DEPENDENCY CONCENTRATION</h3>
          <div className="space-y-2">
            {f.exportDependencies.map(d => (
              <div key={d.partner} className="grid grid-cols-[1fr_60px_120px] items-baseline gap-3">
                <span className="text-[12px]" style={{ color: INK }}>{d.partner}</span>
                <span className="text-right tabular-nums text-[14px]" style={{ color: d.risk === 'concentration' ? AMBER : d.risk === 'moderate' ? SILVER : EXPORT_BLUE }}>{d.sharePct}%</span>
                <span className="text-right text-[9px] uppercase tracking-[0.24em]" style={{ color: d.risk === 'concentration' ? AMBER : d.risk === 'moderate' ? SILVER : MUT }}>· {d.risk}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.24em]">
            {[
              { l: 'GEOPOL.', v: f.geopoliticalPressureIdx, t: f.geopoliticalPressureIdx >= 60 ? ALERT : f.geopoliticalPressureIdx >= 40 ? AMBER : EXPORT_BLUE },
              { l: 'SANCTIONS', v: f.sanctionsExposureIdx, t: f.sanctionsExposureIdx >= 50 ? ALERT : f.sanctionsExposureIdx >= 30 ? AMBER : EXPORT_BLUE },
              { l: 'ALIGNMENT', v: f.strategicAlignmentIdx, t: f.strategicAlignmentIdx >= 70 ? EXPORT_BLUE : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, border: `1px solid ${RIVET}`, color: MUT }}>
                <div>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[14px]" style={{ color: x.t }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trade agreements roster */}
      <section style={{ background: PANEL }}>
        <h3 className="px-6 py-3 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER, borderBottom: `1px solid ${RIVET}` }}>▮▮ TRADE AGREEMENTS · STANDING INSTRUMENTS ({f.agreements.length})</h3>
        <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: RIVET }}>
          {f.agreements.map(a => {
            const col = a.status === 'in-force' ? EXPORT_BLUE : a.status === 'under-review' ? AMBER : a.status === 'suspended' ? '#a05538' : ALERT;
            return (
              <div key={a.id} className="grid grid-cols-[1fr_100px_80px_100px] items-baseline gap-3 px-4 py-3" style={{ background: PANEL }}>
                <span className="text-[12px]" style={{ color: INK }}>{a.partner}<span className="ml-2 text-[10px]" style={{ color: MUT }}>· {a.scope}</span></span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: col }}>▮ {a.status}</span>
                <span className="tabular-nums text-right text-[11px]" style={{ color: MUT }}>{a.yearsRemaining}y left</span>
                <span className="tabular-nums text-right text-[11px]" style={{ color: SILVER }}>share {a.exportShareIdx}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
