'use client';

// apps/presidency/federation — federation contract.
// The Presidency is the executive synthesis surface that consumes
// outputs from every ministry and emits resolutions, orders and
// engagements back across the federation.

import * as React from 'react';
import { PRESIDENCY_DS } from '@/apps/presidency/design-system/presidency-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const PRESIDENCY_FEDERATION: FederationEdge[] = [
  { partner: 'Cabinet (15 ministries)', direction: 'emit',    channel: 'executive orders & cabinet resolutions', cadence: 'weekly' },
  { partner: 'Senate',                  direction: 'emit',    channel: 'treaty submissions & nominations',       cadence: 'on filing' },
  { partner: 'National Assembly',       direction: 'emit',    channel: 'executive bills & budget message',       cadence: 'per session' },
  { partner: 'Judicial Branch',         direction: 'emit',    channel: 'judicial nominations',                   cadence: 'on filing' },
  { partner: 'Foreign Affairs',         direction: 'emit',    channel: 'state visit & diplomatic instruction',   cadence: 'weekly' },
  { partner: 'Audit Vault',             direction: 'emit',    channel: 'presidential records & disclosures',     cadence: 'quarterly' },
  { partner: 'Cabinet (15 ministries)', direction: 'consume', channel: 'ministry posture & cascade signals',     cadence: 'continuous' },
  { partner: 'Senate',                  direction: 'consume', channel: 'ratification & concurrence outcomes',    cadence: 'per session' },
  { partner: 'National Assembly',       direction: 'consume', channel: 'appropriation & question-time feedback', cadence: 'weekly' },
  { partner: 'Judicial Branch',         direction: 'consume', channel: 'constitutional rulings',                 cadence: 'on ruling' },
  { partner: 'Emergency Response',      direction: 'consume', channel: 'crisis & continuity escalations',        cadence: 'continuous' },
  { partner: 'Foreign Affairs',         direction: 'consume', channel: 'inbound diplomatic dispatches',          cadence: 'continuous' },
];

export function FederationStrip() {
  const emit = PRESIDENCY_FEDERATION.filter(e => e.direction === 'emit');
  const consume = PRESIDENCY_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: PRESIDENCY_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: PRESIDENCY_DS.goldLeaf, fontFamily: 'ui-monospace, monospace' }}>
        <span>executive federation</span>
        <span style={{ color: PRESIDENCY_DS.mut }}>·</span>
        <span style={{ color: PRESIDENCY_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: PRESIDENCY_DS.goldLeaf }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: PRESIDENCY_DS.ruleSoft }}>
              <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: PRESIDENCY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: PRESIDENCY_DS.parchment }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: PRESIDENCY_DS.ruleSoft }}>
              <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: PRESIDENCY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
