import { NextRequest, NextResponse } from 'next/server';
import { applyConfig } from '@/lib/data/store';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const r = applyConfig(params.id, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ config: r });
}
