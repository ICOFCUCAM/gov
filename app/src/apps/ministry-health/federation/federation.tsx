'use client';

// apps/ministry-health/federation — Health federation contract.

import * as React from 'react';
import { HEALTH_DS } from '@/apps/ministry-health/design-system/health-ds';

export interface HealthFederationEdge {
  ministry: string;
  contract: string;
  direction: 'produces' | 'consumes';
}

export const HEALTH_FEDERATION: HealthFederationEdge[] = [
  // Health produces — events flowing out
  { ministry: 'Interior',    contract: 'mass-casualty alerts · death registrations · break-glass audit logs', direction: 'produces' },
  { ministry: 'Emergency',   contract: 'capacity for casualty surge · ambulance dispatch coordination', direction: 'produces' },
  { ministry: 'Cabinet',     contract: 'national health posture · outbreak intelligence brief', direction: 'produces' },
  { ministry: 'Justice',     contract: 'medico-legal reports · custodial-death investigations', direction: 'produces' },
  { ministry: 'Treasury',    contract: 'claims adjudications · procurement spend · NHIS run-rate', direction: 'produces' },
  // Health consumes
  { ministry: 'Environment', contract: 'air-quality data · vector-borne disease forecasts · climate-mobility risk', direction: 'consumes' },
  { ministry: 'Interior',    contract: 'civil-registry identifiers · birth & death events', direction: 'consumes' },
  { ministry: 'Treasury',    contract: 'appropriation envelope · NHIS funding · procurement disbursements', direction: 'consumes' },
  { ministry: 'Foreign Affairs', contract: 'international health regulations · cross-border outbreak notices', direction: 'consumes' },
];

export function FederationBadge({ edge }: { edge: HealthFederationEdge }) {
  const isProduces = edge.direction === 'produces';
  const col = isProduces ? HEALTH_DS.vital : HEALTH_DS.sterile;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[9.5px] uppercase tracking-[0.18em]"
      style={{ background: `${col}22`, color: col, fontFamily: 'ui-monospace, monospace' }}>
      <span>{isProduces ? '↗' : '↘'}</span>{edge.ministry}
    </span>
  );
}

export function FederationStrip() {
  const produces = HEALTH_FEDERATION.filter(e => e.direction === 'produces');
  const consumes = HEALTH_FEDERATION.filter(e => e.direction === 'consumes');
  return (
    <div className="grid grid-cols-1 gap-px border lg:grid-cols-2"
      style={{ background: HEALTH_DS.rule, borderColor: HEALTH_DS.rule }}>
      <div className="px-5 py-4" style={{ background: HEALTH_DS.ward }}>
        <div className="text-[9px] uppercase tracking-[0.34em]" style={{ color: HEALTH_DS.vital }}>↗ Reports to (health emits)</div>
        <ul className="mt-2 space-y-1.5">
          {produces.map(e => (
            <li key={e.ministry} className="grid grid-cols-[140px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: HEALTH_DS.mut }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-5 py-4" style={{ background: HEALTH_DS.ward }}>
        <div className="text-[9px] uppercase tracking-[0.34em]" style={{ color: HEALTH_DS.sterile }}>↘ Receives from (health consumes)</div>
        <ul className="mt-2 space-y-1.5">
          {consumes.map(e => (
            <li key={e.ministry} className="grid grid-cols-[140px_1fr] gap-2 text-[10.5px]">
              <FederationBadge edge={e} />
              <span className="italic" style={{ color: HEALTH_DS.mut }}>{e.contract}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
