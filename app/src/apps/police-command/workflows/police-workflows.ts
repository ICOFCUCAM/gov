// apps/police-command/workflows/police-workflows.ts
//
// Executable workflow definitions for Police Command. Each workflow is
// a typed state machine: every step carries a role, a signing
// requirement, an SLA in hours and an audit-trail tag. Designed for the
// existing RuntimeQueue + Sovereign Audit Chain.
//
// Three workflows declared here:
//   1. incident-dispatch     — 911 call → triage → dispatch → on-scene → cleared
//   2. investigation-handoff — case opened → assigned → evidence → charge → prosecutor file
//   3. use-of-force-review   — incident → bodyworn audit → IA review → tribunal → disposition

import type { PoliceArchetype } from '@/apps/police-command/core/domains';

export type WorkflowStepKind =
  | 'submission' | 'triage' | 'dispatch' | 'execution'
  | 'verification' | 'review' | 'decision' | 'sealing' | 'tribunal';

export interface WorkflowStep {
  id: string;
  kind: WorkflowStepKind;
  title: string;
  role:
    | 'caller' | 'dispatcher' | 'watch-commander' | 'patrol-officer'
    | 'detective' | 'evidence-custodian' | 'prosecutor'
    | 'internal-affairs' | 'civilian-panel' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface PoliceWorkflowDefinition {
  id: string;
  title: string;
  archetype: PoliceArchetype;
  blueprintCitation: string;
  description: string;
  steps: WorkflowStep[];
  emits: string[];
}

export const INCIDENT_DISPATCH: PoliceWorkflowDefinition = {
  id: 'incident-dispatch',
  title: 'Incident dispatch',
  archetype: 'runtime',
  blueprintCitation: '§19 — National Security & Emergency Response · dispatch chain',
  description: 'Receive emergency call, triage to priority, dispatch units, log arrival, clear and file.',
  steps: [
    { id: 'call',     kind: 'submission',   title: '911 call received',            role: 'caller',          requiresSignature: false, maxDurationHours: 0.01, auditTag: 'police.dispatch.call' },
    { id: 'triage',   kind: 'triage',       title: 'Dispatcher triage to priority', role: 'dispatcher',      requiresSignature: true,  maxDurationHours: 0.05, auditTag: 'police.dispatch.triage' },
    { id: 'assign',   kind: 'dispatch',     title: 'Unit assignment',              role: 'dispatcher',      requiresSignature: true,  maxDurationHours: 0.05, auditTag: 'police.dispatch.assign' },
    { id: 'enroute',  kind: 'execution',    title: 'En-route confirmed',           role: 'patrol-officer',  requiresSignature: false, maxDurationHours: 0.1,  auditTag: 'police.dispatch.enroute' },
    { id: 'onscene',  kind: 'execution',    title: 'On-scene confirmed',           role: 'patrol-officer',  requiresSignature: true,  maxDurationHours: 0.25, auditTag: 'police.dispatch.onscene' },
    { id: 'clear',    kind: 'sealing',      title: 'Incident cleared & report filed', role: 'patrol-officer', requiresSignature: true, maxDurationHours: 2,   auditTag: 'police.dispatch.clear' },
  ],
  emits: ['Justice (if charged)', 'Health (if EMS dispatched)', 'Audit Chain'],
};

export const INVESTIGATION_HANDOFF: PoliceWorkflowDefinition = {
  id: 'investigation-handoff',
  title: 'Investigation handoff to prosecutor',
  archetype: 'casework',
  blueprintCitation: '§19 — investigative casework & §20 — prosecutorial interface',
  description: 'Open case, assign detective, collect evidence under custody chain, charge, hand off to prosecutor.',
  steps: [
    { id: 'open',     kind: 'submission',   title: 'Case opened',                  role: 'detective',         requiresSignature: true,  maxDurationHours: 2,   auditTag: 'police.case.open' },
    { id: 'assign',   kind: 'execution',    title: 'Lead detective assigned',      role: 'watch-commander',   requiresSignature: true,  maxDurationHours: 4,   auditTag: 'police.case.assign' },
    { id: 'evidence', kind: 'verification', title: 'Evidence intake & seal',       role: 'evidence-custodian',requiresSignature: true,  maxDurationHours: 48,  auditTag: 'police.case.evidence' },
    { id: 'charge',   kind: 'decision',     title: 'Charging decision',            role: 'detective',         requiresSignature: true,  maxDurationHours: 240, auditTag: 'police.case.charge' },
    { id: 'review',   kind: 'review',       title: 'Watch Commander concurrence', role: 'watch-commander',   requiresSignature: true,  maxDurationHours: 24,  auditTag: 'police.case.review' },
    { id: 'file',     kind: 'sealing',      title: 'File with prosecutor',         role: 'prosecutor',        requiresSignature: true,  maxDurationHours: 72,  auditTag: 'police.case.file' },
  ],
  emits: ['Justice (case-filing-approval)', 'Audit Chain', 'Forensics Laboratory'],
};

export const USE_OF_FORCE_REVIEW_WF: PoliceWorkflowDefinition = {
  id: 'use-of-force-review',
  title: 'Use-of-force mandatory review',
  archetype: 'tribunal',
  blueprintCitation: '§19 — sovereign use-of-force doctrine · constitutional safeguards',
  description: 'Every use-of-force incident triggers automatic bodyworn audit, IA review, and (where required) civilian tribunal disposition.',
  steps: [
    { id: 'incident', kind: 'submission',   title: 'Force incident logged',          role: 'patrol-officer',   requiresSignature: true,  maxDurationHours: 4,   auditTag: 'police.uof.incident' },
    { id: 'bwc',      kind: 'verification', title: 'Bodyworn camera audit',          role: 'auditor',          requiresSignature: true,  maxDurationHours: 24,  auditTag: 'police.uof.bwc' },
    { id: 'ia',       kind: 'review',       title: 'Internal Affairs review',        role: 'internal-affairs', requiresSignature: true,  maxDurationHours: 168, auditTag: 'police.uof.ia' },
    { id: 'panel',    kind: 'tribunal',     title: 'Civilian-panel concurrence (if escalated)', role: 'civilian-panel', requiresSignature: true, maxDurationHours: 720, auditTag: 'police.uof.panel' },
    { id: 'disposition', kind: 'decision',  title: 'Final disposition recorded',     role: 'internal-affairs', requiresSignature: true,  maxDurationHours: 96,  auditTag: 'police.uof.disposition' },
  ],
  emits: ['Complaints Tribunal', 'Justice', 'Audit Chain', 'Public notification (if upheld)'],
};

export const POLICE_WORKFLOWS: PoliceWorkflowDefinition[] = [
  INCIDENT_DISPATCH,
  INVESTIGATION_HANDOFF,
  USE_OF_FORCE_REVIEW_WF,
];
