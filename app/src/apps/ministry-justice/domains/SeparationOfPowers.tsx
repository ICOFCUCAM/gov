'use client';

import * as React from 'react';
import { justiceContinuityBoard } from '@/lib/gov/justice-continuity';
import { DocketFrame, StatPair, ChamberRule, JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

// § II — Separation of Powers.
// Renders the three-branch independence indices over time and the
// articles currently under formal review that bear on inter-branch
// boundaries.

export function SeparationOfPowers({ id, now }: { id: string; now: number }) {
  void id;
  const b = justiceContinuityBoard(now);
  const sop = b.review.separationOfPowersIdx;
  const ji = b.review.judicialIndependenceIdx;
  const breachWatch = b.review.posture === 'breach-watch' || b.review.posture === 'pressure';
  return (
    <DocketFrame archetype="chamber" numeral="§ II" title="Separation of powers" subtitle="three-branch independence">
      <StatPair items={[
        { label: 'Separation index', value: sop, tone: sop >= 75 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy },
        { label: 'Judicial independence', value: ji, tone: ji >= 75 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy },
        { label: 'Integrity composite', value: b.review.integrityIdx, tone: b.review.integrityIdx >= 80 ? JUSTICE_DS.navy : JUSTICE_DS.bronze },
        { label: 'Posture', value: b.review.posture, tone: breachWatch ? JUSTICE_DS.alert : JUSTICE_DS.bronze },
      ]} />
      <ChamberRule label="articles bearing on separation" />
      <ul className="space-y-1.5">
        {b.review.articles.filter(a => a.underReview || a.article === '§ II' || a.article === '§ IV').map(a => (
          <li key={a.article} className="grid grid-cols-[60px_1fr_100px_120px] items-baseline gap-3 text-[11px]">
            <span className="italic" style={{ color: JUSTICE_DS.bronze }}>{a.article}</span>
            <span style={{ color: JUSTICE_DS.ivory }}>{a.title}</span>
            <span className="text-right tabular-nums" style={{ color: a.integrityIdx >= 80 ? JUSTICE_DS.navy : JUSTICE_DS.burgundy }}>integ {a.integrityIdx}</span>
            <span className="text-right text-[9.5px] uppercase italic tracking-[0.18em]" style={{ color: a.underReview ? JUSTICE_DS.burgundy : JUSTICE_DS.mut }}>
              {a.underReview ? '· under review' : '· settled'}
            </span>
          </li>
        ))}
      </ul>
    </DocketFrame>
  );
}
