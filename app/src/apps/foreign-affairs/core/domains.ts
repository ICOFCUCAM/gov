// apps/foreign-affairs/core — Foreign Affairs domain registry.
//
// 30 surface ids across 10 groups, each citing a §4 (Global
// Positioning) blueprint subsection. Layered on top of the existing
// foreign-affairs + foreign-affairs-extended engines.

import type { ForeignArchetype } from '@/apps/foreign-affairs/design-system/foreign-ds';

export type ForeignGroupKey =
  | 'dispatch' | 'missions' | 'treaties' | 'intelligence'
  | 'economic' | 'law' | 'consular' | 'foresight'
  | 'organizations' | 'oversight';

export interface ForeignGroup {
  key: ForeignGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type ForeignSurfaceId =
  // dispatch
  | 'geopolitical-command' | 'world-dispatch' | 'regional-tension-board'
  // missions
  | 'diplomatic-missions' | 'embassy-operations' | 'consular-continuity' | 'special-envoys'
  // treaties
  | 'treaties-alliances' | 'treaty-compliance-bench' | 'negotiation-docket'
  // intelligence
  | 'intelligence-systems' | 'anomaly-detection' | 'conflict-probability'
  | 'strategic-dependency' | 'influence-signals'
  // economic
  | 'economic-diplomacy' | 'sanctions-exposure' | 'sovereign-asset-exposure'
  // law
  | 'law-sovereignty' | 'sovereignty-disputes' | 'treaty-legality-bench'
  // consular
  | 'citizen-portal' | 'passport-pipeline' | 'visa-processing' | 'travel-advisories'
  // foresight
  | 'crisis-foresight' | 'civilizational-standing'
  // organizations
  | 'multilateral-roster' | 'voting-alignment'
  // oversight
  | 'diplomatic-safeguards' | 'anti-imperial-audit';

export interface ForeignDomain {
  surface: ForeignSurfaceId;
  group: ForeignGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: ForeignArchetype;
  blueprintSection: string;
}

export const FOREIGN_GROUPS: ForeignGroup[] = [
  { key: 'dispatch',      label: 'World Dispatch',         purpose: 'Geopolitical command & posture',          blueprintSection: '4.1' },
  { key: 'missions',      label: 'Diplomatic Missions',    purpose: 'Embassy, consulate & envoy operations',   blueprintSection: '4.2' },
  { key: 'treaties',      label: 'Treaty Atlas',           purpose: 'Treaty docket, compliance & negotiation', blueprintSection: '4.3' },
  { key: 'intelligence',  label: 'Strategic Intelligence', purpose: 'Geopolitical anomaly & conflict signals', blueprintSection: '4.4' },
  { key: 'economic',      label: 'Economic Diplomacy',     purpose: 'Trade alignment & sanctions exposure',    blueprintSection: '4.5' },
  { key: 'law',           label: 'International Law',      purpose: 'Sovereignty, disputes & treaty legality', blueprintSection: '4.6' },
  { key: 'consular',      label: 'Consular & Citizen',     purpose: 'Passports, visas, advisories & casework', blueprintSection: '4.7' },
  { key: 'foresight',     label: 'Strategic Foresight',    purpose: 'Multi-horizon diplomatic trajectory',     blueprintSection: '4.8' },
  { key: 'organizations', label: 'Multilateral Forums',    purpose: 'International organisation roster',       blueprintSection: '4.9' },
  { key: 'oversight',     label: 'Sovereign Oversight',    purpose: 'Diplomatic safeguards & anti-imperial',   blueprintSection: '4.10' },
];

export const FOREIGN_DOMAINS: ForeignDomain[] = [
  // dispatch
  { surface: 'geopolitical-command',   group: 'dispatch',     code: 'WD-CMD-01', label: 'Geopolitical Command',     purpose: 'Top-level command surface',           archetype: 'dispatch',     blueprintSection: '4.1' },
  { surface: 'world-dispatch',         group: 'dispatch',     code: 'WD-DSP-02', label: 'World Dispatch',           purpose: 'Live diplomatic incident dispatch',   archetype: 'dispatch',     blueprintSection: '4.1' },
  { surface: 'regional-tension-board', group: 'dispatch',     code: 'WD-RTB-03', label: 'Regional Tension Board',   purpose: 'Per-region drift & flashpoint board', archetype: 'dispatch',     blueprintSection: '4.1' },
  // missions
  { surface: 'diplomatic-missions',    group: 'missions',     code: 'MI-DMR-04', label: 'Diplomatic Missions',      purpose: 'All embassies / consulates / missions', archetype: 'mission',    blueprintSection: '4.2' },
  { surface: 'embassy-operations',     group: 'missions',     code: 'MI-EMB-05', label: 'Embassy Operations',       purpose: 'Per-embassy security & continuity',   archetype: 'mission',      blueprintSection: '4.2' },
  { surface: 'consular-continuity',    group: 'missions',     code: 'MI-CON-06', label: 'Consular Continuity',      purpose: 'Citizens-abroad case continuity',     archetype: 'consular',     blueprintSection: '4.2' },
  { surface: 'special-envoys',         group: 'missions',     code: 'MI-ENV-07', label: 'Special Envoys',           purpose: 'Time-bounded missions & dossiers',    archetype: 'mission',      blueprintSection: '4.2' },
  // treaties
  { surface: 'treaties-alliances',     group: 'treaties',     code: 'TR-ATL-08', label: 'Treaty & Alliances Atlas', purpose: 'Treaty atlas',                        archetype: 'treaty',       blueprintSection: '4.3' },
  { surface: 'treaty-compliance-bench',group: 'treaties',     code: 'TR-CMP-09', label: 'Treaty Compliance Bench',  purpose: 'Compliance review docket',            archetype: 'treaty',       blueprintSection: '4.3' },
  { surface: 'negotiation-docket',     group: 'treaties',     code: 'TR-NEG-10', label: 'Negotiation Docket',       purpose: 'Active treaty negotiations',          archetype: 'treaty',       blueprintSection: '4.3' },
  // intelligence
  { surface: 'intelligence-systems',   group: 'intelligence', code: 'IN-SYS-11', label: 'Geopolitical Intelligence',purpose: 'Strategic intelligence fusion',       archetype: 'intelligence', blueprintSection: '4.4' },
  { surface: 'anomaly-detection',      group: 'intelligence', code: 'IN-ANM-12', label: 'Anomaly Detection',        purpose: 'Live signal anomalies',               archetype: 'intelligence', blueprintSection: '4.4' },
  { surface: 'conflict-probability',   group: 'intelligence', code: 'IN-CFL-13', label: 'Conflict Probability',     purpose: 'Pair-wise conflict probability',      archetype: 'intelligence', blueprintSection: '4.4' },
  { surface: 'strategic-dependency',   group: 'intelligence', code: 'IN-DEP-14', label: 'Strategic Dependency',     purpose: 'Critical-resource source exposure',   archetype: 'intelligence', blueprintSection: '4.4' },
  { surface: 'influence-signals',      group: 'intelligence', code: 'IN-INF-15', label: 'Influence Signals',        purpose: 'Inbound / outbound influence index',  archetype: 'intelligence', blueprintSection: '4.4' },
  // economic
  { surface: 'economic-diplomacy',     group: 'economic',     code: 'EC-DIP-16', label: 'Economic Diplomacy',       purpose: 'Trade alignment & bilateral partners',archetype: 'economic',     blueprintSection: '4.5' },
  { surface: 'sanctions-exposure',     group: 'economic',     code: 'EC-SAN-17', label: 'Sanctions Exposure',       purpose: 'Outbound & inbound sanctions',        archetype: 'economic',     blueprintSection: '4.5' },
  { surface: 'sovereign-asset-exposure', group: 'economic',   code: 'EC-AST-18', label: 'Sovereign-Asset Exposure', purpose: 'Counterparty exposure register',      archetype: 'economic',     blueprintSection: '4.5' },
  // law
  { surface: 'law-sovereignty',        group: 'law',          code: 'IL-SOV-19', label: 'International Law & Sovereignty', purpose: 'Sovereignty integrity board',  archetype: 'law',          blueprintSection: '4.6' },
  { surface: 'sovereignty-disputes',   group: 'law',          code: 'IL-DIS-20', label: 'Sovereignty Disputes',     purpose: 'Active sovereignty disputes',         archetype: 'law',          blueprintSection: '4.6' },
  { surface: 'treaty-legality-bench',  group: 'law',          code: 'IL-LEG-21', label: 'Treaty Legality Bench',    purpose: 'Compliance class check',              archetype: 'law',          blueprintSection: '4.6' },
  // consular
  { surface: 'citizen-portal',         group: 'consular',     code: 'CN-PRT-22', label: 'Citizen Foreign Services', purpose: 'Public citizen portal',               archetype: 'consular',     blueprintSection: '4.7' },
  { surface: 'passport-pipeline',      group: 'consular',     code: 'CN-PSP-23', label: 'Passport Pipeline',        purpose: 'Issuance & renewal pipeline',         archetype: 'consular',     blueprintSection: '4.7' },
  { surface: 'visa-processing',        group: 'consular',     code: 'CN-VSA-24', label: 'Visa Processing',          purpose: 'Inbound visa categories',             archetype: 'consular',     blueprintSection: '4.7' },
  { surface: 'travel-advisories',      group: 'consular',     code: 'CN-ADV-25', label: 'Travel Advisories',        purpose: 'Per-region advisory feed',            archetype: 'consular',     blueprintSection: '4.7' },
  // foresight
  { surface: 'crisis-foresight',       group: 'foresight',    code: 'FS-CRS-26', label: 'International Crisis Foresight', purpose: 'Multi-horizon trajectory',     archetype: 'foresight',    blueprintSection: '4.8' },
  { surface: 'civilizational-standing',group: 'foresight',    code: 'FS-STD-27', label: 'Civilizational Standing',  purpose: 'Standing & sovereignty index',        archetype: 'foresight',    blueprintSection: '4.8' },
  // organizations
  { surface: 'multilateral-roster',    group: 'organizations',code: 'OR-RST-28', label: 'Multilateral Roster',      purpose: 'International organisation roster',   archetype: 'organization', blueprintSection: '4.9' },
  { surface: 'voting-alignment',       group: 'organizations',code: 'OR-VOT-29', label: 'Voting Alignment',         purpose: 'Voting / contribution / alignment',   archetype: 'organization', blueprintSection: '4.9' },
  // oversight
  { surface: 'diplomatic-safeguards',  group: 'oversight',    code: 'OV-DSF-30', label: 'Diplomatic Safeguards',    purpose: 'FOREIGN_EXTENDED_SAFEGUARDS contract',archetype: 'oversight',    blueprintSection: '4.10' },
  { surface: 'anti-imperial-audit',    group: 'oversight',    code: 'OV-AIA-31', label: 'Anti-Imperial Audit',      purpose: 'Anti-imperial doctrine audit',        archetype: 'oversight',    blueprintSection: '4.10' },
];

const BY_SURFACE = new Map(FOREIGN_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: ForeignSurfaceId | string): ForeignDomain | undefined {
  return BY_SURFACE.get(surface as ForeignSurfaceId);
}

export const FOREIGN_LEGACY_KEYS: Record<string, ForeignSurfaceId> = {
  'diplomatic-missions': 'diplomatic-missions',
  'treaties-alliances': 'treaties-alliances',
  'crisis-foresight': 'crisis-foresight',
  'intelligence-systems': 'intelligence-systems',
  'law-sovereignty': 'law-sovereignty',
  'citizen-portal': 'citizen-portal',
};

export function resolveForeignSurface(key: string | null | undefined): ForeignSurfaceId {
  if (!key) return 'geopolitical-command';
  if (BY_SURFACE.has(key as ForeignSurfaceId)) return key as ForeignSurfaceId;
  return FOREIGN_LEGACY_KEYS[key] ?? 'geopolitical-command';
}
