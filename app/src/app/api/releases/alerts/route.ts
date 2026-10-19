// /api/releases/alerts — the officials this nation alerts about updates,
// their channels and subscriptions (security, releases, incidents, end of
// life), the alerts recently queued for them with where each delivery stands
// (addresses masked), and whether email and SMS providers are connected (GET). POST: save or
// remove an official. Every change is audited.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { CATEGORIES, listOfficials, outbox, removeOfficial, saveOfficial } from '@/lib/data/comms';
import { connection } from '@/lib/messaging/providers';
import type { Official } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  // delivery: whether the nation's administrator has connected an email and an SMS provider (/admin/messaging).
  return NextResponse.json({ officials: listOfficials(n.id), outbox: outbox(n.id), categories: CATEGORIES, delivery: { email: connection(n.id, 'email'), sms: connection(n.id, 'sms') } });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; by?: string; official?: Partial<Official>; id?: string }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const out = b.action === 'save' ? saveOfficial(n.id, { ...(b.official ?? {}), by: b.by })
    : b.action === 'remove' ? removeOfficial(n.id, String(b.id ?? ''), String(b.by ?? ''))
    : { error: 'action must be save or remove', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, officials: listOfficials(n.id) });
}
