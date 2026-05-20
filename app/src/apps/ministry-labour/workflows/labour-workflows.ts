// apps/ministry-labour/workflows — executable workflow contracts.

import type { LabourArchetype } from '@/apps/ministry-labour/design-system/labour-ds';

export type LabourStepKind =
  | 'submission' | 'verification' | 'decision' | 'execution'
  | 'review' | 'tribunal' | 'sealing' | 'inspection' | 'remediation';

export interface LabourWorkflowStep {
  id: string;
  kind: LabourStepKind;
  title: string;
  role:
    | 'applicant' | 'caseworker' | 'inspector'
    | 'minister' | 'civilian-panel' | 'mediator' | 'arbitrator'
    | 'treasury-officer' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface LabourWorkflowDefinition {
  id: string;
  title: string;
  archetype: LabourArchetype;
  blueprintCitation: string;
  description: string;
  steps: LabourWorkflowStep[];
  emits: string[];
}

export const UNEMPLOYMENT_BENEFIT_DISBURSEMENT: LabourWorkflowDefinition = {
  id: 'unemployment-benefit-disbursement',
  title: 'Unemployment benefit disbursement',
  archetype: 'protection',
  blueprintCitation: '§23.1 — social protection & benefits continuity',
  description: 'Applicant files, caseworker verifies eligibility, minister approves, Treasury disburses, auditor reconciles.',
  steps: [
    { id: 'apply',     kind: 'submission',     title: 'Citizen applies for benefit',  role: 'applicant',        requiresSignature: true, maxDurationHours: 24,  auditTag: 'labour.benefit.apply' },
    { id: 'verify',    kind: 'verification',   title: 'Eligibility verified',         role: 'caseworker',       requiresSignature: true, maxDurationHours: 72,  auditTag: 'labour.benefit.verify' },
    { id: 'approve',   kind: 'decision',       title: 'Benefit approved',             role: 'minister',         requiresSignature: true, maxDurationHours: 48,  auditTag: 'labour.benefit.approve' },
    { id: 'disburse',  kind: 'execution',      title: 'Treasury disburses payment',   role: 'treasury-officer', requiresSignature: true, maxDurationHours: 168, auditTag: 'labour.benefit.disburse' },
    { id: 'audit',     kind: 'sealing',        title: 'Disbursement reconciled',      role: 'auditor',          requiresSignature: true, maxDurationHours: 720, auditTag: 'labour.benefit.audit' },
  ],
  emits: ['Treasury', 'Audit Vault'],
};

export const WORKPLACE_INSPECTION: LabourWorkflowDefinition = {
  id: 'workplace-inspection',
  title: 'Workplace inspection',
  archetype: 'rights',
  blueprintCitation: '§24.4 — workplace safety & labour rights enforcement',
  description: 'Trigger → on-site inspection → findings → remediation order → audit close.',
  steps: [
    { id: 'trigger',     kind: 'submission',   title: 'Inspection triggered',         role: 'caseworker',  requiresSignature: false, maxDurationHours: 2,   auditTag: 'labour.inspection.trigger' },
    { id: 'inspect',     kind: 'inspection',   title: 'On-site inspection',           role: 'inspector',   requiresSignature: true,  maxDurationHours: 168, auditTag: 'labour.inspection.inspect' },
    { id: 'findings',    kind: 'review',       title: 'Findings recorded',            role: 'inspector',   requiresSignature: true,  maxDurationHours: 72,  auditTag: 'labour.inspection.findings' },
    { id: 'remediate',   kind: 'remediation',  title: 'Remediation order issued',     role: 'minister',    requiresSignature: true,  maxDurationHours: 168, auditTag: 'labour.inspection.remediate' },
    { id: 'close',       kind: 'sealing',      title: 'Inspection closed & sealed',   role: 'auditor',     requiresSignature: true,  maxDurationHours: 720, auditTag: 'labour.inspection.close' },
  ],
  emits: ['Justice', 'Health', 'Audit Vault'],
};

export const INDUSTRIAL_TRIBUNAL: LabourWorkflowDefinition = {
  id: 'industrial-tribunal',
  title: 'Industrial tribunal hearing',
  archetype: 'rights',
  blueprintCitation: '§24.4 — tribunal lanes & non-retaliation',
  description: 'Filing → mediation → tribunal hearing → decision → civilian-panel review where applicable.',
  steps: [
    { id: 'file',       kind: 'submission',  title: 'Complaint filed',                role: 'applicant',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'labour.tribunal.file' },
    { id: 'mediate',    kind: 'review',      title: 'Mediation attempt',              role: 'mediator',      requiresSignature: true, maxDurationHours: 720, auditTag: 'labour.tribunal.mediate' },
    { id: 'hearing',    kind: 'tribunal',    title: 'Tribunal hearing',               role: 'arbitrator',    requiresSignature: true, maxDurationHours: 720, auditTag: 'labour.tribunal.hearing' },
    { id: 'decide',     kind: 'decision',    title: 'Decision issued',                role: 'arbitrator',    requiresSignature: true, maxDurationHours: 168, auditTag: 'labour.tribunal.decide' },
    { id: 'review',     kind: 'review',      title: 'Civilian-panel review (if escalated)', role: 'civilian-panel', requiresSignature: true, maxDurationHours: 720, auditTag: 'labour.tribunal.review' },
  ],
  emits: ['Justice', 'Audit Vault'],
};

export const LABOUR_WORKFLOWS: LabourWorkflowDefinition[] = [
  UNEMPLOYMENT_BENEFIT_DISBURSEMENT,
  WORKPLACE_INSPECTION,
  INDUSTRIAL_TRIBUNAL,
];
