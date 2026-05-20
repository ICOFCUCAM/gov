// apps/ministry-environment/workflows — executable workflow contracts.
//
// Three workflows:
//   1. environmental-impact-assessment — scoping → study → public comment → decision
//   2. extraction-permit               — application → EIA → council → monitoring → renewal
//   3. climate-incident-declaration    — detection → declaration → response → recovery → audit

import type { EnvironmentArchetype } from '@/apps/ministry-environment/design-system/environment-ds';

export type EnvironmentStepKind =
  | 'submission' | 'scoping' | 'assessment' | 'public-comment'
  | 'review' | 'decision' | 'monitoring' | 'declaration'
  | 'response' | 'restoration' | 'sealing';

export interface EnvironmentWorkflowStep {
  id: string;
  kind: EnvironmentStepKind;
  title: string;
  role:
    | 'applicant' | 'environmental-officer' | 'eia-panel'
    | 'minister' | 'council' | 'citizen-panel'
    | 'monitoring-officer' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface EnvironmentWorkflowDefinition {
  id: string;
  title: string;
  archetype: EnvironmentArchetype;
  blueprintCitation: string;
  description: string;
  steps: EnvironmentWorkflowStep[];
  emits: string[];
}

export const ENVIRONMENTAL_IMPACT_ASSESSMENT: EnvironmentWorkflowDefinition = {
  id: 'environmental-impact-assessment',
  title: 'Environmental Impact Assessment',
  archetype: 'oversight',
  blueprintCitation: '§25.8 — impact assessment & permit regime',
  description: 'Scoping, technical study, public comment period and a signed decision by the minister.',
  steps: [
    { id: 'apply',     kind: 'submission',    title: 'Applicant files EIA',           role: 'applicant',            requiresSignature: true, maxDurationHours: 24,  auditTag: 'environment.eia.apply' },
    { id: 'scope',     kind: 'scoping',       title: 'Terms-of-reference scoping',     role: 'environmental-officer',requiresSignature: true, maxDurationHours: 168, auditTag: 'environment.eia.scope' },
    { id: 'study',     kind: 'assessment',    title: 'Technical study & panel review', role: 'eia-panel',            requiresSignature: true, maxDurationHours: 720, auditTag: 'environment.eia.study' },
    { id: 'comment',   kind: 'public-comment',title: 'Public comment period',          role: 'citizen-panel',        requiresSignature: true, maxDurationHours: 720, auditTag: 'environment.eia.comment' },
    { id: 'decide',    kind: 'decision',      title: 'Ministerial decision',           role: 'minister',             requiresSignature: true, maxDurationHours: 168, auditTag: 'environment.eia.decide' },
    { id: 'seal',      kind: 'sealing',       title: 'Decision sealed & published',    role: 'auditor',              requiresSignature: true, maxDurationHours: 72,  auditTag: 'environment.eia.seal' },
  ],
  emits: ['Cabinet', 'Justice', 'Trade & Industry', 'Audit Vault'],
};

export const EXTRACTION_PERMIT: EnvironmentWorkflowDefinition = {
  id: 'extraction-permit',
  title: 'Extraction permit',
  archetype: 'registry',
  blueprintCitation: '§25.8 — extraction permits & monitoring cadence',
  description: 'Permit application requires an EIA, a council vote, monitoring schedule and reviewable renewal cycle.',
  steps: [
    { id: 'apply',      kind: 'submission',  title: 'Operator applies for permit',     role: 'applicant',            requiresSignature: true, maxDurationHours: 24,  auditTag: 'environment.permit.apply' },
    { id: 'eia',        kind: 'assessment',  title: 'EIA attested',                    role: 'eia-panel',            requiresSignature: true, maxDurationHours: 720, auditTag: 'environment.permit.eia' },
    { id: 'council',    kind: 'review',      title: 'Council vote',                    role: 'council',              requiresSignature: true, maxDurationHours: 720, auditTag: 'environment.permit.council' },
    { id: 'issue',      kind: 'decision',    title: 'Permit issued by minister',       role: 'minister',             requiresSignature: true, maxDurationHours: 168, auditTag: 'environment.permit.issue' },
    { id: 'monitor',    kind: 'monitoring',  title: 'Monitoring cadence engaged',      role: 'monitoring-officer',   requiresSignature: true, maxDurationHours: 168, auditTag: 'environment.permit.monitor' },
    { id: 'renew',      kind: 'review',      title: 'Reviewable renewal cycle',        role: 'environmental-officer',requiresSignature: true, maxDurationHours: 720, auditTag: 'environment.permit.renew' },
  ],
  emits: ['Trade & Industry', 'Justice', 'Audit Vault'],
};

export const CLIMATE_INCIDENT_DECLARATION: EnvironmentWorkflowDefinition = {
  id: 'climate-incident-declaration',
  title: 'Climate incident declaration',
  archetype: 'incident',
  blueprintCitation: '§25.6 — climate incident response chain',
  description: 'Detect a climate incident, declare severity, cascade to Emergency and Health, run response, then restoration & audit.',
  steps: [
    { id: 'detect',      kind: 'submission',  title: 'Anomaly detected',                  role: 'environmental-officer',requiresSignature: false, maxDurationHours: 1,   auditTag: 'environment.incident.detect' },
    { id: 'declare',     kind: 'declaration', title: 'Severity declared',                 role: 'minister',             requiresSignature: true,  maxDurationHours: 4,   auditTag: 'environment.incident.declare' },
    { id: 'cascade',     kind: 'response',    title: 'Cascade to Emergency / Health',     role: 'environmental-officer',requiresSignature: true,  maxDurationHours: 2,   auditTag: 'environment.incident.cascade' },
    { id: 'restoration', kind: 'restoration', title: 'Restoration plan executed',         role: 'monitoring-officer',   requiresSignature: true,  maxDurationHours: 720, auditTag: 'environment.incident.restoration' },
    { id: 'audit',       kind: 'sealing',     title: 'After-incident environmental audit',role: 'auditor',              requiresSignature: true,  maxDurationHours: 168, auditTag: 'environment.incident.audit' },
  ],
  emits: ['Emergency Response', 'Health', 'Transport', 'Audit Vault'],
};

export const ENVIRONMENT_WORKFLOWS: EnvironmentWorkflowDefinition[] = [
  ENVIRONMENTAL_IMPACT_ASSESSMENT,
  EXTRACTION_PERMIT,
  CLIMATE_INCIDENT_DECLARATION,
];
