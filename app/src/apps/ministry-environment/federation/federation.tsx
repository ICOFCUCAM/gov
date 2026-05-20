'use client';

// apps/ministry-environment/federation — federation contract.
//
// Environment produces hazard signals into Emergency, Health, Transport,
// Energy, Agriculture, Cabinet and Justice (for protected-area
// enforcement). Consumes industrial telemetry from Trade, Energy and
// Agriculture.

import * as React from 'react';
import { ENVIRONMENT_DS } from '@/apps/ministry-environment/design-system/environment-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const ENVIRONMENT_FEDERATION: FederationEdge[] = [
  { partner: 'Emergency Response', direction: 'emit',    channel: 'hazard & climate-incident feed',  cadence: 'real-time' },
  { partner: 'Health',             direction: 'emit',    channel: 'air-quality & water-quality feed', cadence: 'hourly' },
  { partner: 'Transport',          direction: 'emit',    channel: 'corridor-exposure forecast',       cadence: 'daily' },
  { partner: 'Energy',             direction: 'emit',    channel: 'thermal & hydro stress signal',    cadence: 'real-time' },
  { partner: 'Agriculture',        direction: 'emit',    channel: 'drought / yield-stress feed',      cadence: 'daily' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'planetary-continuity advisory',    cadence: 'weekly' },
  { partner: 'Justice',            direction: 'emit',    channel: 'enforcement & protected-area',     cadence: 'on incident' },
  { partner: 'Trade & Industry',   direction: 'consume', channel: 'industrial-emissions telemetry',   cadence: 'daily' },
  { partner: 'Agriculture',        direction: 'consume', channel: 'agricultural runoff telemetry',    cadence: 'daily' },
];

export function FederationStrip() {
  const emit = ENVIRONMENT_FEDERATION.filter(e => e.direction === 'emit');
  const consume = ENVIRONMENT_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: ENVIRONMENT_DS.rule, background: 'rgba(111,207,106,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: ENVIRONMENT_DS.leaf, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: ENVIRONMENT_DS.mut }}>·</span>
        <span style={{ color: ENVIRONMENT_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.leaf }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ENVIRONMENT_DS.ruleSoft }}>
              <span style={{ color: ENVIRONMENT_DS.ink }}>{e.partner}</span>
              <span style={{ color: ENVIRONMENT_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.sky }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ENVIRONMENT_DS.ruleSoft }}>
              <span style={{ color: ENVIRONMENT_DS.ink }}>{e.partner}</span>
              <span style={{ color: ENVIRONMENT_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
