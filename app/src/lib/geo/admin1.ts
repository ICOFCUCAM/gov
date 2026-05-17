// Real administrative geography (public-domain Natural Earth admin-1),
// split per country into compact lazily-loaded files. Used by the live
// command maps so a selected country renders its true national outline
// and real provinces/states.

import COUNTRY_INDEX from './countries.json';

export type Lang = 'en' | 'fr' | 'es' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi';

export interface Admin1Province {
  name: string;
  i18n: Record<Lang, string>;
  code: string;
  lng: number;
  lat: number;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}
export interface Admin1Country {
  iso3: string;
  iso2: string;
  name: string;
  provinces: Admin1Province[];
}
export interface CountryIndexEntry { iso3: string; iso2: string; name: string; provinces: number }

export const COUNTRIES = COUNTRY_INDEX as CountryIndexEntry[];

const cache = new Map<string, Admin1Country>();

export async function loadCountry(iso3: string): Promise<Admin1Country | null> {
  const cached = cache.get(iso3);
  if (cached) return cached;
  try {
    const mod = await import(`./admin1/${iso3}.json`);
    const c = (mod.default ?? mod) as Admin1Country;
    cache.set(iso3, c);
    return c;
  } catch {
    return null;
  }
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' }, { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' }, { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' }, { code: 'hi', label: 'हिन्दी' },
];

export function provinceLabel(p: Admin1Province, lang: Lang): string {
  return p.i18n?.[lang] || p.i18n?.en || p.name;
}
