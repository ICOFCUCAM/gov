// apps/ministry-education/core — Education domain registry.
//
// 30+ typed surface ids across 10 groups citing §14 of the master
// blueprint. Layered on education-systems + knowledge-development
// + knowledge-continuity.

import type { EducationArchetype } from '@/apps/ministry-education/design-system/education-ds';

export type EducationGroupKey =
  | 'command' | 'institutions' | 'cohorts' | 'research'
  | 'knowledge' | 'curriculum' | 'continuity' | 'memory' | 'portal' | 'oversight'
  | 'futurist';

export interface EducationGroup {
  key: EducationGroupKey;
  label: string;
  purpose: string;
  blueprintSection: string;
}

export type EducationSurfaceId =
  // futurist (front of menu — defines the leap)
  | 'sovereign-learner-twin' | 'ai-tutor-mesh' | 'neural-curriculum-graph'
  | 'civilizational-projection' | 'generational-foresight' | 'public-institution-index'
  // command
  | 'education-command' | 'literacy-board' | 'regional-literacy'
  // institutions
  | 'institutions-lineage' | 'primary-secondary' | 'tertiary' | 'teacher-colleges'
  // cohorts
  | 'generational-cohorts' | 'workforce-readiness' | 'cohort-equality'
  // research
  | 'research-lineage' | 'research-programmes' | 'strategic-research-priority'
  // knowledge
  | 'knowledge-infrastructure' | 'remote-learning' | 'archival-records' | 'bandwidth-equity'
  // curriculum
  | 'curriculum-board' | 'examination-board' | 'teacher-workforce' | 'student-services'
  // continuity
  | 'continuity-chamber' | 'education-incidents' | 'school-disruption' | 'exam-integrity'
  // memory
  | 'civilizational-memory' | 'historical-archives' | 'constitutional-literacy' | 'civic-education'
  // portal
  | 'student-applications' | 'scholarship-portal' | 'public-advisories'
  // oversight
  | 'knowledge-safeguards' | 'pluralism-audit';

export interface EducationDomain {
  surface: EducationSurfaceId;
  group: EducationGroupKey;
  code: string;
  label: string;
  purpose: string;
  archetype: EducationArchetype;
  blueprintSection: string;
}

export const EDUCATION_GROUPS: EducationGroup[] = [
  { key: 'futurist',     label: 'Futurist Mesh',         purpose: 'Sovereign Learner Twin, AI Tutor Mesh, neural curriculum', blueprintSection: '14.0' },
  { key: 'command',      label: 'Education Command',     purpose: 'National literacy command',                  blueprintSection: '14.1' },
  { key: 'institutions', label: 'Institutions',          purpose: 'Schools, universities, teacher colleges',    blueprintSection: '14.2' },
  { key: 'cohorts',      label: 'Generational Cohorts',  purpose: 'Per-cohort readiness & equality',            blueprintSection: '14.3' },
  { key: 'research',     label: 'Research Lineage',      purpose: 'Research programmes & priority',             blueprintSection: '14.4' },
  { key: 'knowledge',    label: 'Knowledge Infra',       purpose: 'Remote learning & archival',                 blueprintSection: '14.5' },
  { key: 'curriculum',   label: 'Curriculum & Faculty',  purpose: 'Curriculum, exams, teachers, students',      blueprintSection: '14.6' },
  { key: 'continuity',   label: 'Continuity Operations', purpose: 'Crisis & incident response',                  blueprintSection: '14.7' },
  { key: 'memory',       label: 'Civilizational Memory', purpose: 'Historical & constitutional memory',          blueprintSection: '14.8' },
  { key: 'portal',       label: 'Public Education',      purpose: 'Citizen applications & advisories',           blueprintSection: '14.9' },
  { key: 'oversight',    label: 'Sovereign Oversight',   purpose: 'Knowledge safeguards & pluralism audit',      blueprintSection: '14.10' },
];

export const EDUCATION_DOMAINS: EducationDomain[] = [
  // futurist mesh — leads the menu
  { surface: 'sovereign-learner-twin',    group: 'futurist',     code: 'FT-LRN-00', label: 'Sovereign Learner Twin',     purpose: 'Privacy-preserving learner companion',   archetype: 'knowledge',   blueprintSection: '14.0' },
  { surface: 'ai-tutor-mesh',             group: 'futurist',     code: 'FT-AIT-00', label: 'AI Tutor Mesh',              purpose: 'National AI-tutor mesh hubs',            archetype: 'knowledge',   blueprintSection: '14.0' },
  { surface: 'neural-curriculum-graph',   group: 'futurist',     code: 'FT-NCG-00', label: 'Neural Curriculum Graph',    purpose: 'Adaptive cross-subject curriculum graph', archetype: 'curriculum', blueprintSection: '14.0' },
  { surface: 'civilizational-projection', group: 'futurist',     code: 'FT-CVP-00', label: 'Civilizational Projection',  purpose: '100y intergenerational projection',      archetype: 'memory',      blueprintSection: '14.0' },
  { surface: 'generational-foresight',    group: 'futurist',     code: 'FT-GFR-00', label: 'Generational Foresight',     purpose: 'Cohort-by-cohort capability foresight',  archetype: 'cohorts',     blueprintSection: '14.0' },
  { surface: 'public-institution-index',  group: 'futurist',     code: 'FT-PII-00', label: 'Public Institution Index',   purpose: 'All Education public sites by branch',   archetype: 'institutions',blueprintSection: '14.0' },
  // command
  { surface: 'education-command',         group: 'command',      code: 'CM-EDU-01', label: 'National Education Command', purpose: 'Top-level education command',     archetype: 'command',     blueprintSection: '14.1' },
  { surface: 'literacy-board',            group: 'command',      code: 'CM-LIT-02', label: 'Literacy Board',             purpose: 'National literacy index',          archetype: 'command',     blueprintSection: '14.1' },
  { surface: 'regional-literacy',         group: 'command',      code: 'CM-RGN-03', label: 'Regional Literacy',          purpose: 'Per-region literacy & capability', archetype: 'command',     blueprintSection: '14.1' },
  // institutions
  { surface: 'institutions-lineage',      group: 'institutions', code: 'IN-LIN-04', label: 'Institutions Lineage',       purpose: 'Top-level institutions board',     archetype: 'institutions',blueprintSection: '14.2' },
  { surface: 'primary-secondary',         group: 'institutions', code: 'IN-PRI-05', label: 'Primary & Secondary',        purpose: 'Primary / secondary schools',      archetype: 'institutions',blueprintSection: '14.2' },
  { surface: 'tertiary',                  group: 'institutions', code: 'IN-TER-06', label: 'Tertiary & Research',        purpose: 'Universities & research bodies',   archetype: 'institutions',blueprintSection: '14.2' },
  { surface: 'teacher-colleges',          group: 'institutions', code: 'IN-TCH-07', label: 'Teacher Colleges',           purpose: 'Teacher-training institutions',    archetype: 'institutions',blueprintSection: '14.2' },
  // cohorts
  { surface: 'generational-cohorts',      group: 'cohorts',      code: 'CO-GEN-08', label: 'Generational Cohorts',       purpose: 'Per-cohort capability readiness',  archetype: 'cohorts',     blueprintSection: '14.3' },
  { surface: 'workforce-readiness',       group: 'cohorts',      code: 'CO-WRK-09', label: 'Workforce Readiness',        purpose: 'Tertiary-to-workforce pathway',    archetype: 'cohorts',     blueprintSection: '14.3' },
  { surface: 'cohort-equality',           group: 'cohorts',      code: 'CO-EQL-10', label: 'Cohort Equality',            purpose: 'Per-cohort inequality index',      archetype: 'cohorts',     blueprintSection: '14.3' },
  // research
  { surface: 'research-lineage',          group: 'research',     code: 'RS-LIN-11', label: 'Research Lineage',           purpose: 'Top-level research board',         archetype: 'research',    blueprintSection: '14.4' },
  { surface: 'research-programmes',       group: 'research',     code: 'RS-PRG-12', label: 'Research Programmes',        purpose: 'Per-programme funding & capability',archetype: 'research',    blueprintSection: '14.4' },
  { surface: 'strategic-research-priority', group: 'research',   code: 'RS-PRI-13', label: 'Strategic Research Priority',purpose: 'Core / advisory / sunset priority',archetype: 'research',    blueprintSection: '14.4' },
  // knowledge
  { surface: 'knowledge-infrastructure',  group: 'knowledge',    code: 'KN-INF-14', label: 'Knowledge Infrastructure',   purpose: 'Top-level knowledge infra',        archetype: 'knowledge',   blueprintSection: '14.5' },
  { surface: 'remote-learning',           group: 'knowledge',    code: 'KN-RML-15', label: 'Remote Learning',            purpose: 'Remote-learning coverage',         archetype: 'knowledge',   blueprintSection: '14.5' },
  { surface: 'archival-records',          group: 'knowledge',    code: 'KN-ARC-16', label: 'Archival Records',           purpose: 'National archival records',        archetype: 'knowledge',   blueprintSection: '14.5' },
  { surface: 'bandwidth-equity',          group: 'knowledge',    code: 'KN-BND-17', label: 'Bandwidth Equity',           purpose: 'Per-region bandwidth equity',      archetype: 'knowledge',   blueprintSection: '14.5' },
  // curriculum
  { surface: 'curriculum-board',          group: 'curriculum',   code: 'CR-BRD-18', label: 'Curriculum Board',           purpose: 'Curriculum operations',            archetype: 'curriculum',  blueprintSection: '14.6' },
  { surface: 'examination-board',         group: 'curriculum',   code: 'CR-EXM-19', label: 'Examination Board',          purpose: 'National examination cycle',       archetype: 'curriculum',  blueprintSection: '14.6' },
  { surface: 'teacher-workforce',         group: 'curriculum',   code: 'CR-TCH-20', label: 'Teacher Workforce',          purpose: 'Per-region teacher posture',       archetype: 'curriculum',  blueprintSection: '14.6' },
  { surface: 'student-services',          group: 'curriculum',   code: 'CR-STD-21', label: 'Student Services',           purpose: 'Per-region student services',      archetype: 'curriculum',  blueprintSection: '14.6' },
  // continuity
  { surface: 'continuity-chamber',        group: 'continuity',   code: 'CN-CHM-22', label: 'Continuity Foresight Chamber',purpose: 'Top-level continuity board',      archetype: 'continuity',  blueprintSection: '14.7' },
  { surface: 'education-incidents',       group: 'continuity',   code: 'CN-INC-23', label: 'Education Incidents',        purpose: 'Live incident ledger',             archetype: 'continuity',  blueprintSection: '14.7' },
  { surface: 'school-disruption',         group: 'continuity',   code: 'CN-SCH-24', label: 'School Disruption',          purpose: 'Active school disruption',         archetype: 'continuity',  blueprintSection: '14.7' },
  { surface: 'exam-integrity',            group: 'continuity',   code: 'CN-EXM-25', label: 'Exam Integrity',             purpose: 'Examination integrity board',      archetype: 'continuity',  blueprintSection: '14.7' },
  // memory
  { surface: 'civilizational-memory',     group: 'memory',       code: 'CM-MEM-26', label: 'Civilizational Memory',      purpose: 'Top-level memory board',           archetype: 'memory',      blueprintSection: '14.8' },
  { surface: 'historical-archives',       group: 'memory',       code: 'CM-HIS-27', label: 'Historical Archives',        purpose: 'Historical archive preservation',  archetype: 'memory',      blueprintSection: '14.8' },
  { surface: 'constitutional-literacy',   group: 'memory',       code: 'CM-CON-28', label: 'Constitutional Literacy',    purpose: 'Constitutional literacy index',    archetype: 'memory',      blueprintSection: '14.8' },
  { surface: 'civic-education',           group: 'memory',       code: 'CM-CIV-29', label: 'Civic Education',            purpose: 'Civic-education board',            archetype: 'memory',      blueprintSection: '14.8' },
  // portal
  { surface: 'student-applications',      group: 'portal',       code: 'PR-APP-30', label: 'Student Applications',       purpose: 'Application docket',               archetype: 'portal',      blueprintSection: '14.9' },
  { surface: 'scholarship-portal',        group: 'portal',       code: 'PR-SCH-31', label: 'Scholarship Portal',         purpose: 'Scholarship & grant flow',         archetype: 'portal',      blueprintSection: '14.9' },
  { surface: 'public-advisories',         group: 'portal',       code: 'PR-ADV-32', label: 'Public Advisories',          purpose: 'Public advisory feed',             archetype: 'portal',      blueprintSection: '14.9' },
  // oversight
  { surface: 'knowledge-safeguards',      group: 'oversight',    code: 'OV-SFG-33', label: 'Knowledge Safeguards',       purpose: 'KNOWLEDGE_SAFEGUARDS contract',    archetype: 'oversight',   blueprintSection: '14.10' },
  { surface: 'pluralism-audit',           group: 'oversight',    code: 'OV-PLR-34', label: 'Pluralism Audit',            purpose: 'Pluralism & non-conformity audit', archetype: 'oversight',   blueprintSection: '14.10' },
];

const BY_SURFACE = new Map(EDUCATION_DOMAINS.map(d => [d.surface, d]));

export function domainBySurface(surface: EducationSurfaceId | string): EducationDomain | undefined {
  return BY_SURFACE.get(surface as EducationSurfaceId);
}

export const EDUCATION_LEGACY_KEYS: Record<string, EducationSurfaceId> = {
  command: 'education-command',
  schools: 'primary-secondary',
  exams: 'examination-board',
  teachers: 'teacher-workforce',
  curriculum: 'curriculum-board',
  research: 'research-lineage',
  'education-command': 'education-command',
  'institutions-lineage': 'institutions-lineage',
  'knowledge-infrastructure': 'knowledge-infrastructure',
  'continuity-chamber': 'continuity-chamber',
};

export function resolveEducationSurface(key: string | null | undefined): EducationSurfaceId {
  if (!key) return 'education-command';
  if (BY_SURFACE.has(key as EducationSurfaceId)) return key as EducationSurfaceId;
  return EDUCATION_LEGACY_KEYS[key] ?? 'education-command';
}
