'use client';

// Labour — National Workforce Command.
// Workforce-flow ribbon (employed → unemployed → reskilling →
// re-employed) over a regional workforce register. Rounded humanist
// sans-serif typography on warm slate. Civic blue / institutional teal
// / muted copper / workforce amber / restrained slate gray.
// Distinguishing geometry: thick horizontal flow ribbons with
// directional arrowheads, regional badges as rounded chips (not hex,
// not seal, not riveted plate).

import * as React from 'react';
import { workforceContinuityBoard, type WorkforcePosture, type RegionalWorkforce } from '@/lib/gov/workforce-continuity';

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

const POSTURE_COL: Record<WorkforcePosture, string> = {
  thriving: TEAL, stable: CIVIC, tightening: AMBER, strained: COPPER, 'crisis-mobilisation': ALERT,
};

const CLASS_COL: Record<RegionalWorkforce['classification'], string> = {
  thriving: TEAL, stable: CIVIC, tightening: AMBER, strained: COPPER, distressed: ALERT,
};

// Workforce flow ribbon — Sankey-lite single-line ribbon with arrowheads
function FlowRibbon({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.pct, 0) || 100;
  return (
    <div className="relative" style={{ minHeight: '90px' }}>
      <div className="flex h-12 items-stretch overflow-hidden rounded-md" style={{ background: SLATE_DEEP }}>
        {data.map((d, i) => (
          <div key={d.label} className="relative flex items-center justify-center"
            style={{ flexBasis: `${(d.pct / total) * 100}%`, background: d.color, color: '#fff' }}>
            <span className="text-[10px] uppercase tracking-[0.16em]" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}>{d.label}</span>
            {i < data.length - 1 ? (
              <span className="absolute -right-2 top-1/2 z-10 -translate-y-1/2" style={{
                width: 0, height: 0,
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: `10px solid ${d.color}`,
              }} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
        {data.map(d => (
          <span key={d.label} style={{ color: d.color, flexBasis: `${(d.pct / total) * 100}%`, textAlign: 'center' }}>
            {d.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function RegionalChip({ r }: { r: RegionalWorkforce }) {
  const col = CLASS_COL[r.classification];
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: PANEL, border: `1px solid ${col}55` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]" style={{ color: PAPER }}>{r.region}</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ background: `${col}26`, color: col }}>{r.classification}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3 text-[10px]">
        <div>
          <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Labor force</div>
          <div className="tabular-nums" style={{ color: INK }}>{r.laborForceK.toLocaleString()}K</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Unemp.</div>
          <div className="tabular-nums" style={{ color: r.unemploymentPct >= 14 ? ALERT : r.unemploymentPct >= 8 ? AMBER : TEAL }}>{r.unemploymentPct}%</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Particip.</div>
          <div className="tabular-nums" style={{ color: r.participationRatePct >= 70 ? TEAL : CIVIC }}>{r.participationRatePct}%</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Product.</div>
          <div className="tabular-nums" style={{ color: r.productivityIdx >= 75 ? TEAL : SLATE }}>{r.productivityIdx}</div>
        </div>
      </div>
      <div className="mt-3 h-[3px] rounded-full" style={{ background: SLATE_DEEP }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.hardshipIdx)}%`, background: col }} />
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>hardship</span>
        <span className="tabular-nums text-[10px]" style={{ color: col }}>{r.hardshipIdx}</span>
      </div>
    </div>
  );
}

export function NationalWorkforceCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = workforceContinuityBoard(now);
  const c = b.command;
  const employed = Math.max(1, 100 - c.unemploymentPct);
  // Flow ribbon: employed → looking → reskilling → re-engaged
  const reskilling = Math.min(8, c.workforceShortagesIdx / 12);
  const flow = [
    { label: 'Employed', pct: Math.max(20, employed - reskilling), color: TEAL },
    { label: 'Looking', pct: c.unemploymentPct, color: COPPER },
    { label: 'Reskilling', pct: reskilling, color: AMBER },
    { label: 'Re-engaged', pct: Math.max(1, reskilling * 0.6), color: CIVIC },
  ];

  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      {/* Soft civic header */}
      <header className="px-8 py-5" style={{ background: `linear-gradient(135deg, ${SLATE_DARK} 0%, ${PANEL} 60%, ${SLATE_DARK} 100%)`, borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>National Workforce Command</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>{b.bannerLine}</h2>
            <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: POSTURE_COL[c.posture] }} />
              <span style={{ color: POSTURE_COL[c.posture] }}>{c.posture.replace(/-/g, ' ')}</span>
              <span>·</span>
              <span>cycle {String(b.epoch).padStart(6, '0')}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '360px' }}>
            {[
              { l: 'Employment continuity', v: c.employmentContinuityIdx, c: c.employmentContinuityIdx >= 80 ? TEAL : c.employmentContinuityIdx >= 65 ? CIVIC : COPPER },
              { l: 'Participation', v: `${c.participationRatePct}%`, c: c.participationRatePct >= 70 ? TEAL : CIVIC },
              { l: 'Productivity', v: c.productivityIdx, c: c.productivityIdx >= 75 ? TEAL : SLATE },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2.5" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c as string }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Workforce flow ribbon */}
      <section className="px-8 py-6" style={{ background: PANEL, borderBottom: `1px solid ${SLATE}30` }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>↦ National workforce flow ribbon</h3>
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>
            <span>unemployment</span>
            <span className="tabular-nums" style={{ color: c.unemploymentPct >= 12 ? ALERT : c.unemploymentPct >= 8 ? AMBER : TEAL, fontSize: '14px' }}>{c.unemploymentPct}%</span>
            <span className="ml-3">shortages</span>
            <span className="tabular-nums" style={{ color: c.workforceShortagesIdx >= 50 ? COPPER : SLATE, fontSize: '14px' }}>{c.workforceShortagesIdx}</span>
          </div>
        </div>
        <FlowRibbon data={flow} />
      </section>

      {/* Regional workforce register */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>◇ Regional workforce register</h3>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>{c.regions.length} regional labour markets</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {c.regions.map(r => <RegionalChip key={r.region} r={r} />)}
        </div>
        {/* legend strip */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md px-4 py-3" style={{ background: PANEL }}>
          <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>regional posture legend</span>
          {(['thriving', 'stable', 'tightening', 'strained', 'distressed'] as RegionalWorkforce['classification'][]).map(cl => (
            <span key={cl} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
              <span className="block h-2 w-4 rounded-full" style={{ background: CLASS_COL[cl] }} />
              {cl}
            </span>
          ))}
        </div>
      </section>

      <footer className="px-8 py-3 text-[9px] uppercase tracking-[0.32em]" style={{ background: PANEL2, color: MUT, borderTop: `1px solid ${SLATE}30` }}>
        ▸ Sovereign workforce continuity — the human-economic spine of the civilization-state
      </footer>
    </div>
  );
}
