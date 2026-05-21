// Audit-self cron — appends a heartbeat audit entry to the
// 'substrate:self' scope on each invocation. Pairs with the
// audit-chain verification: the scope's chain grows continuously,
// giving the verify_audit_chain coverage sweep a guaranteed sample
// on every recent run. Also useful as a liveness signal for
// external monitors observing the audit table.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

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

  // Cheap snapshot of substrate state for the detail.
  const [{ count: openWi }, { count: totalAudit }] = await Promise.all([
    sb.from('civicos_work_items').select('id', { head: true, count: 'exact' }).eq('closed', false),
    sb.from('civicos_audit_entries').select('id', { head: true, count: 'exact' }),
  ]);

  const { data, error } = await sb.rpc('civicos_append_audit', {
    p_scope: 'substrate:self',
    p_actor: 'audit-self-cron',
    p_action: 'heartbeat',
    p_subject: `open=${openWi ?? 0} total=${totalAudit ?? 0}`,
    p_detail: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true, at: new Date().toISOString(),
    seq: (data as { seq?: number } | null)?.seq ?? null,
    open_work_items: openWi ?? 0,
    audit_entries: totalAudit ?? 0,
  });
}

export const POST = GET;
