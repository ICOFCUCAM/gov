import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isSdmxJson, isSdmxMl, isSdmxCsv, sdmxJsonRows, sdmxMlRows, readSdmx, SDMX_MEDIA } from './sdmx';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, listSources, type TwinRun, type TwinSource } from './register';
import { twinCatalog } from './catalog';
import { applyNation } from '@/lib/nation/registry';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const pop = (c: string) => (c === 'POP' ? 'population' : undefined);

describe('SDMX-JSON and SDMX-ML readers', () => {
  it('recognises each format', () => {
    expect(isSdmxJson(fixture('sdmx-json-2.0.json'))).toBe(true);
    expect(isSdmxJson(fixture('sdmx-json-1.0.json'))).toBe(true);
    expect(isSdmxMl(fixture('sdmx-ml-2.1.xml'))).toBe(true);
    expect(isSdmxJson(fixture('sdmx-ml-2.1.xml'))).toBe(false);
    expect(isSdmxMl(fixture('sdmx-json-2.0.json'))).toBe(false);
    expect(isSdmxCsv(fixture('sdmx-json-2.0.json'))).toBe(false);
    expect(isSdmxJson('{"type":"FeatureCollection"}')).toBe(false);
  });

  it('reads SDMX-JSON 2.0 series with series and observation attributes', () => {
    const { version, rows } = sdmxJsonRows(fixture('sdmx-json-2.0.json'), pop, { units: { PS: '{persons}' } });
    expect(version).toBe('2.0');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toEqual({ __area: 'KE-28', __metric: 'population', __value: '1208333', __date: '2019-01-01', __unit: '{persons}', __status: 'final' });
    expect(rows[2]).toMatchObject({ __area: 'KE-17', __value: '1155574', __status: 'provisional' });
    expect(rows[3]!.__reject).toMatch(/missing/);
    expect(rows[4]!.__reject).toMatch(/"GDP"/);
    // An unknown area is placed by runSource (refused there), not by the reader.
    expect(rows[5]).toMatchObject({ __area: 'XX-99', __value: '1' });
  });

  it('reads SDMX-JSON 1.0 flat observations, naming the metric by the dataflow', () => {
    const { version, rows } = sdmxJsonRows(fixture('sdmx-json-1.0.json'), () => undefined, { codes: { DF_HH: 'households' } });
    expect(version).toBe('1.0');
    expect(rows.map(r => [r.__area, r.__date, r.__value, r.__unit, r.__status])).toEqual([
      ['KE-28', '2023-04-01', '380000', 'HH', 'provisional'],
      ['KE-30', '2023-04-01', '1500000', 'HH', 'final'],
      ['KE-30', '2023-07-01', '1510000', 'HH', 'provisional'],
    ]);
  });

  it('reads SDMX-ML 2.1 structure-specific data, refusing deletions and missing values', () => {
    const { rows } = sdmxMlRows(fixture('sdmx-ml-2.1.xml'), () => undefined, { codes: { DF_HH: 'households' }, units: { HH: '{households}' } });
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ __area: 'KE-28', __metric: 'households', __value: '378400', __date: '2019-01-01', __unit: '{households}', __status: 'final' });
    expect(rows[1]!.__reject).toMatch(/missing/);
    expect(rows[2]).toMatchObject({ __area: 'KE-30', __value: '1506888', __status: 'provisional' });
    expect(rows[3]!.__reject).toMatch(/time period/);
    expect(rows[4]!.__reject).toMatch(/deletion/);
  });

  it('refuses what it cannot read, with the reason', () => {
    expect(() => sdmxJsonRows('{not json', pop)).toThrow(/not valid JSON/);
    expect(() => sdmxJsonRows('{"data":{"dataSets":[]}}', pop)).toThrow(/structures/);
    const noArea = JSON.stringify({ data: { structures: [{ dimensions: { observation: [{ id: 'TIME_PERIOD', values: [{ id: '2019' }] }] } }], dataSets: [{ observations: { 0: [1] } }] } });
    expect(() => sdmxJsonRows(noArea, pop)).toThrow(/REF_AREA/);
    expect(() => sdmxMlRows('<message:GenericData xmlns:message="x"><message:DataSet/></message:GenericData>', pop)).toThrow(/generic data/);
    expect(() => sdmxMlRows('<!DOCTYPE x [<!ENTITY a "b">]><message:StructureSpecificData/>', pop)).toThrow(/DOCTYPE/);
    expect(() => sdmxMlRows('<root/>', pop)).toThrow(/Not SDMX-ML/);
    expect(() => readSdmx('sdmx-json', fixture('sdmx-json-2.0.json'), pop, { metricDimension: 'SUBJECT' })).toThrow(/no SUBJECT dimension/);
  });

  it('decodes XML escapes in attribute values', () => {
    const xml = '<m:StructureSpecificData xmlns:m="x"><m:DataSet><Obs REF_AREA="KE-30" INDICATOR="P&amp;OP" TIME_PERIOD="2019" OBS_VALUE="5"/></m:DataSet></m:StructureSpecificData>';
    expect(sdmxMlRows(xml, c => (c === 'P&OP' ? 'population' : undefined)).rows[0]).toMatchObject({ __metric: 'population', __value: '5' });
  });
});

describe('SDMX-JSON and SDMX-ML sources in the twin', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('imports SDMX-JSON into registered metrics with the source\'s unit codes mapped to UCUM', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Population (SDMX-JSON)', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-json', sdmx: { units: { PS: '{persons}' } } })) as TwinSource;
    expect(s.format).toBe('sdmx-json');
    const run = ok(await runSource(s.id, { by: 'D', csv: fixture('sdmx-json-2.0.json') }));
    expect(run.accepted).toBe(3);
    expect(run.rejected.map(r => r.reason)).toEqual([expect.stringMatching(/missing/), expect.stringMatching(/GDP/), expect.stringMatching(/XX-99/)]);
    expect(run.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(stateAsOf({ metric: 'population', entityId: 'place:KE-30' })[0]).toMatchObject({ value: 4_397_073, unit: '{persons}', runId: run.id });
  });

  it('refuses SDMX unit codes that are not the metric\'s UCUM unit until the source maps them', async () => {
    const plain = ok(registerSource({ by: 'D', name: 'Households (SDMX-ML)', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-ml', sdmx: { codes: { DF_HH: 'households' } } }));
    const refused = (await runSource(plain.id, { by: 'D', csv: fixture('sdmx-ml-2.1.xml') })) as TwinRun;
    expect(refused.accepted).toBe(0);
    expect(refused.rejected[0]!.reason).toMatch(/"HH" is not the unit of households/);
    const mapped = ok(registerSource({ by: 'D', name: 'Households (SDMX-ML, mapped)', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-ml', sdmx: { codes: { DF_HH: 'households' }, units: { HH: '{households}' } } }));
    const run = ok(await runSource(mapped.id, { by: 'D', csv: fixture('sdmx-ml-2.1.xml') }));
    expect(run.accepted).toBe(2);
    expect(run.status).toBe('partial');
    expect(stateAsOf({ metric: 'households', entityId: 'place:KE-30' })[0]).toMatchObject({ value: 1_506_888, quality: { status: 'provisional' } });
  });

  it('fetches with the format\'s media type and describes it in the catalogue', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Population (SDMX-JSON at the office)', publisher: 'KNBS', kind: 'csv-url', url: 'https://stats.example/sdmx/data/DF_POP', format: 'sdmx-json', sdmx: { units: { PS: '{persons}' } } }));
    let accept = '';
    const fetchFake = (async (_u: string, init?: RequestInit) => {
      accept = new Headers(init?.headers).get('accept') ?? '';
      return new Response(fixture('sdmx-json-2.0.json'), { status: 200, headers: { 'content-type': 'application/vnd.sdmx.data+json; version=2.0.0' } });
    }) as unknown as typeof fetch;
    const run = ok(await runSource(s.id, { by: 'D', deps: { fetch: fetchFake, resolve: async () => ['203.0.113.10'] } }));
    expect(accept).toContain(SDMX_MEDIA['sdmx-json'].type);
    expect(run.accepted).toBe(3);
    const cat = JSON.stringify(await twinCatalog('https://gov.example'));
    expect(cat).toContain('application/vnd.sdmx.data+json');
    expect(listSources().find(x => x.id === s.id)?.format).toBe('sdmx-json');
  });
});
