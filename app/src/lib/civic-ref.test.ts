import { describe, it, expect } from 'vitest';
import { civicRef } from './civic-ref';

describe('civicRef', () => {
  it('is deterministic for the same inputs', () => {
    expect(civicRef('AGT', 'subj', 'hello')).toBe(civicRef('AGT', 'subj', 'hello'));
  });

  it('differs by prefix and by content', () => {
    expect(civicRef('AGT', 'x', 'a')).not.toBe(civicRef('CMP', 'x', 'a'));
    expect(civicRef('AGT', 'x', 'a')).not.toBe(civicRef('AGT', 'x', 'b'));
  });

  it('formats as PREFIX-NNNNNN (6 digits)', () => {
    expect(civicRef('SHR', 'amina', 'health')).toMatch(/^SHR-\d{6}$/);
  });
});
