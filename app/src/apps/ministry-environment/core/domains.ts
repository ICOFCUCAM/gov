// apps/ministry-environment/core — Environment domain registry.
//
// 30 typed surface ids across 10 groups citing §25.x of the
// CivicOS master blueprint. Layered on top of the existing
// climate-resilience + environmental-governance + territorial
// engines.

import type { EnvironmentArchetype } from '@/apps/ministry-environment/design-system/environment-ds';

export type EnvironmentGroupKey =
  | 'biome' | 'ecosystem' | 'atmosphere' | 'hydrosphere'
  | 'pollution' | 'incident' | 'forecast' | 'registry'
  | 'portal' | 'oversight';

export interface EnvironmentGroup {
  key: EnvironmentGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type EnvironmentSurfaceId =
  // biome
  | 'planetary-resilience' | 'ecoregion-stress' | 'biome-command'
  // ecosystem
  | 'biosphere-restoration' | 'protected-regions' | 'species-conservation'
  // atmosphere
  | 'atmospheric-hydrology' | 'air-quality-board' | 'weather-event-feed'
  // hydrosphere
  | 'river-basins' | 'oceanic-readout' | 'water-allocation'
  // pollution
  | 'pollution-register' | 'emissions-target' | 'compliance-bench'
  // incident
  | 'climate-incident-ledger' | 'wildfire-response' | 'flood-response' | 'drought-response'
  // forecast
  | 'ecological-foresight' | 'planetary-trajectory' | 'intergenerational-continuity'
  // registry
  | 'resource-governance' | 'forestry-register' | 'extraction-permits' | 'land-protection'
  // portal
  | 'environment-portal' | 'citizen-reports' | 'public-advisories' | 'energy-ecological'
  // oversight
  | 'climate-safeguards' | 'intergenerational-audit';

export interface EnvironmentDomain {
  surface: EnvironmentSurfaceId;
  group: EnvironmentGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: EnvironmentArchetype;
  blueprintSection: string;
}

export const ENVIRONMENT_GROUPS: EnvironmentGroup[] = [
  { key: 'biome',       label: 'Biome Command',         purpose: 'Climate posture & ecoregion stress',         blueprintSection: '25.1' },
  { key: 'ecosystem',   label: 'Ecosystem Continuity',  purpose: 'Biosphere, protected regions, species',      blueprintSection: '25.2' },
  { key: 'atmosphere',  label: 'Atmospheric Systems',   purpose: 'Air quality, weather, anomaly detection',    blueprintSection: '25.3' },
  { key: 'hydrosphere', label: 'Hydrosphere',           purpose: 'River basins, oceans, water allocation',     blueprintSection: '25.4' },
  { key: 'pollution',   label: 'Pollution & Compliance',purpose: 'Emissions, compliance, enforcement',         blueprintSection: '25.5' },
  { key: 'incident',    label: 'Climate Incidents',     purpose: 'Active incident ledger & response',          blueprintSection: '25.6' },
  { key: 'forecast',    label: 'Planetary Foresight',   purpose: 'Multi-horizon climate trajectory',           blueprintSection: '25.7' },
  { key: 'registry',    label: 'Resource Registry',     purpose: 'Permits, forestry, land, extraction',        blueprintSection: '25.8' },
  { key: 'portal',      label: 'Public Environment',    purpose: 'Citizen-facing reporting & advisories',      blueprintSection: '25.9' },
  { key: 'oversight',   label: 'Sovereign Oversight',   purpose: 'Climate safeguards & intergenerational audit', blueprintSection: '25.10' },
];

export const ENVIRONMENT_DOMAINS: EnvironmentDomain[] = [
  // biome
  { surface: 'planetary-resilience',    group: 'biome',       code: 'BM-PLT-01', label: 'Planetary Resilience',         purpose: 'National climate command surface',         archetype: 'biome',       blueprintSection: '25.1' },
  { surface: 'ecoregion-stress',        group: 'biome',       code: 'BM-ECO-02', label: 'Ecoregion Stress Board',       purpose: 'Per-ecoregion stress composite',           archetype: 'biome',       blueprintSection: '25.1' },
  { surface: 'biome-command',           group: 'biome',       code: 'BM-CMD-03', label: 'Biome Command',                purpose: 'Live readiness & continuity index',         archetype: 'biome',       blueprintSection: '25.1' },
  // ecosystem
  { surface: 'biosphere-restoration',   group: 'ecosystem',   code: 'EC-BSP-04', label: 'Biosphere Restoration',        purpose: 'Forest cover & biodiversity',              archetype: 'ecosystem',   blueprintSection: '25.2' },
  { surface: 'protected-regions',       group: 'ecosystem',   code: 'EC-PRR-05', label: 'Protected Regions',            purpose: 'Per-region integrity & rangers',           archetype: 'ecosystem',   blueprintSection: '25.2' },
  { surface: 'species-conservation',    group: 'ecosystem',   code: 'EC-SPC-06', label: 'Species Conservation',         purpose: 'Endangered species register',              archetype: 'ecosystem',   blueprintSection: '25.2' },
  // atmosphere
  { surface: 'atmospheric-hydrology',   group: 'atmosphere',  code: 'AT-HYD-07', label: 'Atmospheric Hydrology',        purpose: 'Atmospheric & hydrological systems',        archetype: 'atmosphere',  blueprintSection: '25.3' },
  { surface: 'air-quality-board',       group: 'atmosphere',  code: 'AT-AIR-08', label: 'Air Quality Board',            purpose: 'AQI, anomalies & monitoring',              archetype: 'atmosphere',  blueprintSection: '25.3' },
  { surface: 'weather-event-feed',      group: 'atmosphere',  code: 'AT-WEA-09', label: 'Weather Event Feed',           purpose: 'Live weather event posture',                archetype: 'atmosphere',  blueprintSection: '25.3' },
  // hydrosphere
  { surface: 'river-basins',            group: 'hydrosphere', code: 'HY-RIV-10', label: 'River Basins',                 purpose: 'Basin flow & contamination',                archetype: 'hydrosphere', blueprintSection: '25.4' },
  { surface: 'oceanic-readout',         group: 'hydrosphere', code: 'HY-OCN-11', label: 'Oceanic Readout',              purpose: 'Coastal resilience & marine ecosystem',     archetype: 'hydrosphere', blueprintSection: '25.4' },
  { surface: 'water-allocation',        group: 'hydrosphere', code: 'HY-ALL-12', label: 'Water Allocation',             purpose: 'Allocation budget & ecological reserve',    archetype: 'hydrosphere', blueprintSection: '25.4' },
  // pollution
  { surface: 'pollution-register',      group: 'pollution',   code: 'PL-REG-13', label: 'Pollution Register',           purpose: 'Air / water / hazmat violations',          archetype: 'pollution',   blueprintSection: '25.5' },
  { surface: 'emissions-target',        group: 'pollution',   code: 'PL-EMI-14', label: 'Emissions vs Target',          purpose: 'Sector emissions vs national target',       archetype: 'pollution',   blueprintSection: '25.5' },
  { surface: 'compliance-bench',        group: 'pollution',   code: 'PL-CMP-15', label: 'Compliance Bench',             purpose: 'Top-emitter compliance index',             archetype: 'pollution',   blueprintSection: '25.5' },
  // incident
  { surface: 'climate-incident-ledger', group: 'incident',    code: 'IN-LED-16', label: 'Climate Incident Ledger',      purpose: 'Live climate incident catalogue',          archetype: 'incident',    blueprintSection: '25.6' },
  { surface: 'wildfire-response',       group: 'incident',    code: 'IN-WFR-17', label: 'Wildfire Response',            purpose: 'Wildfire posture & containment',           archetype: 'incident',    blueprintSection: '25.6' },
  { surface: 'flood-response',          group: 'incident',    code: 'IN-FLD-18', label: 'Flood Response',               purpose: 'Flood posture & evacuation',                archetype: 'incident',    blueprintSection: '25.6' },
  { surface: 'drought-response',        group: 'incident',    code: 'IN-DRG-19', label: 'Drought Response',             purpose: 'Drought severity & relief',                archetype: 'incident',    blueprintSection: '25.6' },
  // forecast
  { surface: 'ecological-foresight',    group: 'forecast',    code: 'FC-ECO-20', label: 'Ecological Foresight',         purpose: 'Multi-horizon ecological trajectory',       archetype: 'forecast',    blueprintSection: '25.7' },
  { surface: 'planetary-trajectory',    group: 'forecast',    code: 'FC-PLN-21', label: 'Planetary Trajectory',         purpose: 'Temperature, biodiversity, water arc',      archetype: 'forecast',    blueprintSection: '25.7' },
  { surface: 'intergenerational-continuity', group: 'forecast', code: 'FC-INT-22', label: 'Intergenerational Continuity', purpose: 'Long-horizon stewardship index',         archetype: 'forecast',    blueprintSection: '25.7' },
  // registry
  { surface: 'resource-governance',     group: 'registry',    code: 'RG-RES-23', label: 'Resource Governance',          purpose: 'National resource governance',              archetype: 'registry',    blueprintSection: '25.8' },
  { surface: 'forestry-register',       group: 'registry',    code: 'RG-FOR-24', label: 'Forestry Register',            purpose: 'Forestry posture by region',                archetype: 'registry',    blueprintSection: '25.8' },
  { surface: 'extraction-permits',      group: 'registry',    code: 'RG-EXP-25', label: 'Extraction Permits',           purpose: 'Extraction permit register',                archetype: 'registry',    blueprintSection: '25.8' },
  { surface: 'land-protection',         group: 'registry',    code: 'RG-LND-26', label: 'Land Protection',              purpose: 'Protected land category register',          archetype: 'registry',    blueprintSection: '25.8' },
  // portal
  { surface: 'environment-portal',      group: 'portal',      code: 'PR-PRT-27', label: 'Public Environment Portal',    purpose: 'Citizen portal',                            archetype: 'portal',      blueprintSection: '25.9' },
  { surface: 'citizen-reports',         group: 'portal',      code: 'PR-RPT-28', label: 'Citizen Reports',              purpose: 'Citizen incident reports',                  archetype: 'portal',      blueprintSection: '25.9' },
  { surface: 'public-advisories',       group: 'portal',      code: 'PR-ADV-29', label: 'Public Advisories',            purpose: 'Advisory & warning broadcast',              archetype: 'portal',      blueprintSection: '25.9' },
  { surface: 'energy-ecological',       group: 'portal',      code: 'PR-EEC-30', label: 'Energy ↔ Ecology Coupling',    purpose: 'Energy / ecology interdependency',          archetype: 'pollution',   blueprintSection: '25.9' },
  // oversight
  { surface: 'climate-safeguards',      group: 'oversight',   code: 'OV-CSF-31', label: 'Climate Safeguards',           purpose: 'CLIMATE_RESILIENCE_SAFEGUARDS contract',    archetype: 'oversight',   blueprintSection: '25.10' },
  { surface: 'intergenerational-audit', group: 'oversight',   code: 'OV-INT-32', label: 'Intergenerational Audit',      purpose: 'Stewardship audit & non-exploit doctrine',  archetype: 'oversight',   blueprintSection: '25.10' },
];

const BY_SURFACE = new Map(ENVIRONMENT_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: EnvironmentSurfaceId | string): EnvironmentDomain | undefined {
  return BY_SURFACE.get(surface as EnvironmentSurfaceId);
}

export const ENVIRONMENT_LEGACY_KEYS: Record<string, EnvironmentSurfaceId> = {
  monitoring: 'air-quality-board',
  protected: 'protected-regions',
  permit: 'extraction-permits',
  climate: 'planetary-resilience',
  'planetary-resilience': 'planetary-resilience',
  'biosphere-restoration': 'biosphere-restoration',
  'atmospheric-hydrology': 'atmospheric-hydrology',
  'ecological-foresight': 'ecological-foresight',
  'resource-governance': 'resource-governance',
  'energy-ecological': 'energy-ecological',
  'environment-portal': 'environment-portal',
};

export function resolveEnvironmentSurface(key: string | null | undefined): EnvironmentSurfaceId {
  if (!key) return 'planetary-resilience';
  if (BY_SURFACE.has(key as EnvironmentSurfaceId)) return key as EnvironmentSurfaceId;
  return ENVIRONMENT_LEGACY_KEYS[key] ?? 'planetary-resilience';
}
