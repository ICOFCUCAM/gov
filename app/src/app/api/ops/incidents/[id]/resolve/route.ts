import { NextRequest, NextResponse } from 'next/server';
import { resolveIncident } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { by?: string; note?: string };
  const r = resolveIncident(params.id, body.by ?? 'operator', body.note);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ incident: r });
}
