'use client';

// apps/ministry-agriculture/federation — federation contract for the
// Ministry of Agriculture & Food Security. Emits food-continuity
// signals into Treasury, Trade, Environment, Health, Cabinet and
// Emergency; consumes climate signals from Environment.

import * as React from 'react';
import { AGRICULTURE_DS } from '@/apps/ministry-agriculture/design-system/agriculture-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const AGRICULTURE_FEDERATION: FederationEdge[] = [
  { partner: 'Treasury',           direction: 'emit',    channel: 'subsidy disbursement & reserve drawdown', cadence: 'weekly' },
  { partner: 'Trade & Industry',   direction: 'emit',    channel: 'export / import dependency',              cadence: 'weekly' },
  { partner: 'Environment',        direction: 'emit',    channel: 'agricultural runoff telemetry',           cadence: 'daily' },
  { partner: 'Health',             direction: 'emit',    channel: 'nutritional & food-safety advisory',      cadence: 'real-time' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'food-continuity continuity advisory',     cadence: 'weekly' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'food crisis / scarcity declaration',      cadence: 'on incident' },
  { partner: 'Environment',        direction: 'consume', channel: 'drought / climate forecast',              cadence: 'daily' },
  { partner: 'Transport',          direction: 'consume', channel: 'farm-to-market corridor status',          cadence: 'real-time' },
  { partner: 'Energy',             direction: 'consume', channel: 'irrigation pumping capacity',             cadence: 'daily' },
];

export function FederationStrip() {
  const emit = AGRICULTURE_FEDERATION.filter(e => e.direction === 'emit');
  const consume = AGRICULTURE_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: AGRICULTURE_DS.rule, background: 'rgba(217,183,106,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: AGRICULTURE_DS.wheat, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: AGRICULTURE_DS.mut }}>·</span>
        <span style={{ color: AGRICULTURE_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.wheat }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: AGRICULTURE_DS.ruleSoft }}>
              <span style={{ color: AGRICULTURE_DS.ink }}>{e.partner}</span>
              <span style={{ color: AGRICULTURE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: AGRICULTURE_DS.sky }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: AGRICULTURE_DS.ruleSoft }}>
              <span style={{ color: AGRICULTURE_DS.ink }}>{e.partner}</span>
              <span style={{ color: AGRICULTURE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
