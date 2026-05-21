'use client';

// apps/noc/federation — National Operations Centre federation contract.

import * as React from 'react';
import { NOC_DS } from '@/apps/noc/design-system/noc-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const NOC_FEDERATION: FederationEdge[] = [
  { partner: 'Presidency / Cabinet',     direction: 'emit',    channel: 'coordination recommendations',   cadence: 'continuous' },
  { partner: 'Emergency Response',       direction: 'emit',    channel: 'incident routing',                cadence: 'continuous' },
  { partner: 'Communications',           direction: 'emit',    channel: 'public briefings (every 6h)',    cadence: 'every 6h' },
  { partner: 'Audit Vault',              direction: 'emit',    channel: 'NOC decisions with rationale',   cadence: 'on decision' },
  { partner: 'All 15 ministries',        direction: 'consume', channel: 'operational posture signals',     cadence: 'continuous' },
  { partner: 'Police Command',           direction: 'consume', channel: 'security incidents',              cadence: 'continuous' },
  { partner: 'Emergency Response',       direction: 'consume', channel: 'crisis incident stream',          cadence: 'continuous' },
  { partner: 'Communications',           direction: 'consume', channel: 'cyber-posture stream',            cadence: 'continuous' },
  { partner: 'Foreign Affairs',          direction: 'consume', channel: 'geopolitical posture',            cadence: 'continuous' },
  { partner: 'Senate · Assembly',        direction: 'consume', channel: 'oversight findings',              cadence: 'on filing' },
];

export function FederationStrip() {
  const emit = NOC_FEDERATION.filter(e => e.direction === 'emit');
  const consume = NOC_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[2px] border px-3 py-2 text-[10px]"
      style={{ borderColor: NOC_DS.rule, background: 'rgba(91,191,208,0.04)', fontFamily: 'ui-monospace, monospace' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: NOC_DS.cyan }}>
        <span>NOC federation</span>
        <span style={{ color: NOC_DS.mut }}>·</span>
        <span style={{ color: NOC_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: NOC_DS.cyan }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: NOC_DS.ruleSoft }}>
              <span style={{ color: NOC_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: NOC_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: NOC_DS.amber }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: NOC_DS.ruleSoft }}>
              <span style={{ color: NOC_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: NOC_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
