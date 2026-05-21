// Audit-chain anchoring cron — periodically broadcasts the head of
// every visible audit scope as a federation event of type
// 'audit.anchor' on channel 'constitutional'. External systems that
// subscribe to the federation stream get a continuous live record of
// where each chain pointed at known wall-clock times.
//
// Complements the witness-attestation system:
//   - audit_witnesses table is the append-only, public, tamper-proof
//     record (provable retroactively).
//   - federation 'audit.anchor' events are the realtime broadcast
//     channel (subscribers see it as it happens; consumers can persist
//     externally for an independent record).
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Cadence: every 5–15 minutes. Idempotent — anchoring the same head
// produces an event with the same content, but federation events are
// append-only so duplicate broadcasts are allowed (consumers dedupe by
// (scope, seq) if they care).

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

interface AnchorResult {
  scope: string;
  head_seq: number | null;
  head_hash: string | null;
  anchored: boolean;
}

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
  const cap = Math.max(1, Math.min(200, Number(url.searchParams.get('scopes') ?? '50') | 0));

  // Distinct scopes seen on the recent audit ledger.
  const { data: scopeRows, error: sErr } = await sb
    .from('civicos_audit_entries').select('scope')
    .order('at', { ascending: false }).limit(1000);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  const scopes = Array.from(new Set(((scopeRows ?? []) as { scope: string }[]).map(r => r.scope))).slice(0, cap);

  const anchoredAt = new Date().toISOString();
  const results: AnchorResult[] = [];
  for (const scope of scopes) {
    const { data: head } = await sb.from('civicos_audit_entries')
      .select('seq,hash')
      .eq('scope', scope)
      .order('seq', { ascending: false })
      .limit(1);
    const row = (head as { seq: number; hash: string }[] | null)?.[0];
    if (!row) {
      results.push({ scope, head_seq: null, head_hash: null, anchored: false });
      continue;
    }
    const { error } = await sb.rpc('civicos_publish_event', {
      p_type: 'audit.anchor',
      p_source: 'substrate',
      p_channel: 'constitutional',
      p_payload: {
        scope, head_seq: row.seq, head_hash: row.hash, anchored_at: anchoredAt,
      },
      p_target: null,
    });
    results.push({ scope, head_seq: row.seq, head_hash: row.hash, anchored: !error });
  }

  return NextResponse.json({
    ok: true,
    at: anchoredAt,
    scopes_anchored: results.filter(r => r.anchored).length,
    scopes_swept: results.length,
    results,
  });
}

export const POST = GET;
