'use client';

// Emergency Management — Resilience, Recovery & Foresight.
// Recovery-programme tiles, national risk matrix (probability ×
// impact), 20-year resilience trajectory, ecological incident
// cascade. Operational discipline, no spectacle.

import * as React from 'react';
import { emergencyResilienceBoard, type RecoveryProgramme, type NationalRisk, type EmergencyIncident } from '@/lib/gov/emergency-resilience';

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

const PROG_COL: Record<RecoveryProgramme['status'], string> = {
  planning: BLUEGRAY, executing: AMBER, monitoring: OK, completing: OK,
};
const RISK_COL: Record<NationalRisk['classification'], string> = {
  low: OK, moderate: AMBER, elevated: HAZARD, severe: CRIMSON,
};
const SEV_COL: Record<EmergencyIncident['severity'], string> = {
  advisory: BLUEGRAY, elevated: AMBER, critical: HAZARD, national: CRIMSON,
};

// 20-year operational telemetry trace — segmented dotted line
function TelemetryTrace({ label, series, color, unit }: { label: string; series: number[]; color: string; unit?: string }) {
  const w = 240, h = 64;
  const min = Math.min(...series), max = Math.max(...series);
  const range = Math.max(1, max - min);
  const pts = series.map((v, i) => ({ x: 8 + (i / (series.length - 1)) * (w - 16), y: h - 10 - ((v - min) / range) * (h - 18) }));
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = end - start;
  return (
    <div className="px-4 py-3" style={{ background: PANEL2, borderLeft: `2px solid ${color}`, fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }}>
      <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {/* segments */}
        {pts.slice(1).map((p, i) => {
          const prev = pts[i]!;
          return <line key={i} x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />;
        })}
        {/* nodes — square (operational discipline) */}
        {pts.map((p, i) => (
          <g key={i}>
            <rect x={p.x - 3} y={p.y - 3} width={6} height={6} fill={color} />
            <text x={p.x} y={h - 1} textAnchor="middle" fontSize={7} fill={MUT}>+{[5, 10, 15, 20][i]}y</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[10px]">
        <span style={{ color: MUT }}>NOW <span className="ml-1 tabular-nums" style={{ color: INK }}>{start}{unit ?? ''}</span></span>
        <span style={{ color: delta >= 0 ? OK : CRIMSON }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}{unit ?? ''}</span>
        <span style={{ color: MUT }}>+20Y <span className="ml-1 tabular-nums" style={{ color }}>{end}{unit ?? ''}</span></span>
      </div>
    </div>
  );
}

export function ResilienceRecoveryForesight({ id, now }: { id: string; now: number }) {
  void id;
  const b = emergencyResilienceBoard(now);
  const f = b.forecast;
  return (
    <div style={{ background: INK_DARK, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />

      <header className="px-6 py-5" style={{ background: PANEL, borderBottom: `1px solid ${BLUEGRAY}40` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.5em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>NEC ▮ RESILIENCE · RECOVERY · FORESIGHT</div>
            <h2 className="mt-2 text-[18px] uppercase tracking-[0.04em]" style={{ color: RESCUE_WHITE }}>20-year national resilience trajectory · {b.incidents.length} active national incidents</h2>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{ fontFamily: 'ui-monospace, monospace' }}>
            {[
              { l: 'CATAS. SURV.', v: f.catastropheSurvivabilityIdx, c: f.catastropheSurvivabilityIdx >= 70 ? OK : f.catastropheSurvivabilityIdx >= 55 ? AMBER : CRIMSON },
              { l: 'RESILIENCE RISK', v: f.systemicResilienceRisk, c: f.systemicResilienceRisk >= 60 ? CRIMSON : f.systemicResilienceRisk >= 30 ? AMBER : OK },
              { l: 'SOCIETAL', v: b.resilience.societalStabilityIdx, c: b.resilience.societalStabilityIdx >= 75 ? OK : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2 text-center" style={{ background: PANEL2, borderLeft: `2px solid ${x.c}`, minWidth: '110px' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 20-year telemetry traces */}
      <section className="px-6 py-5" style={{ background: INK_DARK, borderBottom: `1px solid ${BLUEGRAY}30` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>↗ 20-YEAR RESILIENCE TELEMETRY · +5/+10/+15/+20</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <TelemetryTrace label="Resilience hardening" series={f.resilienceTrajectory} color={OK} />
          <TelemetryTrace label="Preparedness" series={f.preparednessTrajectory} color={AMBER} />
          <TelemetryTrace label="Recovery capacity" series={f.recoveryCapacityTrajectory} color={BLUEGRAY} />
          <TelemetryTrace label="Cascading failure" series={f.cascadingFailureTrajectory} color={CRIMSON} />
        </div>
      </section>

      {/* National risk matrix */}
      <section className="px-6 py-5" style={{ background: PANEL, borderBottom: `1px solid ${BLUEGRAY}30` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>⚠ NATIONAL RISK MATRIX · {b.risks.length} TRACKED RISKS</h3>
        <div className="overflow-hidden" style={{ background: INK_DARK }}>
          <div className="grid grid-cols-[1fr_100px_100px_110px_100px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT, background: PANEL2, fontFamily: 'ui-monospace, monospace' }}>
            <span>RISK KIND</span><span className="text-right">PROB %</span><span className="text-right">IMPACT</span><span className="text-right">PREP.</span><span className="text-right">COMPOSITE</span><span className="text-right">CLASS</span>
          </div>
          {b.risks.map(r => (
            <div key={r.kind} className="grid grid-cols-[1fr_100px_100px_110px_100px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${BLUEGRAY}20`, fontFamily: 'ui-monospace, monospace' }}>
              <span style={{ color: INK }}>{r.kind.replace(/-/g, ' ')}</span>
              <span className="text-right tabular-nums" style={{ color: r.probabilityPct >= 50 ? CRIMSON : r.probabilityPct >= 25 ? AMBER : INK }}>{r.probabilityPct}</span>
              <span className="text-right tabular-nums" style={{ color: r.potentialImpactIdx >= 80 ? CRIMSON : r.potentialImpactIdx >= 60 ? AMBER : INK }}>{r.potentialImpactIdx}</span>
              <span className="text-right tabular-nums" style={{ color: r.preparednessIdx >= 70 ? OK : AMBER }}>{r.preparednessIdx}</span>
              <span className="text-right">
                <span className="inline-flex items-center gap-2">
                  <div className="h-1.5 w-16" style={{ background: PANEL2 }}>
                    <div className="h-full" style={{ width: `${Math.min(100, r.composite)}%`, background: RISK_COL[r.classification] }} />
                  </div>
                  <span className="tabular-nums" style={{ color: RISK_COL[r.classification] }}>{r.composite}</span>
                </span>
              </span>
              <span className="text-right text-[9.5px] uppercase tracking-[0.22em]" style={{ color: RISK_COL[r.classification] }}>● {r.classification}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recovery programmes */}
      <section className="px-6 py-5" style={{ background: INK_DARK, borderBottom: `1px solid ${BLUEGRAY}30` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>↻ RECOVERY &amp; RECONSTRUCTION PROGRAMMES · {b.recovery.length} ACTIVE</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {b.recovery.map(p => (
            <div key={p.id} className="px-4 py-3" style={{ background: PANEL, borderLeft: `3px solid ${PROG_COL[p.status]}`, fontFamily: 'ui-monospace, monospace' }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: RESCUE_WHITE }}>{p.programme}</span>
                <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: PROG_COL[p.status] }}>▮ {p.status}</span>
              </div>
              <div className="text-[10px]" style={{ color: MUT }}>{p.region} · {p.category} · {p.daysActive}d active</div>
              <div className="mt-3 h-2" style={{ background: INK_DARK }}>
                <div className="h-full" style={{ width: `${p.progressPct}%`, background: `linear-gradient(90deg, ${PROG_COL[p.status]}88 0%, ${PROG_COL[p.status]} 100%)` }} />
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[10px]">
                <span style={{ color: MUT }}>PROGRESS <span className="ml-1 tabular-nums" style={{ color: PROG_COL[p.status] }}>{p.progressPct}%</span></span>
                <span style={{ color: MUT }}>FUNDING <span className="ml-1 tabular-nums" style={{ color: OK }}>{p.fundingCommittedBn.toFixed(1)}Bn</span></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <section className="flex flex-wrap items-baseline gap-3 px-6 py-3" style={{ background: PANEL2, borderBottom: `1px solid ${BLUEGRAY}30`, fontFamily: 'ui-monospace, monospace' }}>
          <span className="text-[9px] uppercase tracking-[0.4em]" style={{ color: AMBER }}>↣ CROSS-MINISTRY CASCADE</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="px-3 py-1 text-[10.5px]" style={{ background: PANEL, borderLeft: `2px solid ${AMBER}`, color: INK }}>
              {m.ministry} <span className="ml-1 tabular-nums" style={{ color: AMBER }}>·{m.engaged}</span>
            </span>
          ))}
        </section>
      ) : null}

      {/* Emergency incidents cascade */}
      <section className="px-6 py-5" style={{ background: PANEL }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>⚠ NATIONAL EMERGENCY INCIDENT CASCADE</h3>
        <div className="space-y-2">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="overflow-hidden" style={{ background: PANEL2, borderLeft: `4px solid ${SEV_COL[i.severity]}`, fontFamily: 'ui-monospace, monospace' }}>
              <div className="grid grid-cols-[200px_1fr] gap-px" style={{ background: `${BLUEGRAY}30` }}>
                <div className="px-4 py-3" style={{ background: INK_DARK }}>
                  <div className="text-[10px]" style={{ color: MUT }}>{i.id}</div>
                  <div className="mt-1 text-[12px] uppercase tracking-[0.04em]" style={{ color: RESCUE_WHITE }}>{i.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[10px]" style={{ color: MUT }}>{i.region} · {i.ageHours}h</div>
                  <div className="mt-2 inline-block rounded-sm px-2 py-0.5 text-[9px] uppercase tracking-[0.22em]" style={{ background: `${SEV_COL[i.severity]}22`, color: SEV_COL[i.severity] }}>● {i.severity}</div>
                  <div className="mt-2 text-[9.5px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>{i.populationAffectedK.toLocaleString()}K affected</div>
                  <div className="text-[9px] italic" style={{ color: MUT }}>↻ {i.recoveryPathway.replace(/-/g, ' ')}</div>
                </div>
                <div className="px-4 py-3" style={{ background: PANEL2 }}>
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {i.ministryCascade.map((c, idx) => (
                      <div key={idx} className="grid grid-cols-[130px_1fr_46px_82px] items-baseline gap-2 px-3 py-1.5 text-[11px]" style={{ background: PANEL, borderLeft: `2px solid ${c.status === 'cleared' ? OK : c.status === 'engaged' ? AMBER : BLUEGRAY}` }}>
                        <span style={{ color: INK }}>{c.ministry}</span>
                        <span className="text-[10px]" style={{ color: MUT }}>{c.effect}</span>
                        <span className="text-right tabular-nums text-[10px]" style={{ color: AMBER }}>+{c.delayHrs}h</span>
                        <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: c.status === 'cleared' ? OK : c.status === 'engaged' ? AMBER : MUT }}>· {c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(135deg, ${AMBER} 0 8px, ${INK_DARK} 8px 16px)` }} />
    </div>
  );
}
