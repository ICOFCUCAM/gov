import { describe, it, expect } from 'vitest';
import { SAFEGUARD_DOCTRINE, safeguardDoctrineFor } from './safeguard-doctrine';
import { SAFEGUARD_REGISTRY } from './sovereign-safeguards';

describe('safeguard doctrine', () => {
  it('declares one doctrine sentence per registered safeguard family', () => {
    for (const s of SAFEGUARD_REGISTRY) {
      const d = safeguardDoctrineFor(s.key);
      expect(d.length).toBeGreaterThan(40);
      expect(d).toMatch(/\.$/);
    }
    expect(Object.keys(SAFEGUARD_DOCTRINE).length).toBeGreaterThanOrEqual(SAFEGUARD_REGISTRY.length);
  });

  it('falls back to empty string for unknown keys', () => {
    expect(safeguardDoctrineFor('does-not-exist')).toBe('');
  });
});
