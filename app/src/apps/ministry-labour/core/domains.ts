// apps/ministry-labour/core — Labour domain registry.
//
// 30+ typed surface ids across 10 groups citing §23 (welfare) and §24
// (labour) of the master blueprint. Layered on top of the existing
// labor-systems + labour-extended + workforce-continuity engines.

import type { LabourArchetype } from '@/apps/ministry-labour/design-system/labour-ds';

export type LabourGroupKey =
  | 'workforce' | 'protection' | 'rights' | 'demographic'
  | 'continuity' | 'emergency' | 'intelligence' | 'portal' | 'oversight';

export interface LabourGroup {
  key: LabourGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type LabourSurfaceId =
  // workforce
  | 'workforce-command' | 'employment-board' | 'sector-allocation' | 'regional-workforce'
  // protection
  | 'social-protection' | 'benefits-programmes' | 'pension-board'
  // rights
  | 'workplace-rights' | 'workplace-inspections' | 'occupational-incidents' | 'tribunal-lanes'
  // demographic
  | 'demographic-analytics' | 'age-cohorts' | 'skills-pipeline' | 'employment-coordination'
  // continuity
  | 'social-continuity' | 'social-pressure-register'
  // emergency
  | 'labour-emergency' | 'industrial-closures' | 'redeployment-corridors' | 'emergency-programmes'
  // intelligence
  | 'workforce-foresight' | 'demand-forecast' | 'labour-market-anomalies'
  // portal
  | 'labour-portal' | 'employment-applications' | 'pension-requests' | 'labour-complaints' | 'vocational-enrolments' | 'labour-advisories'
  // legacy
  | 'social-continuity-crisis' | 'labour-recovery'
  // oversight
  | 'labour-safeguards' | 'workplace-safety-audit';

export interface LabourDomain {
  surface: LabourSurfaceId;
  group: LabourGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: LabourArchetype;
  blueprintSection: string;
}

export const LABOUR_GROUPS: LabourGroup[] = [
  { key: 'workforce',     label: 'Workforce Command',     purpose: 'National workforce command & sector allocation', blueprintSection: '24.1' },
  { key: 'protection',    label: 'Social Protection',     purpose: 'Benefits programmes & pensions',                blueprintSection: '23.1' },
  { key: 'rights',        label: 'Labour Rights',         purpose: 'Inspections, incidents, tribunals',             blueprintSection: '24.4' },
  { key: 'demographic',   label: 'Demographic Analytics', purpose: 'Cohorts, skills, coordination',                 blueprintSection: '24.2' },
  { key: 'continuity',    label: 'Continuity Lane',       purpose: 'Social continuity & pressure register',         blueprintSection: '23.3' },
  { key: 'emergency',     label: 'Emergency Operations',  purpose: 'Industrial closures & redeployment',            blueprintSection: '24.5' },
  { key: 'intelligence',  label: 'Workforce Intelligence',purpose: 'Long-horizon foresight & anomalies',            blueprintSection: '24.6' },
  { key: 'portal',        label: 'Public Labour',         purpose: 'Public-facing applications & advisories',       blueprintSection: '23.5' },
  { key: 'oversight',     label: 'Sovereign Oversight',   purpose: 'Safeguards & workplace-safety audit',           blueprintSection: '24.7' },
];

export const LABOUR_DOMAINS: LabourDomain[] = [
  // workforce
  { surface: 'workforce-command',      group: 'workforce',    code: 'WF-CMD-01', label: 'National Workforce Command', purpose: 'Top-level workforce command',           archetype: 'workforce',   blueprintSection: '24.1' },
  { surface: 'employment-board',       group: 'workforce',    code: 'WF-EMP-02', label: 'Employment Board',           purpose: 'Unemployment, placements & vacancies',  archetype: 'workforce',   blueprintSection: '24.1' },
  { surface: 'sector-allocation',      group: 'workforce',    code: 'WF-SEC-03', label: 'Sector Allocation',          purpose: 'Per-sector workforce distribution',     archetype: 'workforce',   blueprintSection: '24.1' },
  { surface: 'regional-workforce',     group: 'workforce',    code: 'WF-REG-04', label: 'Regional Workforce',         purpose: 'Per-region workforce posture',          archetype: 'workforce',   blueprintSection: '24.1' },
  // protection
  { surface: 'social-protection',      group: 'protection',   code: 'SP-SYS-05', label: 'Social Protection Systems',  purpose: 'Top-level social protection',           archetype: 'protection',  blueprintSection: '23.1' },
  { surface: 'benefits-programmes',    group: 'protection',   code: 'SP-BEN-06', label: 'Benefits Programmes',        purpose: 'Benefits catalogue & coverage',         archetype: 'protection',  blueprintSection: '23.1' },
  { surface: 'pension-board',          group: 'protection',   code: 'SP-PEN-07', label: 'Pension Board',              purpose: 'Pension funds, claims & disbursement',  archetype: 'protection',  blueprintSection: '23.2' },
  // rights
  { surface: 'workplace-rights',       group: 'rights',       code: 'RG-WPR-08', label: 'Workplace Safety & Rights',  purpose: 'Top-level workplace rights board',      archetype: 'rights',      blueprintSection: '24.4' },
  { surface: 'workplace-inspections',  group: 'rights',       code: 'RG-INS-09', label: 'Workplace Inspections',      purpose: 'Inspection ledger & findings',          archetype: 'rights',      blueprintSection: '24.4' },
  { surface: 'occupational-incidents', group: 'rights',       code: 'RG-INC-10', label: 'Occupational Incidents',     purpose: 'Live incident ledger',                  archetype: 'rights',      blueprintSection: '24.4' },
  { surface: 'tribunal-lanes',         group: 'rights',       code: 'RG-TRB-11', label: 'Tribunal Lanes',             purpose: 'Mediation / arbitration / labour court',archetype: 'rights',      blueprintSection: '24.4' },
  // demographic
  { surface: 'demographic-analytics',  group: 'demographic',  code: 'DM-ANL-12', label: 'Demographic Analytics',      purpose: 'Top-level demographic board',           archetype: 'demographic', blueprintSection: '24.2' },
  { surface: 'age-cohorts',            group: 'demographic',  code: 'DM-AGE-13', label: 'Age Cohorts',                purpose: 'Per-cohort participation',              archetype: 'demographic', blueprintSection: '24.2' },
  { surface: 'skills-pipeline',        group: 'demographic',  code: 'DM-SKL-14', label: 'Skills Pipeline',            purpose: 'Per-skill supply & demand',             archetype: 'demographic', blueprintSection: '24.2' },
  { surface: 'employment-coordination',group: 'demographic',  code: 'DM-EMC-15', label: 'Employment Coordination',    purpose: 'Inter-ministry employment alignment',   archetype: 'demographic', blueprintSection: '24.2' },
  // continuity
  { surface: 'social-continuity',      group: 'continuity',   code: 'CN-SCT-16', label: 'Social Continuity',          purpose: 'Top-level social continuity board',     archetype: 'continuity',  blueprintSection: '23.3' },
  { surface: 'social-pressure-register', group: 'continuity', code: 'CN-PRS-17', label: 'Social Pressure Register',   purpose: 'Per-pressure social register',          archetype: 'continuity',  blueprintSection: '23.3' },
  // emergency
  { surface: 'labour-emergency',       group: 'emergency',    code: 'EM-LBR-18', label: 'Labour Emergency Recovery',  purpose: 'Top-level emergency board',             archetype: 'emergency',   blueprintSection: '24.5' },
  { surface: 'industrial-closures',    group: 'emergency',    code: 'EM-ICL-19', label: 'Industrial Closures',        purpose: 'Live closure ledger',                   archetype: 'emergency',   blueprintSection: '24.5' },
  { surface: 'redeployment-corridors', group: 'emergency',    code: 'EM-RDP-20', label: 'Redeployment Corridors',     purpose: 'Sector-to-sector redeployment',         archetype: 'emergency',   blueprintSection: '24.5' },
  { surface: 'emergency-programmes',   group: 'emergency',    code: 'EM-PRG-21', label: 'Emergency Programmes',       purpose: 'Bridge, reskilling & relocation',       archetype: 'emergency',   blueprintSection: '24.5' },
  // intelligence
  { surface: 'workforce-foresight',    group: 'intelligence', code: 'IN-FRS-22', label: 'Workforce Foresight',        purpose: 'Long-horizon workforce trajectory',     archetype: 'intelligence',blueprintSection: '24.6' },
  { surface: 'demand-forecast',        group: 'intelligence', code: 'IN-DMD-23', label: 'Labour Demand Forecast',     purpose: '25y demand & participation arc',        archetype: 'intelligence',blueprintSection: '24.6' },
  { surface: 'labour-market-anomalies',group: 'intelligence', code: 'IN-ANM-24', label: 'Labour Market Anomalies',    purpose: 'Anomaly detection feed',                archetype: 'intelligence',blueprintSection: '24.6' },
  // portal
  { surface: 'labour-portal',          group: 'portal',       code: 'PR-PRT-25', label: 'Public Labour Portal',       purpose: 'Citizen-facing portal',                 archetype: 'portal',      blueprintSection: '23.5' },
  { surface: 'employment-applications',group: 'portal',       code: 'PR-EMP-26', label: 'Employment Applications',    purpose: 'Application docket',                    archetype: 'portal',      blueprintSection: '23.5' },
  { surface: 'pension-requests',       group: 'portal',       code: 'PR-PEN-27', label: 'Pension Requests',           purpose: 'Pension access docket',                 archetype: 'portal',      blueprintSection: '23.5' },
  { surface: 'labour-complaints',      group: 'portal',       code: 'PR-CMP-28', label: 'Labour Complaints',          purpose: 'Citizen complaint docket',              archetype: 'portal',      blueprintSection: '23.5' },
  { surface: 'vocational-enrolments',  group: 'portal',       code: 'PR-VOC-29', label: 'Vocational Enrolments',      purpose: 'Apprenticeship & reskilling',           archetype: 'portal',      blueprintSection: '23.5' },
  { surface: 'labour-advisories',      group: 'portal',       code: 'PR-ADV-30', label: 'Labour Advisories',          purpose: 'Public advisory feed',                  archetype: 'portal',      blueprintSection: '23.5' },
  // legacy
  { surface: 'social-continuity-crisis',group: 'continuity',  code: 'CN-CRS-31', label: 'Social Continuity Crisis',   purpose: 'Crisis continuity (legacy)',            archetype: 'continuity',  blueprintSection: '23.3' },
  { surface: 'labour-recovery',        group: 'emergency',    code: 'EM-REC-32', label: 'Labour Recovery (legacy)',   purpose: 'Recovery board (legacy)',               archetype: 'emergency',   blueprintSection: '24.5' },
  // oversight
  { surface: 'labour-safeguards',      group: 'oversight',    code: 'OV-SFG-33', label: 'Labour Safeguards',          purpose: 'LABOUR_EXTENDED_SAFEGUARDS contract',   archetype: 'oversight',   blueprintSection: '24.7' },
  { surface: 'workplace-safety-audit', group: 'oversight',    code: 'OV-SFA-34', label: 'Workplace Safety Audit',     purpose: 'Workplace-safety audit & ratios',       archetype: 'oversight',   blueprintSection: '24.7' },
];

const BY_SURFACE = new Map(LABOUR_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: LabourSurfaceId | string): LabourDomain | undefined {
  return BY_SURFACE.get(surface as LabourSurfaceId);
}

export const LABOUR_LEGACY_KEYS: Record<string, LabourSurfaceId> = {
  employment: 'employment-board',
  inspection: 'workplace-inspections',
  insurance: 'pension-board',
  disputes: 'tribunal-lanes',
  'workforce-command': 'workforce-command',
  'social-protection': 'social-protection',
  'demographic-analytics': 'demographic-analytics',
  'social-continuity': 'social-continuity-crisis',
  'labour-recovery': 'labour-recovery',
  'workplace-rights': 'workplace-rights',
  'labour-portal': 'labour-portal',
};

export function resolveLabourSurface(key: string | null | undefined): LabourSurfaceId {
  if (!key) return 'workforce-command';
  if (BY_SURFACE.has(key as LabourSurfaceId)) return key as LabourSurfaceId;
  return LABOUR_LEGACY_KEYS[key] ?? 'workforce-command';
}
