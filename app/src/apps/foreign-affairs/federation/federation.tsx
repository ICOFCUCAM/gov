'use client';

// apps/foreign-affairs/federation — federation contract for the
// Ministry of Foreign Affairs. Emits diplomatic cascades into
// Treasury, Trade, Interior, Energy, Cabinet, Justice and Defense.

import * as React from 'react';
import { FOREIGN_DS } from '@/apps/foreign-affairs/design-system/foreign-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const FOREIGN_FEDERATION: FederationEdge[] = [
  { partner: 'Treasury',          direction: 'emit',    channel: 'sovereign-asset exposure',      cadence: 'on incident' },
  { partner: 'Trade & Industry',  direction: 'emit',    channel: 'trade-corridor contingency',     cadence: 'real-time' },
  { partner: 'Interior',          direction: 'emit',    channel: 'migration & border posture',     cadence: 'on incident' },
  { partner: 'Energy',            direction: 'emit',    channel: 'import-dependency rebalancing',  cadence: 'real-time' },
  { partner: 'Cabinet',           direction: 'emit',    channel: 'diplomatic-continuity advisory', cadence: 'daily' },
  { partner: 'Justice',           direction: 'emit',    channel: 'international-law referrals',    cadence: 'on filing' },
  { partner: 'Defense',           direction: 'emit',    channel: 'defensive-posture advisories',   cadence: 'on incident' },
  { partner: 'Trade & Industry',  direction: 'consume', channel: 'sanctions-impact feed',          cadence: 'real-time' },
  { partner: 'Agriculture',       direction: 'consume', channel: 'food-import dependency',         cadence: 'weekly' },
];

export function FederationStrip() {
  const emit = FOREIGN_FEDERATION.filter(e => e.direction === 'emit');
  const consume = FOREIGN_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: FOREIGN_DS.rule, background: 'rgba(212,169,62,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: FOREIGN_DS.gold, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: FOREIGN_DS.mut }}>·</span>
        <span style={{ color: FOREIGN_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: FOREIGN_DS.gold }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: FOREIGN_DS.ruleSoft }}>
              <span style={{ color: FOREIGN_DS.ink }}>{e.partner}</span>
              <span style={{ color: FOREIGN_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: FOREIGN_DS.signal }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: FOREIGN_DS.ruleSoft }}>
              <span style={{ color: FOREIGN_DS.ink }}>{e.partner}</span>
              <span style={{ color: FOREIGN_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
