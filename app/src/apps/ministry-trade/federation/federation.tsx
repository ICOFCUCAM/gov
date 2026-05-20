'use client';

// apps/ministry-trade/federation — federation contract.

import * as React from 'react';
import { TRADE_DS } from '@/apps/ministry-trade/design-system/trade-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const TRADE_FEDERATION: FederationEdge[] = [
  { partner: 'Treasury',           direction: 'emit',    channel: 'tariffs, levies & export-revenue feed',     cadence: 'daily' },
  { partner: 'Transport',          direction: 'emit',    channel: 'corridor & port throughput',                cadence: 'real-time' },
  { partner: 'Energy',             direction: 'emit',    channel: 'industrial-load allocation',                cadence: 'daily' },
  { partner: 'Foreign Affairs',    direction: 'emit',    channel: 'trade-agreement & sanctions notes',         cadence: 'on incident' },
  { partner: 'Cabinet',            direction: 'emit',    channel: 'industrial-continuity advisory',            cadence: 'weekly' },
  { partner: 'Labour',             direction: 'emit',    channel: 'sector-shortage & closure feed',            cadence: 'weekly' },
  { partner: 'Energy',             direction: 'consume', channel: 'grid-allocation & fuel feed',               cadence: 'real-time' },
  { partner: 'Transport',          direction: 'consume', channel: 'corridor & port status',                    cadence: 'real-time' },
  { partner: 'Foreign Affairs',    direction: 'consume', channel: 'cross-border trade advisories',             cadence: 'weekly' },
];

export function FederationStrip() {
  const emit = TRADE_FEDERATION.filter(e => e.direction === 'emit');
  const consume = TRADE_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[3px] border px-3 py-2 text-[10px]"
      style={{ borderColor: TRADE_DS.rule, background: 'rgba(201,162,74,0.04)' }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: TRADE_DS.brass, fontFamily: 'ui-monospace, monospace' }}>
        <span>federation contract</span>
        <span style={{ color: TRADE_DS.mut }}>·</span>
        <span style={{ color: TRADE_DS.mut }}>{emit.length} emit · {consume.length} consume</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: TRADE_DS.brass }}>emits →</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: TRADE_DS.ruleSoft }}>
              <span style={{ color: TRADE_DS.ink }}>{e.partner}</span>
              <span style={{ color: TRADE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: TRADE_DS.steel }}>← consumes from</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: TRADE_DS.ruleSoft }}>
              <span style={{ color: TRADE_DS.ink }}>{e.partner}</span>
              <span style={{ color: TRADE_DS.mut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
