'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ☩ IV — Legal Aid Intake.
// Per CIVICOS Master §20.1 — "Legal aid management".
// Surfaces the attorney pro-bono pool and the live civil-complaints
// that qualify for legal aid (severe / serious).

export function LegalAid({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const ar = b.portal.attorneyRegistration;
  const aidEligible = b.portal.complaints.filter(c => c.severity === 'elevated' || c.severity === 'severe');
  const inMediation = aidEligible.filter(c => c.status === 'mediation' || c.status === 'tribunal').length;
  return (
    <DocketFrame archetype="rights" numeral="☩ IV" title="Legal Aid Intake" subtitle="counsel of last resort">
      <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Pro-bono hrs Q', v: `${ar.proBonoHoursThisQK}K`, t: JUSTICE_DS.teal },
          { l: 'Licensed counsel', v: `${ar.licensedAttorneysK}K`, t: JUSTICE_DS.ivory },
          { l: 'Aid-eligible matters', v: aidEligible.length, t: aidEligible.length > 6 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
          { l: 'In mediation/tribunal', v: inMediation, t: JUSTICE_DS.bronze },
        ].map(x => (
          <div key={x.l} className="px-4 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="aid-eligible matters before the chamber" />
      <ul className="space-y-1.5">
        {aidEligible.slice(0, 8).map((c, i) => (
          <li key={c.id} className="grid grid-cols-[40px_1fr_120px_100px_120px] items-baseline gap-3 text-[11px]">
            <span className="text-right tabular-nums text-[10px]" style={{ color: JUSTICE_DS.bronze }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: JUSTICE_DS.ivory }}>{c.kind.replace(/-/g, ' ')}</span>
            <span className="text-right tabular-nums" style={{ color: JUSTICE_DS.mut }}>{c.ageDays}d open</span>
            <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: c.severity === 'severe' ? JUSTICE_DS.alert : JUSTICE_DS.burgundy }}>● {c.severity}</span>
            <span className="text-right text-[9.5px] uppercase italic tracking-[0.22em]" style={{ color: JUSTICE_DS.bronze }}>· {c.status}</span>
          </li>
        ))}
      </ul>
    </DocketFrame>
  );
}
