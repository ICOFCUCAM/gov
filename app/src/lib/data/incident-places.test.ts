import { describe, it, expect, beforeEach } from 'vitest';
import { resetFacilities, proposeFacility, actOnFacility } from './facilities';
import { clearIncidentPlace, placeIncident, readPlaceInput } from './incident-places';
import { incidentsFor, listMinistries, nationalSnapshot } from './store';
import { applyNation } from '@/lib/nation/registry';

const NAIROBI = { lng: 36.81724, lat: -1.28638 };
let ministry: string, key: string;

beforeEach(() => {
  resetFacilities();
  applyNation({ iso3: 'KEN', regions: [] });
  ministry = listMinistries()[0]!.id;
  const inc = incidentsFor(ministry);
  if ('error' in inc) throw new Error(inc.error);
  key = inc.incidents[0]!.key;
});

describe('incident places', () => {
  it('reads what the request says, and refuses what it does not', () => {
    expect(readPlaceInput({ how: 'point', lng: '36.8', lat: -1.2 })).toEqual(expect.objectContaining({ how: 'point', lng: 36.8, lat: -1.2 }));
    expect(readPlaceInput({ how: 'point', lng: 'x', lat: 1 })).toEqual({ error: expect.stringMatching(/numbers/) });
    expect(readPlaceInput({ how: 'region' })).toEqual({ error: 'Choose the region' });
    expect(readPlaceInput({})).toEqual({ error: expect.stringMatching(/region, point or site/) });
  });

  it('places an incident at a point: region and district from the map, recorded by a named official', async () => {
    const r = await placeIncident(ministry, key, { how: 'point', ...NAIROBI, method: 'map-pin' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    expect(r.incident.place).toEqual(expect.objectContaining({ how: 'point', regionCode: 'KE-30', by: 'Officer A', method: 'map-pin' }));
    expect(r.incident.place!.districtCode).toMatch(/^KE-30:/);
    expect(await placeIncident(ministry, key, { how: 'point', lng: 2.35, lat: 48.85 }, 'A')).toEqual(expect.objectContaining({ error: 'The position is outside the nation' }));
    expect(await placeIncident(ministry, key, { how: 'point', lng: NAIROBI.lat, lat: NAIROBI.lng }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/swapped/) }));
  }, 60_000);

  it('places in a region from the nation\'s own list only', async () => {
    const r = await placeIncident(ministry, key, { how: 'region', region: 'mombasa' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    expect(r.incident.place).toEqual(expect.objectContaining({ how: 'region', region: 'Mombasa', regionCode: 'KE-28' }));
    expect(await placeIncident(ministry, key, { how: 'region', region: 'Atlantis' }, 'A')).toEqual({ error: 'Atlantis is not one of the nation\'s regions' });
  }, 60_000);

  it('places at a published site; a restricted site lends only its generalised position', async () => {
    const draft = await placeIncident(ministry, key, { how: 'site', facilityId: 'nope' }, 'A');
    expect(draft).toEqual({ error: expect.stringMatching(/published site/) });
    const p = await proposeFacility(ministry, { name: 'Central Police Station', category: 'police', ...NAIROBI }, 'Officer A');
    if ('error' in p) throw new Error(p.error);
    await actOnFacility(p.facility.id, { action: 'publish' }, 'Signer B');
    const r = await placeIncident(ministry, key, { how: 'site', facilityId: p.facility.id }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    expect(r.incident.place).toEqual(expect.objectContaining({ how: 'site', facilityName: 'Central Police Station', generalised: true }));
    expect(r.incident.place!.lng).not.toBe(NAIROBI.lng);
    expect(r.incident.place!.district).toBeUndefined();
  }, 60_000);

  it('moves and clears keep the earlier places; the national snapshot carries the place', async () => {
    const inc = incidentsFor(ministry);
    if ('error' in inc) throw new Error(inc.error);
    inc.incidents[0]!.active = true;
    await placeIncident(ministry, key, { how: 'region', region: 'Nairobi' }, 'A');
    await placeIncident(ministry, key, { how: 'region', region: 'Kisumu' }, 'B');
    const snap = nationalSnapshot().crossMinistryIncidents.find(c => c.ministryId === ministry && c.key === key);
    expect(snap?.place?.region).toBe('Kisumu');
    const cleared = clearIncidentPlace(ministry, key, 'C', 'duplicate report');
    if ('error' in cleared) throw new Error(cleared.error);
    expect(cleared.place).toBeUndefined();
    // Earlier tests placed the same incident too: the last three entries are this test's.
    expect(cleared.placeHistory!.slice(-3).map(h => [h.region, !!h.cleared])).toEqual([['Nairobi City', false], ['Kisumu', false], ['Kisumu', true]]);
    expect(clearIncidentPlace(ministry, key, 'C')).toEqual({ error: expect.stringMatching(/no place/) });
  }, 60_000);
});
