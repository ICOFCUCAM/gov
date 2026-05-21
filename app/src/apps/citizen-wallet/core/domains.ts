// apps/citizen-portal/core — Citizen Super-Portal domain registry.

import type { PortalArchetype } from '@/apps/citizen-wallet/design-system/portal-ds';

export type PortalGroupKey =
  | 'wallet' | 'identity' | 'health' | 'education' | 'welfare'
  | 'taxation' | 'justice' | 'civic' | 'permits' | 'records' | 'safeguards';

export interface PortalGroup {
  key: PortalGroupKey;
  label: string;
  purpose: string;
}

export type PortalSurfaceId =
  | 'wallet-home' | 'unified-inbox' | 'services-directory' | 'consents-ledger'
  | 'sovereign-identity' | 'identity-verification' | 'biometric-doctrine'
  | 'health-wallet' | 'health-records' | 'appointments'
  | 'learner-twin' | 'credentials-portfolio'
  | 'welfare-benefits' | 'unemployment-account'
  | 'tax-account' | 'payments-history' | 'tax-filing'
  | 'civic-justice' | 'case-tracker' | 'appeal-centre'
  | 'civic-voice' | 'petitions-wallet' | 'public-consultations'
  | 'permits-licences' | 'business-registry'
  | 'personal-records' | 'mobility-wallet' | 'energy-account'
  | 'consular-services' | 'voter-wallet'
  | 'citizen-safeguards' | 'data-doctrine' | 'appeal-doctrine';

export interface PortalDomain {
  surface: PortalSurfaceId;
  group: PortalGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: PortalArchetype;
}

export const PORTAL_GROUPS: PortalGroup[] = [
  { key: 'wallet',     label: 'Wallet',           purpose: 'Home & unified inbox' },
  { key: 'identity',   label: 'Identity',         purpose: 'Sovereign identity & consent' },
  { key: 'health',     label: 'Health',           purpose: 'Health wallet & records' },
  { key: 'education',  label: 'Education',        purpose: 'Learner twin & credentials' },
  { key: 'welfare',    label: 'Welfare',          purpose: 'Benefits & unemployment' },
  { key: 'taxation',   label: 'Taxation',         purpose: 'Tax filing & payments' },
  { key: 'justice',    label: 'Justice',          purpose: 'Civic justice & appeals' },
  { key: 'civic',      label: 'Civic Voice',      purpose: 'Petitions & consultations' },
  { key: 'permits',    label: 'Permits',          purpose: 'Permits, licences, business' },
  { key: 'records',    label: 'Records',          purpose: 'Mobility, energy, consular, voting' },
  { key: 'safeguards', label: 'Safeguards',       purpose: 'Citizen constitutional safeguards' },
];

export const PORTAL_DOMAINS: PortalDomain[] = [
  { surface: 'wallet-home',          group: 'wallet',     code: 'CW-HOM-01', label: 'Wallet Home',           purpose: 'Citizen wallet overview',     archetype: 'wallet' },
  { surface: 'unified-inbox',        group: 'wallet',     code: 'CW-INB-02', label: 'Unified Inbox',         purpose: 'All ministries · one inbox',  archetype: 'wallet' },
  { surface: 'services-directory',   group: 'wallet',     code: 'CW-SVC-03', label: 'Services Directory',    purpose: 'All citizen services',        archetype: 'wallet' },
  { surface: 'consents-ledger',      group: 'wallet',     code: 'CW-CNS-04', label: 'Consents Ledger',       purpose: 'What the state may see',      archetype: 'wallet' },
  { surface: 'sovereign-identity',   group: 'identity',   code: 'ID-SOV-05', label: 'Sovereign Identity',    purpose: 'Citizen-owned identity',      archetype: 'identity' },
  { surface: 'identity-verification',group: 'identity',   code: 'ID-VER-06', label: 'Identity Verification', purpose: 'Verification pipeline',       archetype: 'identity' },
  { surface: 'biometric-doctrine',   group: 'identity',   code: 'ID-BIO-07', label: 'Biometric Doctrine',    purpose: 'Coercion-free biometrics',     archetype: 'identity' },
  { surface: 'health-wallet',        group: 'health',     code: 'HW-WAL-08', label: 'Health Wallet',         purpose: 'Personal health overview',     archetype: 'health' },
  { surface: 'health-records',       group: 'health',     code: 'HW-REC-09', label: 'Health Records',        purpose: 'Citizen-owned EHR',           archetype: 'health' },
  { surface: 'appointments',         group: 'health',     code: 'HW-APP-10', label: 'Appointments',          purpose: 'Health appointments',         archetype: 'health' },
  { surface: 'learner-twin',         group: 'education',  code: 'ED-LRN-11', label: 'Learner Twin',          purpose: 'Federated learning companion', archetype: 'education' },
  { surface: 'credentials-portfolio',group: 'education',  code: 'ED-CRD-12', label: 'Credentials Portfolio', purpose: 'Verifiable qualifications',   archetype: 'education' },
  { surface: 'welfare-benefits',     group: 'welfare',    code: 'WB-BEN-13', label: 'Welfare & Benefits',    purpose: 'Active benefit programmes',    archetype: 'welfare' },
  { surface: 'unemployment-account', group: 'welfare',    code: 'WB-UEM-14', label: 'Unemployment Account',  purpose: 'Unemployment & retraining',    archetype: 'welfare' },
  { surface: 'tax-account',          group: 'taxation',   code: 'TX-ACC-15', label: 'Tax Account',           purpose: 'Personal tax account',        archetype: 'taxation' },
  { surface: 'payments-history',     group: 'taxation',   code: 'TX-PAY-16', label: 'Payments History',      purpose: 'Tax payments & ledger',       archetype: 'taxation' },
  { surface: 'tax-filing',           group: 'taxation',   code: 'TX-FIL-17', label: 'Tax Filing',            purpose: 'Filing pipeline',             archetype: 'taxation' },
  { surface: 'civic-justice',        group: 'justice',    code: 'JT-CVC-18', label: 'Civic Justice',         purpose: 'Open justice for citizens',    archetype: 'justice' },
  { surface: 'case-tracker',         group: 'justice',    code: 'JT-CAS-19', label: 'Case Tracker',          purpose: 'Personal case progress',       archetype: 'justice' },
  { surface: 'appeal-centre',        group: 'justice',    code: 'JT-APP-20', label: 'Appeal Centre',         purpose: 'Appeal every decision',       archetype: 'justice' },
  { surface: 'civic-voice',          group: 'civic',      code: 'CV-VOC-21', label: 'Civic Voice',           purpose: 'Open civic participation',     archetype: 'civic' },
  { surface: 'petitions-wallet',     group: 'civic',      code: 'CV-PET-22', label: 'Petitions Wallet',      purpose: 'File & track petitions',       archetype: 'civic' },
  { surface: 'public-consultations', group: 'civic',      code: 'CV-CNS-23', label: 'Public Consultations',  purpose: 'Active consultations',         archetype: 'civic' },
  { surface: 'permits-licences',     group: 'permits',    code: 'PR-LIC-24', label: 'Permits & Licences',    purpose: 'Citizen permits & licences',   archetype: 'permits' },
  { surface: 'business-registry',    group: 'permits',    code: 'PR-BIZ-25', label: 'Business Registry',     purpose: 'Personal business affairs',    archetype: 'business' },
  { surface: 'personal-records',     group: 'records',    code: 'RC-PER-26', label: 'Personal Records',      purpose: 'All sovereign records',        archetype: 'records' },
  { surface: 'mobility-wallet',      group: 'records',    code: 'RC-MOB-27', label: 'Mobility Wallet',       purpose: 'Mobility & travel records',    archetype: 'mobility' },
  { surface: 'energy-account',       group: 'records',    code: 'RC-ENG-28', label: 'Energy Account',        purpose: 'Energy account & usage',       archetype: 'records' },
  { surface: 'consular-services',    group: 'records',    code: 'RC-CON-29', label: 'Consular Services',     purpose: 'Diaspora & travel',           archetype: 'foreign' },
  { surface: 'voter-wallet',         group: 'records',    code: 'RC-VOT-30', label: 'Voter Wallet',          purpose: 'Voter status & elections',     archetype: 'voting' },
  { surface: 'citizen-safeguards',   group: 'safeguards', code: 'SF-CIT-31', label: 'Citizen Safeguards',    purpose: 'CITIZEN_PORTAL_SAFEGUARDS',    archetype: 'safeguards' },
  { surface: 'data-doctrine',        group: 'safeguards', code: 'SF-DAT-32', label: 'Data Doctrine',         purpose: 'Cross-ministry data doctrine', archetype: 'safeguards' },
  { surface: 'appeal-doctrine',      group: 'safeguards', code: 'SF-APP-33', label: 'Appeal Doctrine',       purpose: 'Universal right of appeal',    archetype: 'safeguards' },
];

const BY_SURFACE = new Map(PORTAL_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: PortalSurfaceId | string): PortalDomain | undefined {
  return BY_SURFACE.get(surface as PortalSurfaceId);
}

export const PORTAL_LEGACY_KEYS: Record<string, PortalSurfaceId> = {
  home: 'wallet-home',
  inbox: 'unified-inbox',
  services: 'services-directory',
  identity: 'sovereign-identity',
  health: 'health-wallet',
  education: 'learner-twin',
  welfare: 'welfare-benefits',
  tax: 'tax-account',
  justice: 'civic-justice',
  civic: 'civic-voice',
  permits: 'permits-licences',
  records: 'personal-records',
  safeguards: 'citizen-safeguards',
};

export function resolvePortalSurface(key: string | null | undefined): PortalSurfaceId {
  if (!key) return 'wallet-home';
  if (BY_SURFACE.has(key as PortalSurfaceId)) return key as PortalSurfaceId;
  return PORTAL_LEGACY_KEYS[key] ?? 'wallet-home';
}

export function portalNav(): { key: string; label: string }[] {
  return PORTAL_GROUPS.map(g => ({ key: PORTAL_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
