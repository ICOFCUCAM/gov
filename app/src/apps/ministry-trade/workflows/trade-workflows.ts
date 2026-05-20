// apps/ministry-trade/workflows — executable workflow contracts.

import type { TradeArchetype } from '@/apps/ministry-trade/design-system/trade-ds';

export type TradeStepKind =
  | 'submission' | 'review' | 'decision' | 'execution'
  | 'response' | 'audit' | 'tender' | 'sealing' | 'cabinet-review';

export interface TradeWorkflowStep {
  id: string;
  kind: TradeStepKind;
  title: string;
  role:
    | 'applicant' | 'standards-officer' | 'trade-officer'
    | 'minister' | 'cabinet-secretary' | 'civilian-panel'
    | 'industry-board' | 'auditor';
  requiresSignature: boolean;
  maxDurationHours: number;
  auditTag: string;
}

export interface TradeWorkflowDefinition {
  id: string;
  title: string;
  archetype: TradeArchetype;
  blueprintCitation: string;
  description: string;
  steps: TradeWorkflowStep[];
  emits: string[];
}

export const EXPORT_LICENCE: TradeWorkflowDefinition = {
  id: 'export-licence',
  title: 'Export licence',
  archetype: 'foreign',
  blueprintCitation: '§21.6 — non-discriminatory market access',
  description: 'Application → standards review → dual-use / sanctions check → ministerial decision → sealed licence.',
  steps: [
    { id: 'apply',    kind: 'submission', title: 'Exporter applies',                role: 'applicant',         requiresSignature: true, maxDurationHours: 24,  auditTag: 'trade.export.apply' },
    { id: 'review',   kind: 'review',     title: 'Standards & conformity review',    role: 'standards-officer', requiresSignature: true, maxDurationHours: 168, auditTag: 'trade.export.review' },
    { id: 'sanctions',kind: 'review',     title: 'Sanctions / dual-use review',      role: 'trade-officer',     requiresSignature: true, maxDurationHours: 72,  auditTag: 'trade.export.sanctions' },
    { id: 'decide',   kind: 'decision',   title: 'Licence issued',                   role: 'minister',          requiresSignature: true, maxDurationHours: 72,  auditTag: 'trade.export.decide' },
    { id: 'seal',     kind: 'sealing',    title: 'Licence sealed & published',       role: 'auditor',           requiresSignature: true, maxDurationHours: 72,  auditTag: 'trade.export.seal' },
  ],
  emits: ['Treasury', 'Foreign Affairs', 'Audit Vault'],
};

export const INDUSTRIAL_INCIDENT_RESPONSE: TradeWorkflowDefinition = {
  id: 'industrial-incident-response',
  title: 'Industrial incident response',
  archetype: 'crisis',
  blueprintCitation: '§21.7 — industrial incident response chain',
  description: 'Detect → containment → recovery pathway → audit; cascade to Transport, Energy, Labour, Treasury.',
  steps: [
    { id: 'detect',     kind: 'submission', title: 'Incident detected',           role: 'trade-officer',     requiresSignature: false, maxDurationHours: 1,   auditTag: 'trade.incident.detect' },
    { id: 'classify',   kind: 'review',     title: 'Severity & pathway classified', role: 'industry-board',  requiresSignature: true,  maxDurationHours: 4,   auditTag: 'trade.incident.classify' },
    { id: 'engage',     kind: 'execution',  title: 'Recovery pathway engaged',     role: 'minister',          requiresSignature: true,  maxDurationHours: 24,  auditTag: 'trade.incident.engage' },
    { id: 'restore',    kind: 'execution',  title: 'Output restored',              role: 'industry-board',    requiresSignature: true,  maxDurationHours: 720, auditTag: 'trade.incident.restore' },
    { id: 'audit',      kind: 'audit',      title: 'After-incident audit',         role: 'auditor',           requiresSignature: true,  maxDurationHours: 168, auditTag: 'trade.incident.audit' },
  ],
  emits: ['Transport', 'Energy', 'Labour', 'Treasury', 'Audit Vault'],
};

export const TRADE_AGREEMENT_RATIFICATION: TradeWorkflowDefinition = {
  id: 'trade-agreement-ratification',
  title: 'Trade agreement ratification',
  archetype: 'foreign',
  blueprintCitation: '§21.6 / §4.3 — trade agreement ratification',
  description: 'Negotiate → cabinet review → public consultation → ministerial signature → audit seal.',
  steps: [
    { id: 'negotiate', kind: 'submission',     title: 'Negotiation concluded',          role: 'trade-officer',     requiresSignature: true, maxDurationHours: 720,  auditTag: 'trade.agreement.negotiate' },
    { id: 'cabinet',   kind: 'cabinet-review', title: 'Cabinet review',                  role: 'cabinet-secretary', requiresSignature: true, maxDurationHours: 168,  auditTag: 'trade.agreement.cabinet' },
    { id: 'consult',   kind: 'tender',         title: 'Public consultation & industry brief', role: 'civilian-panel', requiresSignature: true, maxDurationHours: 720, auditTag: 'trade.agreement.consult' },
    { id: 'sign',      kind: 'decision',       title: 'Ministerial signature',           role: 'minister',          requiresSignature: true, maxDurationHours: 168,  auditTag: 'trade.agreement.sign' },
    { id: 'seal',      kind: 'sealing',        title: 'Agreement deposited & sealed',    role: 'auditor',           requiresSignature: true, maxDurationHours: 168,  auditTag: 'trade.agreement.seal' },
  ],
  emits: ['Foreign Affairs', 'Cabinet', 'Legislature', 'Audit Vault'],
};

export const TRADE_WORKFLOWS: TradeWorkflowDefinition[] = [
  EXPORT_LICENCE,
  INDUSTRIAL_INCIDENT_RESPONSE,
  TRADE_AGREEMENT_RATIFICATION,
];
