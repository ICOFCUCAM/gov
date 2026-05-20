// apps/ministry-agriculture/workflows — executable workflow contracts.
//
// Three workflows:
//   1. seed-subsidy-disbursement — application → verify → approve → disburse → reconcile
//   2. pest-response             — alert → triage → response → contain → audit
//   3. irrigation-allocation     — request → review → council → approve → meter

import type { AgricultureArchetype } from '@/apps/ministry-agriculture/design-system/agriculture-ds';

export type AgricultureStepKind =
  | 'submission' | 'verification' | 'decision' | 'execution'
  | 'response' | 'audit' | 'reconciliation' | 'review' | 'metering';

export interface AgricultureWorkflowStep {
  id: string;
  kind: AgricultureStepKind;
  title: string;
  role:
    | 'farmer' | 'extension-officer' | 'agriculture-officer'
    | 'minister' | 'cooperative-board' | 'treasury-officer'
    | 'veterinary-officer' | 'water-authority' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface AgricultureWorkflowDefinition {
  id: string;
  title: string;
  archetype: AgricultureArchetype;
  blueprintCitation: string;
  description: string;
  steps: AgricultureWorkflowStep[];
  emits: string[];
}

export const SEED_SUBSIDY_DISBURSEMENT: AgricultureWorkflowDefinition = {
  id: 'seed-subsidy-disbursement',
  title: 'Seed subsidy disbursement',
  archetype: 'subsidy',
  blueprintCitation: '§17.6 — subsidy programmes & smallholder protection',
  description: 'A farmer or cooperative applies, the extension officer verifies smallholder status, the Agriculture Officer approves, Treasury disburses, and the Auditor reconciles.',
  steps: [
    { id: 'apply',      kind: 'submission',     title: 'Farmer / cooperative applies',    role: 'farmer',             requiresSignature: true,  maxDurationHours: 24,  auditTag: 'agriculture.subsidy.apply' },
    { id: 'verify',     kind: 'verification',   title: 'Smallholder status verified',     role: 'extension-officer',  requiresSignature: true,  maxDurationHours: 72,  auditTag: 'agriculture.subsidy.verify' },
    { id: 'approve',    kind: 'decision',       title: 'Subsidy approved',                role: 'agriculture-officer',requiresSignature: true,  maxDurationHours: 48,  auditTag: 'agriculture.subsidy.approve' },
    { id: 'disburse',   kind: 'execution',      title: 'Treasury disburses funds',        role: 'treasury-officer',   requiresSignature: true,  maxDurationHours: 168, auditTag: 'agriculture.subsidy.disburse' },
    { id: 'reconcile',  kind: 'reconciliation', title: 'Reconciliation & audit seal',     role: 'auditor',            requiresSignature: true,  maxDurationHours: 720, auditTag: 'agriculture.subsidy.reconcile' },
  ],
  emits: ['Treasury', 'Audit Vault'],
};

export const PEST_RESPONSE: AgricultureWorkflowDefinition = {
  id: 'pest-response',
  title: 'Pest outbreak response',
  archetype: 'response',
  blueprintCitation: '§17.4 — pest emergency response chain',
  description: 'An outbreak alert triggers triage, response activation, containment, and audited closure.',
  steps: [
    { id: 'alert',     kind: 'submission',  title: 'Outbreak alert',                role: 'extension-officer',  requiresSignature: false, maxDurationHours: 2,   auditTag: 'agriculture.pest.alert' },
    { id: 'triage',    kind: 'verification',title: 'Triage & extent classification', role: 'veterinary-officer', requiresSignature: true,  maxDurationHours: 24,  auditTag: 'agriculture.pest.triage' },
    { id: 'response',  kind: 'response',    title: 'Response activated',            role: 'agriculture-officer',requiresSignature: true,  maxDurationHours: 48,  auditTag: 'agriculture.pest.response' },
    { id: 'contain',   kind: 'execution',   title: 'Containment & treatment',       role: 'extension-officer',  requiresSignature: true,  maxDurationHours: 168, auditTag: 'agriculture.pest.contain' },
    { id: 'audit',     kind: 'audit',       title: 'Outbreak audit sealed',         role: 'auditor',            requiresSignature: true,  maxDurationHours: 168, auditTag: 'agriculture.pest.audit' },
  ],
  emits: ['Health', 'Environment', 'Emergency Response', 'Audit Vault'],
};

export const IRRIGATION_ALLOCATION: AgricultureWorkflowDefinition = {
  id: 'irrigation-allocation',
  title: 'Irrigation allocation',
  archetype: 'water',
  blueprintCitation: '§17.3 — irrigation, basin allocation & cooperative water rights',
  description: 'Application → cooperative-board review → council vote → approval → metering. Concealment of pollution data and discriminatory allocation are prohibited.',
  steps: [
    { id: 'request',    kind: 'submission',  title: 'Irrigation request filed',       role: 'farmer',             requiresSignature: true, maxDurationHours: 24,  auditTag: 'agriculture.irrigation.request' },
    { id: 'review',     kind: 'review',      title: 'Cooperative-board review',        role: 'cooperative-board',  requiresSignature: true, maxDurationHours: 168, auditTag: 'agriculture.irrigation.review' },
    { id: 'water',      kind: 'verification',title: 'Water-authority capacity check',  role: 'water-authority',    requiresSignature: true, maxDurationHours: 72,  auditTag: 'agriculture.irrigation.water' },
    { id: 'approve',    kind: 'decision',    title: 'Allocation approved',             role: 'minister',           requiresSignature: true, maxDurationHours: 168, auditTag: 'agriculture.irrigation.approve' },
    { id: 'meter',      kind: 'metering',    title: 'Allocation metered & monitored',  role: 'water-authority',    requiresSignature: true, maxDurationHours: 720, auditTag: 'agriculture.irrigation.meter' },
  ],
  emits: ['Environment', 'Treasury', 'Audit Vault'],
};

export const AGRICULTURE_WORKFLOWS: AgricultureWorkflowDefinition[] = [
  SEED_SUBSIDY_DISBURSEMENT,
  PEST_RESPONSE,
  IRRIGATION_ALLOCATION,
];
