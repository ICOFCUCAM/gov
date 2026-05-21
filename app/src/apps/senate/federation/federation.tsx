'use client';

// apps/senate/federation — federation contract.

import * as React from 'react';
import { SENATE_DS } from '@/apps/senate/design-system/senate-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const SENATE_FEDERATION: FederationEdge[] = [
  { partner: 'National Assembly', direction: 'emit',    channel: 'second-reading concurrence',         cadence: 'per session' },
  { partner: 'Cabinet',           direction: 'emit',    channel: 'oversight findings & summons',       cadence: 'weekly' },
  { partner: 'Judicial Branch',   direction: 'emit',    channel: 'constitutional referrals',           cadence: 'on filing' },
  { partner: 'Foreign Affairs',   direction: 'emit',    channel: 'treaty ratification concurrence',    cadence: 'on filing' },
  { partner: 'Treasury',          direction: 'emit',    channel: 'audit-finding hearings',             cadence: 'monthly' },
  { partner: 'Justice',           direction: 'emit',    channel: 'misconduct referrals',               cadence: 'on filing' },
  { partner: 'National Assembly', direction: 'consume', channel: 'first-reading bills',                cadence: 'per session' },
  { partner: 'Cabinet',           direction: 'consume', channel: 'executive bill drafts',              cadence: 'per session' },
  { partner: 'Foreign Affairs',   direction: 'consume', channel: 'treaty deposit requests',            cadence: 'on filing' },
];

export function FederationStrip() {
  const emit = SENATE_FEDERATION.filter(e => e.direction === 'emit');
  const consume = SENATE_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: SENATE_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: SENATE_DS.gold, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: SENATE_DS.mut }}>·</span>
        <span style={{ color: SENATE_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: SENATE_DS.gold }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: SENATE_DS.ruleSoft }}>
              <span style={{ color: SENATE_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: SENATE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: SENATE_DS.rose }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: SENATE_DS.ruleSoft }}>
              <span style={{ color: SENATE_DS.parchmentInk }}>{e.partner}</span>
              <span style={{ color: SENATE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
