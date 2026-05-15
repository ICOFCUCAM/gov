import { NextRequest, NextResponse } from 'next/server';
import { setWebhookStatus } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const r = setWebhookStatus(params.id, 'paused');
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ webhook: r });
}
