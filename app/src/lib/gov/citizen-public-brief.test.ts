import { describe, it, expect } from 'vitest';
import { citizenPublicBrief } from './citizen-public-brief';

describe('citizen public brief', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(citizenPublicBrief(4000 * 240)))
      .toEqual(JSON.stringify(citizenPublicBrief(4000 * 240 + 970)));
  });

  it('never exposes per-citizen, ideological or surveillance fields', () => {
    const json = JSON.stringify(citizenPublicBrief(4000 * 222)).toLowerCase();
    for (const forbidden of ['officer', 'citizenid', 'ideolog', 'belief', 'opinion', 'partisan', 'profile', 'sentiment', 'loyalty', 'race', 'religio']) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });

  it('produces bounded aggregates and a short readable line', () => {
    const b = citizenPublicBrief(4000 * 333);
    expect(b.nationalHealth).toBeGreaterThanOrEqual(0);
    expect(b.nationalHealth).toBeLessThanOrEqual(100);
    expect(b.trustIndex).toBeGreaterThanOrEqual(0);
    expect(b.trustIndex).toBeLessThanOrEqual(100);
    expect(b.briefLine.length).toBeGreaterThan(40);
    expect(b.briefLine.length).toBeLessThan(220);
  });
});
