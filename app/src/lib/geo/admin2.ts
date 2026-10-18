// Second-level (district) shapes for drilling down from a region to its
// districts (docs/MAP_SYSTEM_PLAN.md, phase 3). Built per nation from
// geoBoundaries (open licences only, credited) by scripts/build-map-pack.mjs;
// each unit carries the code of the first-level unit (parent) it lies in, as
// drawn by admin1.ts. Files are loaded only when a map drills down.

import ADMIN2_INDEX from './admin2/index.json';
import type { BoundaryCredit, Geom } from './admin1';

export interface Admin2Unit {
  /** Stable: the ISO 3166-2 code when the source has one, else `${parent || iso3}:${slug(name)}`. */
  code: string;
  name: string;
  /** Code of the first-level unit it lies in; absent for units outside today's first-level shapes (e.g. US territories). */
  parent?: string;
  lng: number;
  lat: number;
  geometry: Geom;
}
export interface Admin2Country { iso3: string; units: Admin2Unit[]; credit: BoundaryCredit }

interface Admin2IndexEntry extends BoundaryCredit { adm: string; units: number; id: string; parents: number }
export const ADMIN2 = ADMIN2_INDEX as Record<string, Admin2IndexEntry>;

const cache = new Map<string, Promise<Admin2Country | null>>();

export function hasAdmin2(iso3: string): boolean {
  return Object.prototype.hasOwnProperty.call(ADMIN2, iso3);
}

export function loadAdmin2(iso3: string): Promise<Admin2Country | null> {
  const e = hasAdmin2(iso3) && /^[A-Z]{3}$/.test(iso3) ? ADMIN2[iso3] : undefined;
  if (!e) return Promise.resolve(null);
  let p = cache.get(iso3);
  if (!p) {
    p = import(`./admin2/${iso3}.json`)
      .then(mod => {
        const f = (mod.default ?? mod) as { iso3: string; units: Admin2Unit[] };
        return { iso3: f.iso3, units: f.units, credit: { source: e.source, licence: e.licence, year: e.year, via: e.via ?? 'geoBoundaries' } };
      })
      .catch(() => { cache.delete(iso3); return null; });
    cache.set(iso3, p);
  }
  return p;
}
