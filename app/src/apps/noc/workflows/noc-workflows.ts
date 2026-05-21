// apps/noc/workflows — executable workflow contracts.

import type { NocArchetype } from '@/apps/noc/design-system/noc-ds';

export type NocStepKind =
  | 'observation' | 'fusion' | 'coordination' | 'recommendation'
  | 'cabinet-routing' | 'publication' | 'audit';

export interface NocWorkflowStep {
  id: string;
  kind: NocStepKind;
  title: string;
  role: 'duty-officer' | 'noc-director' | 'analyst' | 'cabinet-secretary' | 'auditor' | 'communications';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface NocWorkflowDefinition {
  id: string;
  title: string;
  archetype: NocArchetype;
  blueprintCitation: string;
  description: string;
  steps: NocWorkflowStep[];
  emits: string[];
}

export const CROSS_MINISTRY_COORDINATION: NocWorkflowDefinition = {
  id: 'cross-ministry-coordination',
  title: 'Cross-ministry coordination decision',
  archetype: 'decisions',
  blueprintCitation: '§12.1 — NOC coordination procedure',
  description: 'Observed → fused → coordinated → recommendation published → Cabinet decides (NOC never substitutes).',
  steps: [
    { id: 'observe',    kind: 'observation',     title: 'Cross-ministry signal observed',          role: 'duty-officer',     requiresSignature: true,  maxDurationHours: 1,   auditTag: 'noc.coord.observe' },
    { id: 'fuse',       kind: 'fusion',           title: 'Signals fused into operational picture',  role: 'analyst',          requiresSignature: true,  maxDurationHours: 4,   auditTag: 'noc.coord.fuse' },
    { id: 'coordinate', kind: 'coordination',     title: 'Ministries coordinated (no command)',     role: 'noc-director',     requiresSignature: true,  maxDurationHours: 24,  auditTag: 'noc.coord.coordinate' },
    { id: 'recommend',  kind: 'recommendation',   title: 'Recommendation published with rationale', role: 'noc-director',     requiresSignature: true,  maxDurationHours: 24,  auditTag: 'noc.coord.recommend' },
    { id: 'cabinet',    kind: 'cabinet-routing',  title: 'Routed to Cabinet for decision',          role: 'cabinet-secretary',requiresSignature: true,  maxDurationHours: 168, auditTag: 'noc.coord.cabinet' },
    { id: 'audit',      kind: 'audit',            title: 'Sealed to public audit',                  role: 'auditor',          requiresSignature: true,  maxDurationHours: 168, auditTag: 'noc.coord.audit' },
  ],
  emits: ['Cabinet', 'Affected Ministries', 'Audit Vault', 'Communications'],
};

export const INCIDENT_FUSION: NocWorkflowDefinition = {
  id: 'incident-fusion',
  title: 'National incident fusion',
  archetype: 'incidents',
  blueprintCitation: '§12.2 — national incident fusion',
  description: 'Multi-ministry incident → fused incident view → lead ministry assigned → coordination opened.',
  steps: [
    { id: 'detect',     kind: 'observation', title: 'Multi-ministry incident detected',          role: 'duty-officer',  requiresSignature: true,  maxDurationHours: 1,  auditTag: 'noc.incident.detect' },
    { id: 'fuse',       kind: 'fusion',      title: 'Incident view fused',                       role: 'analyst',       requiresSignature: true,  maxDurationHours: 4,  auditTag: 'noc.incident.fuse' },
    { id: 'assign',     kind: 'coordination',title: 'Lead ministry assigned (constitutional)',   role: 'noc-director',  requiresSignature: true,  maxDurationHours: 4,  auditTag: 'noc.incident.assign' },
    { id: 'coord',      kind: 'coordination',title: 'Cross-ministry coordination opened',        role: 'noc-director',  requiresSignature: true,  maxDurationHours: 24, auditTag: 'noc.incident.coord' },
    { id: 'audit',      kind: 'audit',       title: 'Sealed to incident registry',               role: 'auditor',       requiresSignature: true,  maxDurationHours: 168, auditTag: 'noc.incident.audit' },
  ],
  emits: ['Emergency Response', 'Lead Ministry', 'Cabinet', 'Audit Vault'],
};

export const PUBLIC_BRIEFING: NocWorkflowDefinition = {
  id: 'public-briefing',
  title: 'NOC public briefing cycle',
  archetype: 'briefing',
  blueprintCitation: '§12.3 — public briefing cadence',
  description: 'Draft → fact-check → translate → publish to citizens & archive.',
  steps: [
    { id: 'draft',     kind: 'recommendation', title: 'Briefing drafted',                role: 'analyst',        requiresSignature: true,  maxDurationHours: 1,  auditTag: 'noc.brief.draft' },
    { id: 'verify',    kind: 'fusion',         title: 'Fact-check across ministries',    role: 'noc-director',   requiresSignature: true,  maxDurationHours: 2,  auditTag: 'noc.brief.verify' },
    { id: 'translate', kind: 'publication',    title: 'Translated to all sovereign langs', role: 'communications', requiresSignature: false, maxDurationHours: 2,  auditTag: 'noc.brief.translate' },
    { id: 'publish',   kind: 'publication',    title: 'Published to public portal',      role: 'communications', requiresSignature: true,  maxDurationHours: 1,  auditTag: 'noc.brief.publish' },
    { id: 'audit',     kind: 'audit',          title: 'Sealed to briefing archive',      role: 'auditor',        requiresSignature: true,  maxDurationHours: 24, auditTag: 'noc.brief.audit' },
  ],
  emits: ['Citizen Portal', 'Communications', 'Audit Vault'],
};

export const NOC_WORKFLOWS: NocWorkflowDefinition[] = [
  CROSS_MINISTRY_COORDINATION,
  INCIDENT_FUSION,
  PUBLIC_BRIEFING,
];
