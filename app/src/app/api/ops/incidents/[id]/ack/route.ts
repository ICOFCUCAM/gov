import { NextRequest, NextResponse } from 'next/server';
import { ackIncident } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; note?: string };
  const r = ackIncident(params.id, body.by ?? 'operator', body.note);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ incident: r });
}
