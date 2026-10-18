// Each country's capital or capitals for the maps (Natural Earth 1:10m
// populated places, public domain; scripts/build-capitals.mjs). Several
// countries have more than one, each with the role Natural Earth records; the
// first is Natural Earth's main capital. This is only a default: the nation's
// own choice (SovereignProfile.map.capital, set in setup) always wins.

import CAPITALS from './capitals.json';

export type CapitalRole = 'official' | 'administrative' | 'legislative' | 'judicial' | 'de facto';
export interface Capital { name: string; lng: number; lat: number; roles?: CapitalRole[] }

const ALL = CAPITALS as unknown as Record<string, Capital[]>;

/** Every capital the map data records for a country, main one first. */
export function capitalsOf(iso3: string): Capital[] {
  return ALL[iso3] ?? [];
}

/** The default capital for a country's maps, or null when none is recorded. */
export function defaultCapital(iso3: string): Capital | null {
  return ALL[iso3]?.[0] ?? null;
}
