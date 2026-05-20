// apps/ministry-justice/workflows/case-filing-workflow.ts
//
// Executable workflow definitions for the Ministry of Justice. These
// are typed contracts — every step is a state transition with a
// signing requirement, a permitted role and an audit-trail tag.
// Designed to be consumed by the existing RuntimeQueue + audit vault.
//
// Two workflows defined here:
//   1. case-filing-approval   — petitioner files; clerk verifies; judge accepts
//   2. evidence-chain-handoff — custody transfer with cryptographic seal

import type { JusticeArchetype } from '@/apps/ministry-justice/design-system/justice-ds';

export type WorkflowStepKind = 'submission' | 'verification' | 'review' | 'decision' | 'execution' | 'sealing';

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  role: 'petitioner' | 'court-clerk' | 'judge' | 'evidence-custodian' | 'counsel' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  archetype: JusticeArchetype;
  blueprintCitation: string;        // section in CIVICOS_MASTER_BLUEPRINT
  description: string;
  steps: WorkflowStep[];
  /** Cross-ministry edges this workflow may emit. */
  emits: string[];
}

export const CASE_FILING_APPROVAL: WorkflowDefinition = {
  id: 'case-filing-approval',
  title: 'Case filing approval',
  archetype: 'docket',
  blueprintCitation: 'Master §20.1 — e-Filing for criminal, civil, family, commercial, administrative',
  description: 'Petitioner submits a case filing; court clerk verifies completeness; judge accepts or rejects.',
  steps: [
    { id: 'submit', kind: 'submission', title: 'Petitioner files case', role: 'petitioner', requiresSignature: true, maxDurationHours: 0, auditTag: 'justice.filing.submitted' },
    { id: 'verify', kind: 'verification', title: 'Clerk verifies completeness', role: 'court-clerk', requiresSignature: false, maxDurationHours: 48, auditTag: 'justice.filing.verified' },
    { id: 'review', kind: 'review', title: 'Judge reviews jurisdiction', role: 'judge', requiresSignature: false, maxDurationHours: 72, auditTag: 'justice.filing.reviewed' },
    { id: 'decide', kind: 'decision', title: 'Acceptance or rejection', role: 'judge', requiresSignature: true, maxDurationHours: 24, auditTag: 'justice.filing.decided' },
    { id: 'seal', kind: 'sealing', title: 'Filing sealed in case docket', role: 'court-clerk', requiresSignature: true, maxDurationHours: 4, auditTag: 'justice.filing.sealed' },
  ],
  emits: ['Interior', 'Treasury'],
};

export const EVIDENCE_CHAIN_HANDOFF: WorkflowDefinition = {
  id: 'evidence-chain-handoff',
  title: 'Evidence chain-of-custody handoff',
  archetype: 'fascicle',
  blueprintCitation: 'Master §20.1 — Evidence vault with cryptographic integrity',
  description: 'Custody transfer between handlers with cryptographic seal at each hop.',
  steps: [
    { id: 'request', kind: 'submission', title: 'Receiving party requests handoff', role: 'counsel', requiresSignature: true, maxDurationHours: 0, auditTag: 'justice.evidence.requested' },
    { id: 'verify', kind: 'verification', title: 'Originating custodian verifies seal integrity', role: 'evidence-custodian', requiresSignature: true, maxDurationHours: 24, auditTag: 'justice.evidence.verified' },
    { id: 'transit', kind: 'execution', title: 'Item in transit with active GPS + seal monitoring', role: 'evidence-custodian', requiresSignature: false, maxDurationHours: 72, auditTag: 'justice.evidence.in-transit' },
    { id: 'receive', kind: 'execution', title: 'Receiving custodian acknowledges + re-seals', role: 'evidence-custodian', requiresSignature: true, maxDurationHours: 6, auditTag: 'justice.evidence.received' },
    { id: 'attest', kind: 'sealing', title: 'Auditor attests new chain link', role: 'auditor', requiresSignature: true, maxDurationHours: 24, auditTag: 'justice.evidence.attested' },
  ],
  emits: ['Police Command', 'Interior'],
};

export const JUSTICE_WORKFLOWS: WorkflowDefinition[] = [
  CASE_FILING_APPROVAL,
  EVIDENCE_CHAIN_HANDOFF,
];
