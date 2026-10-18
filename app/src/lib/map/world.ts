// The world around the nation, for foreign relations: Natural Earth 1:50m
// countries (all sovereign states, small ones included), loaded only when a
// page shows the world. The nation is found by where it is (its own centroid
// inside a world shape), never by its formal name; partners by name, with
// any not found listed rather than guessed; neighbours from shared borders.

import { feature, neighbors } from 'topojson-client';
import { geoContains } from 'd3-geo';
import type { Geom } from '@/lib/geo/admin1';
import { nameKeys, countryKeys } from './names';
import COUNTRIES from '@/lib/geo/countries.json';
import { capitalsOf, type Capital } from '@/lib/geo/capitals';

export interface WorldCountry { id: string; name: string; geometry: Geom }
export interface WorldModel { countries: WorldCountry[]; neighbours: number[][] }

let cached: Promise<WorldModel> | null = null;

/** World countries and their neighbours (shared borders), loaded once. */
export function loadWorld(): Promise<WorldModel> {
  cached ??= import('world-atlas/countries-50m.json').then(mod => {
    const topo = (mod.default ?? mod) as unknown as { objects: { countries: { geometries: unknown[] } } };
    const fc = feature(topo as never, topo.objects.countries as never) as unknown as { features: { id?: string; properties: { name?: string }; geometry: Geom }[] };
    return {
      countries: fc.features.map(f => ({ id: String(f.id ?? ''), name: f.properties.name ?? '', geometry: f.geometry })),
      neighbours: neighbors(topo.objects.countries.geometries as never) as number[][],
    };
  });
  return cached;
}

/** Which world shape the nation is: the one containing its own centroid. */
export function nationIndex(world: WorldModel, at: [number, number] | null): number {
  if (!at) return -1;
  return world.countries.findIndex(c => c.geometry && geoContains({ type: 'Feature', properties: {}, geometry: c.geometry } as never, at));
}


/** Find a country by an everyday name; -1 when none matches. */
export function findByName(world: WorldModel, name: string): number {
  const keys = countryKeys(name);
  return world.countries.findIndex(c => nameKeys(c.name).some(k => keys.includes(k)));
}

/** A country's ISO 3166-1 alpha-3 code from an everyday name; null when none matches. */
export function iso3ForName(name: string): string | null {
  const keys = countryKeys(name);
  return (COUNTRIES as { iso3: string; name: string }[]).find(c => nameKeys(c.name).some(k => keys.includes(k)))?.iso3 ?? null;
}

/**
 * Where a declared partner's capital is: the capital the nation named for it
 * when the map data knows that city, else the map data's main capital.
 * `named` is false when the position is the map data's default.
 */
export function partnerCapital(p: { name: string; capital?: string }): (Capital & { named: boolean }) | null {
  const iso3 = iso3ForName(p.name);
  const list = iso3 ? capitalsOf(iso3) : [];
  const want = p.capital ? nameKeys(p.capital) : [];
  const hit = want.length ? list.find(c => nameKeys(c.name).some(k => want.includes(k))) : undefined;
  if (hit) return { ...hit, named: true };
  return list[0] ? { ...list[0], named: false } : null;
}
