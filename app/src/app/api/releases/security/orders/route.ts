// /api/releases/security/orders — request a quote for platform security software.
import { NextRequest, NextResponse } from 'next/server';
import { createQuote } from '@/lib/data/security-store';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ productId?: string; edition?: string; seats?: number; years?: number; by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const { productId, edition, seats, years, by } = r.b;
  const out = createQuote(r.nation, { productId, edition, seats, years, by });
  if ('error' in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json({ order: out }, { status: 201 });
}
