// apps/assembly/workflows — executable workflow contracts.

import type { AssemblyArchetype } from '@/apps/assembly/design-system/assembly-ds';

export type AssemblyStepKind =
  | 'submission' | 'reading' | 'committee' | 'amendment'
  | 'vote' | 'budget' | 'audit' | 'sealing' | 'petition';

export interface AssemblyWorkflowStep {
  id: string;
  kind: AssemblyStepKind;
  title: string;
  role:
    | 'member' | 'speaker' | 'committee-chair' | 'parliament-secretary'
    | 'finance-committee' | 'minister' | 'civilian-panel' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface AssemblyWorkflowDefinition {
  id: string;
  title: string;
  archetype: AssemblyArchetype;
  blueprintCitation: string;
  description: string;
  steps: AssemblyWorkflowStep[];
  emits: string[];
}

export const BUDGET_APPROPRIATION: AssemblyWorkflowDefinition = {
  id: 'budget-appropriation',
  title: 'Budget appropriation',
  archetype: 'budget',
  blueprintCitation: '§7.3 — annual appropriation requires Assembly vote',
  description: 'Tabled → finance-committee scrutiny → debate → appropriation vote → assent. Budget without Assembly vote is constitutionally void.',
  steps: [
    { id: 'table',     kind: 'submission', title: 'Treasury tables budget',           role: 'minister',          requiresSignature: true, maxDurationHours: 24,  auditTag: 'assembly.budget.table' },
    { id: 'scrutiny', kind: 'committee',  title: 'Finance-committee scrutiny',        role: 'finance-committee', requiresSignature: true, maxDurationHours: 720, auditTag: 'assembly.budget.scrutiny' },
    { id: 'debate',   kind: 'reading',    title: 'Floor debate',                       role: 'speaker',           requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.budget.debate' },
    { id: 'amend',    kind: 'amendment',  title: 'Amendments (line-by-line)',         role: 'speaker',           requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.budget.amend' },
    { id: 'vote',     kind: 'vote',       title: 'Appropriation vote (roll-call)',    role: 'speaker',           requiresSignature: true, maxDurationHours: 24,  auditTag: 'assembly.budget.vote' },
    { id: 'audit',    kind: 'audit',      title: 'Sealed to Hansard',                  role: 'auditor',           requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.budget.audit' },
  ],
  emits: ['Treasury', 'Senate', 'Cabinet', 'Audit Vault'],
};

export const CITIZEN_PETITION_DEBATE: AssemblyWorkflowDefinition = {
  id: 'citizen-petition-debate',
  title: 'Citizen petition debate (5000-threshold)',
  archetype: 'petitions',
  blueprintCitation: '§7.4 — petitions trigger Assembly debate at 5,000 signatures',
  description: 'Petition submitted → signatures collected → threshold met → debate scheduled → Assembly debates → response published.',
  steps: [
    { id: 'submit',     kind: 'submission', title: 'Citizen submits petition',          role: 'member',          requiresSignature: true, maxDurationHours: 24,  auditTag: 'assembly.petition.submit' },
    { id: 'collect',    kind: 'petition',   title: 'Signatures collected (>5,000)',     role: 'parliament-secretary', requiresSignature: true, maxDurationHours: 1440, auditTag: 'assembly.petition.collect' },
    { id: 'schedule',   kind: 'committee',  title: 'Debate scheduled (≤90 d)',          role: 'speaker',         requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.petition.schedule' },
    { id: 'debate',     kind: 'reading',    title: 'Assembly debates the petition',    role: 'speaker',         requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.petition.debate' },
    { id: 'respond',    kind: 'sealing',    title: 'Response published & sealed',      role: 'auditor',         requiresSignature: true, maxDurationHours: 168, auditTag: 'assembly.petition.respond' },
  ],
  emits: ['Senate', 'Cabinet', 'Citizen registry', 'Audit Vault'],
};

export const QUESTION_TIME_WORKFLOW: AssemblyWorkflowDefinition = {
  id: 'question-time',
  title: 'Question Time (weekly)',
  archetype: 'oversight',
  blueprintCitation: '§7.5 — weekly Question Time is constitutionally mandated',
  description: 'Questions submitted → minister assigned → on-floor answer → follow-ups → sealed to Hansard.',
  steps: [
    { id: 'submit',    kind: 'submission', title: 'Member submits question',          role: 'member',     requiresSignature: true, maxDurationHours: 24,  auditTag: 'assembly.qtime.submit' },
    { id: 'assign',    kind: 'committee',  title: 'Question assigned to minister',     role: 'speaker',    requiresSignature: true, auditTag: 'assembly.qtime.assign', maxDurationHours: 48 },
    { id: 'answer',    kind: 'reading',    title: 'Minister answers on the floor',     role: 'minister',   requiresSignature: true, maxDurationHours: 1,   auditTag: 'assembly.qtime.answer' },
    { id: 'followup',  kind: 'amendment',  title: 'Follow-up question (if required)',  role: 'member',     requiresSignature: false, maxDurationHours: 0.5, auditTag: 'assembly.qtime.followup' },
    { id: 'seal',      kind: 'sealing',    title: 'Sealed to Hansard',                  role: 'auditor',    requiresSignature: true, maxDurationHours: 24,  auditTag: 'assembly.qtime.seal' },
  ],
  emits: ['Cabinet', 'Senate', 'Audit Vault'],
};

export const ASSEMBLY_WORKFLOWS: AssemblyWorkflowDefinition[] = [
  BUDGET_APPROPRIATION,
  CITIZEN_PETITION_DEBATE,
  QUESTION_TIME_WORKFLOW,
];
