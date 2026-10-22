// The twin contract (plan step I3): indicators publish to the twin as
// observations of one registered internal source, with when they were true
// (asOf) and when they were recorded (knownAt); only approved definitions,
// only real records; and no indicator observation can be created by typing a
// number — not by uploading a CSV to the indicator source, not by importing an
// `indicator.` metric through another source, not by registering the source or
// the metric by hand, and no other module holds the capability.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { openCase, resetCases, registeredEffects } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetTwin, syncRegister, registerSource, runSource, listSources, stateAsOf, listRuns } from '@/lib/twin/register';
import { registerMetric } from '@/lib/twin/metrics';
import { INDICATOR_SYSTEM } from '@/lib/twin/computed';
import { draftVersion, approveVersion, resetIndicators } from './register';
import { publishIndicators, indicatorTwinRows, metricOf, INDICATOR_SOURCE_NAME } from './twin';

let INST = '';
const NOW = new Date('2026-10-21T12:00:00Z');

function procedure() {
  const d = draftPackage(samplePackage({ owner: 'businessRegister' }), 'Author', 'author', registeredEffects());
  if ('error' in d) throw new Error(d.error);
  approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
}
const open = (at: string, sample = false) => {
  const c = openCase({ procedure: 'test.licence', fields: { name: 'X' }, ...(sample ? { source: 'sample' as const } : {}) }, { name: 'Clerk', scope: null }, new Date(at));
  if ('error' in c) throw new Error(c.error);
};
const approve = (id: string) => {
  const d = draftVersion({ id, terms: {}, reason: 'Adopted by the institution' }, { name: 'Drafter', id: 'drafter', scope: { role: 'officer', institution: INST } });
  if ('error' in d) throw new Error(d.error);
  const a = approveVersion(id, d.versions.at(-1)!.n, { name: 'Signer', id: 'signer', scope: { role: 'signatory', institution: INST } });
  if ('error' in a) throw new Error(a.error);
};

describe('indicators in the twin', () => {
  beforeEach(async () => {
    resetCases(); resetPackages(); resetIndicators(); resetTwin();
    INST = listMinistries()[0]!.id;
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { businessRegister: INST } } }, 'test');
    await syncRegister();
    procedure();
  });

  it('publishes nothing for a draft definition', async () => {
    open('2026-09-02T09:00:00Z');
    expect(indicatorTwinRows(NOW)).toEqual([]);
    expect(await publishIndicators('Scheduler', false, NOW)).toMatchObject({ published: false, rows: 0 });
  });

  it('publishes approved values as observations of the internal source, with asOf and knownAt, real records only', async () => {
    open('2026-09-02T09:00:00Z'); open('2026-09-03T09:00:00Z'); open('2026-09-04T09:00:00Z', true);
    open('2026-08-10T09:00:00Z');
    approve('casework.cases_opened');
    const rows = indicatorTwinRows(NOW);
    // the last three complete months: July (0), August (1), September (2, the sample left out)
    expect(rows.map(r => [r.date, r.value])).toEqual([['2026-07-01', 0], ['2026-08-01', 1], ['2026-09-01', 2]]);
    const r = await publishIndicators('Scheduler', false, NOW);
    expect(r).toMatchObject({ published: true, accepted: 3 });
    expect(await publishIndicators('Scheduler', false, NOW)).toMatchObject({ published: false });
    const source = listSources().find(s => s.system === INDICATOR_SYSTEM)!;
    expect(source.name).toBe(INDICATOR_SOURCE_NAME);
    const obs = stateAsOf({ metric: metricOf('casework.cases_opened'), entityId: `institution:${INST}`, asOf: '2026-09-15', knownAt: NOW.toISOString() });
    expect(obs[0]).toMatchObject({ value: 2, validFrom: '2026-09-01', validTo: '2026-10-01', method: 'administrative-count', sourceId: source.id, records: { count: 2, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    // knownAt: before the run nothing was known
    expect(stateAsOf({ metric: metricOf('casework.cases_opened'), entityId: `institution:${INST}`, asOf: '2026-09-15', knownAt: '2026-10-01T00:00:00Z' })).toEqual([]);
  });

  it('refuses every way of typing an indicator observation', async () => {
    open('2026-09-02T09:00:00Z');
    approve('casework.cases_opened');
    await publishIndicators('Scheduler', false, NOW);
    const source = listSources().find(s => s.system === INDICATOR_SYSTEM)!;
    const metric = metricOf('casework.cases_opened');
    const typed = `metric,entity,date,valid_to,value,records_count,records_sha256\n${metric},institution:${INST},2026-09-01,2026-10-01,999,999,${'a'.repeat(64)}`;
    const runs = listRuns(source.id).length;
    // 1. an uploaded CSV to the indicator source (what POST /api/twin/sources/[id]/run does)
    expect(await runSource(source.id, { by: 'Official', csv: typed })).toMatchObject({ error: expect.stringMatching(/computed from the platform's records/) });
    // 2. even claiming the administrative-count lineage
    expect(await runSource(source.id, { by: 'Official', csv: typed, lineage: { method: 'administrative-count', query: 'typed' } })).toHaveProperty('error');
    expect(listRuns(source.id)).toHaveLength(runs);
    // 3. an indicator metric imported through another source: every row refused
    const other = registerSource({ by: 'Official', name: 'Spreadsheet', publisher: 'Someone', kind: 'csv-upload', system: 'sheet', mapping: { entity: 'entity', value: 'value', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in other) throw new Error(other.error);
    const r = await runSource(other.id, { by: 'Official', csv: typed });
    expect(r).toMatchObject({ accepted: 0, rejected: [expect.objectContaining({ reason: expect.stringMatching(/never typed/) })] });
    // 4. registering the internal source or an indicator metric by hand
    expect(registerSource({ by: 'Official', name: 'Fake indicators', publisher: 'Me', kind: 'csv-upload', system: INDICATOR_SYSTEM, mapping: { entity: 'entity', value: 'value', metric: { column: 'metric' } } })).toMatchObject({ error: expect.stringMatching(/never typed/) });
    expect(registerMetric({ by: 'Official', id: 'indicator.made_up', label: 'Made up', unit: '{cases}', aggregation: 'sum', period: 'month' })).toMatchObject({ error: expect.stringMatching(/never typed/) });
    // the value in the twin is still the computed one
    expect(stateAsOf({ metric, entityId: `institution:${INST}`, asOf: '2026-09-15', knownAt: new Date().toISOString() })[0]?.value).toBe(1);
  });

  it('no module but the indicator publisher and the twin register holds the capability, and the publisher takes no value', () => {
    const SRC = resolve(__dirname, '../..');
    const files: string[] = [];
    const walk = (dir: string) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p); } else if (/\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p); } };
    walk(SRC);
    const holders = files.filter(f => readFileSync(f, 'utf8').includes('COMPUTED_FROM_RECORDS')).map(f => relative(SRC, f).replace(/\\/g, '/')).sort();
    expect(holders).toEqual(['lib/indicators/twin.ts', 'lib/twin/computed.ts', 'lib/twin/metrics.ts', 'lib/twin/register.ts']);
    // publishIndicators(by, force, now): a name, a flag and a clock; no value, no CSV, no row
    expect(publishIndicators.length).toBeLessThanOrEqual(3);
    const src = readFileSync(join(SRC, 'lib/indicators/twin.ts'), 'utf8');
    expect(src).toMatch(/export async function publishIndicators\(by: string, force = false, now = new Date\(\)\)/);
  });
});
