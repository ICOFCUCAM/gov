'use client';

import * as React from 'react';
import { JUDICIAL_DS } from '@/apps/judicial-branch/design-system/judicial-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const JUDICIAL_FEDERATION: FederationEdge[] = [
  { partner: 'Senate',           direction: 'emit',    channel: 'constitutional rulings',         cadence: 'on publication' },
  { partner: 'National Assembly',direction: 'emit',    channel: 'constitutional rulings',         cadence: 'on publication' },
  { partner: 'Cabinet',          direction: 'emit',    channel: 'constitutional rulings',         cadence: 'on publication' },
  { partner: 'Justice',          direction: 'emit',    channel: 'judgment & sentence directives', cadence: 'real-time' },
  { partner: 'Police Command',   direction: 'emit',    channel: 'warrant & search authority',     cadence: 'on filing' },
  { partner: 'Audit Vault',      direction: 'emit',    channel: 'sealed rulings & doctrines',     cadence: 'real-time' },
  { partner: 'Senate',           direction: 'consume', channel: 'constitutional referrals',       cadence: 'on filing' },
  { partner: 'National Assembly',direction: 'consume', channel: 'constitutional referrals',       cadence: 'on filing' },
  { partner: 'Justice',          direction: 'consume', channel: 'case filings',                   cadence: 'real-time' },
];

export function FederationStrip() {
  const emit = JUDICIAL_FEDERATION.filter(e => e.direction === 'emit');
  const consume = JUDICIAL_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: JUDICIAL_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: JUDICIAL_DS.gold, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: JUDICIAL_DS.mut }}>·</span>
        <span style={{ color: JUDICIAL_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: JUDICIAL_DS.gold }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: JUDICIAL_DS.ruleSoft }}>
              <span style={{ color: JUDICIAL_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: JUDICIAL_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: JUDICIAL_DS.violet }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: JUDICIAL_DS.ruleSoft }}>
              <span style={{ color: JUDICIAL_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: JUDICIAL_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
