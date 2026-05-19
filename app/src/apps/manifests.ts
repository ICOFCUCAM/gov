// Federated institutional application manifests.
//
// Each institution is a sovereign application, not a page. A manifest
// declares the app's federation id, sovereign domain route, kind, the
// archetype/branch it operationalises and its navigation. Ministry apps
// derive nav from the blueprint factory so navigation is generated, not
// hardcoded. Pure.

import type { ArchetypeKey } from '@/lib/api/types';
import { blueprintFor } from '@/lib/institution/blueprint';
import { interiorNav } from '@/apps/ministry-interior/core/domains';
import type { AppManifest } from '@/services/orchestration-engine';

const ARCHETYPE_APP: Partial<Record<ArchetypeKey, { id: string; label: string; domain: string }>> = {
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

/** Build the federated app manifest for a provisioned ministry instance. */
export function ministryAppManifest(m: { id: string; name: string; archetype: ArchetypeKey }): AppManifest {
  const meta = ARCHETYPE_APP[m.archetype] ?? ARCHETYPE_APP.GENERIC!;
  return {
    id: meta.id,
    label: m.name,
    domain: meta.domain,
    kind: 'ministry',
    archetypeOrBranch: m.archetype,
    instanceId: m.id,
    // Interior is a Tier-1 sovereign shell with its own normalized domain
    // navigation framework; other ministries derive nav from the blueprint.
    nav: m.archetype === 'INTERIOR'
      ? interiorNav()
      : blueprintFor(m.archetype).map(g => ({ key: g.key, label: g.name })),
  };
}

// Constitutional branches & standing sovereign agencies are fixed apps.
export const BRANCH_APPS: AppManifest[] = [
  {
    id: 'judiciary', label: 'Judiciary', domain: 'judiciary', kind: 'branch', archetypeOrBranch: 'judiciary',
    nav: [
      { key: 'live', label: 'Live judiciary' }, { key: 'courts', label: 'Court systems' },
      { key: 'cases', label: 'Case management' }, { key: 'constitutional', label: 'Constitutional review' },
      { key: 'appeals', label: 'Appeals' }, { key: 'prosecution', label: 'Prosecution liaison' },
      { key: 'corrections', label: 'Corrections integration' },
    ],
  },
  {
    id: 'legislature', label: 'Legislature', domain: 'parliament', kind: 'branch', archetypeOrBranch: 'legislature',
    nav: [
      { key: 'live', label: 'Live legislature' }, { key: 'chambers', label: 'Chambers' },
      { key: 'committees', label: 'Committees' }, { key: 'bills', label: 'Bill pipeline' },
      { key: 'voting', label: 'Voting systems' }, { key: 'appropriation', label: 'Appropriation' },
      { key: 'oversight', label: 'Oversight' },
    ],
  },
];

export const AGENCY_APPS: AppManifest[] = [
  { id: 'police-command', label: 'Police Command', domain: 'police', kind: 'agency', archetypeOrBranch: 'INTERIOR',
    nav: [{ key: 'incident', label: 'Incident command' }, { key: 'dispatch', label: 'Dispatch' }, { key: 'patrol', label: 'Patrol coordination' }, { key: 'investigations', label: 'Investigations' }, { key: 'evidence', label: 'Evidence' }, { key: 'intelligence', label: 'Intelligence' }, { key: 'cyber', label: 'Cybercrime' }] },
  { id: 'emergency-response', label: 'Emergency Response', domain: 'emergency', kind: 'agency', archetypeOrBranch: 'INTERIOR',
    nav: [{ key: 'command', label: 'Crisis command' }, { key: 'dispatch', label: 'Dispatch' }, { key: 'resources', label: 'Resource coordination' }, { key: 'recovery', label: 'Recovery workflows' }] },
  { id: 'immigration', label: 'Immigration', domain: 'immigration', kind: 'agency', archetypeOrBranch: 'INTERIOR',
    nav: [{ key: 'border', label: 'Border control' }, { key: 'permits', label: 'Visas & permits' }, { key: 'registry', label: 'Resident registry' }, { key: 'enforcement', label: 'Enforcement' }] },
  { id: 'customs', label: 'Customs', domain: 'customs', kind: 'agency', archetypeOrBranch: 'TRADE',
    nav: [{ key: 'clearance', label: 'Clearance' }, { key: 'tariffs', label: 'Tariffs & duties' }, { key: 'inspection', label: 'Inspection' }, { key: 'revenue', label: 'Revenue' }] },
  { id: 'citizen-wallet', label: 'Citizen Wallet', domain: 'citizen', kind: 'citizen',
    archetypeOrBranch: 'GENERIC', nav: [{ key: 'identity', label: 'Identity' }, { key: 'services', label: 'Services' }, { key: 'payments', label: 'Payments' }] },
  { id: 'officer-console', label: 'Officer Console', domain: 'officer', kind: 'officer',
    archetypeOrBranch: 'GENERIC', nav: [{ key: 'queue', label: 'Work queue' }, { key: 'decisions', label: 'Decisions' }, { key: 'review', label: 'Review' }] },
];

export const STANDING_APPS: AppManifest[] = [...BRANCH_APPS, ...AGENCY_APPS];
