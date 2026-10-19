// Second-level (district) shapes for drilling down from a region to its
// districts (docs/MAP_SYSTEM_PLAN.md, phase 3). Built per nation from
// geoBoundaries (open licences only, credited) by scripts/build-map-pack.mjs;
// each unit carries the code of the first-level unit (parent) it lies in, as
// drawn by admin1.ts. Files are loaded only when a map drills down.
//
// The maps load TopoJSON packs of these files (lib/geo/topo/a2, built by
// scripts/build-topo.mjs) in two detail levels: 'full' (every vertex; the
// default, for drill-down and position checks) and 'overview' (simplified on
// shared arcs; same units, codes, names and parents).

import ADMIN2_INDEX from './admin2/index.json';
import { isMapDetail, packUnits, type BoundaryCredit, type Geom, type MapDetail, type ShapePack } from './admin1';

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

export function loadAdmin2(iso3: string, detail: MapDetail = 'full'): Promise<Admin2Country | null> {
  const e = hasAdmin2(iso3) && /^[A-Z]{3}$/.test(iso3) && isMapDetail(detail) ? ADMIN2[iso3] : undefined;
  if (!e) return Promise.resolve(null);
  const key = `${iso3}:${detail}`;
  let p = cache.get(key);
  if (!p) {
    p = import(`./topo/a2/${iso3}.${detail}.json`)
      .then(mod => {
        const t = (mod.default ?? mod) as ShapePack;
        return { iso3: t.civicos.iso3, units: packUnits<Omit<Admin2Unit, 'geometry'>>(t), credit: { source: e.source, licence: e.licence, year: e.year, via: e.via ?? 'geoBoundaries' } };
      })
      .catch(() => { cache.delete(key); return null; });
    cache.set(key, p);
  }
  return p;
}
