// apps/senate/workflows — executable workflow contracts.

import type { SenateArchetype } from '@/apps/senate/design-system/senate-ds';

export type SenateStepKind =
  | 'submission' | 'reading' | 'committee' | 'consultation'
  | 'amendment' | 'vote' | 'concurrence' | 'sealing' | 'audit';

export interface SenateWorkflowStep {
  id: string;
  kind: SenateStepKind;
  title: string;
  role:
    | 'senator' | 'committee-chair' | 'speaker'
    | 'parliament-secretary' | 'civilian-panel' | 'auditor'
    | 'foreign-minister' | 'ethics-commissioner';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface SenateWorkflowDefinition {
  id: string;
  title: string;
  archetype: SenateArchetype;
  blueprintCitation: string;
  description: string;
  steps: SenateWorkflowStep[];
  emits: string[];
}

export const TREATY_RATIFICATION: SenateWorkflowDefinition = {
  id: 'treaty-ratification',
  title: 'Treaty ratification (Senate concurrence)',
  archetype: 'treaties',
  blueprintCitation: '§6.3 — treaty ratification & deposit',
  description: 'Tabled → committee review → public consultation → floor debate → two-thirds concurrence → deposit.',
  steps: [
    { id: 'table',       kind: 'submission',   title: 'Treaty tabled by Foreign Minister',  role: 'foreign-minister',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'senate.treaty.table' },
    { id: 'committee',   kind: 'committee',    title: 'Foreign Relations committee review',  role: 'committee-chair',     requiresSignature: true, maxDurationHours: 720, auditTag: 'senate.treaty.committee' },
    { id: 'consult',     kind: 'consultation', title: 'Public consultation window',          role: 'civilian-panel',      requiresSignature: true, maxDurationHours: 720, auditTag: 'senate.treaty.consult' },
    { id: 'debate',      kind: 'reading',      title: 'Floor debate',                        role: 'speaker',             requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.treaty.debate' },
    { id: 'vote',        kind: 'vote',         title: 'Two-thirds concurrence vote',         role: 'speaker',             requiresSignature: true, maxDurationHours: 24,  auditTag: 'senate.treaty.vote' },
    { id: 'deposit',     kind: 'sealing',      title: 'Ratification instrument deposited',   role: 'auditor',             requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.treaty.deposit' },
  ],
  emits: ['Foreign Affairs', 'Cabinet', 'Judicial Branch', 'Audit Vault'],
};

export const COMMITTEE_INQUIRY: SenateWorkflowDefinition = {
  id: 'committee-inquiry',
  title: 'Senate committee inquiry',
  archetype: 'committees',
  blueprintCitation: '§6.4 — investigative inquiry procedure',
  description: 'Mandate → hearings → witness testimony → findings → tabled report.',
  steps: [
    { id: 'mandate',     kind: 'submission', title: 'Inquiry mandate authorised',          role: 'committee-chair', requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.inquiry.mandate' },
    { id: 'hearings',   kind: 'committee',  title: 'Public hearings convened',            role: 'committee-chair', requiresSignature: true, maxDurationHours: 2160, auditTag: 'senate.inquiry.hearings' },
    { id: 'witnesses',  kind: 'committee',  title: 'Witness testimony recorded',          role: 'committee-chair', requiresSignature: true, maxDurationHours: 720, auditTag: 'senate.inquiry.witnesses' },
    { id: 'findings',   kind: 'amendment',  title: 'Findings & recommendations',          role: 'committee-chair', requiresSignature: true, maxDurationHours: 720, auditTag: 'senate.inquiry.findings' },
    { id: 'table',      kind: 'sealing',    title: 'Report tabled & sealed to Hansard',   role: 'auditor',         requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.inquiry.table' },
  ],
  emits: ['Cabinet', 'National Assembly', 'Justice', 'Audit Vault'],
};

export const SENATE_BILL_REVIEW: SenateWorkflowDefinition = {
  id: 'senate-bill-review',
  title: 'Senate bill review (second reading)',
  archetype: 'bills',
  blueprintCitation: '§6.2 — second-reading procedure',
  description: 'Assembly hand-off → second-reading debate → amendments → conference (if amended) → vote → ascertain or return.',
  steps: [
    { id: 'receive',    kind: 'submission',  title: 'Bill received from Assembly',         role: 'parliament-secretary', requiresSignature: true, maxDurationHours: 24,  auditTag: 'senate.bill.receive' },
    { id: 'reading',    kind: 'reading',     title: 'Second reading debate',                role: 'speaker',              requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.bill.reading' },
    { id: 'amend',      kind: 'amendment',   title: 'Amendments filed & considered',       role: 'committee-chair',      requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.bill.amend' },
    { id: 'conference', kind: 'concurrence', title: 'Conference committee (if amended)',   role: 'speaker',              requiresSignature: true, maxDurationHours: 720, auditTag: 'senate.bill.conference' },
    { id: 'vote',       kind: 'vote',        title: 'Final vote',                           role: 'speaker',              requiresSignature: true, maxDurationHours: 24,  auditTag: 'senate.bill.vote' },
    { id: 'audit',      kind: 'audit',       title: 'Vote sealed to Hansard',               role: 'auditor',              requiresSignature: true, maxDurationHours: 168, auditTag: 'senate.bill.audit' },
  ],
  emits: ['National Assembly', 'Cabinet', 'Audit Vault'],
};

export const SENATE_WORKFLOWS: SenateWorkflowDefinition[] = [
  TREATY_RATIFICATION,
  COMMITTEE_INQUIRY,
  SENATE_BILL_REVIEW,
];
