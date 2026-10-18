import { NextRequest, NextResponse } from 'next/server';
import { getSovereign, setSovereign } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ sovereign: getSovereign() }); }
export async function PUT(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown>;
  const r = setSovereign(b, (b.by as string) ?? 'cabinet-office');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ sovereign: r });
}
