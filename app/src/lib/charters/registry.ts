// CivicOS — AI Charter Registry (typed declarations).
// In production, charters live in a sovereign-controlled registry signed by
// constitutional officers (Companion 138). This file is the canonical
// in-app reference for the prototypes.

import type { AICharter } from '@/lib/types';

export const charters: AICharter[] = [
  {
    id: 'CH-014',
    title: 'Welfare Renewal Automation',
    decisionClass: 'C',
    ministry: 'Social Protection',
    status: 'halted',
    description:
      'Narrow-rule automation for low-risk welfare renewals where eligibility is stable and re-verification is current. Flags out-of-bounds cases to human review.',
    supervisor: 'Algorithmic Ombudsman',
  },
  {
    id: 'CH-017',
    title: 'Eligibility Copilot',
    decisionClass: 'B',
    ministry: 'Social Protection',
    status: 'green',
    description:
      'Drafts eligibility summaries and uncertainty disclosures for officer review. Officer signs every decision.',
    supervisor: 'Algorithmic Ombudsman',
  },
  {
    id: 'CH-021',
    title: 'Drought Supplement Detection',
    decisionClass: 'B',
    ministry: 'Social Protection',
    status: 'green',
    description:
      'Surfaces possible drought-supplement eligibility from hydrological data + decree status. Officer confirms.',
    supervisor: 'Algorithmic Ombudsman',
  },
  {
    id: 'CH-029',
    title: 'Plain-Language Editor Assistant',
    decisionClass: 'A',
    ministry: 'Cross-ministry',
    status: 'green',
    description: 'Suggests plain-language phrasing. People’s Editor reviews before publication.',
    supervisor: "People's Editor",
  },
  {
    id: 'CH-033',
    title: 'Multilingual Citizen Assistant',
    decisionClass: 'A',
    ministry: 'Cross-ministry',
    status: 'green',
    description:
      'Citizen-facing information assistant grounded in sovereign-validated terminology registry.',
    supervisor: 'Algorithmic Ombudsman',
  },
];

export function getCharter(id: string): AICharter | undefined {
  return charters.find(c => c.id === id);
}
