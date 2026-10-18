import { NextRequest, NextResponse } from 'next/server';
import { escalateMinistryIncident } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { id: string; key: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = escalateMinistryIncident(params.id, params.key, b.by ?? 'operator');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ incident: r });
}
