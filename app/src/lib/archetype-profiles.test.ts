import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_PROFILES, ARCHETYPE_IDENTITY,
  profileFor, identityFor,
} from './archetype-profiles';
import type { ArchetypeKey } from '@/lib/api/types';

describe('profileFor', () => {
  it('returns the matching archetype profile', () => {
    const p = profileFor('HEALTH');
    expect(p.kpis.length).toBeGreaterThan(0);
  });

  it('falls back to GENERIC for unknown archetypes', () => {
    const p = profileFor('TOTALLY_UNKNOWN' as ArchetypeKey);
    expect(p).toBe(ARCHETYPE_PROFILES.GENERIC);
  });
});

describe('identityFor', () => {
  it('returns the matching archetype identity', () => {
    const id = identityFor('HEALTH');
    expect(id).toBeDefined();
  });

  it('falls back to GENERIC for unknown archetypes', () => {
    const id = identityFor('TOTALLY_UNKNOWN' as ArchetypeKey);
    expect(id).toBe(ARCHETYPE_IDENTITY.GENERIC);
  });
});

describe('ARCHETYPE_PROFILES', () => {
  it('every entry declares at least one KPI', () => {
    for (const [key, profile] of Object.entries(ARCHETYPE_PROFILES)) {
      expect(profile.kpis.length, `archetype ${key}`).toBeGreaterThan(0);
    }
  });

  it('every kpi range is well-ordered', () => {
    for (const [key, profile] of Object.entries(ARCHETYPE_PROFILES)) {
      for (const k of profile.kpis) {
        expect(k.range[0]!, `${key}/${k.key}`).toBeLessThanOrEqual(k.range[1]!);
      }
    }
  });

  it('every incident likelihood is between 0 and 1', () => {
    for (const [key, profile] of Object.entries(ARCHETYPE_PROFILES)) {
      for (const it of profile.incidentTypes) {
        expect(it.likelihood, `${key}/${it.key}`).toBeGreaterThanOrEqual(0);
        expect(it.likelihood, `${key}/${it.key}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('ARCHETYPE_IDENTITY', () => {
  it('archetype identity keys mirror archetype profile keys', () => {
    const profileKeys = new Set(Object.keys(ARCHETYPE_PROFILES));
    const identityKeys = new Set(Object.keys(ARCHETYPE_IDENTITY));
    for (const k of profileKeys) {
      expect(identityKeys.has(k), `archetype ${k}`).toBe(true);
    }
  });
});
