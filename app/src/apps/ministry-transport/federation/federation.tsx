'use client';

// apps/ministry-transport/federation — federation contract for the
// Ministry of Transport & National Logistics.

import * as React from 'react';
import { TRANSPORT_DS } from '@/apps/ministry-transport/design-system/transport-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const TRANSPORT_FEDERATION: FederationEdge[] = [
  { partner: 'Trade & Industry',   direction: 'emit',    channel: 'corridor & port throughput',          cadence: 'real-time' },
  { partner: 'Treasury',           direction: 'emit',    channel: 'logistics tariffs & permits',         cadence: 'weekly' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'evacuation-corridor activation',      cadence: 'real-time' },
  { partner: 'Health',             direction: 'emit',    channel: 'medical-cargo lane status',           cadence: 'real-time' },
  { partner: 'Agriculture',        direction: 'emit',    channel: 'farm-to-market corridor status',      cadence: 'daily' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'national-mobility continuity brief',  cadence: 'weekly' },
  { partner: 'Energy',             direction: 'consume', channel: 'corridor electrification & EV',       cadence: 'daily' },
  { partner: 'Environment',        direction: 'consume', channel: 'climate & weather hazards',           cadence: 'hourly' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'cross-border corridor advisories',    cadence: 'daily' },
];

export function FederationStrip() {
  const emit = TRANSPORT_FEDERATION.filter(e => e.direction === 'emit');
  const consume = TRANSPORT_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: TRANSPORT_DS.rule, background: 'rgba(95,196,240,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: TRANSPORT_DS.harbour, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: TRANSPORT_DS.mut }}>·</span>
        <span style={{ color: TRANSPORT_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: TRANSPORT_DS.harbour }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: TRANSPORT_DS.ruleSoft }}>
              <span style={{ color: TRANSPORT_DS.ink }}>{e.partner}</span>
              <span style={{ color: TRANSPORT_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: TRANSPORT_DS.rail }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: TRANSPORT_DS.ruleSoft }}>
              <span style={{ color: TRANSPORT_DS.ink }}>{e.partner}</span>
              <span style={{ color: TRANSPORT_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
