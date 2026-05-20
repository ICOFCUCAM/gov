// apps/ministry-trade/core — Trade domain registry.
//
// 30 typed surface ids across 10 groups citing §21 (infrastructure) of
// the master blueprint, layered on trade-systems + industrial-continuity.

import type { TradeArchetype } from '@/apps/ministry-trade/design-system/trade-ds';

export type TradeGroupKey =
  | 'command' | 'corridor' | 'strategic' | 'commercial'
  | 'supply' | 'foreign' | 'crisis' | 'intelligence' | 'portal' | 'oversight';

export interface TradeGroup {
  key: TradeGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type TradeSurfaceId =
  // command
  | 'industrial-command' | 'industrial-posture' | 'factory-clusters'
  // corridor
  | 'trade-corridors' | 'corridor-board' | 'tariff-pressure'
  // strategic
  | 'strategic-industries' | 'strategic-reserves' | 'priority-allocation'
  // commercial
  | 'supply-chain-commerce' | 'industrial-districts' | 'sme-continuity'
  // supply
  | 'supply-chains' | 'inbound-cover' | 'bottleneck-board'
  // foreign
  | 'trade-agreements' | 'export-dependencies' | 'sanctions-exposure'
  // crisis
  | 'industrial-incidents' | 'recovery-pathways' | 'sabotage-watch'
  // intelligence
  | 'economic-foresight' | 'output-trajectory' | 'autonomy-trajectory' | 'competitiveness-board'
  // portal
  | 'business-registry' | 'standards-portal' | 'licensing-permits' | 'export-certification'
  // oversight
  | 'industrial-safeguards' | 'transparent-tender-audit';

export interface TradeDomain {
  surface: TradeSurfaceId;
  group: TradeGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: TradeArchetype;
  blueprintSection: string;
}

export const TRADE_GROUPS: TradeGroup[] = [
  { key: 'command',      label: 'Industrial Command',    purpose: 'National industrial command',                blueprintSection: '21.1' },
  { key: 'corridor',     label: 'Trade Corridors',       purpose: 'Trade corridors & tariff pressure',          blueprintSection: '21.2' },
  { key: 'strategic',    label: 'Strategic Production',  purpose: 'Strategic industries & reserves',            blueprintSection: '21.3' },
  { key: 'commercial',   label: 'Commercial Continuity', purpose: 'Districts & SME continuity',                 blueprintSection: '21.4' },
  { key: 'supply',       label: 'Supply Chains',         purpose: 'Supply chain & bottleneck intelligence',     blueprintSection: '21.5' },
  { key: 'foreign',      label: 'Foreign Trade',         purpose: 'Trade agreements & dependencies',            blueprintSection: '21.6' },
  { key: 'crisis',       label: 'Industrial Crisis',     purpose: 'Incident response & recovery',                blueprintSection: '21.7' },
  { key: 'intelligence', label: 'Economic Intelligence', purpose: 'Long-horizon foresight',                      blueprintSection: '21.8' },
  { key: 'portal',       label: 'Public Trade',          purpose: 'Business registry & permits',                 blueprintSection: '21.9' },
  { key: 'oversight',    label: 'Sovereign Oversight',   purpose: 'Industrial safeguards & tender audit',        blueprintSection: '21.10' },
];

export const TRADE_DOMAINS: TradeDomain[] = [
  // command
  { surface: 'industrial-command',    group: 'command',      code: 'CM-IND-01', label: 'National Industrial Command', purpose: 'Top-level industrial command',      archetype: 'command',     blueprintSection: '21.1' },
  { surface: 'industrial-posture',    group: 'command',      code: 'CM-PST-02', label: 'Industrial Posture',          purpose: 'Output, capacity & resilience',     archetype: 'command',     blueprintSection: '21.1' },
  { surface: 'factory-clusters',      group: 'command',      code: 'CM-CLU-03', label: 'Factory Clusters',            purpose: 'Per-cluster utilisation',           archetype: 'command',     blueprintSection: '21.1' },
  // corridor
  { surface: 'trade-corridors',       group: 'corridor',     code: 'CR-TRD-04', label: 'Trade Corridors & Exports',   purpose: 'Top-level corridor board',          archetype: 'corridor',    blueprintSection: '21.2' },
  { surface: 'corridor-board',        group: 'corridor',     code: 'CR-COR-05', label: 'Corridor Board',              purpose: 'Per-corridor throughput',           archetype: 'corridor',    blueprintSection: '21.2' },
  { surface: 'tariff-pressure',       group: 'corridor',     code: 'CR-TAR-06', label: 'Tariff Pressure',             purpose: 'Tariff & clearance pressure',       archetype: 'corridor',    blueprintSection: '21.2' },
  // strategic
  { surface: 'strategic-industries',  group: 'strategic',    code: 'ST-IND-07', label: 'Strategic Industries',        purpose: 'Strategic industry register',       archetype: 'strategic',   blueprintSection: '21.3' },
  { surface: 'strategic-reserves',    group: 'strategic',    code: 'ST-RES-08', label: 'Strategic Reserves',          purpose: 'Reserve days of cover',             archetype: 'strategic',   blueprintSection: '21.3' },
  { surface: 'priority-allocation',   group: 'strategic',    code: 'ST-PRA-09', label: 'Priority Allocation',         purpose: 'Sovereign / critical / standard',   archetype: 'strategic',   blueprintSection: '21.3' },
  // commercial
  { surface: 'supply-chain-commerce', group: 'commercial',   code: 'CM-SCC-10', label: 'Supply-Chain Commerce',       purpose: 'Top-level commerce board',          archetype: 'commercial',  blueprintSection: '21.4' },
  { surface: 'industrial-districts',  group: 'commercial',   code: 'CM-DST-11', label: 'Industrial Districts',        purpose: 'Per-district continuity',           archetype: 'commercial',  blueprintSection: '21.4' },
  { surface: 'sme-continuity',        group: 'commercial',   code: 'CM-SME-12', label: 'SME Continuity',              purpose: 'SME index & pressure',              archetype: 'commercial',  blueprintSection: '21.4' },
  // supply
  { surface: 'supply-chains',         group: 'supply',       code: 'SC-CHN-13', label: 'Supply Chains',               purpose: 'Per-chain visibility & flow',       archetype: 'supply',      blueprintSection: '21.5' },
  { surface: 'inbound-cover',         group: 'supply',       code: 'SC-INB-14', label: 'Inbound Cover',               purpose: 'Inbound days of cover',             archetype: 'supply',      blueprintSection: '21.5' },
  { surface: 'bottleneck-board',      group: 'supply',       code: 'SC-BTL-15', label: 'Bottleneck Board',            purpose: 'Per-chain bottleneck count',        archetype: 'supply',      blueprintSection: '21.5' },
  // foreign
  { surface: 'trade-agreements',      group: 'foreign',      code: 'FG-AGR-16', label: 'Trade Agreements',            purpose: 'Bilateral / regional agreements',   archetype: 'foreign',     blueprintSection: '21.6' },
  { surface: 'export-dependencies',   group: 'foreign',      code: 'FG-DEP-17', label: 'Export Dependencies',         purpose: 'Per-partner export concentration',  archetype: 'foreign',     blueprintSection: '21.6' },
  { surface: 'sanctions-exposure',    group: 'foreign',      code: 'FG-SAN-18', label: 'Sanctions Exposure',          purpose: 'Sanctions exposure & alignment',    archetype: 'foreign',     blueprintSection: '21.6' },
  // crisis
  { surface: 'industrial-incidents',  group: 'crisis',       code: 'CR-INC-19', label: 'Industrial Incidents',        purpose: 'Live incident ledger',              archetype: 'crisis',      blueprintSection: '21.7' },
  { surface: 'recovery-pathways',     group: 'crisis',       code: 'CR-REC-20', label: 'Recovery Pathways',           purpose: 'Per-incident recovery pathway',     archetype: 'crisis',      blueprintSection: '21.7' },
  { surface: 'sabotage-watch',        group: 'crisis',       code: 'CR-SBT-21', label: 'Sabotage Watch',              purpose: 'Sabotage / disruption signals',     archetype: 'crisis',      blueprintSection: '21.7' },
  // intelligence
  { surface: 'economic-foresight',    group: 'intelligence', code: 'IN-FRS-22', label: 'Economic Foresight & Crisis', purpose: 'Top-level foresight board',         archetype: 'intelligence',blueprintSection: '21.8' },
  { surface: 'output-trajectory',     group: 'intelligence', code: 'IN-OUT-23', label: 'Output Trajectory',           purpose: '25y industrial-output arc',         archetype: 'intelligence',blueprintSection: '21.8' },
  { surface: 'autonomy-trajectory',   group: 'intelligence', code: 'IN-AUT-24', label: 'Strategic Autonomy',          purpose: 'Sovereign autonomy index arc',      archetype: 'intelligence',blueprintSection: '21.8' },
  { surface: 'competitiveness-board', group: 'intelligence', code: 'IN-COM-25', label: 'Competitiveness Board',       purpose: 'Generational competitiveness',      archetype: 'intelligence',blueprintSection: '21.8' },
  // portal
  { surface: 'business-registry',     group: 'portal',       code: 'PR-BRG-26', label: 'Business Registry',           purpose: 'Business registration backlog',     archetype: 'portal',      blueprintSection: '21.9' },
  { surface: 'standards-portal',      group: 'portal',       code: 'PR-STD-27', label: 'Standards Portal',            purpose: 'Standards labs & conformity',       archetype: 'portal',      blueprintSection: '21.9' },
  { surface: 'licensing-permits',     group: 'portal',       code: 'PR-LIC-28', label: 'Licensing Permits',           purpose: 'Permit pending & SLA',              archetype: 'portal',      blueprintSection: '21.9' },
  { surface: 'export-certification',  group: 'portal',       code: 'PR-EXP-29', label: 'Export Certification',        purpose: 'Export certification pipeline',     archetype: 'portal',      blueprintSection: '21.9' },
  // oversight
  { surface: 'industrial-safeguards', group: 'oversight',    code: 'OV-SFG-30', label: 'Industrial Safeguards',       purpose: 'INDUSTRIAL_CONTINUITY_SAFEGUARDS',  archetype: 'oversight',   blueprintSection: '21.10' },
  { surface: 'transparent-tender-audit', group: 'oversight', code: 'OV-TND-31', label: 'Transparent Tender Audit',    purpose: 'Tender & licensing audit',          archetype: 'oversight',   blueprintSection: '21.10' },
];

const BY_SURFACE = new Map(TRADE_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: TradeSurfaceId | string): TradeDomain | undefined {
  return BY_SURFACE.get(surface as TradeSurfaceId);
}

export const TRADE_LEGACY_KEYS: Record<string, TradeSurfaceId> = {
  registry: 'business-registry',
  standards: 'standards-portal',
  export: 'export-certification',
  licensing: 'licensing-permits',
  industry: 'industrial-districts',
  'industrial-command': 'industrial-command',
  'trade-corridors': 'trade-corridors',
  'supply-chain': 'supply-chain-commerce',
  'economic-foresight': 'economic-foresight',
};

export function resolveTradeSurface(key: string | null | undefined): TradeSurfaceId {
  if (!key) return 'industrial-command';
  if (BY_SURFACE.has(key as TradeSurfaceId)) return key as TradeSurfaceId;
  return TRADE_LEGACY_KEYS[key] ?? 'industrial-command';
}
