// Education in the national twin: the counts institutions reported in their
// returns (lib/education/register.ts), summed per region for the latest
// period reported, published as register figures with their lineage (the
// SHA-256 of the returns summed and how many). Only aggregates: the twin
// never sees a pupil, a teacher or a qualification holder. A region whose
// institutions have not reported shows nothing, so no national total appears
// until every region reports. Run by the twin ingest job when anything changed.

import { listSources, registerSource, runSource } from '@/lib/twin/register';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { getOrganisation, current } from '@/lib/organisations/register';
import { allReturns, lineage, RETURN_METRICS } from './register';

export const EDUCATION_SOURCE_NAME = 'Education returns (reported by institutions)';
const g = globalThis as unknown as { __eduCountsDigest?: string };

/** The latest period any institution reported, and per region and count the sum of each institution's latest version for it. */
export function returnRows(): { period: string; rows: { metric: string; region: string; value: number; returns: number; sha256: string }[] } | null {
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
      const key = `education.${m}|${region}`;
      const gr = groups.get(key) ?? { value: 0, ids: [] };
      gr.value += v; gr.ids.push(`${r.id}#${r.versions.length}`);
      groups.set(key, gr);
    }
  }
  return { period, rows: [...groups].map(([key, gr]) => { const [metric, region] = key.split('|') as [string, string]; return { metric, region, value: gr.value, returns: gr.ids.length, sha256: lineage(gr.ids) }; }) };
}

export async function publishEducationReturns(by: string, force = false, now = new Date()): Promise<{ published: boolean; run?: string; accepted?: number; error?: string }> {
  const r = returnRows();
  if (!r?.rows.length) return { published: false };
  const digest = lineage(r.rows.map(x => `${x.metric}|${x.region}|${x.value}|${x.sha256}`));
  if (!force && g.__eduCountsDigest === digest) return { published: false };
  let source = listSources().find(s => s.name === EDUCATION_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('education') ?? '')?.name ?? 'Education authority';
    const s = registerSource({ by, name: EDUCATION_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'education-register', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  const date = now.toISOString().slice(0, 10);
  const csv = ['metric,region,date,count,records_count,records_sha256', ...r.rows.map(x => `${x.metric},"${x.region.replace(/"/g, '""')}",${date},${x.value},${x.returns},${x.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: `education register: sum of the latest version of each institution's return for ${r.period}, by region` } });
  if ('error' in run) return { published: false, error: run.error };
  g.__eduCountsDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted };
}
