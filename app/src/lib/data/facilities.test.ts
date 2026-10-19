import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetFacilities, proposeFacility, actOnFacility, proposePolicyChange, decidePolicyChange, facilityPolicy,
  listFacilities, checkLocation, importSites, readSitesFile, sensitivityRule, facilityCounts,
} from './facilities';
import { listMinistries } from './store';
import { applyNation } from '@/lib/nation/registry';

const NAIROBI = { lng: 36.81724, lat: -1.28638 };
let health: string, interior: string, survey: string;

beforeEach(() => {
  resetFacilities();
  applyNation({ iso3: 'KEN', regions: [] });
  const ms = listMinistries();
  health = ms[0]!.id; interior = ms[1]!.id; survey = ms[2]!.id;
});

describe('national facility register', () => {
  it('places a site from its position: region and district worked out from the map', async () => {
    const r = await proposeFacility(health, { name: 'Kenyatta National Hospital', category: 'health', ...NAIROBI, method: 'device-gps', accuracyM: 8 }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    expect(r.facility.place).toEqual(expect.objectContaining({ inside: true, regionCode: 'KE-30' }));
    expect(r.facility.place.districtCode).toMatch(/^KE-30:/);
    expect(r.facility.state).toBe('proposed');
    expect(r.facility.versions[0]!.what).toBe('proposed');
  }, 60_000);

  it('refuses positions that cannot be right, and says why', async () => {
    const swapped = await proposeFacility(health, { name: 'X', category: 'health', lng: NAIROBI.lat, lat: NAIROBI.lng }, 'A');
    expect(swapped).toEqual(expect.objectContaining({ error: expect.stringMatching(/swapped/) }));
    expect(await proposeFacility(health, { name: 'X', category: 'health', lng: 0, lat: 0 }, 'A')).toEqual(expect.objectContaining({ error: expect.stringMatching(/0, 0/) }));
    expect(await proposeFacility(health, { name: 'X', category: 'health', lng: 2.35, lat: 48.85 }, 'A')).toEqual(expect.objectContaining({ error: 'The position is outside the nation' }));
    const region = await checkLocation({ ...NAIROBI, category: 'health', region: 'Mombasa' });
    expect(region.warnings.join(' ')).toMatch(/falls in Nairobi/);
  }, 60_000);

  it('flags a duplicate nearby and needs confirmation', async () => {
    await proposeFacility(health, { name: 'Clinic A', category: 'health', ...NAIROBI }, 'A');
    const again = await proposeFacility(health, { name: 'Clinic B', category: 'health', lng: NAIROBI.lng + 0.0005, lat: NAIROBI.lat }, 'A');
    expect(again).toEqual(expect.objectContaining({ error: expect.stringMatching(/already be recorded/) }));
    const ok = await proposeFacility(health, { name: 'Clinic B', category: 'health', lng: NAIROBI.lng + 0.0005, lat: NAIROBI.lat, confirmDuplicate: true }, 'A');
    expect('facility' in ok).toBe(true);
  }, 60_000);

  it('is published by a second official, and certified as the nation chose (institution, mapping agency, or both in turn)', async () => {
    const r = await proposeFacility(health, { name: 'Hospital', category: 'health', ...NAIROBI }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    const id = r.facility.id;
    expect(await actOnFacility(id, { action: 'publish' }, 'Officer A')).toEqual({ error: expect.stringMatching(/different official/) });
    const pub = await actOnFacility(id, { action: 'publish' }, 'Signer B');
    expect(pub).toEqual(expect.objectContaining({ state: 'published', certification: expect.objectContaining({ required: ['institution'], state: 'awaiting' }) }));
    const cert = await actOnFacility(id, { action: 'certify', stage: 'institution', decision: 'certified' }, 'Signer B');
    expect(cert).toEqual(expect.objectContaining({ certification: expect.objectContaining({ state: 'certified' }) }));

    // The nation switches to both, institution first then the mapping agency.
    const c = proposePolicyChange({ patch: { certification: 'both', mappingAgencyId: survey }, reason: 'Survey of Kenya certifies locations' }, 'Admin 1');
    if ('error' in c) throw new Error(c.error);
    expect(decidePolicyChange(c.id, 'confirm', 'Admin 1')).toEqual({ error: expect.stringMatching(/different administrator/) });
    expect(decidePolicyChange(c.id, 'confirm', 'Admin 2')).toEqual(expect.objectContaining({ certification: 'both', mappingAgencyId: survey, version: 2 }));
    const r2 = await proposeFacility(health, { name: 'Clinic far away', category: 'health', lng: 39.6682, lat: -4.0435 }, 'Officer A');
    if ('error' in r2) throw new Error(r2.error);
    await actOnFacility(r2.facility.id, { action: 'publish' }, 'Signer B');
    expect(await actOnFacility(r2.facility.id, { action: 'certify', stage: 'mapping-agency', decision: 'certified' }, 'Surveyor')).toEqual({ error: expect.stringMatching(/owning institution certifies first/) });
    await actOnFacility(r2.facility.id, { action: 'certify', stage: 'institution', decision: 'certified' }, 'Signer B');
    const done = await actOnFacility(r2.facility.id, { action: 'certify', stage: 'mapping-agency', decision: 'certified', note: 'Checked on imagery' }, 'Surveyor');
    expect(done).toEqual(expect.objectContaining({ certification: expect.objectContaining({ state: 'certified', stamps: expect.arrayContaining([expect.objectContaining({ stage: 'mapping-agency' })]) }) }));
    expect(facilityCounts()).toEqual(expect.objectContaining({ published: 2, certified: 2 }));
  }, 60_000);

  it('moves a site only when a second official confirms, keeping every version and asking for certification again', async () => {
    const r = await proposeFacility(health, { name: 'Hospital', category: 'health', ...NAIROBI }, 'A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'B');
    await actOnFacility(r.facility.id, { action: 'certify', stage: 'institution', decision: 'certified' }, 'B');
    expect(await actOnFacility(r.facility.id, { action: 'move', lng: 36.82, lat: -1.29, method: 'gnss-survey' }, 'A')).toEqual({ error: expect.stringMatching(/why/) });
    await actOnFacility(r.facility.id, { action: 'move', lng: 36.82, lat: -1.29, method: 'gnss-survey', reason: 'Surveyed the main gate' }, 'A');
    expect(await actOnFacility(r.facility.id, { action: 'confirm-move' }, 'A')).toEqual({ error: expect.stringMatching(/different official/) });
    const moved = await actOnFacility(r.facility.id, { action: 'confirm-move' }, 'B');
    if ('error' in moved) throw new Error(moved.error);
    expect(moved.location).toEqual(expect.objectContaining({ lng: 36.82, lat: -1.29, method: 'gnss-survey' }));
    expect(moved.certification.state).toBe('awaiting');
    expect(moved.versions.map(v => v.what)).toEqual(['proposed', 'published', 'location certified by the owning institution', 'moved: Surveyed the main gate']);
  }, 60_000);

  it('sensitivity is decided by the body the nation names, under a cited law; restricted sites are generalised for others', async () => {
    expect(sensitivityRule('police')).toEqual({ level: 'restricted', authority: 'owning-institution' });
    expect(proposePolicyChange({ patch: { sensitivity: { power: { level: 'restricted', authority: 'security-council' } } }, reason: 'x' }, 'Admin 1')).toEqual({ error: expect.stringMatching(/Cite the law/) });
    expect(proposePolicyChange({ patch: { sensitivity: { power: { level: 'restricted', authority: 'other', legalBasis: 'Act' } } }, reason: 'x' }, 'Admin 1')).toEqual({ error: expect.stringMatching(/Name the body/) });
    const c = proposePolicyChange({ patch: { sensitivity: { power: { level: 'restricted', authority: 'security-council', body: 'National Security Council', legalBasis: 'Critical Infrastructure Protection Act, s.12' } } }, reason: 'Grid security' }, 'Admin 1');
    if ('error' in c) throw new Error(c.error);
    decidePolicyChange(c.id, 'confirm', 'Admin 2');
    expect(facilityPolicy().sensitivity.power).toEqual(expect.objectContaining({ authority: 'security-council', legalBasis: expect.stringMatching(/Critical/) }));

    const r = await proposeFacility(interior, { name: 'Central Police Station', category: 'police', ...NAIROBI }, 'A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'B');
    const own = listFacilities({}, { institution: interior, signedIn: true })[0]!;
    const other = listFacilities({}, { institution: health, signedIn: true })[0]!;
    const publicView = listFacilities({}, { signedIn: false })[0]!;
    expect(own.location.lat).toBe(NAIROBI.lat);
    expect(other.generalised).toBe(true);
    expect(other.location.lat).not.toBe(NAIROBI.lat);
    expect(other.place.district).toBeUndefined();
    expect(publicView.generalised).toBe(true);
    expect(publicView.versions).toEqual([]);
  }, 60_000);

  it('keeps confidential categories outside the civilian register', async () => {
    expect(await proposeFacility(interior, { name: 'Barracks', category: 'defence', ...NAIROBI }, 'A')).toEqual({ error: expect.stringMatching(/confidential/) });
  });

  it('accepts only the capture methods the nation allows', async () => {
    expect(await proposeFacility(health, { name: 'X', category: 'health', ...NAIROBI, method: 'sms-report' }, 'A')).toEqual({ error: expect.stringMatching(/does not accept/) });
    const c = proposePolicyChange({ patch: { methods: ['sms-report', 'device-gps'] }, reason: 'Field officers without smartphones' }, 'Admin 1');
    if ('error' in c) throw new Error(c.error);
    decidePolicyChange(c.id, 'confirm', 'Admin 2');
    expect('facility' in await proposeFacility(health, { name: 'X', category: 'health', ...NAIROBI, method: 'sms-report' }, 'A')).toBe(true);
    expect(await proposeFacility(health, { name: 'Y', category: 'school', lng: 36.9, lat: -1.2, method: 'map-pin' }, 'A')).toEqual({ error: expect.stringMatching(/does not accept/) });
  }, 60_000);

  it('loads existing survey data (CSV, GeoJSON, GPX) with a dry run and refusals with reasons', async () => {
    const csv = 'Facility Name,Type,Lat,Lon,MFL\nKNH,health,-1.30096,36.80661,13023\nBad,health,abc,36.8,1\nNowhere,unicorn,-1.3,36.8,2\nParis,health,48.85,2.35,3\n';
    const dry = await importSites(health, csv, 'csv', 'Officer A', { dryRun: true });
    if ('error' in dry) throw new Error(dry.error);
    expect(dry).toEqual(expect.objectContaining({ dryRun: true, rows: 4, accepted: 1 }));
    expect(dry.refused.map(r => r.row)).toEqual([3, 4, 5]);
    expect(listFacilities({ state: 'all' }, { signedIn: true })).toHaveLength(0);
    const real = await importSites(health, csv, 'csv', 'Officer A');
    if ('error' in real) throw new Error(real.error);
    expect(real.accepted).toBe(1);
    const f = listFacilities({ state: 'all' }, { signedIn: true })[0]!;
    expect(f).toEqual(expect.objectContaining({ name: 'KNH', state: 'proposed', source: expect.objectContaining({ kind: 'import', sha256: real.sha256 }) }));
    expect(f.ids['Master Facility List code']).toBe('13023');

    const geo = readSitesFile(JSON.stringify({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.8, -1.3] }, properties: { name: 'School 1', category: 'school' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { name: 'Campus', category: 'school' } },
    ] }), 'geojson');
    expect(geo).toEqual([expect.objectContaining({ name: 'School 1', longitude: '36.8', latitude: '-1.3' }), expect.objectContaining({ _geometry: 'Polygon' })]);
    const gpx = readSitesFile('<gpx><wpt lat="-1.29" lon="36.82"><name>Gate</name><type>health</type><hdop>0.8</hdop></wpt></gpx>', 'gpx');
    expect(gpx).toEqual([expect.objectContaining({ name: 'Gate', category: 'health', latitude: '-1.29', longitude: '36.82', accuracy: '4' })]);
  }, 60_000);

  it('policy changes need a reason, a different administrator, and are refused over a newer policy', () => {
    expect(proposePolicyChange({ patch: { certification: 'mapping-agency' }, reason: 'x' }, 'A')).toEqual({ error: expect.stringMatching(/mapping agency first/) });
    const a = proposePolicyChange({ patch: { generaliseDegrees: 0.1 }, reason: 'Coarser' }, 'A1');
    const b = proposePolicyChange({ patch: { generaliseDegrees: 0.02 }, reason: 'Finer' }, 'A1');
    if ('error' in a || 'error' in b) throw new Error('setup');
    decidePolicyChange(a.id, 'confirm', 'A2');
    expect(decidePolicyChange(b.id, 'confirm', 'A2')).toEqual({ error: expect.stringMatching(/changed since/) });
  });
});

describe('connected ministry systems (4b)', () => {
  it('a system sends its sites with its own key; officials still publish; updates come back as versions or moves to confirm', async () => {
    const { issueSiteFeed, siteFeedForKey, receiveSiteFeed, siteFeedChanges, revokeSiteFeed, listSiteFeeds } = await import('./facilities');
    expect(issueSiteFeed(health, 'Master Facility List', '')).toEqual({ error: expect.stringMatching(/Name the official/) });
    const r = issueSiteFeed(health, 'Master Facility List', 'Signer B');
    if ('error' in r) throw new Error(r.error);
    expect(r.key).toMatch(/^csf_[0-9a-f]{8}_[0-9a-f]{40}$/);
    expect(JSON.stringify(listSiteFeeds(health))).not.toContain(r.key);
    expect(siteFeedForKey(health, `Bearer ${r.key}`)?.id).toBe(r.feed.id);
    expect(siteFeedForKey(interior, `Bearer ${r.key}`)).toBeNull();
    expect(siteFeedForKey(health, 'Bearer csf_00000000_' + '0'.repeat(40))).toBeNull();

    const body = { sites: [
      { ref: 'MFL-13023', name: 'Kenyatta National Hospital', category: 'health', lat: -1.30096, lng: 36.80661, code: '13023' },
      { ref: 'MFL-99', name: 'Nowhere', category: 'health', lat: 48.85, lng: 2.35 },
      { name: 'No ref', category: 'health', lat: -1.3, lng: 36.8 },
    ] };
    const first = await receiveSiteFeed(r.feed, body, JSON.stringify(body));
    expect(first).toEqual(expect.objectContaining({ added: 1, refused: [expect.objectContaining({ index: 1, reason: 'The position is outside the nation' }), expect.objectContaining({ index: 2 })] }));
    const site = listFacilities({ state: 'all' }, { signedIn: true }).find(f => f.source.ref === 'MFL-13023')!;
    expect(site).toEqual(expect.objectContaining({ state: 'proposed', source: expect.objectContaining({ kind: 'feed', feedId: r.feed.id }) }));
    expect(site.location.method).toBe('system-feed');
    expect(site.ids['Master Facility List code']).toBe('13023');

    await actOnFacility(site.id, { action: 'publish' }, 'Signer B');
    const upd = { sites: [{ ref: 'MFL-13023', name: 'Kenyatta National Hospital (KNH)', category: 'health', lat: -1.3012, lng: 36.8068, status: 'partial' }] };
    expect(await receiveSiteFeed(r.feed, upd, JSON.stringify(upd))).toEqual(expect.objectContaining({ updated: 1, movesWaiting: 1 }));
    const after = listFacilities({ state: 'all' }, { signedIn: true }).find(f => f.id === site.id)!;
    expect(after).toEqual(expect.objectContaining({ name: 'Kenyatta National Hospital (KNH)', status: 'partial' }));
    expect(after.location.lat).toBe(-1.30096); // the move waits for an official
    expect(after.pendingVersion?.location.lat).toBe(-1.3012);
    const moved = await actOnFacility(site.id, { action: 'confirm-move' }, 'Signer B');
    expect(moved).toEqual(expect.objectContaining({ location: expect.objectContaining({ lat: -1.3012 }) }));
    expect(siteFeedChanges(r.feed, null)).toEqual({ sites: [expect.objectContaining({ ref: 'MFL-13023', state: 'published', moveWaiting: false })] });

    revokeSiteFeed(health, r.feed.id, 'Signer B');
    expect(siteFeedForKey(health, `Bearer ${r.key}`)).toBeNull();
  }, 60_000);
});

describe('open-data candidates (4c)', () => {
  it('suggests sites from an open dataset; officials confirm, link or reject; nothing is published from it', async () => {
    const { loadOpenSource, listCandidates, decideCandidate, resetOpenSites } = await import('./facilities');
    resetOpenSites();
    const geojson = JSON.stringify({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.80661, -1.30096] }, properties: { name: 'KNH', amenity: 'hospital', osm_id: 'node/1' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.9, -1.2] }, properties: { name: 'Clinic X', osm_id: 'node/2' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [2.35, 48.85] }, properties: { name: 'Paris', osm_id: 'node/3' } },
    ] });
    expect(await loadOpenSource({ name: 'OSM health', publisher: 'OpenStreetMap', text: geojson, category: 'health' }, 'A')).toEqual({ error: expect.stringMatching(/licence/) });
    const recorded = await proposeFacility(health, { name: 'Kenyatta National Hospital', category: 'health', lng: 36.8066, lat: -1.30095 }, 'A');
    if ('error' in recorded) throw new Error(recorded.error);
    const src = await loadOpenSource({ name: 'OSM health', publisher: 'OpenStreetMap contributors', licence: 'ODbL 1.0', text: geojson, category: 'health' }, 'Officer A');
    if ('error' in src) throw new Error(src.error);
    expect(src).toEqual(expect.objectContaining({ shareAlike: true, rows: 3, candidates: 2, refused: [expect.objectContaining({ row: 3 })] }));
    expect(listFacilities({ state: 'all' }, { signedIn: true })).toHaveLength(1); // nothing became a site
    const [knh, clinic] = listCandidates();
    expect(knh!.match?.id).toBe(recorded.facility.id);
    expect(await decideCandidate(knh!.id, { decision: 'link', facilityId: recorded.facility.id }, 'Officer A')).toEqual(expect.objectContaining({ state: 'linked' }));
    expect(listFacilities({ state: 'all' }, { signedIn: true }).find(f => f.id === recorded.facility.id)!.ids['OSM health']).toBe('node/1');
    const confirmed = await decideCandidate(clinic!.id, { decision: 'confirm', ministryId: health }, 'Officer A');
    expect(confirmed).toEqual(expect.objectContaining({ state: 'confirmed', facilityId: expect.any(String) }));
    const site = listFacilities({ state: 'all' }, { signedIn: true }).find(f => f.name === 'Clinic X')!;
    expect(site).toEqual(expect.objectContaining({ state: 'proposed', location: expect.objectContaining({ method: 'open-data' }), source: expect.objectContaining({ kind: 'candidate' }) }));
    expect(await decideCandidate(clinic!.id, { decision: 'reject', reason: 'x' }, 'B')).toEqual({ error: expect.stringMatching(/already confirmed/) });
  }, 60_000);

  it('fetches a dataset only from the address given, under the platform\'s fetch rules', async () => {
    const { loadOpenSource, resetOpenSites } = await import('./facilities');
    resetOpenSites();
    const csv = 'name,category,lat,lon,id\nAirport,airport,-1.31917,36.92778,HKJK\n';
    const fetchStub = (async (u: string) => new Response(csv, { headers: { 'content-type': 'text/csv' }, status: 200, statusText: 'OK' }) as Response & { url: string }) as unknown as typeof fetch;
    const r = await loadOpenSource({ name: 'OurAirports', publisher: 'OurAirports', licence: 'Public domain', url: 'https://example.org/airports.csv' }, 'A', { fetch: fetchStub, resolve: async () => ['93.184.216.34'] });
    expect(r).toEqual(expect.objectContaining({ candidates: 1, shareAlike: false, url: 'https://example.org/airports.csv' }));
    expect(await loadOpenSource({ name: 'X', publisher: 'Y', licence: 'Z', url: 'http://10.0.0.1/x.csv' }, 'A', { fetch: fetchStub, resolve: async () => ['10.0.0.1'] })).toEqual({ error: expect.stringMatching(/could not be fetched/) });
  }, 60_000);
});
