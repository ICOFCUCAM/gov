import { NextRequest, NextResponse } from 'next/server';
import { promoteRelease } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const r = promoteRelease(params.id, b.by ?? 'L. Mwakio');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ release: r });
}
