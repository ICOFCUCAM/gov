'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, StatPair, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// § IV — Sovereignty Defence.
// Constitutional-integrity tracker that combines the Articles register's
// composite with the long-horizon forecast to surface degradation
// vectors before they become breach-watch.

export function SovereigntyDefence({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const f = b.forecast;
  const start = f.constitutionalIntegrityTrajectory[0]!;
  const end = f.constitutionalIntegrityTrajectory[f.constitutionalIntegrityTrajectory.length - 1]!;
  const delta = end - start;
  return (
    <DocketFrame archetype="chamber" numeral="§ IV" title="Sovereignty defence" subtitle="constitutional integrity over the 20-year horizon">
      <StatPair items={[
        { label: 'Civilizational standing', value: f.legitimacyTrajectory, tone: f.legitimacyTrajectory >= 75 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
        { label: 'Crisis risk', value: f.constitutionalCrisisRisk, tone: f.constitutionalCrisisRisk >= 60 ? JUSTICE_DS.alert : f.constitutionalCrisisRisk >= 30 ? JUSTICE_DS.bronze : JUSTICE_DS.navy },
        { label: 'Integrity now', value: start, tone: JUSTICE_DS.ivory },
        { label: 'Integrity +20y', value: end, tone: delta >= 0 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy },
      ]} />
      <ChamberRule label="20-year trajectory" />
      <div className="grid grid-cols-4 gap-3">
        {f.horizonYears.map((h, i) => (
          <div key={h} className="border px-3 py-3" style={{ background: JUSTICE_DS.charcoalDeep, borderColor: JUSTICE_DS.ruleSoft }}>
            <div className="text-[9px] uppercase italic tracking-[0.22em]" style={{ color: JUSTICE_DS.mut }}>+{h}y</div>
            <div className="mt-1 tabular-nums text-[18px]" style={{ color: JUSTICE_DS.navy }}>{f.constitutionalIntegrityTrajectory[i]}</div>
            <div className="text-[9px] italic" style={{ color: JUSTICE_DS.mut }}>indep · {f.judicialIndependenceTrajectory[i]}</div>
            <div className="text-[9px] italic" style={{ color: JUSTICE_DS.mut }}>rights · {f.rightsConfidenceTrajectory[i]}</div>
          </div>
        ))}
      </div>
    </DocketFrame>
  );
}
