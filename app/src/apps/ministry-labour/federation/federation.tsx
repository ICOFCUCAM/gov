'use client';

// apps/ministry-labour/federation — federation contract.

import * as React from 'react';
import { LABOUR_DS } from '@/apps/ministry-labour/design-system/labour-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const LABOUR_FEDERATION: FederationEdge[] = [
  { partner: 'Treasury',           direction: 'emit',    channel: 'benefits & subsidy disbursement',     cadence: 'weekly' },
  { partner: 'Trade & Industry',   direction: 'emit',    channel: 'sector-shortage advisory',            cadence: 'weekly' },
  { partner: 'Health',             direction: 'emit',    channel: 'occupational health incidents',       cadence: 'real-time' },
  { partner: 'Justice',            direction: 'emit',    channel: 'tribunal escalations',                cadence: 'on filing' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'mass-displacement notice',            cadence: 'on incident' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'social-continuity advisory',          cadence: 'weekly' },
  { partner: 'Education',          direction: 'consume', channel: 'graduate-cohort & skills pipeline',   cadence: 'monthly' },
  { partner: 'Trade & Industry',   direction: 'consume', channel: 'demand & vacancy signals',            cadence: 'weekly' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'migration & cross-border labour',     cadence: 'weekly' },
];

export function FederationStrip() {
  const emit = LABOUR_FEDERATION.filter(e => e.direction === 'emit');
  const consume = LABOUR_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: LABOUR_DS.rule, background: 'rgba(95,168,255,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: LABOUR_DS.steel, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: LABOUR_DS.mut }}>·</span>
        <span style={{ color: LABOUR_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: LABOUR_DS.steel }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: LABOUR_DS.ruleSoft }}>
              <span style={{ color: LABOUR_DS.ink }}>{e.partner}</span>
              <span style={{ color: LABOUR_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: LABOUR_DS.teal }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: LABOUR_DS.ruleSoft }}>
              <span style={{ color: LABOUR_DS.ink }}>{e.partner}</span>
              <span style={{ color: LABOUR_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
