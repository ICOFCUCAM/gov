// apps/assembly/core — National Assembly domain registry.

import type { AssemblyArchetype } from '@/apps/assembly/design-system/assembly-ds';

export type AssemblyGroupKey =
  | 'chamber' | 'bills' | 'budget' | 'petitions'
  | 'oversight' | 'records' | 'committees' | 'portal' | 'ethics' | 'safeguards';

export interface AssemblyGroup {
  key: AssemblyGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type AssemblySurfaceId =
  | 'assembly-floor' | 'plenary-posture' | 'members-register' | 'voting-blocs'
  | 'bill-pipeline' | 'first-reading' | 'third-reading' | 'sent-to-senate'
  | 'budget-cycle' | 'appropriation-bill' | 'audit-findings'
  | 'citizen-petitions' | 'petition-debate-queue'
  | 'question-time' | 'ministerial-statements' | 'cabinet-summons'
  | 'hansard' | 'roll-call-records' | 'sessions-calendar'
  | 'standing-committees' | 'select-committees' | 'inquiries'
  | 'watch-live' | 'members-directory' | 'youth-parliament'
  | 'code-of-conduct' | 'conflicts-of-interest' | 'misconduct-tribunal'
  | 'assembly-safeguards' | 'public-voting-doctrine' | 'sovereign-audit';

export interface AssemblyDomain {
  surface: AssemblySurfaceId;
  group: AssemblyGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: AssemblyArchetype;
  blueprintSection: string;
}

export const ASSEMBLY_GROUPS: AssemblyGroup[] = [
  { key: 'chamber',    label: 'Chamber Floor',         purpose: 'Plenary, members & blocs',                blueprintSection: '7.1' },
  { key: 'bills',      label: 'Bill Pipeline',         purpose: 'First reading, committee, third reading',  blueprintSection: '7.2' },
  { key: 'budget',     label: 'Budget Appropriation',  purpose: 'Annual budget & audit findings',           blueprintSection: '7.3' },
  { key: 'petitions',  label: 'Citizen Petitions',     purpose: '5000-signature petition pipeline',         blueprintSection: '7.4' },
  { key: 'oversight',  label: 'Question Time',         purpose: 'Question Time & cabinet summons',          blueprintSection: '7.5' },
  { key: 'records',    label: 'Hansard & Records',     purpose: 'Hansard, roll-call & calendar',           blueprintSection: '7.6' },
  { key: 'committees', label: 'Committees',            purpose: 'Standing, select & investigative',         blueprintSection: '7.7' },
  { key: 'portal',     label: 'Citizen Portal',        purpose: 'Watch live, directory, youth parliament',  blueprintSection: '7.8' },
  { key: 'ethics',     label: 'Conduct & Ethics',      purpose: 'Code of conduct & misconduct tribunal',    blueprintSection: '7.9' },
  { key: 'safeguards', label: 'Sovereign Safeguards',  purpose: 'Public-voting doctrine & audit',          blueprintSection: '7.10' },
];

export const ASSEMBLY_DOMAINS: AssemblyDomain[] = [
  { surface: 'assembly-floor',          group: 'chamber',    code: 'CH-FLR-01', label: 'Assembly Floor',         purpose: 'Live plenary command surface',     archetype: 'chamber',    blueprintSection: '7.1' },
  { surface: 'plenary-posture',         group: 'chamber',    code: 'CH-PST-02', label: 'Plenary Posture',        purpose: 'Posture, quorum, attendance',       archetype: 'chamber',    blueprintSection: '7.1' },
  { surface: 'members-register',        group: 'chamber',    code: 'CH-REG-03', label: 'Members Register',       purpose: 'Per-member dossier',                archetype: 'chamber',    blueprintSection: '7.1' },
  { surface: 'voting-blocs',            group: 'chamber',    code: 'CH-BLC-04', label: 'Voting Blocs',           purpose: 'Government / opposition / cross',   archetype: 'chamber',    blueprintSection: '7.1' },
  { surface: 'bill-pipeline',           group: 'bills',      code: 'BL-PIP-05', label: 'Bill Pipeline',          purpose: 'All active bills',                  archetype: 'bills',      blueprintSection: '7.2' },
  { surface: 'first-reading',           group: 'bills',      code: 'BL-1RD-06', label: 'First Reading',          purpose: 'Bills in first reading',            archetype: 'bills',      blueprintSection: '7.2' },
  { surface: 'third-reading',           group: 'bills',      code: 'BL-3RD-07', label: 'Third Reading',          purpose: 'Bills in third reading',            archetype: 'bills',      blueprintSection: '7.2' },
  { surface: 'sent-to-senate',          group: 'bills',      code: 'BL-SEN-08', label: 'Sent to Senate',         purpose: 'Bills handed to upper chamber',     archetype: 'bills',      blueprintSection: '7.2' },
  { surface: 'budget-cycle',            group: 'budget',     code: 'BD-CYC-09', label: 'Budget Cycle',           purpose: 'Annual budget appropriation',       archetype: 'budget',     blueprintSection: '7.3' },
  { surface: 'appropriation-bill',      group: 'budget',     code: 'BD-APP-10', label: 'Appropriation Bill',     purpose: 'Active appropriation bill',         archetype: 'budget',     blueprintSection: '7.3' },
  { surface: 'audit-findings',          group: 'budget',     code: 'BD-AUD-11', label: 'Audit Findings',         purpose: 'Audit findings tabled to chamber',  archetype: 'budget',     blueprintSection: '7.3' },
  { surface: 'citizen-petitions',       group: 'petitions',  code: 'PT-ACT-12', label: 'Citizen Petitions',      purpose: 'Active citizen petitions',          archetype: 'petitions',  blueprintSection: '7.4' },
  { surface: 'petition-debate-queue',   group: 'petitions',  code: 'PT-DBQ-13', label: 'Petition Debate Queue',  purpose: 'Petitions awaiting plenary debate', archetype: 'petitions',  blueprintSection: '7.4' },
  { surface: 'question-time',           group: 'oversight',  code: 'OV-QTM-14', label: 'Question Time',          purpose: 'Weekly ministerial Question Time',  archetype: 'oversight',  blueprintSection: '7.5' },
  { surface: 'ministerial-statements',  group: 'oversight',  code: 'OV-MIN-15', label: 'Ministerial Statements', purpose: 'Statements & dispatches',           archetype: 'oversight',  blueprintSection: '7.5' },
  { surface: 'cabinet-summons',         group: 'oversight',  code: 'OV-CAB-16', label: 'Cabinet Summons',        purpose: 'Active cabinet summons',            archetype: 'oversight',  blueprintSection: '7.5' },
  { surface: 'hansard',                 group: 'records',    code: 'RC-HSD-17', label: 'Hansard',                purpose: 'Full plenary transcripts',          archetype: 'records',    blueprintSection: '7.6' },
  { surface: 'roll-call-records',       group: 'records',    code: 'RC-RCL-18', label: 'Roll-Call Records',      purpose: 'Per-vote roll-call records',        archetype: 'records',    blueprintSection: '7.6' },
  { surface: 'sessions-calendar',       group: 'records',    code: 'RC-CAL-19', label: 'Sessions Calendar',      purpose: 'Plenary & committee calendar',      archetype: 'records',    blueprintSection: '7.6' },
  { surface: 'standing-committees',     group: 'committees', code: 'CM-STD-20', label: 'Standing Committees',    purpose: 'Permanent committees',              archetype: 'committees', blueprintSection: '7.7' },
  { surface: 'select-committees',       group: 'committees', code: 'CM-SEL-21', label: 'Select Committees',      purpose: 'Time-bound committees',             archetype: 'committees', blueprintSection: '7.7' },
  { surface: 'inquiries',               group: 'committees', code: 'CM-INQ-22', label: 'Committee Inquiries',    purpose: 'Active investigative inquiries',    archetype: 'committees', blueprintSection: '7.7' },
  { surface: 'watch-live',              group: 'portal',     code: 'PT-LIV-23', label: 'Watch Live',             purpose: 'Plenary & committee livestream',    archetype: 'portal',     blueprintSection: '7.8' },
  { surface: 'members-directory',       group: 'portal',     code: 'PT-DIR-24', label: 'Members Directory',      purpose: 'Public member directory',           archetype: 'portal',     blueprintSection: '7.8' },
  { surface: 'youth-parliament',        group: 'portal',     code: 'PT-YTH-25', label: 'Youth Parliament',       purpose: 'Annual youth sitting',              archetype: 'portal',     blueprintSection: '7.8' },
  { surface: 'code-of-conduct',         group: 'ethics',     code: 'ET-COC-26', label: 'Code of Conduct',        purpose: 'Conduct standards & enforcement',   archetype: 'ethics',     blueprintSection: '7.9' },
  { surface: 'conflicts-of-interest',   group: 'ethics',     code: 'ET-COI-27', label: 'Conflicts of Interest',  purpose: 'Per-member disclosure',             archetype: 'ethics',     blueprintSection: '7.9' },
  { surface: 'misconduct-tribunal',     group: 'ethics',     code: 'ET-MIS-28', label: 'Misconduct Tribunal',    purpose: 'Assembly misconduct tribunal',      archetype: 'ethics',     blueprintSection: '7.9' },
  { surface: 'assembly-safeguards',     group: 'safeguards', code: 'SF-ASM-29', label: 'Assembly Safeguards',    purpose: 'ASSEMBLY_SAFEGUARDS contract',      archetype: 'safeguards', blueprintSection: '7.10' },
  { surface: 'public-voting-doctrine',  group: 'safeguards', code: 'SF-PVO-30', label: 'Public Voting Doctrine', purpose: 'Public voting as default',          archetype: 'safeguards', blueprintSection: '7.10' },
  { surface: 'sovereign-audit',         group: 'safeguards', code: 'SF-AUD-31', label: 'Sovereign Audit',        purpose: 'Cross-chamber audit interface',     archetype: 'safeguards', blueprintSection: '7.10' },
];

const BY_SURFACE = new Map(ASSEMBLY_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: AssemblySurfaceId | string): AssemblyDomain | undefined {
  return BY_SURFACE.get(surface as AssemblySurfaceId);
}

export const ASSEMBLY_LEGACY_KEYS: Record<string, AssemblySurfaceId> = {
  bills: 'bill-pipeline',
  chambers: 'assembly-floor',
  committees: 'standing-committees',
  voting: 'roll-call-records',
  oversight: 'question-time',
  budget: 'budget-cycle',
  appropriation: 'appropriation-bill',
  live: 'assembly-floor',
};

export function resolveAssemblySurface(key: string | null | undefined): AssemblySurfaceId {
  if (!key) return 'assembly-floor';
  if (BY_SURFACE.has(key as AssemblySurfaceId)) return key as AssemblySurfaceId;
  return ASSEMBLY_LEGACY_KEYS[key] ?? 'assembly-floor';
}

export function assemblyNav(): { key: string; label: string }[] {
  return ASSEMBLY_GROUPS.map(g => ({ key: ASSEMBLY_DOMAINS.find(d => d.group === g.key)!.surface, label: g.label }));
}
