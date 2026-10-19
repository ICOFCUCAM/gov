import { NextRequest, NextResponse } from 'next/server';
import { getSovereign, setSovereign } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { normaliseDomain } from '@/lib/nation/domain';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ sovereign: getSovereign() }); }
export async function PUT(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown>;
  // The nation's domain (setup 2.1): the twin's persistent identifiers are minted under it (lib/nation/domain.ts).
  if ('domain' in b) {
    const d = normaliseDomain(b.domain);
    if ('error' in d) return NextResponse.json(d, { status: 422 });
    b.domain = d.domain || undefined;
  }
  const r = setSovereign(b, (b.by as string) ?? 'cabinet-office');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ sovereign: r });
}
