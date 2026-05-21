// lib/db/repos/memory — institutional memory write paths.
//
// Wraps the directive / dispatch / escalation RPCs. All operations are
// best-effort: callers degrade to memory-only when the substrate isn't
// reachable.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type {
  DirectiveRow, DispatchRow, EscalationRow, Priority, Severity,
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

export async function closeDispatchRow(ref: string): Promise<DispatchRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_close_dispatch', { p_ref: ref });
  if (error) { console.error('[civicos] close_dispatch failed:', error.message); return null; }
  return (data as DispatchRow) ?? null;
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

export { substrateAvailable };
