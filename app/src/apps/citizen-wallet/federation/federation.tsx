'use client';

// apps/citizen-portal/federation — Citizen Super-Portal federation.
// Consumes citizen-touching surfaces from every ministry and emits
// citizen-initiated requests, consents, appeals and votes back.

import * as React from 'react';
import { PORTAL_DS } from '@/apps/citizen-wallet/design-system/portal-ds';

export type FederationEdge = {
  partner: string;
  direction: 'emit' | 'consume';
  channel: string;
  cadence: string;
};

export const PORTAL_FEDERATION: FederationEdge[] = [
  { partner: 'Interior',         direction: 'emit',    channel: 'identity verification & permits requests',  cadence: 'on demand' },
  { partner: 'Treasury',         direction: 'emit',    channel: 'tax filing & payments',                     cadence: 'on demand' },
  { partner: 'Health',           direction: 'emit',    channel: 'appointment & EHR access consents',         cadence: 'on demand' },
  { partner: 'Justice',          direction: 'emit',    channel: 'case filings & appeals',                    cadence: 'on demand' },
  { partner: 'Assembly',         direction: 'emit',    channel: 'petitions & consultations',                 cadence: 'continuous' },
  { partner: 'Labour',           direction: 'emit',    channel: 'welfare & unemployment claims',             cadence: 'on demand' },
  { partner: 'Foreign Affairs',  direction: 'emit',    channel: 'consular service requests',                 cadence: 'on demand' },
  { partner: 'All ministries',   direction: 'consume', channel: 'notices, decisions, reminders',             cadence: 'continuous' },
  { partner: 'Interior',         direction: 'consume', channel: 'identity & resident registry',              cadence: 'continuous' },
  { partner: 'Health',           direction: 'consume', channel: 'health records & appointments',             cadence: 'continuous' },
  { partner: 'Education',        direction: 'consume', channel: 'learner twin & credentials',                cadence: 'continuous' },
  { partner: 'Assembly',         direction: 'consume', channel: 'voter status & open consultations',         cadence: 'continuous' },
];

export function FederationStrip() {
  const emit = PORTAL_FEDERATION.filter(e => e.direction === 'emit');
  const consume = PORTAL_FEDERATION.filter(e => e.direction === 'consume');
  return (
    <div className="rounded-[4px] border px-3 py-2 text-[10.5px]"
      style={{ borderColor: PORTAL_DS.rule, background: PORTAL_DS.paperSoft }}>
      <div className="mb-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: PORTAL_DS.teal, fontFamily: 'ui-monospace, monospace' }}>
        <span>citizen federation</span>
        <span style={{ color: PORTAL_DS.inkMut }}>·</span>
        <span style={{ color: PORTAL_DS.inkMut }}>{emit.length} requests · {consume.length} streams</span>
      </div>
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: PORTAL_DS.teal }}>citizen → ministries</div>
          {emit.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: PORTAL_DS.ruleSoft }}>
              <span style={{ color: PORTAL_DS.ink }}>{e.partner}</span>
              <span style={{ color: PORTAL_DS.inkMut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.18em]" style={{ color: PORTAL_DS.ember }}>ministries → citizen</div>
          {consume.map((e, i) => (
            <div key={`${e.partner}-${i}`} className="flex justify-between border-b py-0.5" style={{ borderColor: PORTAL_DS.ruleSoft }}>
              <span style={{ color: PORTAL_DS.ink }}>{e.partner}</span>
              <span style={{ color: PORTAL_DS.inkMut }}>{e.channel} · {e.cadence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
