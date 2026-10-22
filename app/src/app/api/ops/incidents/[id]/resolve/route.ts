import { NextRequest, NextResponse } from 'next/server';
import { resolveIncident } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
import { actingName } from '@/lib/casework/actor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; note?: string };
  const r = resolveIncident(params.id, await actingName(body.by), body.note);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ incident: r });
}
