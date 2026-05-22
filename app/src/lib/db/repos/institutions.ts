// lib/db/repos/institutions — persistent institutional registry.
//
// Mirrors the in-memory orchestration registry shape but reads/writes to
// civicos.institutions via the register_institution / activate_institution
// RPCs. When the substrate isn't configured, calls become no-ops and the
// registry stays memory-only.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { InstitutionRow, InstitutionKind } from '@/lib/db/types';

export interface InstitutionUpsert {
  charterId: string;
  label: string;
  kind: InstitutionKind;
  domain: string;
  archetypeOrBranch: string;
  grammar?: string | null;
  safeguardsConstant?: string | null;
  expectedDomains?: number | null;
  shippedDomains?: number | null;
  meta?: Record<string, unknown>;
}

export async function registerInstitutionRow(
  i: InstitutionUpsert,
): Promise<InstitutionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_register_institution', {
    p_charter_id: i.charterId,
    p_label: i.label,
    p_kind: i.kind,
    p_domain: i.domain,
    p_archetype_or_branch: i.archetypeOrBranch,
    p_grammar: i.grammar ?? null,
    p_safeguards_constant: i.safeguardsConstant ?? null,
    p_expected_domains: i.expectedDomains ?? null,
    p_shipped_domains: i.shippedDomains ?? null,
    p_meta: i.meta ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] register_institution RPC failed:', error.message, error.code);
    return null;
  }
  return (data as InstitutionRow) ?? null;
}

export async function activateInstitutionRow(charterId: string): Promise<InstitutionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_activate_institution', {
    p_charter_id: charterId,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] activate_institution RPC failed:', error.message, error.code);
    return null;
  }
  return (data as InstitutionRow) ?? null;
}

export async function listInstitutionsRows(opts: { kind?: InstitutionKind; activated?: boolean } = {}): Promise<InstitutionRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_institutions').select('*');
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.activated !== undefined) q = q.eq('activated', opts.activated);
  const { data, error } = await q.order('charter_id');
  if (error || !data) return [];
  return data as InstitutionRow[];
}

export interface FacilityRowLite {
  id: string;
  code: string;
  institution_id: string | null;
  charter_id: string | null;
  archetype: string | null;
  name: string;
  region: string | null;
  kind: string | null;
  operational_status: string;
}

export async function listFacilitiesRows(opts: { charter?: string; region?: string; limit?: number } = {}): Promise<FacilityRowLite[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_facilities').select('*');
  if (opts.charter) q = q.eq('charter_id', opts.charter);
  if (opts.region) q = q.eq('region', opts.region);
  const { data, error } = await q.order('charter_id').limit(opts.limit ?? 200);
  if (error || !data) return [];
  return data as FacilityRowLite[];
}

export interface ServiceSlaStat {
  charterId: string;
  submitted: number;
  acknowledged: number;
  resolved: number;
  open: number;
  medianAckHours: number | null;
  medianResolveHours: number | null;
  p90ResolveHours: number | null;
  oldestOpenHours: number | null;
}

interface ServiceSlaStatRow {
  charter_id: string; submitted: number; acknowledged: number; resolved: number; open: number;
  median_ack_hours: string | number | null; median_resolve_hours: string | number | null;
  p90_resolve_hours: string | number | null; oldest_open_hours: string | number | null;
}

const numOrNull = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Per-charter aggregate service-delivery SLA stats over the last `days`.
 *  Aggregate-only (no PII) and anon-callable — powers the public SLA board.
 *  Returns [] without a substrate. */
export async function serviceSlaStats(opts: { charterId?: string; days?: number } = {}): Promise<ServiceSlaStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_service_sla_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 30,
  });
  if (error || !data) return [];
  return (data as ServiceSlaStatRow[]).map(r => ({
    charterId: r.charter_id,
    submitted: Number(r.submitted), acknowledged: Number(r.acknowledged),
    resolved: Number(r.resolved), open: Number(r.open),
    medianAckHours: numOrNull(r.median_ack_hours),
    medianResolveHours: numOrNull(r.median_resolve_hours),
    p90ResolveHours: numOrNull(r.p90_resolve_hours),
    oldestOpenHours: numOrNull(r.oldest_open_hours),
  }));
}

export { substrateAvailable };
