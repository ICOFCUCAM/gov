import { describe, it, expect, afterEach } from 'vitest';
import { applyNation, regionList, nationIso3, nationRegions, formatMoney } from './registry';

afterEach(() => applyNation({}));

describe('nation registry', () => {
  it('keeps each engine on its reference regions until a nation is installed', () => {
    const R = regionList(['Capital District', 'Northern']);
    expect([...R]).toEqual(['Capital District', 'Northern']);
    expect(R.length).toBe(2);
    expect(R[1]).toBe('Northern');
    expect(nationIso3()).toBeUndefined();
  });

  it('switches every region list to the nation\'s regions, live', () => {
    const R = regionList(['Capital District', 'Northern']);
    applyNation({ iso3: 'UGA', regions: ['Central', 'Eastern', 'Northern', 'Western'], currency: 'UGX' });
    expect(R.length).toBe(4);
    expect(R.map(r => r.toUpperCase())).toEqual(['CENTRAL', 'EASTERN', 'NORTHERN', 'WESTERN']);
    expect(R[Math.floor(0.99 * R.length)]).toBe('Western');
    expect(JSON.stringify(R)).toBe('["Central","Eastern","Northern","Western"]');
    expect(nationIso3()).toBe('UGA');
    expect(nationRegions()).toHaveLength(4);
  });

  it('rejects malformed codes and blank regions', () => {
    applyNation({ iso3: 'uganda', regions: ['  ', 'Central '], currency: 'shillings' });
    expect(nationIso3()).toBeUndefined();
    expect(nationRegions()).toEqual(['Central']);
    expect(formatMoney(1000, { compact: false })).toContain('1,000');
  });

  it('formats money in the nation\'s currency', () => {
    applyNation({ currency: 'UGX' });
    expect(formatMoney(2.84e9)).toMatch(/UGX\s?2\.84B/);
    applyNation({ currency: 'USD' });
    expect(formatMoney(2.84e9)).toBe('$2.84B');
  });
});
