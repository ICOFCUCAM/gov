// lib/gov/ministry-character.ts
//
// Sovereign character per Tier-1 ministry shell. Used to enforce
// differentiation: no two ministries should feel the same. Each ministry
// declares its operational identity, interaction philosophy and signature
// accent so shells can present a distinctive sovereign character.

export interface MinistryCharacter {
  key: string;
  label: string;
  identity: string;
  interactionPhilosophy: string;
  accent: string;
}

export const MINISTRY_CHARACTER: MinistryCharacter[] = [
  { key: 'interior', label: 'Ministry of Interior',
    identity: 'Constitutional operational runtime — federation, observability & sovereign continuity.',
    interactionPhilosophy: 'Observe in aggregate; act through accountability; never through control.',
    accent: '#5fb0ff' },
  { key: 'treasury', label: 'Ministry of Treasury & Finance',
    identity: 'Sovereign financial nervous system — liquidity, fiscal command & lawful disbursement.',
    interactionPhilosophy: 'Disclose, audit, settle; never hide value flows.',
    accent: '#d8a23a' },
  { key: 'health', label: 'Ministry of Health',
    identity: 'Biosurvival coordination organism — clinical, public-health & population resilience.',
    interactionPhilosophy: 'Care, consent, continuity — never coercive bio-control.',
    accent: '#54d08f' },
  { key: 'justice', label: 'Ministry of Justice',
    identity: 'Procedural constitutional judiciary fabric — courts, oversight & lawful sanction.',
    interactionPhilosophy: 'Independence, due process, transparent reasoning.',
    accent: '#8a7df0' },
  { key: 'police-command', label: 'Police Command',
    identity: 'Civil-stability execution federated under Interior orchestration.',
    interactionPhilosophy: 'Lawful response within mandate — never beyond it.',
    accent: '#5fa8ff' },
  { key: 'transport', label: 'Ministry of Transport',
    identity: 'National mobility orchestration network — corridors, fleets & municipal flow.',
    interactionPhilosophy: 'Keep the nation moving; expose every interruption.',
    accent: '#45c0c8' },
  { key: 'education', label: 'Ministry of Education',
    identity: 'Knowledge continuity ecosystem — schools, curriculum & generational learning.',
    interactionPhilosophy: 'Open access, pluralistic curriculum, lawful literacy.',
    accent: '#e0a23a' },
  { key: 'environment', label: 'Ministry of Environment',
    identity: 'Ecological continuity infrastructure — biosphere, climate & resource continuity.',
    interactionPhilosophy: 'Equitable stewardship — never resource authoritarianism.',
    accent: '#3aa86f' },
  { key: 'immigration', label: 'Immigration & Borders',
    identity: 'Frontier continuity & lawful humanitarian processing.',
    interactionPhilosophy: 'Equitable processing; no discriminatory classification.',
    accent: '#5fa8ff' },
  { key: 'emergency-response', label: 'Emergency Response',
    identity: 'Crisis command — surge, coordination & rights-preserving emergency continuity.',
    interactionPhilosophy: 'Save & stabilize; emergency powers stay bounded & reviewable.',
    accent: '#e0673a' },
];

export function characterFor(key: string): MinistryCharacter | null {
  return MINISTRY_CHARACTER.find(c => c.key === key) ?? null;
}
