import { NextRequest, NextResponse } from 'next/server';
import { setModule } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { moduleKey?: string; enabled?: boolean };
  if (!b.moduleKey || typeof b.enabled !== 'boolean') return NextResponse.json({ error: 'moduleKey and enabled required' }, { status: 422 });
  const r = setModule(params.id, b.moduleKey, b.enabled);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
