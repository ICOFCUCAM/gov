// Disputed territory and the nation's worldview (map plan phase 3).
//
// Natural Earth records 28 disputed or breakaway areas (src/lib/geo/disputed.json,
// built by scripts/build-disputed.mjs): who administers each, who claims it,
// and how some thirty national points of view (and the UN and World Bank)
// draw it. The platform never chooses a side for a nation: by default every
// area is drawn as disputed (hatched, dashed edge) with that note. The nation
// may choose in setup to draw its maps from a point of view Natural Earth
// records (normally its own, where one exists); then an area that view gives
// to a country is drawn as part of it, and the rest stay disputed.

import DATA from '@/lib/geo/disputed.json';
import COUNTRIES from '@/lib/geo/countries.json';
import type { Geom } from '@/lib/geo/admin1';

export interface DisputedArea {
  id: string;
  name: string;
  /** Natural Earth's note: who administers it and who claims it. */
  note: string | null;
  /** Countries (platform codes) that administer it, claim it, or are given it by a point of view. */
  parties: string[];
  label: [number, number];
  geometry: Geom;
  /** How the chosen worldview draws it: as disputed, or as part of a country (platform code). */
  shownAs: 'disputed' | string;
}

interface Raw { id: string; name: string; note: string | null; parties: string[]; views: Record<string, string>; label: [number, number]; geometry: Geom }
const RAW = (DATA as unknown as { areas: Raw[] }).areas;
export const DISPUTED_SOURCE = `${(DATA as { source: string }).source} (${(DATA as { licence: string }).licence})`;

/** The points of view Natural Earth records, by its code, with the country (platform code) or body they belong to. */
export const WORLDVIEWS: { code: string; iso3?: string; label: string }[] = [
  ['AR', 'ARG'], ['BD', 'BGD'], ['BR', 'BRA'], ['CN', 'CHN'], ['DE', 'DEU'], ['EG', 'EGY'], ['ES', 'ESP'], ['FR', 'FRA'],
  ['GB', 'GBR'], ['GR', 'GRC'], ['ID', 'IDN'], ['IL', 'ISR'], ['IN', 'IND'], ['IT', 'ITA'], ['JP', 'JPN'], ['KO', 'KOR'],
  ['MA', 'MAR'], ['NL', 'NLD'], ['NP', 'NPL'], ['PK', 'PAK'], ['PL', 'POL'], ['PS', 'PSX'], ['PT', 'PRT'], ['RU', 'RUS'],
  ['SA', 'SAU'], ['SE', 'SWE'], ['TR', 'TUR'], ['TW', 'TWN'], ['UA', 'UKR'], ['US', 'USA'], ['VN', 'VNM'],
].map(([code, iso3]) => ({ code: code!, iso3, label: (COUNTRIES as { iso3: string; name: string }[]).find(c => c.iso3 === iso3)?.name ?? iso3! }))
  .concat([{ code: 'UN', iso3: undefined, label: 'United Nations' }, { code: 'WB', iso3: undefined, label: 'World Bank' }]);

export const isWorldview = (v: unknown): v is string => v === 'neutral' || WORLDVIEWS.some(w => w.code === v);
/** The point of view recorded for a nation, if Natural Earth has one. */
export const worldviewOf = (iso3: string | null | undefined) => (iso3 ? WORLDVIEWS.find(w => w.iso3 === iso3)?.code ?? null : null);
export const worldviewLabel = (v: string | undefined) => (!v || v === 'neutral' ? 'Neutral: disputed areas drawn as disputed' : `${WORLDVIEWS.find(w => w.code === v)?.label ?? v}'s point of view (Natural Earth)`);
const nameOf = (iso3: string) => (COUNTRIES as { iso3: string; name: string }[]).find(c => c.iso3 === iso3)?.name ?? iso3;

/** Every disputed area as the worldview draws it ('neutral' or unset: all disputed). */
export function disputedAreas(view?: string): DisputedArea[] {
  const v = view && view !== 'neutral' ? view : null;
  return RAW.map(a => ({ id: a.id, name: a.name, note: a.note, parties: a.parties, label: a.label, geometry: a.geometry, shownAs: (v && a.views[v]) || 'disputed' }));
}

/** The disputed areas the nation is a party to (administers, claims, or a view gives it). */
export function disputesOf(iso3: string | null | undefined, view?: string): DisputedArea[] {
  return iso3 ? disputedAreas(view).filter(a => a.parties.includes(iso3)) : [];
}

/** One line saying how an area is drawn and why. */
export function disputeText(a: DisputedArea, view?: string): string {
  const how = a.shownAs === 'disputed'
    ? 'drawn as disputed; the platform takes no side'
    : `drawn as part of ${nameOf(a.shownAs)} (${worldviewLabel(view)})`;
  return `${a.name}${a.note ? ` (${a.note})` : ''}: ${how}`;
}
