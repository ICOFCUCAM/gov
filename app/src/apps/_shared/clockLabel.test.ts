import { describe, it, expect } from 'vitest';
import { clockLabel } from './InstitutionChain';

describe('clockLabel', () => {
  const base = new Date('2026-05-19T14:30:00').getTime();

  it('shows HH:MM only for same-day messages', () => {
    const at = new Date('2026-05-19T09:05:00').getTime();
    expect(clockLabel(at, base)).toBe('09:05');
  });

  it('prefixes DD/MM for messages on a different day', () => {
    const at = new Date('2026-05-17T23:45:00').getTime();
    expect(clockLabel(at, base)).toBe('17/05 23:45');
  });

  it('treats a later same-day moment as same day', () => {
    const at = new Date('2026-05-19T23:59:00').getTime();
    expect(clockLabel(at, base)).toBe('23:59');
  });

  it('shows the date across a year boundary (different day → DD/MM)', () => {
    const nyEve = new Date('2025-12-31T23:50:00').getTime();
    const nyDay = new Date('2026-01-01T00:10:00').getTime();
    expect(clockLabel(nyEve, nyDay)).toBe('31/12 23:50');
    // same calendar day in the new year → time only
    expect(clockLabel(new Date('2026-01-01T08:00:00').getTime(), nyDay)).toBe('08:00');
  });
});
