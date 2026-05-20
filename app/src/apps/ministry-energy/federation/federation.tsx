'use client';

// apps/ministry-energy/federation — federation contract for the
// Ministry of Energy. Emits grid stability signals into Health (critical
// services), Transport (corridor electrification), Trade & Industry,
// Treasury, Environment, Cabinet and Emergency. Consumes signals from
// Environment (climate hazards) and Foreign Affairs (fuel imports).

import * as React from 'react';
import { ENERGY_DS } from '@/apps/ministry-energy/design-system/energy-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const ENERGY_FEDERATION: FederationEdge[] = [
  { partner: 'Health',             direction: 'emit',    channel: 'critical-services backup posture',    cadence: 'real-time' },
  { partner: 'Transport',          direction: 'emit',    channel: 'corridor electrification status',     cadence: 'real-time' },
  { partner: 'Trade & Industry',   direction: 'emit',    channel: 'industrial-allocation posture',       cadence: 'daily' },
  { partner: 'Treasury',           direction: 'emit',    channel: 'tariff & subsidy disbursement',       cadence: 'weekly' },
  { partner: 'Environment',        direction: 'emit',    channel: 'thermal & hydro stress signal',       cadence: 'real-time' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'grid-continuity advisory',            cadence: 'on incident' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'blackout / cascading-failure feed',   cadence: 'real-time' },
  { partner: 'Environment',        direction: 'consume', channel: 'climate hazard signals',              cadence: 'hourly' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'fuel-import dependency signals',      cadence: 'weekly' },
];

export function FederationStrip() {
  const emit = ENERGY_FEDERATION.filter(e => e.direction === 'emit');
  const consume = ENERGY_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: ENERGY_DS.rule, background: 'rgba(240,161,58,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: ENERGY_DS.amber, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: ENERGY_DS.mut }}>·</span>
        <span style={{ color: ENERGY_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ENERGY_DS.amber }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ENERGY_DS.ruleSoft }}>
              <span style={{ color: ENERGY_DS.ink }}>{e.partner}</span>
              <span style={{ color: ENERGY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ENERGY_DS.electric }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ENERGY_DS.ruleSoft }}>
              <span style={{ color: ENERGY_DS.ink }}>{e.partner}</span>
              <span style={{ color: ENERGY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
