import { describe, it, expect } from 'vitest';
import { uuid7, uuid7Time, UUID7 } from './uuid7';

describe('UUID v7', () => {
  it('has the version and variant bits and the time it was minted', () => {
    const at = Date.parse('2026-10-19T08:30:00.123Z');
    const id = uuid7(at);
    expect(id).toMatch(UUID7);
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19]!);
    expect(uuid7Time(id)).toBe(at);
    expect(uuid7Time('not-a-uuid')).toBeNull();
  });

  it('sorts by time and does not repeat', () => {
    const a = uuid7(1_700_000_000_000), b = uuid7(1_700_000_000_001), c = uuid7(1_800_000_000_000);
    expect([c, a, b].sort()).toEqual([a, b, c]);
    const many = new Set(Array.from({ length: 5000 }, () => uuid7(1_700_000_000_000)));
    expect(many.size).toBe(5000);
  });
});
