// Real administrative geography (public-domain Natural Earth admin-1),
// split per country into compact lazily-loaded files. Used by the live
// command maps so a selected country renders its true national outline
// and real provinces/states.

import COUNTRY_INDEX from './countries.json';
import BOUNDARY_INDEX from './boundaries/index.json';

export type Lang = 'en' | 'fr' | 'es' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi';

export interface Admin1Province {
  name: string;
  /** Translated names; upgraded shapes of new units may carry English only. */
  i18n: Partial<Record<Lang, string>>;
  code: string;
  lng: number;
  lat: number;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}
export interface Geom { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
export interface Admin1Country {
  iso3: string;
  iso2: string;
  name: string;
  provinces: Admin1Province[];
  outline?: Geom;
  /** Set when the shapes come from an upgraded boundary source (credited on the map). */
  attribution?: BoundaryCredit;
}
export interface BoundaryCredit { source: string; licence: string; year: string }

// Countries whose shapes were upgraded to match their official subdivisions
// (scripts/build-boundaries.mjs, geoBoundaries); all others keep Natural Earth.
const UPGRADED = BOUNDARY_INDEX as Record<string, BoundaryCredit & { units: number }>;
export interface CountryIndexEntry { iso3: string; iso2: string; name: string; continent: string; provinces: number }

export const COUNTRIES = COUNTRY_INDEX as CountryIndexEntry[];

const cache = new Map<string, Admin1Country>();

// Real geography for any country: provinces when available (9 federal
// states), otherwise the true national outline (all ~242 countries).
export async function loadCountry(iso3: string): Promise<Admin1Country | null> {
  const cached = cache.get(iso3);
  if (cached) return cached;
  const meta = COUNTRIES.find(c => c.iso3 === iso3);
  try {
    const up = UPGRADED[iso3];
    if (up) {
      const mod = await import(`./boundaries/${iso3}.json`).catch(() => null);
      if (mod) {
        const c = { ...((mod.default ?? mod) as Admin1Country), attribution: { source: up.source, licence: up.licence, year: up.year } };
        cache.set(iso3, c);
        return c;
      }
    }
    if (meta && meta.provinces > 0) {
      const mod = await import(`./admin1/${iso3}.json`);
      const c = (mod.default ?? mod) as Admin1Country;
      cache.set(iso3, c);
      return c;
    }
    const mod = await import(`./outline/${iso3}.json`);
    const o = (mod.default ?? mod) as { iso3: string; iso2: string; name: string; geometry: Geom };
    const c: Admin1Country = { iso3: o.iso3, iso2: o.iso2, name: o.name, provinces: [], outline: o.geometry };
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
