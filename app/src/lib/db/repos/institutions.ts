// lib/db/repos/institutions — the institutional registry and the substrate's
// per-charter aggregates.
//
// The institutions themselves are the platform's register (the ministry
// registry, /api/org/ministries, and the standing branches and agencies;
// architecture review D8): read here from GET /api/public/charters, never from
// the substrate's civicos.institutions, which only mirrors it
// (lib/db/mirror.ts). Governance output (directive statistics and trend) is
// likewise computed by the platform from its directives register
// (GET /api/public/accountability?only=directives), not by the substrate's
// directive_stats / directive_trend SQL over the mirror. The remaining calls
// read the substrate's own rows (facilities, requests, appeals, consents).
// register-owners.test.ts checks no app code reads a mirrored table as the
// register.
//
// The platform calls run in the browser (relative URLs); server code reads
// lib/institution/charter-register.ts and lib/data/directive-stats.ts directly.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { InstitutionRow, InstitutionKind } from '@/lib/db/types';
import type { DirectiveStat, DirectiveTrendPoint } from '@/lib/data/directive-stats';
import type { Signal } from '@/lib/twin/signal';
import { logger } from '@/lib/ops/log';

export type { DirectiveStat, DirectiveTrendPoint };

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

/** One charter of GET /api/public/charters. */
export interface PublicCharter {
  charter_id: string; label: string; kind: string; domain: string; archetype_or_branch: string;
  activated: boolean; activated_at: string | null; registered_at: string | null;
}

async function platformRead<T>(path: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const r = await fetch(path, { cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok) {
    if (r) logger.error('platform.read_failed', { path, status: r.status });
    return null;
  }
  return (await r.json().catch(() => null)) as T | null;
}

/**
 * A platform charter in the row shape the screens used when they read the
 * substrate. The columns only the substrate kept (grammar, safeguards,
 * domain counts) were never written by the app and stay null; `id` is the
 * charter id.
 */
export function charterToRow(c: PublicCharter): InstitutionRow {
  const at = c.registered_at ?? c.activated_at ?? '';
  return {
    id: c.charter_id, charter_id: c.charter_id, label: c.label, kind: c.kind as InstitutionKind,
    domain: c.domain, archetype_or_branch: c.archetype_or_branch,
    grammar: null, safeguards_constant: null, expected_domains: null, shipped_domains: null,
    activated: c.activated, activated_at: c.activated_at, registered_at: at,
    meta: { source: 'platform' }, created_at: at, updated_at: at,
  };
}

async function platformCharters(params: Record<string, string | undefined>): Promise<InstitutionRow[]> {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined));
  const r = await platformRead<{ charters: PublicCharter[] }>(`/api/public/charters?${q}`);
  return (r?.charters ?? []).map(charterToRow);
}

/**
 * The register no longer takes writes from here: register and activate
 * institutions through /api/org/ministries. These return the charter as the
 * platform holds it (null when it is not in the register).
 */
export async function registerInstitutionRow(
  i: InstitutionUpsert,
): Promise<InstitutionRow | null> {
  return institutionByCharterId(i.charterId);
}

/** The charter as the platform holds it; activation is the ministry registry's (/api/org/ministries/{id}/activate). */
export async function activateInstitutionRow(charterId: string): Promise<InstitutionRow | null> {
  return institutionByCharterId(charterId);
}

/** The platform's charters, ordered by charter id; same filters as before. Works without the substrate. */
export async function listInstitutionsRows(opts: { kind?: InstitutionKind; activated?: boolean; q?: string } = {}): Promise<InstitutionRow[]> {
  return platformCharters({
    activated: opts.activated === undefined ? 'any' : String(opts.activated),
    kind: opts.kind, q: opts.q,
  });
}

/** One charter from the platform register by its charter id. null if absent. */
export async function institutionByCharterId(charterId: string): Promise<InstitutionRow | null> {
  const rows = await platformCharters({ activated: 'any', charter: charterId });
  return rows[0] ?? null;
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

/** Governance output and its trend, as the platform computes them from its directives register. */
export interface DirectiveFigures {
  stats: DirectiveStat[];
  trend: DirectiveTrendPoint[];
  /** Where they come from (lib/twin/signal.ts): reported, the platform's directives register. */
  source: Pick<Signal, 'kind' | 'source' | 'asOf'> | null;
}

/** Both directive figures in one call (GET /api/public/accountability?only=directives). */
export async function directiveFigures(opts: { charterId?: string; days?: number; weeks?: number } = {}): Promise<DirectiveFigures> {
  const q = new URLSearchParams({ only: 'directives', directive_days: String(opts.days ?? 365), weeks: String(opts.weeks ?? 12) });
  if (opts.charterId) q.set('charter', opts.charterId);
  const r = await platformRead<{ directive_stats: DirectiveStat[]; directive_trend: DirectiveTrendPoint[]; directive_source: DirectiveFigures['source'] }>(`/api/public/accountability?${q}`);
  return { stats: r?.directive_stats ?? [], trend: r?.directive_trend ?? [], source: r?.directive_source ?? null };
}

/** Per-charter directive (governance output) stats over the last `days`,
 *  counting only signed directives so drafts never leak. From the platform's
 *  directives register; works without the substrate. */
export async function directiveStats(opts: { charterId?: string; days?: number } = {}): Promise<DirectiveStat[]> {
  return (await directiveFigures({ charterId: opts.charterId, days: opts.days })).stats;
}

/** Weekly directive trend (signed-week buckets) over the last `weeks`,
 *  oldest first: signed count, how many became effective, median lag days.
 *  From the platform's directives register. */
export async function directiveTrend(opts: { charterId?: string; weeks?: number } = {}): Promise<DirectiveTrendPoint[]> {
  return (await directiveFigures({ charterId: opts.charterId, weeks: opts.weeks })).trend;
}

export { substrateAvailable };
