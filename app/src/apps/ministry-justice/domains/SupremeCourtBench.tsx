'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, BenchPanel, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⚖ II — Supreme Court Bench. Surfaces the constitutional + supreme
// court tier with their live caseload and disposition class.

export function SupremeCourtBench({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const apex = b.courts.filter(c => c.tier === 'Constitutional' || c.tier === 'Supreme');
  return (
    <DocketFrame archetype="bench" numeral="⚖ II" title="Supreme Court Bench" subtitle="constitutional + apex tiers">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {apex.map(c => (
          <BenchPanel key={c.id} tier={c.tier} court={c.court} region={c.region}
            accent={c.backlogClass === 'overdue' ? JUSTICE_DS.alert : c.backlogClass === 'congested' ? JUSTICE_DS.bronze : JUSTICE_DS.navy}>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div>
                <div className="uppercase tracking-[0.18em]" style={{ color: JUSTICE_DS.mut, fontSize: '8.5px' }}>Pending</div>
                <div className="tabular-nums" style={{ color: JUSTICE_DS.ivory }}>{c.pendingCases.toLocaleString()}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.18em]" style={{ color: JUSTICE_DS.mut, fontSize: '8.5px' }}>Median days</div>
                <div className="tabular-nums" style={{ color: c.medianDispositionDays >= 360 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze }}>{c.medianDispositionDays}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.18em]" style={{ color: JUSTICE_DS.mut, fontSize: '8.5px' }}>Utilisation</div>
                <div className="tabular-nums" style={{ color: JUSTICE_DS.ivory }}>{c.benchUtilisationPct}%</div>
              </div>
            </div>
            <div className="mt-2 text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: c.backlogClass === 'cleared' ? JUSTICE_DS.navy : c.backlogClass === 'monitored' ? JUSTICE_DS.bronze : c.backlogClass === 'congested' ? JUSTICE_DS.burgundy : JUSTICE_DS.alert }}>· {c.backlogClass}</div>
          </BenchPanel>
        ))}
      </div>
      <ChamberRule label="strategic disposition" />
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="italic" style={{ color: JUSTICE_DS.mut }}>
          The apex bench addresses constitutional-strain matters first. Median disposition above 360 days indicates an overdue docket and is escalated automatically to the chamber.
        </div>
        <div className="text-right" style={{ color: JUSTICE_DS.bronze }}>
          composite integrity · <span className="tabular-nums" style={{ color: JUSTICE_DS.ivory }}>{b.review.integrityIdx}</span>
        </div>
      </div>
    </DocketFrame>
  );
}
