// Server side of a public site's "find us" locator (map plan phase 5): the
// institution's REAL published sites from the national facility register
// (lib/data/facilities.ts), read as a member of the public reads them —
// restricted sites generalised by viewFacility(), confidential categories
// never entered — projected onto the nation's real outline. Built here so the
// page needs no sign-in, no client fetch and no outside service: the outline
// is Natural Earth (bundled), the detailed regional shapes are the platform's
// own boundary files once loaded. Replaces the fixed `pinCoords` of the
// content records, which are no longer drawn as if they were places.

import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import { listFacilities, categoryOf } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { nationCapital, nationIso3 } from '@/lib/nation/registry';
import { findCountryByIso3 } from '@/lib/geo/world';
import { loadCountry, type Geom } from '@/lib/geo/admin1';
import type { LocatorMap, LocatorSite, SiteLocations } from './locator-types';

const W = 320, H = 180, PAD = 10;
/** At most this many sites travel with the page (the list says how many there are in all). */
export const LOCATOR_MAX_SITES = 150;

// Locator tabs → register categories, where a tab names a kind of site the
// register holds. Tabs that name something else (members, services, parks)
// do not filter.
const TAB_CATEGORIES: [RegExp, string[]][] = [
  [/hospital|clinic|pharmac|\blabs?\b|laborator|health|dispensar/i, ['health']],
  [/school|universit|college/i, ['school']],
  [/court|tribunal|supreme|constitutional|^lower$/i, ['court']],
  [/^stations?$/i, ['police', 'fire-rescue']],
  [/shelter/i, ['shelter']],
  [/aid hub|depot|stores?$|logistic/i, ['logistics']],
  [/substation|power/i, ['power']],
  [/service cent|office|extension|civil reg|civicid|liaison/i, ['government-office']],
  [/^ports?$/i, ['port']],
  [/border|customs/i, ['border-post']],
  [/market/i, ['market']],
  [/prison|correction/i, ['prison']],
  [/airport|airfield/i, ['airport']],
];

export function tabCategories(tabs: string[]): (string[] | null)[] {
  return tabs.map(t => TAB_CATEGORIES.find(([re]) => re.test(t.trim()))?.[1] ?? null);
}

/** The registry institution behind a public site (by its slug or id). */
function institutionOf(siteId: string): { id: string } | undefined {
  try {
    return listMinistries().find(m => m.status !== 'merged' && (m.slug === siteId || m.id === siteId));
  } catch {
    return undefined;
  }
}

// Detailed regional shapes, warmed once per country (the first visitor after a
// start sees the outline; later visitors the regions too).
const detailed = new Map<string, Geom[] | null>();
function regionShapes(iso3: string): Geom[] | null {
  if (!detailed.has(iso3)) {
    detailed.set(iso3, null);
    loadCountry(iso3).then(c => { if (c?.provinces.length) detailed.set(iso3, c.provinces.map(p => p.geometry)); }).catch(() => undefined);
  }
  return detailed.get(iso3) ?? null;
}

/**
 * A path string small enough to travel with the page (budgets in
 * scripts/public-site-budgets.json): whole frame pixels, points closer than
 * `tol` pixels to the last one dropped, rings that collapse removed.
 */
function pathOf(projection: GeoProjection, geoms: unknown[], tol = 1.5): string {
  let out = '', ring = '', n = 0;
  let lx = NaN, ly = NaN;
  const flush = () => { if (n >= 3) out += `${ring}Z`; ring = ''; n = 0; };
  const ctx = {
    moveTo(x: number, y: number) { flush(); lx = Math.round(x); ly = Math.round(y); ring = `M${lx} ${ly}`; n = 1; },
    lineTo(x: number, y: number) {
      if (Math.hypot(x - lx, y - ly) < tol) return;
      lx = Math.round(x); ly = Math.round(y); ring += `L${lx} ${ly}`; n++;
    },
    closePath() { flush(); },
    arc() { /* points are not drawn through the path */ },
  };
  const path = geoPath(projection, ctx as never);
  for (const g of geoms) path({ type: 'Feature', properties: {}, geometry: g } as never);
  flush();
  return out;
}

function mapFor(points: { lng: number; lat: number }[]): { map: LocatorMap; project: (lng: number, lat: number) => [number, number] | null } | null {
  const iso3 = nationIso3();
  const shapes = iso3 ? regionShapes(iso3) : null;
  const world = iso3 ? findCountryByIso3(iso3) : undefined;
  const geoms: unknown[] = shapes ?? (world ? [world.geometry] : []);
  let fitTo: unknown;
  if (geoms.length) fitTo = { type: 'FeatureCollection', features: geoms.map(g => ({ type: 'Feature', properties: {}, geometry: g })) };
  else if (points.length) fitTo = { type: 'MultiPoint', coordinates: points.map(p => [p.lng, p.lat]) };
  else return null;
  const projection = geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], fitTo as never);
  const land = geoms.length ? pathOf(projection, shapes ? shapes : geoms) : '';
  const project = (lng: number, lat: number): [number, number] | null => {
    const p = projection([lng, lat]);
    return p && p.every(Number.isFinite) ? [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10] : null;
  };
  const cap = nationCapital();
  const cp = cap ? project(cap.lng, cap.lat) : null;
  return {
    map: {
      w: W, h: H, land,
      ...(shapes ? { regions: true } : {}),
      ...(cp ? { capital: { x: cp[0], y: cp[1], name: cap!.name } } : {}),
      country: (world?.properties?.name as string | undefined) ?? iso3 ?? '',
      credit: shapes ? 'Boundaries: Natural Earth and official boundary data' : 'Outline: Natural Earth',
    },
    project,
  };
}

/** The institution's published sites for its public locator, as the public may see them. */
export function siteLocations(siteId: string, tabs: string[] = []): SiteLocations {
  const inst = institutionOf(siteId);
  const all = inst
    ? listFacilities({ ministryId: inst.id }, { signedIn: false })
      .filter(f => f.status !== 'planned' && f.status !== 'under-construction' && f.status !== 'decommissioned' && f.sensitivity !== 'confidential')
    : [];
  all.sort((a, b) => (a.place.region ?? '').localeCompare(b.place.region ?? '') || a.name.localeCompare(b.name));
  const kept = all.slice(0, LOCATOR_MAX_SITES);
  const built = mapFor(kept.map(f => f.location));
  const sites: LocatorSite[] = kept.map(f => {
    const p = built?.project(f.location.lng, f.location.lat) ?? [NaN, NaN];
    return {
      id: f.id, name: f.name,
      ...(f.place.region ? { region: f.place.region } : {}),
      ...(f.place.district ? { district: f.place.district } : {}),
      category: f.category, categoryLabel: categoryOf(f.category)?.label ?? f.category,
      status: f.status, approx: !!f.generalised,
      lat: f.location.lat, lng: f.location.lng, x: p[0], y: p[1],
    };
  });
  return { institution: !!inst, sites, total: all.length, tabCategories: tabCategories(tabs), map: built?.map ?? null };
}
