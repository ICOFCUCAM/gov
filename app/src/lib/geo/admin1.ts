// Real administrative geography (public-domain Natural Earth admin-1),
// split per country into compact lazily-loaded files. Used by the live
// command maps so a selected country renders its true national outline
// and real provinces/states.
//
// The maps load TopoJSON packs (lib/geo/topo, built by scripts/build-topo.mjs
// from the source files in admin1/, boundaries/ and outline/): shared arcs on
// the source's own coordinate grid, in two detail levels. 'full' is every
// vertex of the source (drill-down, position checks, data services);
// 'overview' is simplified on the shared arcs, so neighbours still meet and no
// unit is dropped (the whole-nation map, small panels). Both decode to the same
// Admin1Country, with the same units, codes, names and label points.

import { feature } from 'topojson-client';
import COUNTRY_INDEX from './countries.json';
import BOUNDARY_INDEX from './boundaries/index.json';

/** Detail level of map shapes: simplified for drawing a whole nation, or every vertex. */
export type MapDetail = 'overview' | 'full';
export const isMapDetail = (d: unknown): d is MapDetail => d === 'overview' || d === 'full';

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
export interface BoundaryCredit { source: string; licence: string; year: string; /** Distribution channel, e.g. geoBoundaries or OCHA HDX. */ via?: string }

// Countries whose shapes were upgraded to match their official subdivisions
// (scripts/build-boundaries.mjs, geoBoundaries); all others keep Natural Earth.
const UPGRADED = BOUNDARY_INDEX as Record<string, BoundaryCredit & { units: number }>;
export interface CountryIndexEntry { iso3: string; iso2: string; name: string; continent: string; provinces: number }

export const COUNTRIES = COUNTRY_INDEX as CountryIndexEntry[];

const cache = new Map<string, Admin1Country>();

/** A pack as scripts/build-topo.mjs writes it: the country's fields ride along in `civicos`. */
type TopoObject = Parameters<typeof feature>[1];
export type ShapePack = Parameters<typeof feature>[0] & {
  objects: { units?: TopoObject; outline?: TopoObject };
  civicos: { iso3: string; iso2?: string; name?: string; from?: 'boundaries' | 'admin1' | 'outline'; detail: MapDetail };
};

/** The units of a pack, each with its own fields (in their source order) and its shape. */
export function packUnits<T>(t: ShapePack): (T & { geometry: Geom })[] {
  const units = t.objects.units;
  if (!units) return [];
  const fc = feature(t, units) as unknown as { features: { properties: T; geometry: Geom }[] };
  return fc.features.map(f => ({ ...f.properties, geometry: f.geometry }));
}

function decodeCountry(t: ShapePack): Admin1Country {
  const m = t.civicos;
  const base = { iso3: m.iso3, iso2: m.iso2 ?? '', name: m.name ?? m.iso3 };
  if (t.objects.outline) {
    const g = feature(t, t.objects.outline) as unknown as { geometry: Geom };
    return { ...base, provinces: [], outline: g.geometry };
  }
  const up = m.from === 'boundaries' ? UPGRADED[m.iso3] : undefined;
  return {
    ...base,
    provinces: packUnits<Omit<Admin1Province, 'geometry'>>(t),
    ...(up ? { attribution: { source: up.source, licence: up.licence, year: up.year, via: up.via ?? 'geoBoundaries' } } : {}),
  };
}

/**
 * Real geography for any country: provinces when available, otherwise the
 * true national outline (all ~242 countries). `detail` defaults to the
 * overview, for drawing; position checks, drill-down and data services ask
 * for 'full'.
 */
export async function loadCountry(iso3: string, detail: MapDetail = 'overview'): Promise<Admin1Country | null> {
  if (!/^[A-Z]{3}$/.test(iso3) || !isMapDetail(detail)) return null;
  const key = `${iso3}:${detail}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const mod = await import(`./topo/a1/${iso3}.${detail}.json`);
    const c = decodeCountry((mod.default ?? mod) as ShapePack);
    cache.set(key, c);
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
