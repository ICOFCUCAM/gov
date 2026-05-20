// apps/foreign-affairs/workflows — executable workflow contracts.
//
// Three workflows:
//   1. treaty-ratification — negotiation → cabinet → parliament → instrument deposit
//   2. demarche-delivery   — incident → drafting → cabinet brief → delivery
//   3. consular-evacuation — request → assessment → host coordination → execution

import type { ForeignArchetype } from '@/apps/foreign-affairs/design-system/foreign-ds';

export type ForeignStepKind =
  | 'negotiation' | 'cabinet-review' | 'parliamentary'
  | 'verification' | 'drafting' | 'delivery'
  | 'submission' | 'execution' | 'sealing';

export interface ForeignWorkflowStep {
  id: string;
  kind: ForeignStepKind;
  title: string;
  role:
    | 'desk-officer' | 'ambassador' | 'foreign-minister'
    | 'cabinet-secretary' | 'parliament-rapporteur' | 'consul'
    | 'legal-counsel' | 'auditor' | 'host-state-liaison';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface ForeignWorkflowDefinition {
  id: string;
  title: string;
  archetype: ForeignArchetype;
  blueprintCitation: string;
  description: string;
  steps: ForeignWorkflowStep[];
  emits: string[];
}

export const TREATY_RATIFICATION: ForeignWorkflowDefinition = {
  id: 'treaty-ratification',
  title: 'Treaty ratification',
  archetype: 'treaty',
  blueprintCitation: '§4.3 — treaty docket & instrument deposit',
  description: 'Negotiate, attest legality, secure cabinet & parliamentary concurrence, then deposit the ratification instrument.',
  steps: [
    { id: 'negotiate',  kind: 'negotiation',    title: 'Negotiation rounds concluded',     role: 'ambassador',           requiresSignature: true, maxDurationHours: 720, auditTag: 'foreign.treaty.negotiate' },
    { id: 'legal',      kind: 'verification',   title: 'Legal compatibility attested',     role: 'legal-counsel',        requiresSignature: true, maxDurationHours: 168, auditTag: 'foreign.treaty.legal' },
    { id: 'cabinet',    kind: 'cabinet-review', title: 'Cabinet concurrence',              role: 'cabinet-secretary',    requiresSignature: true, maxDurationHours: 168, auditTag: 'foreign.treaty.cabinet' },
    { id: 'parliament', kind: 'parliamentary',  title: 'Parliamentary ratification',       role: 'parliament-rapporteur',requiresSignature: true, maxDurationHours: 720, auditTag: 'foreign.treaty.parliament' },
    { id: 'sign',       kind: 'execution',      title: 'Foreign Minister signs instrument',role: 'foreign-minister',     requiresSignature: true, maxDurationHours: 72,  auditTag: 'foreign.treaty.sign' },
    { id: 'deposit',    kind: 'sealing',        title: 'Instrument deposited & sealed',    role: 'auditor',              requiresSignature: true, maxDurationHours: 168, auditTag: 'foreign.treaty.deposit' },
  ],
  emits: ['Cabinet', 'Legislature', 'Justice', 'Treasury', 'Audit Vault'],
};

export const DEMARCHE_DELIVERY: ForeignWorkflowDefinition = {
  id: 'demarche-delivery',
  title: 'Diplomatic démarche delivery',
  archetype: 'dispatch',
  blueprintCitation: '§4.1 — diplomatic dispatch & posture',
  description: 'Verify the incident, draft a démarche, brief cabinet, deliver to counterparty and seal the dispatch.',
  steps: [
    { id: 'verify',   kind: 'verification',   title: 'Incident verification',            role: 'desk-officer',      requiresSignature: true, maxDurationHours: 12, auditTag: 'foreign.demarche.verify' },
    { id: 'draft',    kind: 'drafting',       title: 'Démarche drafted',                 role: 'desk-officer',      requiresSignature: true, maxDurationHours: 24, auditTag: 'foreign.demarche.draft' },
    { id: 'legal',    kind: 'verification',   title: 'Legal review',                     role: 'legal-counsel',     requiresSignature: true, maxDurationHours: 12, auditTag: 'foreign.demarche.legal' },
    { id: 'cabinet',  kind: 'cabinet-review', title: 'Cabinet brief (if critical)',      role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 24, auditTag: 'foreign.demarche.cabinet' },
    { id: 'deliver',  kind: 'delivery',       title: 'Delivered to counterparty',        role: 'ambassador',        requiresSignature: true, maxDurationHours: 24, auditTag: 'foreign.demarche.deliver' },
    { id: 'seal',     kind: 'sealing',        title: 'Dispatch sealed in audit vault',   role: 'auditor',           requiresSignature: true, maxDurationHours: 24, auditTag: 'foreign.demarche.seal' },
  ],
  emits: ['Cabinet', 'Treasury', 'Audit Vault'],
};

export const CONSULAR_EVACUATION: ForeignWorkflowDefinition = {
  id: 'consular-evacuation',
  title: 'Consular evacuation',
  archetype: 'consular',
  blueprintCitation: '§4.2 / §4.7 — consular continuity & emergency evacuation',
  description: 'Citizen evacuation request → safety assessment → host-state coordination → execution → reconciliation.',
  steps: [
    { id: 'request',     kind: 'submission',  title: 'Citizen request received',           role: 'consul',              requiresSignature: false, maxDurationHours: 2,   auditTag: 'foreign.evac.request' },
    { id: 'assess',      kind: 'verification',title: 'Safety & legal assessment',          role: 'desk-officer',        requiresSignature: true,  maxDurationHours: 12,  auditTag: 'foreign.evac.assess' },
    { id: 'host',        kind: 'delivery',    title: 'Host-state coordination',            role: 'host-state-liaison',  requiresSignature: true,  maxDurationHours: 48,  auditTag: 'foreign.evac.host' },
    { id: 'execute',     kind: 'execution',   title: 'Evacuation executed',                role: 'ambassador',          requiresSignature: true,  maxDurationHours: 72,  auditTag: 'foreign.evac.execute' },
    { id: 'reconcile',   kind: 'sealing',     title: 'Case reconciled & sealed',           role: 'auditor',             requiresSignature: true,  maxDurationHours: 168, auditTag: 'foreign.evac.reconcile' },
  ],
  emits: ['Interior', 'Emergency', 'Treasury', 'Audit Vault'],
};

export const FOREIGN_WORKFLOWS: ForeignWorkflowDefinition[] = [
  TREATY_RATIFICATION,
  DEMARCHE_DELIVERY,
  CONSULAR_EVACUATION,
];
