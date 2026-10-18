import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource, metricDates } from './register';
import { resetScenarios, createScenario, reviseScenario, getScenario, verifyVersion, type Scenario } from './scenarios';
import { applyNation } from '@/lib/nation/registry';

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
    expect(v.national).toEqual({ baseline: 6_000_000, projected: 6_464_000, unit: 'persons' });
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

  it('refuses scenarios without a person, assumptions or data', () => {
    expect(createScenario({ name: 'x', metric: 'population', assumptions: [{ entityId: '*', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/Name the official/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [] })).toEqual({ error: expect.stringMatching(/assumption/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', asOf: '2000-01-01', assumptions: [{ entityId: '*', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/knows nothing/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [{ entityId: 'place:XX-1', changePct: 1 }] })).toEqual({ error: expect.stringMatching(/Unknown entity/) });
    expect(createScenario({ name: 'x', by: 'D', metric: 'population', assumptions: [{ entityId: '*', changePct: -150 }] })).toEqual({ error: expect.stringMatching(/between -100/) });
  });
});
