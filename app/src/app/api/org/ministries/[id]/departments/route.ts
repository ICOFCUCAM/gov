import { NextRequest, NextResponse } from 'next/server';
import { addDepartment } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { name?: string };
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 422 });
  const r = addDepartment(params.id, b.name);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ ministry: r });
}
