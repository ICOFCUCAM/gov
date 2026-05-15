// CivicOS — shared types.
// Decision Class is the binding annotation on every AI-touching surface.
// Per Companion 138 (Constitutional AI Governance) and Companion 158
// (binding correction: humans govern, AI assists).

export type DecisionClass = 'A' | 'B' | 'C' | 'D' | 'E';

export const decisionClassLabel: Record<DecisionClass, string> = {
  A: 'Class A — Information only',
  B: 'Class B — Advisory',
  C: 'Class C — Narrow automation',
  D: 'Class D — Recommendation only',
  E: 'Class E — Sovereign coordination',
};

export const decisionClassDescription: Record<DecisionClass, string> = {
  A: 'The system surfaces information. No action is taken on the citizen.',
  B: 'The system drafts a recommendation. A named human officer signs the decision.',
  C: 'The system applies a narrow rule. Flagged cases route to a human; tripwires can halt.',
  D: 'The system surfaces patterns. Humans investigate, decide, and sign. Restricted-domain protections apply.',
  E: 'The system supports multi-authority coordination in a declared session. Each authority signs their own remit.',
};

export type Locale = 'en' | 'sw' | 'ar' | 'fr' | 'yo';

export interface LocaleSpec {
  code: Locale;
  name: string;
  dir: 'ltr' | 'rtl';
}

export interface Receipt {
  id: string;
  title: string;
  summary: string;
  amount?: string;
  currency?: string;
  channel?: string;
  date: string; // ISO
  officerName?: string;
  officerId?: string;
  aiClass?: DecisionClass;
  reasoning?: string[];
  hash?: string;
  contestable: boolean;
}

export interface Citizen {
  displayName: string;
  preferredLocale: Locale;
  // No global ID surfaced to UI — per-RP UIDs per Companion 03.
}

export interface Officer {
  name: string;
  id: string;
  role: string;
  team: string;
}

export interface AICharter {
  id: string;           // e.g. CH-014
  title: string;
  decisionClass: DecisionClass;
  ministry: string;
  status: 'green' | 'amber' | 'halted' | 'retired';
  description: string;
  supervisor: string;   // constitutional officer office
}
