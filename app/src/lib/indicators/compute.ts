// Indicator values, computed from the records at the moment they are asked
// for (plan step I3). A value carries what the twin contract asks (spec Part 1
// §12, Part 2 F): the definition and version it was computed under and whether
// that version is approved there, the period, its kind (Record, Sample, Not
// connected), the source institution, register, record type and method
// version, its coverage, the disclosure rule applied (small cells suppressed,
// never shown as zero), the lineage of the records counted and when the newest
// of them changed. A definition with no source gives no value and says why;
// it is never a zero.
//
// Sample records count only where samples are allowed (demo and training) and
// then mark the value Sample; in production they never count. A value is
// shown outside its institution only once the institution approved the
// definition, or to officials within reach of it (lib/auth/roles.ts
// reaches()): an independent institution controls the publication of its own
// figures.

import { createHash } from 'node:crypto';
import { samplesAllowed } from '@/lib/ops/mode';
import { getMinistry, listMinistries } from '@/lib/data/store';
import { reaches, type Scope } from '@/lib/auth/roles';
import { getMethod, type RawResult } from './methods';
import { disclose, disclosureRef } from './disclosure';
import { listDefinitions, getDefinition, versionFor, ownerInstitutionOf } from './register';
import type { IndicatorDefinition, IndicatorValue } from './types';

const sha = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n'), 'utf8').digest('hex');

/** A calendar month as a period: start inclusive, end exclusive (ISO dates). Default: the current month. */
export function monthPeriod(month?: string, now = new Date()): { start: string; end: string; month: string } {
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : now.toISOString().slice(0, 7);
  const [y, mo] = m.split('-').map(Number) as [number, number];
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  return { start: `${m}-01`, end: `${next}-01`, month: m };
}

/** The months before and including `month`, oldest first. */
export function monthsBack(n: number, month?: string, now = new Date()): string[] {
  const p = monthPeriod(month, now);
  const [y, m] = p.month.split('-').map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const k = y * 12 + (m - 1) - (n - 1 - i);
    return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
  });
}

export interface ComputeOptions {
  institution?: string;
  month?: string;
  now?: Date;
  /** Whether sample records may count (default: samplesAllowed()). The twin always passes false. */
  samples?: boolean;
  /** The signed-in official reading it (null or absent: no official, as where sign-in is not enforced). */
  viewer?: Scope | null;
}

/** The institution a definition's value is computed for. */
export function institutionFor(def: IndicatorDefinition, requested?: string): string | undefined {
  const owner = ownerInstitutionOf(def.owner);
  return owner === undefined ? requested : owner || undefined;
}

/** Compute one definition's value for one institution and month. */
export function computeValue(def: IndicatorDefinition, opts: ComputeOptions = {}): IndicatorValue {
  const now = opts.now ?? new Date();
  const p = monthPeriod(opts.month, now);
  const institution = institutionFor(def, opts.institution);
  const { version, status, newerDraft } = versionFor(def, institution);
  const t = version.terms;
  const method = getMethod(t.method.id, t.method.version);
  const base: Omit<IndicatorValue, 'value' | 'kind' | 'coverage' | 'records'> = {
    indicatorId: def.id, version: version.n, status, ...(newerDraft ? { newerDraft } : {}), ...(institution ? { institution } : {}),
    title: t.title, unit: t.unit, period: { start: p.start, end: p.end },
    source: { ...(institution ? { institution, institutionName: getMinistry(institution)?.name ?? institution } : {}), registerId: t.source.registerId, recordType: t.source.recordType, method: `${t.method.id}@${t.method.version}` },
    disclosure: disclosureRef(t.disclosure), computedAt: now.toISOString(),
  };
  const none = (reason: string, coverage: IndicatorValue['coverage'] = { expected: 0, reporting: 0, completeness: 'not_calculated', of: '' }): IndicatorValue =>
    ({ ...base, value: null, kind: 'unavailable', coverage, records: { count: 0, sha256: sha([]) }, reason });
  if (!method) return none(`The computation ${t.method.id} version ${t.method.version} is no longer offered: a new version of the definition is needed`);
  if ('slot' in def.owner && !institution) return none(`No institution is named as responsible for ${def.owner.slot} (Configuration → Who is responsible)`);
  if (method.geography === 'institution' && !institution) return none('Computed for one institution: choose the institution');
  if (opts.viewer && institution && status !== 'approved' && !reaches(opts.viewer, institution)) return none(`Not published by ${getMinistry(institution)?.name ?? 'its institution'}: the definition is not approved there`);
  const raw: RawResult = method.compute({ ...(institution ? { institution } : {}), start: p.start, end: p.end, samples: opts.samples ?? samplesAllowed(), ...(t.method.params ? { params: t.method.params } : {}) });
  if (raw.unavailable) return none(raw.unavailable, raw.coverage);
  const cell = disclose(t.disclosure, raw.base);
  const records = { count: raw.ids.length, sha256: sha(raw.ids) };
  const kind = raw.sample ? 'sample' as const : 'record' as const;
  const lastUpdated = raw.lastAt;
  if ('suppressed' in cell) {
    return { ...base, value: null, kind, coverage: raw.coverage, records, ...(lastUpdated ? { lastUpdated } : {}), disclosure: { ...base.disclosure, suppressed: cell.suppressed },
      reason: cell.suppressed === 'no-threshold' ? 'Held back: the nation has not adopted a small-cell threshold' : 'Held back: a small number that could identify people' };
  }
  let groups = raw.groups?.map(gr => {
    if (gr.value === null) return { key: gr.key, label: gr.label, value: null };
    const c = disclose(t.disclosure, gr.base);
    return 'suppressed' in c ? { key: gr.key, label: gr.label, value: null, suppressed: c.suppressed } : { key: gr.key, label: gr.label, value: gr.value, ...(gr.numerator !== undefined ? { numerator: gr.numerator, denominator: gr.denominator } : {}), ...(gr.ids ? { sha256: sha(gr.ids) } : {}) };
  });
  // A suppressed cell beside the total could be worked out by subtraction: the breakdown is withheld, the total stands.
  const withheld = !!groups?.some(x => 'suppressed' in x && x.suppressed) && raw.value !== null;
  if (withheld) groups = undefined;
  return {
    ...base, value: raw.value, kind, coverage: raw.coverage, records, ...(lastUpdated ? { lastUpdated } : {}),
    ...(raw.numerator !== undefined ? { numerator: raw.numerator, denominator: raw.denominator } : {}),
    ...(withheld ? { disclosure: { ...base.disclosure, breakdownWithheld: true } } : {}),
    ...(raw.value === null && raw.note ? { reason: raw.note } : raw.note ? { reason: raw.note } : {}),
    ...(groups ? { groups } : {}),
  };
}

/** The definitions whose figures belong to one institution: those it keeps for its own records and those of the slots it holds. */
export function definitionsFor(institution: string): IndicatorDefinition[] {
  return listDefinitions().filter(d => ('each' in d.owner) || ownerInstitutionOf(d.owner) === institution);
}

/** Every value of one institution for a month. */
export function institutionValues(institution: string, opts: Omit<ComputeOptions, 'institution'> = {}): IndicatorValue[] {
  return definitionsFor(institution).map(d => computeValue(d, { ...opts, institution }));
}

/** One definition over the last `n` months for one institution, oldest first. */
export function seriesOf(id: string, n: number, opts: ComputeOptions = {}): IndicatorValue[] {
  const def = getDefinition(id);
  if (!def) return [];
  return monthsBack(Math.min(Math.max(n, 1), 24), opts.month, opts.now).map(month => computeValue(def, { ...opts, month }));
}

/**
 * A definition kept by each institution, across the whole government: counts
 * summed and shares pooled (numerator over denominator) over the institutions
 * that run an approved procedure; a median is never combined. Approved only
 * where every contributing institution approved it.
 */
export function governmentValue(def: IndicatorDefinition, opts: Omit<ComputeOptions, 'institution'> = {}): IndicatorValue & { institutions: number } {
  const parts = listMinistries().filter(m => m.status !== 'merged').map(m => computeValue(def, { ...opts, institution: m.id }));
  const counted = parts.filter(v => v.kind !== 'unavailable');
  const first = parts[0] ?? computeValue(def, opts);
  const t = def.versions.at(-1)!.terms;
  const p = monthPeriod(opts.month, opts.now);
  const status: 'approved' | 'draft' = counted.length && counted.every(v => v.status === 'approved') ? 'approved' : 'draft';
  const coverage = { expected: parts.length, reporting: counted.length, completeness: counted.length === 0 ? 'none' as const : counted.length === parts.length ? 'complete' as const : 'partial' as const, of: 'institutions with an approved procedure' };
  const common = { ...first, institution: undefined, status, title: t.title, unit: t.unit, period: { start: p.start, end: p.end }, coverage, institutions: counted.length,
    source: { ...first.source, institution: undefined, institutionName: 'Every institution with an approved procedure' } };
  delete (common as Partial<IndicatorValue>).groups;
  if (!counted.length) return { ...common, value: null, kind: 'unavailable', records: { count: 0, sha256: sha([]) }, reason: 'No institution runs an approved procedure: no case work is kept in the platform yet' };
  const held = counted.find(v => v.value === null && v.disclosure.suppressed);
  const kind = counted.some(v => v.kind === 'sample') ? 'sample' as const : 'record' as const;
  const records = { count: counted.reduce((a, v) => a + v.records.count, 0), sha256: sha(counted.map(v => v.records.sha256)) };
  const lastUpdated = counted.map(v => v.lastUpdated).filter((x): x is string => !!x).sort().at(-1);
  if (held) return { ...common, value: null, kind, records, reason: held.reason ?? 'Held back by the disclosure rule' };
  if (t.unit === 'd') return { ...common, value: null, kind, records, ...(lastUpdated ? { lastUpdated } : {}), reason: 'A median is not combined across institutions: see each institution' };
  if (t.unit === '%') {
    const num = counted.reduce((a, v) => a + (v.numerator ?? 0), 0), den = counted.reduce((a, v) => a + (v.denominator ?? 0), 0);
    return { ...common, value: den ? Math.round((1000 * num) / den) / 10 : null, numerator: num, denominator: den, kind, records, ...(lastUpdated ? { lastUpdated } : {}), ...(den ? {} : { reason: 'No case in the period to divide by' }),
      groups: counted.map(v => ({ key: v.institution!, label: v.source.institutionName ?? v.institution!, value: v.value, ...(v.numerator !== undefined ? { numerator: v.numerator, denominator: v.denominator } : {}) })) };
  }
  return { ...common, value: counted.reduce((a, v) => a + (v.value ?? 0), 0), kind, records, ...(lastUpdated ? { lastUpdated } : {}),
    groups: counted.map(v => ({ key: v.institution!, label: v.source.institutionName ?? v.institution!, value: v.value })) };
}

/** The register's current values: one per definition (a slot's institution, or the whole government for one each institution keeps). */
export function registerValues(opts: Omit<ComputeOptions, 'institution'> = {}): IndicatorValue[] {
  return listDefinitions().map(d => ('each' in d.owner ? governmentValue(d, opts) : computeValue(d, opts)));
}
