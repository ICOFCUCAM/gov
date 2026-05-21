// lib/gov/citizen-portal-engine.ts
//
// Sovereign Citizen Super-Portal engine. Pure & deterministic.
// The Citizen Super-Portal is the single citizen-facing surface that
// orchestrates every ministry's citizen-touching service in one wallet:
// identity, benefits, health, education, taxation, justice, civic life.

import { seed, wave } from '@/lib/telemetry';

export const CITIZEN_PORTAL_SAFEGUARDS = {
  citizenOwnedIdentity: true as const,
  consentBoundDataSharing: true as const,
  noBehavioralProfiling: true as const,
  noServiceDenialFromScore: true as const,
  appealableEveryDecision: true as const,
  prohibited: [
    'state-scored-citizen-rating',
    'denial-of-service-by-profile',
    'opaque-identity-revocation',
    'silent-data-sharing-across-ministries',
    'biometric-coercion',
    'civic-credit-systems',
    'cross-ministry-tracking-without-consent',
  ] as const,
};

export type CitizenServiceDomain =
  | 'identity' | 'health' | 'education' | 'welfare' | 'taxation' | 'justice'
  | 'civic' | 'permits' | 'transport' | 'energy' | 'environment' | 'foreign'
  | 'business' | 'records' | 'voting';

export interface CitizenService {
  domain: CitizenServiceDomain;
  ministry: string;
  name: string;
  status: 'available' | 'in-progress' | 'completed' | 'awaiting-action' | 'denied-appealable';
  latencyMs: number;
  successPct: number;
}

export interface CitizenInbox {
  count: number;
  fromMinistry: string;
  kind: 'notice' | 'reminder' | 'decision' | 'appeal-response' | 'civic';
  unread: number;
}

export interface CitizenPortalBoard {
  epoch: number;
  enrolledM: number;
  identityVerifiedPct: number;
  meanLatencyMs: number;
  servicesUptimePct: number;
  appealsOpen: number;
  servicesByDomain: CitizenService[];
  inbox: CitizenInbox[];
  prohibited: readonly string[];
}

export function citizenPortalBoard(now: number): CitizenPortalBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const domains: { d: CitizenServiceDomain; ministry: string; name: string }[] = [
    { d: 'identity',    ministry: 'Interior',         name: 'Sovereign Identity' },
    { d: 'health',      ministry: 'Health',           name: 'Health Wallet' },
    { d: 'education',   ministry: 'Education',        name: 'Learner Twin' },
    { d: 'welfare',     ministry: 'Labour',           name: 'Welfare & Benefits' },
    { d: 'taxation',    ministry: 'Treasury',         name: 'Taxation & Payments' },
    { d: 'justice',     ministry: 'Justice',          name: 'Civic Justice' },
    { d: 'civic',       ministry: 'Assembly',         name: 'Civic Voice & Petitions' },
    { d: 'permits',     ministry: 'Interior',         name: 'Permits & Licences' },
    { d: 'transport',   ministry: 'Transport',        name: 'Mobility Wallet' },
    { d: 'energy',      ministry: 'Energy',           name: 'Energy Account' },
    { d: 'environment', ministry: 'Environment',      name: 'Environmental Reports' },
    { d: 'foreign',     ministry: 'Foreign Affairs',  name: 'Consular Services' },
    { d: 'business',    ministry: 'Trade',            name: 'Business Registry' },
    { d: 'records',     ministry: 'Justice',          name: 'Personal Records' },
    { d: 'voting',      ministry: 'Assembly',         name: 'Voter Wallet' },
  ];
  const statuses: CitizenService['status'][] = ['available', 'in-progress', 'completed', 'awaiting-action', 'available', 'available'];
  const servicesByDomain: CitizenService[] = domains.map((x, i) => ({
    domain: x.d,
    ministry: x.ministry,
    name: x.name,
    status: statuses[Math.floor(seed(`csv:${i}:${Math.floor(ts / 6)}`) * statuses.length)]!,
    latencyMs: Math.round(wave(`csl:${i}`, ts, 80, 460)),
    successPct: Math.round(wave(`css:${i}`, ts, 92, 99.6) * 10) / 10,
  }));
  const inbox: CitizenInbox[] = [
    { count: 12, fromMinistry: 'Treasury',        kind: 'reminder',         unread: 3 },
    { count: 4,  fromMinistry: 'Health',          kind: 'notice',           unread: 1 },
    { count: 2,  fromMinistry: 'Justice',         kind: 'decision',         unread: 1 },
    { count: 7,  fromMinistry: 'Assembly',        kind: 'civic',            unread: 2 },
    { count: 1,  fromMinistry: 'Interior',        kind: 'appeal-response',  unread: 1 },
  ];
  return {
    epoch,
    enrolledM: Math.round(wave('cp:e', ts, 38, 52) * 10) / 10,
    identityVerifiedPct: Math.round(wave('cp:i', ts, 88, 98)),
    meanLatencyMs: Math.round(wave('cp:l', ts, 120, 280)),
    servicesUptimePct: Math.round(wave('cp:u', ts, 99.2, 99.97) * 100) / 100,
    appealsOpen: Math.round(wave('cp:a', ts, 240, 1800)),
    servicesByDomain,
    inbox,
    prohibited: CITIZEN_PORTAL_SAFEGUARDS.prohibited,
  };
}
