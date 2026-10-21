// Health workforce counts (Institutional specification Part 2 §C.2 national-twin
// indicator "Workforce counts by approved professional category"; Health I4
// dependency `health-department-functions`). Derived from the register of
// regulated professionals on every read, never typed: counts by profession,
// standing and region of practice (as the registration decision recorded it;
// "not recorded" for registrations made before the region was asked). Each
// cell passes through the nation's small-cell rule (lib/health/small-cells.ts)
// before it is shown or leaves for the twin: a cell above zero and below the
// threshold is suppressed, and nothing is published until a threshold is
// adopted. No name, number or person reference is ever in a count.
//
// The twin receives only registered professionals by profession and region,
// unsuppressed cells only, as observations of a registered source's run (a
// suppressed cell is left out, never sent as zero). Run by the twin ingest job
// when anything changed.

import { listSources, registerSource, runSource } from '@/lib/twin/register';
import { getMetric, registerMetric } from '@/lib/twin/metrics';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { lineage } from '@/lib/education/register';
import { protect, smallCellRule, type Cell } from '@/lib/health/small-cells';
import { professions, workforceTally, type ProfessionalState } from './register';

export const WORKFORCE_SOURCE_NAME = 'Health workforce counts (register of regulated professionals)';
const STATES: ProfessionalState[] = ['registered', 'suspended', 'lapsed', 'revoked'];
const g = globalThis as unknown as { __workforceCountsDigest?: string };

export interface WorkforceCell { profession: string; title: string; state: ProfessionalState; region: string | null; cell: Cell }
export interface WorkforceCounts {
  /** Every cell by profession, standing and region, through the small-cell rule. */
  cells: WorkforceCell[];
  /** Totals by profession and standing (all regions), through the same rule. */
  totals: { profession: string; title: string; state: ProfessionalState; cell: Cell }[];
  rule: { threshold: number; version: number } | null;
  /** How many registrations carry no region of practice (as a cell). */
  regionNotRecorded: Cell;
  source: string;
  sha256: string;
}

/** The counts as anyone may see them: derived from the register now, every cell protected. */
export function workforceCounts(): WorkforceCounts {
  const rule = smallCellRule();
  const tally = workforceTally();
  const title = new Map(professions().map(p => [p.key, p.title]));
  const cells = tally.map(t => ({ profession: t.profession, title: title.get(t.profession) ?? t.profession, state: t.state, region: t.region, cell: protect(t.count, rule) }))
    .sort((a, b) => a.profession.localeCompare(b.profession) || STATES.indexOf(a.state) - STATES.indexOf(b.state) || (a.region ?? '~').localeCompare(b.region ?? '~'));
  const sums = new Map<string, number>();
  for (const t of tally) sums.set(`${t.profession}|${t.state}`, (sums.get(`${t.profession}|${t.state}`) ?? 0) + t.count);
  const totals = [...sums].map(([k, n]) => { const [profession, state] = k.split('|') as [string, ProfessionalState]; return { profession, title: title.get(profession) ?? profession, state, cell: protect(n, rule) }; })
    .sort((a, b) => a.profession.localeCompare(b.profession) || STATES.indexOf(a.state) - STATES.indexOf(b.state));
  const notRecorded = tally.filter(t => t.region === null).reduce((n, t) => n + t.count, 0);
  return {
    cells, totals, rule, regionNotRecorded: protect(notRecorded, rule),
    source: 'lib/professions/register.ts: registrations counted by profession, standing and region of practice at the time of reading',
    sha256: lineage(tally.map(t => `${t.profession}|${t.state}|${t.region ?? ''}|${t.count}`).sort()),
  };
}

/** The rows the twin may receive: registered professionals by profession and region, unsuppressed cells only. */
export function workforceTwinRows(): { metric: string; title: string; region: string; value: number }[] {
  return workforceCounts().cells
    .filter(c => c.state === 'registered' && c.region && 'value' in c.cell)
    .map(c => ({ metric: `health.workforce.${c.profession.replace(/[^a-z0-9._]/g, '_')}`, title: c.title, region: c.region!, value: (c.cell as { value: number }).value }));
}

export async function publishWorkforceCounts(by: string, force = false, now = new Date()): Promise<{ published: boolean; run?: string; accepted?: number; error?: string }> {
  const rows = workforceTwinRows();
  if (!rows.length) return { published: false };
  const digest = lineage(rows.map(x => `${x.metric}|${x.region}|${x.value}`));
  if (!force && g.__workforceCountsDigest === digest) return { published: false };
  let source = listSources().find(s => s.name === WORKFORCE_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('professionalRegulation') ?? '')?.name ?? 'Professional regulator';
    const s = registerSource({ by, name: WORKFORCE_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'professions-register', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  for (const x of rows) if (!getMetric(x.metric)) {
    const m = registerMetric({ by, id: x.metric, label: `Registered ${x.title.toLowerCase()} (professions register)`.slice(0, 120), unit: '{persons}', aggregation: 'sum', period: 'instant', description: 'Counted from the register of regulated professionals by region of practice, after the nation\'s small-cell rule' });
    if ('error' in m) return { published: false, error: m.error };
  }
  const date = now.toISOString().slice(0, 10);
  const sha = workforceCounts().sha256;
  const csv = ['metric,region,date,count,records_count,records_sha256', ...rows.map(x => `${x.metric},"${x.region.replace(/"/g, '""')}",${date},${x.value},${x.value},${sha}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: 'register of regulated professionals: registrations in standing "registered" by profession and region of practice; cells below the nation\'s small-cell threshold left out' } });
  if ('error' in run) return { published: false, error: run.error };
  g.__workforceCountsDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted };
}
