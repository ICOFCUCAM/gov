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
import { serverClient, tokenScopedClient } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const PLATFORM_ROLES = new Set(['platform-admin', 'noc-officer', 'cabinet-officer', 'auditor']);

interface InputRow {
  email: string;
  name: string;
  charter_id: string;
  role: string;
  title?: string | null;
}

interface OutputRow {
  email: string;
  name: string;
  charter_id: string;
  role: string;
  officer_id: string | null;
  status: 'created' | 'failed';
  error: string | null;
}

/** Cron-secret path: a fixed shared secret in ?token= or Authorization.
 *  For CLI / automation that has no UI session. */
function cronAuthorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const token = url.searchParams.get('token')
    ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return token.length > 0 && token === expected;
}

/** Session path: a Supabase access token (JWT) belonging to a
 *  platform-tier officer. Verified by asking the substrate, under that
 *  user's RLS, who the current actor is. */
async function sessionAuthorized(req: Request): Promise<boolean> {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer || bearer.split('.').length !== 3) return false; // not a JWT
  const scoped = tokenScopedClient(bearer);
  if (!scoped) return false;
  const { data, error } = await scoped.rpc('civicos_current_actor');
  if (error || !data) return false;
  const actor = (Array.isArray(data) ? data[0] : data) as { kind?: string; role?: string } | null;
  return !!actor && actor.kind === 'officer' && PLATFORM_ROLES.has(actor.role ?? '');
}

async function authorized(req: Request): Promise<boolean> {
  return cronAuthorized(req) || await sessionAuthorized(req);
}

/** Parse a CSV string with the documented header row. Returns the row
 *  list, or { error } when the header is malformed. */
export function parseOfficerCsv(text: string): InputRow[] | { error: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { error: 'empty CSV' };
  const header = lines[0]!.split(',').map(c => c.trim().toLowerCase());
  const required = ['email', 'name', 'charter_id', 'role'];
  for (const k of required) {
    if (!header.includes(k)) return { error: `missing header column: ${k}` };
  }
  const idx = (k: string) => header.indexOf(k);
  const rows: InputRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',').map(c => c.trim());
    rows.push({
      email: cells[idx('email')] ?? '',
      name: cells[idx('name')] ?? '',
      charter_id: cells[idx('charter_id')] ?? '',
      role: cells[idx('role')] ?? '',
      title: idx('title') >= 0 ? (cells[idx('title')] ?? null) : null,
    });
  }
  return rows;
}

export async function POST(req: Request) {
  if (!await authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
