// apps/ministry-transport/core — Transport domain registry.
//
// 30+ typed surface ids across 11 groups citing §16.x. Layered on
// the transport-systems + transport-network + transport-extended
// engines.

import type { TransportArchetype } from '@/apps/ministry-transport/design-system/transport-ds';

export type TransportGroupKey =
  | 'mobility' | 'corridor' | 'maritime' | 'rail' | 'aviation'
  | 'logistics' | 'infrastructure' | 'emergency'
  | 'intelligence' | 'portal' | 'oversight';

export interface TransportGroup {
  key: TransportGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type TransportSurfaceId =
  // mobility
  | 'mobility-theater' | 'mobility-posture' | 'national-throughput'
  // corridor
  | 'corridor-board' | 'regional-congestion' | 'emergency-corridors'
  // maritime
  | 'port-network' | 'maritime-risk'
  // rail
  | 'rail-network' | 'rail-disruption'
  // aviation
  | 'air-hubs' | 'airspace-strain'
  // logistics
  | 'logistics-network' | 'cargo-lanes' | 'warehouse-cover'
  // infrastructure
  | 'infrastructure-assets' | 'bridge-tunnel-health'
  // emergency
  | 'emergency-recovery' | 'infrastructure-failures' | 'repair-crews' | 'evacuation-corridors'
  // intelligence
  | 'mobility-foresight' | 'demand-forecast' | 'climate-mobility-risk' | 'freight-bottlenecks' | 'mobility-anomalies'
  // portal
  | 'public-portal' | 'transit-schedules' | 'transport-permits' | 'logistics-requests' | 'mobility-advisories'
  // continuity
  | 'transport-continuity' | 'multi-modal'
  // oversight
  | 'transport-safeguards' | 'equitable-mobility-audit';

export interface TransportDomain {
  surface: TransportSurfaceId;
  group: TransportGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: TransportArchetype;
  blueprintSection: string;
}

export const TRANSPORT_GROUPS: TransportGroup[] = [
  { key: 'mobility',       label: 'Mobility Command',       purpose: 'National mobility theatre',                blueprintSection: '16.1' },
  { key: 'corridor',       label: 'Corridor Flow',          purpose: 'Corridor utilisation & congestion',         blueprintSection: '16.2' },
  { key: 'maritime',       label: 'Maritime Lane',          purpose: 'Ports & maritime continuity',               blueprintSection: '16.3' },
  { key: 'rail',           label: 'Rail Network',           purpose: 'Rail corridors & disruption',               blueprintSection: '16.4' },
  { key: 'aviation',       label: 'Airspace',               purpose: 'Hubs & airspace strain',                    blueprintSection: '16.5' },
  { key: 'logistics',      label: 'Logistics Lane',         purpose: 'Cargo lanes & warehouse cover',             blueprintSection: '16.6' },
  { key: 'infrastructure', label: 'Infrastructure',         purpose: 'Bridges, tunnels & assets',                 blueprintSection: '16.7' },
  { key: 'emergency',      label: 'Emergency Ops',          purpose: 'Failures, crews & evacuation',              blueprintSection: '16.8' },
  { key: 'intelligence',   label: 'Mobility Intelligence',  purpose: 'Foresight & anomaly detection',             blueprintSection: '16.9' },
  { key: 'portal',         label: 'Public Transport',       purpose: 'Schedules, permits & advisories',           blueprintSection: '16.10' },
  { key: 'oversight',      label: 'Sovereign Oversight',    purpose: 'Equitable mobility & safeguards',           blueprintSection: '16.11' },
];

export const TRANSPORT_DOMAINS: TransportDomain[] = [
  // mobility
  { surface: 'mobility-theater',    group: 'mobility',       code: 'MB-THE-01', label: 'Mobility Theater',           purpose: 'Top-level mobility command',           archetype: 'mobility',      blueprintSection: '16.1' },
  { surface: 'mobility-posture',    group: 'mobility',       code: 'MB-PST-02', label: 'Mobility Posture',           purpose: 'Posture, throughput & bottlenecks',     archetype: 'mobility',      blueprintSection: '16.1' },
  { surface: 'national-throughput', group: 'mobility',       code: 'MB-TPT-03', label: 'National Throughput',        purpose: 'Throughput & regional congestion',      archetype: 'mobility',      blueprintSection: '16.1' },
  // corridor
  { surface: 'corridor-board',      group: 'corridor',       code: 'CR-COR-04', label: 'Corridor Board',             purpose: 'Per-corridor load & throughput',        archetype: 'corridor',      blueprintSection: '16.2' },
  { surface: 'regional-congestion', group: 'corridor',       code: 'CR-CNG-05', label: 'Regional Congestion',        purpose: 'Per-region congestion posture',         archetype: 'corridor',      blueprintSection: '16.2' },
  { surface: 'emergency-corridors', group: 'corridor',       code: 'CR-EMG-06', label: 'Emergency Corridors',        purpose: 'Active emergency-corridor lanes',       archetype: 'corridor',      blueprintSection: '16.2' },
  // maritime
  { surface: 'port-network',        group: 'maritime',       code: 'MR-PRT-07', label: 'Port Network',               purpose: 'Per-port berth & customs',              archetype: 'maritime',      blueprintSection: '16.3' },
  { surface: 'maritime-risk',       group: 'maritime',       code: 'MR-RSK-08', label: 'Maritime Risk',              purpose: 'Storm, security & diversion',           archetype: 'maritime',      blueprintSection: '16.3' },
  // rail
  { surface: 'rail-network',        group: 'rail',           code: 'RL-NET-09', label: 'Rail Network',               purpose: 'Per-corridor schedule & freight',       archetype: 'rail',          blueprintSection: '16.4' },
  { surface: 'rail-disruption',     group: 'rail',           code: 'RL-DSR-10', label: 'Rail Disruption',            purpose: 'Active rail disruption',                archetype: 'rail',          blueprintSection: '16.4' },
  // aviation
  { surface: 'air-hubs',            group: 'aviation',       code: 'AV-HUB-11', label: 'Air Hubs',                   purpose: 'Per-hub movements & cargo',             archetype: 'aviation',      blueprintSection: '16.5' },
  { surface: 'airspace-strain',     group: 'aviation',       code: 'AV-STR-12', label: 'Airspace Strain',            purpose: 'Airspace strain & weather',             archetype: 'aviation',      blueprintSection: '16.5' },
  // logistics
  { surface: 'logistics-network',   group: 'logistics',      code: 'LG-NET-13', label: 'Logistics Network',          purpose: 'National logistics network',            archetype: 'logistics',     blueprintSection: '16.6' },
  { surface: 'cargo-lanes',         group: 'logistics',      code: 'LG-LNE-14', label: 'Cargo Lanes',                purpose: 'Per-lane cargo class & continuity',     archetype: 'logistics',     blueprintSection: '16.6' },
  { surface: 'warehouse-cover',     group: 'logistics',      code: 'LG-WHC-15', label: 'Warehouse Cover',            purpose: 'Cargo warehouse-cover days',            archetype: 'logistics',     blueprintSection: '16.6' },
  // infrastructure
  { surface: 'infrastructure-assets', group: 'infrastructure', code: 'IF-AST-16', label: 'Infrastructure Assets',     purpose: 'National infrastructure asset register',archetype: 'infrastructure',blueprintSection: '16.7' },
  { surface: 'bridge-tunnel-health',  group: 'infrastructure', code: 'IF-BTH-17', label: 'Bridge & Tunnel Health',    purpose: 'Bridge / tunnel integrity',             archetype: 'infrastructure',blueprintSection: '16.7' },
  // emergency
  { surface: 'emergency-recovery',  group: 'emergency',      code: 'EM-REC-18', label: 'Emergency Recovery',         purpose: 'Recovery operations runtime',           archetype: 'emergency',     blueprintSection: '16.8' },
  { surface: 'infrastructure-failures', group: 'emergency',  code: 'EM-FAI-19', label: 'Infrastructure Failures',    purpose: 'Live infrastructure failures',          archetype: 'emergency',     blueprintSection: '16.8' },
  { surface: 'repair-crews',        group: 'emergency',      code: 'EM-CRW-20', label: 'Repair Crews',               purpose: 'Crew dispatch & status',                archetype: 'emergency',     blueprintSection: '16.8' },
  { surface: 'evacuation-corridors',group: 'emergency',      code: 'EM-EVC-21', label: 'Evacuation Corridors',       purpose: 'Active evacuation corridors',           archetype: 'emergency',     blueprintSection: '16.8' },
  // intelligence
  { surface: 'mobility-foresight',  group: 'intelligence',   code: 'IN-FRS-22', label: 'Mobility Foresight',         purpose: 'Long-horizon mobility intelligence',    archetype: 'intelligence',  blueprintSection: '16.9' },
  { surface: 'demand-forecast',     group: 'intelligence',   code: 'IN-DMD-23', label: 'Demand Forecast',            purpose: '25y mobility-demand trajectory',        archetype: 'intelligence',  blueprintSection: '16.9' },
  { surface: 'climate-mobility-risk', group: 'intelligence', code: 'IN-CMR-24', label: 'Climate Mobility Risk',      purpose: 'Climate-hazard mobility risk',          archetype: 'intelligence',  blueprintSection: '16.9' },
  { surface: 'freight-bottlenecks', group: 'intelligence',   code: 'IN-BTL-25', label: 'Freight Bottlenecks',        purpose: 'Bottleneck register',                   archetype: 'intelligence',  blueprintSection: '16.9' },
  { surface: 'mobility-anomalies',  group: 'intelligence',   code: 'IN-ANM-26', label: 'Mobility Anomalies',         purpose: 'Anomaly detection feed',                archetype: 'intelligence',  blueprintSection: '16.9' },
  // portal
  { surface: 'public-portal',       group: 'portal',         code: 'PR-PRT-27', label: 'Public Transport Portal',    purpose: 'Citizen portal',                        archetype: 'portal',        blueprintSection: '16.10' },
  { surface: 'transit-schedules',   group: 'portal',         code: 'PR-SCH-28', label: 'Transit Schedules',          purpose: 'Per-route schedule transparency',       archetype: 'portal',        blueprintSection: '16.10' },
  { surface: 'transport-permits',   group: 'portal',         code: 'PR-PMT-29', label: 'Transport Permits',          purpose: 'Transport permit categories',           archetype: 'portal',        blueprintSection: '16.10' },
  { surface: 'logistics-requests',  group: 'portal',         code: 'PR-LGR-30', label: 'Logistics Requests',         purpose: 'Citizen / freight logistics requests',  archetype: 'portal',        blueprintSection: '16.10' },
  { surface: 'mobility-advisories', group: 'portal',         code: 'PR-ADV-31', label: 'Mobility Advisories',        purpose: 'Public advisory feed',                  archetype: 'portal',        blueprintSection: '16.10' },
  // continuity (legacy)
  { surface: 'transport-continuity',group: 'mobility',       code: 'CN-CNT-32', label: 'Transport Continuity',       purpose: 'Continuity board (legacy)',             archetype: 'logistics',     blueprintSection: '16.6' },
  { surface: 'multi-modal',         group: 'corridor',       code: 'CN-MUL-33', label: 'Multi-Modal Operations',     purpose: 'Multi-modal operations (legacy)',       archetype: 'corridor',      blueprintSection: '16.2' },
  // oversight
  { surface: 'transport-safeguards',group: 'oversight',      code: 'OV-SFG-34', label: 'Transport Safeguards',       purpose: 'TRANSPORT_EXTENDED_SAFEGUARDS contract',archetype: 'oversight',     blueprintSection: '16.11' },
  { surface: 'equitable-mobility-audit', group: 'oversight', code: 'OV-EQT-35', label: 'Equitable Mobility Audit',   purpose: 'Equitable mobility access audit',       archetype: 'oversight',     blueprintSection: '16.11' },
];

const BY_SURFACE = new Map(TRANSPORT_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: TransportSurfaceId | string): TransportDomain | undefined {
  return BY_SURFACE.get(surface as TransportSurfaceId);
}

export const TRANSPORT_LEGACY_KEYS: Record<string, TransportSurfaceId> = {
  command: 'mobility-theater',
  corridors: 'corridor-board',
  freight: 'logistics-network',
  citizen: 'public-portal',
  'mobility-theater': 'mobility-theater',
  'multi-modal': 'multi-modal',
  'logistics-network': 'logistics-network',
  'transport-continuity': 'transport-continuity',
  'emergency-recovery': 'emergency-recovery',
  'mobility-foresight': 'mobility-foresight',
  'public-portal': 'public-portal',
};

export function resolveTransportSurface(key: string | null | undefined): TransportSurfaceId {
  if (!key) return 'mobility-theater';
  if (BY_SURFACE.has(key as TransportSurfaceId)) return key as TransportSurfaceId;
  return TRANSPORT_LEGACY_KEYS[key] ?? 'mobility-theater';
}
