import { NextRequest, NextResponse } from 'next/server';
import { listConfigs, publishConfig } from '@/lib/data/store';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ configs: listConfigs() }); }
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { payload?: Record<string, unknown>; by?: string };
  return NextResponse.json({ config: publishConfig(b.payload ?? {}, await actingName(b.by)) }, { status: 201 });
}
