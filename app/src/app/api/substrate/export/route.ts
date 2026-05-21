// Comprehensive substrate export — compliance / handover artifact.
//
// Returns a single self-describing JSON document containing every row
// the configured service-role client can see across the lifecycle tables.
// The audit chain is included verbatim so the receiving party can
// re-verify integrity offline. Witnesses are included so a successor
// administration inherits the same tamper-after-the-fact proofs.
//
// Auth: CIVICOS_CRON_SECRET via ?token=… or Authorization: Bearer.
// Cost: O(rows). Capped per table via the ?cap query parameter (default
// 5000, max 50000) so a single response can't blow the lambda budget.
//
// Use the existing /api/substrate/digest endpoint for lightweight count
// snapshots; this endpoint is the full dump.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const TABLES = [
  'civicos_institutions', 'civicos_officers', 'civicos_citizens',
  'civicos_facilities', 'civicos_workflow_definitions',
  'civicos_work_items', 'civicos_work_item_steps',
  'civicos_federation_events', 'civicos_audit_entries',
  'civicos_directives', 'civicos_dispatches', 'civicos_escalations',
  'civicos_posture_history',
  'civicos_telemetry_streams', 'civicos_telemetry_samples',
  'civicos_service_requests', 'civicos_consents', 'civicos_appeals',
  'civicos_audit_witnesses',
] as const;

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
  const cap = Math.min(50_000, Math.max(1, Number(url.searchParams.get('cap') ?? '5000') | 0));

  const tables: Record<string, { rows: unknown[]; truncated: boolean; error: string | null }> = {};
  for (const t of TABLES) {
    const { data, error, count } = await sb.from(t)
      .select('*', { count: 'estimated' })
      .limit(cap);
    if (error) {
      tables[t.replace('civicos_', '')] = { rows: [], truncated: false, error: error.message };
      continue;
    }
    const rows = (data ?? []) as unknown[];
    tables[t.replace('civicos_', '')] = {
      rows,
      truncated: (count ?? rows.length) > rows.length,
      error: null,
    };
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    substrate_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    row_cap_per_table: cap,
    tables,
    notes: [
      'Counts use estimated PG statistics. Use /api/substrate/digest for exact head counts.',
      'audit_entries is append-only and tamper-evident; the receiver can re-verify the chain offline by replaying prev_hash → hash.',
      'audit_witnesses pin (scope, observed_seq, observed_hash) at attestation time; mismatch with audit_entries after handover is a tamper indicator.',
    ],
  });
}

export const POST = GET;
