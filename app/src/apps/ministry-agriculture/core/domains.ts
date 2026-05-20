// apps/ministry-agriculture/core — Agriculture domain registry.
//
// 30+ typed surface ids across 10 groups citing §17.x of the
// CivicOS master blueprint. Layered on top of the existing
// agriculture-systems + agriculture-rural engines.

import type { AgricultureArchetype } from '@/apps/ministry-agriculture/design-system/agriculture-ds';

export type AgricultureGroupKey =
  | 'command' | 'production' | 'water' | 'response'
  | 'governance' | 'subsidy' | 'intelligence' | 'portal' | 'oversight';

export interface AgricultureGroup {
  key: AgricultureGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type AgricultureSurfaceId =
  // command
  | 'food-continuity' | 'food-security-index' | 'strategic-reserve'
  // production
  | 'harvest-production' | 'crop-yield-board' | 'livestock-board' | 'fishery-board'
  // water
  | 'water-climate' | 'irrigation-network' | 'basin-allocation'
  // response
  | 'food-response' | 'pest-emergency' | 'drought-response'
  // governance
  | 'rural-governance' | 'rural-zones' | 'cooperative-board' | 'agricultural-workforce' | 'land-registry'
  // subsidy
  | 'subsidy-programmes' | 'subsidy-applications'
  // intelligence
  | 'agri-intelligence' | 'yield-forecast' | 'trade-exposure' | 'sustainability-horizon' | 'scarcity-watch'
  // portal
  | 'agri-portal' | 'climate-advisories' | 'pest-alerts' | 'irrigation-requests' | 'permit-flow'
  // oversight
  | 'rural-safeguards' | 'smallholder-audit';

export interface AgricultureDomain {
  surface: AgricultureSurfaceId;
  group: AgricultureGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: AgricultureArchetype;
  blueprintSection: string;
}

export const AGRICULTURE_GROUPS: AgricultureGroup[] = [
  { key: 'command',      label: 'Food Continuity',       purpose: 'National food posture & strategic reserve',  blueprintSection: '17.1' },
  { key: 'production',   label: 'Production Field',      purpose: 'Crop, livestock & fishery boards',           blueprintSection: '17.2' },
  { key: 'water',        label: 'Water & Climate',       purpose: 'Irrigation, basin allocation & climate',     blueprintSection: '17.3' },
  { key: 'response',     label: 'Crisis Response',       purpose: 'Food / pest / drought emergency response',   blueprintSection: '17.4' },
  { key: 'governance',   label: 'Rural Governance',      purpose: 'Zones, cooperatives, workforce, land',       blueprintSection: '17.5' },
  { key: 'subsidy',      label: 'Subsidy Programmes',    purpose: 'Programme catalogue & application docket',   blueprintSection: '17.6' },
  { key: 'intelligence', label: 'Agri Intelligence',     purpose: 'Yield forecast, trade, sustainability',      blueprintSection: '17.7' },
  { key: 'portal',       label: 'Public Portal',         purpose: 'Citizen-facing advisories & permits',        blueprintSection: '17.8' },
  { key: 'oversight',    label: 'Sovereign Oversight',   purpose: 'Smallholder & cooperative safeguards',       blueprintSection: '17.9' },
];

export const AGRICULTURE_DOMAINS: AgricultureDomain[] = [
  // command
  { surface: 'food-continuity',       group: 'command',      code: 'CM-FOC-01', label: 'Food Continuity Command',  purpose: 'Top-level food-security command',           archetype: 'command',     blueprintSection: '17.1' },
  { surface: 'food-security-index',   group: 'command',      code: 'CM-FSI-02', label: 'Food Security Index',      purpose: 'National food-security composite',          archetype: 'command',     blueprintSection: '17.1' },
  { surface: 'strategic-reserve',     group: 'command',      code: 'CM-RES-03', label: 'Strategic Reserve',        purpose: 'Strategic grain & commodity reserve',       archetype: 'command',     blueprintSection: '17.1' },
  // production
  { surface: 'harvest-production',    group: 'production',   code: 'PR-HRV-04', label: 'Harvest Production Field', purpose: 'Per-crop yield & regional production',      archetype: 'production',  blueprintSection: '17.2' },
  { surface: 'crop-yield-board',      group: 'production',   code: 'PR-YLD-05', label: 'Crop Yield Board',         purpose: 'Crop yield composite & tone',              archetype: 'production',  blueprintSection: '17.2' },
  { surface: 'livestock-board',       group: 'production',   code: 'PR-LIV-06', label: 'Livestock Board',          purpose: 'Livestock health & disease watch',         archetype: 'production',  blueprintSection: '17.2' },
  { surface: 'fishery-board',         group: 'production',   code: 'PR-FSH-07', label: 'Fishery Board',            purpose: 'Marine & inland fishery posture',          archetype: 'production',  blueprintSection: '17.2' },
  // water
  { surface: 'water-climate',         group: 'water',        code: 'WT-CLM-08', label: 'Water & Climate',          purpose: 'Water infrastructure & climate response',   archetype: 'water',       blueprintSection: '17.3' },
  { surface: 'irrigation-network',    group: 'water',        code: 'WT-IRR-09', label: 'Irrigation Network',       purpose: 'Irrigation scheme coverage',               archetype: 'water',       blueprintSection: '17.3' },
  { surface: 'basin-allocation',      group: 'water',        code: 'WT-BAS-10', label: 'Basin Allocation',         purpose: 'Water-rights & basin sharing',             archetype: 'water',       blueprintSection: '17.3' },
  // response
  { surface: 'food-response',         group: 'response',     code: 'RS-FRS-11', label: 'Food Continuity Response', purpose: 'Crisis response runtime',                  archetype: 'response',    blueprintSection: '17.4' },
  { surface: 'pest-emergency',        group: 'response',     code: 'RS-PST-12', label: 'Pest Emergency',           purpose: 'Outbreak response & containment',          archetype: 'response',    blueprintSection: '17.4' },
  { surface: 'drought-response',      group: 'response',     code: 'RS-DRG-13', label: 'Drought Response',         purpose: 'Drought relief & yield protection',         archetype: 'response',    blueprintSection: '17.4' },
  // governance
  { surface: 'rural-governance',      group: 'governance',   code: 'GV-RUR-14', label: 'Rural Governance',         purpose: 'Rural-stability board',                    archetype: 'governance',  blueprintSection: '17.5' },
  { surface: 'rural-zones',           group: 'governance',   code: 'GV-ZON-15', label: 'Rural Zones',              purpose: 'Zone classification & posture',            archetype: 'governance',  blueprintSection: '17.5' },
  { surface: 'cooperative-board',     group: 'governance',   code: 'GV-COP-16', label: 'Cooperative Board',        purpose: 'Cooperatives & membership',                 archetype: 'governance',  blueprintSection: '17.5' },
  { surface: 'agricultural-workforce',group: 'governance',   code: 'GV-WRK-17', label: 'Agricultural Workforce',   purpose: 'Workforce demographics & training',         archetype: 'governance',  blueprintSection: '17.5' },
  { surface: 'land-registry',         group: 'governance',   code: 'GV-LND-18', label: 'Land Registry',            purpose: 'Land titling & tenancy registry',          archetype: 'governance',  blueprintSection: '17.5' },
  // subsidy
  { surface: 'subsidy-programmes',    group: 'subsidy',      code: 'SB-PRG-19', label: 'Subsidy Programmes',       purpose: 'Programme catalogue & fulfilment',          archetype: 'subsidy',     blueprintSection: '17.6' },
  { surface: 'subsidy-applications',  group: 'subsidy',      code: 'SB-APP-20', label: 'Subsidy Applications',     purpose: 'Application docket',                       archetype: 'subsidy',     blueprintSection: '17.6' },
  // intelligence
  { surface: 'agri-intelligence',     group: 'intelligence', code: 'IN-AGI-21', label: 'Agricultural Intelligence',purpose: 'Forecast & sustainability board',          archetype: 'intelligence',blueprintSection: '17.7' },
  { surface: 'yield-forecast',        group: 'intelligence', code: 'IN-YLD-22', label: 'Yield Forecast',           purpose: '5-year yield trajectory',                  archetype: 'intelligence',blueprintSection: '17.7' },
  { surface: 'trade-exposure',        group: 'intelligence', code: 'IN-TRD-23', label: 'Trade Exposure',           purpose: 'Import / export vulnerability',            archetype: 'intelligence',blueprintSection: '17.7' },
  { surface: 'sustainability-horizon',group: 'intelligence', code: 'IN-SUS-24', label: 'Sustainability Horizon',   purpose: 'Multi-horizon sustainability trajectory',  archetype: 'intelligence',blueprintSection: '17.7' },
  { surface: 'scarcity-watch',        group: 'intelligence', code: 'IN-SCR-25', label: 'Scarcity Watch',           purpose: '90-day scarcity early warning',            archetype: 'intelligence',blueprintSection: '17.7' },
  // portal
  { surface: 'agri-portal',           group: 'portal',       code: 'PR-PRT-26', label: 'Public Agriculture Portal',purpose: 'Citizen portal',                            archetype: 'portal',      blueprintSection: '17.8' },
  { surface: 'climate-advisories',    group: 'portal',       code: 'PR-CLM-27', label: 'Climate Advisories',       purpose: 'Per-region climate advisory feed',         archetype: 'portal',      blueprintSection: '17.8' },
  { surface: 'pest-alerts',           group: 'portal',       code: 'PR-PST-28', label: 'Pest Alerts',              purpose: 'Pest outbreak feed',                       archetype: 'portal',      blueprintSection: '17.8' },
  { surface: 'irrigation-requests',   group: 'portal',       code: 'PR-IRR-29', label: 'Irrigation Requests',      purpose: 'Citizen / cooperative water requests',     archetype: 'portal',      blueprintSection: '17.8' },
  { surface: 'permit-flow',           group: 'portal',       code: 'PR-PMT-30', label: 'Permit Flow',              purpose: 'Permit categories & throughput',            archetype: 'portal',      blueprintSection: '17.8' },
  // oversight
  { surface: 'rural-safeguards',      group: 'oversight',    code: 'OV-SFG-31', label: 'Rural Safeguards',         purpose: 'AGRICULTURE_RURAL_SAFEGUARDS contract',     archetype: 'oversight',   blueprintSection: '17.9' },
  { surface: 'smallholder-audit',     group: 'oversight',    code: 'OV-SMH-32', label: 'Smallholder Audit',        purpose: 'Smallholder protection audit',              archetype: 'oversight',   blueprintSection: '17.9' },
];

const BY_SURFACE = new Map(AGRICULTURE_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: AgricultureSurfaceId | string): AgricultureDomain | undefined {
  return BY_SURFACE.get(surface as AgricultureSurfaceId);
}

export const AGRICULTURE_LEGACY_KEYS: Record<string, AgricultureSurfaceId> = {
  'food-continuity': 'food-continuity',
  'harvest-production': 'harvest-production',
  'water-climate': 'water-climate',
  'food-response': 'food-response',
  'rural-governance': 'rural-governance',
  'agri-intelligence': 'agri-intelligence',
  'agri-portal': 'agri-portal',
};

export function resolveAgricultureSurface(key: string | null | undefined): AgricultureSurfaceId {
  if (!key) return 'food-continuity';
  if (BY_SURFACE.has(key as AgricultureSurfaceId)) return key as AgricultureSurfaceId;
  return AGRICULTURE_LEGACY_KEYS[key] ?? 'food-continuity';
}
