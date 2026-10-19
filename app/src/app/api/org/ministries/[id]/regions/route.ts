import { NextResponse } from 'next/server';
import { regionsFor } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = regionsFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r);
}
