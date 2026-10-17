// /api/releases/alerts — the officials this nation alerts about updates,
// their channels and subscriptions (security, releases, incidents, end of
// life), and the alerts recently queued for them (GET). POST: save or
// remove an official. Every change is audited.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { CATEGORIES, listOfficials, outbox, removeOfficial, saveOfficial } from '@/lib/data/comms';
import type { Official } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ officials: listOfficials(n.id), outbox: outbox(n.id), categories: CATEGORIES });
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
