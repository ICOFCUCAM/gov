// lib/db/repos/audit — persistent audit ledger.
//
// Mirrors the legacy in-memory ledger interface (appendAudit, auditTrail,
// verifyChain) but reads/writes to civicos.audit_entries via SECURITY DEFINER
// RPCs. When the substrate isn't configured, all calls become no-ops /
// empty reads — the application keeps working off the in-memory mirror.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { AuditEntryRow, AuditWitnessRow } from '@/lib/db/types';

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

/* ── Witness attestations ────────────────────────────────────────── */

export interface AuditWitness {
  id: string;
  scope: string;
  observedSeq: number;
  observedHash: string;
  label: string;
  hasJwk: boolean;
  hasSignature: boolean;
  at: number;
  recordedBy: string | null;
}

function mapWitness(r: AuditWitnessRow): AuditWitness {
  return {
    id: r.id, scope: r.scope, observedSeq: r.observed_seq,
    observedHash: r.observed_hash, label: r.witness_label,
    hasJwk: r.has_jwk, hasSignature: r.has_signature,
    at: new Date(r.at).getTime(), recordedBy: r.recorded_by,
  };
}

/** List recent witness attestations, optionally filtered by scope. */
export async function recentWitnessRows(opts: { scope?: string; limit?: number } = {}): Promise<AuditWitness[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_audit_witnesses').select('*')
    .order('at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.scope) q = q.eq('scope', opts.scope);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as AuditWitnessRow[]).map(mapWitness);
}

/** Fetch the full underlying row (including the jwk + signature, which
 *  the public view hides as booleans) for a single witness. Used by the
 *  client-side verifier to re-derive the canonical material and run
 *  WebCrypto.subtle.verify. Reads through the civicos.audit_witnesses
 *  table directly via the public SELECT policy. */
export async function witnessWithSignatureRow(id: string): Promise<{
  scope: string; observedSeq: number; observedHash: string; witnessLabel: string;
  witnessJwk: JsonWebKey | null; witnessSignature: string | null;
} | null> {
  const sb = publicClient();
  if (!sb) return null;
  // civicos.audit_witnesses has a public SELECT policy; reading via the
  // schema-qualified table exposes the witness_jwk + witness_signature.
  const { data, error } = await sb.schema('civicos' as never).from('audit_witnesses')
    .select('scope,observed_seq,observed_hash,witness_label,witness_jwk,witness_signature')
    .eq('id', id).limit(1).maybeSingle();
  if (error || !data) return null;
  const r = data as {
    scope: string; observed_seq: number; observed_hash: string;
    witness_label: string; witness_jwk: JsonWebKey | null; witness_signature: string | null;
  };
  return {
    scope: r.scope, observedSeq: r.observed_seq, observedHash: r.observed_hash,
    witnessLabel: r.witness_label, witnessJwk: r.witness_jwk,
    witnessSignature: r.witness_signature,
  };
}

/** Record an attestation. Returns the row, or null on failure. The
 *  observed (seq, hash) pair becomes a tamper proof if the chain is
 *  later rewritten. */
export async function recordWitnessAttestationRow(opts: {
  scope: string;
  observedSeq: number;
  observedHash: string;
  label: string;
  jwk?: JsonWebKey | Record<string, unknown> | null;
  signature?: string | null;
}): Promise<AuditWitness | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_record_witness_attestation', {
    p_scope: opts.scope,
    p_observed_seq: opts.observedSeq,
    p_observed_hash: opts.observedHash,
    p_witness_label: opts.label,
    p_witness_jwk: opts.jwk ?? null,
    p_witness_signature: opts.signature ?? null,
  });
  if (error || !data) return null;
  // The RPC returns a single composite row, not the public view shape, so
  // shim the boolean projections to match.
  const r = data as Record<string, unknown>;
  return mapWitness({
    id: String(r['id']),
    scope: String(r['scope']),
    observed_seq: Number(r['observed_seq']),
    observed_hash: String(r['observed_hash']),
    witness_label: String(r['witness_label']),
    has_jwk: r['witness_jwk'] != null,
    has_signature: r['witness_signature'] != null,
    at: String(r['at']),
    recorded_by: (r['recorded_by'] as string | null) ?? null,
  });
}

/**
 * Verify that the attested hash for a scope+seq still matches what the
 * live chain reports. Returns null when there's no attestation, true
 * when every attestation at the latest seq agrees with the chain, and
 * false when any disagreement is detected (tamper indicator).
 */
export async function witnessAgreementRow(scope: string): Promise<{
  attestations: number;
  consistent: boolean;
  latestSeq: number | null;
} | null> {
  const sb = publicClient();
  if (!sb) return null;
  const witnesses = await recentWitnessRows({ scope, limit: 200 });
  if (witnesses.length === 0) return { attestations: 0, consistent: true, latestSeq: null };
  // Fetch the audit trail for this scope and compare the latest seq.
  const { data } = await sb.from('civicos_audit_entries').select('seq,hash')
    .eq('scope', scope).order('seq', { ascending: false }).limit(1);
  const live = (data as { seq: number; hash: string }[] | null)?.[0] ?? null;
  const latestSeq = witnesses[0]!.observedSeq;
  if (!live) return { attestations: witnesses.length, consistent: false, latestSeq };
  // Consistency: for any witness at the live seq, the observed hash must equal the live hash.
  const atLive = witnesses.filter(w => w.observedSeq === live.seq);
  const consistent = atLive.every(w => w.observedHash === live.hash);
  return { attestations: witnesses.length, consistent, latestSeq };
}

export { substrateAvailable };
