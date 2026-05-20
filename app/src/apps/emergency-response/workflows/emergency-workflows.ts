// apps/emergency-response/workflows — executable workflow contracts.
//
// Three workflows are declared here:
//   1. incident-activation  — incident detected → NEOC activation → declaration
//   2. evacuation-order     — risk assessment → consent-class → execute → audit
//   3. resource-mobilisation — assessment → procure → deliver → reconcile
//
// Every step binds a role, a signing requirement, an SLA and an audit
// tag namespaced under `emergency.`.

import type { EmergencyArchetype } from '@/apps/emergency-response/design-system/emergency-ds';

export type EmergencyStepKind =
  | 'detection' | 'verification' | 'declaration' | 'execution'
  | 'review' | 'broadcast' | 'sealing' | 'reconciliation';

export interface EmergencyWorkflowStep {
  id: string;
  kind: EmergencyStepKind;
  title: string;
  role:
    | 'duty-officer' | 'incident-commander' | 'crisis-coordinator'
    | 'humanitarian-officer' | 'logistics-officer' | 'public-information-officer'
    | 'cabinet-secretary' | 'civilian-panel' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface EmergencyWorkflowDefinition {
  id: string;
  title: string;
  archetype: EmergencyArchetype;
  blueprintCitation: string;
  description: string;
  steps: EmergencyWorkflowStep[];
  emits: string[];
}

export const INCIDENT_ACTIVATION: EmergencyWorkflowDefinition = {
  id: 'incident-activation',
  title: 'Incident activation',
  archetype: 'theatre',
  blueprintCitation: '§19.1 — National Emergency Operations Centre activation',
  description: 'Detect, verify, declare and activate the National Emergency Operations Centre for an incipient crisis.',
  steps: [
    { id: 'detect',     kind: 'detection',    title: 'Hazard detected', role: 'duty-officer',         requiresSignature: false, maxDurationHours: 0.1, auditTag: 'emergency.activation.detect' },
    { id: 'verify',     kind: 'verification', title: 'Cross-source verification', role: 'duty-officer', requiresSignature: true,  maxDurationHours: 1,   auditTag: 'emergency.activation.verify' },
    { id: 'declare',    kind: 'declaration',  title: 'NEOC activation declared', role: 'incident-commander', requiresSignature: true, maxDurationHours: 1, auditTag: 'emergency.activation.declare' },
    { id: 'cabinet',    kind: 'review',       title: 'Cabinet brief (if national)', role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 6, auditTag: 'emergency.activation.cabinet' },
    { id: 'broadcast',  kind: 'broadcast',    title: 'Citizen advisory issued', role: 'public-information-officer', requiresSignature: true, maxDurationHours: 2, auditTag: 'emergency.activation.broadcast' },
    { id: 'seal',       kind: 'sealing',      title: 'Activation log sealed', role: 'auditor', requiresSignature: true, maxDurationHours: 24, auditTag: 'emergency.activation.seal' },
  ],
  emits: ['Interior', 'Health', 'Cabinet', 'Communications', 'Audit Vault'],
};

export const EVACUATION_ORDER: EmergencyWorkflowDefinition = {
  id: 'evacuation-order',
  title: 'Evacuation order',
  archetype: 'humanitarian',
  blueprintCitation: '§19.4 — humanitarian evacuation under constitutional safeguard',
  description: 'A constitutionally bounded evacuation order — requires risk verification, multi-modal notification, accessibility plan and post-hoc judicial review.',
  steps: [
    { id: 'assess',       kind: 'verification', title: 'Risk assessment & geofence', role: 'incident-commander',  requiresSignature: true, maxDurationHours: 2, auditTag: 'emergency.evac.assess' },
    { id: 'legal',        kind: 'review',       title: 'Legal authority confirmed',  role: 'crisis-coordinator',  requiresSignature: true, maxDurationHours: 1, auditTag: 'emergency.evac.legal' },
    { id: 'accessibility',kind: 'verification', title: 'Accessibility plan attested', role: 'humanitarian-officer', requiresSignature: true, maxDurationHours: 1, auditTag: 'emergency.evac.access' },
    { id: 'notify',       kind: 'broadcast',    title: 'Multi-modal citizen notification', role: 'public-information-officer', requiresSignature: true, maxDurationHours: 1, auditTag: 'emergency.evac.notify' },
    { id: 'execute',      kind: 'execution',    title: 'Execute evacuation',         role: 'incident-commander',  requiresSignature: true, maxDurationHours: 72, auditTag: 'emergency.evac.execute' },
    { id: 'review',       kind: 'review',       title: 'Post-evacuation civilian-panel review', role: 'civilian-panel', requiresSignature: true, maxDurationHours: 720, auditTag: 'emergency.evac.review' },
  ],
  emits: ['Interior', 'Justice', 'Communications', 'Audit Vault'],
};

export const RESOURCE_MOBILISATION: EmergencyWorkflowDefinition = {
  id: 'resource-mobilisation',
  title: 'Resource mobilisation',
  archetype: 'mobilise',
  blueprintCitation: '§19.2 / §19.4 — responder & relief logistics chain',
  description: 'Demand assessment → fast-track procurement → field delivery → reconciliation against the Strategic Reserve.',
  steps: [
    { id: 'demand',    kind: 'verification', title: 'Demand assessment',                role: 'logistics-officer', requiresSignature: true,  maxDurationHours: 2,  auditTag: 'emergency.resource.demand' },
    { id: 'authorise', kind: 'declaration',  title: 'Fast-track procurement authorised', role: 'crisis-coordinator',requiresSignature: true,  maxDurationHours: 4,  auditTag: 'emergency.resource.authorise' },
    { id: 'dispatch',  kind: 'execution',    title: 'Dispatch from Strategic Reserve',  role: 'logistics-officer', requiresSignature: true,  maxDurationHours: 24, auditTag: 'emergency.resource.dispatch' },
    { id: 'deliver',   kind: 'execution',    title: 'Field delivery confirmed',         role: 'humanitarian-officer', requiresSignature: true, maxDurationHours: 72, auditTag: 'emergency.resource.deliver' },
    { id: 'reconcile', kind: 'reconciliation', title: 'Reserve reconciliation',         role: 'auditor',           requiresSignature: true,  maxDurationHours: 168,auditTag: 'emergency.resource.reconcile' },
  ],
  emits: ['Treasury', 'Interior', 'Audit Vault'],
};

export const EMERGENCY_WORKFLOWS: EmergencyWorkflowDefinition[] = [
  INCIDENT_ACTIVATION,
  EVACUATION_ORDER,
  RESOURCE_MOBILISATION,
];
