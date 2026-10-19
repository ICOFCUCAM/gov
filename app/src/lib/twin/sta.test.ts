import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { staRequest, serviceRoot, parseFilter, STA_SETS, type StaDeps } from './sta';
import { resetFacilities, proposeFacility, actOnFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';
import type { TelemetryStreamRow, TelemetrySampleRow } from '@/lib/db/types';

const B = 'https://gov.example/api/twin/sta/v1.1';
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mapping = { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } as const;
const noTelemetry = { streams: async () => [] as TelemetryStreamRow[] };
const pub = { signedIn: false };
type List = { value: Record<string, unknown>[]; '@iot.count'?: number; '@iot.nextLink'?: string };
const get = async (path: string, q = '', viewer: { signedIn: boolean; institution?: string } = pub, deps: StaDeps = noTelemetry) => staRequest(B, path.split('/').filter(Boolean), new URLSearchParams(q), viewer, deps);

let police: string;
beforeEach(async () => {
  resetTwin(); resetFacilities();
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  await syncRegister();
  const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
  await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,939370,2009\nNairobi City,3138369,2009\nKisumu,968909,2009\n' });
  await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1208333,2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\n' });
  const [m] = listMinistries();
  const r = await proposeFacility(m!.id, { name: 'Central Police Station', category: 'police', lng: 36.82194, lat: -1.28333, method: 'device-gps' }, 'Officer A');
  if ('error' in r) throw new Error(r.error);
  police = r.facility.id;
  await actOnFacility(police, { action: 'publish' }, 'Signer B');
});

describe('the twin as SensorThings API v1.1', () => {
  it('has a service root listing every entity set and its conformance', () => {
    const root = serviceRoot(B);
    expect(root.value.map(v => v.name)).toEqual([...STA_SETS]);
    expect(root.value[0]!.url).toBe(`${B}/Things`);
    expect(root.serverSettings.conformance).toContain('http://www.opengis.net/spec/iot_sensing/1.1/req/datamodel');
  });

  it('serves things, datastreams and observations in the standard shapes, with ids, self and navigation links', async () => {
    const things = (await get('Things', '$top=1000&$count=true')).body as List;
    const nairobi = things.value.find(t => t['@iot.id'] === 'place:KE-30')!;
    expect(nairobi).toMatchObject({ name: 'Nairobi City', '@iot.selfLink': `${B}/Things('place:KE-30')`, 'Datastreams@iot.navigationLink': `${B}/Things('place:KE-30')/Datastreams` });
    expect(things['@iot.count']).toBe(things.value.length);

    const ds = (await get("Things('place:KE-30')/Datastreams")).body as List;
    expect(ds.value).toHaveLength(1);
    const d = ds.value[0]!;
    expect(d).toMatchObject({ unitOfMeasurement: { name: 'persons', symbol: '{persons}', definition: expect.stringContaining('unitsofmeasure.org') }, observationType: 'http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_Measurement', phenomenonTime: '2009-01-01T00:00:00Z/2019-01-01T00:00:00Z' });

    const obs = (await get(`Datastreams('${d['@iot.id']}')/Observations`, '$orderby=phenomenonTime desc')).body as List;
    expect(obs.value.map(o => o.result)).toEqual([4397073, 3138369]);
    expect(obs.value[0]).toMatchObject({ phenomenonTime: '2019-01-01T00:00:00Z', resultTime: expect.stringMatching(/^\d{4}-/), '@iot.selfLink': expect.stringContaining(`${B}/Observations('`) });

    const one = await get(`Observations('${obs.value[0]!['@iot.id'] as string}')/Datastream`);
    expect(one.status).toBe(200);
    expect((one.body as Record<string, unknown>)['@iot.id']).toBe(d['@iot.id']);
    const sensor = (await get(`Datastreams('${d['@iot.id']}')/Sensor`)).body as Record<string, unknown>;
    expect(sensor).toMatchObject({ name: 'Census', encodingType: 'text/plain', metadata: 'KNBS' });
    const prop = (await get(`Datastreams('${d['@iot.id']}')/ObservedProperty`)).body as Record<string, unknown>;
    expect(prop).toMatchObject({ '@iot.id': 'population', definition: 'urn:civicos:metric:population' });
  });

  it('pages with $top and $skip and filters with $filter', async () => {
    const p = (await get('Observations', '$top=2&$count=true')).body as List;
    expect(p.value).toHaveLength(2);
    expect(p['@iot.count']).toBe(6);
    expect(p['@iot.nextLink']).toContain('%24skip=2');
    const big = (await get('Observations', '$filter=result gt 3000000')).body as List;
    expect(big.value.map(o => o.result).sort()).toEqual([3138369, 4397073]);
    const recent = (await get('Observations', "$filter=phenomenonTime ge 2015-01-01T00:00:00Z and result lt 2000000")).body as List;
    expect(recent.value.map(o => o.result).sort()).toEqual([1155574, 1208333]);
    const either = (await get('Things', "$filter=name eq 'Mombasa' or name eq 'Kisumu'")).body as List;
    expect(either.value.map(t => t.name).sort()).toEqual(['Kisumu', 'Mombasa']);
    const kind = (await get('Things', "$filter=properties/kind eq 'facility'")).body as List;
    expect(kind.value.map(t => t.name)).toEqual(['Central Police Station']);
    expect(parseFilter('result gt')).toEqual({ error: expect.any(String) });
    expect((await get('Things', '$filter=name like x')).status).toBe(400);
    expect((await get('Things', '$expand=Datastreams')).status).toBe(400);
    expect((await get('Nope')).status).toBe(404);
    expect((await get("Things('nope')")).status).toBe(404);
  });

  it('places a restricted site where the viewer may see it', async () => {
    const pubLoc = (await get(`Things('facility:${police}')/Locations`)).body as List;
    const govLoc = (await get(`Things('facility:${police}')/Locations`, '', { signedIn: true })).body as List;
    expect((govLoc.value[0]!.location as { coordinates: number[] }).coordinates).toEqual([36.82194, -1.28333]);
    expect((pubLoc.value[0]!.location as { coordinates: number[] }).coordinates).not.toEqual([36.82194, -1.28333]);
    expect(pubLoc.value[0]!.properties).toEqual({ generalised: true });
  });

  it('maps substrate telemetry streams to things, datastreams and observations', async () => {
    const stream: TelemetryStreamRow = { id: 'u1', stream_id: 'grid.load.nairobi', charter_id: 'energy', facility_id: police, label: 'Grid load', unit: 'MW', aggregation: 'instantaneous', retention_days: 365, warn_threshold: 80, alert_threshold: 95, active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
    const samples: TelemetrySampleRow[] = [
      { id: 's1', stream_id: 'grid.load.nairobi', ts: '2026-10-01T10:00:00Z', value: 71.5, facility_id: police, meta: {} },
      { id: 's2', stream_id: 'grid.load.nairobi', ts: '2026-10-01T10:05:00Z', value: 73, facility_id: police, meta: {} },
    ];
    const deps = { streams: async () => [stream], samples: async () => samples };
    const ds = (await get(`Things('facility:${police}')/Datastreams`, '', pub, deps)).body as List;
    expect(ds.value.map(d => d['@iot.id'])).toEqual(['telemetry:grid.load.nairobi']);
    expect(ds.value[0]).toMatchObject({ unitOfMeasurement: { symbol: 'MW' }, properties: { warnThreshold: 80, alertThreshold: 95 }, phenomenonTime: '2026-10-01T10:00:00Z/2026-10-01T10:05:00Z' });
    const obs = (await get("Datastreams('telemetry:grid.load.nairobi')/Observations", '', pub, deps)).body as List;
    expect(obs.value.map(o => o.result)).toEqual([71.5, 73]);
    // A stream without a registered site is its own thing.
    const lone = (await get('Things', "$filter=properties/kind eq 'telemetry'", pub, { streams: async () => [{ ...stream, facility_id: null, stream_id: 'river.level' }], samples: async () => [] })).body as List;
    expect(lone.value.map(t => t['@iot.id'])).toEqual(['stream:river.level']);
    // Without a substrate the twin's own observations are still served.
    const down = await get('Datastreams', '', pub, { streams: async () => { throw new Error('offline'); } } as never);
    expect((down.body as List).value.length).toBe(3);
  });
});
