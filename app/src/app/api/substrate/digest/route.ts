// Substrate digest API — programmatic equivalent of the /gov/substrate
// "download digest" button. Computes per-view row counts and (optionally)
// the chain integrity sweep, returning a JSON snapshot.
//
// Auth: requires the CIVICOS_CRON_SECRET shared secret (Bearer or
// ?token=). The endpoint uses the service-role client so counts are
// global (RLS-unfiltered) — that's what an external archive/auditor
// wants. Do not expose without the secret.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const COUNTABLE_VIEWS = [
  'civicos_institutions', 'civicos_officers', 'civicos_citizens',
  'civicos_facilities', 'civicos_workflow_definitions',
  'civicos_work_items', 'civicos_work_item_steps',
  'civicos_federation_events', 'civicos_audit_entries',
  'civicos_directives', 'civicos_dispatches', 'civicos_escalations',
  'civicos_posture_history',
  'civicos_telemetry_streams', 'civicos_telemetry_samples',
  'civicos_service_requests', 'civicos_consents', 'civicos_appeals',
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
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = serverClient();
  if (!sb) {
    return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });
  }
  const url = new URL(req.url);
  const verifyChains = url.searchParams.get('verify') === '1';

  const counts: Record<string, number> = {};
  await Promise.all(COUNTABLE_VIEWS.map(async v => {
    const { count, error } = await sb.from(v).select('id', { head: true, count: 'exact' });
    counts[v.replace('civicos_', '')] = error ? -1 : (count ?? 0);
  }));

  let chains: { scope: string; entries: number; intact: boolean }[] | null = null;
  if (verifyChains) {
    const { data: scopeRows } = await sb.from('civicos_audit_entries').select('scope').order('at', { ascending: false }).limit(200);
    const scopes = Array.from(new Set(((scopeRows ?? []) as { scope: string }[]).map(r => r.scope))).slice(0, 30);
    chains = await Promise.all(scopes.map(async s => {
      const { data } = await sb.rpc('civicos_verify_audit_chain', { p_scope: s });
      const arr = (Array.isArray(data) ? data : []) as { entries: number; intact: boolean }[];
      const row = arr[0];
      return { scope: s, entries: row?.entries ?? 0, intact: row?.intact ?? false };
    }));
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    counts,
    totals: {
      tables_visible: Object.values(counts).filter(c => c > 0).length,
      total_rows: Object.values(counts).reduce((s, c) => s + (c > 0 ? c : 0), 0),
    },
    chains: chains == null ? null : {
      scopes_checked: chains.length,
      all_intact: chains.every(c => c.intact),
      results: chains,
    },
  });
}

export const POST = GET;
