// lib/tone — shared TONE → entity-state mappings.
//
// Each surface used to declare its own tiny ternary helpers; consolidating
// here keeps the colour decisions consistent and lets the test suite pin
// the mapping in one place.

import { TONE } from '@/components/features/SituationRoom';

/** Escalation severities: national/major alert, minor warn, else link. */
export function severityTone(s: string): string | undefined {
  if (s === 'national' || s === 'major') return TONE.alert;
  if (s === 'minor') return TONE.warn;
  return TONE.link;
}

/** Work-item / dispatch priorities. */
export function priorityTone(p: string): string | undefined {
  if (p === 'critical' || p === 'urgent') return TONE.alert;
  if (p === 'priority') return TONE.warn;
  return TONE.link;
}

/** Directive lifecycle status. */
export function directiveStatusTone(s: string): string | undefined {
  if (s === 'effective') return TONE.ok;
  if (s === 'signed') return TONE.link;
  if (s === 'rescinded') return TONE.alert;
  return TONE.warn;
}

/** Dispatch lifecycle status. */
export function dispatchStatusTone(s: string): string | undefined {
  if (s === 'closed') return TONE.ok;
  if (s === 'acknowledged') return TONE.link;
  if (s === 'dispatched') return TONE.warn;
  return TONE.neutral;
}

/** Citizen consent lifecycle status. */
export function consentStatusTone(s: string): string | undefined {
  if (s === 'granted') return TONE.ok;
  if (s === 'revoked') return TONE.alert;
  if (s === 'expired') return TONE.warn;
  return TONE.link;
}
