import { NextResponse } from 'next/server';
import { fieldOpsFor } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = fieldOpsFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r);
}
