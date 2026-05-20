'use client';

// apps/communications/federation — federation contract.

import * as React from 'react';
import { COMMS_DS } from '@/apps/communications/design-system/communications-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const COMMS_FEDERATION: FederationEdge[] = [
  { partner: 'Interior',           direction: 'emit',    channel: 'national-security cyber-incident escalation', cadence: 'real-time' },
  { partner: 'Treasury',           direction: 'emit',    channel: 'payments-rail isolation / fraud alerts',      cadence: 'real-time' },
  { partner: 'Justice',            direction: 'emit',    channel: 'cybercrime referrals',                        cadence: 'on filing' },
  { partner: 'Energy',             direction: 'emit',    channel: 'OT/ICS hardening advisories',                 cadence: 'real-time' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'connectivity-continuity advisory',            cadence: 'on incident' },
  { partner: 'Emergency Response', direction: 'emit',    channel: 'national emergency broadcast feed',           cadence: 'real-time' },
  { partner: 'Foreign Affairs',    direction: 'emit',    channel: 'cross-border data & cable diplomacy',         cadence: 'on incident' },
  { partner: 'Energy',             direction: 'consume', channel: 'power continuity for data centres',           cadence: 'real-time' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'cross-border cable & cyber-norms',            cadence: 'weekly' },
];

export function FederationStrip() {
  const emit = COMMS_FEDERATION.filter(e => e.direction === 'emit');
  const consume = COMMS_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: COMMS_DS.rule, background: 'rgba(95,196,240,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: COMMS_DS.electric, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: COMMS_DS.mut }}>·</span>
        <span style={{ color: COMMS_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: COMMS_DS.electric }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: COMMS_DS.ruleSoft }}>
              <span style={{ color: COMMS_DS.ink }}>{e.partner}</span>
              <span style={{ color: COMMS_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: COMMS_DS.lime }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: COMMS_DS.ruleSoft }}>
              <span style={{ color: COMMS_DS.ink }}>{e.partner}</span>
              <span style={{ color: COMMS_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
