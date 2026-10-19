import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sdmxPeriodStart, isSdmxCsv, sdmxRows } from './sdmx';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, nationalTotal, type TwinSource, type TwinRun } from './register';
import { registerMetric } from './metrics';
import { applyNation } from '@/lib/nation/registry';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

describe('SDMX-CSV reading', () => {
  it('reads SDMX time periods as the date they start', () => {
    expect(['2019', '2019-A1', '2023-Q2', '2023-S2', '2023-M04', '2023-04', '2023-04-30', '2023-Q5', 'soon'].map(sdmxPeriodStart))
      .toEqual(['2019-01-01', '2019-01-01', '2023-04-01', '2023-07-01', '2023-04-01', '2023-04-01', '2023-04-30', undefined, undefined]);
  });

  it('recognises SDMX-CSV 1.0 and 2.0 by their first column', () => {
    expect(isSdmxCsv(fixture('sdmx-csv-1.0.csv'))).toBe(true);
    expect(isSdmxCsv(fixture('sdmx-csv-2.0.csv'))).toBe(true);
    expect(isSdmxCsv('region,value,year\nMombasa,1,2019\n')).toBe(false);
  });

  it('turns observations into plain rows, applying the unit multiplier and status', () => {
    const { version, rows } = sdmxRows(fixture('sdmx-csv-1.0.csv'), c => (c === 'POP' ? 'population' : undefined));
    expect(version).toBe('1.0');
    expect(rows[0]).toEqual({ __area: 'KE-28', __metric: 'population', __value: '1208333', __date: '2019-01-01', __unit: 'PS', __status: 'final' });
    expect(rows[2]!.__status).toBe('provisional');
    expect(rows.slice(4).map(r => r.__reject)).toEqual([expect.stringMatching(/time period/), expect.stringMatching(/missing/), expect.stringMatching(/"GDP"/), undefined]);
  });

  it('reads 2.0 with codes and labels, and refuses deletions', () => {
    const { version, rows } = sdmxRows(fixture('sdmx-csv-2.0.csv'), c => (c === 'DF_HH' ? 'households' : undefined));
    expect(version).toBe('2.0');
    expect(rows[0]).toMatchObject({ __area: 'KE-28', __metric: 'households', __date: '2023-04-01', __unit: 'HH', __status: 'provisional' });
    expect(rows[2]).toMatchObject({ __date: '2023-04-01', __status: 'revised' });
    expect(rows[3]!.__reject).toMatch(/deletion/);
  });

  it('refuses a file without a reference area', () => {
    expect(() => sdmxRows('DATAFLOW,TIME_PERIOD,OBS_VALUE\nX:Y(1.0),2019,1\n', () => 'population')).toThrow(/REF_AREA/);
  });
});

describe('SDMX-CSV sources in the twin', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('imports SDMX-CSV 1.0 into registered metrics by their SDMX concept, refusing what it cannot place', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Population (SDMX)', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-csv', sdmx: { units: { PS: '{persons}' } }, licence: 'CC BY 4.0' })) as TwinSource;
    expect(s).toMatchObject({ format: 'sdmx-csv', licence: 'CC BY 4.0' });
    const run = ok(await runSource(s.id, { by: 'D', csv: fixture('sdmx-csv-1.0.csv') }));
    expect(run.accepted).toBe(4);
    expect(run.rejected.map(r => r.row)).toEqual([6, 7, 8, 9]);
    expect(run.rejected[3]!.reason).toMatch(/XX-99/);
    expect(stateAsOf({ metric: 'population', entityId: 'place:KE-17' })[0]).toMatchObject({ value: 1_155_574, unit: '{persons}', quality: { status: 'provisional' } });
    // The nation's own figure (REF_AREA KE) wins over the sum of the regions.
    expect(nationalTotal('population')).toMatchObject({ value: 47_564_296, aggregation: 'national' });
  });

  it('imports SDMX-CSV 2.0 by dataflow and refuses units other than the metric\'s', async () => {
    registerMetric({ by: 'A', id: 'households', label: 'Households', unit: '{households}', aggregation: 'sum', period: 'quarter', sdmxConcept: 'DF_HH' });
    const plain = ok(registerSource({ by: 'D', name: 'Households', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-csv' }));
    const refused = (await runSource(plain.id, { by: 'D', csv: fixture('sdmx-csv-2.0.csv') })) as TwinRun;
    expect(refused.accepted).toBe(0);
    expect(refused.rejected[0]!.reason).toMatch(/"HH" is not the unit of households/);
    const mapped = ok(registerSource({ by: 'D', name: 'Households', publisher: 'KNBS', kind: 'csv-upload', format: 'sdmx-csv', sdmx: { units: { HH: '{households}' } } }));
    const run = ok(await runSource(mapped.id, { by: 'D', csv: fixture('sdmx-csv-2.0.csv') }));
    expect(run.accepted).toBe(3);
    expect(nationalTotal('households')?.value).toBe(2_180_000);
  });
});
