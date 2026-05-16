// Sovereign Escalation & Regional Hierarchy — shared federation contract.
//
// RULE 4: every institution operates a national → regional → local tier
// hierarchy with a defined escalation chain. This pure module derives the
// chain and the next legitimate escalation step for any app kind, so
// escalation cannot skip constituted tiers. No React/DOM.

import type { AppKind } from '@/services/constitutional-engine';

export type Tier = 'local' | 'regional' | 'national' | 'cabinet' | 'constitutional';

export interface EscalationTier { tier: Tier; authority: string }

const CHAINS: Record<AppKind, EscalationTier[]> = {
  ministry: [
    { tier: 'local', authority: 'District officer' },
    { tier: 'regional', authority: 'Regional director' },
    { tier: 'national', authority: 'Permanent Secretary' },
    { tier: 'cabinet', authority: 'Minister · Cabinet' },
  ],
  agency: [
    { tier: 'local', authority: 'Station / post commander' },
    { tier: 'regional', authority: 'Regional command' },
    { tier: 'national', authority: 'National command centre' },
    { tier: 'cabinet', authority: 'Security cabinet cell' },
  ],
  branch: [
    { tier: 'national', authority: 'Branch registrar / clerk' },
    { tier: 'constitutional', authority: 'Apex authority' },
  ],
  citizen: [
    { tier: 'local', authority: 'Service centre' },
    { tier: 'regional', authority: 'Regional support' },
    { tier: 'national', authority: 'National service desk' },
  ],
  officer: [
    { tier: 'local', authority: 'Desk supervisor' },
    { tier: 'regional', authority: 'Review board' },
    { tier: 'national', authority: 'Adjudication authority' },
  ],
};

export function escalationChain(kind: AppKind): EscalationTier[] {
  return CHAINS[kind] ?? CHAINS.ministry;
}

/** The next legitimate tier from a current tier — escalation may not skip. */
export function nextTier(kind: AppKind, current: Tier): EscalationTier | null {
  const chain = escalationChain(kind);
  const idx = chain.findIndex(c => c.tier === current);
  if (idx < 0) return chain[0] ?? null;
  return chain[idx + 1] ?? null;
}

export interface EscalationState { kind: AppKind; current: Tier; atApex: boolean; next: EscalationTier | null }
export function escalationState(kind: AppKind, stress: number): EscalationState {
  const chain = escalationChain(kind);
  // Current tier rises with operational stress, bounded to the chain.
  const idx = Math.min(chain.length - 1, Math.floor((stress / 100) * chain.length));
  const current = chain[idx]!.tier;
  const next = nextTier(kind, current);
  return { kind, current, atApex: next === null, next };
}
