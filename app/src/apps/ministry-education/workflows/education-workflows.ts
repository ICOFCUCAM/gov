// apps/ministry-education/workflows — executable workflow contracts.

import type { EducationArchetype } from '@/apps/ministry-education/design-system/education-ds';

export type EducationStepKind =
  | 'submission' | 'review' | 'decision' | 'execution'
  | 'response' | 'consultation' | 'sealing' | 'audit';

export interface EducationWorkflowStep {
  id: string;
  kind: EducationStepKind;
  title: string;
  role:
    | 'applicant' | 'curriculum-officer' | 'examination-board'
    | 'minister' | 'civilian-panel' | 'institutional-board'
    | 'research-council' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface EducationWorkflowDefinition {
  id: string;
  title: string;
  archetype: EducationArchetype;
  blueprintCitation: string;
  description: string;
  steps: EducationWorkflowStep[];
  emits: string[];
}

export const CURRICULUM_REVIEW: EducationWorkflowDefinition = {
  id: 'curriculum-review',
  title: 'Curriculum review',
  archetype: 'curriculum',
  blueprintCitation: '§14.6 — curriculum review & pluralism',
  description: 'Draft → expert review → civilian-panel consultation → ministerial adoption → audit. Educational conformity scoring is constitutionally void.',
  steps: [
    { id: 'draft',      kind: 'submission',    title: 'Draft curriculum submitted',        role: 'curriculum-officer',  requiresSignature: true, maxDurationHours: 720,  auditTag: 'education.curriculum.draft' },
    { id: 'expert',     kind: 'review',        title: 'Expert pedagogical review',         role: 'institutional-board', requiresSignature: true, maxDurationHours: 720,  auditTag: 'education.curriculum.expert' },
    { id: 'consult',    kind: 'consultation',  title: 'Civilian-panel pluralism check',    role: 'civilian-panel',      requiresSignature: true, maxDurationHours: 720,  auditTag: 'education.curriculum.consult' },
    { id: 'adopt',      kind: 'decision',      title: 'Ministerial adoption',              role: 'minister',            requiresSignature: true, maxDurationHours: 168,  auditTag: 'education.curriculum.adopt' },
    { id: 'audit',      kind: 'audit',         title: 'Adoption sealed & published',       role: 'auditor',             requiresSignature: true, maxDurationHours: 168,  auditTag: 'education.curriculum.audit' },
  ],
  emits: ['Cabinet', 'Civilian-panel registry', 'Audit Vault'],
};

export const EXAM_INTEGRITY_RESPONSE: EducationWorkflowDefinition = {
  id: 'exam-integrity-response',
  title: 'Examination integrity response',
  archetype: 'continuity',
  blueprintCitation: '§14.7 — examination-integrity safeguards',
  description: 'Breach detected → investigation → remedial measures → tribunal where applicable → audit closure.',
  steps: [
    { id: 'detect',     kind: 'submission',  title: 'Integrity breach detected',         role: 'examination-board',  requiresSignature: false, maxDurationHours: 1,   auditTag: 'education.exam.detect' },
    { id: 'investigate',kind: 'review',      title: 'Investigation conducted',           role: 'examination-board',  requiresSignature: true,  maxDurationHours: 168, auditTag: 'education.exam.investigate' },
    { id: 'remedy',     kind: 'execution',   title: 'Remedial measures executed',        role: 'examination-board',  requiresSignature: true,  maxDurationHours: 168, auditTag: 'education.exam.remedy' },
    { id: 'tribunal',   kind: 'response',    title: 'Tribunal (where escalated)',        role: 'civilian-panel',     requiresSignature: true,  maxDurationHours: 720, auditTag: 'education.exam.tribunal' },
    { id: 'close',      kind: 'audit',       title: 'Closure & audit',                   role: 'auditor',            requiresSignature: true,  maxDurationHours: 168, auditTag: 'education.exam.close' },
  ],
  emits: ['Justice', 'Cabinet', 'Audit Vault'],
};

export const RESEARCH_GRANT: EducationWorkflowDefinition = {
  id: 'research-grant',
  title: 'Research grant award',
  archetype: 'research',
  blueprintCitation: '§14.4 — research lineage & non-partisan funding',
  description: 'Application → peer review → research-council vote → ministerial award → audit close.',
  steps: [
    { id: 'apply',      kind: 'submission', title: 'Applicant files proposal',        role: 'applicant',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'education.research.apply' },
    { id: 'peer',       kind: 'review',     title: 'Double-blind peer review',        role: 'research-council',  requiresSignature: true, maxDurationHours: 720, auditTag: 'education.research.peer' },
    { id: 'council',    kind: 'review',     title: 'Research-council vote',           role: 'research-council',  requiresSignature: true, maxDurationHours: 168, auditTag: 'education.research.council' },
    { id: 'award',      kind: 'decision',   title: 'Ministerial award',               role: 'minister',          requiresSignature: true, maxDurationHours: 168, auditTag: 'education.research.award' },
    { id: 'seal',       kind: 'sealing',    title: 'Grant sealed & published',        role: 'auditor',           requiresSignature: true, maxDurationHours: 72,  auditTag: 'education.research.seal' },
  ],
  emits: ['Treasury', 'Cabinet', 'Audit Vault'],
};

export const EDUCATION_WORKFLOWS: EducationWorkflowDefinition[] = [
  CURRICULUM_REVIEW,
  EXAM_INTEGRITY_RESPONSE,
  RESEARCH_GRANT,
];
