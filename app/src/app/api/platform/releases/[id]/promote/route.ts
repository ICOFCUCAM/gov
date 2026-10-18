import { NextRequest, NextResponse } from 'next/server';
import { promoteRelease } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = promoteRelease(params.id, b.by ?? 'L. Petrov');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ release: r });
}
