// apps/ministry-transport/workflows — executable workflow contracts.

import type { TransportArchetype } from '@/apps/ministry-transport/design-system/transport-ds';

export type TransportStepKind =
  | 'detection' | 'verification' | 'decision' | 'execution'
  | 'review' | 'audit' | 'rerouting' | 'sealing' | 'submission';

export interface TransportWorkflowStep {
  id: string;
  kind: TransportStepKind;
  title: string;
  role:
    | 'duty-officer' | 'corridor-operator' | 'inspector'
    | 'minister' | 'evacuation-coordinator' | 'logistics-officer'
    | 'safety-board' | 'auditor' | 'applicant';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface TransportWorkflowDefinition {
  id: string;
  title: string;
  archetype: TransportArchetype;
  blueprintCitation: string;
  description: string;
  steps: TransportWorkflowStep[];
  emits: string[];
}

export const INFRASTRUCTURE_CLOSURE: TransportWorkflowDefinition = {
  id: 'infrastructure-closure',
  title: 'Infrastructure closure',
  archetype: 'emergency',
  blueprintCitation: '§16.8 — infrastructure-failure response chain',
  description: 'Detect failure → inspect → ministerial closure order → reroute → audit.',
  steps: [
    { id: 'detect',   kind: 'detection',   title: 'Failure detected',                 role: 'duty-officer',      requiresSignature: false, maxDurationHours: 0.5, auditTag: 'transport.closure.detect' },
    { id: 'inspect',  kind: 'verification',title: 'Safety inspection',                role: 'inspector',         requiresSignature: true,  maxDurationHours: 4,   auditTag: 'transport.closure.inspect' },
    { id: 'order',    kind: 'decision',    title: 'Ministerial closure order',        role: 'minister',          requiresSignature: true,  maxDurationHours: 12,  auditTag: 'transport.closure.order' },
    { id: 'reroute',  kind: 'rerouting',   title: 'Detour & relief routing activated',role: 'corridor-operator', requiresSignature: true,  maxDurationHours: 24,  auditTag: 'transport.closure.reroute' },
    { id: 'reopen',   kind: 'execution',   title: 'Conditional reopening',            role: 'safety-board',      requiresSignature: true,  maxDurationHours: 720, auditTag: 'transport.closure.reopen' },
    { id: 'audit',    kind: 'audit',       title: 'Closure audit sealed',             role: 'auditor',           requiresSignature: true,  maxDurationHours: 168, auditTag: 'transport.closure.audit' },
  ],
  emits: ['Emergency Response', 'Trade & Industry', 'Audit Vault'],
};

export const EVACUATION_ROUTING: TransportWorkflowDefinition = {
  id: 'evacuation-routing',
  title: 'Evacuation routing',
  archetype: 'emergency',
  blueprintCitation: '§16.8 — emergency evacuation priority',
  description: 'Activation request → routing → corridor priority → execution → reconciliation.',
  steps: [
    { id: 'request',     kind: 'submission',   title: 'Activation request received', role: 'evacuation-coordinator', requiresSignature: true,  maxDurationHours: 1,   auditTag: 'transport.evac.request' },
    { id: 'verify',      kind: 'verification', title: 'Verification & accessibility', role: 'evacuation-coordinator', requiresSignature: true,  maxDurationHours: 2,   auditTag: 'transport.evac.verify' },
    { id: 'reroute',     kind: 'rerouting',    title: 'Corridor priority assigned',   role: 'corridor-operator',     requiresSignature: true,  maxDurationHours: 1,   auditTag: 'transport.evac.reroute' },
    { id: 'execute',     kind: 'execution',    title: 'Routing executed',             role: 'corridor-operator',     requiresSignature: true,  maxDurationHours: 72,  auditTag: 'transport.evac.execute' },
    { id: 'reconcile',   kind: 'sealing',      title: 'Reconciliation & audit',       role: 'auditor',               requiresSignature: true,  maxDurationHours: 168, auditTag: 'transport.evac.reconcile' },
  ],
  emits: ['Emergency Response', 'Interior', 'Audit Vault'],
};

export const FREIGHT_PERMIT: TransportWorkflowDefinition = {
  id: 'freight-permit',
  title: 'Freight permit',
  archetype: 'logistics',
  blueprintCitation: '§16.6 / §16.10 — freight permits & non-discriminatory access',
  description: 'Application → safety / weight review → corridor approval → metering.',
  steps: [
    { id: 'apply',    kind: 'submission',  title: 'Permit application',           role: 'applicant',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'transport.freight.apply' },
    { id: 'review',   kind: 'review',      title: 'Safety / weight / hazmat review', role: 'inspector',      requiresSignature: true, maxDurationHours: 168, auditTag: 'transport.freight.review' },
    { id: 'corridor', kind: 'review',      title: 'Corridor capacity check',      role: 'corridor-operator', requiresSignature: true, maxDurationHours: 72,  auditTag: 'transport.freight.corridor' },
    { id: 'issue',    kind: 'decision',    title: 'Permit issued',                role: 'minister',          requiresSignature: true, maxDurationHours: 72,  auditTag: 'transport.freight.issue' },
    { id: 'meter',    kind: 'execution',   title: 'Movements metered & monitored', role: 'logistics-officer',requiresSignature: true, maxDurationHours: 720, auditTag: 'transport.freight.meter' },
  ],
  emits: ['Trade & Industry', 'Audit Vault'],
};

export const TRANSPORT_WORKFLOWS: TransportWorkflowDefinition[] = [
  INFRASTRUCTURE_CLOSURE,
  EVACUATION_ROUTING,
  FREIGHT_PERMIT,
];
