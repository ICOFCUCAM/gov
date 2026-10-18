// The geography a map draws for the installed nation: its units (the regions
// it uses, in its own official order), each with its real shape and code, the
// national outline, the noun the nation uses ("county", "state") and the
// credit for the boundaries. Shapes come by ISO code from lib/geo (Natural
// Earth admin-1, upgraded per country from geoBoundaries / OCHA HDX); names
// are matched across the region list, the official subdivision list and the
// boundary file. Never a fixed number of slots: a nation with 51 states gets
// 51 units, one with 135 districts gets 135.

import { loadCountry, type Admin1Province, type Geom } from '@/lib/geo/admin1';
import { loadDivisions, defaultUnits, divisionNoun } from '@/lib/geo/divisions';
import { geoCentroid } from 'd3-geo';
import { nameKeys } from './names';

export interface MapUnit {
  /** ISO 3166-2 code when the unit is matched to an official subdivision. */
  code?: string;
  /** The name the nation uses (its region list). */
  name: string;
  geometry?: Geom;
  /** Label point (the boundary file's centroid). */
  lng?: number;
  lat?: number;
}

export interface NationGeography {
  iso3: string;
  name: string;
  units: MapUnit[];
  /** Shapes of subdivisions not in the nation's region list, drawn as context only. */
  context: Geom[];
  outline?: Geom;
  noun: string;
  credit: string;
}

/**
 * The nation's units for a map. `regions` is the nation's region list
 * (nationRegions()); when empty, the official subdivisions in their order.
 */
export async function loadNationGeography(iso3: string, regions: readonly string[]): Promise<NationGeography | null> {
  const [country, levels] = await Promise.all([loadCountry(iso3), loadDivisions(iso3).catch(() => [])]);
  if (!country) return null;
  const provinces = country.provinces;
  const byCode = new Map(provinces.map(p => [p.code, p]));
  const byName = new Map<string, Admin1Province>();
  for (const p of provinces) for (const k of nameKeys(p.name, ...Object.values(p.i18n ?? {}))) if (!byName.has(k)) byName.set(k, p);
  // Official subdivisions, every level, by name → code (a region list may use districts, not provinces).
  const official = levels.flatMap(l => l.units);
  const codeByName = new Map<string, string>();
  for (const d of official) for (const k of nameKeys(d.name)) if (!codeByName.has(k)) codeByName.set(k, d.code);

  const shapeFor = (name: string, code?: string): Admin1Province | undefined =>
    (code ? byCode.get(code) : undefined) ?? nameKeys(name).map(k => byName.get(k)).find(Boolean);
  // A unit the boundary data holds only one or two levels down (Uganda's regions are its districts,
  // the United Kingdom's nations its council areas, France's regions its departments) is drawn as
  // its official sub-units together.
  const childrenOf = new Map<string, string[]>();
  for (const d of official) if (d.parent) childrenOf.set(d.parent, [...(childrenOf.get(d.parent) ?? []), d.code]);
  const partsOf = (code: string, depth = 0): Admin1Province[] => {
    const direct = byCode.get(code);
    if (direct) return [direct];
    if (depth > 2) return [];
    return (childrenOf.get(code) ?? []).flatMap(c => partsOf(c, depth + 1));
  };
  const merge = (parts: Admin1Province[]): Geom => ({
    type: 'MultiPolygon',
    coordinates: parts.flatMap(p => (p.geometry.type === 'Polygon' ? [p.geometry.coordinates as number[][][]] : (p.geometry.coordinates as number[][][][]))),
  });

  const level = levels[0];
  const list: { name: string; code?: string }[] = regions.length
    ? regions.map(name => ({ name, code: nameKeys(name).map(k => codeByName.get(k)).find(Boolean) }))
    : level ? defaultUnits(level).map(d => ({ name: d.name, code: d.code }))
    : provinces.map(p => ({ name: p.name, code: p.code }));

  const used = new Set<Admin1Province>();
  const units: MapUnit[] = list.map(({ name, code }) => {
    const p = shapeFor(name, code);
    if (p) { used.add(p); return { name, code: code ?? p.code, geometry: p.geometry, lng: p.lng, lat: p.lat }; }
    const parts = code ? partsOf(code) : [];
    if (!parts.length) return { name, ...(code ? { code } : {}) };
    parts.forEach(q => used.add(q));
    const geometry = merge(parts);
    const [lng, lat] = geoCentroid({ type: 'Feature', properties: {}, geometry } as never);
    return { name, code, geometry, lng, lat };
  });
  const a = country.attribution;
  return {
    iso3,
    name: country.name,
    units,
    context: provinces.filter(p => !used.has(p)).map(p => p.geometry),
    ...(country.outline ? { outline: country.outline } : {}),
    noun: level ? divisionNoun(level) : 'region',
    credit: a ? `${a.source} (${a.licence}${a.via ? `, via ${a.via}` : ''})` : 'Natural Earth (public domain)',
  };
}
