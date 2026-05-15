import { NextRequest, NextResponse } from 'next/server';
import { advanceDeployment } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { gateResult?: 'pass' | 'fail'; note?: string; by?: string };
  const r = advanceDeployment(params.id, b.by ?? 'W. Chebet', b.gateResult === 'fail' ? 'fail' : 'pass', b.note);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ deployment: r });
}
