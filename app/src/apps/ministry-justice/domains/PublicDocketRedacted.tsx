'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ☩ III — Public Docket (privacy-redacted).
// Per CIVICOS Master §20.1 — "Public docket with privacy redaction".
// Surfaces filings the public may inspect, with sensitive parties
// replaced by redaction markers.

function redact(s: string): string {
  // Replace personally identifying segments (capitalised name pairs) with [redacted]
  return s.replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, '[redacted]');
}

export function PublicDocketRedacted({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const filings = b.portal.filings;
  const totalFiled = filings.reduce((s, f) => s + f.filedToday, 0);
  const totalAccepted = filings.reduce((s, f) => s + f.acceptedToday, 0);
  return (
    <DocketFrame archetype="rights" numeral="☩ III" title="Public Docket" subtitle="redacted public-record view">
      <div className="grid grid-cols-3 gap-px" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Public records today', v: totalAccepted.toLocaleString(), t: JUSTICE_DS.ivory },
          { l: 'Filings received', v: totalFiled.toLocaleString(), t: JUSTICE_DS.bronze },
          { l: 'Portal lookups /day', v: `${b.portal.caseTrackingAccessesDailyK}K`, t: JUSTICE_DS.navy },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="public matters (sample, redacted)" />
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-[9px] uppercase italic tracking-[0.22em]" style={{ color: JUSTICE_DS.mut }}>
            <th className="py-2 pr-2">Matter №</th>
            <th className="py-2 pr-2">Jurisdiction</th>
            <th className="py-2 pr-2">Public synopsis</th>
            <th className="py-2 pr-2 text-right">Filed</th>
          </tr>
        </thead>
        <tbody>
          {filings.slice(0, 6).map((f, i) => (
            <tr key={f.category} className="border-t" style={{ borderColor: JUSTICE_DS.ruleSoft }}>
              <td className="py-2 pr-2 tabular-nums" style={{ color: JUSTICE_DS.bronze }}>{`PUB-${(b.epoch * 7 + i * 13).toString(36).toUpperCase().slice(-5)}`}</td>
              <td className="py-2 pr-2" style={{ color: JUSTICE_DS.ivory }}>{f.category}</td>
              <td className="py-2 pr-2 italic" style={{ color: JUSTICE_DS.mut }}>{redact(`Matter of ${f.category} filing — parties: John Smith vs Jane Doe — proceeding under standard rules.`)}</td>
              <td className="py-2 pr-2 text-right tabular-nums" style={{ color: JUSTICE_DS.ink }}>{f.acceptedToday}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[10px] italic" style={{ color: JUSTICE_DS.mut }}>
        Identifying parties are redacted per the public-docket privacy doctrine; full records remain accessible to
        counsel of record and the judiciary.
      </div>
    </DocketFrame>
  );
}
