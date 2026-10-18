// An institution's queue. GET reads it (cases age from when they were
// received; examples are marked source "sample"). POST adds one case typed in
// by an official (lib/data/case-import.ts: reference, subject, received,
// region?, priority?, assignee?, note?), checked like a loaded row; audited.
import { NextRequest, NextResponse } from 'next/server';
import { queueFor } from '@/lib/data/store';
import { addCase } from '@/lib/data/case-import';
import { withOfficial, refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export function GET(_r: Request, { params }: { params: { id: string } }) {
  const r = queueFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r);
}
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, string | undefined>;
  const r = addCase(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Ministry not found' ? 404 : 422 });
  return NextResponse.json({ item: r }, { status: 201 });
}
