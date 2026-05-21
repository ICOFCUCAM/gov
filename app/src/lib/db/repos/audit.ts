// lib/db/repos/audit — persistent audit ledger.
//
// Mirrors the legacy in-memory ledger interface (appendAudit, auditTrail,
// verifyChain) but reads/writes to civicos.audit_entries via SECURITY DEFINER
// RPCs. When the substrate isn't configured, all calls become no-ops /
// empty reads — the application keeps working off the in-memory mirror.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { AuditEntryRow } from '@/lib/db/types';

export interface AuditEntry {
  seq: number;
  at: number;
  scope: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  prevHash: string;
  hash: string;
}

function fromRow(r: AuditEntryRow): AuditEntry {
  return {
    seq: r.seq,
    at: r.at_ms,
    scope: r.scope,
    actor: r.actor,
    action: r.action,
    subject: r.subject,
    detail: r.detail,
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

export async function appendAuditRow(
  scope: string, actor: string, action: string, subject: string, detail = ''
): Promise<AuditEntry | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_append_audit', {
    p_scope: scope, p_actor: actor, p_action: action,
    p_subject: subject, p_detail: detail,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] append_audit RPC failed:', error.message, error.code, error.details, error.hint);
    return null;
  }
  if (!data) return null;
  return fromRow(data as AuditEntryRow);
}

export async function auditTrailRows(scope: string, limit = 50): Promise<AuditEntry[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('civicos_audit_entries').select('*')
    .eq('scope', scope).order('seq', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as AuditEntryRow[]).map(fromRow);
}

export async function recentAuditEntriesRows(limit = 100): Promise<AuditEntry[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('civicos_audit_entries').select('*')
    .order('at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as AuditEntryRow[]).map(fromRow);
}

export async function distinctAuditScopesRows(limit = 30): Promise<string[]> {
  const sb = publicClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('civicos_audit_entries').select('scope')
    .order('at', { ascending: false }).limit(limit * 10);
  if (error || !data) return [];
  return Array.from(new Set((data as { scope: string }[]).map(r => r.scope))).slice(0, limit);
}

export async function verifyChainRow(scope: string): Promise<{ scope: string; entries: number; intact: boolean; brokenAt: number | null } | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_verify_audit_chain', { p_scope: scope });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { entries: number; intact: boolean; broken_at: number | null };
  return { scope, entries: row.entries, intact: row.intact, brokenAt: row.broken_at };
}

export { substrateAvailable };
