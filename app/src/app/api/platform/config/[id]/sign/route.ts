import { NextRequest, NextResponse } from 'next/server';
import { signConfig } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const r = signConfig(params.id, b.by ?? 'STO');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ config: r });
}
