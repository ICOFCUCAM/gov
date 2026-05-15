import { NextRequest, NextResponse } from 'next/server';
import { restoreBackup } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = restoreBackup(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ backup: r });
}
