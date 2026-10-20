// POST /api/access-log/retention { id } — the oversight side's confirmation
// of a rule that deletes from the access log (lib/data/retention.ts
// confirmByOversight()), after two administrators proposed and confirmed it:
// the data-protection authority's officials who can sign, or an auditor while
// none is named (canConfirmAccessLogRetention()); never an administrator.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canConfirmAccessLogRetention } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { confirmByOversight } from '@/lib/data/retention';

export const dynamic = 'force-dynamic';

/** @example request {"id":"RET-1a2b3c4d"} */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; by?: string };
  const s = await caseScope();
  if (s) {
    const why = canConfirmAccessLogRetention(s, authorityFor('dataProtection'));
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const actor = await routeActor(b.by);
  const r = confirmByOversight(String(b.id ?? ''), actor.name);
  return 'error' in r ? NextResponse.json(r, { status: r.error === 'No such proposal' ? 404 : 422 }) : NextResponse.json({ change: r });
}
