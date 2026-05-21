import { describe, it, expect } from 'vitest';
import { COUNTRIES, LANGS, provinceLabel, type Admin1Province } from './admin1';

describe('COUNTRIES index', () => {
  it('is non-empty and every entry carries a name and a non-negative province count', () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
    for (const c of COUNTRIES) {
      expect(c.iso3.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.provinces).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses unique iso3 codes', () => {
    const codes = COUNTRIES.map(c => c.iso3);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('LANGS', () => {
  it('lists the eight documented languages', () => {
    expect(LANGS.map(l => l.code)).toEqual(['en','fr','es','pt','ru','zh','ar','hi']);
  });
});

describe('provinceLabel', () => {
  const province: Admin1Province = {
    name: 'Default Name',
    i18n: { en: 'English', fr: 'French', es: 'Spanish', pt: 'PT', ru: '', zh: '', ar: '', hi: '' },
    code: 'X-01', lng: 0, lat: 0,
    geometry: { type: 'Polygon', coordinates: [[[0,0]]] },
  };

  it('returns the requested-locale label when present', () => {
    expect(provinceLabel(province, 'fr')).toBe('French');
  });

  it('falls back to the English label when the requested locale is empty', () => {
    expect(provinceLabel(province, 'ru')).toBe('English');
  });

  it('falls back to the canonical name when both requested and English are empty', () => {
    const stripped: Admin1Province = {
      ...province,
      i18n: { en: '', fr: '', es: '', pt: '', ru: '', zh: '', ar: '', hi: '' },
    };
    expect(provinceLabel(stripped, 'ru')).toBe('Default Name');
  });
});
