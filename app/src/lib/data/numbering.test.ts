import { describe, it, expect } from 'vitest';
import { nextNumber, legacyMax } from './numbering';
import { counterFields } from './repo/documents';

describe('record numbers', () => {
  it('rise across years, continue from the per-year counters of earlier snapshots, and are counters the postgres backend reserves', () => {
    const store: Record<string, unknown> = { seq: { TIN2025: 12, TIN2026: 3, ASM2026: 40 } };
    store.tinSeq = legacyMax(store.seq as Record<string, number>, 'TIN');
    expect(store.tinSeq).toBe(12);
    expect(nextNumber(store, 'tinSeq', 'TIN', new Date('2026-05-01'))).toBe('TIN-2026-000013');
    expect(nextNumber(store, 'tinSeq', 'TIN', new Date('2027-01-02'))).toBe('TIN-2027-000014');
    expect(counterFields(store)).toEqual(['tinSeq']);
    expect(legacyMax({ '2025': 7, '2026': 2 })).toBe(7);
    expect(() => nextNumber(store, 'tins', 'TIN', new Date())).toThrow(/Seq/);
  });
});
