'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⚖ V — Judicial Conduct Office. Discipline, recusal and complaint
// tracking surfaced through the existing dockets engine.

export function JudicialConduct({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  // Filter dockets to those with detainee-rights signals — proxy for conduct exposure.
  const conductRelevant = b.dockets.filter(d => d.detaineeRights !== 'safeguarded');
  return (
    <DocketFrame archetype="bench" numeral="⚖ V" title="Judicial Conduct Office" subtitle="discipline · recusals · rights signals">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Conduct review docket', v: conductRelevant.length, t: conductRelevant.length >= 3 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
          { l: 'Active dockets', v: b.dockets.length, t: JUSTICE_DS.ivory },
          { l: 'Rights-engaged', v: b.dockets.filter(d => d.detaineeRights === 'review-engaged').length, t: JUSTICE_DS.bronze },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="dockets flagged for conduct review" />
      {conductRelevant.length === 0 ? (
        <div className="text-[11px] italic" style={{ color: JUSTICE_DS.mut }}>· No conduct flags active — full judicial integrity.</div>
      ) : (
        conductRelevant.map((d, i) => (
          <RegisterRow key={d.id} numeral={`№ ${String(i + 1).padStart(2, '0')}`} primary={d.matter}
            secondary={`${d.agency} · stage: ${d.stage}`}
            status={d.detaineeRights} statusColor={d.detaineeRights === 'breach-alert' ? JUSTICE_DS.alert : JUSTICE_DS.bronze}
            columns={[{ label: 'evidence', value: `${d.evidentiaryIntegrity}` }]} />
        ))
      )}
    </DocketFrame>
  );
}
