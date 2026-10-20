// Health capacity in the national twin: the counts licensed facilities
// reported (lib/health/register.ts), summed per region for the latest period
// reported, published as register figures with their lineage. Aggregates
// only: the twin never sees a patient. A region with no returns shows
// nothing. Run by the twin ingest job when anything changed.

import { listSources, registerSource, runSource } from '@/lib/twin/register';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { getOrganisation, current } from '@/lib/organisations/register';
import { allCapacity as allReturns, CAPACITY_METRICS as RETURN_METRICS } from './register';
import { lineage } from '@/lib/education/register';

export const HEALTH_SOURCE_NAME = 'Health capacity returns (reported by licensed facilities)';
const g = globalThis as unknown as { __healthCountsDigest?: string };

/** The latest period any facility reported, and per region and count the sum of each facility's latest version for it. */
export function capacityRows(): { period: string; rows: { metric: string; region: string; value: number; returns: number; sha256: string }[] } | null {
  const all = allReturns();
  const period = all.map(r => r.period).sort().at(-1);
  if (!period) return null;
  const groups = new Map<string, { value: number; ids: string[] }>();
  for (const r of all.filter(x => x.period === period)) {
    const o = getOrganisation(r.organisation);
    const region = o ? current(o).region : undefined;
    if (!region) continue;
    const counts = r.versions.at(-1)!.counts;
    for (const m of RETURN_METRICS) {
      const v = counts[m];
      if (v === undefined) continue;
      const key = `health.${m}|${region}`;
      const gr = groups.get(key) ?? { value: 0, ids: [] };
      gr.value += v; gr.ids.push(`${r.id}#${r.versions.length}`);
      groups.set(key, gr);
    }
  }
  return { period, rows: [...groups].map(([key, gr]) => { const [metric, region] = key.split('|') as [string, string]; return { metric, region, value: gr.value, returns: gr.ids.length, sha256: lineage(gr.ids) }; }) };
}

export async function publishHealthCapacity(by: string, force = false, now = new Date()): Promise<{ published: boolean; run?: string; accepted?: number; error?: string }> {
  const r = capacityRows();
  if (!r?.rows.length) return { published: false };
  const digest = lineage(r.rows.map(x => `${x.metric}|${x.region}|${x.value}|${x.sha256}`));
  if (!force && g.__healthCountsDigest === digest) return { published: false };
  let source = listSources().find(s => s.name === HEALTH_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('healthRegulation') ?? '')?.name ?? 'Health regulator';
    const s = registerSource({ by, name: HEALTH_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'health-register', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  const date = now.toISOString().slice(0, 10);
  const csv = ['metric,region,date,count,records_count,records_sha256', ...r.rows.map(x => `${x.metric},"${x.region.replace(/"/g, '""')}",${date},${x.value},${x.returns},${x.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: `health register: sum of the latest version of each licensed facility's capacity return for ${r.period}, by region` } });
  if ('error' in run) return { published: false, error: run.error };
  g.__healthCountsDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted };
}
