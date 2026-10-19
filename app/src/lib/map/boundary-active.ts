// Which published boundary version a map draws (map plan phase 4: boundary
// sources with versions). The nation's mapping authority publishes its own
// boundaries through lib/data/boundaries.ts (checked, four-eyes, every version
// kept); while one is in force for a level, maps draw it instead of the
// bundled shapes (Natural Earth / geoBoundaries) and credit it.
//
// Versions are bitemporal: `validFrom` is when the boundaries took legal
// effect, `publishedAt` when the platform recorded them. The version in force
// on a date is the published one with the latest validFrom on or before it;
// "known by" limits the choice to what had been published by then.
//
// This file runs in the browser and on the server: on the server it reads
// the store's data directly, in the browser it asks /api/boundaries/active.

import type { Geom } from '@/lib/geo/admin1';

export interface BoundaryUnit { code: string; name: string; parent?: string; geometry: Geom; lng: number; lat: number; sourceCode?: string }
export interface BoundarySource { publisher: string; licence: string; url?: string; year?: string; note?: string }
export interface ActiveBoundary { id: string; n: number; iso3: string; level: 1 | 2; validFrom: string; publishedAt: string; credit: string; units: BoundaryUnit[] }

/** The fields of a stored version this choice reads. */
export interface VersionLike { id: string; n: number; iso3: string; level: 1 | 2; state: string; validFrom: string; publishedAt?: string; source: BoundarySource; units: BoundaryUnit[] }

export const creditOf = (s: BoundarySource): string => `${s.publisher}${s.year ? ` ${s.year}` : ''} (${s.licence})`;

/** The published version in force for a level on a date (as known now, or only what had been published by `knownBy`). */
export function pickActive(versions: readonly VersionLike[], iso3: string, level: 1 | 2, at: Date = new Date(), knownBy?: Date): ActiveBoundary | null {
  const day = at.toISOString().slice(0, 10);
  const best = versions
    .filter(v => v.iso3 === iso3 && v.level === level && v.state === 'published' && v.publishedAt && v.validFrom <= day
      && (!knownBy || new Date(v.publishedAt) <= knownBy))
    .sort((a, b) => (a.validFrom === b.validFrom ? b.publishedAt!.localeCompare(a.publishedAt!) : b.validFrom.localeCompare(a.validFrom)))[0];
  return best ? { id: best.id, n: best.n, iso3: best.iso3, level: best.level, validFrom: best.validFrom, publishedAt: best.publishedAt!, credit: creditOf(best.source), units: best.units } : null;
}

let cache: { at: number; key: string; data: Promise<ActiveBoundary[]> } | null = null;
const TTL = 60_000;

/** Forget what the browser holds (after publishing or withdrawing a version). */
export function forgetActiveBoundaries(): void { cache = null; }

/** The boundary version in force now for the nation and level, if its mapping authority has published one. */
export async function activeBoundary(iso3: string, level: 1 | 2): Promise<ActiveBoundary | null> {
  if (typeof window === 'undefined') {
    const d = (globalThis as { __civicosBoundaries?: { versions: VersionLike[] } }).__civicosBoundaries;
    return d ? pickActive(d.versions, iso3, level) : null;
  }
  if (!cache || cache.key !== iso3 || Date.now() - cache.at > TTL) {
    const data = fetch(`/api/boundaries/active?iso3=${encodeURIComponent(iso3)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { active: [] }))
      .then((j: { active?: ActiveBoundary[] }) => j.active ?? [])
      .catch(() => []);
    cache = { at: Date.now(), key: iso3, data };
  }
  return (await cache.data).find(a => a.level === level) ?? null;
}
