import { describe, it, expect } from 'vitest';
import {
  EDUCATION_GROUPS, EDUCATION_DOMAINS, EDUCATION_LEGACY_KEYS,
  domainBySurface, resolveEducationSurface,
} from './domains';

describe('EDUCATION_GROUPS / EDUCATION_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const groupKeys = new Set(EDUCATION_GROUPS.map(g => g.key));
    for (const d of EDUCATION_DOMAINS) {
      expect(groupKeys.has(d.group), `domain ${d.surface}`).toBe(true);
    }
  });

  it('surface ids are unique', () => {
    const ids = EDUCATION_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = EDUCATION_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });

  it('returns undefined for unknown surfaces', () => {
    expect(domainBySurface('totally-unknown')).toBeUndefined();
  });
});

describe('resolveEducationSurface', () => {
  it('defaults to education-command when key is missing', () => {
    expect(resolveEducationSurface(null)).toBe('education-command');
    expect(resolveEducationSurface(undefined)).toBe('education-command');
    expect(resolveEducationSurface('')).toBe('education-command');
  });

  it('returns the input when it is already a valid surface', () => {
    const surface = EDUCATION_DOMAINS[1]!.surface;
    expect(resolveEducationSurface(surface)).toBe(surface);
  });

  it('migrates legacy keys', () => {
    const legacy = Object.keys(EDUCATION_LEGACY_KEYS)[0]!;
    expect(resolveEducationSurface(legacy)).toBe(EDUCATION_LEGACY_KEYS[legacy]);
  });

  it('falls back to the command surface for unknown keys', () => {
    expect(resolveEducationSurface('definitely-bogus')).toBe('education-command');
  });
});
