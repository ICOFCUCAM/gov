// District shapes installed for the nation at setup (map plan phase 3:
// district shapes for every other nation at install). The platform bundles
// districts for a few nations (lib/geo/admin2); for the rest an administrator
// installs them from geoBoundaries or an uploaded file (lib/data/map-pack.ts).
// Maps draw them in place of the bundled districts; a version published by
// the nation's mapping authority (lib/data/boundaries.ts) still comes first.
//
// This file runs in the browser and on the server: on the server it reads
// the store's data directly, in the browser it asks /api/map-pack/districts
// (public read, like /api/boundaries/active), one region at a time when a
// map opens a region (a large nation's districts run to many megabytes).

import type { Admin2Country, Admin2Unit } from '@/lib/geo/admin2';
import type { BoundaryCredit } from '@/lib/geo/admin1';

/** What the store keeps per nation that maps read. */
export interface InstalledDistrictsLike { iso3: string; adm: string; units: Admin2Unit[]; credit: BoundaryCredit; installedAt: string }
/** Without shapes: whether districts are installed and whose they are. */
export interface InstalledDistrictsSummary { iso3: string; adm: string; units: number; credit: BoundaryCredit; installedAt: string }

type Store = { installed?: Record<string, InstalledDistrictsLike> };
const serverPack = (iso3: string): InstalledDistrictsLike | undefined =>
  (globalThis as { __civicosMapPack?: Store }).__civicosMapPack?.installed?.[iso3];

const TTL = 60_000;
let summaryCache: { at: number; key: string; data: Promise<InstalledDistrictsSummary | null> } | null = null;
const shapesCache = new Map<string, { at: number; key: string; data: Promise<Admin2Country | null> }>();

/** Forget what the browser holds (after installing or removing districts). */
export function forgetInstalledDistricts(): void { summaryCache = null; shapesCache.clear(); }

const fresh = (c: { at: number; key: string } | null, key: string) => !!c && c.key === key && Date.now() - c.at <= TTL;

/** Whether districts are installed for the nation (without loading their shapes). */
export async function installedDistrictsSummary(iso3: string): Promise<InstalledDistrictsSummary | null> {
  if (typeof window === 'undefined') {
    const p = serverPack(iso3);
    return p ? { iso3: p.iso3, adm: p.adm, units: p.units.length, credit: p.credit, installedAt: p.installedAt } : null;
  }
  if (!fresh(summaryCache, iso3)) {
    const data = fetch(`/api/map-pack/districts?iso3=${encodeURIComponent(iso3)}&shapes=0`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { installed: null }))
      .then((j: { installed?: InstalledDistrictsSummary | null }) => j.installed ?? null)
      .catch(() => null);
    summaryCache = { at: Date.now(), key: iso3, data };
  }
  return summaryCache!.data;
}

/**
 * The installed districts with their shapes, in the same form as the bundled
 * ones (lib/geo/admin2); with `parent`, the browser fetches only that
 * region's districts (the server holds them all and returns them all).
 */
export async function installedDistricts(iso3: string, parent?: string): Promise<Admin2Country | null> {
  if (typeof window === 'undefined') {
    const p = serverPack(iso3);
    return p ? { iso3: p.iso3, units: p.units, credit: p.credit } : null;
  }
  const key = `${iso3}|${parent ?? ''}`;
  let c = shapesCache.get(key);
  if (!fresh(c ?? null, key)) {
    const q = `iso3=${encodeURIComponent(iso3)}${parent ? `&parent=${encodeURIComponent(parent)}` : ''}`;
    const data = fetch(`/api/map-pack/districts?${q}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { installed: null }))
      .then((j: { installed?: InstalledDistrictsLike | null }) => (j.installed ? { iso3: j.installed.iso3, units: j.installed.units, credit: j.installed.credit } : null))
      .catch(() => null);
    c = { at: Date.now(), key, data };
    shapesCache.set(key, c);
  }
  return c!.data;
}
