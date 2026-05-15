import { NextRequest, NextResponse } from 'next/server';
import { mergeMinistry } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { targetId?: string };
  if (!b.targetId) return NextResponse.json({ error: 'targetId required' }, { status: 422 });
  const r = mergeMinistry(params.id, b.targetId);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ ministry: r });
}
