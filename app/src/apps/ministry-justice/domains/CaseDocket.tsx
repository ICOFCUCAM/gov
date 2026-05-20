'use client';

import * as React from 'react';
import { justiceRecordsForensicsBoard } from '@/lib/gov/justice-records-forensics';
import { DocketFrame, RegisterRow, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';
import type { JusticeArchetype } from '@/apps/ministry-justice/design-system/justice-ds';

// ¶ I-V — Case Docket surfaces. One component renders for every
// jurisdiction (civil / criminal / family / commercial / administrative)
// by filtering the filings flow from the records engine.

const CATEGORY_LABEL: Record<string, string> = {
  civil: 'Civil docket',
  criminal: 'Criminal docket',
  family: 'Family docket',
  commercial: 'Commercial docket',
  administrative: 'Administrative review docket',
};

const NUMERAL: Record<string, string> = {
  civil: '¶ I', criminal: '¶ II', family: '¶ III', commercial: '¶ IV', administrative: '¶ V',
};

const SUBTITLE: Record<string, string> = {
  civil: 'private-law disputes between parties',
  criminal: 'public prosecutions',
  family: 'matrimonial, custody, maintenance',
  commercial: 'business & contractual disputes',
  administrative: 'review of administrative actions',
};

export function CaseDocket({ id, now, category }: {
  id: string; now: number;
  category: 'civil' | 'criminal' | 'family' | 'commercial' | 'administrative';
}) {
  void id;
  const b = justiceRecordsForensicsBoard(now);
  const flow = b.portal.filings.find(f => f.category === category);
  const archetype: JusticeArchetype = 'docket';
  if (!flow) return null;
  const acceptanceRate = flow.filedToday > 0 ? Math.round((flow.acceptedToday / flow.filedToday) * 100) : 0;
  return (
    <DocketFrame archetype={archetype} numeral={NUMERAL[category]!} title={CATEGORY_LABEL[category]!} subtitle={SUBTITLE[category]!}>
      <div className="grid grid-cols-2 gap-px md:grid-cols-5" style={{ background: JUSTICE_DS.rule }}>
        {[
          { l: 'Filed today', v: flow.filedToday, t: JUSTICE_DS.ivory },
          { l: 'Accepted', v: flow.acceptedToday, t: JUSTICE_DS.navy },
          { l: 'Rejected', v: flow.rejectedToday, t: flow.rejectedToday >= 60 ? JUSTICE_DS.burgundy : JUSTICE_DS.mut },
          { l: 'Pending', v: flow.pending.toLocaleString(), t: JUSTICE_DS.bronze },
          { l: 'Median (h)', v: flow.medianAcceptanceHrs, t: flow.medianAcceptanceHrs >= 72 ? JUSTICE_DS.burgundy : JUSTICE_DS.bronze },
        ].map(x => (
          <div key={x.l} className="px-3 py-3" style={{ background: JUSTICE_DS.charcoal }}>
            <div className="text-[9px] uppercase tracking-[0.24em]" style={{ color: JUSTICE_DS.mut }}>{x.l}</div>
            <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.t }}>{x.v}</div>
          </div>
        ))}
      </div>
      <ChamberRule label="acceptance rate" />
      <div className="grid grid-cols-[1fr_60px] items-center gap-3">
        <div className="h-3" style={{ background: JUSTICE_DS.charcoalDeep }}>
          <div className="h-full" style={{ width: `${acceptanceRate}%`, background: `linear-gradient(90deg, ${JUSTICE_DS.navy} 0%, ${JUSTICE_DS.bronze} 100%)` }} />
        </div>
        <span className="text-right tabular-nums text-[18px]" style={{ color: JUSTICE_DS.navy }}>{acceptanceRate}%</span>
      </div>
      <ChamberRule label="dispositive matter sample" />
      <div className="space-y-0">
        {b.portal.complaints.filter(c => c.kind === 'discrimination' || c.kind === 'rights-violation').slice(0, 4).map((c, i) => (
          <RegisterRow key={c.id} numeral={`№ ${String(i + 1).padStart(2, '0')}`} primary={c.kind.replace(/-/g, ' ')}
            secondary={`age ${c.ageDays}d · severity ${c.severity}`}
            status={c.status} statusColor={c.status === 'resolved' ? JUSTICE_DS.navy : JUSTICE_DS.bronze} />
        ))}
      </div>
    </DocketFrame>
  );
}

// Per-category wrappers so the shell dispatch is one-line.
export const CivilDocket = (p: { id: string; now: number }) => <CaseDocket {...p} category="civil" />;
export const CriminalDocket = (p: { id: string; now: number }) => <CaseDocket {...p} category="criminal" />;
export const FamilyDocket = (p: { id: string; now: number }) => <CaseDocket {...p} category="family" />;
export const CommercialDocket = (p: { id: string; now: number }) => <CaseDocket {...p} category="commercial" />;
export const AdministrativeDocket = (p: { id: string; now: number }) => <CaseDocket {...p} category="administrative" />;
