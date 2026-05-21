// /api/audit/proof — single-entry verifiable inclusion proof.
//
// Given (scope, seq) the endpoint returns:
//   - The audit chain prefix from genesis to seq, so a verifier can
//     re-walk every prev_hash → hash relationship locally.
//   - The targeted entry (== the last row in the prefix).
//   - Every witness attestation that observed (scope, seq), so the
//     verifier can confirm the recorded hash matches what witnesses
//     saw at that time.
//   - A server timestamp framing the proof.
//
// The output is the same shape the /api/substrate/export endpoint
// produces, so it loads directly into /gov/audit-replay (or any
// third-party copy of lib/audit/replay.ts).
//
// Auth: public read. Audit entries are already publicly readable per
// the RLS policy on civicos.audit_entries.

import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sb = publicClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope');
  const seqParam = url.searchParams.get('seq');
  if (!scope || !seqParam) {
    return NextResponse.json({ error: 'scope and seq are required' }, { status: 400 });
  }
  const seq = Number(seqParam);
  if (!Number.isFinite(seq) || seq < 1) {
    return NextResponse.json({ error: 'seq must be a positive integer' }, { status: 400 });
  }

  const { data: prefix, error: chainErr } = await sb
    .from('civicos_audit_entries')
    .select('*')
    .eq('scope', scope)
    .lte('seq', seq)
    .order('seq', { ascending: true });
  if (chainErr) return NextResponse.json({ error: chainErr.message }, { status: 500 });
  if (!prefix || prefix.length === 0) {
    return NextResponse.json({ error: 'no audit entries for scope/seq' }, { status: 404 });
  }
  const entry = (prefix as { seq: number }[]).find(r => r.seq === seq);
  if (!entry) return NextResponse.json({ error: `seq ${seq} not found in scope` }, { status: 404 });

  const { data: witnesses } = await sb
    .from('civicos_audit_witnesses')
    .select('*')
    .eq('scope', scope).eq('observed_seq', seq);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    substrate_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    proof_for: { scope, seq },
    tables: {
      audit_entries: { rows: prefix, truncated: false, error: null },
      audit_witnesses: { rows: witnesses ?? [], truncated: false, error: null },
    },
    notes: [
      'Load this JSON into /gov/audit-replay to verify offline.',
      'replay walks every prev_hash → hash relationship in the prefix; if anything was rewritten after the proof was generated, the verifier will detect it.',
      'Any witness rows are cross-checked against the live chain; matched attestations are independent corroboration of the entry hash.',
    ],
  });
}

export const POST = GET;
