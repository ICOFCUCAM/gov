// /api/admin/officers/bulk — server-side bulk officer onboarding.
//
// Accepts a CSV or JSON array of {email,name,charter_id,role,title?}
// and forwards to civicos_admin_bulk_create_officers via the service-role
// client. Returns the substrate's per-row result so the UI can show
// which entries succeeded and which failed.
//
// Auth: callers must hold a platform-tier session OR pass the
// CIVICOS_CRON_SECRET (so CLI/automation can use it without a UI sign-in).
// The substrate enforces the platform-tier check separately, so this
// route is a defense-in-depth gate, not the sole authorisation.

import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';
import { platformOrCronAuthorized } from '@/lib/platform-auth';
import { parseOfficerCsv, type OfficerInputRow as InputRow } from '@/lib/officer-csv';

export const dynamic = 'force-dynamic';

interface OutputRow {
  email: string;
  name: string;
  charter_id: string;
  role: string;
  officer_id: string | null;
  status: 'created' | 'failed';
  error: string | null;
}

export async function POST(req: Request) {
  if (!await platformOrCronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const contentType = req.headers.get('content-type') ?? '';
  let rows: InputRow[];
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { rows?: InputRow[] };
      if (!body.rows || !Array.isArray(body.rows)) {
        return NextResponse.json({ error: 'expected { rows: InputRow[] }' }, { status: 400 });
      }
      rows = body.rows;
    } else {
      const text = await req.text();
      const parsed = parseOfficerCsv(text);
      if ('error' in parsed) return NextResponse.json(parsed, { status: 400 });
      rows = parsed;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'bad payload' }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ ok: true, results: [] });
  if (rows.length > 500) {
    return NextResponse.json({ error: 'batch capped at 500 rows' }, { status: 413 });
  }

  const { data, error } = await sb.rpc('civicos_admin_bulk_create_officers', { p_rows: rows });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = (data as OutputRow[]) ?? [];
  const created = results.filter(r => r.status === 'created').length;
  const failed = results.length - created;

  return NextResponse.json({
    ok: failed === 0,
    at: new Date().toISOString(),
    counts: { received: rows.length, created, failed },
    results,
  });
}
