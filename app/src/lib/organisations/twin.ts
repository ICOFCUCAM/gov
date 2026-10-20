// The organisations register in the national twin (directions 11.2, 16.6):
// each registered organisation becomes a twin entity in its region, and the
// number in good standing per region and register kind (registrations,
// licences, accreditations) is published as an administrative count with
// its lineage (the SHA-256 of the register numbers counted), so a figure can
// be reconciled with the records. The twin reads the register; it never
// writes it. Run by the twin ingest job when anything changed.

import { createHash } from 'node:crypto';
import { listSources, registerSource, runSource, upsertOrganisationEntity, syncRegister } from '@/lib/twin/register';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { listOrganisations, registerTypes, current, type RegisterKind } from './register';

export const ORGANISATIONS_SOURCE_NAME = 'Organisations register (administrative counts)';
const METRIC: Record<RegisterKind, string> = { registration: 'registrations.granted', licence: 'licences.granted', accreditation: 'accreditations.granted' };
const g = globalThis as unknown as { __orgCountsDigest?: string };
const sha = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n'), 'utf8').digest('hex');

/** One row per register kind and region: organisations holding a granted standing in a register of that kind. */
export function standingCountRows(): { metric: string; region: string; count: number; sha256: string }[] {
  const kind = new Map(registerTypes().map(t => [t.key, t.kind]));
  const groups = new Map<string, string[]>();
  for (const o of listOrganisations({ limit: 2000 })) {
    const region = current(o).region;
    if (!region) continue;
    for (const k of new Set(o.standings.filter(s => s.state === 'granted').map(s => kind.get(s.register)).filter((x): x is RegisterKind => !!x))) {
      const key = `${METRIC[k]}|${region}`;
      groups.set(key, [...(groups.get(key) ?? []), o.number]);
    }
  }
  return [...groups].map(([key, ids]) => { const [metric, region] = key.split('|') as [string, string]; return { metric, region, count: ids.length, sha256: sha(ids) }; });
}

/** Keep the twin's organisation entities in step with the register. */
export async function syncOrganisationEntities(): Promise<number> {
  await syncRegister();
  const orgs = listOrganisations({ limit: 2000 });
  for (const o of orgs) upsertOrganisationEntity({ number: o.number, name: current(o).name, ...(current(o).region ? { region: current(o).region } : {}) });
  return orgs.length;
}

/** Publish the counts as a twin run (only when they changed since the last one, unless forced). */
export async function publishStandingCounts(by: string, force = false, now = new Date()): Promise<{ published: boolean; entities?: number; run?: string; accepted?: number; error?: string }> {
  const entities = await syncOrganisationEntities();
  const rows = standingCountRows();
  if (!rows.length) return { published: false, entities };
  const digest = sha(rows.map(r => `${r.metric}|${r.region}|${r.sha256}`));
  if (!force && g.__orgCountsDigest === digest) return { published: false, entities };
  let source = listSources().find(s => s.name === ORGANISATIONS_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('businessRegister') ?? '')?.name ?? 'Business register authority';
    const s = registerSource({ by, name: ORGANISATIONS_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'organisations-register', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in s) return { published: false, entities, error: s.error };
    source = s;
  }
  const date = now.toISOString().slice(0, 10);
  const csv = ['metric,region,date,count,records_count,records_sha256', ...rows.map(r => `${r.metric},"${r.region.replace(/"/g, '""')}",${date},${r.count},${r.count},${r.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: 'organisations register: organisations in good standing by register kind and region' } });
  if ('error' in run) return { published: false, entities, error: run.error };
  g.__orgCountsDigest = digest;
  return { published: true, entities, run: run.id, accepted: run.accepted };
}
