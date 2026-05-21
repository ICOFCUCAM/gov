// Witness-sweep cron — emits a substrate-self attestation per visible
// scope. The substrate becomes its own first witness, so even before any
// external auditor signs the chain there's a continuous attestation
// timeline. Any divergence between the cron's recorded hash and the
// live hash is a tamper indicator.
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Cadence: recommended every 15 minutes. Idempotent per (scope, seq) —
// the substrate's unique constraint deduplicates by witness_label.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const WITNESS_LABEL = 'substrate-self-witness';

function authorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const token = url.searchParams.get('token')
    ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return token.length > 0 && token === expected;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const url = new URL(req.url);
  const scopeLimit = Math.max(1, Number(url.searchParams.get('scopes') ?? '50') | 0);

  const { data: scopeRows } = await sb
    .from('civicos_audit_entries').select('scope')
    .order('at', { ascending: false }).limit(500);
  const scopes = Array.from(new Set(((scopeRows ?? []) as { scope: string }[]).map(r => r.scope))).slice(0, scopeLimit);

  const results: { scope: string; latestSeq: number | null; attested: boolean }[] = [];
  for (const scope of scopes) {
    const { data: latest } = await sb.from('civicos_audit_entries')
      .select('seq,hash')
      .eq('scope', scope)
      .order('seq', { ascending: false })
      .limit(1);
    const row = (latest as { seq: number; hash: string }[] | null)?.[0];
    if (!row) {
      results.push({ scope, latestSeq: null, attested: false });
      continue;
    }
    const { error } = await sb.rpc('civicos_record_witness_attestation', {
      p_scope: scope,
      p_observed_seq: row.seq,
      p_observed_hash: row.hash,
      p_witness_label: WITNESS_LABEL,
      p_witness_jwk: null,
      p_witness_signature: null,
    });
    results.push({ scope, latestSeq: row.seq, attested: !error });
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    witness_label: WITNESS_LABEL,
    scopes_swept: results.length,
    attested: results.filter(r => r.attested).length,
    results,
  });
}

export const POST = GET;
