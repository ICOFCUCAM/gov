'use client';

// apps/assembly/federation — federation contract.

import * as React from 'react';
import { ASSEMBLY_DS } from '@/apps/assembly/design-system/assembly-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const ASSEMBLY_FEDERATION: FederationEdge[] = [
  { partner: 'Senate',          direction: 'emit',    channel: 'first-reading bills',                cadence: 'per session' },
  { partner: 'Cabinet',         direction: 'emit',    channel: 'budget-vote demand',                  cadence: 'annual' },
  { partner: 'Treasury',        direction: 'emit',    channel: 'audit-finding referrals',             cadence: 'monthly' },
  { partner: 'Judicial Branch', direction: 'emit',    channel: 'constitutional referrals',            cadence: 'on filing' },
  { partner: 'Justice',         direction: 'emit',    channel: 'misconduct referrals',                cadence: 'on filing' },
  { partner: 'Police Command',  direction: 'emit',    channel: 'oversight inquiries',                 cadence: 'monthly' },
  { partner: 'Senate',          direction: 'consume', channel: 'second-reading concurrences',         cadence: 'per session' },
  { partner: 'Cabinet',         direction: 'consume', channel: 'executive bill drafts',               cadence: 'per session' },
  { partner: 'Treasury',        direction: 'consume', channel: 'budget proposal',                     cadence: 'annual' },
];

export function FederationStrip() {
  const emit = ASSEMBLY_FEDERATION.filter(e => e.direction === 'emit');
  const consume = ASSEMBLY_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: ASSEMBLY_DS.rule, background: 'rgba(31,157,99,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: ASSEMBLY_DS.jade, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: ASSEMBLY_DS.mut }}>·</span>
        <span style={{ color: ASSEMBLY_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ASSEMBLY_DS.jade }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ASSEMBLY_DS.ruleSoft }}>
              <span style={{ color: ASSEMBLY_DS.parchment }}>{e.partner}</span>
              <span style={{ color: ASSEMBLY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ASSEMBLY_DS.rose }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: ASSEMBLY_DS.ruleSoft }}>
              <span style={{ color: ASSEMBLY_DS.parchment }}>{e.partner}</span>
              <span style={{ color: ASSEMBLY_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
