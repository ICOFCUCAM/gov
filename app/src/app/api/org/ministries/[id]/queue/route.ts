import { NextResponse } from 'next/server';
import { queueFor } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET(_r: Request, { params }: { params: { id: string } }) {
  const r = queueFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r);
}
