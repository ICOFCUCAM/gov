import { NextResponse } from 'next/server';
import { getMinistry } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const m = getMinistry(params.id);
  if (!m) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  return NextResponse.json({ ministry: m });
}
