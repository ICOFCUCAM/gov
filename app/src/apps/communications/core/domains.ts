// apps/communications/core — Communications domain registry.
//
// 30 typed surface ids across 10 groups citing §30/§37/§46.

import type { CommsArchetype } from '@/apps/communications/design-system/communications-ds';

export type CommsGroupKey =
  | 'command' | 'infrastructure' | 'cloud' | 'cyber'
  | 'broadcast' | 'identity' | 'spectrum' | 'intelligence' | 'portal' | 'oversight';

export interface CommsGroup {
  key: CommsGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type CommsSurfaceId =
  // command
  | 'connectivity-command' | 'connectivity-posture' | 'regional-connectivity'
  // infrastructure
  | 'network-assets' | 'fiber-trunks' | 'mobile-towers' | 'submarine-cables'
  // cloud
  | 'sovereign-cloud' | 'data-centers' | 'routing-health'
  // cyber
  | 'cyber-resilience' | 'cyber-incidents' | 'soc-operations' | 'threat-intelligence'
  // broadcast
  | 'emergency-broadcast' | 'failover-channels' | 'broadcast-stations'
  // identity
  | 'digital-identity' | 'authentication-board' | 'credential-recovery'
  // spectrum
  | 'identity-spectrum' | 'spectrum-bands' | 'media-landscape' | 'press-independence'
  // intelligence
  | 'foresight-portal' | 'demand-forecast' | 'signal-anomalies'
  // portal
  | 'service-requests' | 'public-advisories'
  // oversight
  | 'communications-safeguards' | 'press-independence-audit';

export interface CommsDomain {
  surface: CommsSurfaceId;
  group: CommsGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: CommsArchetype;
  blueprintSection: string;
}

export const COMMS_GROUPS: CommsGroup[] = [
  { key: 'command',        label: 'Connectivity Command',  purpose: 'National connectivity command',         blueprintSection: '37.1' },
  { key: 'infrastructure', label: 'Network Infrastructure',purpose: 'Towers, fiber, cable, satellite',       blueprintSection: '37.2' },
  { key: 'cloud',          label: 'Sovereign Cloud',       purpose: 'Data centres & routing',                 blueprintSection: '37.3' },
  { key: 'cyber',          label: 'Cyber Defence',         purpose: 'Cyber-incident & SOC',                   blueprintSection: '30.1' },
  { key: 'broadcast',      label: 'Emergency Broadcast',   purpose: 'Citizen alerting',                       blueprintSection: '46.1' },
  { key: 'identity',       label: 'Digital Identity',      purpose: 'Authentication & credentials',           blueprintSection: '37.4' },
  { key: 'spectrum',       label: 'Spectrum & Media',      purpose: 'Spectrum bands & media',                 blueprintSection: '37.5' },
  { key: 'intelligence',   label: 'Comms Intelligence',    purpose: 'Foresight & anomalies',                  blueprintSection: '37.6' },
  { key: 'portal',         label: 'Citizen Portal',        purpose: 'Service requests & advisories',          blueprintSection: '37.7' },
  { key: 'oversight',      label: 'Sovereign Oversight',   purpose: 'Safeguards & press independence',        blueprintSection: '37.8' },
];

export const COMMS_DOMAINS: CommsDomain[] = [
  // command
  { surface: 'connectivity-command',      group: 'command',        code: 'CM-CMD-01', label: 'National Connectivity Command', purpose: 'Top-level command',                  archetype: 'command',        blueprintSection: '37.1' },
  { surface: 'connectivity-posture',      group: 'command',        code: 'CM-PST-02', label: 'Connectivity Posture',          purpose: 'National uptime & integrity',         archetype: 'command',        blueprintSection: '37.1' },
  { surface: 'regional-connectivity',     group: 'command',        code: 'CM-RGN-03', label: 'Regional Connectivity',         purpose: 'Per-region connectivity',             archetype: 'command',        blueprintSection: '37.1' },
  // infrastructure
  { surface: 'network-assets',            group: 'infrastructure', code: 'IF-AST-04', label: 'Network Asset Register',        purpose: 'All-network register',                archetype: 'infrastructure', blueprintSection: '37.2' },
  { surface: 'fiber-trunks',              group: 'infrastructure', code: 'IF-FBR-05', label: 'Fiber Trunks',                  purpose: 'Fiber trunk health',                  archetype: 'infrastructure', blueprintSection: '37.2' },
  { surface: 'mobile-towers',             group: 'infrastructure', code: 'IF-MBL-06', label: 'Mobile Tower Fleet',            purpose: 'Mobile tower utilisation',            archetype: 'infrastructure', blueprintSection: '37.2' },
  { surface: 'submarine-cables',          group: 'infrastructure', code: 'IF-SUB-07', label: 'Submarine Cables',              purpose: 'International cable status',          archetype: 'infrastructure', blueprintSection: '37.2' },
  // cloud
  { surface: 'sovereign-cloud',           group: 'cloud',          code: 'CL-SVR-08', label: 'Sovereign Cloud',               purpose: 'National cloud capacity board',       archetype: 'cloud',          blueprintSection: '37.3' },
  { surface: 'data-centers',              group: 'cloud',          code: 'CL-DTC-09', label: 'Data Centers',                  purpose: 'Per-facility capacity',               archetype: 'cloud',          blueprintSection: '37.3' },
  { surface: 'routing-health',            group: 'cloud',          code: 'CL-RTG-10', label: 'Routing Health',                purpose: 'BGP, DNS, CDN routing',               archetype: 'cloud',          blueprintSection: '37.3' },
  // cyber
  { surface: 'cyber-resilience',          group: 'cyber',          code: 'CY-RES-11', label: 'Cyber Resilience',              purpose: 'Top-level cyber posture',             archetype: 'cyber',          blueprintSection: '30.1' },
  { surface: 'cyber-incidents',           group: 'cyber',          code: 'CY-INC-12', label: 'Cyber Incident Ledger',         purpose: 'Live incident ledger',                archetype: 'cyber',          blueprintSection: '30.1' },
  { surface: 'soc-operations',            group: 'cyber',          code: 'CY-SOC-13', label: 'SOC Operations',                purpose: 'SOC analyst posture',                 archetype: 'cyber',          blueprintSection: '30.1' },
  { surface: 'threat-intelligence',       group: 'cyber',          code: 'CY-THI-14', label: 'Threat Intelligence',           purpose: 'Attribution & detection',             archetype: 'cyber',          blueprintSection: '30.1' },
  // broadcast
  { surface: 'emergency-broadcast',       group: 'broadcast',      code: 'BC-EMG-15', label: 'Emergency Broadcast',           purpose: 'Citizen alert channels',              archetype: 'broadcast',      blueprintSection: '46.1' },
  { surface: 'failover-channels',         group: 'broadcast',      code: 'BC-FOC-16', label: 'Failover Channels',             purpose: 'Channel failover readiness',          archetype: 'broadcast',      blueprintSection: '46.1' },
  { surface: 'broadcast-stations',        group: 'broadcast',      code: 'BC-STN-17', label: 'Broadcast Stations',            purpose: 'TV / radio / siren stations',         archetype: 'broadcast',      blueprintSection: '46.1' },
  // identity
  { surface: 'digital-identity',          group: 'identity',       code: 'ID-DIG-18', label: 'Digital Identity Programme',    purpose: 'CivicID programme posture',           archetype: 'identity',       blueprintSection: '37.4' },
  { surface: 'authentication-board',      group: 'identity',       code: 'ID-AUT-19', label: 'Authentication Board',          purpose: 'Daily auth success rate',             archetype: 'identity',       blueprintSection: '37.4' },
  { surface: 'credential-recovery',       group: 'identity',       code: 'ID-REC-20', label: 'Credential Recovery',           purpose: 'Recovery request queue',              archetype: 'identity',       blueprintSection: '37.4' },
  // spectrum
  { surface: 'identity-spectrum',         group: 'spectrum',       code: 'SP-IDS-21', label: 'Identity · Spectrum · Media',   purpose: 'Combined identity & spectrum board',   archetype: 'spectrum',       blueprintSection: '37.5' },
  { surface: 'spectrum-bands',            group: 'spectrum',       code: 'SP-BND-22', label: 'Spectrum Bands',                purpose: 'Per-band allocation & utilisation',   archetype: 'spectrum',       blueprintSection: '37.5' },
  { surface: 'media-landscape',           group: 'spectrum',       code: 'SP-MED-23', label: 'Media Landscape',               purpose: 'Broadcaster register',                archetype: 'spectrum',       blueprintSection: '37.5' },
  { surface: 'press-independence',        group: 'spectrum',       code: 'SP-PRS-24', label: 'Press Independence Board',      purpose: 'Press-independence index',            archetype: 'spectrum',       blueprintSection: '37.5' },
  // intelligence
  { surface: 'foresight-portal',          group: 'intelligence',   code: 'IN-FRS-25', label: 'Foresight Portal',              purpose: 'Long-horizon foresight & portal',     archetype: 'intelligence',   blueprintSection: '37.6' },
  { surface: 'demand-forecast',           group: 'intelligence',   code: 'IN-DMD-26', label: 'Demand Forecast',               purpose: '25y demand trajectory',               archetype: 'intelligence',   blueprintSection: '37.6' },
  { surface: 'signal-anomalies',          group: 'intelligence',   code: 'IN-ANM-27', label: 'Signal Anomalies',              purpose: 'Per-domain anomaly feed',             archetype: 'intelligence',   blueprintSection: '37.6' },
  // portal
  { surface: 'service-requests',          group: 'portal',         code: 'PR-REQ-28', label: 'Citizen Service Requests',      purpose: 'Service request docket',              archetype: 'portal',         blueprintSection: '37.7' },
  { surface: 'public-advisories',         group: 'portal',         code: 'PR-ADV-29', label: 'Public Advisories',             purpose: 'Advisory feed',                       archetype: 'portal',         blueprintSection: '37.7' },
  // oversight
  { surface: 'communications-safeguards', group: 'oversight',      code: 'OV-SFG-30', label: 'Communications Safeguards',     purpose: 'COMMUNICATIONS_SAFEGUARDS contract',  archetype: 'oversight',      blueprintSection: '37.8' },
  { surface: 'press-independence-audit',  group: 'oversight',      code: 'OV-PRS-31', label: 'Press Independence Audit',      purpose: 'Press / spectrum / network audit',    archetype: 'oversight',      blueprintSection: '37.8' },
];

const BY_SURFACE = new Map(COMMS_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: CommsSurfaceId | string): CommsDomain | undefined {
  return BY_SURFACE.get(surface as CommsSurfaceId);
}

export const COMMS_LEGACY_KEYS: Record<string, CommsSurfaceId> = {
  'connectivity-command': 'connectivity-command',
  'cyber-resilience': 'cyber-resilience',
  'identity-spectrum': 'identity-spectrum',
  'foresight-portal': 'foresight-portal',
};

export function resolveCommsSurface(key: string | null | undefined): CommsSurfaceId {
  if (!key) return 'connectivity-command';
  if (BY_SURFACE.has(key as CommsSurfaceId)) return key as CommsSurfaceId;
  return COMMS_LEGACY_KEYS[key] ?? 'connectivity-command';
}
