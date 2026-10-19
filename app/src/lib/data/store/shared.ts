// Helpers shared by the store's context modules (lib/data/store/*). Not
// re-exported by the barrel (lib/data/store.ts): internal to the store.
import { randomUUID } from 'node:crypto';
import type { Citizen } from '@/lib/api/types';
import { regionList } from '@/lib/nation/registry';

/** A new record id: the prefix and 10 hex digits from a CSPRNG (randomUUID). Ids made before (6 base-36 characters) stay valid: ids are only ever compared as strings. */
export function uid(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

/** JSON with object keys in sorted order, so the same content always gives the same bytes. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return `{${Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

/** The earlier 32-bit content hash (sample receipts, signatures, configuration bundles, audit entries written before v2). */
export function hash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0') + '…' + (h & 0xffff).toString(16);
}

/** The demonstration citizen (the wallet's session). */
export const citizen: Citizen = {
  id: 'cz-amina',
  displayName: 'Amina Hassan',
  preferredLocale: 'en',
  municipality: 'Capital District',
};

// Deterministic seeded value so a ministry's operational picture is stable
// across reads; derived from real platform data where it exists.
export function seededInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  return Math.round(min + r * (max - min));
}

/** The nation's operational regions (from setup; a live list). */
export const REGIONS = regionList(['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland']);
