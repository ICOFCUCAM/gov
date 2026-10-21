// /api/admin/officers/bulk — server-side bulk officer onboarding.
//
// Accepts a CSV or JSON array of {email,name,charter_id,role,title?}
// and forwards to civicos_admin_bulk_create_officers via the service-role
// client. Returns the substrate's per-row result so the UI can show
// which entries succeeded and which failed.
//
// Auth: callers must hold a platform-tier session OR pass the
// CIVICOS_PROVISIONING_SECRET as a bearer (so CLI/automation can use it without a UI sign-in).
// The substrate enforces the platform-tier check separately, so this
// route is a defense-in-depth gate, not the sole authorisation.
//
// Every batch that reaches the substrate is written to the platform audit
// chain (baseline audit §3.3): who called (the platform officer, or the
// provisioning secret named as such, since it names no person) and the counts
// received, created and failed — never an email, name or other row content.
// The shared secret is to be replaced by named officials (integration
// register 1.46).

import { readJson, readText, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/db/client';
import { secretAuthorized, platformActor } from '@/lib/platform-auth';
import { parseOfficerCsv, type OfficerInputRow as InputRow } from '@/lib/officer-csv';
import { recordAudit } from '@/lib/data/store/audit';

export const dynamic = 'force-dynamic';

/** How the audit chain names a caller who presented the shared provisioning secret: a machine credential, no person. */
const PROVISIONING_SECRET_ACTOR = 'Provisioning automation (shared secret CIVICOS_PROVISIONING_SECRET; no named official)';

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
  const viaSecret = secretAuthorized(req, 'provisioning');
  const officer = viaSecret ? null : await platformActor(req);
  if (!viaSecret && !officer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const actor = officer ? `${officer.name ?? 'Platform officer'}, substrate ${officer.role}${officer.id ? ` (officer:${officer.id})` : ''}` : PROVISIONING_SECRET_ACTOR;
  const sb = serverClient();
  if (!sb) return NextResponse.json({ error: 'substrate not configured' }, { status: 503 });

  const contentType = req.headers.get('content-type') ?? '';
  let rows: InputRow[];
  // At most 500 rows: read with a 1 MB cap (lib/net/body-limit.ts, review L-4).
  const MAX = 1_000_000;
  try {
    if (contentType.includes('application/json')) {
      const parsed = await readJson(req, MAX);
      if (parsed === TOO_LARGE) return tooLargeAnswer(MAX, 'The batch');
      const body = parsed as { rows?: InputRow[] } | undefined;
      if (!body?.rows || !Array.isArray(body.rows)) {
        return NextResponse.json({ error: 'expected { rows: InputRow[] }' }, { status: 400 });
      }
      rows = body.rows;
    } else {
      const text = await readText(req, MAX);
      if (text === TOO_LARGE) return tooLargeAnswer(MAX, 'The batch');
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
  if (error) {
    // Counts only: the substrate's message can quote a row, so it stays out of the chain.
    recordAudit(actor, 'officers.bulk-create', 'Substrate:officers', 'error', `received ${rows.length}; the substrate refused the batch; via ${viaSecret ? 'provisioning secret' : 'platform officer session'}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data as OutputRow[]) ?? [];
  const created = results.filter(r => r.status === 'created').length;
  const failed = results.length - created;
  recordAudit(actor, 'officers.bulk-create', 'Substrate:officers', failed === 0 ? 'ok' : 'partial',
    `received ${rows.length}; created ${created}; failed ${failed}; via ${viaSecret ? 'provisioning secret' : 'platform officer session'}`);

  return NextResponse.json({
    ok: failed === 0,
    at: new Date().toISOString(),
    counts: { received: rows.length, created, failed },
    results,
  });
}
