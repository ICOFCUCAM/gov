'use client';

// Education — Continuity foresight chamber. Crisis incidents rendered as
// manuscript margin-notes; 25-year forecast as a long-horizon spine.

import * as React from 'react';
import { knowledgeDevelopmentBoard, type EduIncident } from '@/lib/gov/knowledge-development';

const NAVY = '#1a2942';
const BRONZE = '#8a6a2e';
const LIBRARY_GOLD = '#a7842a';
const INK_SOFT = '#5b6175';

const SEV_COL: Record<EduIncident['severity'], string> = {
  advisory: '#a7842a', elevated: '#915036', critical: '#7a2a1d', national: '#5a1010',
};

export function ContinuityForesightChamber({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeDevelopmentBoard(now);
  const f = b.forecast;
  return (
    <div className="space-y-6">
      {/* Foresight strip */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>VII</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Long-horizon foresight — 25-year continuity</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>generational continuity risk · {f.generationalContinuityRisk}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { label: 'Literacy trajectory', series: f.literacyTrajectory, color: NAVY },
            { label: 'Workforce readiness', series: f.workforceReadinessTrajectory, color: BRONZE },
            { label: 'Research capability', series: f.researchCapabilityTrajectory, color: LIBRARY_GOLD },
          ].map(card => {
            const end = card.series[card.series.length - 1]!;
            const start = card.series[0]!;
            const delta = end - start;
            return (
              <div key={card.label} className="border p-4" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 28%,transparent)', background: 'rgba(244,236,214,0.02)' }}>
                <div className="font-serif text-[10px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>{card.label}</div>
                <div className="mt-3 flex items-end gap-1.5">
                  {card.series.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full" style={{ height: `${Math.max(4, v * 0.6)}px`, background: card.color, opacity: 0.55 + i * 0.09 }} />
                      <span className="font-serif text-[8.5px] tabular-nums" style={{ color: INK_SOFT }}>+{f.horizonYears[i]}y</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-baseline justify-between font-serif text-[12px]">
                  <span style={{ color: INK_SOFT }}>start <span className="tabular-nums" style={{ color: NAVY }}>{start}</span></span>
                  <span style={{ color: delta >= 0 ? NAVY : '#915036' }}>{delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}</span>
                  <span style={{ color: INK_SOFT }}>horizon <span className="tabular-nums" style={{ color: card.color }}>{end}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="font-serif text-[11px]" style={{ color: INK_SOFT }}>
            <div className="text-[9px] uppercase tracking-[0.18em]">Demographic capability shift</div>
            <div className="mt-0.5 text-[16px] tabular-nums" style={{ color: f.demographicCapabilityShift >= 0 ? NAVY : '#915036' }}>
              {f.demographicCapabilityShift >= 0 ? '+' : ''}{f.demographicCapabilityShift}%
            </div>
          </div>
          <div className="font-serif text-[11px]" style={{ color: INK_SOFT }}>
            <div className="text-[9px] uppercase tracking-[0.18em]">Generational continuity risk</div>
            <div className="mt-0.5 text-[16px] tabular-nums" style={{ color: f.generationalContinuityRisk >= 60 ? '#7a2a1d' : LIBRARY_GOLD }}>{f.generationalContinuityRisk}</div>
          </div>
          <div className="font-serif text-[11px]" style={{ color: INK_SOFT }}>
            <div className="text-[9px] uppercase tracking-[0.18em]">Civilizational knowledge resilience</div>
            <div className="mt-0.5 text-[16px] tabular-nums" style={{ color: f.civilizationalKnowledgeResilience >= 75 ? NAVY : LIBRARY_GOLD }}>{f.civilizationalKnowledgeResilience}</div>
          </div>
        </div>
      </section>

      {/* Ministries engaged */}
      {b.ministriesEngaged.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-2 border-y py-3" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 28%,transparent)' }}>
          <span className="font-serif italic text-[10px] uppercase tracking-[0.18em]" style={{ color: BRONZE }}>Ministries engaged</span>
          {b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="font-serif text-[11px]" style={{ color: NAVY }}>
              <span className="italic" style={{ color: BRONZE }}>§</span> {m.ministry} <span className="tabular-nums" style={{ color: INK_SOFT }}>·{m.engaged}</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Crisis chronology */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'color-mix(in srgb,#8a6a2e 30%,transparent)' }}>
          <span className="font-serif italic" style={{ color: BRONZE }}>VIII</span>
          <h3 className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>Educational continuity chronology &amp; cascade</h3>
          <span className="ml-auto font-serif text-[10px] italic" style={{ color: INK_SOFT }}>cross-ministry response</span>
        </div>
        <div className="space-y-4">
          {b.incidents.slice(0, 5).map(i => (
            <article key={i.id} className="relative border-l-2 pl-5" style={{ borderColor: SEV_COL[i.severity] }}>
              <div className="flex items-baseline gap-3">
                <span className="font-serif italic text-[10px] tabular-nums" style={{ color: BRONZE }}>{i.id}</span>
                <span className="font-serif text-[14px] tracking-tight" style={{ color: NAVY }}>{i.kind.replace(/-/g, ' ')}</span>
                <span className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>· {i.region}</span>
                <span className="ml-auto font-serif text-[10px] uppercase italic tracking-[0.18em]" style={{ color: SEV_COL[i.severity] }}>· {i.severity}</span>
              </div>
              <div className="mt-1 font-serif text-[11px]" style={{ color: INK_SOFT }}>
                {i.affectedLearners.toLocaleString()} learners affected · {i.ageDays} days · recovery pathway:
                <span className="ml-1 italic" style={{ color: NAVY }}>{i.recoveryPathway.replace(/-/g, ' ')}</span>
              </div>
              <div className="mt-2 border-l pl-3" style={{ borderColor: 'rgba(138,106,46,0.25)' }}>
                {i.ministryCascade.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-[160px_1fr_60px_100px] items-baseline gap-3 py-1 font-serif text-[11px]">
                    <span style={{ color: NAVY }}>{c.ministry}</span>
                    <span style={{ color: INK_SOFT }}>{c.effect}</span>
                    <span className="tabular-nums text-right" style={{ color: BRONZE }}>+{c.delayHrs}h</span>
                    <span className="italic text-right" style={{ color: c.status === 'cleared' ? NAVY : c.status === 'engaged' ? LIBRARY_GOLD : INK_SOFT }}>· {c.status}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <p className="font-serif text-[10px] italic" style={{ color: INK_SOFT }}>
        School disruption cascades to Treasury, Interior, Labour and the cabinet — generational continuity is
        preserved through coordinated response, not abandoned to local crisis.
      </p>
    </div>
  );
}
