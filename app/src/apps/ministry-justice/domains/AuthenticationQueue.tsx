'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⚗ II — Authentication Queue. The forensic-corpus pending-auth
// backlog rendered as a single-queue throughput surface, with
// per-discipline contribution to the backlog.

export function AuthenticationQueue({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const corpus = b.forensics.corpus;
  const labs = b.forensics.labs;
  const totalCapacity = labs.reduce((s, l) => s + l.examinersOnDuty, 0);
  return (
    <DocketFrame archetype="forensic" numeral="⚗ II" title="Authentication Queue" subtitle="evidence pending forensic authentication">
      <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Pending', v: corpus.pendingAuthentication.toLocaleString(), t: corpus.pendingAuthentication > 8000 ? JUSTICE_DS.alert : JUSTICE_DS.burgundy },
          { l: 'Rejected this Q', v: corpus.rejectedThisQ.toLocaleString(), t: JUSTICE_DS.bronze },
          { l: 'Examiners on duty', v: totalCapacity, t: JUSTICE_DS.ivory },
          { l: 'Inter-op idx', v: b.forensics.interOperabilityIdx, t: JUSTICE_DS.teal },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="laboratory contribution to backlog" />
      <ul className="space-y-1">
        {labs.sort((a, b2) => b2.caseloadActive - a.caseloadActive).slice(0, 7).map(l => {
          const pct = Math.min(100, l.capacityUtilisationPct);
          const col = pct > 100 ? JUSTICE_DS.alert : pct > 85 ? JUSTICE_DS.burgundy : pct > 65 ? JUSTICE_DS.bronze : JUSTICE_DS.navy;
          return (
            <li key={l.id} className="grid grid-cols-[1fr_120px_80px_80px] items-baseline gap-3 text-[11px]">
              <span style={{ color: JUSTICE_DS.ivory }}>{l.discipline}<span className="ml-2 text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>· {l.region}</span></span>
              <div className="flex items-center gap-2">
                <div className="h-[3px] flex-1" style={{ background: JUSTICE_DS.charcoalDeep }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: col }} />
                </div>
                <span className="tabular-nums text-[10px]" style={{ color: col }}>{l.capacityUtilisationPct}%</span>
              </div>
              <span className="text-right tabular-nums" style={{ color: JUSTICE_DS.ink }}>{l.caseloadActive.toLocaleString()}</span>
              <span className="text-right tabular-nums text-[10px]" style={{ color: l.averageTurnaroundDays >= 60 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze }}>{l.averageTurnaroundDays}d</span>
            </li>
          );
        })}
      </ul>
    </DocketFrame>
  );
}
