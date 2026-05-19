// lib/gov/safeguard-doctrine.ts
//
// Formal one-sentence doctrine per safeguard family. Surfaces the
// constitutional purpose each safeguard exists to protect, so the
// ledger reads as governance — not as a compliance checklist.

export const SAFEGUARD_DOCTRINE: Record<string, string> = {
  'civic': 'Civic legitimacy is observed in aggregate so accountability is preserved without surveilling citizens.',
  'ecological': 'Territorial continuity is preserved equitably — never through coercive population or resource control.',
  'civic-identity': 'Identity continuity is preserved pluralistically — civic belonging, never ethnic or ideological classification.',
  'knowledge': 'Knowledge continuity is preserved through learning resilience — never through cognitive profiling or censorship.',
  'geopolitical': 'Sovereign continuity within an interconnected world is preserved defensively — never through aggression or influence operations.',
  'existential': 'Civilization survivability is preserved with constitutional humanity intact — never through emergency authoritarianism.',
};

export function safeguardDoctrineFor(key: string): string {
  return SAFEGUARD_DOCTRINE[key] ?? '';
}
