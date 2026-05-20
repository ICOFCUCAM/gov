// apps/ministry-energy/workflows — executable workflow contracts.
//
// Three workflows:
//   1. blackout-restoration       — detection → isolation → dispatch → restoration → audit
//   2. generation-dispatch        — demand forecast → unit-commitment → live dispatch
//   3. renewable-grid-connection  — request → feasibility → grid study → approval → metering

import type { EnergyArchetype } from '@/apps/ministry-energy/design-system/energy-ds';

export type EnergyStepKind =
  | 'detection' | 'isolation' | 'dispatch' | 'restoration'
  | 'audit' | 'forecast' | 'commitment' | 'execution'
  | 'submission' | 'feasibility' | 'review' | 'decision' | 'metering';

export interface EnergyWorkflowStep {
  id: string;
  kind: EnergyStepKind;
  title: string;
  role:
    | 'duty-operator' | 'system-operator' | 'control-room-lead'
    | 'field-crew' | 'minister' | 'grid-engineer'
    | 'applicant' | 'standards-officer' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface EnergyWorkflowDefinition {
  id: string;
  title: string;
  archetype: EnergyArchetype;
  blueprintCitation: string;
  description: string;
  steps: EnergyWorkflowStep[];
  emits: string[];
}

export const BLACKOUT_RESTORATION: EnergyWorkflowDefinition = {
  id: 'blackout-restoration',
  title: 'Blackout restoration',
  archetype: 'emergency',
  blueprintCitation: '§21.6 — blackout restoration chain & critical-services protection',
  description: 'Detect, isolate, dispatch crews, restore load, then close with audit.',
  steps: [
    { id: 'detect',     kind: 'detection',   title: 'Blackout detected',              role: 'duty-operator',     requiresSignature: false, maxDurationHours: 0.1, auditTag: 'energy.blackout.detect' },
    { id: 'isolate',    kind: 'isolation',   title: 'Fault isolated',                 role: 'system-operator',   requiresSignature: true,  maxDurationHours: 1,   auditTag: 'energy.blackout.isolate' },
    { id: 'dispatch',   kind: 'dispatch',    title: 'Crews dispatched',               role: 'control-room-lead', requiresSignature: true,  maxDurationHours: 2,   auditTag: 'energy.blackout.dispatch' },
    { id: 'restore',    kind: 'restoration', title: 'Load restoration (critical first)', role: 'field-crew',     requiresSignature: true,  maxDurationHours: 24,  auditTag: 'energy.blackout.restore' },
    { id: 'stabilise',  kind: 'execution',   title: 'Grid stabilised & energised',    role: 'system-operator',   requiresSignature: true,  maxDurationHours: 4,   auditTag: 'energy.blackout.stabilise' },
    { id: 'audit',      kind: 'audit',       title: 'Post-incident audit sealed',     role: 'auditor',           requiresSignature: true,  maxDurationHours: 168, auditTag: 'energy.blackout.audit' },
  ],
  emits: ['Health', 'Transport', 'Emergency Response', 'Audit Vault'],
};

export const GENERATION_DISPATCH: EnergyWorkflowDefinition = {
  id: 'generation-dispatch',
  title: 'Generation dispatch',
  archetype: 'generation',
  blueprintCitation: '§21.2 — generation operations & unit commitment',
  description: 'Demand forecast → unit-commitment plan → live economic dispatch → reconciliation.',
  steps: [
    { id: 'forecast',  kind: 'forecast',   title: 'Demand forecast',            role: 'system-operator',  requiresSignature: true, maxDurationHours: 1,  auditTag: 'energy.dispatch.forecast' },
    { id: 'commit',    kind: 'commitment', title: 'Unit-commitment plan',       role: 'control-room-lead',requiresSignature: true, maxDurationHours: 2,  auditTag: 'energy.dispatch.commit' },
    { id: 'dispatch',  kind: 'execution',  title: 'Live economic dispatch',     role: 'system-operator',  requiresSignature: true, maxDurationHours: 24, auditTag: 'energy.dispatch.dispatch' },
    { id: 'reconcile', kind: 'audit',      title: 'Settlement reconciled',      role: 'auditor',          requiresSignature: true, maxDurationHours: 72, auditTag: 'energy.dispatch.reconcile' },
  ],
  emits: ['Treasury', 'Audit Vault'],
};

export const RENEWABLE_GRID_CONNECTION: EnergyWorkflowDefinition = {
  id: 'renewable-grid-connection',
  title: 'Renewable grid connection',
  archetype: 'portal',
  blueprintCitation: '§21.8 — renewable integration & non-discriminatory access',
  description: 'Application → feasibility → grid impact study → ministerial approval → metering & onboarding.',
  steps: [
    { id: 'apply',       kind: 'submission',  title: 'Applicant files connection request', role: 'applicant',        requiresSignature: true, maxDurationHours: 24,  auditTag: 'energy.renewable.apply' },
    { id: 'feasibility', kind: 'feasibility', title: 'Feasibility assessment',              role: 'grid-engineer',    requiresSignature: true, maxDurationHours: 168, auditTag: 'energy.renewable.feasibility' },
    { id: 'study',       kind: 'review',      title: 'Grid-impact study',                   role: 'standards-officer',requiresSignature: true, maxDurationHours: 720, auditTag: 'energy.renewable.study' },
    { id: 'approve',     kind: 'decision',    title: 'Connection approved',                 role: 'minister',         requiresSignature: true, maxDurationHours: 168, auditTag: 'energy.renewable.approve' },
    { id: 'meter',       kind: 'metering',    title: 'Connection metered & energised',      role: 'grid-engineer',    requiresSignature: true, maxDurationHours: 168, auditTag: 'energy.renewable.meter' },
  ],
  emits: ['Environment', 'Treasury', 'Audit Vault'],
};

export const ENERGY_WORKFLOWS: EnergyWorkflowDefinition[] = [
  BLACKOUT_RESTORATION,
  GENERATION_DISPATCH,
  RENEWABLE_GRID_CONNECTION,
];
