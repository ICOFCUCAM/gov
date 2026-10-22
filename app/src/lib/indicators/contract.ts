// The common indicator contract (spec Part 1 §12 for the economic institutions
// and Part 2 F for all others): one computed value in the field names the
// specification uses, so another system, the twin or an auditor reads the same
// thing. Both field sets are given (period_start and period.start …). Pure.

import { nationRegions } from '@/lib/nation/registry';
import type { IndicatorDefinition, IndicatorValue } from './types';

export type Provenance = 'observed' | 'reported' | 'modelled' | 'sample' | 'not_connected';

/** A count of the platform's own authoritative records is "observed" in the specification's vocabulary (recorded by the authoritative source). */
export const provenanceOf = (v: Pick<IndicatorValue, 'kind'>): Provenance =>
  v.kind === 'record' || v.kind === 'observed' ? 'observed' : v.kind === 'reported' ? 'reported' : v.kind === 'modelled' ? 'modelled' : v.kind === 'sample' || v.kind === 'simulated' ? 'sample' : 'not_connected';

export function contractOf(def: IndicatorDefinition, v: IndicatorValue) {
  const terms = def.versions.find(x => x.n === v.version)?.terms ?? def.versions.at(-1)!.terms;
  const provenance = provenanceOf(v);
  const validated = v.status === 'approved' && provenance === 'observed' && v.coverage.completeness === 'complete';
  const geography = terms.method.id.startsWith('civil.') || terms.method.id.startsWith('organisations.')
    ? { level: 'nation', regions: [...nationRegions()] }
    : v.institution ? { level: 'institution', institution_id: v.institution } : { level: 'government' };
  const legal = `${v.disclosure.rule}${v.disclosure.version ? ` version ${v.disclosure.version}` : ''}; definition ${def.id} version ${v.version} ${v.status === 'approved' ? 'approved by the institution' : 'not approved (draft)'}`;
  return {
    indicator_id: def.id,
    definition: terms.definition,
    definition_version: v.version,
    definition_status: v.status,
    value: v.value,
    unit: v.unit,
    numerator: v.numerator ?? null,
    denominator: v.denominator ?? null,
    period: { start: v.period.start, end: v.period.end },
    period_start: v.period.start,
    period_end: v.period.end,
    geography,
    observed_at: v.computedAt,
    last_updated: v.lastUpdated ?? null,
    source: { institution_id: v.institution ?? null, register_id: v.source.registerId, source_version: v.source.method },
    source_institution_id: v.institution ?? null,
    source_record_type: v.source.recordType,
    source_query_or_method_version: v.source.method,
    coverage: { expected_sources: v.coverage.expected, reporting_sources: v.coverage.reporting, completeness: v.coverage.completeness === 'not_calculated' ? 'not_calculated' : v.coverage.completeness },
    provenance,
    quality: { coverage: v.coverage.completeness === 'complete' ? 'complete' : v.coverage.completeness === 'partial' ? 'partial' : 'unknown', validation_status: validated ? 'validated' : 'not_assessed' },
    quality_status: validated ? 'validated' : 'not_assessed',
    classification: v.status === 'approved' ? 'approved_aggregate' : 'draft_definition',
    legal_basis_ref: legal,
    records: { count: v.records.count, sha256: v.records.sha256 },
    ...(v.reason ? { note: v.reason } : {}),
  };
}
