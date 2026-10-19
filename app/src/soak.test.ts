// State-growth soak test (architecture review R17, findings D2, D3, G3, O3).
// Skipped in the ordinary test run; run it with
//   SOAK=1 npx vitest run src/soak.test.ts            (scale 1: 200k observations, 20k sites)
//   SOAK=1 SOAK_SCALE=0.1 npx vitest run src/soak.test.ts
// It loads the twin, the facility register and the audit chain to national
// scale, then measures what the review warned about: the time to encode and
// save every store (persist.ts flush), heap growth, an as-of query and a
// facility duplicate check. Budgets (seconds / MB) can be set with
// SOAK_FLUSH_S, SOAK_QUERY_MS, SOAK_HEAP_MB. SOAK_REPORT=file writes the numbers.

import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { applyNation } from '@/lib/nation/registry';
import { registerSource, runSource, stateAsOf, resetTwin, listEntities, syncRegister } from '@/lib/twin/register';
import { importSites, resetFacilities, checkLocation } from '@/lib/data/facilities';
import { listMinistries, recordAudit, listAudit } from '@/lib/data/store';
import { flush, type StateAdapter } from '@/lib/data/persist';
import { registerMetric } from '@/lib/twin/metrics';

const ON = !!process.env.SOAK;
const SCALE = Number(process.env.SOAK_SCALE ?? 1);
const OBS = Math.round(200_000 * SCALE);
const SITES = Math.round(20_000 * SCALE);
const AUDIT = Math.round(100_000 * SCALE);
const report: Record<string, number> = { scale: SCALE };
const mb = () => Math.round(process.memoryUsage().heapUsed / 1_048_576);
const time = async <T>(label: string, f: () => Promise<T> | T): Promise<T> => { const t = performance.now(); const r = await f(); report[label] = Math.round(performance.now() - t); return r; };

describe.skipIf(!ON)('soak: national-scale state', () => {
  beforeAll(async () => { applyNation({ configured: true, stateName: 'Soak', iso3: 'KEN', regions: [] }); resetTwin(); resetFacilities(); await syncRegister(); });

  it('loads observations, sites and audit entries, then measures saves, heap and queries', async () => {
    report.heapStartMb = mb();
    // Twin: 47 counties × metrics × years, in runs of 20k rows.
    const counties = listEntities('place').filter(e => /^KE-\d+$/.test(e.code ?? '')).map(e => e.name);
    expect(counties.length).toBeGreaterThan(40);
    const s = registerSource({ by: 'Soak', name: 'Soak statistics', publisher: 'Soak', kind: 'csv-upload', mapping: { entity: 'county', value: 'value', metric: { column: 'metric' }, unit: { fixed: '{count}' }, date: { column: 'date' } } });
    if ('error' in s) throw new Error(s.error);
    for (let m = 0; m < 100; m++) { const r = registerMetric({ id: `metric_${m}`, label: `Soak metric ${m}`, unit: '{count}', aggregation: 'sum', period: 'year', by: 'Soak' } as never); if ('error' in r) throw new Error(r.error); }
    const perRun = 20_000;
    let made = 0, run = 0;
    await time('twinLoadMs', async () => {
      while (made < OBS) {
        const rows = ['county,metric,value,date'];
        for (let i = 0; i < perRun && made < OBS; i++, made++) {
          const c = counties[made % counties.length]!;
          const m = `metric_${Math.floor(made / counties.length) % 100}`;
          const y = 2000 + Math.floor(made / (counties.length * 100));
          rows.push(`${c},${m},${(made * 7) % 1000},${y}-01-01`);
        }
        const r = await runSource(s.id, { by: 'Soak', csv: rows.join('\n') });
        if ('error' in r) throw new Error(r.error);
        run++;
      }
    });
    report.twinRuns = run;
    report.observations = made;

    // Facility register: sites spread over the country, loaded in files of 2,000.
    const inst = listMinistries()[0]!.id;
    let sites = 0;
    await time('sitesLoadMs', async () => {
      while (sites < SITES) {
        const rows = ['name,category,latitude,longitude'];
        for (let i = 0; i < 2000 && sites < SITES; i++, sites++) {
          const lat = (-4.5 + ((sites * 37) % 900) / 100).toFixed(5), lng = (34.2 + ((sites * 53) % 700) / 100).toFixed(5);
          rows.push(`Soak school ${sites},school,${lat},${lng}`);
        }
        const r = await importSites(inst, rows.join('\n'), 'csv', 'Soak', { method: 'survey-import' });
        if ('error' in r) throw new Error(r.error);
      }
    });
    report.sites = sites;

    // Audit chain.
    await time('auditLoadMs', () => { for (let i = 0; i < AUDIT; i++) recordAudit('Soak', 'soak.entry', `Soak:${i}`, 'ok'); });
    report.auditEntries = listAudit().length;
    report.heapLoadedMb = mb();

    // Saving: the first flush encodes and writes every store; the second finds nothing changed.
    const sink = new Map<string, string>();
    const adapter = { name: 'memory', save: async (k: string, v: string) => { sink.set(k, v); return 1; }, load: async () => ({}) } as unknown as StateAdapter;
    await time('flushFirstMs', () => flush(adapter));
    report.snapshotMb = Math.round([...sink.values()].reduce((n, v) => n + v.length, 0) / 1_048_576);
    await time('flushUnchangedMs', () => flush(adapter));

    // Queries an official runs.
    await time('asOfQueryMs', () => stateAsOf({ asOf: '2001-06-30', metric: 'metric_5' }));
    await time('duplicateCheckMs', () => checkLocation({ lng: 36.81724, lat: -1.28638, category: 'school', name: 'Soak school 1' }));
    report.heapEndMb = mb();

    if (process.env.SOAK_REPORT) writeFileSync(process.env.SOAK_REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    expect(report.flushFirstMs).toBeLessThan(Number(process.env.SOAK_FLUSH_S ?? 30) * 1000);
    expect(report.flushUnchangedMs).toBeLessThan(Number(process.env.SOAK_FLUSH_S ?? 30) * 1000);
    expect(report.asOfQueryMs).toBeLessThan(Number(process.env.SOAK_QUERY_MS ?? 2000));
    expect(report.heapEndMb).toBeLessThan(Number(process.env.SOAK_HEAP_MB ?? 1024));
  }, 1_800_000);
});
