// apps/communications/workflows — executable workflow contracts.

import type { CommsArchetype } from '@/apps/communications/design-system/communications-ds';

export type CommsStepKind =
  | 'detection' | 'containment' | 'eradication' | 'recovery'
  | 'audit' | 'submission' | 'verification' | 'decision'
  | 'broadcast' | 'sealing';

export interface CommsWorkflowStep {
  id: string;
  kind: CommsStepKind;
  title: string;
  role:
    | 'soc-analyst' | 'cyber-lead' | 'minister'
    | 'public-information-officer' | 'broadcast-engineer'
    | 'applicant' | 'spectrum-officer' | 'civilian-panel' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface CommsWorkflowDefinition {
  id: string;
  title: string;
  archetype: CommsArchetype;
  blueprintCitation: string;
  description: string;
  steps: CommsWorkflowStep[];
  emits: string[];
}

export const CYBER_INCIDENT_RESPONSE: CommsWorkflowDefinition = {
  id: 'cyber-incident-response',
  title: 'Cyber incident response',
  archetype: 'cyber',
  blueprintCitation: '§30.1 — cyber-incident response chain',
  description: 'Detect → contain → eradicate → recover → audit. Cascade to Interior, Treasury, Energy, Cabinet.',
  steps: [
    { id: 'detect',     kind: 'detection',   title: 'Incident detected',           role: 'soc-analyst',  requiresSignature: false, maxDurationHours: 0.5, auditTag: 'comms.cyber.detect' },
    { id: 'contain',    kind: 'containment', title: 'Containment engaged',         role: 'cyber-lead',   requiresSignature: true,  maxDurationHours: 4,   auditTag: 'comms.cyber.contain' },
    { id: 'eradicate',  kind: 'eradication', title: 'Threat eradicated',           role: 'cyber-lead',   requiresSignature: true,  maxDurationHours: 24,  auditTag: 'comms.cyber.eradicate' },
    { id: 'recover',    kind: 'recovery',    title: 'Systems recovered',           role: 'cyber-lead',   requiresSignature: true,  maxDurationHours: 72,  auditTag: 'comms.cyber.recover' },
    { id: 'audit',      kind: 'audit',       title: 'Post-incident audit sealed',  role: 'auditor',      requiresSignature: true,  maxDurationHours: 168, auditTag: 'comms.cyber.audit' },
  ],
  emits: ['Interior', 'Treasury', 'Energy', 'Justice', 'Cabinet', 'Audit Vault'],
};

export const EMERGENCY_BROADCAST: CommsWorkflowDefinition = {
  id: 'emergency-broadcast',
  title: 'Emergency broadcast',
  archetype: 'broadcast',
  blueprintCitation: '§46.1 — emergency broadcast under constitutional safeguard',
  description: 'Verification → ministerial authorisation → broadcast → reach attestation → audit. Cell broadcast cannot be used for political messaging.',
  steps: [
    { id: 'verify',     kind: 'verification', title: 'Hazard verification',                role: 'public-information-officer', requiresSignature: true, maxDurationHours: 1,   auditTag: 'comms.broadcast.verify' },
    { id: 'authorise',  kind: 'decision',     title: 'Ministerial authorisation',          role: 'minister',                   requiresSignature: true, maxDurationHours: 2,   auditTag: 'comms.broadcast.authorise' },
    { id: 'broadcast',  kind: 'broadcast',    title: 'Multi-channel broadcast',            role: 'broadcast-engineer',         requiresSignature: true, maxDurationHours: 1,   auditTag: 'comms.broadcast.broadcast' },
    { id: 'attest',     kind: 'verification', title: 'Reach & equity attestation',         role: 'public-information-officer', requiresSignature: true, maxDurationHours: 12,  auditTag: 'comms.broadcast.attest' },
    { id: 'audit',      kind: 'audit',        title: 'Broadcast audit sealed',             role: 'auditor',                    requiresSignature: true, maxDurationHours: 168, auditTag: 'comms.broadcast.audit' },
  ],
  emits: ['Emergency Response', 'Interior', 'Audit Vault'],
};

export const SPECTRUM_LICENCE: CommsWorkflowDefinition = {
  id: 'spectrum-licence',
  title: 'Spectrum licence award',
  archetype: 'spectrum',
  blueprintCitation: '§37.5 — spectrum as a public resource',
  description: 'Application → technical review → public tender → ministerial award → audit. Allocation without tender is constitutionally void.',
  steps: [
    { id: 'apply',       kind: 'submission',   title: 'Licensee applies',                role: 'applicant',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'comms.spectrum.apply' },
    { id: 'review',      kind: 'verification', title: 'Technical & legal review',         role: 'spectrum-officer',  requiresSignature: true, maxDurationHours: 720, auditTag: 'comms.spectrum.review' },
    { id: 'tender',      kind: 'verification', title: 'Public tender conducted',          role: 'civilian-panel',    requiresSignature: true, maxDurationHours: 1440,auditTag: 'comms.spectrum.tender' },
    { id: 'award',       kind: 'decision',     title: 'Ministerial award',                role: 'minister',          requiresSignature: true, maxDurationHours: 168, auditTag: 'comms.spectrum.award' },
    { id: 'seal',        kind: 'sealing',      title: 'Licence sealed & published',       role: 'auditor',           requiresSignature: true, maxDurationHours: 72,  auditTag: 'comms.spectrum.seal' },
  ],
  emits: ['Treasury', 'Justice', 'Audit Vault'],
};

export const COMMS_WORKFLOWS: CommsWorkflowDefinition[] = [
  CYBER_INCIDENT_RESPONSE,
  EMERGENCY_BROADCAST,
  SPECTRUM_LICENCE,
];
