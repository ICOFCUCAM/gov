// Where an incident is happening (map plan phase 4: incident locations).
//
// An institution's incident gets a place in one of three ways:
// - a whole region (or district), chosen from the nation's own list;
// - a point (map pin, device location, typed coordinates, a photo's GPS…),
//   read the same way as a registered site (placePoint): inside the nation,
//   with its region and district worked out from the map, never typed;
// - a registered site from the national facility register; a restricted site
//   lends only its generalised position, a confidential one never enters.
// Every place names the official who recorded it, is written to the audit
// chain, and is moved or cleared (kept in the incident's history), never
// silently overwritten. The Situation Room draws placed incidents where they
// are; the rest stay beside the institution that reported them.

import type { IncidentPlace, MinistryIncident } from '@/lib/api/types';
import { setMinistryIncidentPlace } from '@/lib/data/store';
import { getFacility, isCaptureMethod, placePoint, viewFacility } from '@/lib/data/facilities';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadNationGeography } from '@/lib/map/geography';
import { loadAdmin2 } from '@/lib/geo/admin2';
import { nameKeys } from '@/lib/map/names';

export type PlaceInput =
  | { how: 'region'; region: string; district?: string; note?: string }
  | { how: 'point'; lng: number; lat: number; method?: string; region?: string; outsideReason?: string; note?: string }
  | { how: 'site'; facilityId: string; note?: string };

const clean = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const same = (a: string, b: string) => {
  const ka = new Set(nameKeys(a)); ka.add(a.trim().toLowerCase());
  return nameKeys(b).some(k => ka.has(k)) || ka.has(b.trim().toLowerCase());
};

/** Read a request body into a place input, or say what is missing. */
export function readPlaceInput(body: Record<string, unknown>): PlaceInput | { error: string } {
  const note = clean(body.note) || undefined;
  if (body.how === 'region') {
    const region = clean(body.region, 120);
    if (!region) return { error: 'Choose the region' };
    return { how: 'region', region, district: clean(body.district, 120) || undefined, note };
  }
  if (body.how === 'point') {
    const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng);
    const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat);
    if (body.lng == null || body.lat == null || !Number.isFinite(lng) || !Number.isFinite(lat)) return { error: 'Give the longitude and latitude as numbers' };
    return { how: 'point', lng, lat, method: clean(body.method, 40) || undefined, region: clean(body.region, 120) || undefined, outsideReason: clean(body.outsideReason) || undefined, note };
  }
  if (body.how === 'site') {
    const facilityId = clean(body.facilityId, 80);
    if (!facilityId) return { error: 'Choose the registered site' };
    return { how: 'site', facilityId, note };
  }
  return { error: 'Say how the incident is placed: region, point or site' };
}

/** Check a place against the map and the register; returns the place to record, or why not. */
export async function resolvePlace(input: PlaceInput, by: string): Promise<{ place: IncidentPlace; warnings: string[] } | { error: string; errors?: string[] }> {
  const at = new Date().toISOString();
  const base = { by, at, ...(input.note ? { note: input.note } : {}) };
  if (input.how === 'region') {
    const iso3 = nationIso3();
    const regions = nationRegions();
    const geo = iso3 ? await loadNationGeography(iso3, regions) : null;
    const unit = geo?.units.find(u => same(u.name, input.region) || (u.code && u.code.toLowerCase() === input.region.toLowerCase()));
    const listed = regions.find(r => same(r, input.region));
    if (!unit && !listed) return { error: `${input.region} is not one of the nation's regions` };
    const place: IncidentPlace = { how: 'region', region: unit?.name ?? listed!, ...(unit?.code ? { regionCode: unit.code } : {}), ...base };
    if (input.district) {
      const a2 = iso3 && unit?.code ? await loadAdmin2(iso3) : null;
      const d = a2?.units.find(x => x.parent === unit!.code && same(x.name, input.district!));
      if (a2 && !d) return { error: `${input.district} is not a district of ${place.region}` };
      // Without district shapes for this nation the district is kept as stated.
      if (d) { place.district = d.name; place.districtCode = d.code; } else place.district = input.district;
    }
    return { place, warnings: [] };
  }
  if (input.how === 'point') {
    if (input.method && !isCaptureMethod(input.method)) return { error: 'Unknown capture method' };
    const r = await placePoint({ lng: input.lng, lat: input.lat, region: input.region, outsideReason: input.outsideReason, noun: 'incident' });
    if (r.errors.length) return { error: r.errors[0]!, errors: r.errors };
    if (!r.place.inside && !input.outsideReason) return { error: 'A position outside the boundary needs a reason', errors: r.warnings };
    const place: IncidentPlace = {
      how: 'point', lng: input.lng, lat: input.lat,
      ...(r.place.region ? { region: r.place.region } : {}), ...(r.place.regionCode ? { regionCode: r.place.regionCode } : {}),
      ...(r.place.district ? { district: r.place.district } : {}), ...(r.place.districtCode ? { districtCode: r.place.districtCode } : {}),
      ...(input.method ? { method: input.method } : {}),
      ...base,
      ...(!r.place.inside && input.outsideReason ? { note: [input.note, `outside the boundary: ${input.outsideReason}`].filter(Boolean).join(' · ') } : {}),
    };
    return { place, warnings: r.warnings.filter(w => !/needs a reason/.test(w)) };
  }
  const f = getFacility(input.facilityId);
  if (!f || f.state !== 'published') return { error: 'Choose a published site from the national facility register' };
  if (f.sensitivity === 'confidential') return { error: 'Confidential sites are not placed on shared maps' };
  // The national snapshot reaches every console, so a restricted site lends
  // its position as seen by an institution without need (generalised).
  const v = viewFacility(f, { signedIn: true, institution: 'shared-map' });
  return {
    place: {
      how: 'site', facilityId: f.id, facilityName: f.name, lng: v.location.lng, lat: v.location.lat,
      ...(f.place.region ? { region: f.place.region } : {}), ...(f.place.regionCode ? { regionCode: f.place.regionCode } : {}),
      ...(f.place.district && !v.generalised ? { district: f.place.district } : {}),
      ...(v.generalised ? { generalised: true } : {}),
      ...base,
    },
    warnings: v.generalised ? ['The site is restricted: its generalised position is shown'] : [],
  };
}

/** Record, or move, where an institution's incident is. */
export async function placeIncident(ministryId: string, key: string, input: PlaceInput, by: string): Promise<{ incident: MinistryIncident; warnings: string[] } | { error: string; errors?: string[] }> {
  const r = await resolvePlace(input, by);
  if ('error' in r) return r;
  const inc = setMinistryIncidentPlace(ministryId, key, r.place, by, input.note);
  if ('error' in inc) return inc;
  return { incident: inc, warnings: r.warnings };
}

/** Clear an incident's place (kept in its history). */
export function clearIncidentPlace(ministryId: string, key: string, by: string, reason?: string): MinistryIncident | { error: string } {
  return setMinistryIncidentPlace(ministryId, key, null, by, clean(reason) || undefined);
}
