'use client';

// Labour — Social Protection & Benefits Systems.
// Benefits programmes rendered as horizontal "support corridor"
// lanes — beneficiaries on the left, fund coverage as middle rail,
// payout reliability at the right. Vulnerable coverage and pension
// continuity sit in the masthead. Rounded chips, civic palette.

import * as React from 'react';
import { workforceContinuityBoard, type BenefitsProgramme } from '@/lib/gov/workforce-continuity';

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

const STATUS_COL: Record<BenefitsProgramme['status'], string> = {
  solvent: TEAL, observant: CIVIC, pressured: AMBER, stressed: COPPER,
};

const CATEGORY_GLYPH: Record<BenefitsProgramme['category'], string> = {
  pension: '⏿', unemployment: '◐', welfare: '◇', 'emergency-support': '✦', disability: '◈',
};

function CoverageRail({ months, status }: { months: number; status: BenefitsProgramme['status'] }) {
  // 60 month rail with marker
  const maxMonths = 60;
  const pct = Math.min(100, (months / maxMonths) * 100);
  const col = STATUS_COL[status];
  return (
    <div className="relative h-2.5 rounded-full" style={{ background: SLATE_DEEP }}>
      {/* threshold ticks */}
      {[10, 30, 50].map(p => (
        <div key={p} className="absolute inset-y-[-2px] w-px" style={{ left: `${(p / maxMonths) * 100}%`, background: 'rgba(218,216,208,0.18)' }} />
      ))}
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${col}88 0%, ${col} 100%)` }} />
      <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full" style={{ left: `${pct}%`, marginLeft: '-6px', background: col, border: '2px solid ' + PANEL }} />
    </div>
  );
}

function SupportCorridor({ p }: { p: BenefitsProgramme }) {
  const col = STATUS_COL[p.status];
  return (
    <article className="rounded-lg" style={{ background: PANEL, border: `1px solid ${col}33` }}>
      <div className="grid grid-cols-[40px_1fr_160px_180px_120px] items-center gap-4 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full text-[16px]" style={{ background: `${col}22`, color: col }}>
          {CATEGORY_GLYPH[p.category]}
        </div>
        <div>
          <div className="text-[12px]" style={{ color: PAPER }}>{p.programme}</div>
          <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>· {p.category}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>Beneficiaries</div>
          <div className="tabular-nums text-[14px]" style={{ color: INK }}>{p.beneficiariesK.toLocaleString()}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K</span></div>
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
            <span>Fund coverage</span>
            <span className="tabular-nums" style={{ color: col }}>{p.fundCoverageMonths}mo</span>
          </div>
          <CoverageRail months={p.fundCoverageMonths} status={p.status} />
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>Payout on-time</div>
          <div className="tabular-nums text-[14px]" style={{ color: p.payoutOnTimePct >= 92 ? TEAL : p.payoutOnTimePct >= 84 ? CIVIC : AMBER }}>{p.payoutOnTimePct}%</div>
          <div className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ background: `${col}22`, color: col }}>· {p.status}</div>
        </div>
      </div>
      {p.enrolmentBacklog > 1500 ? (
        <div className="border-t px-4 py-1.5 text-[10px]" style={{ borderColor: 'rgba(218,216,208,0.08)', background: PANEL2, color: AMBER }}>
          ⚠ Enrolment backlog: <span className="tabular-nums">{p.enrolmentBacklog.toLocaleString()}</span> pending
        </div>
      ) : null}
    </article>
  );
}

export function SocialProtectionSystems({ id, now }: { id: string; now: number }) {
  void id;
  const b = workforceContinuityBoard(now);
  const s = b.social;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      {/* Masthead — coverage statement */}
      <header className="px-8 py-6" style={{ background: `linear-gradient(180deg, ${PANEL} 0%, ${SLATE_DARK} 100%)`, borderBottom: `1px solid ${SLATE}40` }}>
        <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>Social Protection &amp; Benefits Systems</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>{s.programmes.length} sovereign support programmes · {s.welfareDistributionThroughputDaily.toLocaleString()} daily disbursements</h2>
          </div>
          <div className="grid grid-cols-3 gap-3" style={{ minWidth: '480px' }}>
            {[
              { l: 'Vulnerable coverage', v: `${s.vulnerablePopulationCoveragePct}%`, c: s.vulnerablePopulationCoveragePct >= 80 ? TEAL : s.vulnerablePopulationCoveragePct >= 65 ? CIVIC : AMBER, sub: 'population reached' },
              { l: 'Pension continuity', v: `${s.pensionContinuityYears}y`, c: s.pensionContinuityYears >= 20 ? TEAL : s.pensionContinuityYears >= 12 ? CIVIC : COPPER, sub: 'projected solvency' },
              { l: 'Emergency cases', v: s.emergencySupportCasesActive.toLocaleString(), c: s.emergencySupportCasesActive > 8000 ? COPPER : s.emergencySupportCasesActive > 3000 ? AMBER : TEAL, sub: 'active right now' },
            ].map(x => (
              <div key={x.l} className="rounded-lg px-4 py-3 text-center" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[20px]" style={{ color: x.c }}>{x.v}</div>
                <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: MUT }}>{x.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Support corridors */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: PAPER }}>≡ Support corridors — programme coverage rails</h3>
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
            <span className="flex items-center gap-1.5"><span className="block h-2 w-3 rounded-full" style={{ background: TEAL }} />solvent</span>
            <span className="flex items-center gap-1.5"><span className="block h-2 w-3 rounded-full" style={{ background: CIVIC }} />observant</span>
            <span className="flex items-center gap-1.5"><span className="block h-2 w-3 rounded-full" style={{ background: AMBER }} />pressured</span>
            <span className="flex items-center gap-1.5"><span className="block h-2 w-3 rounded-full" style={{ background: COPPER }} />stressed</span>
          </div>
        </div>
        <div className="space-y-2">
          {s.programmes.map(p => <SupportCorridor key={p.id} p={p} />)}
        </div>
      </section>

      <footer className="px-8 py-3 text-center" style={{ background: PANEL2, borderTop: `1px solid ${SLATE}30` }}>
        <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: MUT }}>
          ◇ Social protection is continuity made tangible — every disbursement is a sovereign commitment ◇
        </span>
      </footer>
    </div>
  );
}
