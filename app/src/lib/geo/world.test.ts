import { describe, it, expect } from 'vitest';
import { worldFeatures, findCountry, projectedPaths } from './world';

describe('worldFeatures', () => {
  it('returns Natural Earth country features with names', () => {
    const features = worldFeatures();
    expect(features.length).toBeGreaterThan(100); // ~242 countries
    expect(features.every(f => typeof f.geometry === 'object')).toBe(true);
  });
});

describe('findCountry', () => {
  it('finds an existing country (case-insensitive, trimmed)', () => {
    const found = findCountry('  france  ');
    expect(found?.properties?.name).toBeDefined();
  });

  it('returns undefined when no name is given', () => {
    expect(findCountry()).toBeUndefined();
    expect(findCountry('')).toBeUndefined();
  });

  it('returns undefined for a non-matching name', () => {
    expect(findCountry('Atlantis')).toBeUndefined();
  });
});

describe('projectedPaths', () => {
  it('returns one path per feature when fitting the whole world', () => {
    const paths = projectedPaths(800, 400);
    expect(paths.length).toBe(worldFeatures().length);
    expect(paths.every(p => typeof p.d === 'string')).toBe(true);
  });

  it('marks the focused feature when a focus is supplied', () => {
    const focus = findCountry('France');
    if (!focus) return;
    const paths = projectedPaths(800, 400, focus);
    const focused = paths.filter(p => p.focused);
    expect(focused).toHaveLength(1);
    expect(focused[0]!.name).toBe(focus.properties?.name);
  });
});
