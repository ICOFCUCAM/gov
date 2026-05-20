'use client';

// Labour — Social Continuity & Crisis Foresight.
// Social pressure heat-bars, labour rights disputes ledger, labour
// incident cascade and 25-year workforce trajectory. Rounded civic
// palette; line traces shaped as polyline broken bars (not curves,
// not constellations, not contours).

import * as React from 'react';
import { workforceContinuityBoard, type LaborIncident, type LaborDispute } from '@/lib/gov/workforce-continuity';

const CIVIC = '#2e6aa6';
const TEAL = '#3a8a82';
const COPPER = '#a45f3a';
const AMBER = '#c08b3a';
const SLATE = '#5e6770';
const SLATE_DARK = '#2a2f36';
const SLATE_DEEP = '#1d2128';
const PAPER = '#f4efe5';
const PANEL = '#262b33';
const PANEL2 = '#2e343d';
const INK = '#dad8d0';
const MUT = '#8a8e95';
const ALERT = '#b04030';

const SEV_COL: Record<LaborIncident['severity'], string> = {
  advisory: SLATE, elevated: AMBER, critical: COPPER, national: ALERT,
};

const RIGHTS_COL: Record<LaborDispute['rightsStatus'], string> = {
  safeguarded: TEAL, 'under-review': AMBER, alert: ALERT,
};

const STAGE_GLYPH: Record<LaborDispute['stage'], string> = {
  filed: '◉', mediation: '◐', tribunal: '◑', arbitration: '◒', resolved: '○',
};

// Polyline broken-bar trajectory — pixelated continuity line
function BrokenBarTrajectory({ label, series, color, max = 100, baseline, unit }: { label: string; series: number[]; color: string; max?: number; baseline?: number; unit?: string }) {
  const w = 280, h = 70;
  const bars = series.length;
  const barW = (w - 14) / bars - 4;
  return (
    <div className="rounded-md px-4 py-4" style={{ background: PANEL2, border: `1px solid ${SLATE}30` }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={7} y1={p * (h - 12) + 6} x2={w - 7} y2={p * (h - 12) + 6} stroke="rgba(218,216,208,0.06)" />
        ))}
        {baseline !== undefined && (
          <line x1={7} y1={(h - 12) - (baseline / max) * (h - 18) + 6} x2={w - 7} y2={(h - 12) - (baseline / max) * (h - 18) + 6}
            stroke={SLATE} strokeDasharray="3 4" />
        )}
        {series.map((v, i) => {
          const x = 7 + i * (barW + 4);
          const barH = Math.max(2, (v / max) * (h - 18));
          const y = (h - 8) - barH;
          // step-cap top
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.2} />
              {/* polyline broken cap */}
              <line x1={x} y1={y} x2={x + barW} y2={y} stroke={color} strokeWidth={2} />
              <text x={x + barW / 2} y={h - 0.5} fontSize={7.5} fill={MUT} textAnchor="middle">+{[5, 10, 15, 20, 25][i]}y</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[10px]">
        <span style={{ color: MUT }}>now <span className="ml-1 tabular-nums" style={{ color: INK }}>{series[0]}{unit ?? ''}</span></span>
        <span style={{ color: (series[series.length - 1]! - series[0]!) >= 0 ? TEAL : COPPER }}>
          {(series[series.length - 1]! - series[0]!) >= 0 ? '↗' : '↘'} {Math.abs(series[series.length - 1]! - series[0]!)}{unit ?? ''}
        </span>
        <span style={{ color: MUT }}>+25y <span className="ml-1 tabular-nums" style={{ color }}>{series[series.length - 1]}{unit ?? ''}</span></span>
      </div>
    </div>
  );
}

export function SocialContinuityCrisis({ id, now }: { id: string; now: number }) {
  void id;
  const b = workforceContinuityBoard(now);
  const p = b.pressure;
  const f = b.forecast;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      {/* Header */}
      <header className="px-8 py-5" style={{ background: `linear-gradient(180deg, ${SLATE_DARK} 0%, ${PANEL} 100%)`, borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>Social Continuity &amp; Crisis Foresight</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>25-year workforce trajectory · {b.incidents.length} active labour incidents</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '440px' }}>
            {[
              { l: 'Generational continuity', v: f.generationalContinuityIdx, c: f.generationalContinuityIdx >= 70 ? TEAL : f.generationalContinuityIdx >= 55 ? CIVIC : COPPER },
              { l: 'Social sustainability', v: f.socialSustainabilityIdx, c: f.socialSustainabilityIdx >= 70 ? TEAL : CIVIC },
              { l: 'Systemic risk', v: f.systemicLaborRisk, c: f.systemicLaborRisk >= 60 ? ALERT : f.systemicLaborRisk >= 30 ? AMBER : TEAL },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2.5" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Social pressure heat strip */}
      <section className="px-8 py-5" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>♨ Social pressure heat strip</h3>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>4 national pressures · {p.regionalHardship.length} regions</span>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {[
            { l: 'Social unrest', v: p.socialUnrestIdx },
            { l: 'Wage pressure', v: p.wagePressureIdx },
            { l: 'Household inflation', v: p.householdInflationImpactIdx },
            { l: 'Labour-market instability', v: p.laborMarketInstabilityIdx },
          ].map(x => {
            const col = x.v >= 60 ? ALERT : x.v >= 40 ? AMBER : x.v >= 25 ? CIVIC : TEAL;
            return (
              <div key={x.l} className="rounded-lg px-4 py-3" style={{ background: PANEL2 }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: MUT }}>{x.l}</span>
                  <span className="tabular-nums text-[16px]" style={{ color: col }}>{x.v}</span>
                </div>
                <div className="mt-2 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${TEAL} 0%, ${CIVIC} 25%, ${AMBER} 60%, ${ALERT} 100%)`, opacity: 0.45 }} />
                <div className="relative -mt-2 h-2">
                  <div className="absolute top-0 h-2 w-1.5 rounded-sm" style={{ left: `${Math.min(98, x.v)}%`, background: col, boxShadow: '0 0 6px rgba(0,0,0,0.4)' }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* regional hardship strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {p.regionalHardship.map(r => {
            const col = r.tone === 'alert' ? ALERT : r.tone === 'warn' ? AMBER : TEAL;
            return (
              <div key={r.region} className="rounded-md px-3 py-2" style={{ background: SLATE_DEEP, border: `1px solid ${col}40` }}>
                <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>{r.region}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="tabular-nums text-[14px]" style={{ color: col }}>{r.hardshipIdx}</span>
                  <span className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: col }}>· {r.tone}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Labour disputes ledger */}
      <section className="px-8 py-5" style={{ background: SLATE_DEEP, borderTop: `1px solid ${SLATE}30` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>⚖ Labour rights · active disputes ledger</h3>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>
            {b.rights.inspectionsActive} inspections · safety idx {b.rights.occupationalSafetyIdx} · compliance {b.rights.complianceIdx}%
          </span>
        </div>
        <div className="overflow-hidden rounded-lg" style={{ background: PANEL }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT }}>
                <th className="px-4 py-2">№</th>
                <th className="px-4 py-2">Sector / Region</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2 text-right">Workers</th>
                <th className="px-4 py-2 text-right">Days open</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2 text-right">Rights</th>
              </tr>
            </thead>
            <tbody>
              {b.rights.disputes.map((d, i) => (
                <tr key={d.id} className="border-t" style={{ borderColor: 'rgba(218,216,208,0.05)' }}>
                  <td className="px-4 py-2 tabular-nums" style={{ color: MUT }}>{String(i + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-2" style={{ color: INK }}>{d.sector}<span className="ml-2 text-[9.5px]" style={{ color: MUT }}>· {d.region}</span></td>
                  <td className="px-4 py-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: COPPER }}>{d.kind.replace(/-/g, ' ')}</td>
                  <td className="px-4 py-2 text-right tabular-nums" style={{ color: INK }}>{d.workersAffectedK.toLocaleString()}K</td>
                  <td className="px-4 py-2 text-right tabular-nums" style={{ color: d.daysOpen > 90 ? AMBER : SLATE }}>{d.daysOpen}d</td>
                  <td className="px-4 py-2 text-[10px]" style={{ color: CIVIC }}><span className="mr-1">{STAGE_GLYPH[d.stage]}</span>{d.stage}</td>
                  <td className="px-4 py-2 text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: RIGHTS_COL[d.rightsStatus] }}>● {d.rightsStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <section className="flex flex-wrap items-baseline gap-3 px-8 py-3" style={{ background: PANEL2, borderTop: `1px solid ${SLATE}30` }}>
          <span className="text-[9px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>↣ Cross-ministry cascade</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="rounded-full px-3 py-1 text-[10.5px]" style={{ background: PANEL, color: INK }}>
              {m.ministry} <span className="ml-1 tabular-nums" style={{ color: AMBER }}>·{m.engaged}</span>
            </span>
          ))}
        </section>
      ) : null}

      {/* Incident chronology */}
      <section className="px-8 py-6" style={{ background: PANEL, borderTop: `1px solid ${SLATE}30` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>⚠ Labour incident chronology · cross-ministry cascade</h3>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>{b.incidents.length} active incidents</span>
        </div>
        <div className="space-y-3">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="overflow-hidden rounded-lg" style={{ background: PANEL2, borderLeft: `4px solid ${SEV_COL[i.severity]}` }}>
              <div className="grid grid-cols-1 gap-px md:grid-cols-[200px_1fr]" style={{ background: `${SLATE}40` }}>
                <div className="px-4 py-3" style={{ background: SLATE_DEEP }}>
                  <div className="tabular-nums text-[10px]" style={{ color: MUT }}>{i.id}</div>
                  <div className="mt-1 text-[12px]" style={{ color: PAPER }}>{i.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[10px]" style={{ color: MUT }}>{i.region} · {i.ageDays}d</div>
                  <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ background: `${SEV_COL[i.severity]}22`, color: SEV_COL[i.severity] }}>● {i.severity}</div>
                  <div className="mt-2 text-[9.5px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>{i.workersAffectedK.toLocaleString()}K workers</div>
                  <div className="text-[9px] italic" style={{ color: MUT }}>↻ {i.recoveryPathway.replace(/-/g, ' ')}</div>
                </div>
                <div className="px-4 py-3" style={{ background: PANEL2 }}>
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {i.ministryCascade.map((c, idx) => (
                      <div key={idx} className="rounded-md px-3 py-1.5 text-[11px]" style={{ background: PANEL, borderTop: `2px solid ${c.status === 'cleared' ? TEAL : c.status === 'engaged' ? AMBER : SLATE}` }}>
                        <div className="flex items-baseline justify-between">
                          <span style={{ color: INK }}>{c.ministry}</span>
                          <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: c.status === 'cleared' ? TEAL : c.status === 'engaged' ? AMBER : MUT }}>· {c.status}</span>
                        </div>
                        <div className="text-[9.5px]" style={{ color: MUT }}>{c.effect}</div>
                        <div className="mt-0.5 text-right text-[9px] tabular-nums" style={{ color: CIVIC }}>+{c.delayHrs}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 25-year trajectory */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP, borderTop: `1px solid ${SLATE}30` }}>
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>↗ 25-year workforce trajectory · stepped horizon</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <BrokenBarTrajectory label="Employment continuity" series={f.employmentTrajectory} color={TEAL} baseline={75} />
          <BrokenBarTrajectory label="Participation" series={f.participationTrajectory} color={CIVIC} baseline={70} unit="%" />
          <BrokenBarTrajectory label="Productivity" series={f.productivityTrajectory} color={AMBER} baseline={70} />
          <BrokenBarTrajectory label="Automation displacement" series={f.automationDisplacementTrajectory} color={COPPER} baseline={30} />
          <BrokenBarTrajectory label="Pension solvency" series={f.pensionSolvencyTrajectory} color={SLATE} baseline={60} />
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL2, borderTop: `1px solid ${SLATE}30` }}>
        <span className="text-[9px] uppercase tracking-[0.36em]" style={{ color: MUT }}>
          ◇ A society endures only when its workforce continuity outlives any single generation ◇
        </span>
      </footer>
    </div>
  );
}
