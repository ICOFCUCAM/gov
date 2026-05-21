// apps/presidency/core — Presidency / Cabinet Office domain registry.

import type { PresidencyArchetype } from '@/apps/presidency/design-system/presidency-ds';

export type PresidencyGroupKey =
  | 'cabinet' | 'orders' | 'resolutions' | 'engagements'
  | 'security' | 'ministers' | 'address' | 'transparency' | 'continuity' | 'safeguards';

export interface PresidencyGroup {
  key: PresidencyGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type PresidencySurfaceId =
  | 'cabinet-floor' | 'cabinet-posture' | 'cabinet-cohesion' | 'cabinet-calendar'
  | 'executive-orders' | 'order-drafting' | 'order-archive'
  | 'cabinet-resolutions' | 'resolution-debate'
  | 'state-engagements' | 'state-visits' | 'diplomatic-calls'
  | 'security-council' | 'national-strategy' | 'continuity-of-government'
  | 'ministerial-corps' | 'appointments-board' | 'rotation-schedule'
  | 'citizen-address' | 'public-engagements'
  | 'transparency-reports' | 'asset-disclosures' | 'records-publication'
  | 'succession-line' | 'crisis-handover'
  | 'presidential-safeguards' | 'cabinet-collective-responsibility' | 'civil-military-doctrine' | 'audit-fabric' | 'presidential-records-audit';

export interface PresidencyDomain {
  surface: PresidencySurfaceId;
  group: PresidencyGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: PresidencyArchetype;
  blueprintSection: string;
}

export const PRESIDENCY_GROUPS: PresidencyGroup[] = [
  { key: 'cabinet',      label: 'Cabinet Floor',         purpose: 'Live cabinet command & cohesion',          blueprintSection: '2.1' },
  { key: 'orders',       label: 'Executive Orders',      purpose: 'Drafting, signing, archive',                blueprintSection: '2.2' },
  { key: 'resolutions',  label: 'Cabinet Resolutions',   purpose: 'Resolution debate & adoption',              blueprintSection: '2.3' },
  { key: 'engagements',  label: 'State Engagements',     purpose: 'State visits, summits, diplomacy',         blueprintSection: '2.4' },
  { key: 'security',     label: 'National Security',     purpose: 'Security council & continuity',             blueprintSection: '2.5' },
  { key: 'ministers',    label: 'Ministerial Corps',     purpose: 'Appointments & rotation',                   blueprintSection: '2.6' },
  { key: 'address',      label: 'Citizen Address',       purpose: 'Public addresses & engagements',            blueprintSection: '2.7' },
  { key: 'transparency', label: 'Transparency',          purpose: 'Records, disclosures, audits',              blueprintSection: '2.8' },
  { key: 'continuity',   label: 'Presidential Continuity',purpose: 'Succession & crisis handover',            blueprintSection: '2.9' },
  { key: 'safeguards',   label: 'Sovereign Safeguards',  purpose: 'PRESIDENTIAL_SAFEGUARDS contract',          blueprintSection: '2.10' },
];

export const PRESIDENCY_DOMAINS: PresidencyDomain[] = [
  { surface: 'cabinet-floor',                     group: 'cabinet',      code: 'CB-FLR-01', label: 'Cabinet Floor',              purpose: 'Live cabinet command',             archetype: 'cabinet',      blueprintSection: '2.1' },
  { surface: 'cabinet-posture',                   group: 'cabinet',      code: 'CB-PST-02', label: 'Cabinet Posture',            purpose: 'Posture & approval index',         archetype: 'cabinet',      blueprintSection: '2.1' },
  { surface: 'cabinet-cohesion',                  group: 'cabinet',      code: 'CB-CHN-03', label: 'Cabinet Cohesion',           purpose: 'Cohesion & alignment metrics',     archetype: 'cabinet',      blueprintSection: '2.1' },
  { surface: 'cabinet-calendar',                  group: 'cabinet',      code: 'CB-CAL-04', label: 'Cabinet Calendar',           purpose: 'Cabinet sitting calendar',         archetype: 'cabinet',      blueprintSection: '2.1' },
  { surface: 'executive-orders',                  group: 'orders',       code: 'EO-REG-05', label: 'Executive Orders Register',  purpose: 'All executive orders',             archetype: 'orders',       blueprintSection: '2.2' },
  { surface: 'order-drafting',                    group: 'orders',       code: 'EO-DFT-06', label: 'Order Drafting',             purpose: 'Drafting workflow',                archetype: 'orders',       blueprintSection: '2.2' },
  { surface: 'order-archive',                     group: 'orders',       code: 'EO-ARC-07', label: 'Order Archive',              purpose: 'Repealed & historical orders',      archetype: 'orders',       blueprintSection: '2.2' },
  { surface: 'cabinet-resolutions',               group: 'resolutions',  code: 'CR-REG-08', label: 'Cabinet Resolutions',        purpose: 'Active resolutions',               archetype: 'resolutions',  blueprintSection: '2.3' },
  { surface: 'resolution-debate',                 group: 'resolutions',  code: 'CR-DBT-09', label: 'Resolution Debate',          purpose: 'Resolution in debate',             archetype: 'resolutions',  blueprintSection: '2.3' },
  { surface: 'state-engagements',                 group: 'engagements',  code: 'SE-REG-10', label: 'State Engagements',          purpose: 'All state engagements',            archetype: 'engagements',  blueprintSection: '2.4' },
  { surface: 'state-visits',                      group: 'engagements',  code: 'SE-VIS-11', label: 'State Visits',               purpose: 'Inbound & outbound state visits',   archetype: 'engagements',  blueprintSection: '2.4' },
  { surface: 'diplomatic-calls',                  group: 'engagements',  code: 'SE-CAL-12', label: 'Diplomatic Calls',           purpose: 'Diplomatic calls register',         archetype: 'engagements',  blueprintSection: '2.4' },
  { surface: 'security-council',                  group: 'security',     code: 'SC-COU-13', label: 'Security Council',           purpose: 'National security council',         archetype: 'security',     blueprintSection: '2.5' },
  { surface: 'national-strategy',                 group: 'security',     code: 'SC-STR-14', label: 'National Strategy',          purpose: 'Long-horizon national strategy',    archetype: 'security',     blueprintSection: '2.5' },
  { surface: 'continuity-of-government',          group: 'security',     code: 'SC-COG-15', label: 'Continuity of Government',   purpose: 'Continuity-of-government posture',  archetype: 'security',     blueprintSection: '2.5' },
  { surface: 'ministerial-corps',                 group: 'ministers',    code: 'MN-COR-16', label: 'Ministerial Corps',          purpose: 'Per-minister dossier',              archetype: 'ministers',    blueprintSection: '2.6' },
  { surface: 'appointments-board',                group: 'ministers',    code: 'MN-APP-17', label: 'Appointments Board',         purpose: 'Active appointments',               archetype: 'ministers',    blueprintSection: '2.6' },
  { surface: 'rotation-schedule',                 group: 'ministers',    code: 'MN-ROT-18', label: 'Rotation Schedule',          purpose: 'Cabinet rotation & end-of-term',   archetype: 'ministers',    blueprintSection: '2.6' },
  { surface: 'citizen-address',                   group: 'address',      code: 'AD-CIT-19', label: 'Citizen Address',            purpose: 'Citizen-facing addresses',          archetype: 'address',      blueprintSection: '2.7' },
  { surface: 'public-engagements',                group: 'address',      code: 'AD-ENG-20', label: 'Public Engagements',         purpose: 'Public engagements calendar',       archetype: 'address',      blueprintSection: '2.7' },
  { surface: 'transparency-reports',              group: 'transparency', code: 'TR-RPT-21', label: 'Transparency Reports',       purpose: 'Quarterly transparency reports',    archetype: 'transparency', blueprintSection: '2.8' },
  { surface: 'asset-disclosures',                 group: 'transparency', code: 'TR-AST-22', label: 'Asset Disclosures',          purpose: 'Presidential asset disclosures',    archetype: 'transparency', blueprintSection: '2.8' },
  { surface: 'records-publication',               group: 'transparency', code: 'TR-REC-23', label: 'Records Publication',        purpose: 'Presidential records publication',  archetype: 'transparency', blueprintSection: '2.8' },
  { surface: 'succession-line',                   group: 'continuity',   code: 'CO-SUC-24', label: 'Succession Line',            purpose: 'Constitutional succession order',  archetype: 'continuity',   blueprintSection: '2.9' },
  { surface: 'crisis-handover',                   group: 'continuity',   code: 'CO-CRH-25', label: 'Crisis Handover',            purpose: 'Crisis handover protocol',          archetype: 'continuity',   blueprintSection: '2.9' },
  { surface: 'presidential-safeguards',           group: 'safeguards',   code: 'SF-PRE-26', label: 'Presidential Safeguards',    purpose: 'PRESIDENTIAL_SAFEGUARDS contract',  archetype: 'safeguards',   blueprintSection: '2.10' },
  { surface: 'cabinet-collective-responsibility', group: 'safeguards',   code: 'SF-CCR-27', label: 'Cabinet Collective Responsibility', purpose: 'Collective responsibility doctrine', archetype: 'safeguards', blueprintSection: '2.10' },
  { surface: 'civil-military-doctrine',           group: 'safeguards',   code: 'SF-CMD-28', label: 'Civil-Military Doctrine',    purpose: 'Civilian supremacy doctrine',       archetype: 'safeguards',   blueprintSection: '2.10' },
  { surface: 'audit-fabric',                      group: 'safeguards',   code: 'SF-AUD-29', label: 'Audit Fabric',               purpose: 'Cross-branch audit interface',      archetype: 'safeguards',   blueprintSection: '2.10' },
  { surface: 'presidential-records-audit',        group: 'safeguards',   code: 'SF-REC-30', label: 'Presidential Records Audit', purpose: 'Records preservation audit',        archetype: 'safeguards',   blueprintSection: '2.10' },
];

const BY_SURFACE = new Map(PRESIDENCY_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: PresidencySurfaceId | string): PresidencyDomain | undefined {
  return BY_SURFACE.get(surface as PresidencySurfaceId);
}

export const PRESIDENCY_LEGACY_KEYS: Record<string, PresidencySurfaceId> = {
  cabinet: 'cabinet-floor',
  orders: 'executive-orders',
  resolutions: 'cabinet-resolutions',
  engagements: 'state-engagements',
  security: 'security-council',
  ministers: 'ministerial-corps',
};

export function resolvePresidencySurface(key: string | null | undefined): PresidencySurfaceId {
  if (!key) return 'cabinet-floor';
  if (BY_SURFACE.has(key as PresidencySurfaceId)) return key as PresidencySurfaceId;
  return PRESIDENCY_LEGACY_KEYS[key] ?? 'cabinet-floor';
}

export function presidencyNav(): { key: string; label: string }[] {
  return PRESIDENCY_GROUPS.map(g => ({ key: PRESIDENCY_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
