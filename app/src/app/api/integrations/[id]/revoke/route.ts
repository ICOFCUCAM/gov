import { NextRequest, NextResponse } from 'next/server';
import { setIntegrationStatus } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const r = setIntegrationStatus(params.id, 'revoked', b.by ?? 'L. Mwakio');
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ integration: r });
}
