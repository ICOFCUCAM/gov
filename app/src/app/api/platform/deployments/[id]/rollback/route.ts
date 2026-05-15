import { NextRequest, NextResponse } from 'next/server';
import { rollbackDeployment } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { note?: string; by?: string };
  const r = rollbackDeployment(params.id, b.by ?? 'W. Chebet', b.note ?? 'operator rollback');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ deployment: r });
}
