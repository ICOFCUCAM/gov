import { describe, it, expect } from 'vitest';
import { charters, getCharter } from './registry';

describe('charters registry', () => {
  it('contains the documented seed entries', () => {
    expect(charters.length).toBeGreaterThan(0);
    expect(charters.every(c => c.id.startsWith('CH-'))).toBe(true);
  });

  it('uses unique ids', () => {
    const ids = charters.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('emits only the documented decision classes', () => {
    for (const c of charters) {
      expect(['A', 'B', 'C', 'D']).toContain(c.decisionClass);
    }
  });
});

describe('getCharter', () => {
  it('returns the matching entry by id', () => {
    expect(getCharter('CH-017')?.title).toBe('Eligibility Copilot');
  });

  it('returns undefined for unknown id', () => {
    expect(getCharter('CH-999')).toBeUndefined();
  });
});
