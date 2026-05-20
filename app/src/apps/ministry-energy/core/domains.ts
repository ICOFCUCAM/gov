// apps/ministry-energy/core — Energy domain registry.
//
// 30 typed surface ids across 10 groups citing §21.x of the
// CivicOS master blueprint. Layered on top of the existing
// energy-systems + energy-grid + energy-extended engines.

import type { EnergyArchetype } from '@/apps/ministry-energy/design-system/energy-ds';

export type EnergyGroupKey =
  | 'command' | 'generation' | 'transmission' | 'demand'
  | 'reserve' | 'emergency' | 'intelligence' | 'portal' | 'continuity' | 'oversight';

export interface EnergyGroup {
  key: EnergyGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type EnergySurfaceId =
  // command
  | 'grid-theater' | 'posture-board' | 'frequency-board'
  // generation
  | 'generation-reserves' | 'renewable-fleet' | 'baseload-fleet' | 'generation-mix'
  // transmission
  | 'transmission-infra' | 'corridor-board' | 'transformer-health'
  // demand
  | 'industrial-allocation' | 'load-shed-doctrine' | 'peak-demand-forecast'
  // reserve
  | 'strategic-reserve' | 'fuel-stockpile' | 'battery-stack'
  // emergency
  | 'emergency-recovery' | 'blackout-ledger' | 'restoration-crews' | 'critical-services-backup'
  // intelligence
  | 'intel-foresight' | 'demand-trajectory' | 'climate-energy-risk' | 'cascading-failure' | 'geopolitical-exposure'
  // portal
  | 'public-portal' | 'outage-reports' | 'energy-permits' | 'renewable-requests' | 'energy-advisories'
  // continuity
  | 'energy-continuity'
  // oversight
  | 'energy-safeguards' | 'equity-audit';

export interface EnergyDomain {
  surface: EnergySurfaceId;
  group: EnergyGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: EnergyArchetype;
  blueprintSection: string;
}

export const ENERGY_GROUPS: EnergyGroup[] = [
  { key: 'command',      label: 'Grid Command',         purpose: 'National grid command & frequency stability', blueprintSection: '21.1' },
  { key: 'generation',   label: 'Generation Fleet',     purpose: 'Generation mix & renewable fleet',            blueprintSection: '21.2' },
  { key: 'transmission', label: 'Transmission',         purpose: 'Corridors, transformers & infrastructure',    blueprintSection: '21.3' },
  { key: 'demand',       label: 'Demand Lane',          purpose: 'Industrial allocation & load-shed doctrine',  blueprintSection: '21.4' },
  { key: 'reserve',      label: 'Strategic Reserve',    purpose: 'Fuel, battery & emergency reserves',          blueprintSection: '21.5' },
  { key: 'emergency',    label: 'Emergency Operations', purpose: 'Blackout, restoration & critical backup',     blueprintSection: '21.6' },
  { key: 'intelligence', label: 'Grid Intelligence',    purpose: '25-y demand, climate & cascading-risk',       blueprintSection: '21.7' },
  { key: 'portal',       label: 'Public Energy',        purpose: 'Citizen portal, outages, permits',            blueprintSection: '21.8' },
  { key: 'continuity',   label: 'Continuity',           purpose: 'Industrial continuity board',                 blueprintSection: '21.9' },
  { key: 'oversight',    label: 'Sovereign Oversight',  purpose: 'Equitable load-shed & blackout transparency', blueprintSection: '21.10' },
];

export const ENERGY_DOMAINS: EnergyDomain[] = [
  // command
  { surface: 'grid-theater',         group: 'command',      code: 'CM-GRD-01', label: 'National Grid Theater',     purpose: 'Top-level grid command surface',        archetype: 'command',     blueprintSection: '21.1' },
  { surface: 'posture-board',        group: 'command',      code: 'CM-PST-02', label: 'Grid Posture Board',        purpose: 'Per-region posture & stress zones',     archetype: 'command',     blueprintSection: '21.1' },
  { surface: 'frequency-board',      group: 'command',      code: 'CM-FRQ-03', label: 'Frequency Stability',       purpose: 'Frequency, reserve margin & blackout %', archetype: 'command',     blueprintSection: '21.1' },
  // generation
  { surface: 'generation-reserves',  group: 'generation',   code: 'GN-GRS-04', label: 'Generation & Reserves',     purpose: 'Generation operations & reserves',      archetype: 'generation',  blueprintSection: '21.2' },
  { surface: 'renewable-fleet',      group: 'generation',   code: 'GN-RNW-05', label: 'Renewable Fleet',           purpose: 'Solar, wind & small-hydro output',      archetype: 'generation',  blueprintSection: '21.2' },
  { surface: 'baseload-fleet',       group: 'generation',   code: 'GN-BLD-06', label: 'Baseload Fleet',            purpose: 'Hydro, gas, nuclear output',            archetype: 'generation',  blueprintSection: '21.2' },
  { surface: 'generation-mix',       group: 'generation',   code: 'GN-MIX-07', label: 'Generation Mix',            purpose: 'National output composition',            archetype: 'generation',  blueprintSection: '21.2' },
  // transmission
  { surface: 'transmission-infra',   group: 'transmission', code: 'TR-INF-08', label: 'Transmission Infrastructure', purpose: 'Corridor & transformer infra',         archetype: 'transmission',blueprintSection: '21.3' },
  { surface: 'corridor-board',       group: 'transmission', code: 'TR-COR-09', label: 'Corridor Board',            purpose: 'Per-corridor utilisation & faults',     archetype: 'transmission',blueprintSection: '21.3' },
  { surface: 'transformer-health',   group: 'transmission', code: 'TR-TFM-10', label: 'Transformer Health',        purpose: 'Substation transformer health',         archetype: 'transmission',blueprintSection: '21.3' },
  // demand
  { surface: 'industrial-allocation',group: 'demand',       code: 'DM-IND-11', label: 'Industrial Allocation',     purpose: 'Industrial continuity & allocation',    archetype: 'demand',      blueprintSection: '21.4' },
  { surface: 'load-shed-doctrine',   group: 'demand',       code: 'DM-LSH-12', label: 'Load-Shed Doctrine',        purpose: 'Equitable load-shedding doctrine',      archetype: 'demand',      blueprintSection: '21.4' },
  { surface: 'peak-demand-forecast', group: 'demand',       code: 'DM-PKF-13', label: 'Peak Demand Forecast',      purpose: 'Short-horizon peak forecast',           archetype: 'demand',      blueprintSection: '21.4' },
  // reserve
  { surface: 'strategic-reserve',    group: 'reserve',      code: 'RS-STR-14', label: 'Strategic Reserve',         purpose: 'Multi-fuel strategic reserve',          archetype: 'reserve',     blueprintSection: '21.5' },
  { surface: 'fuel-stockpile',       group: 'reserve',      code: 'RS-FUE-15', label: 'Fuel Stockpile',            purpose: 'Diesel / NG / coal stockpile',          archetype: 'reserve',     blueprintSection: '21.5' },
  { surface: 'battery-stack',        group: 'reserve',      code: 'RS-BAT-16', label: 'Battery Stack',             purpose: 'National battery storage',              archetype: 'reserve',     blueprintSection: '21.5' },
  // emergency
  { surface: 'emergency-recovery',   group: 'emergency',    code: 'EM-REC-17', label: 'Emergency Recovery',        purpose: 'Blackout recovery operations',          archetype: 'emergency',   blueprintSection: '21.6' },
  { surface: 'blackout-ledger',      group: 'emergency',    code: 'EM-BLK-18', label: 'Blackout Ledger',           purpose: 'Live blackout incident ledger',         archetype: 'emergency',   blueprintSection: '21.6' },
  { surface: 'restoration-crews',    group: 'emergency',    code: 'EM-CRW-19', label: 'Restoration Crews',         purpose: 'Crew deployment & status',              archetype: 'emergency',   blueprintSection: '21.6' },
  { surface: 'critical-services-backup', group: 'emergency',code: 'EM-CRS-20', label: 'Critical Services Backup',  purpose: 'Hospital / water / data-centre backup', archetype: 'emergency',   blueprintSection: '21.6' },
  // intelligence
  { surface: 'intel-foresight',      group: 'intelligence', code: 'IN-FRS-21', label: 'Energy Intelligence Foresight', purpose: 'Long-horizon foresight',           archetype: 'intelligence',blueprintSection: '21.7' },
  { surface: 'demand-trajectory',    group: 'intelligence', code: 'IN-DMD-22', label: 'Demand Trajectory',         purpose: '25y demand & carbon trajectory',        archetype: 'intelligence',blueprintSection: '21.7' },
  { surface: 'climate-energy-risk',  group: 'intelligence', code: 'IN-CER-23', label: 'Climate-Energy Risk',       purpose: 'Climate hazard / grid composite',       archetype: 'intelligence',blueprintSection: '21.7' },
  { surface: 'cascading-failure',    group: 'intelligence', code: 'IN-CSC-24', label: 'Cascading Failure Scenarios', purpose: 'Cascading-failure scenarios',         archetype: 'intelligence',blueprintSection: '21.7' },
  { surface: 'geopolitical-exposure',group: 'intelligence', code: 'IN-GEO-25', label: 'Geopolitical Energy Exposure', purpose: 'Import-dependency exposure',         archetype: 'intelligence',blueprintSection: '21.7' },
  // portal
  { surface: 'public-portal',        group: 'portal',       code: 'PR-PRT-26', label: 'Public Energy Portal',      purpose: 'Citizen-facing portal',                 archetype: 'portal',      blueprintSection: '21.8' },
  { surface: 'outage-reports',       group: 'portal',       code: 'PR-OUT-27', label: 'Outage Reports',            purpose: 'Citizen outage reports',                archetype: 'portal',      blueprintSection: '21.8' },
  { surface: 'energy-permits',       group: 'portal',       code: 'PR-PMT-28', label: 'Energy Permits',            purpose: 'Rooftop, EV, microgrid permits',        archetype: 'portal',      blueprintSection: '21.8' },
  { surface: 'renewable-requests',   group: 'portal',       code: 'PR-RNW-29', label: 'Renewable Integration',     purpose: 'Renewable integration requests',        archetype: 'portal',      blueprintSection: '21.8' },
  { surface: 'energy-advisories',    group: 'portal',       code: 'PR-ADV-30', label: 'Energy Advisories',         purpose: 'Public advisory feed',                  archetype: 'portal',      blueprintSection: '21.8' },
  // continuity
  { surface: 'energy-continuity',    group: 'continuity',   code: 'CN-CNT-31', label: 'Energy Continuity',         purpose: 'Industrial continuity board',           archetype: 'demand',      blueprintSection: '21.9' },
  // oversight
  { surface: 'energy-safeguards',    group: 'oversight',    code: 'OV-SFG-32', label: 'Energy Safeguards',         purpose: 'ENERGY_EXTENDED_SAFEGUARDS contract',   archetype: 'oversight',   blueprintSection: '21.10' },
  { surface: 'equity-audit',         group: 'oversight',    code: 'OV-EQT-33', label: 'Equity Audit',              purpose: 'Equitable load-shed audit',             archetype: 'oversight',   blueprintSection: '21.10' },
];

const BY_SURFACE = new Map(ENERGY_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: EnergySurfaceId | string): EnergyDomain | undefined {
  return BY_SURFACE.get(surface as EnergySurfaceId);
}

export const ENERGY_LEGACY_KEYS: Record<string, EnergySurfaceId> = {
  command: 'grid-theater',
  generation: 'generation-reserves',
  grid: 'transmission-infra',
  access: 'energy-continuity',
  fuel: 'strategic-reserve',
  citizen: 'public-portal',
  'grid-theater': 'grid-theater',
  'generation-reserves': 'generation-reserves',
  'transmission-infra': 'transmission-infra',
  'energy-continuity': 'energy-continuity',
  'emergency-recovery': 'emergency-recovery',
  'intel-foresight': 'intel-foresight',
  'public-portal': 'public-portal',
};

export function resolveEnergySurface(key: string | null | undefined): EnergySurfaceId {
  if (!key) return 'grid-theater';
  if (BY_SURFACE.has(key as EnergySurfaceId)) return key as EnergySurfaceId;
  return ENERGY_LEGACY_KEYS[key] ?? 'grid-theater';
}
