// The geography a map draws for the installed nation: its units (the regions
// it uses, in its own official order), each with its real shape and code, the
// national outline, the noun the nation uses ("county", "state") and the
// credit for the boundaries. Shapes come by ISO code from lib/geo (Natural
// Earth admin-1, upgraded per country from geoBoundaries / OCHA HDX); names
// are matched across the region list, the official subdivision list and the
// boundary file. When the nation's mapping authority has published its own
// boundaries (lib/data/boundaries.ts), the version in force replaces the
// bundled shapes for its level and is credited. Never a fixed number of slots: a nation with 51 states gets
// 51 units, one with 135 districts gets 135.
//
// Detail: the whole-nation map draws the overview shapes (simplified on shared
// borders, same units); an opened region, the districts and every position
// check (placePoint(), incident places, boundary versions) use the full shapes.
// Callers that test points against the nation's units pass 'full'.

import { loadCountry, type Admin1Province, type Geom, type MapDetail } from '@/lib/geo/admin1';
import { hasAdmin2, loadAdmin2, type Admin2Country } from '@/lib/geo/admin2';
import { loadDivisions, defaultUnits, divisionNoun } from '@/lib/geo/divisions';
import { geoCentroid } from 'd3-geo';
import { nameKeys } from './names';
import { activeBoundary } from './boundary-active';

export interface MapUnit {
  /** ISO 3166-2 code when the unit is matched to an official subdivision. */
  code?: string;
  /** The name the nation uses (its region list). */
  name: string;
  geometry?: Geom;
  /** Label point (the boundary file's centroid). */
  lng?: number;
  lat?: number;
  /** The unit has units beneath it with shapes, so the map can open it (districts of a region). */
  drill?: boolean;
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
  /** Official codes of other levels (districts while the map shows regions): figures keyed by them are not "unplaced". */
  otherCodes?: string[];
  /** Set when this geography is one unit opened to the units beneath it. */
  parent?: { name: string; code?: string };
}

/**
 * The nation's units for a map. `regions` is the nation's region list
 * (nationRegions()); when empty, the official subdivisions in their order.
 */
export async function loadNationGeography(iso3: string, regions: readonly string[], detail: MapDetail = 'overview'): Promise<NationGeography | null> {
  const [bundled, levels, own, ownDistricts] = await Promise.all([loadCountry(iso3, detail), loadDivisions(iso3).catch(() => []), activeBoundary(iso3, 1), activeBoundary(iso3, 2)]);
  if (!bundled) return null;
  const country = own ? { ...bundled, provinces: own.units.map(u => ({ name: u.name, i18n: {} as Admin1Province['i18n'], code: u.code, lng: u.lng, lat: u.lat, geometry: u.geometry })) } : bundled;
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

  const districts = hasAdmin2(iso3) || !!ownDistricts;
  // A unit opens to the units beneath it when they have shapes: its official children, or district shapes.
  const opens = (code?: string) => !!code && (districts || (childrenOf.get(code) ?? []).some(c => partsOf(c, 1).length > 0));
  const used = new Set<Admin1Province>();
  const units: MapUnit[] = list.map(({ name, code }) => {
    const p = shapeFor(name, code);
    const drill = opens(code ?? p?.code) ? { drill: true } : {};
    if (p) { used.add(p); return { name, code: code ?? p.code, geometry: p.geometry, lng: p.lng, lat: p.lat, ...drill }; }
    const parts = code ? partsOf(code) : [];
    if (!parts.length) return { name, ...(code ? { code } : {}) };
    parts.forEach(q => used.add(q));
    const geometry = merge(parts);
    const [lng, lat] = geoCentroid({ type: 'Feature', properties: {}, geometry } as never);
    return { name, code, geometry, lng, lat, ...drill };
  });
  const shown = new Set(units.map(u => u.code).filter(Boolean));
  const a = country.attribution;
  return {
    iso3,
    name: country.name,
    units,
    context: provinces.filter(p => !used.has(p)).map(p => p.geometry),
    ...(country.outline ? { outline: country.outline } : {}),
    noun: level ? divisionNoun(level) : 'region',
    credit: own ? ownCredit(own) : a ? `${a.source} (${a.licence}${a.via ? `, via ${a.via}` : ''})` : 'Natural Earth (public domain)',
    otherCodes: official.map(d => d.code).filter(c => !shown.has(c)),
  };
}

/**
 * One unit opened to the units beneath it: its official sub-units when the
 * boundary data holds them (Uganda's districts, France's departments, the
 * United Kingdom's council areas), else the nation's district shapes
 * (lib/geo/admin2) placed in it. The rest of the nation is drawn around it as
 * context. Null when nothing beneath it has a shape.
 */
export async function loadUnitGeography(iso3: string, parent: { name: string; code?: string }, detail: MapDetail = 'full'): Promise<NationGeography | null> {
  if (!parent.code) return null;
  const [bundled, levels, own] = await Promise.all([loadCountry(iso3, detail), loadDivisions(iso3).catch(() => []), activeBoundary(iso3, 1)]);
  if (!bundled) return null;
  const country = own ? { ...bundled, provinces: own.units.map(u => ({ name: u.name, i18n: {} as Admin1Province['i18n'], code: u.code, lng: u.lng, lat: u.lat, geometry: u.geometry })) } : bundled;
  const byCode = new Map(country.provinces.map(p => [p.code, p]));
  const official = levels.flatMap(l => l.units);
  const children = official.filter(d => d.parent === parent.code);
  const credit = (a = country.attribution) => (a ? `${a.source} (${a.licence}${a.via ? `, via ${a.via}` : ''})` : 'Natural Earth (public domain)');
  const typeNoun = (t?: string) => (t ? t.toLowerCase() : 'district');

  // Official sub-units with shapes in the boundary data.
  let units: MapUnit[] = children.flatMap(d => {
    const p = byCode.get(d.code);
    return p ? [{ name: d.name, code: d.code, geometry: p.geometry, lng: p.lng, lat: p.lat }] : [];
  });
  let noun = typeNoun(children[0]?.type), source = credit();
  if (!units.length) {
    const a2 = await loadDistricts(iso3, detail);
    units = (a2?.units ?? []).filter(u => u.parent === parent.code).map(u => ({ name: u.name, code: u.code, geometry: u.geometry, lng: u.lng, lat: u.lat }));
    noun = 'district';
    if (a2) source = a2.own ?? credit(a2.credit);
  } else if (own) {
    source = ownCredit(own);
  }
  if (!units.length) return null;
  const inside = new Set(units.map(u => u.code));
  return {
    iso3,
    name: country.name,
    units,
    context: country.provinces.filter(p => !inside.has(p.code)).map(p => p.geometry),
    noun,
    credit: source,
    otherCodes: official.map(d => d.code).filter(c => !inside.has(c)),
    parent,
  };
}

const ownCredit = (b: { credit: string; n: number; validFrom: string }) => `${b.credit}, version ${b.n} in force from ${b.validFrom}`;

/**
 * The nation's districts: the version its mapping authority published, when
 * one is in force, else the bundled district shapes (lib/geo/admin2).
 */
export async function loadDistricts(iso3: string, detail: MapDetail = 'full'): Promise<(Admin2Country & { own?: string }) | null> {
  const own = await activeBoundary(iso3, 2);
  if (own) {
    return {
      iso3,
      units: own.units.filter(u => u.parent).map(u => ({ code: u.code, name: u.name, parent: u.parent!, lng: u.lng, lat: u.lat, geometry: u.geometry })),
      credit: { source: own.credit, licence: '', year: own.validFrom.slice(0, 4) },
      own: ownCredit(own),
    };
  }
  return loadAdmin2(iso3, detail);
}
