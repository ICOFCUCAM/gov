'use client';

// Foreign Affairs — International Crisis & Strategic Foresight.
// Negotiation-stage timeline ledger + 20-year geopolitical forecast
// rendered as dotted constellation traces. Crisis incidents move
// across stage rails (observation → resolution) with cross-ministry
// cables radiating outward.

import * as React from 'react';
import { foreignAffairsBoard, type DiplomaticIncident } from '@/lib/gov/foreign-affairs';

const MIDNIGHT = '#0e1b3a';
const MIDNIGHT_DEEP = '#08122a';
const CHARCOAL = '#16181f';
const PANEL = '#1a1c24';
const GOLD = '#a78947';
const GOLD_DIM = '#7a6233';
const SILVER = '#a8aab0';
const BURGUNDY = '#6b2a35';
const INK = '#dad9d2';
const PARCH = '#ece6d3';
const MUT = '#7a7e88';
const TRACE = 'rgba(167,137,71,0.22)';

const SEV_COL: Record<DiplomaticIncident['severity'], string> = {
  advisory: SILVER, elevated: GOLD, critical: '#a05538', national: BURGUNDY,
};
const STAGES = ['observation', 'consultation', 'demarche', 'mediation', 'arbitration', 'resolution'] as const;

function ConstellationTrace({ label, series, color }: { label: string; series: number[]; color: string }) {
  const w = 260, h = 60;
  const min = Math.min(...series), max = Math.max(...series);
  const range = Math.max(1, max - min);
  const start = series[0]!; const end = series[series.length - 1]!;
  const delta = end - start;
  const points = series.map((v, i) => ({ x: (i / (series.length - 1)) * (w - 8) + 4, y: h - 8 - ((v - min) / range) * (h - 16) }));
  return (
    <div className="px-4 py-4" style={{ background: PANEL, border: `1px solid ${TRACE}` }}>
      <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: MUT }}>{label}</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 block" aria-hidden>
        {/* dotted baseline */}
        <line x1={4} y1={h - 8} x2={w - 4} y2={h - 8} stroke={GOLD_DIM} strokeDasharray="1 4" strokeOpacity={0.5} />
        {/* dotted segments */}
        {points.slice(1).map((p, i) => {
          const prev = points[i]!;
          return <line key={i} x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={color} strokeDasharray="2 4" strokeWidth={1} strokeOpacity={0.7} />;
        })}
        {/* stars */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.5} fill={color} />
            <circle cx={p.x} cy={p.y} r={5} fill={color} fillOpacity={0.18} />
            <text x={p.x} y={h - 0.5} textAnchor="middle" fontSize={7.5} fill={MUT}>+{[5, 10, 15, 20][i]}y</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[10px]">
        <span style={{ color: MUT }}>now <span className="ml-1 tabular-nums" style={{ color: INK }}>{start}</span></span>
        <span style={{ color: delta >= 0 ? GOLD : BURGUNDY }}>{delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}</span>
        <span style={{ color: MUT }}>+20y <span className="ml-1 tabular-nums" style={{ color }}>{end}</span></span>
      </div>
    </div>
  );
}

function StageRail({ stage }: { stage: DiplomaticIncident['negotiationStage'] }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => (
        <React.Fragment key={s}>
          <span title={s} className="block rounded-full" style={{
            width: i === idx ? '8px' : '5px',
            height: i === idx ? '8px' : '5px',
            background: i <= idx ? GOLD : GOLD_DIM,
            opacity: i <= idx ? 1 : 0.35,
          }} />
          {i < STAGES.length - 1 ? <span className="block h-px w-3" style={{ background: i < idx ? GOLD_DIM : 'rgba(167,137,71,0.18)' }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function InternationalCrisisForesight({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsBoard(now);
  const f = b.forecast;
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· Crisis Coordination &amp; Strategic Foresight ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: PARCH }}>20-year geopolitical trajectory — civilizational standing {f.civilizationalStandingIdx}</h2>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>geopolitical crisis risk</div>
            <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: f.geopoliticalCrisisRisk >= 60 ? BURGUNDY : f.geopoliticalCrisisRisk >= 35 ? '#a05538' : GOLD }}>{f.geopoliticalCrisisRisk}</div>
          </div>
        </div>
      </header>

      {/* Constellation forecast */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP, borderBottom: `1px solid ${TRACE}` }}>
        <div className="mb-4 text-[9px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>✦ Strategic constellation · trajectories at +5/+10/+15/+20 years</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ConstellationTrace label="Alignment" series={f.alignmentTrajectory} color={GOLD} />
          <ConstellationTrace label="Alliance integrity" series={f.allianceIntegrityTrajectory} color={SILVER} />
          <ConstellationTrace label="Influence" series={f.influenceTrajectory} color={GOLD_DIM} />
          <ConstellationTrace label="Global coordination" series={f.globalCoordinationTrajectory} color="#5a7d8f" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { l: 'Civilizational standing', v: f.civilizationalStandingIdx, t: f.civilizationalStandingIdx >= 75 ? GOLD : SILVER },
            { l: 'Long-horizon sovereignty', v: f.longHorizonSovereigntyIdx, t: f.longHorizonSovereigntyIdx >= 70 ? GOLD : SILVER },
            { l: 'Crisis risk', v: f.geopoliticalCrisisRisk, t: f.geopoliticalCrisisRisk >= 60 ? BURGUNDY : f.geopoliticalCrisisRisk >= 30 ? '#a05538' : GOLD },
          ].map(x => (
            <div key={x.l} className="px-5 py-3" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
              <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-[2px] flex-1" style={{ background: '#0d1428' }}>
                  <div className="h-full" style={{ width: `${x.v}%`, background: x.t }} />
                </div>
                <span className="tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <section className="flex flex-wrap items-baseline gap-4 px-8 py-3" style={{ background: PANEL, borderBottom: `1px solid ${TRACE}` }}>
          <span className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>✦ Cross-ministry cables active</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="px-3 py-1 text-[10.5px] italic" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, color: PARCH }}>
              {m.ministry} <span className="ml-1 tabular-nums not-italic" style={{ color: GOLD }}>·{m.engaged}</span>
            </span>
          ))}
        </section>
      ) : null}

      {/* Incident ledger */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP }}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span style={{ color: GOLD }}>✷</span>
            <h3 className="text-[11px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>Active Diplomatic Incidents · negotiation stage timeline</h3>
          </div>
          <span className="text-[9px] italic" style={{ color: MUT }}>most severe first</span>
        </div>
        <div className="space-y-3">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="px-6 py-4" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, borderLeft: `3px solid ${SEV_COL[i.severity]}` }}>
              <div className="flex items-baseline gap-3">
                <span className="tabular-nums text-[10px]" style={{ color: GOLD_DIM }}>{i.id}</span>
                <span className="text-[13px] tracking-[0.04em] italic" style={{ color: PARCH }}>{i.kind.replace(/-/g, ' ')}</span>
                <span className="text-[10px] italic" style={{ color: MUT }}>· {i.counterparty} · {i.region}</span>
                <span className="ml-auto text-[10px] uppercase tracking-[0.32em]" style={{ color: SEV_COL[i.severity] }}>· {i.severity}</span>
              </div>
              <div className="mt-3 flex items-center gap-6">
                <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>stage</span>
                <StageRail stage={i.negotiationStage} />
                <span className="text-[10px] italic" style={{ color: GOLD }}>· {i.negotiationStage}</span>
                <span className="ml-auto text-[10px]" style={{ color: MUT }}>{i.ageDays}d</span>
              </div>
              {/* cross-ministry cables */}
              <div className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-2">
                {i.ministryCascade.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-[150px_1fr_50px_90px] items-baseline gap-2 px-3 py-1.5 text-[11px]" style={{ background: PANEL, borderLeft: `1px dotted ${c.status === 'cleared' ? GOLD : c.status === 'engaged' ? '#a05538' : GOLD_DIM}` }}>
                    <span style={{ color: PARCH }}>{c.ministry}</span>
                    <span className="text-[10px] italic" style={{ color: MUT }}>{c.effect}</span>
                    <span className="text-right tabular-nums text-[10px]" style={{ color: GOLD_DIM }}>+{c.delayHrs}h</span>
                    <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: c.status === 'cleared' ? GOLD : c.status === 'engaged' ? '#a05538' : MUT }}>· {c.status}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: MIDNIGHT, borderTop: `1px solid ${TRACE}` }}>
        <span className="text-[9px] uppercase tracking-[0.4em] italic" style={{ color: GOLD_DIM }}>
          ✦ ✧ ✶ ✷  ·  Diplomacy is a long art — the cables outlive the dispatch  ·  ✷ ✶ ✧ ✦
        </span>
      </footer>
    </div>
  );
}
