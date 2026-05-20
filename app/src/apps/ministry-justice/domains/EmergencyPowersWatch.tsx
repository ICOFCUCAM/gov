'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// § III — Emergency Powers Watch.
// Tracks active emergency-power invocations and sunset clauses across
// the Articles register. Every active invocation is a sovereign attack
// surface — surfaced here so it doesn't disappear into footnotes.

export function EmergencyPowersWatch({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const active = b.review.articles.filter(a => a.emergencyPowerActive);
  return (
    <DocketFrame archetype="chamber" numeral="§ III" title="Emergency powers watch" subtitle="sunset clauses · invocations">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        <div className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>Active invocations</div>
          <div className="mt-1 tabular-nums text-[18px]" style={{ color: active.length ? JUSTICE_DS.alert : JUSTICE_DS.navy }}>{active.length}</div>
        </div>
        <div className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>Articles under review</div>
          <div className="mt-1 tabular-nums text-[18px]" style={{ color: b.review.articlesUnderReview ? JUSTICE_DS.burgundy : JUSTICE_DS.navy }}>{b.review.articlesUnderReview}</div>
        </div>
        <div className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>Crisis risk</div>
          <div className="mt-1 tabular-nums text-[18px]" style={{ color: b.forecast.constitutionalCrisisRisk >= 60 ? JUSTICE_DS.alert : JUSTICE_DS.bronze }}>{b.forecast.constitutionalCrisisRisk}</div>
        </div>
      </div>
      <ChamberRule label="invocation register" />
      {active.length === 0 ? (
        <div className="text-[11px] italic" style={{ color: JUSTICE_DS.mut }}>· No active emergency-power invocations — Article V dormant.</div>
      ) : (
        active.map((a, i) => (
          <RegisterRow key={a.article} numeral={`№ ${String(i + 1).padStart(2, '0')}`} primary={a.title}
            secondary={`${a.article} · integrity ${a.integrityIdx}`}
            status="invoked" statusColor={JUSTICE_DS.alert} />
        ))
      )}
    </DocketFrame>
  );
}
