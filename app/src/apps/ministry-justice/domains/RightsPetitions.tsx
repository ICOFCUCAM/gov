'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ☩ II — Constitutional Rights Petitions. The full petition docket
// surfaced as a standalone chamber, with scope distribution.

const STATUS_COL: Record<string, string> = {
  docketed: JUSTICE_DS.bronze, scheduled: JUSTICE_DS.navy, 'in-hearing': JUSTICE_DS.burgundy,
  reserved: JUSTICE_DS.bronze, 'ruling-issued': JUSTICE_DS.navy,
};

const SCOPE_COL: Record<string, string> = {
  individual: JUSTICE_DS.mut, class: JUSTICE_DS.burgundy, institutional: JUSTICE_DS.bronze,
};

export function RightsPetitions({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const p = b.portal.rightsPetitions;
  const byScope = (['individual', 'class', 'institutional'] as const).map(s => ({
    scope: s, count: p.filter(x => x.scope === s).length,
  }));
  return (
    <DocketFrame archetype="rights" numeral="☩ II" title="Constitutional Petitions" subtitle="rights petitions docket">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        {byScope.map(s => (
          <div key={s.scope} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: SCOPE_COL[s.scope] }}>{s.scope}</div>
            <div className="mt-1 tabular-nums text-[20px]" style={{ color: JUSTICE_DS.ivory }}>{s.count}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="petitions before the chamber" />
      {p.map((r, i) => (
        <RegisterRow key={r.id} numeral={`№ ${String(i + 1).padStart(3, '0')}`}
          primary={r.matter}
          secondary={`scope · ${r.scope} · filed ${r.filedDaysAgo}d ago · hearing in ${r.daysToHearing}d`}
          status={r.status.replace(/-/g, ' ')}
          statusColor={STATUS_COL[r.status] ?? JUSTICE_DS.bronze} />
      ))}
    </DocketFrame>
  );
}
