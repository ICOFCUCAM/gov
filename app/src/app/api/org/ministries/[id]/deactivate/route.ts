import { NextRequest, NextResponse } from 'next/server';
import { deactivateMinistry } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(_r: NextRequest, { params }: { params: { id: string } }) {
  const r = deactivateMinistry(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
