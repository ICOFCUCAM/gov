// lib/db/repos/work-items — persistent workflow runtime.
//
// Three RPC contracts:
//   • syncWorkflowDefinitionRow  — register/update a workflow's transition map
//   • openWorkItemRow            — open a work item in its initial stage
//   • transitionWorkItemRow      — apply an action; server validates against
//                                  the stored definition and raises on
//                                  invalid transitions / closed items.
//
// All RPCs are SECURITY DEFINER on the DB side. When the substrate isn't
// configured, calls return null and callers fall back to memory state.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type {
  WorkflowDefinitionRow, WorkItemRow, WorkItemStepRow,
  WorkKind, Priority, ActionKey,
} from '@/lib/db/types';

export interface WorkflowDefinitionInput {
  workflowId: string;
  institutionCharterId: string;
  archetype?: string | null;
  title: string;
  kind: WorkKind;
  /** { terminal: string[], transitions: { [stage]: { [action]: nextStage } } } */
  definition: { terminal: string[]; transitions: Record<string, Partial<Record<ActionKey, string>>> };
  description?: string | null;
  blueprintCitation?: string | null;
  stepCount?: number | null;
  emits?: string[];
}

export async function syncWorkflowDefinitionRow(d: WorkflowDefinitionInput): Promise<WorkflowDefinitionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_sync_workflow_definition', {
    p_workflow_id: d.workflowId,
    p_institution_charter_id: d.institutionCharterId,
    p_archetype: d.archetype ?? null,
    p_title: d.title,
    p_kind: d.kind,
    p_definition: d.definition,
    p_description: d.description ?? null,
    p_blueprint_citation: d.blueprintCitation ?? null,
    p_step_count: d.stepCount ?? null,
    p_emits: d.emits ?? [],
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] sync_workflow_definition failed:', error.message, error.code);
    return null;
  }
  return (data as WorkflowDefinitionRow) ?? null;
}

export interface OpenWorkItemInput {
  ref: string;
  scope: string;
  workflowId: string;
  kind: WorkKind;
  title: string;
  currentStage: string;
  priority?: Priority;
  originatingCharterId?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  citizenId?: string | null;
  meta?: Record<string, unknown>;
}

export async function openWorkItemRow(i: OpenWorkItemInput): Promise<WorkItemRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_open_work_item', {
    p_ref: i.ref,
    p_scope: i.scope,
    p_workflow_id: i.workflowId,
    p_kind: i.kind,
    p_title: i.title,
    p_current_stage: i.currentStage,
    p_priority: i.priority ?? 'routine',
    p_originating_charter_id: i.originatingCharterId ?? null,
    p_assignee_id: i.assigneeId ?? null,
    p_assignee_name: i.assigneeName ?? null,
    p_citizen_id: i.citizenId ?? null,
    p_meta: i.meta ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] open_work_item failed:', error.message, error.code);
    return null;
  }
  return (data as WorkItemRow) ?? null;
}

export interface TransitionInput {
  ref: string;
  action: ActionKey;
  actorName: string;
  actorId?: string | null;
  actorRole?: string | null;
  detail?: string;
  auditTag?: string | null;
  requiresSignature?: boolean;
  signatureHash?: string | null;
  /** Client-supplied signed_at — the same ms the signature material used.
   *  When present, the substrate stores this verbatim so verification
   *  re-derives the canonical material byte-for-byte. */
  signedAt?: string | null;
}

export interface TransitionOutcome {
  step: WorkItemStepRow;
  ok: true;
}
export interface TransitionRejection {
  ok: false;
  /** 'closed' | 'invalid_transition' | 'not_found' | 'missing_signature' | 'other' */
  reason: 'closed' | 'invalid_transition' | 'not_found' | 'missing_signature' | 'other';
  message: string;
}

export async function transitionWorkItemRow(t: TransitionInput): Promise<TransitionOutcome | TransitionRejection | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_transition_work_item', {
    p_ref: t.ref,
    p_action: t.action,
    p_actor_name: t.actorName,
    p_actor_id: t.actorId ?? null,
    p_actor_role: t.actorRole ?? null,
    p_detail: t.detail ?? '',
    p_audit_tag: t.auditTag ?? null,
    p_requires_signature: t.requiresSignature ?? false,
    p_signature_hash: t.signatureHash ?? null,
    p_signed_at: t.signedAt ?? null,
  });
  if (error) {
    const msg = error.message ?? '';
    let reason: TransitionRejection['reason'] = 'other';
    if (msg.includes('not found')) reason = 'not_found';
    else if (msg.includes('is closed')) reason = 'closed';
    else if (msg.includes('invalid transition')) reason = 'invalid_transition';
    else if (msg.includes('requires signature')) reason = 'missing_signature';
    return { ok: false, reason, message: msg };
  }
  if (!data) return null;
  return { ok: true, step: data as WorkItemStepRow };
}

export async function workItemRow(ref: string): Promise<WorkItemRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_work_items').select('*').eq('ref', ref).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as WorkItemRow;
}

export async function workItemStepsRows(ref: string, limit = 50): Promise<WorkItemStepRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const item = await workItemRow(ref);
  if (!item) return [];
  const { data, error } = await sb.from('civicos_work_item_steps').select('*')
    .eq('work_item_id', item.id).order('seq').limit(limit);
  if (error || !data) return [];
  return data as WorkItemStepRow[];
}

export async function listWorkflowDefinitionsRows(opts: { kind?: WorkKind; institution?: string; limit?: number } = {}): Promise<WorkflowDefinitionRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_workflow_definitions').select('*');
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.institution) q = q.eq('institution_charter_id', opts.institution);
  const { data, error } = await q.order('workflow_id').limit(opts.limit ?? 100);
  if (error || !data) return [];
  return data as WorkflowDefinitionRow[];
}

export interface SignedStepRow extends WorkItemStepRow {
  work_item_ref: string;
  work_item_scope: string;
  workflow_id: string;
  kind: WorkKind;
  originating_charter_id: string | null;
}

/** Joined step rows with parent work-item context. Returned from
 *  civicos_actor_steps (all steps, joined) — pair with the more
 *  selective civicos_signed_steps when only signed actions are needed. */
export type ActorStepRow = SignedStepRow & {
  work_item_title: string;
};

export async function recentActorStepsRows(opts: { charter?: string; kind?: WorkKind; signedOnly?: boolean; limit?: number } = {}): Promise<ActorStepRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_actor_steps').select('*');
  if (opts.charter) q = q.eq('originating_charter_id', opts.charter);
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.signedOnly) q = q.not('signature_hash', 'is', null);
  const { data, error } = await q.order('at', { ascending: false }).limit(opts.limit ?? 100);
  if (error || !data) return [];
  return data as ActorStepRow[];
}

export async function myRecentStepsRows(actorId: string, limit = 30): Promise<ActorStepRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_actor_steps').select('*')
    .eq('actor_id', actorId).order('at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as ActorStepRow[];
}

export async function recentSignedStepsRows(limit = 50): Promise<SignedStepRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_signed_steps').select('*')
    .order('at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as SignedStepRow[];
}

export async function fetchOfficerPublicKey(officerId: string): Promise<JsonWebKey | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_officers')
    .select('signing_public_key').eq('id', officerId).limit(1).maybeSingle();
  if (error || !data) return null;
  const row = data as { signing_public_key: JsonWebKey | null };
  return row.signing_public_key ?? null;
}

export async function workItemsByIds(ids: string[]): Promise<WorkItemRow[]> {
  const sb = publicClient();
  if (!sb || ids.length === 0) return [];
  const { data, error } = await sb.from('civicos_work_items').select('*').in('id', ids);
  if (error || !data) return [];
  return data as WorkItemRow[];
}

export async function listWorkItemsRows(opts: { scope?: string; workflowId?: string; closed?: boolean; limit?: number } = {}): Promise<WorkItemRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_work_items').select('*');
  if (opts.scope) q = q.eq('scope', opts.scope);
  if (opts.workflowId) q = q.eq('workflow_id', opts.workflowId);
  if (opts.closed !== undefined) q = q.eq('closed', opts.closed);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 100);
  if (error || !data) return [];
  return data as WorkItemRow[];
}

export interface WorkItemFlowStat {
  workflowId: string;
  opened: number;
  closed: number;
  open: number;
  medianCycleHours: number | null;
  p90CycleHours: number | null;
  oldestOpenHours: number | null;
}

interface WorkItemFlowStatRow {
  workflow_id: string; opened: number; closed: number; open: number;
  median_cycle_hours: string | number | null; p90_cycle_hours: string | number | null;
  oldest_open_hours: string | number | null;
}

/** Per-workflow throughput: opened/closed/open counts, median + p90 cycle
 *  time (hours), oldest open age, over a window. Backlog-heaviest first.
 *  Authenticated-tier. [] without a substrate. */
export async function workItemFlowStats(opts: { workflowId?: string; charterId?: string; days?: number } = {}): Promise<WorkItemFlowStat[]> {
  const sb = publicClient();
  if (!sb) return [];
  const num = (v: string | number | null): number | null => v === null || v === undefined ? null : Number(v);
  const { data, error } = await sb.rpc('civicos_work_item_flow_stats', {
    p_workflow_id: opts.workflowId ?? null, p_charter_id: opts.charterId ?? null, p_days: opts.days ?? 30,
  });
  if (error || !data) return [];
  return (data as WorkItemFlowStatRow[]).map(r => ({
    workflowId: r.workflow_id, opened: Number(r.opened), closed: Number(r.closed), open: Number(r.open),
    medianCycleHours: num(r.median_cycle_hours), p90CycleHours: num(r.p90_cycle_hours),
    oldestOpenHours: num(r.oldest_open_hours),
  }));
}

export interface WorkItemStageBucket {
  stage: string;
  openItems: number;
  oldestHours: number | null;
  medianAgeHours: number | null;
}

interface WorkItemStageBucketRow {
  stage: string; open_items: number; oldest_hours: string | number | null;
  median_age_hours: string | number | null;
}

/** Open work items for one workflow grouped by current_stage (WIP per
 *  stage, with oldest + median age), busiest stage first — reveals the
 *  bottleneck. Authenticated-tier. [] without a substrate. */
export async function workItemStageDistribution(workflowId: string): Promise<WorkItemStageBucket[]> {
  const sb = publicClient();
  if (!sb) return [];
  const num = (v: string | number | null): number | null => v === null || v === undefined ? null : Number(v);
  const { data, error } = await sb.rpc('civicos_work_item_stage_distribution', { p_workflow_id: workflowId });
  if (error || !data) return [];
  return (data as WorkItemStageBucketRow[]).map(r => ({
    stage: r.stage, openItems: Number(r.open_items),
    oldestHours: num(r.oldest_hours), medianAgeHours: num(r.median_age_hours),
  }));
}

export { substrateAvailable };
