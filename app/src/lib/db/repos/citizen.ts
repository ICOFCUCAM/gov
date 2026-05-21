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

export { substrateAvailable };
