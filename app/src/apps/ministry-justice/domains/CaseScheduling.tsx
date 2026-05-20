'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ¶ VI — Case scheduling chamber.
// Renders procedural-deadline pressure: which courts have the most
// dispositions overdue, and what proportion of the docket sits at
// each stage of progression.

const STAGES = ['intake', 'investigation', 'charging', 'pre-trial', 'trial', 'disposition', 'appeal'] as const;
const STAGE_COL: Record<typeof STAGES[number], string> = {
  intake: JUSTICE_DS.mut, investigation: JUSTICE_DS.bronze, charging: JUSTICE_DS.bronze, 'pre-trial': '#a05538',
  trial: JUSTICE_DS.burgundy, disposition: JUSTICE_DS.navy, appeal: JUSTICE_DS.teal,
};

export function CaseScheduling({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const byStage = STAGES.map(stage => ({
    stage,
    count: b.dockets.filter(d => d.stage === stage).length,
  }));
  const max = Math.max(...byStage.map(s => s.count), 1);
  return (
    <DocketFrame archetype="docket" numeral="¶ VI" title="Case scheduling chamber" subtitle="procedural deadlines · stage progression">
      <div className="space-y-2">
        {byStage.map(s => (
          <div key={s.stage} className="grid grid-cols-[140px_1fr_60px] items-center gap-3">
            <span className="text-[11px] uppercase italic tracking-[0.22em]" style={{ color: STAGE_COL[s.stage] }}>{s.stage}</span>
            <div className="h-2.5" style={{ background: JUSTICE_DS.charcoalDeep }}>
              <div className="h-full" style={{ width: `${(s.count / max) * 100}%`, background: STAGE_COL[s.stage] }} />
            </div>
            <span className="text-right tabular-nums text-[12px]" style={{ color: JUSTICE_DS.ivory }}>{s.count}</span>
          </div>
        ))}
      </div>
      <ChamberRule label="overdue benches" />
      <ul className="space-y-1.5">
        {b.courts.filter(c => c.medianDispositionDays >= 180).slice(0, 6).map(c => (
          <li key={c.id} className="grid grid-cols-[1fr_100px_110px] items-baseline gap-3 text-[11px]">
            <span style={{ color: JUSTICE_DS.ivory }}>{c.court}<span className="ml-2 text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>· {c.region}</span></span>
            <span className="text-right tabular-nums" style={{ color: c.medianDispositionDays >= 360 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze }}>{c.medianDispositionDays}d median</span>
            <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: c.backlogClass === 'overdue' ? JUSTICE_DS.alert : JUSTICE_DS.bronze }}>· {c.backlogClass}</span>
          </li>
        ))}
      </ul>
    </DocketFrame>
  );
}
