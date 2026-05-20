'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, StatPair, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⚖ IV — Judicial statistics. Throughput, backlog distribution and
// disposition performance across the national bench.

export function JudicialStatistics({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const totalPending = b.courts.reduce((s, c) => s + c.pendingCases, 0);
  const meanDispositionDays = Math.round(b.courts.reduce((s, c) => s + c.medianDispositionDays, 0) / b.courts.length);
  const meanUtil = Math.round(b.courts.reduce((s, c) => s + c.benchUtilisationPct, 0) / b.courts.length);
  const overdue = b.courts.filter(c => c.backlogClass === 'overdue').length;
  const cleared = b.courts.filter(c => c.backlogClass === 'cleared').length;
  return (
    <DocketFrame archetype="bench" numeral="⚖ IV" title="Judicial statistics" subtitle="throughput · backlog · disposition">
      <StatPair items={[
        { label: 'Total pending', value: totalPending.toLocaleString(), tone: JUSTICE_DS.ivory },
        { label: 'Mean median (d)', value: meanDispositionDays, tone: meanDispositionDays >= 360 ? JUSTICE_DS.burgundy : meanDispositionDays >= 180 ? JUSTICE_DS.bronze : JUSTICE_DS.navy },
        { label: 'Mean utilisation', value: `${meanUtil}%`, tone: JUSTICE_DS.bronze },
        { label: 'Overdue / cleared', value: `${overdue}/${cleared}`, tone: overdue > 0 ? JUSTICE_DS.burgundy : JUSTICE_DS.navy },
      ]} />
      <ChamberRule label="backlog distribution" />
      <div className="grid grid-cols-4 gap-3">
        {(['cleared', 'monitored', 'congested', 'overdue'] as const).map(cls => {
          const courts = b.courts.filter(c => c.backlogClass === cls);
          const col = cls === 'cleared' ? JUSTICE_DS.navy : cls === 'monitored' ? JUSTICE_DS.bronze : cls === 'congested' ? '#a05538' : JUSTICE_DS.burgundy;
          return (
            <div key={cls} className="border px-4 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft, borderTop: `2px solid ${col}` }}>
              <div className="text-[10px] uppercase italic tracking-[0.22em]" style={{ color: col }}>· {cls}</div>
              <div className="mt-1 tabular-nums text-[20px]" style={{ color: JUSTICE_DS.ivory }}>{courts.length}</div>
              <div className="text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>{courts.reduce((s, c) => s + c.pendingCases, 0).toLocaleString()} cases</div>
            </div>
          );
        })}
      </div>
    </DocketFrame>
  );
}
