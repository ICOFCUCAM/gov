import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { runProv } from './prov';
import { resetTwin, syncRegister, registerSource, runSource, withdrawRun } from './register';
import { applyNation } from '@/lib/nation/registry';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
type Node = Record<string, unknown> & { '@id': string; '@type': string | string[] };

describe('PROV-O for twin imports', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });

  it('describes the run, the official, the file with its SHA-256 and the observations generated', async () => {
    const csv = 'region,value,year\nMombasa,1000,2019\nKisumu,2000,2019\nAtlantis,1,2019\n';
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, date: { column: 'year' } } }));
    const run = ok(await runSource(s.id, { by: 'Director of Statistics', csv }));
    const doc = runProv(run.id, 'https://twin.example')!;
    expect(doc['@context']).toMatchObject({ prov: 'http://www.w3.org/ns/prov#' });
    const g = doc['@graph'] as Node[];
    const act = g.find(n => n['@type'] === 'prov:Activity')!;
    expect(act).toMatchObject({
      '@id': `https://twin.example/api/twin/runs/${run.id}`, 'prov:startedAtTime': run.at,
      'prov:wasAssociatedWith': { '@id': 'https://twin.example/api/twin/agents/Director%20of%20Statistics' },
      'prov:used': { '@id': `https://twin.example/api/twin/runs/${run.id}#file` }, 'civicos:generatedCount': 2,
    });
    expect(act['prov:generated']).toHaveLength(2);
    expect(g.find(n => n['@id'].endsWith('#file'))).toMatchObject({ 'spdx:checksum': { 'spdx:checksumValue': createHash('sha256').update(csv).digest('hex') } });
    expect(g.find(n => (n['@type'] as string[]).includes?.('prov:Person'))).toMatchObject({ 'foaf:name': 'Director of Statistics' });
    const o = g.find(n => n['dct:identifier'] === `${run.id}/place:KE-28/population/2019-01-01`)!;
    expect(o).toMatchObject({ '@type': 'prov:Entity', 'civicos:value': 1000, 'prov:wasGeneratedBy': { '@id': act['@id'] } });
    expect(runProv('RUN-404', 'https://twin.example')).toBeUndefined();
  });

  it('records a withdrawal as the activity that invalidated the observations', async () => {
    const s = ok(registerSource({ by: 'D', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' } } }));
    const run = ok(await runSource(s.id, { by: 'D', csv: 'region,value\nMombasa,1\n' }));
    ok(withdrawRun(run.id, 'E', 'keyed wrongly'));
    const g = runProv(run.id, 'https://t.example')!['@graph'] as Node[];
    expect(g.find(n => n['@id'].endsWith('#withdrawal'))).toMatchObject({ 'dct:description': 'keyed wrongly', 'prov:invalidated': [expect.any(Object)] });
    expect(g.find(n => n['@type'] === 'prov:Entity' && String(n['dct:identifier']).startsWith(`${run.id}/`))).toMatchObject({ 'prov:invalidatedAtTime': expect.any(String) });
  });
});
