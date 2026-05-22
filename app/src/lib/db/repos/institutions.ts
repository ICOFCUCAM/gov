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

/** Fetch one institution by its charter_id. null if absent / no substrate. */
export async function institutionByCharterId(charterId: string): Promise<InstitutionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_institutions').select('*')
    .eq('charter_id', charterId).maybeSingle();
  if (error || !data) return null;
  return data as InstitutionRow;
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
  cancelled: number;
  medianAckHours: number | null;
  medianResolveHours: number | null;
  p90ResolveHours: number | null;
  oldestOpenHours: number | null;
  rated: number;
  avgSatisfaction: number | null;
}

interface ServiceSlaStatRow {
  charter_id: string; submitted: number; acknowledged: number; resolved: number; open: number;
  cancelled: number; median_ack_hours: string | number | null; median_resolve_hours: string | number | null;
  p90_resolve_hours: string | number | null; oldest_open_hours: string | number | null;
  rated: number; avg_satisfaction: string | number | null;
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
    resolved: Number(r.resolved), open: Number(r.open), cancelled: Number(r.cancelled),
    medianAckHours: numOrNull(r.median_ack_hours),
    medianResolveHours: numOrNull(r.median_resolve_hours),
    p90ResolveHours: numOrNull(r.p90_resolve_hours),
    oldestOpenHours: numOrNull(r.oldest_open_hours),
    rated: Number(r.rated), avgSatisfaction: numOrNull(r.avg_satisfaction),
  }));
}

export interface AppealsStat {
  charterId: string;
  filed: number;
  admitted: number;
  decided: number;
  published: number;
  pending: number;
  withdrawn: number;
  medianDecisionDays: number | null;
  p90DecisionDays: number | null;
  oldestPendingDays: number | null;
}

interface AppealsStatRow {
  charter_id: string; filed: number; admitted: number; decided: number; published: number;
  pending: number; withdrawn: number; median_decision_days: string | number | null;
  p90_decision_days: string | number | null; oldest_pending_days: string | number | null;
}

/** Per-charter aggregate appeals (contestation) stats over the last `days`.
 *  Aggregate-only (no PII) and anon-callable — powers the public
 *  contestation board. Returns [] without a substrate. */
export async function appealsStats(opts: { charterId?: string; days?: number } = {}): Promise<AppealsStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_appeals_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 90,
  });
  if (error || !data) return [];
  return (data as AppealsStatRow[]).map(r => ({
    charterId: r.charter_id,
    filed: Number(r.filed), admitted: Number(r.admitted), decided: Number(r.decided),
    published: Number(r.published), pending: Number(r.pending), withdrawn: Number(r.withdrawn),
    medianDecisionDays: numOrNull(r.median_decision_days),
    p90DecisionDays: numOrNull(r.p90_decision_days),
    oldestPendingDays: numOrNull(r.oldest_pending_days),
  }));
}

export interface SlaTrendPoint {
  weekStart: string;
  resolved: number;
  medianResolveHours: number | null;
  p90ResolveHours: number | null;
}

interface SlaTrendRow {
  week_start: string; resolved: number;
  median_resolve_hours: string | number | null; p90_resolve_hours: string | number | null;
}

/** Weekly service-delivery turnaround trend (resolved-week buckets) over
 *  the last `weeks`, oldest first. Aggregate-only, anon-callable. [] without
 *  a substrate. */
export async function serviceSlaTrend(opts: { charterId?: string; weeks?: number } = {}): Promise<SlaTrendPoint[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_service_sla_trend', {
    p_charter_id: opts.charterId ?? null, p_weeks: opts.weeks ?? 12,
  });
  if (error || !data) return [];
  return (data as SlaTrendRow[]).map(r => ({
    weekStart: r.week_start,
    resolved: Number(r.resolved),
    medianResolveHours: numOrNull(r.median_resolve_hours),
    p90ResolveHours: numOrNull(r.p90_resolve_hours),
  }));
}

export interface AppealsTrendPoint {
  weekStart: string;
  decided: number;
  medianDecisionDays: number | null;
  p90DecisionDays: number | null;
}

interface AppealsTrendRow {
  week_start: string; decided: number;
  median_decision_days: string | number | null; p90_decision_days: string | number | null;
}

/** Weekly appeals decision-time trend (decided-week buckets) over the last
 *  `weeks`, oldest first. Aggregate-only, anon-callable. [] without a
 *  substrate. */
export async function appealsTrend(opts: { charterId?: string; weeks?: number } = {}): Promise<AppealsTrendPoint[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_appeals_trend', {
    p_charter_id: opts.charterId ?? null, p_weeks: opts.weeks ?? 12,
  });
  if (error || !data) return [];
  return (data as AppealsTrendRow[]).map(r => ({
    weekStart: r.week_start,
    decided: Number(r.decided),
    medianDecisionDays: numOrNull(r.median_decision_days),
    p90DecisionDays: numOrNull(r.p90_decision_days),
  }));
}

export interface ConsentFootprintStat {
  charterId: string;
  scope: string;
  active: number;
  expiring30d: number;
  revoked: number;
}

interface ConsentFootprintRow {
  charter_id: string; scope: string; active: number; expiring_30d: number; revoked: number;
}

/** Per-charter, per-scope data-access footprint: active consents, those
 *  expiring within 30 days, and revoked. Aggregate-only (no citizen id) and
 *  anon-callable. Only (charter, scope) pairs with an active grant appear.
 *  [] without a substrate. */
export async function consentFootprintStats(opts: { charterId?: string } = {}): Promise<ConsentFootprintStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_consent_footprint_stats', {
    p_charter_id: opts.charterId ?? null,
  });
  if (error || !data) return [];
  return (data as ConsentFootprintRow[]).map(r => ({
    charterId: r.charter_id,
    scope: r.scope,
    active: Number(r.active),
    expiring30d: Number(r.expiring_30d),
    revoked: Number(r.revoked),
  }));
}

export interface DirectiveStat {
  charterId: string;
  signed: number;
  effective: number;
  inForce: number;
  rescinded: number;
  medianSignToEffectiveDays: number | null;
}

interface DirectiveStatRow {
  charter_id: string; signed: number; effective: number; in_force: number;
  rescinded: number; median_sign_to_effective_days: string | number | null;
}

/** Per-charter directive (governance output) stats over the last `days`,
 *  counting only signed directives so drafts never leak. Aggregate-only and
 *  anon-callable. [] without a substrate. */
export async function directiveStats(opts: { charterId?: string; days?: number } = {}): Promise<DirectiveStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_directive_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 365,
  });
  if (error || !data) return [];
  return (data as DirectiveStatRow[]).map(r => ({
    charterId: r.charter_id,
    signed: Number(r.signed), effective: Number(r.effective),
    inForce: Number(r.in_force), rescinded: Number(r.rescinded),
    medianSignToEffectiveDays: numOrNull(r.median_sign_to_effective_days),
  }));
}

export { substrateAvailable };
