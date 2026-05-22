// lib/db/repos/memory — institutional memory write paths.
//
// Wraps the directive / dispatch / escalation RPCs. All operations are
// best-effort: callers degrade to memory-only when the substrate isn't
// reachable.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type {
  DirectiveRow, DispatchRow, EscalationRow, PostureHistoryRow, Posture, Priority, Severity,
} from '@/lib/db/types';

// ── Directives ────────────────────────────────────────────────────

export interface DirectiveInput {
  ref: string;
  kind: string;
  issuedByCharterId: string;
  title: string;
  citation?: string | null;
  targets?: string[];
  payload?: Record<string, unknown>;
  issuedByName?: string | null;
  status?: 'drafting' | 'signed' | 'effective' | 'rescinded' | 'published';
}

export async function recordDirectiveRow(d: DirectiveInput): Promise<DirectiveRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_directive', {
    p_ref: d.ref, p_kind: d.kind,
    p_issued_by_charter_id: d.issuedByCharterId,
    p_title: d.title, p_citation: d.citation ?? null,
    p_targets: d.targets ?? [], p_payload: d.payload ?? {},
    p_issued_by_name: d.issuedByName ?? null,
    p_status: d.status ?? 'drafting',
  });
  if (error) { console.error('[civicos] record_directive failed:', error.message); return null; }
  return (data as DirectiveRow) ?? null;
}

export async function signDirectiveRow(ref: string, signedByOfficerId?: string | null, effectiveAt?: string | null): Promise<DirectiveRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_sign_directive', {
    p_ref: ref, p_signed_by_officer_id: signedByOfficerId ?? null,
    p_effective_at: effectiveAt ?? null,
  });
  if (error) { console.error('[civicos] sign_directive failed:', error.message); return null; }
  return (data as DirectiveRow) ?? null;
}

export async function rescindDirectiveRow(ref: string): Promise<DirectiveRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_rescind_directive', { p_ref: ref });
  if (error) { console.error('[civicos] rescind_directive failed:', error.message); return null; }
  return (data as DirectiveRow) ?? null;
}

export async function directiveByRef(ref: string): Promise<DirectiveRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_directives').select('*')
    .eq('ref', ref).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as DirectiveRow;
}

export async function escalationById(id: string): Promise<EscalationRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_escalations').select('*')
    .eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as EscalationRow;
}

export async function dispatchByRef(ref: string): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_dispatches').select('*')
    .eq('ref', ref).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as DispatchRow;
}

export async function listDirectivesRows(opts: { status?: string; issuer?: string; limit?: number } = {}): Promise<DirectiveRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_directives').select('*');
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.issuer) q = q.eq('issued_by_charter_id', opts.issuer);
  const { data, error } = await q.order('updated_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as DirectiveRow[];
}

// ── Dispatches ────────────────────────────────────────────────────

export interface DispatchInput {
  ref: string;
  issuedByCharterId: string;
  kind: string;
  priority?: Priority;
  detail?: string | null;
  payload?: Record<string, unknown>;
  targetFacilityId?: string | null;
  targetCharterId?: string | null;
  issuedByOfficerId?: string | null;
}

export async function recordDispatchRow(d: DispatchInput): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_dispatch', {
    p_ref: d.ref, p_issued_by_charter_id: d.issuedByCharterId, p_kind: d.kind,
    p_priority: d.priority ?? 'priority', p_detail: d.detail ?? null,
    p_payload: d.payload ?? {},
    p_target_facility_id: d.targetFacilityId ?? null,
    p_target_charter_id: d.targetCharterId ?? null,
    p_issued_by_officer_id: d.issuedByOfficerId ?? null,
  });
  if (error) { console.error('[civicos] record_dispatch failed:', error.message); return null; }
  return (data as DispatchRow) ?? null;
}

export async function acknowledgeDispatchRow(ref: string): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_acknowledge_dispatch', { p_ref: ref });
  if (error) { console.error('[civicos] acknowledge_dispatch failed:', error.message); return null; }
  return (data as DispatchRow) ?? null;
}

/** Mark a dispatch on-scene (sets on_scene_at; backfills acknowledged_at).
 *  Authenticated-tier. null on failure / no substrate. */
export async function markDispatchOnSceneRow(ref: string): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_mark_dispatch_on_scene', { p_ref: ref });
  if (error || !data) { if (error) console.error('[civicos] mark_dispatch_on_scene failed:', error.message); return null; }
  return (Array.isArray(data) ? data[0] : data) as DispatchRow;
}

export async function closeDispatchRow(ref: string): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_close_dispatch', { p_ref: ref });
  if (error) { console.error('[civicos] close_dispatch failed:', error.message); return null; }
  return (data as DispatchRow) ?? null;
}

export async function listDispatchesRows(opts: { status?: string; issuer?: string; limit?: number } = {}): Promise<DispatchRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_dispatches').select('*');
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.issuer) q = q.eq('issued_by_charter_id', opts.issuer);
  const { data, error } = await q.order('dispatched_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as DispatchRow[];
}

export interface DispatchResponseStat {
  charterId: string;
  total: number;
  acknowledged: number;
  onScene: number;
  closed: number;
  open: number;
  medianAckMinutes: number | null;
  medianOnSceneMinutes: number | null;
  medianCloseHours: number | null;
  oldestOpenHours: number | null;
}

interface DispatchResponseStatRow {
  charter_id: string; total: number; acknowledged: number; on_scene: number; closed: number; open: number;
  median_ack_minutes: string | number | null; median_on_scene_minutes: string | number | null;
  median_close_hours: string | number | null; oldest_open_hours: string | number | null;
}

/** Per-issuing-charter dispatch response stats (ack/on-scene/close medians,
 *  open backlog) over the last `days`. Authenticated-tier. [] without a
 *  substrate. */
export async function dispatchResponseStats(opts: { charterId?: string; days?: number } = {}): Promise<DispatchResponseStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_dispatch_response_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 30,
  });
  if (error || !data) return [];
  return (data as DispatchResponseStatRow[]).map(r => ({
    charterId: r.charter_id,
    total: Number(r.total), acknowledged: Number(r.acknowledged),
    onScene: Number(r.on_scene), closed: Number(r.closed), open: Number(r.open),
    medianAckMinutes: numOrNull(r.median_ack_minutes),
    medianOnSceneMinutes: numOrNull(r.median_on_scene_minutes),
    medianCloseHours: numOrNull(r.median_close_hours),
    oldestOpenHours: numOrNull(r.oldest_open_hours),
  }));
}

// ── Escalations ───────────────────────────────────────────────────

export interface EscalationInput {
  sourceCharterId: string;
  severity: Severity;
  reason: string;
  targetCharterId?: string | null;
  linkedWorkItemId?: string | null;
  linkedDispatchId?: string | null;
  triggeredByActor?: string | null;
  payload?: Record<string, unknown>;
}

export async function recordEscalationRow(e: EscalationInput): Promise<EscalationRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_escalation', {
    p_source_charter_id: e.sourceCharterId,
    p_severity: e.severity, p_reason: e.reason,
    p_target_charter_id: e.targetCharterId ?? null,
    p_linked_work_item_id: e.linkedWorkItemId ?? null,
    p_linked_dispatch_id: e.linkedDispatchId ?? null,
    p_triggered_by_actor: e.triggeredByActor ?? null,
    p_payload: e.payload ?? {},
  });
  if (error) { console.error('[civicos] record_escalation failed:', error.message); return null; }
  return (data as EscalationRow) ?? null;
}

export async function acknowledgeEscalationRow(id: string, acknowledgedBy?: string | null): Promise<EscalationRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_acknowledge_escalation', {
    p_id: id, p_acknowledged_by: acknowledgedBy ?? null,
  });
  if (error) { console.error('[civicos] acknowledge_escalation failed:', error.message); return null; }
  return (data as EscalationRow) ?? null;
}

/** Link an escalation to the dispatch and/or work item raised in response
 *  (by ref). Officer-gated, audit-logged. Returns true on success. */
export async function linkEscalationResponseRow(
  escalationId: string, opts: { dispatchRef?: string | null; workItemRef?: string | null },
): Promise<boolean> {
  const sb = publicClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc('civicos_link_escalation_response', {
    p_escalation_id: escalationId,
    p_dispatch_ref: opts.dispatchRef ?? null,
    p_work_item_ref: opts.workItemRef ?? null,
  });
  return !error && data === true;
}

export async function resolveEscalationRow(id: string): Promise<EscalationRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_resolve_escalation', { p_id: id });
  if (error) { console.error('[civicos] resolve_escalation failed:', error.message); return null; }
  return (data as EscalationRow) ?? null;
}

export async function listEscalationsRows(opts: { severity?: string; source?: string; openOnly?: boolean; limit?: number } = {}): Promise<EscalationRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_escalations').select('*');
  if (opts.severity) q = q.eq('severity', opts.severity);
  if (opts.source) q = q.eq('source_charter_id', opts.source);
  if (opts.openOnly) q = q.is('resolved_at', null);
  const { data, error } = await q.order('triggered_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as EscalationRow[];
}

/** Escalations linked to a given work item (the reverse of
 *  link_escalation_response). [] without a substrate. */
export async function escalationsForWorkItemRow(workItemId: string): Promise<EscalationRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_escalations').select('*')
    .eq('linked_work_item_id', workItemId).order('triggered_at', { ascending: false }).limit(20);
  if (error || !data) return [];
  return data as EscalationRow[];
}

/** Escalations linked to a given dispatch. [] without a substrate. */
export async function escalationsForDispatchRow(dispatchId: string): Promise<EscalationRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_escalations').select('*')
    .eq('linked_dispatch_id', dispatchId).order('triggered_at', { ascending: false }).limit(20);
  if (error || !data) return [];
  return data as EscalationRow[];
}

export interface EscalationResponseStat {
  charterId: string;
  total: number;
  acknowledged: number;
  resolved: number;
  open: number;
  medianAckMinutes: number | null;
  p90AckMinutes: number | null;
  medianResolveHours: number | null;
  p90ResolveHours: number | null;
  oldestOpenHours: number | null;
}

interface EscalationResponseStatRow {
  charter_id: string; total: number; acknowledged: number; resolved: number; open: number;
  median_ack_minutes: string | number | null; p90_ack_minutes: string | number | null;
  median_resolve_hours: string | number | null; p90_resolve_hours: string | number | null;
  oldest_open_hours: string | number | null;
}

const numOrNull = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Per-charter escalation response stats (MTTA minutes, MTTR hours, open
 *  backlog) over the last `days`. Authenticated-tier. [] without a
 *  substrate. */
export async function escalationResponseStats(opts: { charterId?: string; days?: number } = {}): Promise<EscalationResponseStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_escalation_response_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 30,
  });
  if (error || !data) return [];
  return (data as EscalationResponseStatRow[]).map(r => ({
    charterId: r.charter_id,
    total: Number(r.total), acknowledged: Number(r.acknowledged),
    resolved: Number(r.resolved), open: Number(r.open),
    medianAckMinutes: numOrNull(r.median_ack_minutes),
    p90AckMinutes: numOrNull(r.p90_ack_minutes),
    medianResolveHours: numOrNull(r.median_resolve_hours),
    p90ResolveHours: numOrNull(r.p90_resolve_hours),
    oldestOpenHours: numOrNull(r.oldest_open_hours),
  }));
}

export interface EscalationResponseTrendPoint {
  weekStart: string;
  resolved: number;
  medianAckMinutes: number | null;
  medianResolveHours: number | null;
}

interface EscalationResponseTrendRow {
  week_start: string; resolved: number;
  median_ack_minutes: string | number | null; median_resolve_hours: string | number | null;
}

/** Weekly escalation response-time trend (resolved-week buckets) over the
 *  last `weeks`, oldest first: median MTTA minutes + MTTR hours.
 *  Authenticated-tier. [] without a substrate. */
export async function escalationResponseTrend(opts: { charterId?: string; weeks?: number } = {}): Promise<EscalationResponseTrendPoint[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_escalation_response_trend', {
    p_charter_id: opts.charterId ?? null, p_weeks: opts.weeks ?? 12,
  });
  if (error || !data) return [];
  return (data as EscalationResponseTrendRow[]).map(r => ({
    weekStart: r.week_start,
    resolved: Number(r.resolved),
    medianAckMinutes: numOrNull(r.median_ack_minutes),
    medianResolveHours: numOrNull(r.median_resolve_hours),
  }));
}

// ── Posture ───────────────────────────────────────────────────────

export interface PostureInput {
  charterId: string;
  posture: Posture;
  readiness?: number | null;
  stress?: number | null;
  detail?: Record<string, unknown>;
}

export async function recordPostureRow(p: PostureInput): Promise<PostureHistoryRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_posture', {
    p_charter_id: p.charterId,
    p_posture: p.posture,
    p_readiness: p.readiness ?? null,
    p_stress: p.stress ?? null,
    p_detail: p.detail ?? {},
  });
  if (error) { console.error('[civicos] record_posture failed:', error.message); return null; }
  return (data as PostureHistoryRow) ?? null;
}

export async function listPostureHistoryRows(opts: { charter?: string; limit?: number } = {}): Promise<PostureHistoryRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_posture_history').select('*');
  if (opts.charter) q = q.eq('charter_id', opts.charter);
  const { data, error } = await q.order('snapshot_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as PostureHistoryRow[];
}

export interface PostureStat {
  charterId: string;
  snapshots: number;
  latestPosture: string;
  latestReadiness: number | null;
  latestStress: number | null;
  latestAt: string;
  avgReadiness: number | null;
  avgStress: number | null;
  maxStress: number | null;
  minReadiness: number | null;
}

interface PostureStatRow {
  charter_id: string; snapshots: number; latest_posture: string;
  latest_readiness: number | null; latest_stress: number | null; latest_at: string;
  avg_readiness: string | number | null; avg_stress: string | number | null;
  max_stress: number | null; min_readiness: number | null;
}

/** Per-charter posture summary (latest + avg/extreme readiness & stress)
 *  over the last `days`, most-stressed first. Authenticated-tier. [] without
 *  a substrate. */
export async function postureStats(opts: { charterId?: string; days?: number } = {}): Promise<PostureStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_posture_stats', {
    p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 30,
  });
  if (error || !data) return [];
  return (data as PostureStatRow[]).map(r => ({
    charterId: r.charter_id, snapshots: Number(r.snapshots), latestPosture: r.latest_posture,
    latestReadiness: r.latest_readiness, latestStress: r.latest_stress, latestAt: r.latest_at,
    avgReadiness: numOrNull(r.avg_readiness), avgStress: numOrNull(r.avg_stress),
    maxStress: r.max_stress, minReadiness: r.min_readiness,
  }));
}

export { substrateAvailable };
