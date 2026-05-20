'use client';

// Justice — Judicial Operations Roster. Court tier register, statute
// review docket, prosecutorial coordination ledger. Constitutional
// chamber aesthetic: charcoal ground, ivory entries, bronze rules,
// burgundy accents for stress, navy for settled.

import * as React from 'react';
import { justiceContinuityBoard, type CourtRoster, type StatuteReview, type ProsecutorialDocket } from '@/lib/gov/justice-continuity';

const CHARCOAL = '#1a1d24';
const PANEL = '#1e2129';
const IVORY = '#f4f0e6';
const BURGUNDY = '#7a2d3a';
const BRONZE = '#8c6a3a';
const NAVY = '#2a3955';
const TEAL_INK = '#5d7a6d';
const INK = '#d8d4c8';
const MUT = '#7a766e';
const RULE = 'rgba(140,106,58,0.28)';

const BACKLOG_COL: Record<CourtRoster['backlogClass'], string> = {
  cleared: NAVY, monitored: TEAL_INK, congested: BRONZE, overdue: BURGUNDY,
};
const VERDICT_COL: Record<StatuteReview['legalityVerdict'], string> = {
  compliant: NAVY, 'review-required': BRONZE, inconsistent: BURGUNDY,
};
const RIGHTS_COL: Record<ProsecutorialDocket['detaineeRights'], string> = {
  safeguarded: NAVY, 'review-engaged': BRONZE, 'breach-alert': BURGUNDY,
};

export function JudicialOperationsRoster({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  return (
    <div className="space-y-px" style={{ background: RULE, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Court tier roster */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>⚖ Bench Roster</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>National judicial operations — {b.courts.length} benches</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>tier · backlog</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]" style={{ tableLayout: 'fixed' }}>
            <colgroup><col style={{ width: '48px' }} /><col /><col style={{ width: '110px' }} /><col style={{ width: '110px' }} /><col style={{ width: '110px' }} /><col style={{ width: '110px' }} /><col style={{ width: '130px' }} /></colgroup>
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
                <th className="py-2 pr-2">№</th><th className="py-2 pr-2">Bench</th>
                <th className="py-2 pr-2">Tier</th><th className="py-2 pr-2 text-right">Pending</th>
                <th className="py-2 pr-2 text-right">Median (d)</th><th className="py-2 pr-2 text-right">Utilisation</th>
                <th className="py-2 pr-2 text-right">Backlog status</th>
              </tr>
            </thead>
            <tbody>
              {b.courts.map((c, i) => (
                <tr key={c.id} className="border-t" style={{ borderColor: RULE }}>
                  <td className="py-2 pr-2 tabular-nums" style={{ color: BRONZE }}>{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-2 pr-2" style={{ color: IVORY }}>{c.court}<span className="ml-2 text-[10px]" style={{ color: MUT }}>· {c.region}</span></td>
                  <td className="py-2 pr-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: NAVY === BACKLOG_COL[c.backlogClass] ? NAVY : BRONZE }}>{c.tier}</td>
                  <td className="py-2 pr-2 text-right tabular-nums" style={{ color: INK }}>{c.pendingCases.toLocaleString()}</td>
                  <td className="py-2 pr-2 text-right tabular-nums" style={{ color: c.medianDispositionDays >= 360 ? BURGUNDY : c.medianDispositionDays >= 180 ? BRONZE : NAVY }}>{c.medianDispositionDays}</td>
                  <td className="py-2 pr-2 text-right tabular-nums" style={{ color: INK }}>{c.benchUtilisationPct}%</td>
                  <td className="py-2 pr-2 text-right text-[10px] uppercase tracking-[0.18em]" style={{ color: BACKLOG_COL[c.backlogClass] }}>· {c.backlogClass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Statute register */}
      <section className="px-6 py-5" style={{ background: PANEL }}>
        <header className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>¶ Statute Review</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Legality of standing instruments</h3>
          </div>
          <span className="text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>domain · stability · verdict</span>
        </header>
        <ol className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: RULE }}>
          {b.statutes.map((s: StatuteReview) => (
            <li key={s.id} className="px-4 py-3" style={{ background: PANEL }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: IVORY }}>{s.statute}</span>
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: BRONZE }}>{s.domain}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] tabular-nums" style={{ color: MUT }}>last review · {s.daysSinceReview}d</span>
                <div className="flex items-center gap-2">
                  <div className="h-[3px] w-24" style={{ background: 'rgba(140,106,58,0.18)' }}>
                    <div className="h-full" style={{ width: `${s.interpretationStability}%`, background: VERDICT_COL[s.legalityVerdict] }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: VERDICT_COL[s.legalityVerdict] }}>{s.interpretationStability}</span>
                </div>
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.24em]" style={{ color: VERDICT_COL[s.legalityVerdict] }}>· {s.legalityVerdict}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* Prosecutorial dockets */}
      <section className="px-6 py-5" style={{ background: CHARCOAL }}>
        <header className="mb-3 flex items-baseline justify-between border-b pb-2" style={{ borderColor: RULE }}>
          <div>
            <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: BRONZE }}>§ Prosecutorial Coordination</div>
            <h3 className="mt-1 text-[14px] tracking-[0.04em]" style={{ color: IVORY }}>Active dockets · {b.dockets.length} matters</h3>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: RULE }}>
          {b.dockets.slice(0, 9).map(d => (
            <article key={d.id} className="border-l-2 px-4 py-3" style={{ background: CHARCOAL, borderColor: RIGHTS_COL[d.detaineeRights] }}>
              <div className="flex items-baseline justify-between">
                <span className="tabular-nums text-[10px]" style={{ color: BRONZE }}>{d.id}</span>
                <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>· {d.stage}</span>
              </div>
              <div className="mt-1 text-[12px]" style={{ color: IVORY }}>{d.matter}</div>
              <div className="mt-1 text-[10px]" style={{ color: MUT }}>{d.agency}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>evidentiary</span>
                <span className="tabular-nums text-[10px]" style={{ color: d.evidentiaryIntegrity >= 80 ? NAVY : d.evidentiaryIntegrity >= 65 ? BRONZE : BURGUNDY }}>{d.evidentiaryIntegrity}</span>
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: RIGHTS_COL[d.detaineeRights] }}>· detainee rights {d.detaineeRights}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
