import { NextRequest, NextResponse } from 'next/server';
import { listConfigs, publishConfig } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ configs: listConfigs() }); }
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { payload?: Record<string, unknown> };
  return NextResponse.json({ config: publishConfig(b.payload ?? {}) }, { status: 201 });
}
