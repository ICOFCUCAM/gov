// apps/presidency/workflows — executable workflow contracts.

import type { PresidencyArchetype } from '@/apps/presidency/design-system/presidency-ds';

export type PresidencyStepKind =
  | 'drafting' | 'cabinet-review' | 'consultation' | 'judicial-review'
  | 'signing' | 'concurrence' | 'publication' | 'sealing' | 'audit';

export interface PresidencyWorkflowStep {
  id: string;
  kind: PresidencyStepKind;
  title: string;
  role:
    | 'president' | 'vice-president' | 'cabinet-secretary' | 'minister'
    | 'attorney-general' | 'civilian-panel' | 'auditor' | 'speaker' | 'senate-president';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface PresidencyWorkflowDefinition {
  id: string;
  title: string;
  archetype: PresidencyArchetype;
  blueprintCitation: string;
  description: string;
  steps: PresidencyWorkflowStep[];
  emits: string[];
}

export const EXECUTIVE_ORDER: PresidencyWorkflowDefinition = {
  id: 'executive-order',
  title: 'Executive order issuance',
  archetype: 'orders',
  blueprintCitation: '§2.2 — executive orders within constitutional bounds',
  description: 'Drafted by cabinet secretariat → cabinet review → attorney-general legality check → presidential signing → publication → judicial-review window.',
  steps: [
    { id: 'draft',       kind: 'drafting',         title: 'Order drafted by Cabinet Secretariat',      role: 'cabinet-secretary',  requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.order.draft' },
    { id: 'cabinet',     kind: 'cabinet-review',   title: 'Cabinet review & deliberation',             role: 'minister',           requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.order.cabinet' },
    { id: 'legality',    kind: 'judicial-review',  title: 'Attorney-General legality opinion',         role: 'attorney-general',   requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.order.legality' },
    { id: 'sign',        kind: 'signing',          title: 'Presidential signing in open session',      role: 'president',          requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.order.sign' },
    { id: 'publish',     kind: 'publication',      title: 'Publication in National Gazette',           role: 'cabinet-secretary',  requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.order.publish' },
    { id: 'audit',       kind: 'audit',            title: 'Sealed to Presidential Records Vault',      role: 'auditor',            requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.order.audit' },
  ],
  emits: ['Cabinet', 'National Assembly', 'Senate', 'Judicial Branch', 'Audit Vault'],
};

export const CABINET_RESOLUTION: PresidencyWorkflowDefinition = {
  id: 'cabinet-resolution',
  title: 'Cabinet resolution adoption',
  archetype: 'resolutions',
  blueprintCitation: '§2.3 — cabinet collective decision procedure',
  description: 'Tabled by minister → debate → concurrence vote → presidential ratification → publication.',
  steps: [
    { id: 'table',       kind: 'drafting',        title: 'Resolution tabled by a Minister',           role: 'minister',          requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.resolution.table' },
    { id: 'debate',      kind: 'cabinet-review',  title: 'Cabinet debate',                            role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.resolution.debate' },
    { id: 'concur',      kind: 'concurrence',     title: 'Concurrence vote (≥ ⅔ of Cabinet)',         role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.resolution.concur' },
    { id: 'ratify',      kind: 'signing',         title: 'Presidential ratification',                 role: 'president',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.resolution.ratify' },
    { id: 'publish',     kind: 'publication',     title: 'Publication & cascade to ministries',       role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.resolution.publish' },
    { id: 'audit',       kind: 'audit',           title: 'Sealed to Cabinet Records',                 role: 'auditor',           requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.resolution.audit' },
  ],
  emits: ['Cabinet', 'Senate', 'National Assembly', 'Audit Vault'],
};

export const MINISTERIAL_APPOINTMENT: PresidencyWorkflowDefinition = {
  id: 'ministerial-appointment',
  title: 'Ministerial appointment with Senate concurrence',
  archetype: 'ministers',
  blueprintCitation: '§2.6 — ministerial nominations',
  description: 'Nomination → Senate vetting → concurrence → swearing-in → cascade to the ministry.',
  steps: [
    { id: 'nominate',    kind: 'drafting',        title: 'Presidential nomination filed',             role: 'president',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.appoint.nominate' },
    { id: 'vet',         kind: 'consultation',    title: 'Senate vetting committee hearings',          role: 'senate-president',  requiresSignature: true, maxDurationHours: 720, auditTag: 'presidency.appoint.vet' },
    { id: 'concur',      kind: 'concurrence',     title: 'Senate concurrence vote',                    role: 'senate-president',  requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.appoint.concur' },
    { id: 'oath',        kind: 'signing',         title: 'Public swearing-in in open chamber',         role: 'president',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.appoint.oath' },
    { id: 'cascade',     kind: 'publication',     title: 'Cascade to ministry & federation',           role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 24,  auditTag: 'presidency.appoint.cascade' },
    { id: 'audit',       kind: 'audit',           title: 'Sealed to Appointments Records',             role: 'auditor',           requiresSignature: true, maxDurationHours: 168, auditTag: 'presidency.appoint.audit' },
  ],
  emits: ['Senate', 'Cabinet', 'Target Ministry', 'Audit Vault'],
};

export const PRESIDENCY_WORKFLOWS: PresidencyWorkflowDefinition[] = [
  EXECUTIVE_ORDER,
  CABINET_RESOLUTION,
  MINISTERIAL_APPOINTMENT,
];
