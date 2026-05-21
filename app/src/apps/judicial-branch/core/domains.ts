// apps/judicial-branch/core — Judicial Branch domain registry.

import type { JudicialArchetype } from '@/apps/judicial-branch/design-system/judicial-ds';

export type JudicialGroupKey =
  | 'apex' | 'courts' | 'cases' | 'justices'
  | 'reasoning' | 'conduct' | 'rights' | 'portal' | 'safeguards';

export interface JudicialGroup {
  key: JudicialGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type JudicialSurfaceId =
  | 'apex-bench' | 'apex-posture' | 'separation-of-powers'
  | 'constitutional-court' | 'supreme-court' | 'appeals-court' | 'trial-court' | 'tribunals'
  | 'case-docket' | 'constitutional-cases' | 'criminal-appeals' | 'civil-appeals' | 'commercial-cases'
  | 'justices-register' | 'appointments-pipeline' | 'tenure-board'
  | 'open-reasoning' | 'recent-decisions' | 'doctrine-library'
  | 'judicial-conduct' | 'civilian-panel-reviews' | 'conduct-tribunal'
  | 'rights-framework' | 'counsel-network' | 'legal-aid-bench'
  | 'watch-live' | 'case-search' | 'court-locator' | 'civic-education'
  | 'judicial-safeguards' | 'independence-audit' | 'apex-audit';

export interface JudicialDomain {
  surface: JudicialSurfaceId;
  group: JudicialGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: JudicialArchetype;
  blueprintSection: string;
}

export const JUDICIAL_GROUPS: JudicialGroup[] = [
  { key: 'apex',       label: 'Apex Bench',         purpose: 'Constitutional Court & posture',           blueprintSection: '8.1' },
  { key: 'courts',     label: 'Court Tiers',         purpose: 'Constitutional / Supreme / Appeals / Trial / Tribunal', blueprintSection: '8.2' },
  { key: 'cases',      label: 'Case Docket',         purpose: 'Active case docket by kind',               blueprintSection: '8.3' },
  { key: 'justices',   label: 'Justices Bench',      purpose: 'Justices, appointments, tenure',           blueprintSection: '8.4' },
  { key: 'reasoning',  label: 'Open Reasoning',      purpose: 'Decisions & doctrine library',             blueprintSection: '8.5' },
  { key: 'conduct',    label: 'Judicial Conduct',    purpose: 'Conduct reviews & tribunal',               blueprintSection: '8.6' },
  { key: 'rights',     label: 'Citizen Rights',      purpose: 'Counsel network & legal-aid',              blueprintSection: '8.7' },
  { key: 'portal',     label: 'Public Portal',       purpose: 'Watch live, search, locator',              blueprintSection: '8.8' },
  { key: 'safeguards', label: 'Sovereign Safeguards',purpose: 'Independence & audit',                     blueprintSection: '8.9' },
];

export const JUDICIAL_DOMAINS: JudicialDomain[] = [
  { surface: 'apex-bench',             group: 'apex',       code: 'AP-BNC-01', label: 'Apex Bench',             purpose: 'Constitutional Court command',     archetype: 'apex',       blueprintSection: '8.1' },
  { surface: 'apex-posture',           group: 'apex',       code: 'AP-PST-02', label: 'Apex Posture',           purpose: 'Posture & deliberation',           archetype: 'apex',       blueprintSection: '8.1' },
  { surface: 'separation-of-powers',   group: 'apex',       code: 'AP-SOP-03', label: 'Separation of Powers',   purpose: 'Branch-relationship monitor',       archetype: 'apex',       blueprintSection: '8.1' },
  { surface: 'constitutional-court',   group: 'courts',     code: 'CT-CON-04', label: 'Constitutional Court',   purpose: 'Constitutional review docket',     archetype: 'court',      blueprintSection: '8.2' },
  { surface: 'supreme-court',          group: 'courts',     code: 'CT-SUP-05', label: 'Supreme Court',          purpose: 'Apex appellate docket',            archetype: 'court',      blueprintSection: '8.2' },
  { surface: 'appeals-court',          group: 'courts',     code: 'CT-APP-06', label: 'Appeals Court',          purpose: 'Appeals tier',                     archetype: 'court',      blueprintSection: '8.2' },
  { surface: 'trial-court',            group: 'courts',     code: 'CT-TRL-07', label: 'Trial Court',            purpose: 'Trial-tier load',                  archetype: 'court',      blueprintSection: '8.2' },
  { surface: 'tribunals',              group: 'courts',     code: 'CT-TRB-08', label: 'Tribunals',              purpose: 'Specialist tribunals',             archetype: 'court',      blueprintSection: '8.2' },
  { surface: 'case-docket',            group: 'cases',      code: 'CS-DKT-09', label: 'Case Docket',            purpose: 'Active case docket',               archetype: 'case',       blueprintSection: '8.3' },
  { surface: 'constitutional-cases',   group: 'cases',      code: 'CS-CON-10', label: 'Constitutional Cases',   purpose: 'Constitutional matters',           archetype: 'case',       blueprintSection: '8.3' },
  { surface: 'criminal-appeals',       group: 'cases',      code: 'CS-CRA-11', label: 'Criminal Appeals',       purpose: 'Criminal appeals docket',          archetype: 'case',       blueprintSection: '8.3' },
  { surface: 'civil-appeals',          group: 'cases',      code: 'CS-CIV-12', label: 'Civil Appeals',          purpose: 'Civil appeals docket',             archetype: 'case',       blueprintSection: '8.3' },
  { surface: 'commercial-cases',       group: 'cases',      code: 'CS-COM-13', label: 'Commercial Cases',       purpose: 'Commercial docket',                archetype: 'case',       blueprintSection: '8.3' },
  { surface: 'justices-register',      group: 'justices',   code: 'JS-REG-14', label: 'Justices Register',      purpose: 'Per-justice dossier',              archetype: 'justice',    blueprintSection: '8.4' },
  { surface: 'appointments-pipeline',  group: 'justices',   code: 'JS-APP-15', label: 'Appointments Pipeline',  purpose: 'Appointment & confirmation queue', archetype: 'justice',    blueprintSection: '8.4' },
  { surface: 'tenure-board',           group: 'justices',   code: 'JS-TEN-16', label: 'Tenure Board',           purpose: 'Term remaining & rotation',         archetype: 'justice',    blueprintSection: '8.4' },
  { surface: 'open-reasoning',         group: 'reasoning',  code: 'RS-OPN-17', label: 'Open Reasoning',         purpose: 'Decisions published with reasoning',archetype: 'reasoning',  blueprintSection: '8.5' },
  { surface: 'recent-decisions',       group: 'reasoning',  code: 'RS-REC-18', label: 'Recent Decisions',       purpose: 'Latest published decisions',        archetype: 'reasoning',  blueprintSection: '8.5' },
  { surface: 'doctrine-library',       group: 'reasoning',  code: 'RS-DOC-19', label: 'Doctrine Library',       purpose: 'Constitutional doctrine library',  archetype: 'reasoning',  blueprintSection: '8.5' },
  { surface: 'judicial-conduct',       group: 'conduct',    code: 'CD-JUD-20', label: 'Judicial Conduct',       purpose: 'Conduct case docket',              archetype: 'conduct',    blueprintSection: '8.6' },
  { surface: 'civilian-panel-reviews', group: 'conduct',    code: 'CD-CIV-21', label: 'Civilian-Panel Reviews', purpose: 'Independent panel reviews',         archetype: 'conduct',    blueprintSection: '8.6' },
  { surface: 'conduct-tribunal',       group: 'conduct',    code: 'CD-TRB-22', label: 'Conduct Tribunal',       purpose: 'Misconduct tribunal',              archetype: 'conduct',    blueprintSection: '8.6' },
  { surface: 'rights-framework',       group: 'rights',     code: 'RT-FRM-23', label: 'Rights Framework',       purpose: 'Constitutional rights framework',  archetype: 'rights',     blueprintSection: '8.7' },
  { surface: 'counsel-network',        group: 'rights',     code: 'RT-CNS-24', label: 'Counsel Network',        purpose: 'Counsel directory',                archetype: 'rights',     blueprintSection: '8.7' },
  { surface: 'legal-aid-bench',        group: 'rights',     code: 'RT-LGL-25', label: 'Legal Aid Bench',        purpose: 'Pro-bono legal aid network',       archetype: 'rights',     blueprintSection: '8.7' },
  { surface: 'watch-live',             group: 'portal',     code: 'PT-LIV-26', label: 'Watch Live',             purpose: 'Public hearing livestream',         archetype: 'portal',     blueprintSection: '8.8' },
  { surface: 'case-search',            group: 'portal',     code: 'PT-SRC-27', label: 'Case Search',            purpose: 'Full-text case search',             archetype: 'portal',     blueprintSection: '8.8' },
  { surface: 'court-locator',          group: 'portal',     code: 'PT-LCT-28', label: 'Court Locator',          purpose: 'National court locator',           archetype: 'portal',     blueprintSection: '8.8' },
  { surface: 'civic-education',        group: 'portal',     code: 'PT-CIV-29', label: 'Civic Education',        purpose: 'Rights & justice civic education',  archetype: 'portal',     blueprintSection: '8.8' },
  { surface: 'judicial-safeguards',    group: 'safeguards', code: 'SF-JUD-30', label: 'Judicial Safeguards',    purpose: 'JUDICIAL_BRANCH_SAFEGUARDS',       archetype: 'safeguards', blueprintSection: '8.9' },
  { surface: 'independence-audit',     group: 'safeguards', code: 'SF-IND-31', label: 'Independence Audit',     purpose: 'Judicial-independence audit',       archetype: 'safeguards', blueprintSection: '8.9' },
  { surface: 'apex-audit',             group: 'safeguards', code: 'SF-APX-32', label: 'Apex Audit',             purpose: 'Cross-branch apex audit',           archetype: 'safeguards', blueprintSection: '8.9' },
];

const BY_SURFACE = new Map(JUDICIAL_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: JudicialSurfaceId | string): JudicialDomain | undefined {
  return BY_SURFACE.get(surface as JudicialSurfaceId);
}

export const JUDICIAL_LEGACY_KEYS: Record<string, JudicialSurfaceId> = {
  constitutional: 'constitutional-court',
  supreme: 'supreme-court',
  appeals: 'appeals-court',
  trial: 'trial-court',
  cases: 'case-docket',
  evidence: 'case-docket',
  corrections: 'rights-framework',
  live: 'apex-bench',
  operations: 'case-docket',
};

export function resolveJudicialSurface(key: string | null | undefined): JudicialSurfaceId {
  if (!key) return 'apex-bench';
  if (BY_SURFACE.has(key as JudicialSurfaceId)) return key as JudicialSurfaceId;
  return JUDICIAL_LEGACY_KEYS[key] ?? 'apex-bench';
}

export function judicialNav(): { key: string; label: string }[] {
  return JUDICIAL_GROUPS.map(g => ({ key: JUDICIAL_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
