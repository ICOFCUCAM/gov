// apps/ministry-health/workflows — executable Health workflows.

import type { HealthArchetype } from '@/apps/ministry-health/design-system/health-ds';

export type WorkflowStepKind = 'request' | 'triage' | 'assessment' | 'admission' | 'consent' | 'execution' | 'audit';

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  role: 'patient' | 'triage-nurse' | 'admitting-physician' | 'specialist' | 'pharmacy' | 'lab' | 'records-officer' | 'auditor' | 'system';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  archetype: HealthArchetype;
  blueprintCitation: string;
  description: string;
  steps: WorkflowStep[];
  emits: string[];
}

// ── Workflow 1 — Patient admission ─────────────────────────────────
export const PATIENT_ADMISSION: WorkflowDefinition = {
  id: 'patient-admission',
  title: 'Patient admission',
  archetype: 'floor-plan',
  blueprintCitation: 'Master §13.1 — Facility OS: appointments, queues, beds, pharmacy, lab',
  description: 'Patient presents; triage nurse classifies; admitting physician assesses; bed assigned; EHR encounter opened; consent captured.',
  steps: [
    { id: 'present',  kind: 'request',     title: 'Patient presents at intake',                role: 'patient',             requiresSignature: false, maxDurationHours: 0,  auditTag: 'health.admission.presented' },
    { id: 'triage',   kind: 'triage',      title: 'Triage classification (ESI 1-5)',           role: 'triage-nurse',        requiresSignature: false, maxDurationHours: 1,  auditTag: 'health.admission.triaged' },
    { id: 'assess',   kind: 'assessment',  title: 'Admitting physician assesses',              role: 'admitting-physician', requiresSignature: true,  maxDurationHours: 4,  auditTag: 'health.admission.assessed' },
    { id: 'consent',  kind: 'consent',     title: 'Informed consent captured',                 role: 'patient',             requiresSignature: true,  maxDurationHours: 1,  auditTag: 'health.admission.consented' },
    { id: 'admit',    kind: 'admission',   title: 'Bed assignment & EHR encounter opened',     role: 'system',              requiresSignature: false, maxDurationHours: 2,  auditTag: 'health.admission.admitted' },
    { id: 'attest',   kind: 'audit',       title: 'Records officer attests intake completeness', role: 'records-officer',   requiresSignature: true,  maxDurationHours: 24, auditTag: 'health.admission.attested' },
  ],
  emits: ['Interior', 'Treasury'],
};

// ── Workflow 2 — Break-glass emergency access ──────────────────────
export const BREAK_GLASS_ACCESS: WorkflowDefinition = {
  id: 'break-glass-access',
  title: 'Break-glass emergency EHR access',
  archetype: 'chart',
  blueprintCitation: 'Master §13.3 — Break-glass access allowed with mandatory post-hoc review',
  description: 'Clinician invokes emergency EHR access without prior consent; system logs the invocation; mandatory post-hoc review by records officer and patient notification.',
  steps: [
    { id: 'invoke',   kind: 'request',     title: 'Clinician invokes break-glass',             role: 'admitting-physician', requiresSignature: true,  maxDurationHours: 0,   auditTag: 'health.break-glass.invoked' },
    { id: 'access',   kind: 'execution',   title: 'EHR access granted with audit watermark',   role: 'system',              requiresSignature: false, maxDurationHours: 0,   auditTag: 'health.break-glass.accessed' },
    { id: 'notify',   kind: 'execution',   title: 'Patient automatically notified',            role: 'system',              requiresSignature: false, maxDurationHours: 24,  auditTag: 'health.break-glass.notified' },
    { id: 'review',   kind: 'audit',       title: 'Records officer post-hoc review',           role: 'records-officer',     requiresSignature: true,  maxDurationHours: 72,  auditTag: 'health.break-glass.reviewed' },
    { id: 'attest',   kind: 'audit',       title: 'Auditor attests justification',             role: 'auditor',             requiresSignature: true,  maxDurationHours: 168, auditTag: 'health.break-glass.attested' },
  ],
  emits: ['Justice', 'Interior'],
};

export const HEALTH_WORKFLOWS: WorkflowDefinition[] = [
  PATIENT_ADMISSION,
  BREAK_GLASS_ACCESS,
];
