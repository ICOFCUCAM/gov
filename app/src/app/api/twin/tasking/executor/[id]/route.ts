// The executing integration reports a task's status (lib/twin/tasking.ts
// acknowledgeTask): POST { status: accepted | rejected | in-progress |
// completed | failed, note? } with Authorization: Bearer civ_… (its own key,
// scope sta:task; BEARER_ROUTES in lib/auth/roles.ts). Only tasks of the
// capabilities it executes, only forward (delivered → accepted or rejected →
// in-progress → completed or failed); audited.

import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { acknowledgeTask, TASKING_SCOPE } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

/**
 * @example { "status": "accepted", "note": "Logger reconfigured at 09:14" }
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const key = verifyIntegrationKey(req.headers.get('authorization'), TASKING_SCOPE);
  if (!key.ok) {
    const res = NextResponse.json({ error: key.error }, { status: key.status });
    if (key.status === 401) res.headers.set('WWW-Authenticate', `Bearer realm="civicos-twin", scope="${TASKING_SCOPE}"`);
    if (key.retryAfterSeconds) res.headers.set('Retry-After', String(key.retryAfterSeconds));
    return res;
  }
  const b = (await req.json().catch(() => ({}))) as { status?: unknown; note?: unknown };
  const t = acknowledgeTask(decodeURIComponent(id), { id: key.client.id, name: key.client.name }, b.status, b.note);
  if ('error' in t) return NextResponse.json({ error: t.error }, { status: t.status });
  return NextResponse.json({ task: t });
}
