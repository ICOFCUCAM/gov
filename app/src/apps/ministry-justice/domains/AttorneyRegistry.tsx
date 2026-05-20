'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, StatPair, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// ◊ II — Attorney Registry. Bar admissions and discipline cases
// surfaced from the public-portal pillar of the records engine.

export function AttorneyRegistry({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const ar = b.portal.attorneyRegistration;
  return (
    <DocketFrame archetype="portal" numeral="◊ II" title="Attorney Registry" subtitle="bar admissions · discipline · pro-bono">
      <StatPair items={[
        { label: 'Licensed counsel', value: `${ar.licensedAttorneysK}K`, tone: JUSTICE_DS.ivory },
        { label: 'New admissions / Q', value: ar.newAdmissionsThisQ.toLocaleString(), tone: JUSTICE_DS.navy },
        { label: 'Discipline open', value: ar.disciplinaryCasesOpen, tone: ar.disciplinaryCasesOpen >= 120 ? JUSTICE_DS.alert : JUSTICE_DS.bronze },
        { label: 'Pro-bono kh / Q', value: ar.proBonoHoursThisQK, tone: JUSTICE_DS.teal },
      ]} />
      <ChamberRule label="discipline disposition" />
      <p className="text-[11px] italic" style={{ color: JUSTICE_DS.mut }}>
        Bar admissions and disciplinary review are administered by the Chamber-affiliated Bar Council with mandatory
        annual rotation of disciplinary panels. Every disposition is sealed in the supreme-rulings vault and
        published in the public docket with privacy redaction.
      </p>
      <ChamberRule label="registration uptime" />
      <div className="grid grid-cols-[1fr_70px] items-center gap-3">
        <div className="h-2.5" style={{ background: JUSTICE_DS.charcoalDeep }}>
          <div className="h-full" style={{ width: `${ar.registrationUptimePct}%`, background: `linear-gradient(90deg, ${JUSTICE_DS.navy} 0%, ${JUSTICE_DS.teal} 100%)` }} />
        </div>
        <span className="text-right tabular-nums text-[14px]" style={{ color: ar.registrationUptimePct >= 99 ? JUSTICE_DS.navy : JUSTICE_DS.bronze }}>{ar.registrationUptimePct}%</span>
      </div>
    </DocketFrame>
  );
}
