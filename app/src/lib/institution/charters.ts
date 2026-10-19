// The institutions' charter identities: one federation id (charter), label,
// sovereign domain, kind and archetype per institution. Pure data, shared by
// the app manifests (src/apps/manifests.ts, which add each app's navigation)
// and the server that mirrors the registry to the substrate's
// civicos.institutions (lib/db/mirror.ts, architecture review D8).

import type { ArchetypeKey } from '@/lib/api/types';

export type CharterKind = 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';
export interface CharterIdentity {
  id: string;
  label: string;
  domain: string;
  kind: CharterKind;
  archetypeOrBranch: string;
}

/** The charter each ministry archetype operates under (several ministries of one archetype share it). */
export const MINISTRY_CHARTERS: Partial<Record<ArchetypeKey, { id: string; label: string; domain: string }>> = {
  HEALTH: { id: 'ministry-health', label: 'Ministry of Health', domain: 'health' },
  EDUCATION: { id: 'ministry-education', label: 'Ministry of Education', domain: 'education' },
  TRANSPORT: { id: 'ministry-transport', label: 'Ministry of Transport', domain: 'transport' },
  ENERGY: { id: 'ministry-energy', label: 'Ministry of Energy', domain: 'energy' },
  FINANCE: { id: 'ministry-finance', label: 'Treasury & Finance', domain: 'treasury' },
  AGRICULTURE: { id: 'ministry-agriculture', label: 'Ministry of Agriculture', domain: 'agriculture' },
  JUSTICE: { id: 'ministry-justice', label: 'Ministry of Justice', domain: 'justice' },
  ENVIRONMENT: { id: 'ministry-environment', label: 'Ministry of Environment', domain: 'environment' },
  INTERIOR: { id: 'ministry-interior', label: 'Ministry of Interior', domain: 'interior' },
  LABOR: { id: 'ministry-labor', label: 'Ministry of Labour', domain: 'labour' },
  TRADE: { id: 'ministry-trade', label: 'Ministry of Trade & Industry', domain: 'trade' },
  GENERIC: { id: 'ministry-generic', label: 'Institution', domain: 'institution' },
};

/** A provisioned ministry's charter row: its archetype's charter, under the ministry's own name. */
export function ministryCharter(m: { name: string; archetype: ArchetypeKey }): CharterIdentity {
  const meta = MINISTRY_CHARTERS[m.archetype] ?? MINISTRY_CHARTERS.GENERIC!;
  return { id: meta.id, label: m.name, domain: meta.domain, kind: 'ministry', archetypeOrBranch: m.archetype };
}

/** Constitutional branches. */
export const BRANCH_CHARTERS: CharterIdentity[] = [
  { id: 'presidency', label: 'Presidency · Cabinet Office', domain: 'presidency', kind: 'branch', archetypeOrBranch: 'GENERIC' },
  { id: 'judiciary', label: 'Judicial Branch', domain: 'judiciary', kind: 'branch', archetypeOrBranch: 'judiciary' },
  { id: 'senate', label: 'Senate', domain: 'senate', kind: 'branch', archetypeOrBranch: 'legislature' },
  { id: 'assembly', label: 'National Assembly', domain: 'assembly', kind: 'branch', archetypeOrBranch: 'legislature' },
];

/** Agencies and the citizen and officer apps. */
export const AGENCY_CHARTERS: CharterIdentity[] = [
  { id: 'police-command', label: 'Police Command', domain: 'police', kind: 'agency', archetypeOrBranch: 'INTERIOR' },
  { id: 'emergency-response', label: 'Emergency Response', domain: 'emergency', kind: 'agency', archetypeOrBranch: 'INTERIOR' },
  { id: 'immigration', label: 'Immigration', domain: 'immigration', kind: 'agency', archetypeOrBranch: 'INTERIOR' },
  { id: 'customs', label: 'Customs', domain: 'customs', kind: 'agency', archetypeOrBranch: 'TRADE' },
  { id: 'communications', label: 'Communications & Digital Infrastructure', domain: 'communications', kind: 'agency', archetypeOrBranch: 'GENERIC' },
  { id: 'foreign-affairs', label: 'Foreign Affairs & Geopolitical Relations', domain: 'foreign', kind: 'agency', archetypeOrBranch: 'GENERIC' },
  { id: 'citizen-wallet', label: 'Citizen Super-Portal', domain: 'citizen', kind: 'citizen', archetypeOrBranch: 'GENERIC' },
  { id: 'noc', label: 'National Operations Centre', domain: 'noc', kind: 'agency', archetypeOrBranch: 'GENERIC' },
  { id: 'officer-console', label: 'Officer Console', domain: 'officer', kind: 'officer', archetypeOrBranch: 'GENERIC' },
];

/** Every standing (always present, always active) institution. */
export const STANDING_CHARTERS: CharterIdentity[] = [...BRANCH_CHARTERS, ...AGENCY_CHARTERS];

/** One standing charter by id (throws for an unknown id: a manifest must name a real one). */
export function standingCharter(id: string): CharterIdentity {
  const c = STANDING_CHARTERS.find(x => x.id === id);
  if (!c) throw new Error(`No standing charter ${id}`);
  return c;
}
