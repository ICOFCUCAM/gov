import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { readStructure, parseDataflowRef, structureQuery, structureChecker, type SdmxStructure } from './sdmx-structure';
import { resetTwin, syncRegister, registerSource, runSource, type TwinSource, type TwinRun } from './register';
import { applyNation } from '@/lib/nation/registry';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('SDMX structures (DSD and code lists)', () => {
  it('reads a dataflow reference and builds the REST structure query', () => {
    expect(parseDataflowRef('KNBS:DF_POP(1.0)')).toEqual({ agency: 'KNBS', id: 'DF_POP', version: '1.0' });
    expect(parseDataflowRef('KNBS:DF_POP')).toEqual({ agency: 'KNBS', id: 'DF_POP', version: 'latest' });
    expect(parseDataflowRef('KNBS,DF_POP,2.0')).toEqual({ agency: 'KNBS', id: 'DF_POP', version: '2.0' });
    expect(parseDataflowRef('nonsense here')).toMatchObject({ error: expect.any(String) });
    expect(structureQuery('https://stats.example.go.ke/rest/', { agency: 'KNBS', id: 'DF_POP', version: '1.0' }))
      .toBe('https://stats.example.go.ke/rest/dataflow/KNBS/DF_POP/1.0?references=descendants&detail=full');
  });

  it('reads an SDMX-ML 2.1 structure message: flow, DSD, components and their code lists', () => {
    const st = ok(readStructure(fixture('sdmx-structure-2.1.xml'))) as SdmxStructure;
    expect(st.flow).toMatchObject({ agency: 'KNBS', id: 'DF_POP', version: '1.0', name: 'Population by area', structure: 'KNBS:DSD_POP(1.0)' });
    expect(st.dsd).toMatchObject({ id: 'DSD_POP', name: 'Population' });
    const byId = Object.fromEntries(st.components.map(c => [c.id, c]));
    expect(byId.REF_AREA).toMatchObject({ role: 'dimension', concept: 'REF_AREA', codelist: 'KNBS:CL_AREA(1.0)' });
    expect(byId.INDICATOR).toMatchObject({ concept: 'INDICATOR', codelist: 'KNBS:CL_INDICATOR(1.0)' });  // by URN
    expect(byId.FREQ).toMatchObject({ codelist: 'SDMX:CL_FREQ(2.0)' });  // from the concept's core representation
    expect(byId.TIME_PERIOD!.role).toBe('time');
    expect(byId.UNIT_MULT!.codelist).toBeUndefined();
    expect(st.codelists['KNBS:CL_AREA(1.0)']!.codes).toMatchObject({ 'KE-28': 'Mombasa', 'KE-17': 'Kisumu' });
    expect(st.codelists['KNBS:CL_INDICATOR(1.0)']!.codes.POP).toBe('Population & residents');
    // Names in the nation's language when the office gives them.
    expect((readStructure(fixture('sdmx-structure-2.1.xml'), 'sw') as SdmxStructure).codelists['KNBS:CL_AREA(1.0)']!.codes['KE-17']).toBe('Kisumu (sw)');
  });

  it('reads an SDMX-JSON 1.0 structure message the same way', () => {
    const st = ok(readStructure(fixture('sdmx-structure-1.0.json'))) as SdmxStructure;
    expect(st.flow).toMatchObject({ id: 'DF_POP', structure: 'KNBS:DSD_POP(1.0)' });
    const byId = Object.fromEntries(st.components.map(c => [c.id, c]));
    expect(byId.REF_AREA!.codelist).toBe('KNBS:CL_AREA(1.0)');
    expect(byId.FREQ!.codelist).toBe('SDMX:CL_FREQ(2.0)');
    expect(st.codelists['KNBS:CL_INDICATOR(1.0)']!.codes.POP).toBe('Population');
  });

  it('refuses what is not a structure message, DOCTYPEs included', () => {
    expect(readStructure('hello')).toMatchObject({ error: expect.any(String) });
    expect(readStructure('<!DOCTYPE x [<!ENTITY a "b">]><mes:Structure/>')).toMatchObject({ error: expect.stringMatching(/DOCTYPE/) });
    expect(readStructure('{"data":{}}')).toMatchObject({ error: expect.stringMatching(/data structure/) });
  });

  it('checks codes against their lists and labels the ones it saw', () => {
    const c = structureChecker(ok(readStructure(fixture('sdmx-structure-2.1.xml'))) as SdmxStructure);
    expect(c.check({ FREQ: 'A', REF_AREA: 'KE-30', INDICATOR: 'POP', UNIT_MEASURE: 'PS', OBS_STATUS: 'A' }, 'DF_POP')).toBeUndefined();
    expect(c.check({ REF_AREA: 'XX-99' }, 'DF_POP')).toMatch(/REF_AREA "XX-99" is not a code of CL_AREA/);
    expect(c.check({ FREQ: 'M' }, 'DF_POP')).toMatch(/FREQ "M"/);
    expect(c.check({ REF_AREA: 'KE-30' }, 'DF_GDP')).toMatch(/dataflow DF_GDP/);
    expect(c.labels()).toEqual({ FREQ: { A: 'Annual' }, REF_AREA: { 'KE-30': 'Nairobi City' }, INDICATOR: { POP: 'Population & residents' }, UNIT_MEASURE: { PS: 'Persons' }, OBS_STATUS: { A: 'Normal value' } });
  });
});

describe('SDMX sources checked against the office\'s registry', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });
  const resolve = async () => ['203.0.113.10'];

  it('only names a registry on the source\'s own host, with a dataflow', () => {
    const base = { by: 'D', name: 'Population (SDMX)', publisher: 'KNBS', kind: 'csv-url' as const, url: 'https://stats.example.go.ke/rest/data/KNBS,DF_POP,1.0', format: 'sdmx-csv' as const };
    expect(registerSource({ ...base, sdmx: { registry: 'https://elsewhere.example/rest', dataflow: 'KNBS:DF_POP(1.0)' } })).toMatchObject({ error: expect.stringMatching(/own host/) });
    expect(registerSource({ ...base, sdmx: { registry: 'https://stats.example.go.ke/rest' } })).toMatchObject({ error: expect.stringMatching(/dataflow/) });
    const s = ok(registerSource({ ...base, sdmx: { registry: 'https://stats.example.go.ke/rest/', dataflow: 'KNBS:DF_POP(1.0)', units: { PS: '{persons}' } } })) as TwinSource;
    expect(s.sdmx).toMatchObject({ registry: 'https://stats.example.go.ke/rest', dataflow: 'KNBS:DF_POP(1.0)' });
  });

  it('fetches the DSD from the registry, refuses codes it does not define and keeps the labels of the codes seen', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Population (SDMX)', publisher: 'KNBS', kind: 'csv-url', url: 'https://stats.example.go.ke/rest/data/KNBS,DF_POP,1.0', format: 'sdmx-csv', sdmx: { registry: 'https://stats.example.go.ke/rest', dataflow: 'KNBS:DF_POP(1.0)', units: { PS: '{persons}' } } })) as TwinSource;
    const asked: string[] = [];
    const fetchFake = (async (u: string | URL | Request) => {
      const url = String(u instanceof Request ? u.url : u);
      asked.push(url);
      if (url.includes('/dataflow/')) return new Response(fixture('sdmx-structure-2.1.xml'), { headers: { 'content-type': 'application/vnd.sdmx.structure+xml;version=2.1' } });
      return new Response(fixture('sdmx-csv-1.0.csv'), { headers: { 'content-type': 'application/vnd.sdmx.data+csv' } });
    }) as unknown as typeof fetch;
    const run = ok(await runSource(s.id, { by: 'D', deps: { fetch: fetchFake, resolve } })) as TwinRun;
    expect(asked.some(u => u.endsWith('/rest/dataflow/KNBS/DF_POP/1.0?references=descendants&detail=full'))).toBe(true);
    expect(run.accepted).toBe(4);
    const reasons = run.rejected.map(r => r.reason);
    expect(reasons).toEqual(expect.arrayContaining([expect.stringMatching(/INDICATOR "GDP" is not a code of CL_INDICATOR/), expect.stringMatching(/REF_AREA "XX-99" is not a code of CL_AREA/)]));
    expect(run.structure).toMatchObject({ dataflow: 'KNBS:DF_POP(1.0)', dsd: 'KNBS:DSD_POP(1.0)', sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(run.structure!.labels.REF_AREA).toMatchObject({ 'KE-28': 'Mombasa', 'KE-30': 'Nairobi City' });
    expect(run.structure!.labels.INDICATOR).toEqual({ POP: 'Population & residents' });
  });

  it('fails the run, with the reason, when the registry cannot be read: nothing is imported unchecked', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Population (SDMX)', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-csv', sdmx: { registry: 'https://stats.example.go.ke/rest', dataflow: 'KNBS:DF_POP(1.0)' } })) as TwinSource;
    const down = (async () => new Response('Service unavailable', { status: 503 })) as unknown as typeof fetch;
    const run = (await runSource(s.id, { by: 'D', csv: fixture('sdmx-csv-1.0.csv'), deps: { fetch: down, resolve } })) as TwinRun;
    expect(run.status).toBe('failed');
    expect(run.accepted).toBe(0);
    expect(run.error).toMatch(/SDMX structure could not be read/);
  });
});
