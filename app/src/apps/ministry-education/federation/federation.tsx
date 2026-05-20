'use client';

// apps/ministry-education/federation — federation contract.

import * as React from 'react';
import { EDUCATION_DS } from '@/apps/ministry-education/design-system/education-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const EDUCATION_FEDERATION: FederationEdge[] = [
  { partner: 'Labour',             direction: 'emit',    channel: 'graduate-cohort & skills pipeline',     cadence: 'monthly' },
  { partner: 'Health',             direction: 'emit',    channel: 'school-health & nutrition advisory',    cadence: 'real-time' },
  { partner: 'Trade & Industry',   direction: 'emit',    channel: 'research-output & industrial liaison',  cadence: 'quarterly' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'literacy-continuity advisory',          cadence: 'quarterly' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'school-disruption notice',              cadence: 'on incident' },
  { partner: 'Justice',            direction: 'emit',    channel: 'civic / constitutional literacy',       cadence: 'annual' },
  { partner: 'Treasury',           direction: 'consume', channel: 'education budget & disbursements',      cadence: 'monthly' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'international scholarship treaties',    cadence: 'quarterly' },
  { partner: 'Communications',     direction: 'consume', channel: 'bandwidth & digital infra',             cadence: 'daily' },
];

export function FederationStrip() {
  const emit = EDUCATION_FEDERATION.filter(e => e.direction === 'emit');
  const consume = EDUCATION_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: EDUCATION_DS.rule, background: 'rgba(212,169,62,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: EDUCATION_DS.gold, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: EDUCATION_DS.mut }}>·</span>
        <span style={{ color: EDUCATION_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.gold }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: EDUCATION_DS.ruleSoft }}>
              <span style={{ color: EDUCATION_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: EDUCATION_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: EDUCATION_DS.cobalt }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: EDUCATION_DS.ruleSoft }}>
              <span style={{ color: EDUCATION_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: EDUCATION_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
