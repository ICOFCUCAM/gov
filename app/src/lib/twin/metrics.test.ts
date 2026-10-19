import { describe, it, expect, beforeEach } from 'vitest';
import { isUcum, toUcum, sameUnit, registerMetric, getMetric, listMetrics, isKnownMetric, type MetricDef } from './metrics';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { applyNation } from '@/lib/nation/registry';
import { listAudit } from '@/lib/data/store';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

describe('UCUM units', () => {
  it('accepts common codes, exponents, products, quotients and annotations', () => {
    for (const u of ['1', '%', 'km2', 'm3', 'kW.h', 'mm/d', '{persons}', '/10*3{persons}', 'kg{dry}', 'm.s-2', '[ppm]', 'mm[Hg]', '{KES}', 'GBy']) expect(isUcum(u), u).toBe(true);
  });
  it('refuses free text and unknown atoms', () => {
    for (const u of ['', 'persons', 'square km', 'KM2', 'kWh', 'm//s', '{a', 'foo.bar', 'm.', '.m']) expect(isUcum(u), u).toBe(false);
  });
  it('reads a source\'s plain word as an annotation', () => {
    expect(toUcum('persons')).toBe('{persons}');
    expect(toUcum('km2')).toBe('km2');
    expect(toUcum('')).toBeUndefined();
    expect(sameUnit('persons', '{persons}')).toBe(true);
    expect(sameUnit('persons', 'households')).toBe(false);
  });
});

describe('the metric registry', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('registers a metric with a UCUM unit and an aggregation rule, audited', () => {
    const m: MetricDef = ok(registerMetric({ by: 'Director of Statistics', id: 'hospital_beds', label: 'Hospital beds', unit: '{beds}', aggregation: 'sum', period: 'instant', sdmxConcept: 'HOSP_BEDS' }));
    expect(m).toMatchObject({ origin: 'official', registeredBy: 'Director of Statistics', aggregation: 'sum' });
    expect(getMetric('hospital_beds')?.unit).toBe('{beds}');
    expect(listAudit().some(a => a.action === 'twin.metric.register' && a.resource === 'TwinMetric:hospital_beds')).toBe(true);
  });

  it('records what changed when a definition is edited', () => {
    ok(registerMetric({ by: 'A', id: 'cpi', label: 'Consumer prices', unit: '1', aggregation: 'none', period: 'month' }));
    const m = ok(registerMetric({ by: 'B', id: 'cpi', label: 'Consumer price index', unit: '1', aggregation: 'none', period: 'month' }));
    expect(m).toMatchObject({ registeredBy: 'A', updatedBy: 'B' });
    expect(listAudit().find(a => a.action === 'twin.metric.update' && a.resource === 'TwinMetric:cpi')?.detail).toMatch(/label: Consumer prices → Consumer price index/);
  });

  it('refuses bad units, unknown rules and a weighted mean without weights', () => {
    expect(registerMetric({ by: 'A', id: 'x_rate', label: 'X', unit: 'persons', aggregation: 'sum' })).toEqual({ error: expect.stringMatching(/not a UCUM unit/) });
    expect(registerMetric({ by: 'A', id: 'x_rate', label: 'X', unit: '%', aggregation: 'total' })).toEqual({ error: expect.stringMatching(/sum, mean/) });
    expect(registerMetric({ by: 'A', id: 'x_rate', label: 'X', unit: '%', aggregation: 'weighted-mean' })).toEqual({ error: expect.stringMatching(/names the metric/) });
    expect(registerMetric({ by: 'A', id: 'x_rate', label: 'X', unit: '%', aggregation: 'weighted-mean', weightMetric: 'nothing' })).toEqual({ error: expect.stringMatching(/Register nothing first/) });
    expect(ok(registerMetric({ by: 'A', id: 'x_rate', label: 'X', unit: '%', aggregation: 'weighted-mean', weightMetric: 'population' })).weightMetric).toBe('population');
    expect(registerMetric({ id: 'x', label: 'X', unit: '%', aggregation: 'sum' })).toEqual({ error: expect.stringMatching(/Name the official/) });
  });

  it('lists metrics observed before the registry as aggregation none, and standard metrics as standard', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Old', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { column: 'metric' } } }));
    await runSource(s.id, { by: 'D', csv: 'region,value,metric\nMombasa,5,literacy\n' });
    expect(getMetric('literacy')).toMatchObject({ origin: 'observed', aggregation: 'none' });
    expect(getMetric('population')).toMatchObject({ origin: 'standard', aggregation: 'sum', unit: '{persons}' });
    expect(isKnownMetric('never_seen')).toBe(false);
    expect(listMetrics().map(m => m.id)).toEqual(expect.arrayContaining(['literacy', 'population', 'households', 'area']));
    ok(registerMetric({ by: 'A', id: 'population', label: 'Resident population', unit: '{persons}', aggregation: 'sum' }));
    expect(getMetric('population')).toMatchObject({ origin: 'official', label: 'Resident population' });
  });
});
