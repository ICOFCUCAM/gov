// /api/cases — cases under the nation's procedures (lib/casework/engine.ts,
// design §6.5). GET: the cases the official may read (their institution's,
// or every institution's for officials of the whole government, never a
// court's from outside it), without personal fields. POST: open a case under
// the procedure version in force (the responsible institution's officials).
import { NextRequest, NextResponse } from 'next/server';
import { caseReadRefusal } from '@/lib/auth/roles';
import { caseScope } from '@/lib/auth/official';
import { listCases, openCase, caseFacts } from '@/lib/casework/engine';
import { listView } from '@/lib/casework/view';
import { routeActor } from '@/lib/casework/actor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const s = await caseScope();
  const open = q.get('open');
  const cases = listCases({ owner: q.get('owner') ?? undefined, procedure: q.get('procedure') ?? undefined, stage: q.get('stage') ?? undefined, open: open === null ? undefined : open !== 'false', limit: Number(q.get('limit')) || undefined })
    .filter(c => !s || !caseReadRefusal(s, { ...caseFacts(c), sensitivity: 'normal' }));
  return NextResponse.json({ cases: cases.map(listView) });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const r = openCase({
    procedure: String(b.procedure ?? ''), fields: (b.fields ?? {}) as Record<string, unknown>,
    subject: Array.isArray(b.subject) ? (b.subject as never) : [], ...(b.applicant ? { applicant: b.applicant as never } : {}),
    priority: (['routine', 'priority', 'urgent'].includes(String(b.priority)) ? b.priority : 'routine') as never,
    ...(typeof b.idempotencyKey === 'string' ? { idempotencyKey: b.idempotencyKey.slice(0, 100) } : {}),
  }, actor);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ case: r }, { status: 201 });
}
