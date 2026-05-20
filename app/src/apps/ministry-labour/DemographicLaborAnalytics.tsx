'use client';

// Labour — Demographic & Human Capital Analytics.
// Mirrored age-cohort pyramid (participation left / unemployment
// right) — distinct from prior ministries' geometry — plus a
// vertical stack of skills pipelines and demographic indices.

import * as React from 'react';
import { workforceContinuityBoard, type AgeCohort, type SkillsPipeline } from '@/lib/gov/workforce-continuity';

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

const PRIORITY_COL: Record<SkillsPipeline['priority'], string> = {
  critical: COPPER, standard: CIVIC, declining: SLATE,
};

function PyramidRow({ c, scaleParticipation, scaleUnemployment }: { c: AgeCohort; scaleParticipation: number; scaleUnemployment: number }) {
  const partW = (c.participationPct / scaleParticipation) * 100;
  const unemW = (c.unemploymentPct / scaleUnemployment) * 100;
  return (
    <div className="grid grid-cols-[1fr_70px_1fr] items-center gap-3 py-1.5" style={{ minHeight: '36px' }}>
      {/* Left: participation, anchored to the right */}
      <div className="flex items-center justify-end">
        <span className="mr-3 text-[10px] tabular-nums" style={{ color: TEAL }}>{c.participationPct}%</span>
        <div className="relative h-5" style={{ width: '85%' }}>
          <div className="absolute right-0 h-full rounded-l-sm" style={{
            width: `${partW}%`,
            background: `linear-gradient(90deg, ${CIVIC}66 0%, ${TEAL} 100%)`,
          }} />
        </div>
      </div>
      {/* Center: cohort label + population */}
      <div className="text-center">
        <div className="text-[12px] tracking-[0.04em]" style={{ color: PAPER }}>{c.band}</div>
        <div className="text-[9px] uppercase tracking-[0.18em] tabular-nums" style={{ color: MUT }}>{c.populationM}M</div>
      </div>
      {/* Right: unemployment, anchored to the left */}
      <div className="flex items-center">
        <div className="relative h-5" style={{ width: '85%' }}>
          <div className="absolute left-0 h-full rounded-r-sm" style={{
            width: `${unemW}%`,
            background: `linear-gradient(90deg, ${COPPER} 0%, ${COPPER}66 100%)`,
          }} />
        </div>
        <span className="ml-3 text-[10px] tabular-nums" style={{ color: COPPER }}>{c.unemploymentPct}%</span>
      </div>
    </div>
  );
}

export function DemographicLaborAnalytics({ id, now }: { id: string; now: number }) {
  void id;
  const b = workforceContinuityBoard(now);
  const d = b.demographics;
  const e = b.employment;
  const scaleParticipation = Math.max(...d.cohorts.map(c => c.participationPct)) * 1.05;
  const scaleUnemployment = Math.max(...d.cohorts.map(c => c.unemploymentPct)) * 1.05;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      {/* Header */}
      <header className="px-8 py-5" style={{ background: `linear-gradient(180deg, ${PANEL} 0%, ${SLATE_DARK} 100%)`, borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>Demographic &amp; Human Capital Analytics</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>National workforce cohort pyramid &amp; skills pipelines</h2>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center" style={{ minWidth: '520px' }}>
            {[
              { l: 'Aging idx', v: d.agingIndex, c: d.agingIndex >= 22 ? COPPER : d.agingIndex >= 15 ? AMBER : TEAL },
              { l: 'Dependency', v: d.dependencyRatio, c: d.dependencyRatio >= 70 ? COPPER : CIVIC },
              { l: 'Skills gap', v: d.skillsMismatchIdx, c: d.skillsMismatchIdx >= 50 ? COPPER : AMBER },
              { l: 'Sustainability', v: d.longHorizonSustainabilityIdx, c: d.longHorizonSustainabilityIdx >= 70 ? TEAL : SLATE },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2.5" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Pyramid */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: `${SLATE}30` }}>
        <div className="px-8 py-6" style={{ background: PANEL }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>◑ Cohort pyramid · participation ⇋ unemployment</h3>
            <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>{d.cohorts.length} bands</span>
          </div>
          <div className="grid grid-cols-[1fr_70px_1fr] items-baseline gap-3 pb-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>
            <span className="text-right" style={{ color: TEAL }}>participation %</span>
            <span className="text-center">band · pop</span>
            <span style={{ color: COPPER }}>unemployment %</span>
          </div>
          <div className="border-t" style={{ borderColor: 'rgba(218,216,208,0.08)' }}>
            {d.cohorts.map(c => <PyramidRow key={c.band} c={c} scaleParticipation={scaleParticipation} scaleUnemployment={scaleUnemployment} />)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[10px]">
            <div className="rounded-md px-3 py-2" style={{ background: PANEL2 }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Youth unemployment</div>
              <div className="tabular-nums text-[14px]" style={{ color: d.youthUnemploymentPct >= 22 ? ALERT : COPPER }}>{d.youthUnemploymentPct}%</div>
            </div>
            <div className="rounded-md px-3 py-2" style={{ background: PANEL2 }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Migration net</div>
              <div className="tabular-nums text-[14px]" style={{ color: d.migrationNetK >= 0 ? TEAL : COPPER }}>
                {d.migrationNetK >= 0 ? '+' : ''}{d.migrationNetK}K
              </div>
            </div>
            <div className="rounded-md px-3 py-2" style={{ background: PANEL2 }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Skills match (avg)</div>
              <div className="tabular-nums text-[14px]" style={{ color: TEAL }}>{Math.round(d.cohorts.reduce((s, c) => s + c.skillsMatchIdx, 0) / d.cohorts.length)}</div>
            </div>
          </div>
        </div>

        {/* Employment side rail */}
        <aside className="px-6 py-6" style={{ background: SLATE_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>↻ Employment &amp; reskilling synchronisation</h3>
          <div className="grid grid-cols-2 gap-3 text-center text-[10px]">
            <div className="rounded-md px-3 py-3" style={{ background: PANEL }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Vacancies</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: CIVIC }}>{e.vacanciesActiveK}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K</span></div>
            </div>
            <div className="rounded-md px-3 py-3" style={{ background: PANEL }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Jobseekers</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: COPPER }}>{e.jobseekersK}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K</span></div>
            </div>
            <div className="rounded-md px-3 py-3" style={{ background: PANEL }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Placements/mo</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: TEAL }}>{e.placementsThisMonthK}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K</span></div>
            </div>
            <div className="rounded-md px-3 py-3" style={{ background: PANEL }}>
              <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Vocational</div>
              <div className="mt-1 tabular-nums text-[18px]" style={{ color: AMBER }}>{e.vocationalTraineesK}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K</span></div>
            </div>
          </div>
          <div className="mt-4 text-[9px] uppercase tracking-[0.32em]" style={{ color: PAPER }}>↗ Skills pipelines · {e.reskillingProgrammesActive} programmes active</div>
          <div className="mt-2 space-y-1.5">
            {e.pipelines.map(p => (
              <div key={p.pipeline} className="rounded-md px-3 py-2" style={{ background: PANEL, border: `1px solid ${PRIORITY_COL[p.priority]}33` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px]" style={{ color: PAPER }}>{p.pipeline}</span>
                  <span className="rounded-full px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em]" style={{ background: `${PRIORITY_COL[p.priority]}22`, color: PRIORITY_COL[p.priority] }}>· {p.priority}</span>
                </div>
                <div className="mt-1 grid grid-cols-[60px_1fr_50px_60px] items-center gap-2 text-[10px]">
                  <span className="tabular-nums" style={{ color: INK }}>{p.enrolledK}K</span>
                  <div className="flex items-center gap-1">
                    <div className="h-[3px] flex-1" style={{ background: SLATE_DEEP }}>
                      <div className="h-full" style={{ width: `${p.completionRatePct}%`, background: CIVIC }} />
                    </div>
                    <div className="h-[3px] flex-1" style={{ background: SLATE_DEEP }}>
                      <div className="h-full" style={{ width: `${p.placementRatePct}%`, background: TEAL }} />
                    </div>
                  </div>
                  <span className="text-right tabular-nums" style={{ color: CIVIC }}>{p.completionRatePct}</span>
                  <span className="text-right tabular-nums" style={{ color: TEAL }}>{p.placementRatePct}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
