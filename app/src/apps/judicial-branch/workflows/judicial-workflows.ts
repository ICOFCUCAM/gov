// apps/judicial-branch/workflows — executable workflow contracts.

import type { JudicialArchetype } from '@/apps/judicial-branch/design-system/judicial-ds';

export type JudicialStepKind =
  | 'filing' | 'pleadings' | 'hearing' | 'deliberation'
  | 'reasoning' | 'sealing' | 'review' | 'tribunal' | 'audit';

export interface JudicialWorkflowStep {
  id: string;
  kind: JudicialStepKind;
  title: string;
  role:
    | 'applicant' | 'counsel' | 'clerk' | 'justice' | 'chief-justice'
    | 'civilian-panel' | 'auditor' | 'court-officer';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface JudicialWorkflowDefinition {
  id: string;
  title: string;
  archetype: JudicialArchetype;
  blueprintCitation: string;
  description: string;
  steps: JudicialWorkflowStep[];
  emits: string[];
}

export const CONSTITUTIONAL_RULING: JudicialWorkflowDefinition = {
  id: 'constitutional-ruling',
  title: 'Constitutional ruling',
  archetype: 'apex',
  blueprintCitation: '§8.5 — open reasoning required on every constitutional decision',
  description: 'Filing → pleadings → oral hearing → deliberation → published reasoning → sealed to Audit Vault.',
  steps: [
    { id: 'file',         kind: 'filing',       title: 'Constitutional matter filed',     role: 'applicant',   requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.constitution.file' },
    { id: 'pleadings',    kind: 'pleadings',    title: 'Pleadings exchanged',              role: 'counsel',     requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.constitution.pleadings' },
    { id: 'hearing',      kind: 'hearing',      title: 'Public oral hearing',              role: 'chief-justice',requiresSignature: true, maxDurationHours: 168, auditTag: 'judicial.constitution.hearing' },
    { id: 'deliberation', kind: 'deliberation', title: 'Bench deliberation (sealed)',      role: 'justice',     requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.constitution.deliberation' },
    { id: 'reasoning',    kind: 'reasoning',    title: 'Reasoning published in full',     role: 'chief-justice',requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.constitution.reasoning' },
    { id: 'seal',         kind: 'sealing',      title: 'Sealed to Audit Vault',            role: 'auditor',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.constitution.seal' },
  ],
  emits: ['Senate', 'National Assembly', 'Cabinet', 'Justice', 'Audit Vault'],
};

export const JUDICIAL_CONDUCT_REVIEW: JudicialWorkflowDefinition = {
  id: 'judicial-conduct-review',
  title: 'Judicial conduct review',
  archetype: 'conduct',
  blueprintCitation: '§8.6 — civilian-panel oversight of judicial conduct',
  description: 'Complaint → administrative review → independent civilian-panel review → tribunal (if escalated) → published finding.',
  steps: [
    { id: 'complaint',    kind: 'filing',     title: 'Conduct complaint filed',           role: 'applicant',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.conduct.complaint' },
    { id: 'review',       kind: 'review',     title: 'Administrative review',              role: 'clerk',        requiresSignature: true, maxDurationHours: 168, auditTag: 'judicial.conduct.review' },
    { id: 'civilian',     kind: 'review',     title: 'Civilian-panel review',              role: 'civilian-panel', requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.conduct.civilian' },
    { id: 'tribunal',     kind: 'tribunal',   title: 'Conduct tribunal (if escalated)',    role: 'chief-justice',requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.conduct.tribunal' },
    { id: 'finding',      kind: 'sealing',    title: 'Finding published & sealed',         role: 'auditor',      requiresSignature: true, maxDurationHours: 168, auditTag: 'judicial.conduct.finding' },
  ],
  emits: ['Senate', 'Audit Vault'],
};

export const APPELLATE_HEARING: JudicialWorkflowDefinition = {
  id: 'appellate-hearing',
  title: 'Appellate hearing',
  archetype: 'case',
  blueprintCitation: '§8.3 / §8.7 — fair-trial guarantees on appeal',
  description: 'Notice of appeal → pleadings → oral hearing → deliberation → published reasoning → audit.',
  steps: [
    { id: 'notice',       kind: 'filing',       title: 'Notice of appeal filed',           role: 'applicant',   requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.appeal.notice' },
    { id: 'pleadings',    kind: 'pleadings',    title: 'Pleadings exchanged',              role: 'counsel',     requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.appeal.pleadings' },
    { id: 'hearing',      kind: 'hearing',      title: 'Oral hearing',                     role: 'justice',     requiresSignature: true, maxDurationHours: 168, auditTag: 'judicial.appeal.hearing' },
    { id: 'deliberation', kind: 'deliberation', title: 'Bench deliberation',                role: 'justice',     requiresSignature: true, maxDurationHours: 720, auditTag: 'judicial.appeal.deliberation' },
    { id: 'reasoning',    kind: 'reasoning',    title: 'Reasoning published',              role: 'justice',     requiresSignature: true, maxDurationHours: 168, auditTag: 'judicial.appeal.reasoning' },
    { id: 'audit',        kind: 'audit',        title: 'Sealed to Audit Vault',            role: 'auditor',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'judicial.appeal.audit' },
  ],
  emits: ['Justice', 'Police Command', 'Audit Vault'],
};

export const JUDICIAL_WORKFLOWS: JudicialWorkflowDefinition[] = [
  CONSTITUTIONAL_RULING,
  JUDICIAL_CONDUCT_REVIEW,
  APPELLATE_HEARING,
];
