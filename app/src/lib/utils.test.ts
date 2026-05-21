import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatMinor, formatAmount } from './utils';

describe('cn', () => {
  it('joins string classnames', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('drops falsy values', () => {
    expect(cn('a', null, undefined, false, '')).toBe('a');
  });
  it('applies conditional object form', () => {
    expect(cn('a', { hidden: false, visible: true })).toBe('a visible');
  });
});

describe('formatDate', () => {
  it('formats an ISO string with the default option set', () => {
    const out = formatDate('2026-05-20T00:00:00.000Z', 'en');
    expect(out).toContain('2026');
    expect(out).toContain('May');
  });
  it('accepts a Date instance', () => {
    const out = formatDate(new Date('2026-05-20T00:00:00.000Z'), 'en');
    expect(out).toContain('2026');
  });
  it('returns empty string for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatMinor', () => {
  it('treats input as minor units (cents/sente)', () => {
    expect(formatMinor(12345, 'KES', 'en')).toMatch(/123/);
  });
});

describe('formatAmount', () => {
  it('formats with the requested currency symbol', () => {
    const out = formatAmount(100, 'USD', 'en-US');
    expect(out).toMatch(/\$|USD/);
  });
});
