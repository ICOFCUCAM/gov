import { describe, it, expect } from 'vitest';
import { MINISTRY_CHARACTER, characterFor } from './ministry-character';

describe('ministry character — no two ministries are the same', () => {
  it('every entry has unique key + label + identity', () => {
    const keys = new Set(MINISTRY_CHARACTER.map(c => c.key));
    const labels = new Set(MINISTRY_CHARACTER.map(c => c.label));
    const identities = new Set(MINISTRY_CHARACTER.map(c => c.identity));
    expect(keys.size).toBe(MINISTRY_CHARACTER.length);
    expect(labels.size).toBe(MINISTRY_CHARACTER.length);
    expect(identities.size).toBe(MINISTRY_CHARACTER.length);
  });

  it('every entry has a substantive identity & philosophy', () => {
    for (const c of MINISTRY_CHARACTER) {
      expect(c.identity.length).toBeGreaterThan(40);
      expect(c.interactionPhilosophy.length).toBeGreaterThan(20);
      expect(c.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('characterFor resolves known keys and returns null for unknown', () => {
    expect(characterFor('interior')?.label).toBe('Ministry of Interior');
    expect(characterFor('does-not-exist')).toBeNull();
  });

  it('accent collision is bounded — at most two ministries may share an accent', () => {
    const buckets = new Map<string, number>();
    for (const c of MINISTRY_CHARACTER) buckets.set(c.accent, (buckets.get(c.accent) ?? 0) + 1);
    for (const n of buckets.values()) expect(n).toBeLessThanOrEqual(2);
    expect(buckets.size).toBeGreaterThanOrEqual(6);
  });
});
