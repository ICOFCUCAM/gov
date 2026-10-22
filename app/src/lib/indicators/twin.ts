// Indicators in the national twin (plan step I3, the twin contract; spec Part 1
// §12 "the twin should consume approved aggregate observations", §5.5, Part 2
// F): every definition approved at an institution publishes its computed
// values as observations of one registered internal source, the indicator
// register, each with when it was true (validFrom/validTo: the period, the
// twin's "as of") and when the platform recorded it (recordedAt, "known at"),
// as administrative counts with their lineage (the SHA-256 of the records'
// ids). Only approved definitions, only real records (sample records never
// enter the twin), only after the disclosure rule (a suppressed cell is left
// out, never a zero; where a regional cell is suppressed only the national
// figure goes). The last three complete months, so late registrations reach
// earlier periods. Run by the twin ingest job when anything changed.
//
// Nobody can type an indicator observation: the source and the `indicator.`
// metrics accept rows only from this module's computed run
// (lib/twin/computed.ts COMPUTED_FROM_RECORDS); an uploaded CSV, a fetched
// file or a hand-registered source is refused (twin.test.ts).

import { createHash } from 'node:crypto';
import { listSources, registerSource, runSource, syncRegister, regionEntities, listEntities } from '@/lib/twin/register';
import { getMetric, registerMetric } from '@/lib/twin/metrics';
import { COMPUTED_FROM_RECORDS, INDICATOR_SYSTEM, INDICATOR_METRIC_PREFIX } from '@/lib/twin/computed';
import { listDefinitions, approvedAt, ownerInstitutionOf } from './register';
import { computeValue, monthsBack, monthPeriod } from './compute';
import type { IndicatorDefinition, IndicatorValue } from './types';

export const INDICATOR_SOURCE_NAME = 'Indicator register (values computed from the platform\'s records under approved definitions)';
const g = globalThis as unknown as { __indicatorTwinDigest?: string };
const sha = (xs: string[]) => createHash('sha256').update([...xs].sort().join('\n'), 'utf8').digest('hex');

export const metricOf = (id: string) => `${INDICATOR_METRIC_PREFIX}${id}`.slice(0, 64);

export interface TwinRow { metric: string; entity: string; date: string; validTo: string; value: number; count: number; sha256: string; unit: string; title: string }

/** The institutions a definition publishes for: where it is approved (a slot's institution, or each institution that approved it). */
function publishers(d: IndicatorDefinition): string[] {
  const owner = ownerInstitutionOf(d.owner);
  const at = approvedAt(d);
  return owner === undefined ? at : owner && at.includes(owner) ? [owner] : [];
}

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** The rows the twin receives, computed now from the records. */
export function indicatorTwinRows(now = new Date()): TwinRow[] {
  const prev = monthPeriod(undefined, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 86_400_000)).month;
  const months = monthsBack(3, prev, now);
  const regions = regionEntities();
  const nation = listEntities('nation')[0];
  const rows: TwinRow[] = [];
  for (const d of listDefinitions()) {
    for (const inst of publishers(d)) {
      for (const month of months) {
        // Never samples, never a viewer's scope: the figure the institution approved, from its real records.
        const v: IndicatorValue = computeValue(d, { institution: inst, month, now, samples: false });
        if (v.status !== 'approved' || v.kind !== 'record' || v.value === null) continue;
        const base = { metric: metricOf(d.id), date: v.period.start, validTo: v.period.end, unit: v.unit, title: v.title };
        const regional = d.versions.find(x => x.n === v.version)!.terms.method.id.startsWith('civil.') || d.versions.find(x => x.n === v.version)!.terms.method.id.startsWith('organisations.');
        if (!regional) { rows.push({ ...base, entity: `institution:${inst}`, value: v.value, count: v.records.count, sha256: v.records.sha256 }); continue; }
        const groups = v.groups ?? [];
        const all = groups.length === regions.length && groups.every(x => x.value !== null && x.sha256);
        if (all) {
          for (const gr of groups) {
            const e = regions.find(r => fold(r.name) === fold(gr.key));
            if (e) rows.push({ ...base, entity: e.id, value: gr.value!, count: gr.value!, sha256: gr.sha256! });
          }
        } else if (nation) rows.push({ ...base, entity: nation.id, value: v.value, count: v.records.count, sha256: v.records.sha256 });
      }
    }
  }
  return rows;
}

/** Publish the computed rows as one run of the indicator register's source (only when they changed, unless forced). */
export async function publishIndicators(by: string, force = false, now = new Date()): Promise<{ published: boolean; run?: string; accepted?: number; rows?: number; error?: string }> {
  await syncRegister();
  const rows = indicatorTwinRows(now);
  if (!rows.length) return { published: false, rows: 0 };
  const digest = sha(rows.map(r => `${r.metric}|${r.entity}|${r.date}|${r.value}|${r.sha256}`));
  if (!force && g.__indicatorTwinDigest === digest) return { published: false, rows: rows.length };
  let source = listSources().find(s => s.system === INDICATOR_SYSTEM);
  if (!source) {
    const s = registerSource({ by, name: INDICATOR_SOURCE_NAME, publisher: 'Each institution, under the indicator definitions it approved', kind: 'csv-upload', system: INDICATOR_SYSTEM,
      mapping: { entity: 'entity', value: 'value', metric: { column: 'metric' }, date: { column: 'date' }, validTo: { column: 'valid_to' } } }, COMPUTED_FROM_RECORDS);
    if ('error' in s) return { published: false, error: s.error };
    source = s;
  }
  // Each indicator is a twin metric defined from its approved definition: counts add across regions, shares and medians never.
  for (const r of rows) if (!getMetric(r.metric) || getMetric(r.metric)!.origin !== 'official') {
    const m = registerMetric({ by, id: r.metric, label: r.title, unit: r.unit, aggregation: r.unit === '%' || r.unit === 'd' ? 'none' : 'sum', period: 'month', description: 'Computed from the platform\'s records under an approved indicator definition (lib/indicators)' }, COMPUTED_FROM_RECORDS);
    if ('error' in m) return { published: false, error: m.error };
  }
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ['metric,entity,date,valid_to,value,records_count,records_sha256', ...rows.map(r => `${r.metric},${q(r.entity)},${r.date},${r.validTo},${r.value},${r.count},${r.sha256}`)].join('\n');
  const run = await runSource(source.id, { by, csv, deps: { now }, computed: COMPUTED_FROM_RECORDS, lineage: { method: 'administrative-count', query: 'indicator register: values of approved definitions computed from cases and registers (real records only, after the disclosure rule), by institution or region and month' } });
  if ('error' in run) return { published: false, error: run.error };
  g.__indicatorTwinDigest = digest;
  return { published: true, run: run.id, accepted: run.accepted, rows: rows.length };
}
