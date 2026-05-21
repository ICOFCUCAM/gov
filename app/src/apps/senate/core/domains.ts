// apps/senate/core — Senate domain registry.
//
// 30 typed surface ids across 10 groups citing §6 of the master
// blueprint (Sovereign Legislature — Upper Chamber).

import type { SenateArchetype } from '@/apps/senate/design-system/senate-ds';

export type SenateGroupKey =
  | 'chamber' | 'bills' | 'treaties' | 'committees'
  | 'oversight' | 'records' | 'foresight' | 'portal' | 'ethics' | 'safeguards';

export interface SenateGroup {
  key: SenateGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type SenateSurfaceId =
  // chamber
  | 'senate-floor' | 'plenary-posture' | 'senators-register' | 'voting-blocs'
  // bills
  | 'bill-pipeline' | 'second-reading' | 'amendment-docket' | 'conference-committee'
  // treaties
  | 'treaty-atlas' | 'ratification-queue' | 'public-consultation'
  // committees
  | 'standing-committees' | 'special-committees' | 'inquiries'
  // oversight
  | 'executive-oversight' | 'question-time' | 'cabinet-appearance'
  // records
  | 'hansard' | 'roll-call-records' | 'sessions-calendar'
  // foresight
  | 'strategic-foresight' | 'long-horizon-review'
  // portal
  | 'citizen-petitions' | 'watch-live' | 'senators-directory'
  // ethics
  | 'code-of-conduct' | 'conflicts-of-interest' | 'misconduct-tribunal'
  // safeguards
  | 'senate-safeguards' | 'override-doctrine' | 'sovereign-audit';

export interface SenateDomain {
  surface: SenateSurfaceId;
  group: SenateGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: SenateArchetype;
  blueprintSection: string;
}

export const SENATE_GROUPS: SenateGroup[] = [
  { key: 'chamber',    label: 'Chamber Floor',           purpose: 'Plenary, senators & blocs',                  blueprintSection: '6.1' },
  { key: 'bills',      label: 'Bill Pipeline',           purpose: 'Second reading, amendment, conference',      blueprintSection: '6.2' },
  { key: 'treaties',   label: 'Treaty Docket',           purpose: 'Ratification queue & consultation',          blueprintSection: '6.3' },
  { key: 'committees', label: 'Committees',              purpose: 'Standing, special & investigative',           blueprintSection: '6.4' },
  { key: 'oversight',  label: 'Executive Oversight',     purpose: 'Question time & cabinet appearance',          blueprintSection: '6.5' },
  { key: 'records',    label: 'Hansard & Records',       purpose: 'Hansard, roll-call & calendar',              blueprintSection: '6.6' },
  { key: 'foresight',  label: 'Strategic Foresight',     purpose: 'Long-horizon legislative review',             blueprintSection: '6.7' },
  { key: 'portal',     label: 'Citizen Portal',          purpose: 'Petitions, watch live, directory',           blueprintSection: '6.8' },
  { key: 'ethics',     label: 'Conduct & Ethics',        purpose: 'Code of conduct & misconduct tribunal',       blueprintSection: '6.9' },
  { key: 'safeguards', label: 'Sovereign Safeguards',    purpose: 'Override doctrine & audit',                   blueprintSection: '6.10' },
];

export const SENATE_DOMAINS: SenateDomain[] = [
  { surface: 'senate-floor',          group: 'chamber',    code: 'CH-FLR-01', label: 'Senate Floor',           purpose: 'Live plenary command surface',     archetype: 'chamber',    blueprintSection: '6.1' },
  { surface: 'plenary-posture',       group: 'chamber',    code: 'CH-PST-02', label: 'Plenary Posture',        purpose: 'Posture, quorum, attendance',       archetype: 'chamber',    blueprintSection: '6.1' },
  { surface: 'senators-register',     group: 'chamber',    code: 'CH-REG-03', label: 'Senators Register',      purpose: 'Per-senator dossier',               archetype: 'chamber',    blueprintSection: '6.1' },
  { surface: 'voting-blocs',          group: 'chamber',    code: 'CH-BLC-04', label: 'Voting Blocs',           purpose: 'Government / opposition / cross',   archetype: 'chamber',    blueprintSection: '6.1' },
  { surface: 'bill-pipeline',         group: 'bills',      code: 'BL-PIP-05', label: 'Bill Pipeline',          purpose: 'All active bills',                  archetype: 'bills',      blueprintSection: '6.2' },
  { surface: 'second-reading',        group: 'bills',      code: 'BL-2RD-06', label: 'Second Reading',         purpose: 'Bills in second reading',           archetype: 'bills',      blueprintSection: '6.2' },
  { surface: 'amendment-docket',      group: 'bills',      code: 'BL-AMD-07', label: 'Amendment Docket',       purpose: 'Filed amendments',                  archetype: 'bills',      blueprintSection: '6.2' },
  { surface: 'conference-committee',  group: 'bills',      code: 'BL-CON-08', label: 'Conference Committee',   purpose: 'Inter-chamber reconciliation',      archetype: 'bills',      blueprintSection: '6.2' },
  { surface: 'treaty-atlas',          group: 'treaties',   code: 'TR-ATL-09', label: 'Treaty Atlas',           purpose: 'All treaties under review',         archetype: 'treaties',   blueprintSection: '6.3' },
  { surface: 'ratification-queue',    group: 'treaties',   code: 'TR-RAT-10', label: 'Ratification Queue',     purpose: 'Active ratifications',              archetype: 'treaties',   blueprintSection: '6.3' },
  { surface: 'public-consultation',   group: 'treaties',   code: 'TR-PUB-11', label: 'Public Consultation',    purpose: 'Citizen consultation windows',      archetype: 'treaties',   blueprintSection: '6.3' },
  { surface: 'standing-committees',   group: 'committees', code: 'CM-STD-12', label: 'Standing Committees',    purpose: 'Permanent committees',              archetype: 'committees', blueprintSection: '6.4' },
  { surface: 'special-committees',    group: 'committees', code: 'CM-SPC-13', label: 'Special Committees',     purpose: 'Time-bound committees',             archetype: 'committees', blueprintSection: '6.4' },
  { surface: 'inquiries',             group: 'committees', code: 'CM-INQ-14', label: 'Committee Inquiries',    purpose: 'Active investigative inquiries',    archetype: 'committees', blueprintSection: '6.4' },
  { surface: 'executive-oversight',   group: 'oversight',  code: 'OV-EXE-15', label: 'Executive Oversight',    purpose: 'Cabinet & ministry oversight',      archetype: 'oversight',  blueprintSection: '6.5' },
  { surface: 'question-time',         group: 'oversight',  code: 'OV-QTM-16', label: 'Question Time',          purpose: 'Ministerial question time',         archetype: 'oversight',  blueprintSection: '6.5' },
  { surface: 'cabinet-appearance',    group: 'oversight',  code: 'OV-CAB-17', label: 'Cabinet Appearance',     purpose: 'Cabinet appearance docket',         archetype: 'oversight',  blueprintSection: '6.5' },
  { surface: 'hansard',               group: 'records',    code: 'RC-HSD-18', label: 'Hansard',                purpose: 'Full plenary transcripts',          archetype: 'records',    blueprintSection: '6.6' },
  { surface: 'roll-call-records',     group: 'records',    code: 'RC-RCL-19', label: 'Roll-Call Records',      purpose: 'Per-vote roll-call records',        archetype: 'records',    blueprintSection: '6.6' },
  { surface: 'sessions-calendar',     group: 'records',    code: 'RC-CAL-20', label: 'Sessions Calendar',      purpose: 'Plenary & committee calendar',      archetype: 'records',    blueprintSection: '6.6' },
  { surface: 'strategic-foresight',   group: 'foresight',  code: 'FS-STR-21', label: 'Strategic Foresight',    purpose: '25-y legislative trajectory',       archetype: 'foresight',  blueprintSection: '6.7' },
  { surface: 'long-horizon-review',   group: 'foresight',  code: 'FS-LHR-22', label: 'Long-Horizon Review',    purpose: 'Generational policy review',        archetype: 'foresight',  blueprintSection: '6.7' },
  { surface: 'citizen-petitions',     group: 'portal',     code: 'PT-PET-23', label: 'Citizen Petitions',      purpose: 'Active petitions docket',           archetype: 'portal',     blueprintSection: '6.8' },
  { surface: 'watch-live',            group: 'portal',     code: 'PT-LIV-24', label: 'Watch Live',             purpose: 'Plenary livestream coordination',    archetype: 'portal',     blueprintSection: '6.8' },
  { surface: 'senators-directory',    group: 'portal',     code: 'PT-DIR-25', label: 'Senators Directory',     purpose: 'Public senator directory',          archetype: 'portal',     blueprintSection: '6.8' },
  { surface: 'code-of-conduct',       group: 'ethics',     code: 'ET-COC-26', label: 'Code of Conduct',        purpose: 'Conduct standards & enforcement',   archetype: 'ethics',     blueprintSection: '6.9' },
  { surface: 'conflicts-of-interest', group: 'ethics',     code: 'ET-COI-27', label: 'Conflicts of Interest',  purpose: 'Per-senator disclosure register',   archetype: 'ethics',     blueprintSection: '6.9' },
  { surface: 'misconduct-tribunal',   group: 'ethics',     code: 'ET-MIS-28', label: 'Misconduct Tribunal',    purpose: 'Senate misconduct tribunal',        archetype: 'ethics',     blueprintSection: '6.9' },
  { surface: 'senate-safeguards',     group: 'safeguards', code: 'SF-SEN-29', label: 'Senate Safeguards',      purpose: 'SENATE_SAFEGUARDS contract',        archetype: 'safeguards', blueprintSection: '6.10' },
  { surface: 'override-doctrine',     group: 'safeguards', code: 'SF-OVR-30', label: 'Override Doctrine',      purpose: 'Two-thirds override doctrine',      archetype: 'safeguards', blueprintSection: '6.10' },
  { surface: 'sovereign-audit',       group: 'safeguards', code: 'SF-AUD-31', label: 'Sovereign Audit',        purpose: 'Cross-chamber audit interface',     archetype: 'safeguards', blueprintSection: '6.10' },
];

const BY_SURFACE = new Map(SENATE_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: SenateSurfaceId | string): SenateDomain | undefined {
  return BY_SURFACE.get(surface as SenateSurfaceId);
}

export const SENATE_LEGACY_KEYS: Record<string, SenateSurfaceId> = {
  bills: 'bill-pipeline',
  chambers: 'senate-floor',
  committees: 'standing-committees',
  voting: 'roll-call-records',
  oversight: 'executive-oversight',
  treaties: 'treaty-atlas',
  live: 'senate-floor',
};

export function resolveSenateSurface(key: string | null | undefined): SenateSurfaceId {
  if (!key) return 'senate-floor';
  if (BY_SURFACE.has(key as SenateSurfaceId)) return key as SenateSurfaceId;
  return SENATE_LEGACY_KEYS[key] ?? 'senate-floor';
}

export function senateNav(): { key: string; label: string }[] {
  return SENATE_GROUPS.map(g => ({ key: SENATE_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
