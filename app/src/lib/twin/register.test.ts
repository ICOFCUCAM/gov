import { describe, it, expect, beforeEach } from 'vitest';
import { parseCsv } from './csv';
import { withdrawRun, metricDates, entityProfile, resetTwin, syncRegister, registerSource, runSource, stateAsOf, nationalTotal, signalFor, resolveEntity, linkKey, regionEntities, isoDate, dueSources, type TwinSource } from './register';
import { withTwin } from './national';
import { registerMetric } from './metrics';
import { twinDb } from './db';
import { applyNation } from '@/lib/nation/registry';
import { nationalSnapshot, listAudit } from '@/lib/data/store';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mapping = { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } as const;

describe('CSV as statistics offices publish it', () => {
  it('reads quotes, separators and a byte-order mark', () => {
    expect(parseCsv('﻿region;value\r\n"Nairobi City";"4,397,073"\r\nMombasa;1208333\n')).toEqual([{ region: 'Nairobi City', value: '4,397,073' }, { region: 'Mombasa', value: '1208333' }]);
    expect(parseCsv('a,b\n"x, ""y""",2\n\n')).toEqual([{ a: 'x, "y"', b: '2' }]);
  });
});

describe('the national twin core', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('keys places by their ISO 3166-2 codes and marks the operational regions', () => {
    expect(resolveEntity('KE-30')?.name).toBe('Nairobi City');
    expect(resolveEntity('nairobi city')?.id).toBe('place:KE-30');
    expect(regionEntities().map(e => e.name)).toEqual(['Mombasa', 'Nairobi City', 'Kisumu']);
    expect(resolveEntity('Atlantis')).toBeUndefined();
  });

  it('imports an uploaded CSV, refusing rows it cannot place or read, with reasons and lineage', async () => {
    const s = ok(registerSource({ by: 'Director of Statistics', name: 'Census 2019', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    const run = ok(await runSource(s.id, { by: 'Director of Statistics', csv: 'region,value,year\nMombasa,"1,208,333",2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\nAtlantis,5,2019\nKisumu,abc,2019\nKisumu,1,2999\n' }));
    expect(run).toMatchObject({ status: 'partial', rows: 6, accepted: 3 });
    expect(run.rejected.map(r => r.reason)).toEqual([expect.stringMatching(/Atlantis/), expect.stringMatching(/not a number/), expect.stringMatching(/future/)]);
    const total = nationalTotal('population')!;
    expect(total).toMatchObject({ value: 6_760_980, unit: '{persons}', kind: 'observed', source: 'Census 2019', asOf: '2019-01-01', coverage: { have: 3, of: 3 }, vintage: { oldest: '2019-01-01', newest: '2019-01-01' }, aggregation: 'sum' });
    expect(signalFor('place:KE-28', 'population')?.value).toBe(1208333);
  });

  it('answers as of a moment: what was recorded by then and true by then', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,900000,2009\nNairobi City,3100000,2009\nKisumu,960000,2009\n', deps: { now: new Date('2015-01-01T00:00:00Z') } });
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1208333,2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\n', deps: { now: new Date('2021-01-01T00:00:00Z') } });
    expect(nationalTotal('population', '2016-06-01T00:00:00Z')?.value).toBe(4_960_000);
    expect(nationalTotal('population')?.value).toBe(6_760_980);
    expect(stateAsOf({ metric: 'population', asOf: '2010-01-01T00:00:00Z' })).toEqual([]);
  });

  it('shows no national figure from a partial set of regions', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Part', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1208333,2019\n' });
    expect(nationalTotal('population')).toMatchObject({ value: null, kind: 'unavailable', coverage: { have: 1, of: 3 }, refused: expect.stringMatching(/Only 1 of 3 regions/) });
    expect(nationalTotal('nothing_known')).toBeNull();
  });

  it('places rows by the publisher\'s own ids once linked', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Codes', publisher: 'KNBS', kind: 'csv-upload', system: 'knbs', mapping }));
    expect(linkKey('place:KE-28', 'knbs', '001', 'D')).toEqual({ ok: true });
    expect(linkKey('place:KE-30', 'knbs', '001', 'D')).toEqual({ error: expect.stringMatching(/already means/) });
    const run = ok(await runSource(s.id, { by: 'D', csv: 'region,value,year\n001,1208333,2019\n' }));
    expect(run.accepted).toBe(1);
  });

  it('fetches a CSV only from the source\'s own host and refuses private networks', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Live', publisher: 'KNBS', kind: 'csv-url', url: 'https://stats.example.go.ke/pop.csv', schedule: 'weekly', mapping })) as TwinSource;
    const csv = 'region,value,year\nMombasa,1,2019\nNairobi City,2,2019\nKisumu,3,2019\n';
    const okRun = ok(await runSource(s.id, { by: 'D', deps: { resolve: async () => ['203.0.113.10'], fetch: (async () => new Response(csv, { headers: { 'content-type': 'text/csv' } })) as unknown as typeof fetch } }));
    expect(okRun.accepted).toBe(3);
    const away = (await runSource(s.id, { by: 'D', deps: { resolve: async () => ['203.0.113.10'], fetch: (async () => new Response('', { status: 302, headers: { location: 'https://evil.example/x.csv' } })) as unknown as typeof fetch } })) as { status: string; error?: string };
    expect(away).toMatchObject({ status: 'failed', error: expect.stringMatching(/Not an address this source may fetch/) });
    const internal = (await runSource(s.id, { by: 'D', deps: { resolve: async () => ['10.0.0.5'], fetch: (async () => new Response(csv)) as unknown as typeof fetch } })) as { error?: string };
    expect(internal.error).toMatch(/private network/);
    expect(dueSources(new Date(Date.now() + 8 * 86_400_000)).map(x => x.id)).toEqual([s.id]);
  });

  it('puts an observed population on the national snapshot, and leaves it not connected otherwise', async () => {
    expect((await withTwin(nationalSnapshot())).indicators.find(i => i.label === 'Population')).toMatchObject({ kind: 'unavailable' });
    const s = ok(registerSource({ by: 'D', name: 'Census 2019', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1208333,2019\nNairobi City,4397073,2019\nKisumu,1155574,2019\n' });
    expect((await withTwin(nationalSnapshot())).indicators.find(i => i.label === 'Population')).toMatchObject({ value: '6.8', unit: 'M', kind: 'observed', source: 'Census 2019, 2019-01-01' });
  });

  it('reads years and dates', () => {
    expect(isoDate('2019')).toBe('2019-01-01');
    expect(isoDate('2019-07')).toBe('2019-07-01');
    expect(isoDate('nonsense')).toBeUndefined();
  });
});

describe('the twin\'s two time axes', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('separates when a value was true from when it was recorded', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,900000,2009\n', deps: { now: new Date('2021-01-01T00:00:00Z') } });
    expect(stateAsOf({ metric: 'population', asOf: '2010-01-01T00:00:00Z' })).toEqual([]);
    expect(stateAsOf({ metric: 'population', asOf: '2010-01-01T00:00:00Z', knownAt: '2022-01-01T00:00:00Z' }).map(o => o.value)).toEqual([900000]);
  });
});

describe('an entity\'s profile', () => {
  it('gives an institution its stable id, cross-system ids and observations', async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa'] });
    await syncRegister();
    const p = entityProfile('place:KE-28')!;
    expect(p.entity.name).toBe('Mombasa');
    expect(linkKey('place:KE-28', 'knbs', '001', 'D')).toEqual({ ok: true });
    expect(entityProfile('place:KE-28')!.keys).toEqual([{ system: 'knbs', key: '001' }]);
    expect(entityProfile('nothing')).toBeUndefined();
  });
});

describe('combining regions into a national figure', () => {
  const at = '2020-01-01T00:00:00.000Z';
  const put = (metric: string, values: [string, number, string][]) => {
    for (const [entityId, value, unit] of values) twinDb().observations.push({ entityId, metric, value, unit, validFrom: '2019-01-01', recordedAt: at, sourceId: 'SRC-T', runId: 'RUN-T' });
  };
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    put('population', [['place:KE-28', 1_000_000, '{persons}'], ['place:KE-30', 4_000_000, '{persons}'], ['place:KE-17', 1_000_000, '{persons}']]);
    put('literacy', [['place:KE-28', 80, '%'], ['place:KE-30', 95, '%'], ['place:KE-17', 70, '%']]);
  });

  it('refuses a metric that is not registered as combinable, with the reason', () => {
    expect(nationalTotal('literacy')).toMatchObject({ value: null, aggregation: 'none', refused: expect.stringMatching(/not registered as combinable/) });
  });

  it('takes a mean or a weighted mean when the metric says so', () => {
    registerMetric({ by: 'A', id: 'literacy', label: 'Literacy', unit: '%', aggregation: 'mean' });
    expect(nationalTotal('literacy')).toMatchObject({ value: 245 / 3, aggregation: 'mean', unit: '%' });
    registerMetric({ by: 'A', id: 'literacy', label: 'Literacy', unit: '%', aggregation: 'weighted-mean', weightMetric: 'population' });
    expect(nationalTotal('literacy')?.value).toBeCloseTo((80 + 380 + 70) / 6, 9);
  });

  it('refuses a weighted mean when a region has no weight', () => {
    twinDb().observations = twinDb().observations.filter(o => !(o.metric === 'population' && o.entityId === 'place:KE-17'));
    registerMetric({ by: 'A', id: 'literacy', label: 'Literacy', unit: '%', aggregation: 'weighted-mean', weightMetric: 'population' });
    expect(nationalTotal('literacy')).toMatchObject({ value: null, refused: expect.stringMatching(/1 of 3 regions have no population/) });
  });

  it('refuses to add values in different units', () => {
    put('maize', [['place:KE-28', 5, 't'], ['place:KE-30', 5000, 'kg'], ['place:KE-17', 3, 't']]);
    registerMetric({ by: 'A', id: 'maize', label: 'Maize harvest', unit: 't', aggregation: 'sum', period: 'year' });
    expect(nationalTotal('maize')).toMatchObject({ value: null, refused: expect.stringMatching(/different units \(t, kg\)/) });
  });

  it('gives the vintage: the oldest and newest dates combined', () => {
    twinDb().observations.push({ entityId: 'place:KE-30', metric: 'population', value: 4_100_000, unit: '{persons}', validFrom: '2020-06-01', recordedAt: at, sourceId: 'SRC-T', runId: 'RUN-T' });
    expect(nationalTotal('population', '2021-01-01T00:00:00Z')).toMatchObject({ value: 6_100_000, vintage: { oldest: '2019-01-01', newest: '2020-06-01' }, asOf: '2019-01-01' });
  });
});

describe('withdrawing an import', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('supersedes its observations from then on, never deletes them, and audits who and why', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1000000,2019\nNairobi City,4000000,2019\nKisumu,1000000,2019\n', deps: { now: new Date('2020-01-01T00:00:00Z') } });
    const bad = ok(await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,9000000,2020\nNairobi City,4100000,2020\nKisumu,1100000,2020\n', deps: { now: new Date('2021-01-01T00:00:00Z') } }));
    expect(nationalTotal('population')?.value).toBe(14_200_000);
    expect(withdrawRun(bad.id, 'D', '')).toEqual({ error: expect.stringMatching(/reason/) });
    const w = ok(withdrawRun(bad.id, 'Director of Statistics', 'Mombasa figure keyed wrongly', new Date('2021-02-01T00:00:00Z')));
    expect(w.superseded).toBe(3);
    expect(w.run.withdrawn).toMatchObject({ by: 'Director of Statistics', reason: 'Mombasa figure keyed wrongly' });
    expect(nationalTotal('population')?.value).toBe(6_000_000);
    // What was known in January 2021 still includes the withdrawn import.
    expect(stateAsOf({ metric: 'population', asOf: '2021-01-15T00:00:00Z' }).find(o => o.entityId === 'place:KE-28')?.value).toBe(9_000_000);
    expect(metricDates('population')).toEqual(['2019-01-01']);
    expect(withdrawRun(bad.id, 'D', 'again please')).toEqual({ error: expect.stringMatching(/Already withdrawn/) });
    expect(withdrawRun('RUN-404', 'D', 'nothing')).toEqual({ error: 'No such import' });
    expect(listAudit().find(a => a.action === 'twin.run.withdraw')).toMatchObject({ actor: 'Director of Statistics', detail: expect.stringMatching(/3 observations superseded/) });
  });
});
