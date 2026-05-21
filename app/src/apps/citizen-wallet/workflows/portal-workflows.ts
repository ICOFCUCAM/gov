// apps/citizen-portal/workflows — executable workflow contracts.

import type { PortalArchetype } from '@/apps/citizen-wallet/design-system/portal-ds';

export type PortalStepKind =
  | 'submission' | 'verification' | 'consent' | 'review'
  | 'decision' | 'appeal' | 'publication' | 'audit';

export interface PortalWorkflowStep {
  id: string;
  kind: PortalStepKind;
  title: string;
  role: 'citizen' | 'officer' | 'verifier' | 'auditor' | 'tribunal' | 'system';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface PortalWorkflowDefinition {
  id: string;
  title: string;
  archetype: PortalArchetype;
  blueprintCitation: string;
  description: string;
  steps: PortalWorkflowStep[];
  emits: string[];
}

export const SERVICE_REQUEST: PortalWorkflowDefinition = {
  id: 'service-request',
  title: 'Citizen service request',
  archetype: 'wallet',
  blueprintCitation: '§11.1 — universal citizen service contract',
  description: 'Citizen files → identity verified → consent recorded → officer reviews → decision → appeal window opens.',
  steps: [
    { id: 'file',     kind: 'submission',   title: 'Citizen files request',                   role: 'citizen',  requiresSignature: true, maxDurationHours: 1,   auditTag: 'portal.service.file' },
    { id: 'verify',   kind: 'verification', title: 'Identity verified',                       role: 'verifier', requiresSignature: true, maxDurationHours: 4,   auditTag: 'portal.service.verify' },
    { id: 'consent',  kind: 'consent',      title: 'Consent recorded in ledger',              role: 'citizen',  requiresSignature: true, maxDurationHours: 1,   auditTag: 'portal.service.consent' },
    { id: 'review',   kind: 'review',       title: 'Officer review',                          role: 'officer',  requiresSignature: true, maxDurationHours: 72,  auditTag: 'portal.service.review' },
    { id: 'decide',   kind: 'decision',     title: 'Decision recorded',                       role: 'officer',  requiresSignature: true, maxDurationHours: 24,  auditTag: 'portal.service.decide' },
    { id: 'appeal',   kind: 'publication',  title: 'Appeal window opens (universal right)',   role: 'system',   requiresSignature: false, maxDurationHours: 720, auditTag: 'portal.service.appeal' },
    { id: 'audit',    kind: 'audit',        title: 'Sealed to citizen audit trail',           role: 'auditor',  requiresSignature: true, maxDurationHours: 168, auditTag: 'portal.service.audit' },
  ],
  emits: ['Target Ministry', 'Audit Vault'],
};

export const CONSENT_GRANT: PortalWorkflowDefinition = {
  id: 'consent-grant',
  title: 'Cross-ministry consent grant',
  archetype: 'identity',
  blueprintCitation: '§11.4 — consent-bound data sharing',
  description: 'Citizen reviews scope → grants/denies → consent logged → ministry receives consent token (revocable).',
  steps: [
    { id: 'request', kind: 'submission',   title: 'Ministry requests data scope',           role: 'system',  requiresSignature: false, maxDurationHours: 1,  auditTag: 'portal.consent.request' },
    { id: 'review',  kind: 'review',       title: 'Citizen reviews scope',                  role: 'citizen', requiresSignature: false, maxDurationHours: 168, auditTag: 'portal.consent.review' },
    { id: 'grant',   kind: 'consent',      title: 'Consent granted or denied',              role: 'citizen', requiresSignature: true, maxDurationHours: 1,  auditTag: 'portal.consent.grant' },
    { id: 'issue',   kind: 'publication',  title: 'Consent token issued (revocable)',       role: 'system',  requiresSignature: false, maxDurationHours: 1,  auditTag: 'portal.consent.issue' },
    { id: 'audit',   kind: 'audit',        title: 'Logged in consents ledger',              role: 'auditor', requiresSignature: true, maxDurationHours: 24,  auditTag: 'portal.consent.audit' },
  ],
  emits: ['Target Ministry', 'Citizen Audit Vault'],
};

export const APPEAL_FILING: PortalWorkflowDefinition = {
  id: 'appeal-filing',
  title: 'Universal right of appeal',
  archetype: 'justice',
  blueprintCitation: '§11.5 — every decision is appealable',
  description: 'Citizen files appeal → independent tribunal reviews → decision → published reasoning.',
  steps: [
    { id: 'file',      kind: 'submission', title: 'Citizen files appeal',                 role: 'citizen',  requiresSignature: true, maxDurationHours: 720, auditTag: 'portal.appeal.file' },
    { id: 'admit',     kind: 'review',     title: 'Tribunal admits (or refers) appeal',   role: 'tribunal', requiresSignature: true, maxDurationHours: 168, auditTag: 'portal.appeal.admit' },
    { id: 'hear',      kind: 'review',     title: 'Tribunal hears the appeal',            role: 'tribunal', requiresSignature: true, maxDurationHours: 720, auditTag: 'portal.appeal.hear' },
    { id: 'decide',    kind: 'decision',   title: 'Decision rendered with reasoning',     role: 'tribunal', requiresSignature: true, maxDurationHours: 168, auditTag: 'portal.appeal.decide' },
    { id: 'publish',   kind: 'publication',title: 'Decision & reasoning published',       role: 'system',   requiresSignature: false, maxDurationHours: 24,  auditTag: 'portal.appeal.publish' },
    { id: 'audit',     kind: 'audit',      title: 'Sealed to appeals registry',           role: 'auditor',  requiresSignature: true, maxDurationHours: 168, auditTag: 'portal.appeal.audit' },
  ],
  emits: ['Tribunal', 'Originating Ministry', 'Citizen', 'Audit Vault'],
};

export const PORTAL_WORKFLOWS: PortalWorkflowDefinition[] = [
  SERVICE_REQUEST,
  CONSENT_GRANT,
  APPEAL_FILING,
];
