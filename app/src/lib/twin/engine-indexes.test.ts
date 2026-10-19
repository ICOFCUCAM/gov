// Every engine index is either derived from observed metrics (read through the
// twin read API, answered modelled) or marked on screen as a modelled index
// (review M1–M3, register 16.3). The indexes are found in the engine sources
// (each numeric field named …Index or …Score in lib/gov), so a new one fails
// here until it is given one of the two.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ENGINE_INDEXES, NOT_INDEXES, indexSignal } from './engine-indexes';
import { DERIVED_METRICS, derivedMetric, formulaOf } from './derived';
import { derivedState, derivedNational } from './derived-server';
import { ENGINE_METRIC_IDS } from './engine-metrics';
import { primeTwin, readTwin, resetTwinRead } from './read';
import { twinFigure } from './read-server';
import { registerMetric, isUcum, STANDARD_METRICS } from './metrics';
import { resetTwin, syncRegister, registerSource, runSource, type TwinRun } from './register';
import { applyNation } from '@/lib/nation/registry';
import { workforceContinuityBoard } from '@/lib/gov/workforce-continuity';
import { hospitalOps } from '@/lib/gov/health-systems';

const SRC = path.join(__dirname, '..', '..');
const GOV = path.join(SRC, 'lib', 'gov');
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name), ext) : ext.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : []);
}

/** Every `file · field` in the engines: numeric fields named …Index or …Score. */
function enginesIndexes(): string[] {
  const found = new Set<string>();
  for (const f of files(GOV, /\.ts$/)) {
    const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
    for (const m of src.matchAll(/\b(\w*(?:Index|Score))\??\s*:\s*number\b/g)) found.add(`${path.basename(f)} · ${m[1]}`);
  }
  return [...found].sort();
}

const fieldOf = (key: string) => key.split(' · ')[1]!;

describe('engine indexes', () => {
  it('lists every engine index, each derived or modelled (never neither)', () => {
    const found = enginesIndexes();
    expect(found.length).toBeGreaterThan(30);
    const listed = new Set(ENGINE_INDEXES.map(e => e.key));
    const missing = found.filter(k => !listed.has(k) && !(k in NOT_INDEXES));
    expect(missing, 'add each to ENGINE_INDEXES (lib/twin/engine-indexes.ts) as derived or modelled').toEqual([]);
    // Nothing stale: every listed index still exists in its engine.
    expect(ENGINE_INDEXES.map(e => e.key).filter(k => !found.includes(k))).toEqual([]);
    expect(new Set(ENGINE_INDEXES.map(e => e.key)).size).toBe(ENGINE_INDEXES.length);
    for (const e of ENGINE_INDEXES) {
      const t = e.treatment;
      expect('derived' in t || ('modelled' in t && t.modelled.length > 10), e.key).toBe(true);
    }
  });

  it('reads each derived index through the twin read API, primed with the engine metrics', () => {
    for (const e of ENGINE_INDEXES) {
      if (!('derived' in e.treatment)) continue;
      const d = derivedMetric(e.treatment.derived);
      expect(d, e.key).toBeDefined();
      expect(ENGINE_METRIC_IDS).toContain(d!.id);
      const file = e.key.split(' · ')[0]!;
      expect(readFileSync(path.join(GOV, file), 'utf8'), `${e.key} reads ${d!.id}`).toContain(`readTwinValue('${d!.id}'`);
      expect(d!.engines.some(w => w.startsWith(file)), e.key).toBe(true);
    }
    for (const d of DERIVED_METRICS) {
      expect(isUcum(d.unit), d.id).toBe(true);
      for (const i of [d.numerator, d.denominator]) {
        expect(isUcum(i.unit), i.id).toBe(true);
        if (i.standard) expect(STANDARD_METRICS.find(s => s.id === i.id)?.unit).toBe(i.unit);
      }
    }
  });

  it('marks every index a screen shows (IndexTag), derived ones included', () => {
    // A screen shows an engine's index when it imports that engine and reads the field; it marks it
    // with a tag naming that field of one of the engines it imports (several engines share a name).
    const unmarked: string[] = [];
    let screens = 0;
    for (const f of files(SRC, /\.tsx$/)) {
      const src = readFileSync(f, 'utf8');
      const imported = ENGINE_INDEXES.filter(e => src.includes(`from '@/lib/gov/${e.key.split(' · ')[0]!.replace(/\.ts$/, '')}'`));
      for (const field of new Set(imported.map(e => fieldOf(e.key)))) {
        if (!new RegExp(`\\.${field}\\b`).test(src)) continue;
        screens++;
        const keys = imported.filter(e => fieldOf(e.key) === field).map(e => e.key);
        if (!keys.some(k => src.includes(`index="${k}"`))) unmarked.push(`${path.relative(SRC, f)}: ${keys.join(' or ')}`);
      }
    }
    expect(screens).toBeGreaterThan(30);
    expect(unmarked, 'put <IndexTag index="<engine> · <field>" /> beside the figure').toEqual([]);
  });

  it('never marks an index observed', () => {
    for (const e of ENGINE_INDEXES) {
      expect(indexSignal(e.key).kind).not.toBe('observed');
      expect(indexSignal(e.key, 'observed').kind).not.toBe('observed');
    }
    expect(indexSignal('treasury-systems.ts · postureIndex')).toEqual({ kind: 'modelled', source: expect.stringMatching(/^Modelled index: /) });
    expect(indexSignal('workforce-continuity.ts · agingIndex')).toMatchObject({ kind: 'sample' });
    expect(indexSignal('workforce-continuity.ts · agingIndex', 'modelled')).toMatchObject({ kind: 'modelled', source: expect.stringMatching(/Derived from observed figures/) });
  });
});

describe('derived metrics', () => {
  beforeEach(async () => {
    resetTwin(); resetTwinRead();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City'] });
    await syncRegister();
  });
  afterEach(() => resetTwinRead());

  it('cannot be registered or imported: only their inputs are', async () => {
    expect(registerMetric({ by: 'S', id: 'population.share_65_plus', label: 'x', unit: '%', aggregation: 'none' })).toEqual({ error: expect.stringMatching(/derived .* register population.age_65_plus and population instead/) });
    const s = ok(registerSource({ by: 'S', name: 'X', publisher: 'Y', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { column: 'metric' }, date: { column: 'year' } } }));
    const r = (await runSource(s.id, { by: 'S', csv: 'region,metric,value,year\nMombasa,population.share_65_plus,4,2019\n' })) as TwinRun;
    expect(r.rejected[0]!.reason).toMatch(/is derived \(100 × population.age_65_plus ÷ population\), never imported/);
  });

  it('are computed from observed inputs of the same date, as modelled, with their inputs', async () => {
    for (const i of [DERIVED_METRICS[0]!.numerator]) ok(registerMetric({ by: 'S', ...i }));
    const s = ok(registerSource({ by: 'S', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { column: 'metric' }, date: { column: 'year' } } }));
    ok(await runSource(s.id, { by: 'S', csv: 'region,metric,value,year\nMombasa,population,1200000,2019\nMombasa,population.age_65_plus,48000,2019\nNairobi City,population,4400000,2019\nNairobi City,population.age_65_plus,88000,2019\nNairobi City,population.age_65_plus,90000,2020\n' }));
    const d = derivedMetric('population.share_65_plus')!;
    const rows = derivedState(d);
    // Nairobi's newest 65+ figure (2020) has no population for that year: no value, never guessed.
    expect(rows.map(r => [r.entityId, r.value, r.kind])).toEqual([['place:KE-28', 4, 'modelled']]);
    expect(rows[0]!.inputs.map(i => [i.metric, i.value, i.validFrom, i.source])).toEqual([['population.age_65_plus', 48000, '2019-01-01', 'Census'], ['population', 1200000, '2019-01-01', 'Census']]);
    expect(rows[0]!.formula).toBe(formulaOf(d));
    expect(derivedNational(d)).toMatchObject({ value: null, kind: 'unavailable', refused: expect.stringMatching(/not for the same dates/) });
    // Server read: modelled, never observed; the sample until both inputs agree.
    expect(await twinFigure('population.share_65_plus', 7)).toMatchObject({ value: 7, kind: 'sample' });
    expect(await twinFigure('population.share_65_plus', 7, { entityId: 'place:KE-28' })).toMatchObject({ value: 4, kind: 'modelled', source: expect.stringMatching(/^Derived: /) });
  });

  it('reach the engines through the client read API as modelled, keeping the sample until the twin answers', async () => {
    const before = workforceContinuityBoard(4000 * 1000).demographics.agingIndex;
    const hosp = hospitalOps('min-health', 1000).mortalityIndex;
    await primeTwin(['population.share_65_plus', 'health.hospital_mortality'], async (url: string) => {
      const metric = new URL(url, 'http://x').searchParams.get('metric');
      const body = url.startsWith('/api/twin/entities') ? { entities: [] }
        : url.startsWith('/api/twin/sources') ? { sources: [] }
        : metric === 'population.share_65_plus' ? { derived: { formula: '100 × population.age_65_plus ÷ population' }, observations: [], national: { value: 5.2, unit: '%', kind: 'modelled', source: 'Derived: 100 × population.age_65_plus ÷ population', asOf: '2019-01-01' } }
        : { derived: { formula: '1,000 × health.hospital_deaths ÷ health.admissions' }, observations: [{ entityId: 'institution:min-health', value: 12.34, unit: '/10*3{admissions}', validFrom: '2025-01-01', kind: 'modelled', formula: '1,000 × health.hospital_deaths ÷ health.admissions' }], national: null };
      return { ok: true, json: async () => body };
    });
    expect(workforceContinuityBoard(4000 * 1000).demographics.agingIndex).toBe(5);
    expect(before).not.toBeNaN();
    expect(hospitalOps('min-health', 1000).mortalityIndex).toBe(12.3);
    expect(hosp).not.toBeNaN();
    expect(readTwin('population.share_65_plus', 0)).toMatchObject({ kind: 'modelled', source: expect.stringMatching(/^Derived/) });
    expect(readTwin('health.hospital_mortality', 0, { entityId: 'institution:min-health' })).toMatchObject({ kind: 'modelled', value: 12.34 });
    // Another institution keeps its sample.
    expect(readTwin('health.hospital_mortality', 3, { entityId: 'institution:other' })).toMatchObject({ kind: 'sample', value: 3 });
  });
});
