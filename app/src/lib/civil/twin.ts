// The civil register's own counts in the national twin (design §9.3,
// directions 11.1, 17.2 step 8): births, deaths and marriages registered per
// region and month, each an administrative count with its lineage (the
// query and the SHA-256 of the event ids counted), so a dashboard's figure
// can be reconciled with the records. The twin reads the register; it never
// writes it. Run hourly by the twin ingest job when anything changed, and
// on demand. Months with nothing registered are missing, never zero.

import { createHash } from 'node:crypto';
import { listSources, registerSource, runSource } from '@/lib/twin/register';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { eventCounts, type VitalKind } from './register';

export const CIVIL_SOURCE_NAME = 'Civil register (administrative counts)';
const METRIC: Record<VitalKind, string> = { birth: 'births.registered', death: 'deaths.registered', marriage: 'marriages.registered' };
const g = globalThis as unknown as { __civilCountsDigest?: string };

const sha = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n'), 'utf8').digest('hex');

/** The rows the twin receives: one per kind, region and month, with the records' hash. */
export function civilCountRows(): { metric: string; region: string; month: string; count: number; sha256: string }[] {
  return (['birth', 'death', 'marriage'] as VitalKind[]).flatMap(k => eventCounts(k).filter(r => r.region).map(r => ({ metric: METRIC[k], region: r.region, month: r.month, count: r.count, sha256: sha(r.ids) })));
}

/** Publish the counts as a twin run (only when they changed since the last one, unless forced). */
export async function publishCivilCounts(by: string, force = false): Promise<{ published: boolean; run?: string; accepted?: number; rejected?: number; error?: string }> {
  const rows = civilCountRows();
  if (!rows.length) return { published: false };
  const digest = sha(rows.map(r => `${r.metric}|${r.region}|${r.month}|${r.sha256}`));
  if (!force && g.__civilCountsDigest === digest) return { published: false };
  let source = listSources().find(s => s.name === CIVIL_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('civilRegistration') ?? '')?.name ?? 'Civil registration authority';
    const s = registerSource({ by, name: CIVIL_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'civil-register', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'month' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  const csv = ['metric,region,month,count,records_count,records_sha256', ...rows.map(r => `${r.metric},"${r.region.replace(/"/g, '""')}",${r.month},${r.count},${r.count},${r.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: 'civil register: registered events by kind, region and month' } });
  if ('error' in run) return { published: false, error: run.error };
  g.__civilCountsDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted, rejected: run.rows - run.accepted };
}
