import { describe, it, expect } from 'vitest';
import { escalationChain, nextTier, escalationState } from './escalation';

describe('sovereign escalation hierarchy', () => {
  it('chains are ordered and non-empty per kind', () => {
    for (const k of ['ministry', 'agency', 'branch', 'citizen', 'officer'] as const) {
      const c = escalationChain(k);
      expect(c.length).toBeGreaterThan(1);
      expect(c.every(t => t.authority.length > 0)).toBe(true);
    }
  });

  it('escalation cannot skip tiers', () => {
    const c = escalationChain('agency');
    expect(nextTier('agency', c[0]!.tier)!.tier).toBe(c[1]!.tier);
    expect(nextTier('agency', c[c.length - 1]!.tier)).toBeNull();
  });

  it('escalation state rises with stress and is deterministic', () => {
    const low = escalationState('ministry', 5);
    const high = escalationState('ministry', 95);
    expect(escalationState('ministry', 95)).toEqual(high);
    const chain = escalationChain('ministry');
    expect(chain.findIndex(t => t.tier === high.current))
      .toBeGreaterThanOrEqual(chain.findIndex(t => t.tier === low.current));
    expect(typeof high.atApex).toBe('boolean');
  });
});
