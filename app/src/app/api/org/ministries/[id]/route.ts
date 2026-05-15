import { NextResponse } from 'next/server';
import { getMinistry } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET(_r: Request, { params }: { params: { id: string } }) {
  const m = getMinistry(params.id);
  if (!m) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  return NextResponse.json({ ministry: m });
}
