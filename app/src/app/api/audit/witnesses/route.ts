// /api/audit/witnesses — record a witness attestation of the audit chain
// (go-live review H-1).
//
// A witness (an auditor, civil society, a peer institution) states "I saw
// scope S at seq N with hash H" and signs `S|N|H|label` with its own key.
// The credential is that signature: the key must be registered for the
// label by an administrator (/api/audit/witnesses/keys) and unrevoked, and
// the signature must verify, before the platform records the statement
// through the service role. Nobody else can write attestations (the
// substrate RPC is service-role only), and a statement is never replaced.
//
// POST { scope, observedSeq, observedHash, label, jwk, signature }
//   201 { witness }   recorded
//   400               malformed
//   403               no registered key for the label matches, or the signature does not verify
//   409               this witness already attested that point
//   503               substrate not configured

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';
import { witnessKeyFingerprint, verifyWitnessStatement, SIGNATURE_HEX } from '@/lib/audit/witness-signature';
import { logger } from '@/lib/ops/log';

export const dynamic = 'force-dynamic';

const MAX = 200;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX;

interface KeyRow { id: string; witness_label: string; public_jwk: unknown; revoked_at: string | null }

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const { scope, observedSeq, observedHash, label, jwk, signature } = body;
  if (!text(scope) || !text(observedHash) || !text(label) || typeof observedSeq !== 'number' || !Number.isInteger(observedSeq) || observedSeq < 0) {
    return NextResponse.json({ error: 'expected { scope, observedSeq (integer >= 0), observedHash, label, jwk, signature }' }, { status: 400 });
  }
  if (typeof signature !== 'string' || !SIGNATURE_HEX.test(signature)) {
    return NextResponse.json({ error: 'a signature (128 lowercase hex characters) over scope|seq|hash|label is required' }, { status: 400 });
  }
  const fp = witnessKeyFingerprint(jwk);
  if (!fp) return NextResponse.json({ error: 'jwk must be an EC P-256 or Ed25519 public key' }, { status: 400 });

  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const { data: keys, error: kErr } = await sb.from('civicos_audit_witness_keys')
    .select('id,witness_label,public_jwk,revoked_at').eq('witness_label', label.trim());
  if (kErr) return NextResponse.json({ error: 'could not read the witness keys' }, { status: 502 });
  const key = ((keys ?? []) as KeyRow[]).find(k => !k.revoked_at && witnessKeyFingerprint(k.public_jwk) === fp);
  const statement = { scope: scope.trim(), observedSeq, observedHash: observedHash.trim(), witnessLabel: label.trim() };
  if (!key || !verifyWitnessStatement(key.public_jwk, statement, signature)) {
    logger.warn('audit.witness_refused', { label: statement.witnessLabel, scope: statement.scope, registered: !!key });
    return NextResponse.json({ error: 'not recorded: the key is not registered for this witness, or the signature does not verify' }, { status: 403 });
  }

  const { data, error } = await sb.rpc('civicos_record_witness_attestation', {
    p_scope: statement.scope,
    p_observed_seq: statement.observedSeq,
    p_observed_hash: statement.observedHash,
    p_witness_label: statement.witnessLabel,
    p_witness_jwk: key.public_jwk as never,
    p_witness_signature: signature,
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'this witness already attested that point; attestations are never replaced' }, { status: 409 });
    }
    logger.warn('audit.witness_record_failed', { label: statement.witnessLabel, code: (error as { code?: string }).code });
    return NextResponse.json({ error: 'not recorded' }, { status: 502 });
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    witness: {
      id: r['id'], scope: r['scope'], observedSeq: r['observed_seq'], observedHash: r['observed_hash'],
      label: r['witness_label'], hasJwk: true, hasSignature: true, registeredKey: true,
      at: r['at'] ? Date.parse(String(r['at'])) : Date.now(), recordedBy: r['recorded_by'] ?? null,
    },
  }, { status: 201 });
}
