import { NextResponse } from 'next/server';
import { analyticsFor } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET(_r: Request, { params }: { params: { id: string } }) {
  const r = analyticsFor(params.id);
  if ('error' in (r as object)) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ analytics: r });
}
