'use client';

// apps/emergency-response/federation — declared federation edges of the
// National Emergency Operations Centre.
//
// Emergency Response produces incident cascades into Interior, Health,
// Cabinet, Treasury (relief funds), Communications (alerts) and
// consumes hazard/risk signals from Environment, Energy, Transport.

import * as React from 'react';
import { EMERGENCY_DS } from '@/apps/emergency-response/design-system/emergency-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const EMERGENCY_FEDERATION: FederationEdge[] = [
  { partner: 'Interior',       direction: 'emit',    channel: 'incident cascade',                   cadence: 'real-time' },
  { partner: 'Health',         direction: 'emit',    channel: 'mass-casualty trauma protocol',      cadence: 'real-time' },
  { partner: 'Cabinet',        direction: 'emit',    channel: 'national-emergency declaration',     cadence: 'on escalation' },
  { partner: 'Treasury',       direction: 'emit',    channel: 'emergency-relief disbursement',      cadence: 'on declaration' },
  { partner: 'Communications', direction: 'emit',    channel: 'citizen alert broadcast',            cadence: 'real-time' },
  { partner: 'Justice',        direction: 'emit',    channel: 'evacuation-order legal authority',   cadence: 'on declaration' },
  { partner: 'Environment',    direction: 'consume', channel: 'hazard & climate signals',           cadence: 'hourly' },
  { partner: 'Energy',         direction: 'consume', channel: 'grid stability advisories',          cadence: 'real-time' },
  { partner: 'Transport',      direction: 'consume', channel: 'corridor closure feed',              cadence: 'real-time' },
];

export function FederationStrip() {
  const emit = EMERGENCY_FEDERATION.filter(e => e.direction === 'emit');
  const consume = EMERGENCY_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: EMERGENCY_DS.rule, background: 'rgba(255,93,93,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: EMERGENCY_DS.amber, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: EMERGENCY_DS.mut }}>·</span>
        <span style={{ color: EMERGENCY_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: EMERGENCY_DS.ember }}>emits → </div>
          {emit.map(e => (
            <div key={e.partner} className="flex justify-between border-b py-0.5" style={{ borderColor: EMERGENCY_DS.ruleSoft }}>
              <span style={{ color: EMERGENCY_DS.ink }}>{e.partner}</span>
              <span style={{ color: EMERGENCY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: EMERGENCY_DS.signal }}>← consumes from</div>
          {consume.map(e => (
            <div key={e.partner} className="flex justify-between border-b py-0.5" style={{ borderColor: EMERGENCY_DS.ruleSoft }}>
              <span style={{ color: EMERGENCY_DS.ink }}>{e.partner}</span>
              <span style={{ color: EMERGENCY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
