import { NextRequest, NextResponse } from 'next/server';
import { activateMinistry } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(_r: NextRequest, { params }: { params: { id: string } }) {
  const r = activateMinistry(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ ministry: r });
}
