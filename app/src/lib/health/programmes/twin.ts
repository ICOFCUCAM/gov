// Public-health programme counts in the national twin: the accepted returns
// (lib/health/programmes/register.ts), as observations of a registered
// source's run, never typed. Only what publishedReturn() lets out: each count
// through the nation's small-cell rule (a suppressed cell is left out, never a
// zero; nothing at all until a threshold is adopted), the four classes kept
// apart in the metric's name (reported, suspected and confirmed counts each
// their own metric). Modelled figures and estimates are not observations: they
// stay on the register, labelled, and never enter the twin as observed. For
// each programme the latest period any area reported; per area the latest
// version of each return. Run by the twin ingest job when anything changed.

import { listSources, registerSource, runSource } from '@/lib/twin/register';
import { getMetric, registerMetric } from '@/lib/twin/metrics';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { lineage } from '@/lib/education/register';
import { listPublishedReturns, getProgramme, termsOf, BASIS_LABEL } from './register';

export const PROGRAMME_SOURCE_NAME = 'Public-health programme returns (aggregate counts accepted by the public-health authority)';
const g = globalThis as unknown as { __programmeCountsDigest?: string };

/** A twin metric id: lower case letters, digits, dots and underscores. */
export const metricId = (s: string) => s.toLowerCase().replace(/[^a-z0-9._]/g, '_');

/** The rows the twin may receive. */
export function programmeTwinRows(): { metric: string; label: string; every: 'month' | 'quarter' | 'year'; region: string; value: number; period: string; returns: string[] }[] {
  const all = listPublishedReturns();
  const latest = new Map<string, string>();
  for (const r of all) if ((latest.get(r.programme) ?? '') < r.period.to) latest.set(r.programme, r.period.to);
  const rows = new Map<string, { metric: string; label: string; every: 'month' | 'quarter' | 'year'; region: string; value: number; period: string; returns: string[] }>();
  for (const r of all.filter(x => latest.get(x.programme) === x.period.to)) {
    for (const c of r.counts) {
      if (c.basis === 'modelled' || c.quality !== 'counted' || !('value' in c.cell)) continue;
      const metric = metricId(`public_health.${r.programme}.${c.indicator}${c.breakdown ? `.${c.breakdown}` : ''}.${c.basis}`);
      const k = `${metric}|${r.area}`;
      const p = getProgramme(r.programme);
      const label = `${p ? termsOf(p).title : r.programme}: ${c.indicator}${c.breakdown ? ` (${c.breakdown})` : ''}, ${BASIS_LABEL[c.basis].toLowerCase()} (programme returns)`.slice(0, 120);
      const row = rows.get(k) ?? { metric, label, every: p ? termsOf(p).reportingPeriod : 'year', region: r.area, value: 0, period: `${r.period.from}..${r.period.to}`, returns: [] };
      row.value += c.cell.value;
      row.returns.push(`${r.number}#${r.version}`);
      rows.set(k, row);
    }
  }
  return [...rows.values()];
}

export async function publishProgrammeReturns(by: string, force = false, now = new Date()): Promise<{ published: boolean; run?: string; accepted?: number; error?: string }> {
  const rows = programmeTwinRows();
  if (!rows.length) return { published: false };
  const digest = lineage(rows.map(x => `${x.metric}|${x.region}|${x.value}|${x.returns.join(',')}`));
  if (!force && g.__programmeCountsDigest === digest) return { published: false };
  let source = listSources().find(s => s.name === PROGRAMME_SOURCE_NAME);
  if (!source) {
    const publisher = getMinistry(authorityFor('publicHealth') ?? '')?.name ?? 'Public-health authority';
    const s = registerSource({ by, name: PROGRAMME_SOURCE_NAME, publisher, kind: 'csv-upload', system: 'public-health-programmes', mapping: { entity: 'region', value: 'count', metric: { column: 'metric' }, date: { column: 'date' } } });
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  // Each metric is the programme's approved indicator in one class: registered once, from the programme's decided terms.
  for (const x of rows) if (!getMetric(x.metric)) {
    const m = registerMetric({ by, id: x.metric, label: x.label, unit: '{counts}', aggregation: 'sum', period: x.every, description: 'Counted in accepted public-health programme returns, after the nation\'s small-cell rule' });
    if ('error' in m) return { published: false, error: m.error };
  }
  const csv = ['metric,region,date,count,records_count,records_sha256', ...rows.map(x => `${x.metric},"${x.region.replace(/"/g, '""')}",${x.period.split('..')[1]},${x.value},${x.returns.length},${lineage(x.returns)}`)].join('\n');
  const run = await runSource(source.id, { by, csv, lineage: { method: 'administrative-count', query: 'public-health programme returns: counted (not estimated or modelled) reported, suspected and confirmed counts by programme, indicator and area for the latest period, after the nation\'s small-cell rule' } });
  if ('error' in run) return { published: false, error: run.error };
  g.__programmeCountsDigest = digest;
  void now;
  return { published: true, run: run.id, accepted: run.accepted };
}
