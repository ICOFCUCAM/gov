// apps/treasury/workflows — executable Treasury workflows.
// Each step binds a role, a signature requirement, an SLA and an
// audit tag namespaced under `treasury.*`.

import type { TreasuryArchetype } from '@/apps/treasury/design-system/treasury-ds';

export type WorkflowStepKind = 'request' | 'verification' | 'review' | 'authorisation' | 'release' | 'reconciliation';

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  role: 'ministry-officer' | 'controller' | 'accounting-officer' | 'treasurer' | 'central-bank' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  archetype: TreasuryArchetype;
  blueprintCitation: string;
  description: string;
  steps: WorkflowStep[];
  emits: string[];
}

// ── Workflow 1 — Disbursement authorisation ────────────────────────
export const DISBURSEMENT_AUTHORISATION: WorkflowDefinition = {
  id: 'disbursement-authorisation',
  title: 'Disbursement authorisation',
  archetype: 'voucher',
  blueprintCitation: 'Master §9.2 — Programmable disbursements & escrow',
  description: 'Ministry submits a payment request; controller verifies the appropriation; accounting officer authorises; treasurer releases against the TSA; auditor reconciles.',
  steps: [
    { id: 'request', kind: 'request', title: 'Ministry officer raises payment request', role: 'ministry-officer', requiresSignature: true, maxDurationHours: 0, auditTag: 'treasury.disbursement.requested' },
    { id: 'verify', kind: 'verification', title: 'Controller verifies appropriation balance', role: 'controller', requiresSignature: false, maxDurationHours: 24, auditTag: 'treasury.disbursement.verified' },
    { id: 'review', kind: 'review', title: 'Accounting officer reviews payee & purpose', role: 'accounting-officer', requiresSignature: false, maxDurationHours: 48, auditTag: 'treasury.disbursement.reviewed' },
    { id: 'authorise', kind: 'authorisation', title: 'Accounting officer authorises', role: 'accounting-officer', requiresSignature: true, maxDurationHours: 24, auditTag: 'treasury.disbursement.authorised' },
    { id: 'release', kind: 'release', title: 'Treasurer releases against TSA', role: 'treasurer', requiresSignature: true, maxDurationHours: 4, auditTag: 'treasury.disbursement.released' },
    { id: 'reconcile', kind: 'reconciliation', title: 'Auditor reconciles three-way ledger', role: 'auditor', requiresSignature: true, maxDurationHours: 48, auditTag: 'treasury.disbursement.reconciled' },
  ],
  emits: ['Cabinet', 'Recipient ministry'],
};

// ── Workflow 2 — Sovereign reserve drawdown ────────────────────────
export const RESERVE_DRAWDOWN: WorkflowDefinition = {
  id: 'reserve-drawdown',
  title: 'Sovereign reserve drawdown',
  archetype: 'voucher',
  blueprintCitation: 'Master §9 — Treasury & Payment Infrastructure',
  description: 'Multi-authority sovereign reserve drawdown — treasurer initiates, central bank counter-signs, auditor attests, with mandatory cabinet notification at the release step.',
  steps: [
    { id: 'initiate', kind: 'request', title: 'Treasurer initiates drawdown', role: 'treasurer', requiresSignature: true, maxDurationHours: 0, auditTag: 'treasury.reserve.initiated' },
    { id: 'verify-mandate', kind: 'verification', title: 'Controller verifies legislative mandate', role: 'controller', requiresSignature: false, maxDurationHours: 24, auditTag: 'treasury.reserve.mandate-verified' },
    { id: 'central-bank-signoff', kind: 'authorisation', title: 'Central bank governor counter-signs', role: 'central-bank', requiresSignature: true, maxDurationHours: 48, auditTag: 'treasury.reserve.cb-signed' },
    { id: 'release', kind: 'release', title: 'Reserve released against authorised facility', role: 'central-bank', requiresSignature: true, maxDurationHours: 12, auditTag: 'treasury.reserve.released' },
    { id: 'attest', kind: 'reconciliation', title: 'Auditor attests reserve position change', role: 'auditor', requiresSignature: true, maxDurationHours: 24, auditTag: 'treasury.reserve.attested' },
  ],
  emits: ['Cabinet', 'Foreign Affairs', 'National Coordination'],
};

export const TREASURY_WORKFLOWS: WorkflowDefinition[] = [
  DISBURSEMENT_AUTHORISATION,
  RESERVE_DRAWDOWN,
];
