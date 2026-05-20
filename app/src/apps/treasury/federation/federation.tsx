'use client';

// apps/treasury/federation — Treasury federation contract.

import * as React from 'react';
import { TREASURY_DS } from '@/apps/treasury/design-system/treasury-ds';

export interface TreasuryFederationEdge {
  ministry: string;
  contract: string;
  direction: 'produces' | 'consumes';
}

export const TREASURY_FEDERATION: TreasuryFederationEdge[] = [
  // Treasury is the fiscal hub — every ministry consumes from it.
  { ministry: 'Cabinet', contract: 'fiscal posture brief · macro stability · budget execution', direction: 'produces' },
  { ministry: 'All ministries', contract: 'appropriation envelopes · disbursement vouchers · liquidity', direction: 'produces' },
  { ministry: 'Public Wallet', contract: 'CBDC issuance · refunds · entitlement disbursement', direction: 'produces' },
  { ministry: 'Foreign Affairs', contract: 'sanctions exposure · FX reserve position', direction: 'produces' },
  { ministry: 'National Coordination', contract: 'cross-ministry continuity flows', direction: 'produces' },
  // Treasury consumes from the revenue-generating ministries
  { ministry: 'Customs', contract: 'duty collection · clearance receipts', direction: 'consumes' },
  { ministry: 'Trade & Industry', contract: 'commercial activity indicators · sector receipts', direction: 'consumes' },
  { ministry: 'Justice', contract: 'fines & penalties · enforcement receipts', direction: 'consumes' },
  { ministry: 'Labour', contract: 'social-insurance contributions · payroll levy', direction: 'consumes' },
];

export function FederationBadge({ edge }: { edge: TreasuryFederationEdge }) {
  const isProduces = edge.direction === 'produces';
  const col = isProduces ? TREASURY_DS.brass : TREASURY_DS.navy;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[9.5px] uppercase tracking-[0.18em]"
      style={{ background: `${col}22`, color: col }}>
      <span>{isProduces ? '↗' : '↘'}</span>{edge.ministry}
    </span>
  );
}

export function FederationStrip() {
  const produces = TREASURY_FEDERATION.filter(e => e.direction === 'produces');
  const consumes = TREASURY_FEDERATION.filter(e => e.direction === 'consumes');
  return (
    <div className="grid grid-cols-1 gap-px border lg:grid-cols-2"
      style={{ background: TREASURY_DS.rule, borderColor: TREASURY_DS.rule }}>
      <div className="px-5 py-4" style={{ background: TREASURY_DS.inkBlack }}>
        <div className="text-[9px] uppercase tracking-[0.34em]" style={{ color: TREASURY_DS.brass, fontFamily: 'ui-serif, Georgia, serif' }}>↗ Disburses to (treasury emits)</div>
        <ul className="mt-2 space-y-1.5">
          {produces.map(e => (
            <li key={e.ministry} className="grid grid-cols-[160px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-4" style={{ background: TREASURY_DS.inkBlack }}>
        <div className="text-[9px] uppercase tracking-[0.34em]" style={{ color: TREASURY_DS.navy, fontFamily: 'ui-serif, Georgia, serif' }}>↘ Receives from (treasury collects)</div>
        <ul className="mt-2 space-y-1.5">
          {consumes.map(e => (
            <li key={e.ministry} className="grid grid-cols-[160px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
