// Tamper-detection watchdog. Runs after witness-sweep on the same
// cadence (or slower) and looks for any audit scope where a recorded
// attestation disagrees with the live chain. Each divergence becomes:
//   1. A `civicos.escalations` row at severity 'major', source
//      'substrate', reason 'witness-divergence:<scope>'.
//   2. A `civicos.federation_events` entry on channel 'constitutional',
//      type 'audit.divergence', so any subscribed watcher sees it.
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Cadence: every 15 minutes (same as witness-sweep, but staggered).
// Idempotent: re-recording the same divergence is silently deduplicated
// by escalation reason — the operator sees one row, not one per cron tick.
//
// Only signed rows count (go-live review H-1): attestations recorded with a
// registered witness key (public.civicos_signed_witnesses), whose signature
// over `scope|seq|hash|label` verifies here against that key, and whose key
// had not been revoked when the row was recorded. Anything else (older
// unsigned rows, a row whose signature does not verify) never raises an
// alarm; rows that fail verification are counted as `unverified`.

import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';
import { verifyWitnessStatement } from '@/lib/audit/witness-signature';

export const dynamic = 'force-dynamic';

interface DivergenceResult {
  scope: string;
  latestLiveSeq: number | null;
  latestLiveHash: string | null;
  conflictingAttestations: number;
  /** Signed rows at the live seq whose signature did not verify (ignored). */
  unverified: number;
  alarmed: boolean;
}

interface SignedRow {
  observed_hash: string; witness_label: string; witness_signature: string | null;
  public_jwk: unknown; key_revoked_at: string | null; at: string;
}

/** The cron secret, compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => cronAuthorized(req);

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  // Collect every scope that has at least one attestation.
  const { data: wRows, error: wErr } = await sb.from('civicos_signed_witnesses')
    .select('scope').limit(2000);
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });
  const scopes = Array.from(new Set(((wRows ?? []) as { scope: string }[]).map(r => r.scope)));

  const results: DivergenceResult[] = [];
  for (const scope of scopes) {
    // Latest live entry for this scope.
    const { data: live } = await sb.from('civicos_audit_entries')
      .select('seq,hash').eq('scope', scope)
      .order('seq', { ascending: false }).limit(1);
    const liveRow = (live as { seq: number; hash: string }[] | null)?.[0] ?? null;
    if (!liveRow) {
      results.push({ scope, latestLiveSeq: null, latestLiveHash: null, conflictingAttestations: 0, unverified: 0, alarmed: false });
      continue;
    }
    // Signed attestations that observed this seq; trust only those that verify.
    const { data: ats } = await sb.from('civicos_signed_witnesses')
      .select('observed_hash,witness_label,witness_signature,public_jwk,key_revoked_at,at')
      .eq('scope', scope).eq('observed_seq', liveRow.seq);
    let unverified = 0;
    const trusted = ((ats as SignedRow[] | null) ?? []).filter(a => {
      const keyValid = !a.key_revoked_at || Date.parse(a.key_revoked_at) > Date.parse(a.at);
      const ok = keyValid && !!a.witness_signature && verifyWitnessStatement(a.public_jwk, {
        scope, observedSeq: liveRow.seq, observedHash: a.observed_hash, witnessLabel: a.witness_label,
      }, a.witness_signature);
      if (!ok) unverified += 1;
      return ok;
    });
    const conflicts = trusted
      .filter(a => a.observed_hash !== liveRow.hash)
      .map(a => ({ observed_hash: a.observed_hash, witness_label: a.witness_label }));
    if (conflicts.length === 0) {
      results.push({ scope, latestLiveSeq: liveRow.seq, latestLiveHash: liveRow.hash, conflictingAttestations: 0, unverified, alarmed: false });
      continue;
    }

    // Divergence found. Idempotently record an escalation: use the
    // reason as the dedupe key by looking up an existing open one first.
    const reason = `witness-divergence:${scope}@${liveRow.seq}`;
    const { data: existing } = await sb.from('civicos_escalations')
      .select('id').eq('reason', reason).is('resolved_at', null).limit(1);
    if (!existing || existing.length === 0) {
      await sb.rpc('civicos_record_escalation', {
        p_source_charter_id: 'substrate',
        p_severity: 'major',
        p_reason: reason,
        p_target_charter_id: null,
        p_linked_work_item_id: null,
        p_linked_dispatch_id: null,
        p_triggered_by_actor: 'witness-divergence-watch',
        p_payload: {
          scope, live_seq: liveRow.seq, live_hash: liveRow.hash,
          conflicting_attestations: conflicts,
        },
      });
      await sb.rpc('civicos_publish_event', {
        p_type: 'audit.divergence',
        p_source: 'substrate',
        p_channel: 'constitutional',
        p_payload: {
          scope, live_seq: liveRow.seq, live_hash: liveRow.hash,
          conflicting_labels: conflicts.map(c => c.witness_label),
        },
        p_target: null,
      });
    }

    results.push({
      scope, latestLiveSeq: liveRow.seq, latestLiveHash: liveRow.hash,
      conflictingAttestations: conflicts.length, unverified, alarmed: true,
    });
  }

  const alarmed = results.filter(r => r.alarmed).length;
  return NextResponse.json({
    ok: alarmed === 0,
    at: new Date().toISOString(),
    scopes_checked: results.length,
    alarmed,
    results,
  });
}

export const POST = GET;
