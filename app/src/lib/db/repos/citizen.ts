// lib/db/repos/citizen — citizen-side write paths.
//
// Wraps: register_citizen, submit/update_service_request,
//        grant/revoke_consent, file/decide_appeal.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { CitizenRow, ServiceRequestRow, ConsentRow, AppealRow } from '@/lib/db/types';

// ── Citizens ──────────────────────────────────────────────────────

export interface CitizenInput {
  nationalId?: string | null;
  displayName?: string | null;
  region?: string | null;
  authUserId?: string | null;
  meta?: Record<string, unknown>;
}

export async function registerCitizenRow(c: CitizenInput): Promise<CitizenRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_register_citizen', {
    p_national_id: c.nationalId ?? null,
    p_display_name: c.displayName ?? null,
    p_region: c.region ?? null,
    p_auth_user_id: c.authUserId ?? null,
    p_meta: c.meta ?? {},
  });
  if (error) { console.error('[civicos] register_citizen failed:', error.message); return null; }
  return (data as CitizenRow) ?? null;
}

// ── Service requests ─────────────────────────────────────────────

export interface ServiceRequestInput {
  ref: string;
  citizenId: string;
  targetCharterId: string;
  service: string;
  domain?: string | null;
  title?: string | null;
  payload?: Record<string, unknown>;
  linkedWorkItemId?: string | null;
}

export async function submitServiceRequestRow(r: ServiceRequestInput): Promise<ServiceRequestRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_submit_service_request', {
    p_ref: r.ref, p_citizen_id: r.citizenId, p_target_charter_id: r.targetCharterId,
    p_service: r.service, p_domain: r.domain ?? null, p_title: r.title ?? null,
    p_payload: r.payload ?? {}, p_linked_work_item_id: r.linkedWorkItemId ?? null,
  });
  if (error) { console.error('[civicos] submit_service_request failed:', error.message); return null; }
  return (data as ServiceRequestRow) ?? null;
}

export interface ServiceRequestUpdate {
  ref: string;
  status?: 'submitted' | 'acknowledged' | 'in-progress' | 'resolved' | 'rejected';
  satisfaction?: number | null;
  payloadPatch?: Record<string, unknown>;
  linkedWorkItemId?: string | null;
}

export async function updateServiceRequestRow(u: ServiceRequestUpdate): Promise<ServiceRequestRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_update_service_request', {
    p_ref: u.ref, p_status: u.status ?? null,
    p_satisfaction: u.satisfaction ?? null,
    p_payload_patch: u.payloadPatch ?? null,
    p_linked_work_item_id: u.linkedWorkItemId ?? null,
  });
  if (error) { console.error('[civicos] update_service_request failed:', error.message); return null; }
  return (data as ServiceRequestRow) ?? null;
}

// ── Consents ──────────────────────────────────────────────────────

export async function grantConsentRow(
  citizenId: string, targetCharterId: string, scope: string,
  expiresAt?: string | null, payload?: Record<string, unknown>,
): Promise<ConsentRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_grant_consent', {
    p_citizen_id: citizenId, p_target_charter_id: targetCharterId,
    p_scope: scope, p_expires_at: expiresAt ?? null,
    p_payload: payload ?? {},
  });
  if (error) { console.error('[civicos] grant_consent failed:', error.message); return null; }
  return (data as ConsentRow) ?? null;
}

export async function revokeConsentRow(consentId: string): Promise<ConsentRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_revoke_consent', { p_consent_id: consentId });
  if (error) { console.error('[civicos] revoke_consent failed:', error.message); return null; }
  return (data as ConsentRow) ?? null;
}

// ── Appeals ───────────────────────────────────────────────────────

export interface AppealInput {
  ref: string;
  citizenId: string;
  originatingCharterId: string;
  ground: string;
  originatingDecisionRef?: string | null;
  linkedWorkItemId?: string | null;
}

export async function fileAppealRow(a: AppealInput): Promise<AppealRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_file_appeal', {
    p_ref: a.ref, p_citizen_id: a.citizenId,
    p_originating_charter_id: a.originatingCharterId,
    p_ground: a.ground,
    p_originating_decision_ref: a.originatingDecisionRef ?? null,
    p_linked_work_item_id: a.linkedWorkItemId ?? null,
  });
  if (error) { console.error('[civicos] file_appeal failed:', error.message); return null; }
  return (data as AppealRow) ?? null;
}

export async function decideAppealRow(
  ref: string, decision: string, reasoning?: string | null, publish = true,
): Promise<AppealRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_decide_appeal', {
    p_ref: ref, p_decision: decision,
    p_reasoning: reasoning ?? null, p_publish: publish,
  });
  if (error) { console.error('[civicos] decide_appeal failed:', error.message); return null; }
  return (data as AppealRow) ?? null;
}

// ── Read helpers (RLS scopes to citizen_id = my id) ─────────────

export async function myServiceRequestsRows(limit = 50): Promise<ServiceRequestRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_service_requests').select('*')
    .order('submitted_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as ServiceRequestRow[];
}

export async function myConsentsRows(limit = 50): Promise<ConsentRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_consents').select('*')
    .order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as ConsentRow[];
}

export async function myAppealsRows(limit = 50): Promise<AppealRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.from('civicos_appeals').select('*')
    .order('filed_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data as AppealRow[];
}

// ── Officer-side reads (filtered by target charter) ───────────────

export async function listServiceRequestsRows(opts: { target?: string; openOnly?: boolean; limit?: number } = {}): Promise<ServiceRequestRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_service_requests').select('*');
  if (opts.target) q = q.eq('target_charter_id', opts.target);
  if (opts.openOnly) q = q.is('resolved_at', null);
  const { data, error } = await q.order('submitted_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as ServiceRequestRow[];
}

export async function serviceRequestByRef(ref: string): Promise<ServiceRequestRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_service_requests').select('*')
    .eq('ref', ref).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as ServiceRequestRow;
}

export async function consentById(id: string): Promise<ConsentRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_consents').select('*')
    .eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as ConsentRow;
}

export async function appealByRef(ref: string): Promise<AppealRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.from('civicos_appeals').select('*')
    .eq('ref', ref).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as AppealRow;
}

export async function listAppealsRows(opts: { originating?: string; openOnly?: boolean; limit?: number } = {}): Promise<AppealRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_appeals').select('*');
  if (opts.originating) q = q.eq('originating_charter_id', opts.originating);
  if (opts.openOnly) q = q.is('decided_at', null);
  const { data, error } = await q.order('filed_at', { ascending: false }).limit(opts.limit ?? 50);
  if (error || !data) return [];
  return data as AppealRow[];
}

/* ── Receipt timeline ──────────────────────────────────────────── */

export interface ReceiptEvent {
  at: string;
  kind: 'service-request' | 'consent' | 'appeal' | 'work-item-step';
  ref: string;
  charter: string;
  status: string;
  detail: string;
}

/** Citizen's "show me what you have on me" unified timeline.
 *  Joins service_requests / consents / appeals / linked work-item steps
 *  for the signed-in citizen via the substrate's auth.uid() scope.
 *  Returns [] when there's no auth session or no citizen profile. */
export async function myReceiptTimelineRows(limit = 200): Promise<ReceiptEvent[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('civicos_my_receipt_timeline', { p_limit: limit });
  if (error || !data) return [];
  return data as ReceiptEvent[];
}

/* ── Data portability (right to take your data) ────────────────── */

export interface CitizenDataExport {
  document: string;
  version: number;
  generated_at: string;
  citizen: Record<string, unknown> | null;
  service_requests: unknown[];
  consents: unknown[];
  appeals: unknown[];
  receipt_timeline: unknown[];
  counts: { service_requests: number; consents: number; appeals: number };
}

/** A signed-in citizen's full self-describing data-portability document
 *  (profile + every owned service request, consent, appeal, plus the
 *  receipt timeline), scoped to the caller by the substrate's auth.uid().
 *  Returns null when there is no substrate / session. */
export async function myDataExport(): Promise<CitizenDataExport | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_my_data_export');
  if (error || !data) return null;
  return data as CitizenDataExport;
}

/** Append a tamper-evident audit entry recording that the citizen
 *  exercised their data-portability right. Best-effort; returns the audit
 *  entry id, or null when there's no substrate / linked citizen. */
export async function logMyDataExport(): Promise<string | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_log_my_data_export');
  if (error || !data) return null;
  return data as string;
}

export { substrateAvailable };
