import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource, metricDates } from './register';
import { calibrationLog, resetScenarios, createScenario, reviseScenario, getScenario, verifyVersion, evidenceHash, hashVersion, currentBuild, MODELS, type Scenario, type ScenarioVersion } from './scenarios';
import { applyNation } from '@/lib/nation/registry';
import { registerMetric } from './metrics';
import { listAudit } from '@/lib/data/store';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mapping = { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } as const;

describe('scenarios on the twin', () => {
  beforeEach(async () => {
    resetTwin(); resetScenarios();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,900000,2009\nNairobi City,3100000,2009\nKisumu,960000,2009\n', deps: { now: new Date('2015-01-01T00:00:00Z') } });
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1000000,2019\nNairobi City,4000000,2019\nKisumu,1000000,2019\n', deps: { now: new Date('2021-01-01T00:00:00Z') } });
  });

  it('lists the dates a metric is known for', () => {
    expect(metricDates('population')).toEqual(['2009-01-01', '2019-01-01']);
  });

  it('projects from the observed state with stated assumptions and an evidence hash', () => {
    const s: Scenario = ok(createScenario({ name: 'Urban growth', by: 'Director of Planning', metric: 'population', asOf: '2022-01-01', assumptions: [{ entityId: 'place:KE-30', changePct: 10 }, { entityId: '*', changePct: 1 }] }));
    const v = s.versions[0]!;
    expect(s.id).toBe('SCN-0001');
    expect(v.results.find(r => r.entityId === 'place:KE-30')).toMatchObject({ baseline: 4_000_000, projected: 4_444_000 });
    expect(v.results.find(r => r.entityId === 'place:KE-28')?.projected).toBe(1_010_000);
    expect(v.national).toEqual({ baseline: 6_000_000, projected: 6_464_000, unit: '{persons}' });
    expect(v.inputs.every(i => i.validFrom === '2019-01-01' && i.runId)).toBe(true);
    expect(v.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyVersion(s.id, v)).toBe(true);
    expect(verifyVersion(s.id, { ...v, assumptions: [{ entityId: '*', changePct: 2 }] })).toBe(false);
  });

  it('keeps every version and starts each from what was known on its date', () => {
    const s = ok(createScenario({ name: 'Then and now', by: 'D', metric: 'population', asOf: '2016-01-01', assumptions: [{ entityId: '*', changePct: 0 }] }));
    const r = ok(reviseScenario(s.id, { by: 'E', metric: 'population', asOf: '2022-01-01', assumptions: [{ entityId: '*', changePct: 0 }] }));
    expect(r.versions.map(v => [v.version, v.by, v.national?.baseline])).toEqual([[1, 'D', 4_960_000], [2, 'E', 6_000_000]]);
    expect(r.versions[0]!.evidenceHash).not.toBe(r.versions[1]!.evidenceHash);
    expect(getScenario(s.id)?.versions[0]).toEqual(s.versions[0]);
  });

  it('combines regions nationally as the metric says, or says why not', async () => {
    registerMetric({ by: 'A', id: 'literacy', label: 'Literacy', unit: '%', aggregation: 'none' });
    const src = ok(registerSource({ by: 'D', name: 'Literacy', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'literacy' }, unit: { fixed: '%' }, date: { column: 'year' } } }));
    await runSource(src.id, { by: 'D', csv: 'region,value,year\nMombasa,80,2019\nNairobi City,90,2019\nKisumu,70,2019\n', deps: { now: new Date('2021-01-01T00:00:00Z') } });
    const none = ok(createScenario({ name: 'L', by: 'D', metric: 'literacy', asOf: '2022-01-01', assumptions: [{ entityId: '*', changePct: 10 }] })).versions[0]!;
    expect(none).toMatchObject({ national: null, nationalNote: expect.stringMatching(/not registered as combinable/) });
    registerMetric({ by: 'A', id: 'literacy', label: 'Literacy', unit: '%', aggregation: 'mean' });
    const mean = ok(createScenario({ name: 'L2', by: 'D', metric: 'literacy', asOf: '2022-01-01', assumptions: [{ entityId: '*', changePct: 10 }] })).versions[0]!;
    expect(mean.national).toEqual({ baseline: 80, projected: 88, unit: '%' });
  });

  it('records the model and the build, and hashes them with the author and time (v2)', () => {
    const v = ok(createScenario({ name: 'M', by: 'Planner', metric: 'population', assumptions: [{ entityId: '*', changePct: 1 }] })).versions[0]!;
    expect(v.model).toEqual({ id: 'pct-multiplier', version: '1' });
    expect(MODELS[v.model!.id]?.[v.model!.version]).toBeDefined();
    expect(v.build).toBeDefined();
    expect(hashVersion(v)).toBe('v2');
    expect(verifyVersion('SCN-0001', v)).toBe(true);
    expect(verifyVersion('SCN-0001', { ...v, by: 'Someone else' })).toBe(false);
    expect(verifyVersion('SCN-0001', { ...v, at: '2020-01-01T00:00:00.000Z' })).toBe(false);
    expect(verifyVersion('SCN-0001', { ...v, model: { id: 'pct-multiplier', version: '2' } })).toBe(false);
  });

  it('keeps versions made before the model registry verifiable with their v1 hash', () => {
    const v = ok(createScenario({ name: 'Old', by: 'D', metric: 'population', assumptions: [{ entityId: '*', changePct: 1 }] })).versions[0]!;
    const { model: _m, build: _b, ...rest } = v;
    const legacy: ScenarioVersion = { ...rest, evidenceHash: '' };
    legacy.evidenceHash = evidenceHash('SCN-0001', legacy);
    expect(hashVersion(legacy)).toBe('v1');
    expect(verifyVersion('SCN-0001', legacy)).toBe(true);
    // v1 does not cover the author: the reason v2 exists.
    expect(verifyVersion('SCN-0001', { ...legacy, by: 'Anyone' })).toBe(true);
    expect(verifyVersion('SCN-0001', { ...legacy, assumptions: [{ entityId: '*', changePct: 2 }] })).toBe(false);
  });

  it('takes the build commit from the environment when it is set', () => {
    const prev = process.env.CIVICOS_BUILD_COMMIT;
    process.env.CIVICOS_BUILD_COMMIT = 'ABCDEF1234567';
    try { expect(currentBuild()).toEqual({ commit: 'abcdef1234567', source: 'environment' }); }
    finally { if (prev === undefined) delete process.env.CIVICOS_BUILD_COMMIT; else process.env.CIVICOS_BUILD_COMMIT = prev; }
  });

  it('carries assumption ranges to the results as a modelled interval, in the evidence hash', () => {
    const v = ok(createScenario({ name: 'Band', by: 'D', metric: 'population', asOf: '2022-01-01', assumptions: [{ entityId: '*', changePct: 2, range: { low: 1, high: 4 } }, { entityId: 'place:KE-30', changePct: 10 }] })).versions[0]!;
    expect(v.assumptions[0]!.range).toEqual({ low: 1, high: 4 });
    expect(v.results.find(r => r.entityId === 'place:KE-28')).toMatchObject({ projected: 1_020_000, interval: { low: 1_010_000, high: 1_040_000 } });
    expect(v.results.find(r => r.entityId === 'place:KE-30')).toMatchObject({ projected: 4_488_000, interval: { low: 4_444_000, high: 4_576_000 } });
    expect(v.national).toMatchObject({ projected: 6_528_000, interval: { low: 6_464_000, high: 6_656_000 } });
    expect(verifyVersion('SCN-0001', { ...v, assumptions: [{ ...v.assumptions[0]!, range: { low: 0, high: 4 } }, v.assumptions[1]!] })).toBe(false);
    const plain = ok(createScenario({ name: 'No band', by: 'D', metric: 'population', assumptions: [{ entityId: '*', changePct: 2 }] })).versions[0]!;
    expect(plain.results[0]!.interval).toBeUndefined();
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [{ entityId: '*', changePct: 5, range: { low: 1, high: 4 } }] })).toEqual({ error: expect.stringMatching(/must contain the change/) });
  });

  it('logs the error of a projection when a value for its date is later observed', async () => {
    const s = ok(createScenario({ name: 'To 2023', by: 'D', metric: 'population', asOf: '2022-01-01', horizon: '2023-06-30', assumptions: [{ entityId: '*', changePct: 2, range: { low: 1, high: 3 } }] }));
    expect(s.versions[0]!.horizon).toBe('2023-06-30');
    expect(calibrationLog(s.id)).toEqual([]);
    const src = ok(registerSource({ by: 'D', name: 'Mid-year estimates', publisher: 'KNBS', kind: 'csv-upload', mapping }));
    await runSource(src.id, { by: 'D', csv: 'region,value,year\nMombasa,1025000,2023-06-01\nNairobi City,4000000,2023-06-01\nKisumu,1000000,2022-06-01\n' });
    const log = calibrationLog(s.id, 1);
    expect(log.map(c => [c.entityId, c.projected, c.observed, c.error, c.errorPct, c.withinInterval])).toEqual([
      ['place:KE-28', 1_020_000, 1_025_000, 5_000, 0.49, true],
      ['place:KE-30', 4_080_000, 4_000_000, -80_000, -1.96, false],
    ]);
    expect(listAudit().some(a => a.action === 'twin.scenario.calibrate' && a.resource === `Scenario:${s.id}`)).toBe(true);
    await runSource(src.id, { by: 'D', csv: 'region,value,year\nNairobi City,4000000,2023-06-01\n' });
    expect(calibrationLog(s.id)).toHaveLength(3);
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', asOf: '2022-01-01', horizon: '2021-01-01', assumptions: [{ entityId: '*', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/must be after/) });
  });

  it('refuses scenarios without a person, assumptions or data', () => {
    expect(createScenario({ name: 'x', metric: 'population', assumptions: [{ entityId: '*', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/Name the official/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [] })).toEqual({ error: expect.stringMatching(/assumption/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', asOf: '2000-01-01', assumptions: [{ entityId: '*', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/knows nothing/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [{ entityId: 'place:XX-1', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/Unknown entity/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [{ entityId: '*', changePct: -150 }] })).toEqual({ error: expect.stringMatching(/between -100/) });
  });
});
