'use client';

// apps/ministry-justice/federation — typed federation contract.
//
// Declares which ministries this ministry produces events for and which
// it consumes from. The runtime visualisation (FederationBadge) appears
// in the shell so cross-ministry obligations are legible at a glance.

import * as React from 'react';
import { JUSTICE_DS } from '@/apps/ministry-justice/design-system/justice-ds';

export interface JusticeFederationEdge {
  ministry: string;
  contract: string;          // human-readable shorthand of the event/obligation
  direction: 'produces' | 'consumes';
}

export const JUSTICE_FEDERATION: JusticeFederationEdge[] = [
  // produces — Justice raises constitutional/judicial events upstream
  { ministry: 'Interior', contract: 'court orders · enforcement requests · evidence custody requests', direction: 'produces' },
  { ministry: 'Treasury', contract: 'disbursement legality verdicts · fiscal-accountability findings', direction: 'produces' },
  { ministry: 'Cabinet', contract: 'constitutional advisories · emergency-power sunset notices', direction: 'produces' },
  { ministry: 'Legislature', contract: 'statute-legality verdicts · constitutional-amendment review', direction: 'produces' },
  { ministry: 'National Coordination', contract: 'cross-branch cascade · judicial continuity briefs', direction: 'produces' },
  // consumes — Justice receives from these ministries
  { ministry: 'Police Command', contract: 'investigation case handover · arrest records · evidence chain', direction: 'consumes' },
  { ministry: 'Interior', contract: 'civil-registry verifications · identity authentications', direction: 'consumes' },
];

export function FederationBadge({ edge }: { edge: JusticeFederationEdge }) {
  const isProduces = edge.direction === 'produces';
  const col = isProduces ? JUSTICE_DS.bronze : JUSTICE_DS.navy;
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[9.5px] uppercase tracking-[0.18em]"
      style={{ background: `${col}22`, color: col }}>
      <span>{isProduces ? '↗' : '↘'}</span>{edge.ministry}
    </span>
  );
}

export function FederationStrip() {
  const produces = JUSTICE_FEDERATION.filter(e => e.direction === 'produces');
  const consumes = JUSTICE_FEDERATION.filter(e => e.direction === 'consumes');
  return (
    <div className="grid grid-cols-1 gap-px border lg:grid-cols-2" style={{ background: JUSTICE_DS.rule, borderColor: JUSTICE_DS.rule }}>
      <div className="px-5 py-4" style={{ background: JUSTICE_DS.charcoal }}>
        <div className="font-serif italic text-[9px] uppercase tracking-[0.34em]" style={{ color: JUSTICE_DS.bronze }}>↗ Produces (justice emits)</div>
        <ul className="mt-2 space-y-1.5">
          {produces.map(e => (
            <li key={e.ministry} className="grid grid-cols-[140px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: JUSTICE_DS.mut }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-4" style={{ background: JUSTICE_DS.charcoal }}>
        <div className="font-serif italic text-[9px] uppercase tracking-[0.34em]" style={{ color: JUSTICE_DS.navy }}>↘ Consumes (justice receives)</div>
        <ul className="mt-2 space-y-1.5">
          {consumes.map(e => (
            <li key={e.ministry} className="grid grid-cols-[140px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: JUSTICE_DS.mut }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
