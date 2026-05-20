'use client';

// Justice — Continuity Foresight. Constitutional crisis cascade
// chronology + 20-year forecast trajectories. A judicial chamber
// long-view, not an operational dashboard.

import * as React from 'react';
import { justiceContinuityBoard, type JusticeIncident } from '@/lib/gov/justice-continuity';

const CHARCOAL = '#1a1d24';
const PANEL = '#1e2129';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';

const SEV_COL: Record<JusticeIncident['severity'], string> = {
  advisory: BRONZE, elevated: '#a05538', critical: BURGUNDY, national: '#5e1d24',
};

function Trajectory({ label, series, color }: { label: string; series: number[]; color: string }) {
  const min = Math.min(...series), max = Math.max(...series);
  const range = Math.max(1, max - min);
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = end - start;
  return (
    <div className="px-4 py-4" style={{ background: CHARCOAL, border: `1px solid ${RULE}` }}>
      <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{label}</div>
      <div className="mt-3 flex items-end gap-3" style={{ height: '60px' }}>
        {series.map((v, i) => (
          <div key={i} className="flex-1">
            <div className="w-full" style={{ height: `${20 + ((v - min) / range) * 40}px`, background: color, opacity: 0.4 + i * 0.15 }} />
            <div className="mt-1 text-center tabular-nums text-[9px]" style={{ color: MUT }}>+{[5, 10, 15, 20][i]}y</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em]">
        <span style={{ color: MUT }}>start <span className="ml-1 tabular-nums" style={{ color: INK }}>{start}</span></span>
        <span style={{ color: delta >= 0 ? NAVY : BURGUNDY }}>{delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}</span>
        <span style={{ color: MUT }}>horizon <span className="ml-1 tabular-nums" style={{ color: color }}>{end}</span></span>
      </div>
    </div>
  );
}

export function JusticeContinuityForesight({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const f = b.forecast;
  return (
    <div className="space-y-px" style={{ background: RULE, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Forecast row */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-4 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>⏳ Long-view forecast — 20 years</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Constitutional and judicial trajectory</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>legitimacy · {f.legitimacyTrajectory}</span>
        </header>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <Trajectory label="Constitutional integrity" series={f.constitutionalIntegrityTrajectory} color={NAVY} />
          <Trajectory label="Judicial independence" series={f.judicialIndependenceTrajectory} color={BRONZE} />
          <Trajectory label="Rights confidence" series={f.rightsConfidenceTrajectory} color="#5d7a6d" />
          <Trajectory label="Case backlog index" series={f.caseBacklogProjection} color={BURGUNDY} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border px-4 py-3" style={{ borderColor: RULE, background: PANEL }}>
            <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>Constitutional crisis risk</div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-1.5 flex-1" style={{ background: 'rgba(140,106,58,0.18)' }}>
                <div className="h-full" style={{ width: `${f.constitutionalCrisisRisk}%`, background: f.constitutionalCrisisRisk >= 60 ? BURGUNDY : f.constitutionalCrisisRisk >= 30 ? BRONZE : NAVY }} />
              </div>
              <span className="tabular-nums text-[14px]" style={{ color: f.constitutionalCrisisRisk >= 60 ? BURGUNDY : f.constitutionalCrisisRisk >= 30 ? BRONZE : NAVY }}>{f.constitutionalCrisisRisk}</span>
            </div>
          </div>
          <div className="border px-4 py-3" style={{ borderColor: RULE, background: PANEL }}>
            <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>Legitimacy composite</div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-1.5 flex-1" style={{ background: 'rgba(140,106,58,0.18)' }}>
                <div className="h-full" style={{ width: `${f.legitimacyTrajectory}%`, background: f.legitimacyTrajectory >= 75 ? NAVY : f.legitimacyTrajectory >= 60 ? BRONZE : BURGUNDY }} />
              </div>
              <span className="tabular-nums text-[14px]" style={{ color: f.legitimacyTrajectory >= 75 ? NAVY : f.legitimacyTrajectory >= 60 ? BRONZE : BURGUNDY }}>{f.legitimacyTrajectory}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <section className="flex flex-wrap items-baseline gap-4 px-6 py-3" style={{ background: PANEL }}>
          <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>Cross-branch engagement</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="text-[11px]" style={{ color: IVORY }}>
              <span style={{ color: BRONZE }}>§</span> {m.ministry} <span className="ml-1 tabular-nums" style={{ color: MUT }}>·{m.engaged}</span>
            </span>
          ))}
        </section>
      ) : null}

      {/* Cascade chronology */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>⚖ Constitutional Crisis Cascade</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Judicial incidents propagating across the executive</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>most severe first</span>
        </header>
        <ol className="space-y-3">
          {b.incidents.slice(0, 5).map(i => (
            <li key={i.id} className="border-l-2 pl-4" style={{ borderColor: SEV_COL[i.severity] }}>
              <div className="flex items-baseline gap-3">
                <span className="tabular-nums text-[10px]" style={{ color: BRONZE }}>{i.id}</span>
                <span className="text-[12px] uppercase tracking-[0.12em]" style={{ color: IVORY }}>{i.kind.replace(/-/g, ' ')}</span>
                <span className="text-[10px]" style={{ color: MUT }}>· {i.origin}</span>
                <span className="ml-auto text-[10px] uppercase tracking-[0.18em]" style={{ color: SEV_COL[i.severity] }}>· {i.severity}</span>
              </div>
              <div className="mt-1 text-[10px]" style={{ color: MUT }}>
                {i.ageDays}d in chamber · verdict: <span className="uppercase tracking-[0.18em]" style={{ color: i.reviewVerdict === 'precedent-set' ? NAVY : i.reviewVerdict === 'ruling-issued' ? BRONZE : i.reviewVerdict === 'review' ? BRONZE : MUT }}>· {i.reviewVerdict}</span>
              </div>
              <div className="mt-2 border-l pl-3" style={{ borderColor: 'rgba(140,106,58,0.18)' }}>
                {i.ministryCascade.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-[160px_1fr_60px_110px] items-baseline gap-3 py-1 text-[11px]">
                    <span style={{ color: IVORY }}>{c.ministry}</span>
                    <span style={{ color: MUT }}>{c.effect}</span>
                    <span className="text-right tabular-nums" style={{ color: BRONZE }}>+{c.delayHrs}h</span>
                    <span className="text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: c.status === 'cleared' ? NAVY : c.status === 'engaged' ? BRONZE : MUT }}>· {c.status}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t px-6 py-4 text-[10px] uppercase tracking-[0.24em]" style={{ borderColor: RULE, color: MUT, background: CHARCOAL }}>
        A constitutional breach is never local — it propagates through Interior, Treasury, Legislature and the Cabinet until resolved by ruling.
      </footer>
    </div>
  );
}
