// Comprehensive substrate export — compliance / handover artifact.
//
// Returns a single self-describing JSON document containing every row
// the configured service-role client can see across the lifecycle tables.
// The audit chain is included verbatim so the receiving party can
// re-verify integrity offline. Witnesses are included so a successor
// administration inherits the same tamper-after-the-fact proofs.
//
// Auth: CIVICOS_EXPORT_SECRET as Authorization: Bearer (never ?token=; lib/platform-auth.ts).
// Cost: O(rows). Capped per table via the ?cap query parameter (default
// 5000, max 50000) so a single response can't blow the lambda budget.
//
// Use the existing /api/substrate/digest endpoint for lightweight count
// snapshots; this endpoint is the full dump.
//
// Every dump is recorded (baseline audit §3.3): an audit-chain entry and an
// access-log entry (action `export`), naming the caller as the shared export
// secret (it names no person) with table and row counts only, never a row.
// The shared secret is to be replaced by named officials or two-official
// approval (integration register 1.46).

import { NextResponse } from 'next/server';
import { secretAuthorized } from '@/lib/platform-auth';
import { serverClient } from '@/lib/db/client';
import { recordAudit } from '@/lib/data/store/audit';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

/** How the audit chain and the access log name the caller: the shared export secret, which names no person. */
const EXPORT_SECRET_ACTOR = 'Export automation (shared secret CIVICOS_EXPORT_SECRET; no named official)';

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

/** The export secret (CIVICOS_EXPORT_SECRET, bearer only), compared in constant time (lib/platform-auth.ts). */
const authorized = (req: Request): boolean => secretAuthorized(req, 'export');

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

  // Recorded before the dump leaves: one audit-chain entry and one access-log export entry, counts only.
  const parts = Object.values(tables);
  const rowCount = parts.reduce((n, t) => n + t.rows.length, 0);
  const summary = `tables ${parts.length}; rows ${rowCount}; truncated ${parts.filter(t => t.truncated).length}; unreadable ${parts.filter(t => t.error).length}; cap ${cap}`;
  recordAudit(EXPORT_SECRET_ACTOR, 'substrate.export', 'Substrate:export', 'ok', summary);
  recordAccess({ by: { name: EXPORT_SECRET_ACTOR }, record: { register: 'substrate', query: summary }, action: 'export', result: 'allowed', rule: 'shared export secret CIVICOS_EXPORT_SECRET (to be replaced by named officials; integration register 1.46)' });

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
