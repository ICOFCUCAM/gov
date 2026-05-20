'use client';

// Trade & Industry — Economic Foresight & Industrial Crisis.
// 20-year industrial trajectory bars + crisis cascade timeline.
// Horizon shown as production-rail filaments; crisis incidents as
// industrial-warning blocks with cross-ministry propagation chain.

import * as React from 'react';
import { industrialContinuityBoard, type IndustrialIncident } from '@/lib/gov/industrial-continuity';

const STEEL_DARK = '#2a2e36';
const PANEL = '#23272f';
const PANEL2 = '#1c1f25';
const EXPORT_BLUE = '#3a78c4';
const AMBER = '#c98538';
const SILVER = '#c4c8d0';
const INK = '#dbdee4';
const MUT = '#7c828d';
const ALERT = '#c44a3a';
const NAVY = '#1c3a6a';
const RIVET = 'rgba(196,200,208,0.18)';

const SEV_COL: Record<IndustrialIncident['severity'], string> = {
  advisory: SILVER, elevated: AMBER, critical: '#a05538', national: ALERT,
};

function RailGauge({ label, series, color, max = 100 }: { label: string; series: number[]; color: string; max?: number }) {
  const filaments = 20;
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = end - start;
  return (
    <div className="relative px-4 py-4" style={{ background: PANEL2, border: `1px solid ${RIVET}` }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <div className="mt-3 flex items-end gap-2" style={{ height: '64px' }}>
        {series.map((v, i) => {
          const h = Math.max(8, (v / max) * 60);
          return (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="flex w-full flex-col-reverse gap-[1px]">
                {Array.from({ length: filaments }).map((__, j) => {
                  const active = j < Math.round((v / max) * filaments);
                  return <span key={j} className="block h-[2px]" style={{ background: active ? color : '#15171c', opacity: active ? 0.4 + (j / filaments) * 0.6 : 1 }} />;
                })}
              </div>
              <div className="mt-1 text-center tabular-nums text-[8.5px]" style={{ color: MUT }}>+{[5, 10, 15, 20][i]}y</div>
              {void h}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]">
        <span style={{ color: MUT }}>NOW <span className="ml-1 tabular-nums" style={{ color: INK }}>{start}</span></span>
        <span style={{ color: delta >= 0 ? EXPORT_BLUE : ALERT }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}</span>
        <span style={{ color: MUT }}>+20Y <span className="ml-1 tabular-nums" style={{ color }}>{end}</span></span>
      </div>
    </div>
  );
}

export function EconomicForesightCrisis({ id, now }: { id: string; now: number }) {
  void id;
  const b = industrialContinuityBoard(now);
  const f = b.forecast;
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: INK }}>
      {/* Forecast banner */}
      <div className="flex items-center justify-between px-6 py-4" style={{ background: STEEL_DARK, borderBottom: `1px solid ${RIVET}` }}>
        <div className="text-[10px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>⟪ ECONOMIC INTELLIGENCE · 20-YEAR INDUSTRIAL TRAJECTORY ⟫</div>
        <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
          <span>survivability <span className="ml-1 tabular-nums" style={{ color: f.industrialSurvivabilityIdx >= 75 ? EXPORT_BLUE : f.industrialSurvivabilityIdx >= 55 ? AMBER : ALERT }}>{f.industrialSurvivabilityIdx}</span></span>
          <span>generational compete <span className="ml-1 tabular-nums" style={{ color: SILVER }}>{f.generationalCompetitivenessIdx}</span></span>
          <span>systemic risk <span className="ml-1 tabular-nums" style={{ color: f.systemicEconomicRisk >= 60 ? ALERT : f.systemicEconomicRisk >= 30 ? AMBER : EXPORT_BLUE }}>{f.systemicEconomicRisk}</span></span>
        </div>
      </div>

      {/* Trajectory rails */}
      <section style={{ background: PANEL, padding: '20px 24px', borderBottom: `1px solid ${RIVET}` }}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <RailGauge label="Industrial output" series={f.industrialOutputTrajectory} color={EXPORT_BLUE} />
          <RailGauge label="Export capacity" series={f.exportCapacityTrajectory} color={SILVER} />
          <RailGauge label="Manufacturing capacity" series={f.manufacturingCapacityTrajectory} color={AMBER} max={140} />
          <RailGauge label="Strategic autonomy" series={f.strategicAutonomyTrajectory} color="#5a8db8" />
        </div>
      </section>

      {/* Ministries engaged readout */}
      {b.ministriesEngaged.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 text-[10px]" style={{ background: STEEL_DARK, borderBottom: `1px solid ${RIVET}` }}>
          <span className="uppercase tracking-[0.32em]" style={{ color: SILVER }}>▮ Cross-ministry engagement</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="px-2 py-1 tabular-nums" style={{ background: PANEL2, border: `1px solid ${RIVET}`, color: INK }}>
              {m.ministry} <span className="ml-1" style={{ color: AMBER }}>·{m.engaged}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Crisis cascade timeline */}
      <section style={{ background: PANEL, padding: '20px 24px' }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>⚠ INDUSTRIAL CRISIS CASCADE · CROSS-MINISTRY PROPAGATION</h3>
        <div className="space-y-3">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="grid grid-cols-[120px_1fr]" style={{ background: PANEL2, border: `1px solid ${RIVET}` }}>
              {/* warning bar */}
              <div className="flex flex-col items-center justify-center gap-1 py-4" style={{ background: STEEL_DARK, borderRight: `1px solid ${RIVET}` }}>
                <div className="text-[20px] leading-none" style={{ color: SEV_COL[i.severity] }}>⚠</div>
                <div className="tabular-nums text-[9px]" style={{ color: SILVER }}>{i.id}</div>
                <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: SEV_COL[i.severity] }}>{i.severity}</div>
                <div className="mt-1 tabular-nums text-[9px]" style={{ color: AMBER }}>-{i.outputLossPct}%</div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] uppercase tracking-[0.08em]" style={{ color: INK }}>{i.kind.replace(/-/g, ' ')}</span>
                  <span className="text-[10px]" style={{ color: MUT }}>· origin {i.origin}</span>
                  <span className="ml-auto text-[10px]" style={{ color: MUT }}>{i.ageHours}h · {i.recoveryPathway.replace(/-/g, ' ')}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-2">
                  {i.ministryCascade.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-[140px_1fr_50px_90px] items-baseline gap-2 px-3 py-1.5 text-[11px]" style={{ background: STEEL_DARK, borderLeft: `2px solid ${c.status === 'cleared' ? EXPORT_BLUE : c.status === 'engaged' ? AMBER : MUT}` }}>
                      <span style={{ color: INK }}>{c.ministry}</span>
                      <span style={{ color: MUT, fontSize: '10px' }}>{c.effect}</span>
                      <span className="text-right tabular-nums" style={{ color: SILVER, fontSize: '10px' }}>+{c.delayHrs}h</span>
                      <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: c.status === 'cleared' ? EXPORT_BLUE : c.status === 'engaged' ? AMBER : MUT }}>▮ {c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="px-6 py-3 text-[9px] uppercase tracking-[0.32em]" style={{ background: STEEL_DARK, color: MUT, borderTop: `1px solid ${RIVET}` }}>
        ▮▮ The industrial backbone is sovereign — disruption travels through Treasury, Transport, Energy, Labor, Agriculture, Foreign Affairs and the Cabinet ▮▮
        {void NAVY}
      </div>
    </div>
  );
}
