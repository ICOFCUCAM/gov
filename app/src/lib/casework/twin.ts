// Case work in the national twin (directions 11.1, 17 Gate 6: dashboards
// switched from simulation to records): for each institution and month,
// the cases opened, decided and closed late under its procedures, as
// administrative counts with their lineage (the SHA-256 of the case ids
// counted). Counts only: no case content, no names. The twin reads the
// cases; it never writes them. Run by the twin ingest job when anything
// changed. Months with nothing are missing, never zero.

import { createHash } from 'node:crypto';
import { listSources, registerSource, runSource, syncRegister } from '@/lib/twin/register';
import { getMinistry } from '@/lib/data/store';
import { listCases } from './engine';

export const CASES_SOURCE_NAME = 'Case work (administrative counts)';
const g = globalThis as unknown as { __caseCountsDigest?: string };
const sha = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n'), 'utf8').digest('hex');

/** One row per institution, month and measure. */
export function caseCountRows(): { metric: string; institution: string; month: string; count: number; sha256: string }[] {
  const groups = new Map<string, string[]>();
  const add = (metric: string, owner: string, at: string | undefined, id: string) => {
    if (!at) return;
    const key = `${metric}|${owner}|${at.slice(0, 7)}`;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  };
  for (const c of listCases({ limit: 100_000 })) {
    if (c.source === 'sample') continue;
    add('cases.opened', c.owner, c.openedAt, c.id);
    const decided = c.history.find(s => s.decision);
    add('cases.decided', c.owner, decided?.at, c.id);
    if (c.deadlines.some(d => d.lapsed)) add('cases.late', c.owner, c.deadlines.find(d => d.lapsed)?.lapsed, c.id);
  }
  return [...groups].flatMap(([key, ids]) => {
    const [metric, owner, month] = key.split('|') as [string, string, string];
    const name = getMinistry(owner)?.name;
    return name ? [{ metric, institution: name, month, count: ids.length, sha256: sha(ids) }] : [];
  });
}

export async function publishCaseCounts(by: string, force = false): Promise<{ published: boolean; run?: string; accepted?: number; error?: string }> {
  const rows = caseCountRows();
  if (!rows.length) return { published: false };
  const digest = sha(rows.map(r => `${r.metric}|${r.institution}|${r.month}|${r.sha256}`));
  if (!force && g.__caseCountsDigest === digest) return { published: false };
  await syncRegister();
  let source = listSources().find(s => s.name === CASES_SOURCE_NAME);
  if (!source) {
    const s = registerSource({ by, name: CASES_SOURCE_NAME, publisher: 'Each institution (its cases)', kind: 'csv-upload', system: 'case-work', mapping: { entity: 'institution', value: 'count', metric: { column: 'metric' }, date: { column: 'month' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ['metric,institution,month,count,records_count,records_sha256', ...rows.map(r => `${r.metric},${q(r.institution)},${r.month},${r.count},${r.count},${r.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: 'cases under approved procedures: opened, decided and late, by institution and month' } });
  if ('error' in run) return { published: false, error: run.error };
  g.__caseCountsDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted };
}
