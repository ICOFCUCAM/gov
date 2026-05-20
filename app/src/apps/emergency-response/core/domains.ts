// apps/emergency-response/core — Emergency Management domain registry.
//
// Single source of truth for the National Emergency Operations Centre
// shell: a 30-surface taxonomy across 10 operational groups, each
// citing a §19 blueprint subsection. The shell dispatches by SurfaceId.

import type { EmergencyArchetype } from '@/apps/emergency-response/design-system/emergency-ds';

export type EmergencyGroupKey =
  | 'theatre' | 'mobilisation' | 'rescue' | 'continuity'
  | 'humanitarian' | 'broadcast' | 'recovery' | 'foresight'
  | 'registry' | 'oversight';

export interface EmergencyGroup {
  key: EmergencyGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type EmergencySurfaceId =
  // theatre
  | 'crisis-command' | 'national-command-centre' | 'theatre-board' | 'incident-ledger'
  // mobilisation
  | 'mobilisation-runtime' | 'responder-roster' | 'mutual-aid-board'
  // rescue
  | 'search-and-rescue' | 'fire-suppression' | 'flood-rescue' | 'maritime-rescue' | 'urban-collapse'
  // continuity
  | 'infrastructure-continuity' | 'power-restoration' | 'transport-corridors' | 'water-sanitation'
  // humanitarian
  | 'humanitarian-continuity' | 'shelter-network' | 'displacement-registry' | 'relief-supply'
  // broadcast
  | 'alert-network' | 'sms-cell-broadcast' | 'multilingual-advisories'
  // recovery
  | 'recovery-programmes' | 'reconstruction-bench'
  // foresight
  | 'resilience-foresight' | 'national-risk-board'
  // registry
  | 'asset-registry' | 'training-readiness'
  // oversight
  | 'constitutional-safeguards' | 'after-action-review';

export interface EmergencyDomain {
  surface: EmergencySurfaceId;
  group: EmergencyGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: EmergencyArchetype;
  blueprintSection: string;
}

export const EMERGENCY_GROUPS: EmergencyGroup[] = [
  { key: 'theatre',      label: 'Crisis Theatre',          purpose: 'National command authority & incident ledger',         blueprintSection: '19.1' },
  { key: 'mobilisation', label: 'Mobilisation',            purpose: 'Responder activation & mutual-aid',                    blueprintSection: '19.2' },
  { key: 'rescue',       label: 'Rescue Operations',       purpose: 'Search, fire, flood, maritime & urban-collapse rescue', blueprintSection: '19.2' },
  { key: 'continuity',   label: 'Infrastructure Continuity', purpose: 'Power, transport, water & systemic continuity',      blueprintSection: '19.3' },
  { key: 'humanitarian', label: 'Humanitarian Line',       purpose: 'Shelters, displacement & relief supply',                blueprintSection: '19.4' },
  { key: 'broadcast',    label: 'Crisis Broadcast',        purpose: 'Citizen alerts & multi-lingual advisories',             blueprintSection: '19.5' },
  { key: 'recovery',     label: 'Recovery & Reconstruction', purpose: 'Long-arc rebuild and economic recovery',              blueprintSection: '19.6' },
  { key: 'foresight',    label: 'Strategic Foresight',     purpose: 'National-risk board & resilience trajectory',           blueprintSection: '19.7' },
  { key: 'registry',     label: 'Operational Registry',    purpose: 'Asset inventory & training-readiness',                  blueprintSection: '19.8' },
  { key: 'oversight',    label: 'Sovereign Oversight',     purpose: 'Constitutional safeguards & after-action review',       blueprintSection: '19.9' },
];

export const EMERGENCY_DOMAINS: EmergencyDomain[] = [
  // Theatre
  { surface: 'crisis-command',         group: 'theatre',      code: 'TH-CMD-01', label: 'Crisis Command',              purpose: 'Top-level crisis command surface',           archetype: 'theatre',     blueprintSection: '19.1' },
  { surface: 'national-command-centre',group: 'theatre',      code: 'TH-NCC-02', label: 'National Command Centre',     purpose: 'NEOC live status board',                     archetype: 'theatre',     blueprintSection: '19.1' },
  { surface: 'theatre-board',          group: 'theatre',      code: 'TH-RTH-03', label: 'Regional Theatre Board',      purpose: 'Per-region theatre posture',                 archetype: 'theatre',     blueprintSection: '19.1' },
  { surface: 'incident-ledger',        group: 'theatre',      code: 'TH-INC-04', label: 'Incident Ledger',             purpose: 'Live incident catalogue',                    archetype: 'registry',    blueprintSection: '19.1' },
  // Mobilisation
  { surface: 'mobilisation-runtime',   group: 'mobilisation', code: 'MB-RT-05',  label: 'Mobilisation Runtime',        purpose: 'Live activation pipeline',                   archetype: 'mobilise',    blueprintSection: '19.2' },
  { surface: 'responder-roster',       group: 'mobilisation', code: 'MB-RR-06',  label: 'Responder Roster',            purpose: 'Field, rescue & medical responders',          archetype: 'registry',    blueprintSection: '19.2' },
  { surface: 'mutual-aid-board',       group: 'mobilisation', code: 'MB-MA-07',  label: 'Mutual-Aid Board',            purpose: 'Inter-regional & international aid',          archetype: 'mobilise',    blueprintSection: '19.2' },
  // Rescue
  { surface: 'search-and-rescue',      group: 'rescue',       code: 'RC-SAR-08', label: 'Search & Rescue',             purpose: 'SAR operations & success ratios',             archetype: 'rescue',      blueprintSection: '19.2' },
  { surface: 'fire-suppression',       group: 'rescue',       code: 'RC-FIR-09', label: 'Fire Suppression',            purpose: 'Wildfire & structural fire response',         archetype: 'rescue',      blueprintSection: '19.2' },
  { surface: 'flood-rescue',           group: 'rescue',       code: 'RC-FLD-10', label: 'Flood Rescue',                purpose: 'Swift-water & inundation rescue',             archetype: 'rescue',      blueprintSection: '19.2' },
  { surface: 'maritime-rescue',        group: 'rescue',       code: 'RC-MAR-11', label: 'Maritime Rescue',             purpose: 'Vessel-in-distress coordination',             archetype: 'rescue',      blueprintSection: '19.2' },
  { surface: 'urban-collapse',         group: 'rescue',       code: 'RC-USR-12', label: 'Urban Search & Collapse',     purpose: 'Building-collapse & confined-space rescue',   archetype: 'rescue',      blueprintSection: '19.2' },
  // Continuity
  { surface: 'infrastructure-continuity', group: 'continuity', code: 'CN-INF-13', label: 'Infrastructure Continuity',  purpose: 'Cross-sector survivability index',            archetype: 'continuity',  blueprintSection: '19.3' },
  { surface: 'power-restoration',      group: 'continuity',   code: 'CN-PWR-14', label: 'Power Restoration',           purpose: 'Grid stabilisation & restoration',            archetype: 'continuity',  blueprintSection: '19.3' },
  { surface: 'transport-corridors',    group: 'continuity',   code: 'CN-TRN-15', label: 'Transport Corridors',         purpose: 'Corridor status & relief lanes',              archetype: 'continuity',  blueprintSection: '19.3' },
  { surface: 'water-sanitation',       group: 'continuity',   code: 'CN-WTR-16', label: 'Water & Sanitation',          purpose: 'Drinking water & sanitation continuity',      archetype: 'continuity',  blueprintSection: '19.3' },
  // Humanitarian
  { surface: 'humanitarian-continuity',group: 'humanitarian', code: 'HU-CON-17', label: 'Humanitarian Continuity',     purpose: 'Population assistance overview',              archetype: 'humanitarian',blueprintSection: '19.4' },
  { surface: 'shelter-network',        group: 'humanitarian', code: 'HU-SHL-18', label: 'Shelter Network',             purpose: 'Per-region shelter posture',                  archetype: 'humanitarian',blueprintSection: '19.4' },
  { surface: 'displacement-registry',  group: 'humanitarian', code: 'HU-DSP-19', label: 'Displacement Registry',       purpose: 'Displaced-population register',               archetype: 'registry',    blueprintSection: '19.4' },
  { surface: 'relief-supply',          group: 'humanitarian', code: 'HU-SUP-20', label: 'Relief Supply',               purpose: 'Food / water / NFI logistics',                archetype: 'humanitarian',blueprintSection: '19.4' },
  // Broadcast
  { surface: 'alert-network',          group: 'broadcast',    code: 'BC-ALT-21', label: 'Alert Network',               purpose: 'Crisis alert channel posture',                archetype: 'broadcast',   blueprintSection: '19.5' },
  { surface: 'sms-cell-broadcast',     group: 'broadcast',    code: 'BC-SMS-22', label: 'SMS / Cell Broadcast',        purpose: 'Mass-notification channel',                   archetype: 'broadcast',   blueprintSection: '19.5' },
  { surface: 'multilingual-advisories',group: 'broadcast',    code: 'BC-MLT-23', label: 'Multilingual Advisories',     purpose: 'Inclusive advisory production',               archetype: 'broadcast',   blueprintSection: '19.5' },
  // Recovery
  { surface: 'recovery-programmes',    group: 'recovery',     code: 'RV-PRG-24', label: 'Recovery Programmes',         purpose: 'Active reconstruction programmes',            archetype: 'recovery',    blueprintSection: '19.6' },
  { surface: 'reconstruction-bench',   group: 'recovery',     code: 'RV-BCH-25', label: 'Reconstruction Bench',        purpose: 'Capital-works pipeline',                      archetype: 'recovery',    blueprintSection: '19.6' },
  // Foresight
  { surface: 'resilience-foresight',   group: 'foresight',    code: 'FC-RES-26', label: 'Resilience Foresight',        purpose: 'Multi-horizon resilience trajectory',         archetype: 'forecast',    blueprintSection: '19.7' },
  { surface: 'national-risk-board',    group: 'foresight',    code: 'FC-RSK-27', label: 'National Risk Board',         purpose: 'Sovereign risk register',                     archetype: 'forecast',    blueprintSection: '19.7' },
  // Registry
  { surface: 'asset-registry',         group: 'registry',     code: 'RG-AST-28', label: 'Asset Registry',              purpose: 'Vehicle / aerial / marine inventory',         archetype: 'registry',    blueprintSection: '19.8' },
  { surface: 'training-readiness',     group: 'registry',     code: 'RG-TRN-29', label: 'Training & Readiness',        purpose: 'Drill cadence & certification',               archetype: 'registry',    blueprintSection: '19.8' },
  // Oversight
  { surface: 'constitutional-safeguards', group: 'oversight', code: 'OV-CSF-30', label: 'Constitutional Safeguards',   purpose: 'EMERGENCY_SAFEGUARDS contract',               archetype: 'oversight',   blueprintSection: '19.9' },
  { surface: 'after-action-review',    group: 'oversight',    code: 'OV-AAR-31', label: 'After-Action Review',         purpose: 'Mandatory post-incident learning',            archetype: 'oversight',   blueprintSection: '19.9' },
];

const BY_SURFACE = new Map(EMERGENCY_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: EmergencySurfaceId | string): EmergencyDomain | undefined {
  return BY_SURFACE.get(surface as EmergencySurfaceId);
}

export const EMERGENCY_LEGACY_KEYS: Record<string, EmergencySurfaceId> = {
  command: 'crisis-command',
  dispatch: 'mobilisation-runtime',
  resources: 'asset-registry',
  recovery: 'recovery-programmes',
  'national-command': 'national-command-centre',
  'humanitarian-continuity': 'humanitarian-continuity',
  'alert-network': 'alert-network',
  'resilience-foresight': 'resilience-foresight',
};

export function resolveEmergencySurface(key: string | null | undefined): EmergencySurfaceId {
  if (!key) return 'crisis-command';
  if (BY_SURFACE.has(key as EmergencySurfaceId)) return key as EmergencySurfaceId;
  return EMERGENCY_LEGACY_KEYS[key] ?? 'crisis-command';
}
