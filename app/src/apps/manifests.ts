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
import { policeNav } from '@/apps/police-command/core/domains';
import { senateNav } from '@/apps/senate/core/domains';
import { assemblyNav } from '@/apps/assembly/core/domains';
import { judicialNav } from '@/apps/judicial-branch/core/domains';
import { presidencyNav } from '@/apps/presidency/core/domains';
import { portalNav } from '@/apps/citizen-wallet/core/domains';
import { nocNav } from '@/apps/noc/core/domains';
import type { AppManifest } from '@/services/orchestration-engine';
// Charter identities (id, label, domain, kind, archetype) live in one place,
// shared with the server that mirrors the registry to the substrate.
import { ministryCharter, standingCharter } from '@/lib/institution/charters';

/** Build the federated app manifest for a provisioned ministry instance. */
export function ministryAppManifest(m: { id: string; name: string; archetype: ArchetypeKey }): AppManifest {
  return {
    ...ministryCharter(m),
    instanceId: m.id,
    // Interior is a Tier-1 sovereign shell with its own normalized domain
    // navigation framework; other ministries derive nav from the blueprint.
    nav: m.archetype === 'INTERIOR'
      ? interiorNav()
      : blueprintFor(m.archetype).map(g => ({ key: g.key, label: g.name })),
  };
}

// Constitutional branches as sovereign reference-tier operational apps.
export const BRANCH_APPS: AppManifest[] = [
  { ...standingCharter('presidency'),
    nav: presidencyNav(),
  },
  { ...standingCharter('judiciary'),
    nav: judicialNav(),
  },
  { ...standingCharter('senate'),
    nav: senateNav(),
  },
  { ...standingCharter('assembly'),
    nav: assemblyNav(),
  },
];

export const AGENCY_APPS: AppManifest[] = [
  { ...standingCharter('police-command'),
    nav: policeNav() },
  { ...standingCharter('emergency-response'),
    nav: [
      { key: 'command', label: 'Crisis command' },
      { key: 'dispatch', label: 'Dispatch' },
      { key: 'resources', label: 'Resource coordination' },
      { key: 'recovery', label: 'Recovery workflows' },
      { key: 'national-command', label: 'National Emergency Command' },
      { key: 'humanitarian-continuity', label: 'Humanitarian Continuity' },
      { key: 'alert-network', label: 'Crisis Communications' },
      { key: 'resilience-foresight', label: 'Resilience & Foresight' },
    ] },
  { ...standingCharter('immigration'),
    nav: [{ key: 'border', label: 'Border control' }, { key: 'permits', label: 'Visas & permits' }, { key: 'registry', label: 'Resident registry' }, { key: 'enforcement', label: 'Enforcement' }] },
  { ...standingCharter('customs'),
    nav: [{ key: 'clearance', label: 'Clearance' }, { key: 'tariffs', label: 'Tariffs & duties' }, { key: 'inspection', label: 'Inspection' }, { key: 'revenue', label: 'Revenue' }] },
  { ...standingCharter('communications'),
    nav: [
      { key: 'connectivity-command', label: 'National Connectivity Command' },
      { key: 'cyber-resilience', label: 'Cybersecurity & Resilience' },
      { key: 'identity-spectrum', label: 'Digital Identity & Spectrum' },
      { key: 'foresight-portal', label: 'Forecast & Public Portal' },
    ] },
  { ...standingCharter('foreign-affairs'),
    nav: [
      { key: 'geopolitical-command', label: 'Geopolitical Command' },
      { key: 'diplomatic-missions', label: 'Diplomatic Missions' },
      { key: 'treaties-alliances', label: 'Treaties & Alliances' },
      { key: 'crisis-foresight', label: 'Crisis & Foresight' },
      { key: 'intelligence-systems', label: 'Intelligence Systems' },
      { key: 'law-sovereignty', label: 'International Law & Sovereignty' },
      { key: 'citizen-portal', label: 'Citizen Foreign Services' },
    ] },
  { ...standingCharter('citizen-wallet'), nav: portalNav() },
  { ...standingCharter('noc'), nav: nocNav() },
  { ...standingCharter('officer-console'), nav: [{ key: 'queue', label: 'Work queue' }, { key: 'decisions', label: 'Decisions' }, { key: 'review', label: 'Review' }] },
];

export const STANDING_APPS: AppManifest[] = [...BRANCH_APPS, ...AGENCY_APPS];
