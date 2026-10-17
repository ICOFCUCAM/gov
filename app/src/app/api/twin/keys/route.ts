// Link a source system's own id to a twin entity (the crosswalk), so its rows
// resolve to the right place or institution. A named official; audited.

import { NextRequest, NextResponse } from 'next/server';
import { linkKey } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { entityId?: string; system?: string; key?: string; by?: string };
  if (!b.by?.trim()) return NextResponse.json({ error: 'Name the official' }, { status: 422 });
  const r = linkKey(b.entityId ?? '', b.system ?? '', b.key ?? '', b.by.trim());
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}
