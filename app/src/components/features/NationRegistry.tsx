'use client';

import { applyNation, type NationFacts } from '@/lib/nation/registry';

/**
 * Hands the installed nation's facts (regions, map country, currency) to the
 * browser's nation registry before any page renders, so client engines match
 * the server. Renders nothing.
 */
export function NationRegistry({ facts }: { facts: NationFacts }) {
  applyNation(facts);
  return null;
}
