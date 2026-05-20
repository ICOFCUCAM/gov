'use client';

// Foreign Affairs — Geopolitical Intelligence Systems.
// Anomaly stream with confidence × novelty scatter, conflict
// probability radial bars, strategic-dependency exposure matrix,
// influence net-balance scales. Distinct from prior Foreign Affairs
// surfaces: scatter plots, radial wedges, paired balance scales,
// not the polar bearing-disc or wax-sealed cards.

import * as React from 'react';
import { foreignAffairsExtendedBoard, type GeopoliticalAnomaly, type ConflictProbability, type StrategicDependency } from '@/lib/gov/foreign-affairs-extended';

const MIDNIGHT = '#0e1b3a';
const MIDNIGHT_DEEP = '#08122a';
const CHARCOAL = '#16181f';
const GOLD = '#a78947';
const GOLD_DIM = '#7a6233';
const SILVER = '#a8aab0';
const BURGUNDY = '#6b2a35';
const INK = '#dad9d2';
const MUT = '#7a7e88';
const TRACE = 'rgba(167,137,71,0.22)';

const TIER_COL: Record<GeopoliticalAnomaly['riskTier'], string> = {
  observation: SILVER, elevated: GOLD, urgent: '#a05538', critical: BURGUNDY,
};
const TRAJ_COL: Record<ConflictProbability['trajectory'], string> = {
  cooling: '#5a7d8f', stable: SILVER, rising: GOLD, spiking: BURGUNDY,
};
const EXPOSURE_COL: Record<StrategicDependency['exposureClass'], string> = {
  low: GOLD, moderate: SILVER, concentration: '#a05538', critical: BURGUNDY,
};
const SIGNAL_GLYPH: Record<GeopoliticalAnomaly['signal'], string> = {
  'military-movement': '◬', 'economic-shock': '$', 'cyber-activity': '⌬', 'political-realignment': '⇋', 'communications-blackout': '◌', 'mass-mobilisation': '⌖',
};
const DRIVER_GLYPH: Record<ConflictProbability['driver'], string> = {
  territorial: '◆', economic: '$', identity: '✦', resource: '⌬', historical: '☉',
};

// Confidence × novelty scatter plot
function AnomalyScatter({ anomalies }: { anomalies: GeopoliticalAnomaly[] }) {
  const w = 540, h = 220;
  const padL = 36, padB = 30, padT = 12, padR = 12;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* gridlines */}
      {[25, 50, 75].map(p => (
        <React.Fragment key={p}>
          <line x1={padL + (plotW * p) / 100} y1={padT} x2={padL + (plotW * p) / 100} y2={h - padB} stroke={TRACE} />
          <line x1={padL} y1={padT + plotH - (plotH * p) / 100} x2={w - padR} y2={padT + plotH - (plotH * p) / 100} stroke={TRACE} />
        </React.Fragment>
      ))}
      {/* axes */}
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke={GOLD_DIM} />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke={GOLD_DIM} />
      {/* axis labels */}
      <text x={(w + padL) / 2} y={h - 8} fontSize={9} fill={MUT} textAnchor="middle" letterSpacing={3} fontFamily="ui-serif, Georgia, serif">CONFIDENCE %</text>
      <text x={10} y={padT + plotH / 2} fontSize={9} fill={MUT} textAnchor="middle" letterSpacing={3} fontFamily="ui-serif, Georgia, serif" transform={`rotate(-90 10 ${padT + plotH / 2})`}>NOVELTY %</text>
      {/* tier zones */}
      <text x={w - padR - 60} y={padT + 12} fontSize={8.5} fill={BURGUNDY} letterSpacing={2}>CRITICAL ZONE</text>
      {/* data points */}
      {anomalies.map((a, i) => {
        const x = padL + (plotW * a.confidence) / 100;
        const y = padT + plotH - (plotH * a.novelty) / 100;
        return (
          <g key={a.id}>
            <circle cx={x} cy={y} r={a.riskTier === 'critical' ? 9 : a.riskTier === 'urgent' ? 7 : 5} fill={TIER_COL[a.riskTier]} fillOpacity={0.18} />
            <circle cx={x} cy={y} r={3.5} fill={TIER_COL[a.riskTier]} />
            <text x={x + 6} y={y - 5} fontSize={8.5} fill={TIER_COL[a.riskTier]} fontFamily="ui-serif, Georgia, serif">{SIGNAL_GLYPH[a.signal]}</text>
            {void i}
          </g>
        );
      })}
    </svg>
  );
}

// Conflict probability radial wedge
function ConflictWedge({ c }: { c: ConflictProbability }) {
  const col = TRAJ_COL[c.trajectory];
  const size = 70, cx = size / 2, cy = size / 2, r = 28;
  // 30-day probability rendered as wedge fill
  const angle = (c.probability30dPct / 100) * Math.PI * 1.4 - Math.PI * 0.7;
  const startA = -Math.PI * 0.7;
  const endA = angle;
  const x1 = cx + Math.cos(startA) * r, y1 = cy + Math.sin(startA) * r;
  const x2 = cx + Math.cos(endA) * r, y2 = cy + Math.sin(endA) * r;
  const largeArc = c.probability30dPct > 50 ? 0 : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
      {/* arc background */}
      <path d={`M${cx + Math.cos(-Math.PI * 0.7) * r} ${cy + Math.sin(-Math.PI * 0.7) * r} A${r} ${r} 0 0 1 ${cx + Math.cos(Math.PI * 0.7) * r} ${cy + Math.sin(Math.PI * 0.7) * r}`}
        fill="none" stroke={TRACE} strokeWidth={6} />
      {/* arc fill */}
      <path d={`M${x1} ${y1} A${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" />
      {/* label */}
      <text x={cx} y={cy - 2} fontSize={12} fill={col} textAnchor="middle" fontFamily="ui-serif, Georgia, serif" fontWeight={700}>{c.probability30dPct}%</text>
      <text x={cx} y={cy + 11} fontSize={7.5} fill={MUT} textAnchor="middle" letterSpacing={2}>30d</text>
    </svg>
  );
}

// Influence balance scale — outbound vs inbound on a fulcrum
function BalanceScale({ inbound, outbound }: { inbound: number; outbound: number }) {
  const w = 120, h = 30;
  const max = Math.max(inbound, outbound, 50);
  const left = (inbound / max) * (w / 2 - 8);
  const right = (outbound / max) * (w / 2 - 8);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      {/* baseline */}
      <line x1={w / 2} y1={3} x2={w / 2} y2={h - 3} stroke={GOLD_DIM} strokeWidth={1} />
      {/* horizontal beam */}
      <line x1={w / 2 - left - 4} y1={h / 2} x2={w / 2 + right + 4} y2={h / 2} stroke={GOLD_DIM} strokeWidth={1} />
      {/* left pan (inbound) */}
      <rect x={w / 2 - left - 6} y={h / 2 + 2} width={6} height={6} fill={BURGUNDY} />
      {/* right pan (outbound) */}
      <rect x={w / 2 + right} y={h / 2 + 2} width={6} height={6} fill={GOLD} />
      <text x={4} y={h / 2 - 4} fontSize={7.5} fill={MUT} letterSpacing={2}>IN {inbound}</text>
      <text x={w - 4} y={h / 2 - 4} fontSize={7.5} fill={MUT} textAnchor="end" letterSpacing={2}>OUT {outbound}</text>
    </svg>
  );
}

export function GeopoliticalIntelligenceSystems({ id, now }: { id: string; now: number }) {
  void id;
  const b = foreignAffairsExtendedBoard(now);
  const g = b.intelligence;
  return (
    <div style={{ background: MIDNIGHT_DEEP, color: INK, fontFamily: 'ui-serif, Georgia, serif' }}>
      <header className="border-b px-8 py-5" style={{ borderColor: TRACE, background: MIDNIGHT }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GOLD }}>· Geopolitical Intelligence Systems ·</div>
            <h2 className="mt-2 text-[18px] tracking-[0.06em]" style={{ color: '#f1efe6' }}>
              {g.anomalies.length} active signals · AI reasoning coverage {g.aiReasoningCoverage}%
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Fusion idx', v: g.intelligenceFusionIdx, c: g.intelligenceFusionIdx >= 75 ? GOLD : SILVER },
              { l: 'AI coverage', v: `${g.aiReasoningCoverage}%`, c: g.aiReasoningCoverage >= 70 ? GOLD : SILVER },
              { l: 'Latency', v: `${g.signalProcessingLatencyMs}ms`, c: g.signalProcessingLatencyMs <= 300 ? GOLD : g.signalProcessingLatencyMs <= 700 ? SILVER : BURGUNDY },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Anomaly scatter */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT_DEEP, borderBottom: `1px solid ${TRACE}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>◧ Anomaly scatter · confidence × novelty</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>upper-right quadrant = unprecedented + high-confidence</span>
        </div>
        <div className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_280px]" style={{ background: TRACE }}>
          <div className="px-4 py-4" style={{ background: CHARCOAL }}>
            <AnomalyScatter anomalies={g.anomalies} />
          </div>
          <aside className="px-5 py-4" style={{ background: CHARCOAL }}>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>· Top signals</div>
            <div className="mt-2 space-y-1.5">
              {g.anomalies.slice(0, 6).map(a => (
                <div key={a.id} className="grid grid-cols-[24px_1fr_44px] items-baseline gap-2 text-[10.5px]">
                  <span className="text-center" style={{ color: TIER_COL[a.riskTier] }}>{SIGNAL_GLYPH[a.signal]}</span>
                  <span className="italic" style={{ color: '#f1efe6' }}>
                    <span style={{ color: MUT }}>{a.region}</span> · {a.signal.replace(/-/g, ' ')}
                  </span>
                  <span className="text-right tabular-nums" style={{ color: TIER_COL[a.riskTier] }}>{a.detectedHrsAgo}h</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[9.5px]">
              {(['observation', 'elevated', 'urgent', 'critical'] as const).map(t => (
                <span key={t} className="flex items-center gap-2 italic" style={{ color: MUT }}>
                  <span className="block h-2 w-3" style={{ background: TIER_COL[t] }} />
                  {t}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Conflict probability wedges */}
      <section className="px-8 py-6" style={{ background: MIDNIGHT, borderBottom: `1px solid ${TRACE}` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>✦ 30-day conflict probability — bilateral wedges</h3>
          <span className="text-[9.5px] italic" style={{ color: MUT }}>sorted by probability descending</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {g.conflictProbabilities.map(c => (
            <div key={c.pair} className="grid grid-cols-[80px_1fr] items-center gap-4 px-4 py-3" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
              <ConflictWedge c={c} />
              <div>
                <div className="text-[11.5px]" style={{ color: '#f1efe6' }}>{c.pair}</div>
                <div className="mt-1 text-[10px] italic" style={{ color: MUT }}>
                  driver <span className="mx-1" style={{ color: GOLD_DIM }}>{DRIVER_GLYPH[c.driver]}</span> {c.driver}
                </div>
                <div className="mt-1 text-[9.5px] uppercase italic tracking-[0.24em]" style={{ color: TRAJ_COL[c.trajectory] }}>· {c.trajectory}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic dependencies + influence */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: TRACE }}>
        <div className="px-8 py-6" style={{ background: MIDNIGHT_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>⌬ Strategic dependency exposure matrix</h3>
          <div className="space-y-2">
            {g.strategicDependencies.map(d => {
              const col = EXPOSURE_COL[d.exposureClass];
              return (
                <div key={d.resource} className="grid grid-cols-[120px_180px_1fr_80px_100px] items-center gap-3 text-[11px]" style={{ background: CHARCOAL, border: `1px solid ${TRACE}`, padding: '8px 12px' }}>
                  <span className="italic" style={{ color: '#f1efe6' }}>{d.resource}</span>
                  <span className="italic text-[10px]" style={{ color: MUT }}>· {d.sourcePartner}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-[3px] flex-1" style={{ background: '#0d1428' }}>
                      <div className="h-full" style={{ width: `${d.dependencyPct}%`, background: col }} />
                    </div>
                    <span className="tabular-nums text-[10.5px]" style={{ color: col }}>{d.dependencyPct}%</span>
                  </div>
                  <span className="text-right tabular-nums text-[10px]" style={{ color: d.diversificationIdx < 50 ? BURGUNDY : SILVER }}>div {d.diversificationIdx}</span>
                  <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: col }}>· {d.exposureClass}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-8 py-6" style={{ background: MIDNIGHT }}>
          <h3 className="mb-3 text-[10px] uppercase italic tracking-[0.4em]" style={{ color: GOLD }}>⚖ Influence net-balance scales</h3>
          <div className="space-y-2">
            {g.influenceSignals.map(s => (
              <div key={s.domain} className="grid grid-cols-[160px_140px_60px] items-center gap-3 px-4 py-2 text-[11px]" style={{ background: CHARCOAL, border: `1px solid ${TRACE}` }}>
                <span className="italic" style={{ color: '#f1efe6' }}>{s.domain.replace(/-/g, ' ')}</span>
                <BalanceScale inbound={s.inboundIdx} outbound={s.outboundIdx} />
                <span className="text-right tabular-nums text-[12px]" style={{ color: s.netIdx >= 55 ? GOLD : s.netIdx <= 45 ? BURGUNDY : SILVER }}>{s.netIdx >= 50 ? '+' : ''}{s.netIdx - 50}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: MIDNIGHT, borderTop: `1px solid ${TRACE}` }}>
        <span className="text-[9px] uppercase italic tracking-[0.4em]" style={{ color: GOLD_DIM }}>
          ✦ Intelligence is not knowing — it is knowing in time ✦
        </span>
      </footer>
    </div>
  );
}
