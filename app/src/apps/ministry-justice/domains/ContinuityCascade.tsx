'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ⏳ II — Cross-Ministry Cascade. The constitutional/judicial events
// that have propagated to other ministries, ordered by severity.

const STATUS_COL: Record<string, string> = {
  pending: JUSTICE_DS.mut, engaged: JUSTICE_DS.bronze, cleared: JUSTICE_DS.navy,
};

const SEV_COL: Record<string, string> = {
  advisory: JUSTICE_DS.bronze, elevated: '#a05538', critical: JUSTICE_DS.burgundy, national: JUSTICE_DS.alert,
};

export function ContinuityCascade({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  return (
    <DocketFrame archetype="continuity" numeral="⏳ II" title="Cross-Ministry Cascade" subtitle="constitutional events propagating across branches">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-[9px] uppercase italic tracking-[0.32em]" style={{ color: JUSTICE_DS.bronze }}>ministries engaged</span>
        {b.ministriesEngaged.length === 0 ? (
          <span className="text-[10px] italic" style={{ color: JUSTICE_DS.mut }}>· quiet across the cabinet</span>
        ) : (
          b.ministriesEngaged.map(m => (
            <span key={m.ministry} className="rounded px-2 py-0.5 text-[10px]" style={{ background: `${JUSTICE_DS.bronze}22`, color: JUSTICE_DS.ivory }}>
              {m.ministry} <span className="tabular-nums" style={{ color: JUSTICE_DS.bronze }}>·{m.engaged}</span>
            </span>
          ))
        )}
      </div>
      <ChamberRule label="incidents propagating" />
      {b.incidents.slice(0, 5).map((inc, i) => (
        <article key={inc.id} className="mb-3 border-l-2 pl-4" style={{ borderColor: SEV_COL[inc.severity] }}>
          <RegisterRow numeral={`№ ${String(i + 1).padStart(2, '0')}`}
            primary={inc.kind.replace(/-/g, ' ')}
            secondary={`origin · ${inc.origin} · age ${inc.ageDays}d · verdict ${inc.reviewVerdict}`}
            status={inc.severity}
            statusColor={SEV_COL[inc.severity]} />
          <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
            {inc.ministryCascade.map((c, idx) => (
              <div key={idx} className="grid grid-cols-[120px_1fr_50px_90px] items-baseline gap-2 px-3 py-1.5 text-[10.5px]" style={{ background: JUSTICE_DS.charcoalDeep, borderLeft: `2px solid ${STATUS_COL[c.status] ?? JUSTICE_DS.mut}` }}>
                <span style={{ color: JUSTICE_DS.ivory }}>{c.ministry}</span>
                <span className="text-[9.5px] italic" style={{ color: JUSTICE_DS.mut }}>{c.effect}</span>
                <span className="text-right tabular-nums text-[9.5px]" style={{ color: JUSTICE_DS.bronze }}>+{c.delayHrs}h</span>
                <span className="text-right text-[9px] uppercase italic tracking-[0.18em]" style={{ color: STATUS_COL[c.status] ?? JUSTICE_DS.mut }}>· {c.status}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </DocketFrame>
  );
}
