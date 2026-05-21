import { describe, it, expect } from 'vitest';
import { relativeTime, duration, isoSeconds, ageMinutes } from './format';

describe('relativeTime', () => {
  const now = new Date('2026-05-20T12:00:00.000Z').getTime();

  it('returns "just now" for under one minute', () => {
    expect(relativeTime(now - 30_000, now)).toBe('just now');
  });

  it('returns minutes for under one hour', () => {
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(relativeTime(now - 59 * 60_000, now)).toBe('59m ago');
  });

  it('returns hours for under one day', () => {
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3h ago');
  });

  it('returns "yesterday" for exactly one day ago', () => {
    expect(relativeTime(now - 24 * 3_600_000, now)).toBe('yesterday');
  });

  it('returns "Nd ago" for under a week', () => {
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('3d ago');
  });

  it('falls back to an absolute date past a week', () => {
    const out = relativeTime(now - 30 * 86_400_000, now);
    expect(out).not.toMatch(/ago$/);
  });

  it('handles future timestamps with absolute formatting', () => {
    const out = relativeTime(now + 60_000, now);
    expect(out).not.toMatch(/ago$/);
  });
});

describe('duration', () => {
  it('returns "0m" for non-positive input', () => {
    expect(duration(0)).toBe('0m');
    expect(duration(-1)).toBe('0m');
  });

  it('formats sub-hour as minutes', () => {
    expect(duration(45 * 60_000)).toBe('45m');
  });

  it('formats sub-day as hours and minutes', () => {
    expect(duration(2 * 3_600_000 + 14 * 60_000)).toBe('2h 14m');
  });

  it('formats over-day as days and hours', () => {
    expect(duration(3 * 86_400_000 + 5 * 3_600_000)).toBe('3d 5h');
  });
});

describe('isoSeconds', () => {
  it('truncates milliseconds and appends Z', () => {
    expect(isoSeconds(Date.UTC(2026, 4, 20, 12, 34, 56, 789))).toBe('2026-05-20T12:34:56Z');
  });
});

describe('ageMinutes', () => {
  const now = new Date('2026-05-20T12:00:00.000Z').getTime();

  it('accepts ISO strings', () => {
    expect(ageMinutes('2026-05-20T11:55:00.000Z', now)).toBe(5);
  });

  it('accepts millisecond numbers', () => {
    expect(ageMinutes(now - 90_000, now)).toBe(1);
  });

  it('clamps negatives at zero', () => {
    expect(ageMinutes(now + 60_000, now)).toBe(0);
  });
});
