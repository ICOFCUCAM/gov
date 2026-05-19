// lib/gov/sovereign-safeguards.ts
//
// Sovereign safeguards registry. Aggregates every constitutional safeguard
// set declared across the continuity engines into one structural registry.
// Used by both the apex ledger UI and the cross-engine invariant tests
// that lock the ethical boundary of the platform.

import { ETHICAL_GUARDRAILS } from '@/lib/gov/civic-legitimacy';
import { ECOLOGICAL_SAFEGUARDS } from '@/lib/gov/territorial-continuity';
import { CIVIC_IDENTITY_SAFEGUARDS } from '@/lib/gov/civilizational-identity';
import { KNOWLEDGE_SAFEGUARDS } from '@/lib/gov/knowledge-continuity';
import { GEOPOLITICAL_SAFEGUARDS } from '@/lib/gov/geopolitical-continuity';
import { EXISTENTIAL_SAFEGUARDS } from '@/lib/gov/existential-continuity';

export interface SafeguardSet {
  key: string;
  label: string;
  scope: string;
  perCitizenData: boolean;
  prohibited: readonly string[];
  extras: { label: string; value: boolean }[];
}

export const SAFEGUARD_REGISTRY: SafeguardSet[] = [
  { key: 'civic', label: 'Civic Legitimacy',
    scope: ETHICAL_GUARDRAILS.scope, perCitizenData: ETHICAL_GUARDRAILS.perCitizenData,
    prohibited: ETHICAL_GUARDRAILS.prohibited,
    extras: [{ label: 'politically neutral', value: ETHICAL_GUARDRAILS.politicallyNeutral }] },
  { key: 'ecological', label: 'Ecological / Territorial',
    scope: ECOLOGICAL_SAFEGUARDS.scope, perCitizenData: ECOLOGICAL_SAFEGUARDS.perCitizenData,
    prohibited: ECOLOGICAL_SAFEGUARDS.prohibited,
    extras: [{ label: 'equitable continuity', value: ECOLOGICAL_SAFEGUARDS.equitableContinuity }] },
  { key: 'civic-identity', label: 'Civilizational Identity',
    scope: CIVIC_IDENTITY_SAFEGUARDS.scope, perCitizenData: CIVIC_IDENTITY_SAFEGUARDS.perCitizenData,
    prohibited: CIVIC_IDENTITY_SAFEGUARDS.prohibited,
    extras: [
      { label: 'pluralistic', value: CIVIC_IDENTITY_SAFEGUARDS.pluralistic },
      { label: 'politically neutral', value: CIVIC_IDENTITY_SAFEGUARDS.politicallyNeutral },
    ] },
  { key: 'knowledge', label: 'Knowledge / Cognitive',
    scope: KNOWLEDGE_SAFEGUARDS.scope, perCitizenData: KNOWLEDGE_SAFEGUARDS.perCitizenData,
    prohibited: KNOWLEDGE_SAFEGUARDS.prohibited,
    extras: [
      { label: 'pluralistic', value: KNOWLEDGE_SAFEGUARDS.pluralistic },
      { label: 'politically neutral', value: KNOWLEDGE_SAFEGUARDS.politicallyNeutral },
    ] },
  { key: 'geopolitical', label: 'Strategic / Geopolitical',
    scope: GEOPOLITICAL_SAFEGUARDS.scope, perCitizenData: GEOPOLITICAL_SAFEGUARDS.perCitizenData,
    prohibited: GEOPOLITICAL_SAFEGUARDS.prohibited,
    extras: [
      { label: 'internationally lawful', value: GEOPOLITICAL_SAFEGUARDS.internationallyLawful },
      { label: 'defensive only', value: GEOPOLITICAL_SAFEGUARDS.defensiveOnly },
    ] },
  { key: 'existential', label: 'Existential / Species',
    scope: EXISTENTIAL_SAFEGUARDS.scope, perCitizenData: EXISTENTIAL_SAFEGUARDS.perCitizenData,
    prohibited: EXISTENTIAL_SAFEGUARDS.prohibited,
    extras: [
      { label: 'rights-preserving', value: EXISTENTIAL_SAFEGUARDS.rightsPreserving },
      { label: 'humanitarian', value: EXISTENTIAL_SAFEGUARDS.humanitarian },
    ] },
];

export function allProhibitedTerms(): string[] {
  return SAFEGUARD_REGISTRY.flatMap(s => s.prohibited as string[]);
}
